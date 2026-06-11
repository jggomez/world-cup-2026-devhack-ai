# 🏆 FIFA World Cup 2026 Interactive Hub (WebGL & AI)

Welcome to the **FIFA World Cup 2026 Interactive Hub** — a cutting-edge web portal that features interactive WebGL graphics (Three.js), AI-driven tournament match forecasting, a personalized holographic sticker generator (Gemini Image API), and a conversational assistant with grounding (Google Search).

---

## System Architecture

The project consists of a client-side web application and a dedicated AI microservice.

```mermaid
graph LR
    subgraph Client App
        HTML[index.html / main.js]
        Three[Three.js 3D Intro]
        Sticker[Sticker Canvas Gen]
        Chat[WorldCupChat UI]
    end
    
    subgraph Client AI Helpers
        FirebaseClient[Firebase AI Client SDK]
        AILogic[FirebaseAILogic.js]
    end
    
    subgraph Backend Microservice
        FastAPI[FastAPI Server]
        ADK[ADK Sequential Agent]
        SearchTool[Google Search Tool]
    end
    
    HTML --> Three
    HTML --> AILogic
    AILogic -->|Direct Chat API| FirebaseClient
    FirebaseClient -->|Gemini 3.5 Flash| GeminiCloud[Gemini Developer API]
    
    AILogic -->|POST /predict| FastAPI
    AILogic -->|POST /search| FastAPI
    FastAPI --> ADK
    ADK --> SearchTool
    SearchTool -->|Grounding| Google[Google Search]
```

---

## Key Features

1.  **WebGL Intro**: A premium animated soccer ball entry featuring a holographic tactical grid pitch, glowing cyan energy core inside the sphere, PointLight path tracking, procedural orbital ring rotations, and a dramatic camera shake impact on goal.
2.  **Groups & Bracket Standings**: Live standings tables and knockout stages with real-time browser timezone conversion and fully responsive popups (featuring dynamic max-height constraints and internal scrolling).
3.  **AI Analyst Predictions**: A sequential multi-agent workflow that searches matchups in Google, applying a temperature of `1.0` to generate three distinct scenarios: Logical, Contested, and Upset/Drama.
4.  **Sticker Generator**: Transforms user photographs into holographic player cards with dynamically assigned jersey numbers based on position (DEF=2, MED=10, DEL=9, POR=1) and customizable role titles/icons (DEF="Leñador" with shield, MED="Crack" with magic spark, DEL="Goleador" with goal net, POR="Atajador" with gloves) with high-fidelity face mapping.
5.  **Conversational Chat IA**: A real-time chat powered by Firebase AI with an amber discoverability pulse indicator in the navigation tab bar (designed to fit perfectly on mobile screens in a single row).
6.  **Secure Config**: Zero hardcoded secrets, utilizing environment-based variables across client and backend configurations.

---

## Directory Structure

```
world-cup-app/
├── analyst_service/        # Python FastAPI AI Microservice (ADK Agents)
│   ├── app/                # Modular agent & schema configurations
│   └── main.py             # Server runner entrypoint
├── src/                    # Frontend SPA Codebase
│   ├── domain/             # Domain entity models (Match, Team, Sticker, Prediction)
│   ├── infrastructure/     # External adapters and cross-cutting concerns
│   │   ├── ai/             # FirebaseAILogic, WinnerAnimationTrigger
│   │   ├── db/             # DataLoader for local JSON schedules
│   │   ├── lang/           # TranslationDict, LocalizationService
│   │   ├── media/          # CameraService (webcam access)
│   │   ├── search/         # NLPQueryParser
│   │   ├── utils/          # TimezoneUtil and shared helpers
│   │   └── AppConfig.js    # Environment-based configuration
│   ├── resources/          # Static assets & StickerCardRenderer canvas helper
│   ├── ui/                 # View components & CSS animations
│   └── main.js             # Client bootstrap
├── resources/              # Static tournament data (JSON match schedules)
├── tests/                  # Automated test suites
│   └── unit/               # Unit tests (e.g. test_standings.js)
├── index.html              # Main web portal structure
├── package.json            # Node dev scripts (Vite build)
└── .env                    # System environment credentials
```

---

## Local Setup & Quickstart

### 1. Environment Configuration
Copy `.env.example` in both root and `analyst_service` to `.env` and fill in your Firebase/Google Cloud credentials:
```bash
cp .env.example .env
cp analyst_service/.env.example analyst_service/.env
```

### 2. Run the Backend Microservice
Navigate to `analyst_service/`, install dependencies with `uv`, and start:
```bash
cd analyst_service
uv pip install -r pyproject.toml
./run_local.sh
```

### 3. Run the Frontend App
Navigate to the root directory, install npm packages, and spin up the Vite development server:
```bash
npm install
npm run dev
```

Open `http://localhost:5173` in your browser to interact with the hub!
