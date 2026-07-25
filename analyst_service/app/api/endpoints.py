import json
import logging
import uuid
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, field_validator
from google.genai import types as genai_types
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from app.agents import create_search_agent, get_memory_service

logger = logging.getLogger(__name__)

router = APIRouter()

# Use a consistent app name across all runners
_APP_NAME = "world_cup_2026"

# Request schemas
class PredictionRequest(BaseModel):
    match_id: str = Field(..., min_length=1, description="Unique match identifier")
    home_team: str = Field(..., min_length=1, description="Home team name")
    away_team: str = Field(..., min_length=1, description="Away team name")
    language: str = Field("es", description="Target response language code")

    @field_validator("match_id", "home_team", "away_team")
    @classmethod
    def strip_and_validate_non_empty(cls, v: str) -> str:
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("Field cannot be empty or whitespace only")
        return cleaned

class SearchRequest(BaseModel):
    query: str = Field(..., min_length=1, description="User search query")
    language: str = Field("es", description="Target response language code")

    @field_validator("query")
    @classmethod
    def validate_query(cls, v: str) -> str:
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("Query cannot be empty or whitespace only")
        return cleaned

@router.get("/health")
def health_check():
    return {"status": "healthy", "service": "FIFA World Cup 2026 AI Analyst Microservice"}

@router.post("/predict")
async def predict_match(req: PredictionRequest):
    from app.agents import create_analyst_agent
    agent = create_analyst_agent()
    session_service = InMemorySessionService()
    memory_service = get_memory_service()
    session_id = f"session_{req.match_id}_{uuid.uuid4().hex[:6]}"
    user_id = "analyst_user"
    app_name = _APP_NAME
    
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
    
    runner = Runner(
        agent=agent,
        app_name=app_name,
        session_service=session_service,
        memory_service=memory_service
    )
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
            # .text is None for function-call/response events — guard before slicing
            raw_text = (event.content.parts[0].text if event.content and event.content.parts else None) or ""
            logger.info("[EVENT] Author: %s | Content preview: %s...", event.author, raw_text[:150])

            # Extract JSON from the structured output agent final response
            if event.author in ("structured_output_agent", "refiner_agent") and event.is_final_response() and event.content and event.content.parts:
                part_text = event.content.parts[0].text
                if part_text:
                    try:
                        final_prediction = json.loads(part_text)
                    except Exception as je:
                        logger.error("Failed to parse JSON content: %s", je)

    except Exception as e:
        logger.exception("Prediction request failed for match_id=%s", req.match_id)
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
    session_id = f"search_session_{uuid.uuid4().hex[:8]}"
    user_id = "search_user"
    app_name = _APP_NAME
    
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
            if event.is_final_response() and event.content and event.content.parts:
                final_answer = event.content.parts[0].text
        
        if final_answer is not None:
            return {"answer": final_answer}
        else:
            raise HTTPException(status_code=500, detail="No final answer could be generated.")
    except Exception as e:
        logger.exception("Search query failed for query='%s'", req.query)
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")
