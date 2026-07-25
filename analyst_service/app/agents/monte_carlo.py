"""
Monte Carlo Statistical Engine for FIFA World Cup 2026 match prediction.

Uses Poisson-distributed goal scoring models calibrated from team stats
(average goals scored/conceded) to run N simulation trials and derive
empirical probability distributions for match outcomes and scorelines.
"""

import random
import math
import json
from typing import Optional, Any


# ---------------------------------------------------------------------------
# Core Poisson helpers
# ---------------------------------------------------------------------------

def _poisson_pmf(k: int, lam: float) -> float:
    """P(X = k) for Poisson(lambda)."""
    if lam <= 0:
        return 1.0 if k == 0 else 0.0
    return math.exp(-lam) * (lam ** k) / math.factorial(k)


def _sample_poisson(lam: float, rng: random.Random) -> int:
    """Sample a Poisson random variable using Knuth's algorithm."""
    if lam <= 0:
        return 0
    L = math.exp(-lam)
    k = 0
    p = 1.0
    while p > L:
        k += 1
        p *= rng.random()
    return k - 1


# ---------------------------------------------------------------------------
# Attack / Defence strength calibration
# ---------------------------------------------------------------------------

def compute_lambdas(
    home_avg_scored: float,
    home_avg_conceded: float,
    away_avg_scored: float,
    away_avg_conceded: float,
    home_advantage: float = 0.10,
    league_avg_goals: float = 1.35,
) -> tuple[float, float]:
    """
    Compute expected goals (lambda) for home and away teams using
    the Dixon-Coles-inspired attack/defence strength model.

    Attack strength  = team_avg_scored  / league_avg
    Defence strength = team_avg_conceded / league_avg

    Expected goals for home = home_attack * away_defence * league_avg * (1 + home_advantage)
    Expected goals for away = away_attack * home_defence * league_avg

    Args:
        home_avg_scored: Average goals scored per match by the home team.
        home_avg_conceded: Average goals conceded per match by the home team.
        away_avg_scored: Average goals scored per match by the away team.
        away_avg_conceded: Average goals conceded per match by the away team.
        home_advantage: Multiplicative boost for home team (default 10%).
        league_avg_goals: Tournament average goals per team per game.

    Returns:
        (lambda_home, lambda_away) — Poisson rate parameters.
    """
    eps = 1e-6  # avoid division by zero
    home_attack  = home_avg_scored   / (league_avg_goals + eps)
    home_defence = home_avg_conceded / (league_avg_goals + eps)
    away_attack  = away_avg_scored   / (league_avg_goals + eps)
    away_defence = away_avg_conceded / (league_avg_goals + eps)

    lambda_home = home_attack * away_defence * league_avg_goals * (1.0 + home_advantage)
    lambda_away = away_attack * home_defence * league_avg_goals

    # Clamp to reasonable World Cup range
    lambda_home = max(0.3, min(lambda_home, 5.0))
    lambda_away = max(0.3, min(lambda_away, 5.0))

    return lambda_home, lambda_away


# ---------------------------------------------------------------------------
# Main simulation entry point
# ---------------------------------------------------------------------------

