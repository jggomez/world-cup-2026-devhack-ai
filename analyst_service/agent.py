import sys
import os

# Ensure analyst_service directory is in the PYTHONPATH so python can resolve 'app' package
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.schemas.prediction import (
    PredictionOption,
    RecentForm,
    H2HRecord,
    EstimatedScore,
    MatchPredictionResponse,
)
from app.agents import (
    create_research_agent,
    create_structured_output_agent,
    create_analyst_agent,
    create_search_agent,
)
