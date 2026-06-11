from pydantic import BaseModel, Field
from typing import List, Literal

class PredictionOption(BaseModel):
    home_score: int = Field(..., description="Estimated goals for the home team")
    away_score: int = Field(..., description="Estimated goals for the away team")
    probability: float = Field(..., description="Probability of this option, value between 0.0 and 1.0 (sum of all options must be 1.0)")
    outcome: Literal["HOME_WIN", "DRAW", "AWAY_WIN"] = Field(..., description="Match outcome for this option")
    description: str = Field(..., description="Brief explanation in English of this scenario")

class RecentForm(BaseModel):
    home: List[str] = Field(..., description="Recent form of home team as a list of W, D, or L")
    away: List[str] = Field(..., description="Recent form of away team as a list of W, D, or L")

class H2HRecord(BaseModel):
    played: int = Field(..., description="Total matches played historically")
    home_wins: int = Field(..., description="Matches won by the home team")
    away_wins: int = Field(..., description="Matches won by the away team")
    draws: int = Field(..., description="Matches ending in a draw")

class EstimatedScore(BaseModel):
    home: int = Field(..., description="Estimated goals for home team")
    away: int = Field(..., description="Estimated goals for away team")

class MatchPredictionResponse(BaseModel):
    match_id: str = Field(..., description="The unique ID of the match")
    recent_form: RecentForm = Field(..., description="Recent form of both teams")
    h2h_record: H2HRecord = Field(..., description="Historical head-to-head record")
    suggested_outcome: Literal["HOME_WIN", "DRAW", "AWAY_WIN"] = Field(..., description="Overall suggested outcome of the match")
    estimated_score: EstimatedScore = Field(..., description="Overall estimated score")
    context_summary: str = Field(..., description="A well-argued, concise breakdown of the matchup form and context in English")
    options: List[PredictionOption] = Field(..., description="Exactly three distinct prediction options/scenarios with their probability scores")
