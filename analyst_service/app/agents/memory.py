import os
from google.adk.memory import VertexAiMemoryBankService, InMemoryMemoryService

def get_memory_service():
    """
    Returns VertexAiMemoryBankService if AGENT_ENGINE_ID is configured in the environment,
    otherwise falls back to InMemoryMemoryService for local runs and development.
    """
    agent_engine_id = os.getenv("AGENT_ENGINE_ID")
    if agent_engine_id:
        return VertexAiMemoryBankService(
            project=os.getenv("GOOGLE_CLOUD_PROJECT"),
            location=os.getenv("GOOGLE_CLOUD_LOCATION", "us-central1"),
            agent_engine_id=agent_engine_id
        )
    return InMemoryMemoryService()
