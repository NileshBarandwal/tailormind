from pathlib import Path

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from backend.agents.jd_parser import JDParser
from backend.agents.profile_matcher import ProfileMatcher
from backend.core.config import PROJECT_ROOT
from backend.models.schemas import MatchScore, UserProfile


router = APIRouter()


PROFILE_DIR = PROJECT_ROOT / "data" / "profiles"


_jd_parser = JDParser()
_profile_matcher = ProfileMatcher()


def _load_profile(profile_id: str) -> UserProfile:
    path = PROFILE_DIR / f"{profile_id}.json"
    if not path.exists():
        raise HTTPException(
            status_code=404, detail=f"Profile '{profile_id}' not found"
        )
    import json as _json

    data = _json.loads(path.read_text(encoding="utf-8"))
    from backend.api.routes.generate import _build_userprofile_from_pool

    try:
        return _build_userprofile_from_pool(data)
    except Exception as exc:
        raise HTTPException(
            status_code=500, detail=f"Profile format error: {exc}"
        )


class MatchRequest(BaseModel):
    profile_id: str
    jd_text: str


@router.post("/match", response_model=MatchScore)
def match(request: MatchRequest) -> MatchScore:
    try:
        profile = _load_profile(request.profile_id)
        try:
            parsed_jd = _jd_parser.parse(request.jd_text)
        except Exception as exc:
            raise HTTPException(
                status_code=400, detail=f"JD parsing failed: {exc}"
            )
        try:
            return _profile_matcher.match(profile, parsed_jd)
        except Exception as exc:
            raise HTTPException(
                status_code=500, detail=f"Profile matching failed: {exc}"
            )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=500, detail=f"Match endpoint error: {exc}"
        )


