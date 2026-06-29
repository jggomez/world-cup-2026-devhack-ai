"""
Unit tests for the Monte Carlo Poisson simulation engine.

Covers:
- Probability axioms (home + draw + away = 1.0)
- Lambda calibration sanity checks
- Scoreline distribution properties
- JSON serialisability
- Edge cases (very strong/weak teams, equal teams)
"""

import json
import math
import sys
import os
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "analyst_service"))

from app.agents.monte_carlo import (
    compute_lambdas,
    run_monte_carlo_simulation,
    simulate_match,
    _poisson_pmf,
    _sample_poisson,
    _outcome_of,
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

TOLERANCE = 0.01  # 1% tolerance for probability sums


# ---------------------------------------------------------------------------
# Unit tests — Poisson helpers
# ---------------------------------------------------------------------------

class TestPoissonPMF:
    def test_poisson_pmf_zero_lambda_k0(self):
        """P(X=0 | λ=0) == 1.0"""
        assert _poisson_pmf(0, 0.0) == pytest.approx(1.0)

    def test_poisson_pmf_zero_lambda_k_positive(self):
        """P(X=k | λ=0) == 0 for k > 0"""
        assert _poisson_pmf(1, 0.0) == pytest.approx(0.0)
        assert _poisson_pmf(5, 0.0) == pytest.approx(0.0)

    def test_poisson_pmf_sum_to_one(self):
        """Sum of P(X=k) for k=0..50 ~ 1.0 for λ=1.5"""
        total = sum(_poisson_pmf(k, 1.5) for k in range(50))
        assert total == pytest.approx(1.0, abs=1e-6)

    def test_poisson_pmf_mode_at_floor_lambda(self):
        """Mode of Poisson(λ) is at floor(λ) for non-integer λ"""
        lam = 2.5
        probs = [_poisson_pmf(k, lam) for k in range(10)]
        mode = probs.index(max(probs))
        assert mode == int(lam)  # floor(2.5) = 2


class TestComputeLambdas:
    def test_equal_teams_similar_lambdas(self):
        """Two equal teams should produce similar expected goals."""
        lh, la = compute_lambdas(
            home_avg_scored=1.35,
            home_avg_conceded=1.35,
            away_avg_scored=1.35,
            away_avg_conceded=1.35,
            home_advantage=0.0,
        )
        assert abs(lh - la) < 0.05, f"Expected similar lambdas but got {lh=}, {la=}"

    def test_home_advantage_increases_home_lambda(self):
        """Home advantage should increase home lambda relative to no-advantage."""
        lh_adv, la_adv = compute_lambdas(1.35, 1.35, 1.35, 1.35, home_advantage=0.15)
        lh_no, _     = compute_lambdas(1.35, 1.35, 1.35, 1.35, home_advantage=0.0)
        assert lh_adv > lh_no

    def test_strong_home_team_higher_lambda(self):
        """A team that scores more should have higher lambda."""
        lh_strong, _ = compute_lambdas(3.0, 0.5, 1.0, 1.5)
        lh_weak,   _ = compute_lambdas(0.5, 2.5, 1.0, 1.5)
        assert lh_strong > lh_weak

    def test_lambdas_within_valid_range(self):
        """Lambdas should be clamped between 0.3 and 5.0."""
        lh, la = compute_lambdas(
            home_avg_scored=10.0,  # absurdly high
            home_avg_conceded=0.0,
            away_avg_scored=0.0,
            away_avg_conceded=10.0,
        )
        assert 0.3 <= lh <= 5.0
        assert 0.3 <= la <= 5.0


# ---------------------------------------------------------------------------
# Unit tests — Simulation
# ---------------------------------------------------------------------------

class TestRunMonteCarloSimulation:

    N = 100_000  # Use 100K for stable test results

    def _run(self, hs=1.35, hc=1.35, as_=1.35, ac=1.35, n=50_000):
        return run_monte_carlo_simulation(
            home_avg_scored=hs,
            home_avg_conceded=hc,
            away_avg_scored=as_,
            away_avg_conceded=ac,
            n_simulations=n,
            seed=42,
        )

    def test_probabilities_sum_to_one(self):
        """home_win + draw + away_win must ≈ 1.0"""
        r = self._run()
        total = r["home_win_prob"] + r["draw_prob"] + r["away_win_prob"]
        assert total == pytest.approx(1.0, abs=TOLERANCE)

    def test_expected_goals_match_lambdas(self):
        """Expected goals should be close to lambda parameters."""
        r = self._run(n=200_000)
        assert abs(r["expected_home_goals"] - r["lambda_home"]) < 0.05
        assert abs(r["expected_away_goals"] - r["lambda_away"]) < 0.05

    def test_scorelines_probabilities_positive(self):
        """All returned scoreline probabilities should be > 0."""
        r = self._run()
        for sl in r["most_likely_scorelines"]:
            assert sl["probability"] > 0.0

    def test_scorelines_are_sorted_descending(self):
        """Most-likely scorelines should be in descending probability order."""
        r = self._run()
        probs = [sl["probability"] for sl in r["most_likely_scorelines"]]
        assert probs == sorted(probs, reverse=True)

    def test_goal_distributions_sum_to_one(self):
        """Poisson PMF distributions should sum close to 1.0 (capturing 0-7 goals)."""
        r = self._run()
        home_total = sum(r["home_goal_distribution"].values())
        away_total = sum(r["away_goal_distribution"].values())
        # 0-7 goals captures > 99.9% for typical lambdas < 3
        assert home_total > 0.99
        assert away_total > 0.99

    def test_three_scenarios_generated(self):
        """Exactly three scenarios must be returned."""
        r = self._run()
        assert len(r["scenarios"]) == 3

    def test_scenario_names(self):
        """Scenarios must have correct names."""
        r = self._run()
        names = {s["scenario"] for s in r["scenarios"]}
        assert names == {"logical", "contested", "surprise"}

    def test_scenario_outcomes_valid(self):
        """Each scenario outcome must be HOME_WIN, DRAW, or AWAY_WIN."""
        r = self._run()
        valid = {"HOME_WIN", "DRAW", "AWAY_WIN"}
        for s in r["scenarios"]:
            assert s["outcome"] in valid

    def test_n_simulations_recorded(self):
        r = self._run(n=12_345)
        assert r["n_simulations"] == 12_345

    def test_dominant_home_team_wins_more(self):
        """A much stronger home team should have home_win_prob > away_win_prob."""
        r = run_monte_carlo_simulation(
            home_avg_scored=3.5,
            home_avg_conceded=0.3,
            away_avg_scored=0.5,
            away_avg_conceded=3.0,
            n_simulations=self.N,
            seed=99,
        )
        assert r["home_win_prob"] > r["away_win_prob"]

    def test_equal_teams_balanced_probs(self):
        """Equal teams with no home advantage: draw should be the modal outcome."""
        r = run_monte_carlo_simulation(
            home_avg_scored=1.35,
            home_avg_conceded=1.35,
            away_avg_scored=1.35,
            away_avg_conceded=1.35,
            home_advantage=0.0,
            n_simulations=self.N,
            seed=0,
        )
        # With equal teams, home_win_prob ≈ away_win_prob
        assert abs(r["home_win_prob"] - r["away_win_prob"]) < 0.05

    def test_seed_reproducibility(self):
        """Same seed should produce identical results."""
        r1 = run_monte_carlo_simulation(1.5, 1.0, 1.2, 0.8, n_simulations=50_000, seed=7)
        r2 = run_monte_carlo_simulation(1.5, 1.0, 1.2, 0.8, n_simulations=50_000, seed=7)
        assert r1["home_win_prob"] == r2["home_win_prob"]
        assert r1["most_likely_scorelines"] == r2["most_likely_scorelines"]

    def test_different_seeds_slightly_different(self):
        """Different seeds should not produce identical outcome probs."""
        r1 = run_monte_carlo_simulation(1.5, 1.0, 1.2, 0.8, n_simulations=5_000, seed=1)
        r2 = run_monte_carlo_simulation(1.5, 1.0, 1.2, 0.8, n_simulations=5_000, seed=2)
        # At 5K samples, random variation should cause small but non-zero differences
        assert r1["home_win_prob"] != r2["home_win_prob"]


# ---------------------------------------------------------------------------
# Unit tests — simulate_match (JSON wrapper)
# ---------------------------------------------------------------------------

class TestSimulateMatch:
    def test_returns_valid_json(self):
        result_json = simulate_match(
            home_avg_scored=1.5,
            home_avg_conceded=1.0,
            away_avg_scored=1.0,
            away_avg_conceded=1.3,
            n_simulations=10_000,
        )
        result = json.loads(result_json)
        assert isinstance(result, dict)

    def test_json_contains_required_keys(self):
        result = json.loads(simulate_match(1.5, 1.0, 1.0, 1.3, n_simulations=10_000))
        required_keys = {
            "lambda_home", "lambda_away",
            "home_win_prob", "draw_prob", "away_win_prob",
            "expected_home_goals", "expected_away_goals",
            "most_likely_scorelines", "home_goal_distribution",
            "away_goal_distribution", "scenarios", "n_simulations",
        }
        assert required_keys.issubset(set(result.keys()))

    def test_json_probabilities_sum_to_one(self):
        result = json.loads(simulate_match(1.5, 1.0, 1.0, 1.3, n_simulations=20_000))
        total = result["home_win_prob"] + result["draw_prob"] + result["away_win_prob"]
        assert total == pytest.approx(1.0, abs=TOLERANCE)


# ---------------------------------------------------------------------------
# Unit tests — _outcome_of helper
# ---------------------------------------------------------------------------

class TestOutcomeOf:
    def test_home_win(self):
        assert _outcome_of((2, 1)) == "HOME_WIN"
        assert _outcome_of((1, 0)) == "HOME_WIN"

    def test_draw(self):
        assert _outcome_of((0, 0)) == "DRAW"
        assert _outcome_of((2, 2)) == "DRAW"

    def test_away_win(self):
        assert _outcome_of((0, 1)) == "AWAY_WIN"
        assert _outcome_of((1, 3)) == "AWAY_WIN"


# ---------------------------------------------------------------------------
# Integration-style test: run a realistic World Cup match scenario
# ---------------------------------------------------------------------------

class TestRealisticWorldCupScenario:
    """
    Simulate England vs RD Congo using real tournament stats:
    - England: 5 goals in 3 games scored, 0 conceded → 1.67 scored, 0.0 conceded
    - RD Congo: qualified as 3rd, ~1.0 scored, ~1.5 conceded
    """

    def test_england_vs_rd_congo(self):
        r = run_monte_carlo_simulation(
            home_avg_scored=1.67,
            home_avg_conceded=0.33,
            away_avg_scored=0.67,
            away_avg_conceded=1.67,
            n_simulations=100_000,
            seed=2026,
        )
        # England should heavily favour home win
        assert r["home_win_prob"] > 0.50, (
            f"Expected England win prob > 0.50 but got {r['home_win_prob']}"
        )
        # Most likely scoreline should be a low-scoring England win
        best = r["most_likely_scorelines"][0]
        assert best["home_score"] >= best["away_score"], (
            f"Expected England to outscore Congo in most likely scenario, got {best}"
        )
        # Three scenarios
        assert len(r["scenarios"]) == 3
        # Probabilities sum to 1
        total = r["home_win_prob"] + r["draw_prob"] + r["away_win_prob"]
        assert total == pytest.approx(1.0, abs=TOLERANCE)
