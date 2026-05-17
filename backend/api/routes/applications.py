import json
from pathlib import Path

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from backend.agents.jd_parser import JDParser
from backend.agents.profile_matcher import ProfileMatcher
from backend.core.config import PROJECT_ROOT
from backend.core.orchestrator import run_pipeline
from backend.models.schemas import MatchScore, UserProfile


router = APIRouter()


PROFILE_DIR = PROJECT_ROOT / "data" / "profiles"


_jd_parser = JDParser()
_profile_matcher = ProfileMatcher()


def _load_profile(profile_id: str) -> UserProfile:
    path = PROFILE_DIR / f"{profile_id}.json"
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"Profile '{profile_id}' not found")
    data = json.loads(path.read_text(encoding="utf-8"))
    return UserProfile(**data)


class MatchRequest(BaseModel):
    profile_id: str
    jd_text: str


@router.post("/match", response_model=MatchScore)
def match(request: MatchRequest) -> MatchScore:
    profile = _load_profile(request.profile_id)
    try:
        parsed_jd = _jd_parser.parse(request.jd_text)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return _profile_matcher.match(profile, parsed_jd)


class PipelineRequest(BaseModel):
    jd_text: str
    company_name: str
    website: str
    profile_id: str


@router.post("/pipeline")
def pipeline(request: PipelineRequest) -> dict:
    state = run_pipeline(
        jd_text=request.jd_text,
        company_name=request.company_name,
        website=request.website,
        profile_id=request.profile_id,
    )
    return _serialize_state(state)


def _serialize_state(state: dict) -> dict:
    out: dict = {}
    for key, value in state.items():
        if value is None:
            out[key] = None
        elif isinstance(value, BaseModel):
            out[key] = json.loads(value.model_dump_json())
        else:
            out[key] = value
    return out
