from pydantic import BaseModel, Field, field_validator, model_validator
from typing import List, Literal

class PredictionOption(BaseModel):
    home_score: int = Field(..., ge=0, description="Estimated goals for the home team")
    away_score: int = Field(..., ge=0, description="Estimated goals for the away team")
    probability: float = Field(..., ge=0.0, le=1.0, description="Probability of this option, value between 0.0 and 1.0 (sum of all options must be 1.0)")
    outcome: Literal["HOME_WIN", "DRAW", "AWAY_WIN"] = Field(..., description="Match outcome for this option")
    description: str = Field(..., description="Brief explanation in English of this scenario")

class RecentForm(BaseModel):
    home: List[str] = Field(..., description="Recent form of home team as a list of W, D, or L")
    away: List[str] = Field(..., description="Recent form of away team as a list of W, D, or L")

class H2HRecord(BaseModel):
    played: int = Field(..., ge=0, description="Total matches played historically")
    home_wins: int = Field(..., ge=0, description="Matches won by the home team")
    away_wins: int = Field(..., ge=0, description="Matches won by the away team")
    draws: int = Field(..., ge=0, description="Matches ending in a draw")

    @model_validator(mode="after")
    def check_wins_draws_total(self) -> "H2HRecord":
        if self.home_wins + self.away_wins + self.draws > self.played:
            raise ValueError("Sum of wins and draws cannot exceed total played matches.")
        return self

class EstimatedScore(BaseModel):
    home: int = Field(..., ge=0, description="Estimated goals for home team")
    away: int = Field(..., ge=0, description="Estimated goals for away team")

class MatchPredictionResponse(BaseModel):
    match_id: str = Field(..., description="The unique ID of the match")
    recent_form: RecentForm = Field(..., description="Recent form of both teams")
    h2h_record: H2HRecord = Field(..., description="Historical head-to-head record")
    suggested_outcome: Literal["HOME_WIN", "DRAW", "AWAY_WIN"] = Field(..., description="Overall suggested outcome of the match")
    estimated_score: EstimatedScore = Field(..., description="Overall estimated score")
    context_summary: str = Field(..., description="A well-argued, concise breakdown of the matchup form and context in English")
    options: List[PredictionOption] = Field(..., description="Exactly three distinct prediction options/scenarios with their probability scores")

    @field_validator("options")
    @classmethod
    def validate_options_count(cls, v: List[PredictionOption]) -> List[PredictionOption]:
        if len(v) != 3:
            raise ValueError(f"Expected exactly 3 prediction options, got {len(v)}")
        return v
