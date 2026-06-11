import json
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from google.genai import types as genai_types
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from app.agents import create_analyst_agent, create_search_agent

router = APIRouter()

# Request schemas
class PredictionRequest(BaseModel):
    match_id: str
    home_team: str
    away_team: str
    language: str = "es"

class SearchRequest(BaseModel):
    query: str
    language: str = "es"

@router.get("/health")
def health_check():
    return {"status": "healthy", "service": "FIFA World Cup 2026 AI Analyst Microservice"}

@router.post("/predict")
async def predict_match(req: PredictionRequest):
    agent = create_analyst_agent()
    session_service = InMemorySessionService()
    session_id = f"session_{req.match_id}"
    user_id = "analyst_user"
    app_name = "world_cup_analyst"
    
    initial_state = {
        "home_team": req.home_team,
        "away_team": req.away_team,
        "match_id": req.match_id,
        "language": req.language
    }
    
    session = await session_service.create_session(
        app_name=app_name,
        user_id=user_id,
        session_id=session_id,
        state=initial_state
    )
    
    runner = Runner(agent=agent, app_name=app_name, session_service=session_service)
    query = f"Predict the match {req.home_team} vs {req.away_team} with match ID {req.match_id}."
    
    final_prediction = None
    try:
        async for event in runner.run_async(
            user_id=user_id,
            session_id=session_id,
            new_message=genai_types.Content(
                role="user",
                parts=[genai_types.Part.from_text(text=query)]
            ),
        ):
            text_part = event.content.parts[0].text if event.content and event.content.parts else "No content"
            print(f"[EVENT] Author: {event.author} | Content: {text_part[:150]}...")
            
            # Extract JSON from the structured output agent final response
            if event.author == "structured_output_agent" and event.is_final_response() and event.content and event.content.parts:
                try:
                    final_prediction = json.loads(event.content.parts[0].text)
                except Exception as je:
                    print(f"Failed to parse JSON content: {je}")
                    pass
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")

    result_data = final_prediction or session.state.get("prediction_result")
    if result_data:
        return result_data
    else:
        raise HTTPException(status_code=500, detail="No structured prediction could be generated.")

@router.post("/search")
async def search_query(req: SearchRequest):
    agent = create_search_agent()
    session_service = InMemorySessionService()
    session_id = "search_session_default"
    user_id = "search_user"
    app_name = "world_cup_search"
    
    await session_service.create_session(
        app_name=app_name,
        user_id=user_id,
        session_id=session_id,
        state={"language": req.language}
    )
    
    runner = Runner(agent=agent, app_name=app_name, session_service=session_service)
    
    try:
        final_answer = None
        async for event in runner.run_async(
            user_id=user_id,
            session_id=session_id,
            new_message=genai_types.Content(
                role="user",
                parts=[genai_types.Part.from_text(text=req.query)]
            ),
        ):
            if event.is_final_response():
                final_answer = event.content.parts[0].text
        
        if final_answer is not None:
            return {"answer": final_answer}
        else:
            raise HTTPException(status_code=500, detail="No final answer could be generated.")
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")
