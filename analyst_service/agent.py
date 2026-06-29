import sys
import os

# Ensure analyst_service directory is in the PYTHONPATH so python can resolve 'app' package
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# ---------------------------------------------------------------------------
# Fix: OpenTelemetry asyncio context ValueError
# Known issue: OTel context tokens created in one coroutine can't be detached
# in another. Patch `detach` to suppress the ValueError silently.
# ---------------------------------------------------------------------------
import opentelemetry.context as _otel_ctx

_original_detach = _otel_ctx.detach

def _safe_detach(token):
    try:
        _original_detach(token)
    except ValueError:
        pass  # Ignore cross-context detach errors in asyncio

_otel_ctx.detach = _safe_detach

# ---------------------------------------------------------------------------
# ADK root_agent — required so ADK's Runner can auto-detect the app name
# and avoid the "App name mismatch" warning.
# ---------------------------------------------------------------------------
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
    create_statistical_agent,
)

# ADK convention: a module-level `root_agent` variable allows the Runner
# to correctly resolve the app name from this file's location.
root_agent = create_analyst_agent()