def run_monte_carlo_simulation(
    home_avg_scored: float,
    home_avg_conceded: float,
    away_avg_scored: float,
    away_avg_conceded: float,
    n_simulations: int = 100_000,
    home_advantage: float = 0.10,
    league_avg_goals: float = 1.35,
    top_n_scorelines: int = 10,
    seed: Optional[int] = 42,
) -> dict[str, Any]:
    """
    Run Monte Carlo simulations to produce match outcome probabilities.

    Args:
        home_avg_scored: Home team's average goals scored per game.
        home_avg_conceded: Home team's average goals conceded per game.
        away_avg_scored: Away team's average goals scored per game.
        away_avg_conceded: Away team's average goals conceded per game.
        n_simulations: Number of simulation trials (default 100,000).
        home_advantage: Multiplicative home-field advantage factor.
        league_avg_goals: Baseline average goals/game for calibration.
        top_n_scorelines: Number of most-likely scorelines to return.
        seed: Random seed for reproducibility.

    Returns:
        dict with simulation parameters, outcome probabilities, and scenarios.
    """
    if n_simulations <= 0:
        raise ValueError(f"n_simulations must be positive, got {n_simulations}")

    if any(val < 0 for val in (home_avg_scored, home_avg_conceded, away_avg_scored, away_avg_conceded)):
        raise ValueError("Average goals scored and conceded must be non-negative.")

    rng = random.Random(seed)

    lambda_home, lambda_away = compute_lambdas(
        home_avg_scored, home_avg_conceded,
        away_avg_scored, away_avg_conceded,
        home_advantage, league_avg_goals,
    )

    # Counters
    home_wins = 0
    draws = 0
    away_wins = 0
    total_home_goals = 0
    total_away_goals = 0
    scoreline_counts: dict[tuple[int, int], int] = {}

    for _ in range(n_simulations):
        h = _sample_poisson(lambda_home, rng)
        a = _sample_poisson(lambda_away, rng)

        total_home_goals += h
        total_away_goals += a

        if h > a:
            home_wins += 1
        elif h == a:
            draws += 1
        else:
            away_wins += 1

        key = (h, a)
        scoreline_counts[key] = scoreline_counts.get(key, 0) + 1

    # Outcome probabilities
    home_win_prob = home_wins / n_simulations
    draw_prob     = draws     / n_simulations
    away_win_prob = away_wins / n_simulations

    # Expected goals
    expected_home = total_home_goals / n_simulations
    expected_away = total_away_goals / n_simulations

    # Top N scorelines
    sorted_scorelines = sorted(
        scoreline_counts.items(), key=lambda x: x[1], reverse=True
    )[:top_n_scorelines]
    most_likely_scorelines = [
        {
            "home_score": s[0],
            "away_score": s[1],
            "probability": round(cnt / n_simulations, 4),
        }
        for s, cnt in sorted_scorelines
    ]

    # Goal distribution (0-7 goals)
    home_goal_dist = {
        k: round(_poisson_pmf(k, lambda_home), 4) for k in range(8)
    }
    away_goal_dist = {
        k: round(_poisson_pmf(k, lambda_away), 4) for k in range(8)
    }

    # -----------------------------------------------------------------------
    # Build three structured scenarios for the analyst agent
    # -----------------------------------------------------------------------
    # Determine most likely scoreline overall
    best_sl = sorted_scorelines[0][0] if sorted_scorelines else (int(round(expected_home)), int(round(expected_away)))

    # Scenario 1 — Logical (most probable outcome)
    if home_win_prob >= draw_prob and home_win_prob >= away_win_prob:
        s1_outcome = "HOME_WIN"
    elif draw_prob >= home_win_prob and draw_prob >= away_win_prob:
        s1_outcome = "DRAW"
    else:
        s1_outcome = "AWAY_WIN"
    s1_prob = round(max(home_win_prob, draw_prob, away_win_prob), 4)
    s1_score_h = best_sl[0]
    s1_score_a = best_sl[1]

    # Scenario 2 — Contested (second most probable outcome)
    probs = sorted(
        [("HOME_WIN", home_win_prob), ("DRAW", draw_prob), ("AWAY_WIN", away_win_prob)],
        key=lambda x: x[1], reverse=True
    )
    s2_outcome = probs[1][0]
    s2_prob = round(probs[1][1], 4)
    # Find best scoreline consistent with scenario 2
    s2_sl = next(
        (sl for sl, _ in sorted_scorelines if _outcome_of(sl) == s2_outcome),
        (int(round(expected_home)), int(round(expected_away)))
    )
    s2_score_h, s2_score_a = s2_sl

    # Scenario 3 — Surprise (least probable outcome + shock scoreline)
    s3_outcome = probs[2][0]
    s3_prob = round(probs[2][1], 4)
    # Pick a less-expected but plausible scoreline for the surprise
    s3_sl = next(
        (sl for sl, _ in sorted_scorelines[3:] if _outcome_of(sl) == s3_outcome),
        None
    )
    if s3_sl is None:
        # Fallback: mirror best scoreline
        if s3_outcome == "HOME_WIN":
            s3_sl = (max(best_sl[0] + 1, 2), max(best_sl[1] - 1, 0))
        elif s3_outcome == "AWAY_WIN":
            s3_sl = (max(best_sl[0] - 1, 0), max(best_sl[1] + 1, 2))
        else:
            s3_sl = (best_sl[0], best_sl[0])  # equal score draw
    s3_score_h, s3_score_a = s3_sl

    scenarios = [
        {
            "scenario": "logical",
            "outcome": s1_outcome,
            "home_score": s1_score_h,
            "away_score": s1_score_a,
            "probability": s1_prob,
            "description": f"Most statistically probable outcome based on Poisson model (λ_home={lambda_home:.2f}, λ_away={lambda_away:.2f}).",
        },
        {
            "scenario": "contested",
            "outcome": s2_outcome,
            "home_score": s2_score_h,
            "away_score": s2_score_a,
            "probability": s2_prob,
            "description": "Second most likely outcome — a tighter or contested result.",
        },
        {
            "scenario": "surprise",
            "outcome": s3_outcome,
            "home_score": s3_score_h,
            "away_score": s3_score_a,
            "probability": s3_prob,
            "description": "Surprise / upset scenario — lower probability but statistically possible.",
        },
    ]

    return {
        "lambda_home": round(lambda_home, 4),
        "lambda_away": round(lambda_away, 4),
        "home_win_prob": round(home_win_prob, 4),
        "draw_prob": round(draw_prob, 4),
        "away_win_prob": round(away_win_prob, 4),
        "expected_home_goals": round(expected_home, 3),
        "expected_away_goals": round(expected_away, 3),
        "most_likely_scorelines": most_likely_scorelines,
        "home_goal_distribution": home_goal_dist,
        "away_goal_distribution": away_goal_dist,
        "scenarios": scenarios,
        "n_simulations": n_simulations,
    }


