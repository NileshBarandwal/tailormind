import json
import re
from pathlib import Path

from fastapi import APIRouter, HTTPException

from backend.core.config import PROJECT_ROOT
from backend.models.schemas import OnboardingRequest, UserProfile


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


@router.get("/profile-exists")
def profile_exists() -> dict:
    if not PROFILE_DIR.exists():
        return {"exists": False, "profile_id": None}
    profiles = list(PROFILE_DIR.glob("*.json"))
    if not profiles:
        return {"exists": False, "profile_id": None}
    profile_id = profiles[0].stem
    return {"exists": True, "profile_id": profile_id}


@router.post("/onboarding")
def save_onboarding(request: OnboardingRequest) -> dict[str, str]:
    from datetime import datetime, timezone
    PROFILE_DIR.mkdir(parents=True, exist_ok=True)
    profile_id = _email_slug(request.email)
    path = _profile_path(profile_id)

    # Build a flat skills list from skill_categories values
    skills_flat: list[str] = []
    for v in request.skill_categories.values():
        skills_flat.extend(
            [s.strip() for s in v.split(",") if s.strip()]
        )

    now = datetime.now(timezone.utc).isoformat()
    pool = {
        "full_name": request.full_name,
        "email": request.email,
        "phone": request.phone,
        "github_url": request.github_url,
        "linkedin_url": request.linkedin_url,
        "iit_email": request.iit_email,
        "summary": request.summary,
        "education": [e.model_dump() for e in request.education],
        "skill_categories": request.skill_categories,
        "projects": [p.model_dump() for p in request.projects
                     if p.category == "personal"],
        "academic_projects": [p.model_dump() for p in request.projects
                              if p.category == "academic"],
        "work_experience": [e.model_dump() for e in request.work_experience],
        "publications": [],
        "positions": [],
        "achievements": [],
        "skills": skills_flat,
        "preferences": {},
        "created_at": now,
        "updated_at": now,
    }
    import json as _json
    path.write_text(_json.dumps(pool, indent=2, ensure_ascii=False),
                    encoding="utf-8")
    return {"status": "created", "profile_id": profile_id}


@router.get("/profile/{profile_id}", response_model=UserProfile)
def get_profile(profile_id: str) -> UserProfile:
    path = _profile_path(profile_id)
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
