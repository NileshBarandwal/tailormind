from fastapi import FastAPI

from backend.api.routes import applications, instructions, jobs, profile


app = FastAPI(title="TailorMind API")

app.include_router(jobs.router, prefix="/api", tags=["jobs"])
app.include_router(profile.router, prefix="/api", tags=["profile"])
app.include_router(applications.router, prefix="/api", tags=["applications"])
app.include_router(instructions.router, prefix="/api", tags=["instructions"])


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
