"""
Statistical Agent — ADK agent that:
  1. Receives match context from session state (set by researcher agent).
  2. Extracts team goal statistics (avg scored / avg conceded).
  3. Runs the Monte Carlo Poisson simulation via FunctionTool.
  4. Stores the simulation results in session state as 'monte_carlo_result'.

The downstream Analyst agent reads 'monte_carlo_result' to calibrate its
probability scenarios with statistically grounded evidence.
"""

from google.adk.agents import Agent
from google.adk.tools import FunctionTool
from app.agents.monte_carlo import simulate_match


def _create_simulate_tool() -> FunctionTool:
    """Wrap simulate_match as an ADK FunctionTool."""
    return FunctionTool(func=simulate_match)


def create_statistical_agent() -> Agent:
    """
    Create the Statistical Agent.

    This agent sits between the Researcher and the Analyst in the orchestration
    pipeline. It receives the researcher's notes from the session and uses
    real goal statistics to run a Monte Carlo simulation (100,000 trials).

    The result is stored in session state under the key 'monte_carlo_result'
    so the downstream Analyst can incorporate it into its structured prediction.
    """
    return Agent(
        name="statistical_agent",
        model="gemini-3-flash-preview",
        instruction="""
You are a quantitative football statistician specialized in Poisson-based Monte Carlo simulations.

Your task:
1. Read the research report that has been compiled for the match between {home_team} and {away_team}.
   The report is available in the session context and conversation history.

2. Extract the following statistics from the research report or use the most reliable estimates
   you can infer from it. If exact figures are unavailable, make a well-reasoned estimate based
   on known World Cup 2026 group stage performance:
   - home_avg_scored: Average goals scored per match by {home_team} in the tournament so far.
   - home_avg_conceded: Average goals conceded per match by {home_team} in the tournament so far.
   - away_avg_scored: Average goals scored per match by {away_team} in the tournament so far.
   - away_avg_conceded: Average goals conceded per match by {away_team} in the tournament so far.

   IMPORTANT: Use actual numbers (e.g. 1.33, 0.67). Do NOT use 0 for all values — if a team
   has played 0 games yet, use a reasonable FIFA ranking-based estimate (top-10 team ~ 1.5 goals/game,
   mid-table ~ 1.0, lower-ranked ~ 0.7).

3. Call the `simulate_match` tool with these four statistics plus:
   - n_simulations = 100000
   - home_advantage = 0.10 (standard World Cup neutral-venue reduction from 15% club average)

4. After calling the tool, read the JSON result and summarize the key findings concisely:
   - The Poisson λ parameters (λ_home, λ_away).
   - The outcome probabilities: home win %, draw %, away win %.
   - The top 3 most likely exact scorelines with their probabilities.
   - The three structured scenarios (logical, contested, surprise) with their probabilities.
   
5. Store your summary clearly so the analyst agent that follows can use it.
   Begin your summary with the line:
   **[MONTE CARLO SIMULATION RESULTS]** — 100,000 trials

Write ALL output in the requested language (target language: {language}).
""",
        tools=[_create_simulate_tool()],
        output_key="monte_carlo_result",
    )
