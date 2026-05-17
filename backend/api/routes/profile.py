import json
import re
from pathlib import Path

from fastapi import APIRouter, HTTPException

from backend.core.config import PROJECT_ROOT
from backend.models.schemas import UserProfile


router = APIRouter()


PROFILE_DIR = PROJECT_ROOT / "data" / "profiles"


def _email_slug(email: str) -> str:
    slug = re.sub(r"[^a-zA-Z0-9]+", "_", email.lower())
    return slug.strip("_")


def _profile_path(profile_id: str) -> Path:
    return PROFILE_DIR / f"{profile_id}.json"


@router.post("/profile")
def save_profile(profile: UserProfile) -> dict[str, str]:
    PROFILE_DIR.mkdir(parents=True, exist_ok=True)
    profile_id = _email_slug(profile.email)
    path = _profile_path(profile_id)
    path.write_text(profile.model_dump_json(indent=2), encoding="utf-8")
    return {"status": "saved", "profile_id": profile_id}


@router.get("/profile/{profile_id}", response_model=UserProfile)
def get_profile(profile_id: str) -> UserProfile:
    path = _profile_path(profile_id)
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"Profile '{profile_id}' not found")
    data = json.loads(path.read_text(encoding="utf-8"))
    return UserProfile(**data)
