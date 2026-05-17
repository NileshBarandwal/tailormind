import json
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from backend.core.config import PROJECT_ROOT
from backend.models.schemas import InstructionSet


router = APIRouter()


PROFILE_DIR = PROJECT_ROOT / "data" / "profiles"
INSTRUCTIONS_DIR = PROJECT_ROOT / "data" / "instructions"


def _profile_exists(profile_id: str) -> bool:
    return (PROFILE_DIR / f"{profile_id}.json").exists()


def _instructions_path(profile_id: str) -> Path:
    return INSTRUCTIONS_DIR / f"{profile_id}.json"


def _load_instructions(profile_id: str) -> InstructionSet:
    path = _instructions_path(profile_id)
    if not path.exists():
        return InstructionSet(
            profile_id=profile_id,
            persistent=[],
            per_job={},
            updated_at=datetime.now(timezone.utc),
        )
    data = json.loads(path.read_text(encoding="utf-8"))
    return InstructionSet(**data)


def _save_instructions(instructions: InstructionSet) -> None:
    INSTRUCTIONS_DIR.mkdir(parents=True, exist_ok=True)
    instructions.updated_at = datetime.now(timezone.utc)
    path = _instructions_path(instructions.profile_id)
    path.write_text(instructions.model_dump_json(indent=2), encoding="utf-8")


class AddPersistentRequest(BaseModel):
    profile_id: str
    instruction: str


class AddPerJobRequest(BaseModel):
    profile_id: str
    job_key: str
    instruction: str


class RemoveInstructionRequest(BaseModel):
    profile_id: str
    instruction: str
    job_key: str = ""


@router.get("/instructions/{profile_id}", response_model=InstructionSet)
def get_instructions(profile_id: str) -> InstructionSet:
    if not _profile_exists(profile_id):
        raise HTTPException(status_code=404, detail=f"Profile '{profile_id}' not found")
    return _load_instructions(profile_id)


@router.post("/instructions/persistent", response_model=InstructionSet)
def add_persistent(request: AddPersistentRequest) -> InstructionSet:
    if not _profile_exists(request.profile_id):
        raise HTTPException(status_code=404, detail=f"Profile '{request.profile_id}' not found")
    instructions = _load_instructions(request.profile_id)
    if request.instruction not in instructions.persistent:
        instructions.persistent.append(request.instruction)
    _save_instructions(instructions)
    return instructions


@router.post("/instructions/per-job", response_model=InstructionSet)
def add_per_job(request: AddPerJobRequest) -> InstructionSet:
    if not _profile_exists(request.profile_id):
        raise HTTPException(status_code=404, detail=f"Profile '{request.profile_id}' not found")
    instructions = _load_instructions(request.profile_id)
    bucket = instructions.per_job.setdefault(request.job_key, [])
    if request.instruction not in bucket:
        bucket.append(request.instruction)
    _save_instructions(instructions)
    return instructions


@router.delete("/instructions/persistent", response_model=InstructionSet)
def remove_persistent(request: RemoveInstructionRequest) -> InstructionSet:
    if not _profile_exists(request.profile_id):
        raise HTTPException(status_code=404, detail=f"Profile '{request.profile_id}' not found")
    instructions = _load_instructions(request.profile_id)
    instructions.persistent = [
        i for i in instructions.persistent if i != request.instruction
    ]
    _save_instructions(instructions)
    return instructions


@router.delete("/instructions/per-job", response_model=InstructionSet)
def remove_per_job(request: RemoveInstructionRequest) -> InstructionSet:
    if not _profile_exists(request.profile_id):
        raise HTTPException(status_code=404, detail=f"Profile '{request.profile_id}' not found")
    instructions = _load_instructions(request.profile_id)
    bucket = instructions.per_job.get(request.job_key)
    if bucket is not None:
        instructions.per_job[request.job_key] = [
            i for i in bucket if i != request.instruction
        ]
    _save_instructions(instructions)
    return instructions
