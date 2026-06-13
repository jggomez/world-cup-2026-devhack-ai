import sys
import json
import asyncio
from dotenv import load_dotenv
load_dotenv()
from google.genai import types as genai_types
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from agent import create_analyst_agent, create_search_agent
from app.agents import get_memory_service

async def run_predict(match_id, home_team, away_team):
    agent = create_analyst_agent()
    session_service = InMemorySessionService()
    memory_service = get_memory_service()
    session_id = f"session_{match_id}"
    user_id = "analyst_user"
    app_name = "world_cup_analyst"
    
    initial_state = {
        "home_team": home_team,
        "away_team": away_team,
        "match_id": match_id,
        "language": "es"
    }
    
    session = await session_service.create_session(
        app_name=app_name,
        user_id=user_id,
        session_id=session_id,
        state=initial_state
    )
    
    runner = Runner(
        agent=agent,
        app_name=app_name,
        session_service=session_service,
        memory_service=memory_service
    )
    query = f"Predict the match {home_team} vs {away_team} with match ID {match_id}."
    
    final_text = None
    async for event in runner.run_async(
        user_id=user_id,
        session_id=session_id,
        new_message=genai_types.Content(
            role="user",
            parts=[genai_types.Part.from_text(text=query)]
        ),
    ):
        if event.is_final_response():
            result_data = session.state.get("prediction_result")
            if result_data:
                final_text = json.dumps(result_data)
            else:
                final_text = event.content.parts[0].text
                
    return final_text

async def run_search(query):
    agent = create_search_agent()
    session_service = InMemorySessionService()
    session_id = "search_session_default"
    user_id = "search_user"
    app_name = "world_cup_search"
    
    await session_service.create_session(
        app_name=app_name,
        user_id=user_id,
        session_id=session_id
    )
    
    runner = Runner(agent=agent, app_name=app_name, session_service=session_service)
    
    final_text = None
    async for event in runner.run_async(
        user_id=user_id,
        session_id=session_id,
        new_message=genai_types.Content(
            role="user",
            parts=[genai_types.Part.from_text(text=query)]
        ),
    ):
        if event.is_final_response():
            final_text = event.content.parts[0].text
    return final_text

async def main():
    if len(sys.argv) < 3:
        print(json.dumps({"error": "Usage: python run_agent.py [predict|search] <args>"}), file=sys.stderr)
        sys.exit(1)
        
    mode = sys.argv[1]
    
    try:
        if mode == "predict":
            if len(sys.argv) < 5:
                print(json.dumps({"error": "Missing args for predict. Usage: predict <match_id> <home_team> <away_team>"}), file=sys.stderr)
                sys.exit(1)
            result = await run_predict(sys.argv[2], sys.argv[3], sys.argv[4])
        elif mode == "search":
            result = await run_search(sys.argv[2])
        else:
            print(json.dumps({"error": f"Unknown mode: {mode}"}), file=sys.stderr)
            sys.exit(1)
            
        if result:
            print(result)
        else:
            print(json.dumps({"error": "No response generated."}), file=sys.stderr)
            sys.exit(1)
            
    except Exception as e:
        print(json.dumps({"error": f"Agent execution failed: {str(e)}"}), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
