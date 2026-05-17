from fastapi import FastAPI

from backend.api.routes import (
    applications,
    applications_store,
    generate,
    instructions,
    jobs,
    profile,
)


app = FastAPI(title="TailorMind API")

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
