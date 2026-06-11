from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.endpoints import router as api_router

def create_app() -> FastAPI:
    app = FastAPI(title="FIFA World Cup 2026 AI Analyst Microservice")

    # Configure CORS Middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Register API routers
    app.include_router(api_router)
    
    @app.get("/")
    def read_root():
        return {"status": "healthy", "service": "FIFA World Cup 2026 AI Analyst Microservice"}

    return app

app = create_app()
