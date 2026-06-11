from google.adk.agents import Agent
from google.adk.tools.google_search_tool import google_search

def create_research_agent() -> Agent:
    return Agent(
        name="research_agent",
        model="gemini-3-flash-preview",
        instruction="""
You are an expert sports researcher. Your task is to investigate the upcoming football match between {home_team} and {away_team}.
Use Google Search to find historical head-to-head records, recent match results/form, team news, or injuries.
Write a detailed research report summarizing:
1. Recent form (last 5 matches) of both teams.
2. Head-to-Head (H2H) record between them.
3. Key context (injuries, importance of the match, tournament situation).
Keep all summaries and notes in the requested language (target language: {language}).
""",
        tools=[google_search]
    )
