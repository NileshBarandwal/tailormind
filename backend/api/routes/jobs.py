import json

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from backend.agents.jd_parser import JDParser
from backend.agents.job_discovery import JobDiscovery
from backend.core.config import PROJECT_ROOT
from backend.models.schemas import DiscoveredJobs, ParsedJD, UserProfile


router = APIRouter()

_parser = JDParser()
_discovery = JobDiscovery()


PROFILE_DIR = PROJECT_ROOT / "data" / "profiles"


class ParseJDRequest(BaseModel):
    jd_text: str


@router.post("/parse-jd", response_model=ParsedJD)
def parse_jd(request: ParseJDRequest) -> ParsedJD:
    try:
        return _parser.parse(request.jd_text)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


class DiscoverRequest(BaseModel):
    profile_id: str
    query: str
    location: str = "India"
    max_results: int = 20


def _load_profile(profile_id: str) -> UserProfile:
    path = PROFILE_DIR / f"{profile_id}.json"
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"Profile '{profile_id}' not found")
    return UserProfile(**json.loads(path.read_text(encoding="utf-8")))


@router.post("/discover", response_model=DiscoveredJobs)
def discover(request: DiscoverRequest) -> DiscoveredJobs:
    profile = _load_profile(request.profile_id)
    return _discovery.discover(
        request.query, request.location, profile, request.max_results
    )
