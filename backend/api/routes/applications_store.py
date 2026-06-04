import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from backend.core.config import PROJECT_ROOT
from backend.models.schemas import (
    ApplicationCard,
    JobListing,
    SavedApplication,
    TailoredCoverLetter,
)


router = APIRouter()


APPLICATIONS_DIR = PROJECT_ROOT / "data" / "applications"


def _apps_dir(profile_id: str) -> Path:
    return APPLICATIONS_DIR / profile_id


def _app_path(profile_id: str, app_id: str) -> Path:
    return _apps_dir(profile_id) / f"{app_id}.json"


def _load_app(profile_id: str, app_id: str) -> SavedApplication | None:
    path = _app_path(profile_id, app_id)
    if not path.exists():
        return None
    return SavedApplication(**json.loads(path.read_text(encoding="utf-8")))


def _save_app(app: SavedApplication) -> None:
    directory = _apps_dir(app.profile_id)
    directory.mkdir(parents=True, exist_ok=True)
    _app_path(app.profile_id, app.id).write_text(
        app.model_dump_json(indent=2), encoding="utf-8"
    )


def _list_apps(profile_id: str) -> list[SavedApplication]:
    directory = _apps_dir(profile_id)
    if not directory.exists():
        return []
    apps: list[SavedApplication] = []
    for path in directory.glob("*.json"):
        try:
            apps.append(SavedApplication(**json.loads(path.read_text(encoding="utf-8"))))
        except Exception as exc:
            print(f"[applications_store] failed to load {path.name}: {exc}")
    apps.sort(key=lambda a: a.saved_at, reverse=True)
    return apps


class CreateApplicationRequest(BaseModel):
    profile_id: str
    job: JobListing
    notes: str = ""


class UpdateApplicationRequest(BaseModel):
    notes: Optional[str] = None
    status: Optional[str] = None
    cover_letter: Optional[TailoredCoverLetter] = None
    card: Optional[ApplicationCard] = None


@router.post("/applications", response_model=SavedApplication)
def create_application(request: CreateApplicationRequest) -> SavedApplication:
    now = datetime.now(timezone.utc)
    app = SavedApplication(
        id=uuid.uuid4().hex[:8],
        profile_id=request.profile_id,
        job=request.job,
        notes=request.notes,
        status="draft",
        saved_at=now,
        updated_at=now,
    )
    _save_app(app)
    return app


@router.get("/applications/{profile_id}", response_model=list[SavedApplication])
def list_applications(profile_id: str) -> list[SavedApplication]:
    return _list_apps(profile_id)


@router.get("/applications/{profile_id}/{app_id}", response_model=SavedApplication)
def get_application(profile_id: str, app_id: str) -> SavedApplication:
    app = _load_app(profile_id, app_id)
    if app is None:
        raise HTTPException(status_code=404, detail=f"Application '{app_id}' not found")
    return app


@router.patch("/applications/{profile_id}/{app_id}", response_model=SavedApplication)
def update_application(
    profile_id: str, app_id: str, request: UpdateApplicationRequest
) -> SavedApplication:
    app = _load_app(profile_id, app_id)
    if app is None:
        raise HTTPException(status_code=404, detail=f"Application '{app_id}' not found")

    updates = request.model_dump(exclude_unset=True)
    for key, value in updates.items():
        setattr(app, key, value)
    app.updated_at = datetime.now(timezone.utc)
    _save_app(app)
    return app


@router.delete("/applications/{profile_id}/{app_id}")
def delete_application(profile_id: str, app_id: str) -> dict[str, str]:
    path = _app_path(profile_id, app_id)
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"Application '{app_id}' not found")
    path.unlink()
    return {"deleted": app_id}
