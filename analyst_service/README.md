# FIFA World Cup 2026 AI Analyst Microservice

This microservice provides AI-driven football predictions, group-stage standings analysis, and conversational search capability specifically scoped to the FIFA World Cup. It is built using **FastAPI** and the **Google Agent Development Kit (ADK)**.

---

## Architecture & Workflow

The microservice uses a custom `ConditionalAnalystOrchestrator` to coordinate sub-agents and execute evaluations.

```mermaid
graph TD
    Client[Web Client] -->|POST /predict| Predict[FastAPI /predict]
    Predict --> Orchestrator[ConditionalAnalystOrchestrator]
    
    subgraph "Orchestrator Pipeline"
        Orchestrator -->|Step 1| Researcher[research_agent]
        Researcher -->|google_search| Search[(Google Search)]
        Search --> Researcher
        
        Researcher -->|research report| Analyst[structured_output_agent]
        Analyst -->|candidate prediction| Check{Is max_prob <= 40%?}
        
        Check -->|Yes: Doubtful| Critic[critic_agent]
        Critic -->|critic feedback| Refiner[refiner_agent]
        Refiner -->|refined prediction| FinalOutput[Final Prediction Output]
        
        Check -->|No: Confident| FinalOutput
    end
    
    FinalOutput -->|Callback Save| MemoryBank[(Vertex AI Memory Bank)]
    FinalOutput --> Client
```

---

## Key Features

1. **Group Standings Context**: The `research_agent` queries current group standings, scores, direct competitor results, and points to determine the pressure and qualification math.
2. **Conditional Critic Evaluator Pattern**: Implements the `ConditionalAnalystOrchestrator` (`BaseAgent` subclass) to evaluate predictions. If the highest probability is `0.40` or lower, it triggers `critic_agent` (evaluates biases and overlooked motivation) and `refiner_agent` (re-distributes probabilities) to ensure high-fidelity forecasting.
3. **Vertex AI Memory Bank Integration**: Integrates the `VertexAiMemoryBankService` to save predicting sessions persistently. Handled via the automatic `after_agent_callback` hook (`auto_save_session_to_memory_callback`), which ensures every generated prediction is recorded without duplicate calls.

---

## Directory Structure

Following software engineering best practices, the codebase is separated into clean packages:

```
analyst_service/
├── app/
│   ├── core/                  # Core configurations & environments
│   ├── schemas/               # API schemas & data structures
│   │   └── prediction.py      # Match prediction response schemas
│   ├── agents/                # AI Agents definitions
│   │   ├── researcher.py      # Researcher agent (queries Google Search for standings, results, and facts)
│   │   ├── analyst.py         # Analyst, Critic, Refiner, and Orchestrator definitions
│   │   ├── search.py          # Conversational World Cup Search assistant
│   │   └── memory.py          # Vertex AI Memory Bank / InMemory service initializer
│   └── api/                   # Router and endpoint logic
│       └── endpoints.py       # FastAPI handlers
├── main.py                    # Root entrypoint wrapper for Docker/Uvicorn
├── agent.py                   # Proxy for backwards compatibility
└── pyproject.toml             # Python project dependencies
```

---

## API Endpoints

### 1. Health Check
*   **Method**: `GET`
*   **Path**: `/health`
*   **Response**:
    ```json
    {"status": "healthy", "service": "FIFA World Cup 2026 AI Analyst Microservice"}
    ```

### 2. Match Prediction
*   **Method**: `POST`
*   **Path**: `/predict`
*   **Headers**: `Content-Type: application/json`
*   **Payload**:
    ```json
    {
      "match_id": "wc2026_gA_m01",
      "home_team": "México",
      "away_team": "República Checa",
      "language": "es"
    }
    ```
*   **Response**: A structured JSON object containing H2H records, recent form list, suggested outcomes, and exactly three detailed score scenarios.

### 3. World Cup Chat Search
*   **Method**: `POST`
*   **Path**: `/search`
*   **Headers**: `Content-Type: application/json`
*   **Payload**:
    ```json
    {
      "query": "Who won the World Cup in 2010?",
      "language": "en"
    }
    ```
*   **Response**: A markdown text containing the verified World Cup information.

---

## Local Development Setup

Ensure you have **uv** installed. Configure environment variables in `.env` (refer to `.env.example`).

1.  **Install dependencies**:
    ```bash
    uv pip install -r pyproject.toml
    ```
2.  **Run locally**:
    ```bash
    ./run_local.sh
    ```
    The service will start at `http://localhost:8000`.
