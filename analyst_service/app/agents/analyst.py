from google.adk.agents import Agent, SequentialAgent
from google.genai import types as genai_types
from app.schemas.prediction import MatchPredictionResponse
from app.agents.researcher import create_research_agent

def create_structured_output_agent() -> Agent:
    return Agent(
        name="structured_output_agent",
        model="gemini-3-flash-preview",
        instruction="""
You are a professional football analyst. Read the research report provided about the match between {home_team} and {away_team} (match ID: {match_id}).
Based on the research, compile the final analysis and provide:
1. The recent form as a list of 'W', 'D', or 'L'. If exact details are missing, make a realistic estimate based on recent status.
2. The H2H records (number of matches played, home wins, away wins, draws).
3. The overall suggested outcome and estimated score.
4. A concise context summary in the requested language (target language: {language}).
5. Exactly three distinct score scenarios (options) with their probability scores. The sum of probabilities for the three options must equal 1.0.

CRITICAL INSTRUCTION FOR UNPREDICTABILITY / SURPRISE:
Football is unpredictable and full of unexpected turns (e.g. red cards, late-minute penalties, underdog victories, tactical masterclasses, weather extremes).
The three score scenarios (options) must NOT be variations of the exact same outcome. Instead, provide:
- Scenario 1 (Logical): The most statistically probable, standard, and logical outcome based on recent form and stats.
- Scenario 2 (Contested / Alternative): A tight draw or a highly contested counter-scenario.
- Scenario 3 (Surprising Upset / Drama): A surprising but realistic underdog victory, a dramatic late comeback, or a chaotic high-scoring match.
Distribute the probability scores realistically among these three scenarios to reflect this unpredictability.

Write the values for all text properties (such as 'context_summary' and 'description' inside options) in the requested language (target language: {language}).
Format your response strictly adhering to the output schema.
""",
        generate_content_config=genai_types.GenerateContentConfig(
            temperature=1.0,
        ),
        output_schema=MatchPredictionResponse,
        output_key="prediction_result"
    )

def create_analyst_agent() -> SequentialAgent:
    return SequentialAgent(
        name="analyst_agent",
        sub_agents=[create_research_agent(), create_structured_output_agent()]
    )