def _outcome_of(scoreline: tuple[int, int]) -> str:
    h, a = scoreline
    if h > a:
        return "HOME_WIN"
    elif h == a:
        return "DRAW"
    return "AWAY_WIN"


# ---------------------------------------------------------------------------
# Convenience: JSON-serialisable wrapper (for use as ADK FunctionTool)
# ---------------------------------------------------------------------------

def simulate_match(
    home_avg_scored: float,
    home_avg_conceded: float,
    away_avg_scored: float,
    away_avg_conceded: float,
    n_simulations: int = 100_000,
    home_advantage: float = 0.10,
) -> str:
    """
    Run a Monte Carlo Poisson simulation for a football match and return
    a JSON string with outcome probabilities, expected goals, most likely
    scorelines, goal distributions, and three structured prediction scenarios.

    Args:
        home_avg_scored: Home team average goals scored per game in the tournament.
        home_avg_conceded: Home team average goals conceded per game in the tournament.
        away_avg_scored: Away team average goals scored per game in the tournament.
        away_avg_conceded: Away team average goals conceded per game in the tournament.
        n_simulations: Number of Monte Carlo trials (default 100,000).
        home_advantage: Home-field advantage multiplier (default 0.10 = 10%).

    Returns:
        JSON string with full simulation results.
    """
    result = run_monte_carlo_simulation(
        home_avg_scored=home_avg_scored,
        home_avg_conceded=home_avg_conceded,
        away_avg_scored=away_avg_scored,
        away_avg_conceded=away_avg_conceded,
        n_simulations=n_simulations,
        home_advantage=home_advantage,
    )
    return json.dumps(result, ensure_ascii=False)


# ---------------------------------------------------------------------------
# CLI self-test
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    print("=== Monte Carlo Self-Test: Colombia vs Portugal ===")
    # Colombia: ~1.0 scored, ~0.33 conceded per game
    # Portugal: ~1.67 scored, ~0.67 conceded per game
    result = run_monte_carlo_simulation(
        home_avg_scored=1.0,
        home_avg_conceded=0.33,
        away_avg_scored=1.67,
        away_avg_conceded=0.67,
        n_simulations=200_000,
    )
    print(json.dumps(result, indent=2, ensure_ascii=False))
