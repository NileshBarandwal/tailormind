import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.api.routes import (
    applications,
    applications_store,
    generate,
    instructions,
    jobs,
    profile,
)
from backend.core.config import settings


app = FastAPI(title="TailorMind API")

# CORS — required for Vercel frontend to reach Railway backend
_origins = [o.strip() for o in settings.ALLOWED_ORIGINS.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins if _origins else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(jobs.router, prefix="/api", tags=["jobs"])
app.include_router(profile.router, prefix="/api", tags=["profile"])
app.include_router(applications.router, prefix="/api", tags=["applications"])
app.include_router(instructions.router, prefix="/api", tags=["instructions"])
app.include_router(generate.router, prefix="/api", tags=["generate"])
app.include_router(applications_store.router, prefix="/api", tags=["applications"])


@app.get("/health")
def health() -> dict:
    return {
        "status": "ok",
        "version": "1.0.0",
        "agents": [
            "jd_parser",
            "company_researcher",
            "profile_matcher",
            "resume_generator",
            "cover_letter_generator",
            "job_discovery",
            "application_card_generator",
        ],
        "endpoints": 16,
    }
