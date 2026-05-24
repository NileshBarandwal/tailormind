import json
import uuid
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, HTTPException

from backend.core.config import VERSIONS_DIR, VERSIONS_ARCHIVE_DIR
from backend.models.schemas import (
    ResumeVersionGeneration,
    ResumeVersionOutcome,
    VersionInsights,
    VersionListItem,
    VersionSummary,
)

router = APIRouter()
ACTIVE_VERSION_LIMIT = 50


def _version_dir(profile_id: str) -> Path:
    d = VERSIONS_DIR / profile_id
    d.mkdir(parents=True, exist_ok=True)
    return d


def _archive_dir(profile_id: str) -> Path:
    d = VERSIONS_ARCHIVE_DIR / profile_id
    d.mkdir(parents=True, exist_ok=True)
    return d


def _gen_path(profile_id: str, version_id: str) -> Path:
    return _version_dir(profile_id) / f"{version_id}_generation.json"


def _out_path(profile_id: str, version_id: str) -> Path:
    return _version_dir(profile_id) / f"{version_id}_outcome.json"


def make_version_id() -> str:
    date = datetime.now(timezone.utc).strftime("%Y%m%d")
    uid = uuid.uuid4().hex[:8]
    return f"v_{date}_{uid}"


def _archive_oldest(profile_id: str) -> None:
    d = _version_dir(profile_id)
    gen_files = sorted(d.glob("*_generation.json"))
    if len(gen_files) <= ACTIVE_VERSION_LIMIT:
        return
    arch = _archive_dir(profile_id)
    for gf in gen_files[: len(gen_files) - ACTIVE_VERSION_LIMIT]:
        vid = gf.name.replace("_generation.json", "")
        of = d / f"{vid}_outcome.json"
        gf.rename(arch / gf.name)
        if of.exists():
            of.rename(arch / of.name)


def save_version_record(generation: ResumeVersionGeneration) -> ResumeVersionOutcome:
    """
    Single source of truth for writing version files to disk.
    Called by the POST /api/versions endpoint AND directly
    from generate.py after successful SSE generation.
    """
    now = datetime.now(timezone.utc).isoformat()
    generation.created_at = generation.created_at or now

    gen_dict = generation.model_dump(mode="json")

    gen_path = _gen_path(generation.profile_id, generation.version_id)
    gen_path.write_text(
        json.dumps(gen_dict, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )

    outcome = ResumeVersionOutcome(
        version_id=generation.version_id,
        profile_id=generation.profile_id,
        status="generated",
        last_updated=now,
    )
    out_path = _out_path(generation.profile_id, generation.version_id)
    out_path.write_text(
        json.dumps(outcome.model_dump(mode="json"), indent=2, ensure_ascii=False),
        encoding="utf-8",
    )

    _archive_oldest(generation.profile_id)
    return outcome


@router.post("/versions", response_model=ResumeVersionOutcome)
def save_version(generation: ResumeVersionGeneration) -> ResumeVersionOutcome:
    return save_version_record(generation)


@router.get("/versions", response_model=list[VersionListItem])
def list_versions(profile_id: str, limit: int = 20) -> list[VersionListItem]:
    d = _version_dir(profile_id)
    gen_files = sorted(d.glob("*_generation.json"), reverse=True)[:limit]
    items: list[VersionListItem] = []
    for gf in gen_files:
        vid = gf.name.replace("_generation.json", "")
        try:
            g = json.loads(gf.read_text(encoding="utf-8"))
            out_file = _out_path(profile_id, vid)
            status = "generated"
            notes = ""
            if out_file.exists():
                o = json.loads(out_file.read_text(encoding="utf-8"))
                status = o.get("status", "generated")
                notes = o.get("notes", "")
            items.append(VersionListItem(
                version_id=vid,
                profile_id=profile_id,
                company_name=g.get("input", {}).get("company_name", ""),
                target_role=g.get("observability", {}).get("target_role", ""),
                created_at=g.get("created_at", ""),
                status=status,
                model_used=g.get("observability", {}).get("model_used", ""),
                generation_duration_ms=g.get("observability", {}).get(
                    "generation_duration_ms", 0
                ),
                notes=notes,
            ))
        except Exception:
            continue
    return items


@router.get("/versions/insights", response_model=VersionInsights)
def get_insights(profile_id: str) -> VersionInsights:
    d = _version_dir(profile_id)
    gen_files = list(d.glob("*_generation.json"))
    total = len(gen_files)
    applied = interview = offer = 0
    projects: dict[str, int] = {}
    roles: dict[str, int] = {}
    models: dict[str, int] = {}

    for gf in gen_files:
        vid = gf.name.replace("_generation.json", "")
        try:
            g = json.loads(gf.read_text(encoding="utf-8"))
        except Exception:
            continue

        out_file = _out_path(profile_id, vid)
        if out_file.exists():
            try:
                o = json.loads(out_file.read_text(encoding="utf-8"))
                s = o.get("status", "generated")
                if s in ("applied", "interview", "offer"):
                    applied += 1
                if s in ("interview", "offer"):
                    interview += 1
                if s == "offer":
                    offer += 1
            except Exception:
                pass

        for p in g.get("profile_snapshot", {}).get(
            "selected_source", {}
        ).get("projects", []):
            projects[p] = projects.get(p, 0) + 1
        role = g.get("observability", {}).get("target_role", "")
        if role:
            roles[role] = roles.get(role, 0) + 1
        model = g.get("observability", {}).get("model_used", "")
        if model:
            models[model] = models.get(model, 0) + 1

    def top(d: dict, n: int = 5) -> list[dict]:
        return [
            {"name": k, "count": v}
            for k, v in sorted(d.items(), key=lambda x: -x[1])[:n]
        ]

    return VersionInsights(
        total_generated=total,
        total_applied=applied,
        total_interview=interview,
        total_offer=offer,
        applied_rate=round(applied / total, 3) if total else 0.0,
        interview_rate=round(interview / total, 3) if total else 0.0,
        top_selected_projects=top(projects),
        role_distribution=[
            {"role": k, "count": v}
            for k, v in sorted(roles.items(), key=lambda x: -x[1])[:5]
        ],
        model_distribution=[
            {"model": k, "count": v}
            for k, v in sorted(models.items(), key=lambda x: -x[1])[:5]
        ],
    )


@router.get("/versions/{version_id}/summary", response_model=VersionSummary)
def get_version_summary(version_id: str, profile_id: str) -> VersionSummary:
    gf = _gen_path(profile_id, version_id)
    if not gf.exists():
        raise HTTPException(status_code=404, detail="Version not found")
    g = json.loads(gf.read_text(encoding="utf-8"))
    out_file = _out_path(profile_id, version_id)
    status = "generated"
    if out_file.exists():
        try:
            o = json.loads(out_file.read_text(encoding="utf-8"))
            status = o.get("status", "generated")
        except Exception:
            pass
    return VersionSummary(
        version_id=version_id,
        company_name=g.get("input", {}).get("company_name", ""),
        target_role=g.get("observability", {}).get("target_role", ""),
        created_at=g.get("created_at", ""),
        status=status,
        selected_projects=g.get("profile_snapshot", {}).get(
            "selected_source", {}
        ).get("projects", []),
    )


@router.get("/versions/{version_id}", response_model=ResumeVersionGeneration)
def get_version(version_id: str, profile_id: str) -> ResumeVersionGeneration:
    gf = _gen_path(profile_id, version_id)
    if not gf.exists():
        raise HTTPException(status_code=404, detail="Version not found")
    return ResumeVersionGeneration(**json.loads(gf.read_text(encoding="utf-8")))


@router.get("/versions/{version_id}/resume")
def get_version_resume(version_id: str, profile_id: str) -> dict:
    gf = _gen_path(profile_id, version_id)
    if not gf.exists():
        raise HTTPException(status_code=404, detail="Version not found")
    g = json.loads(gf.read_text(encoding="utf-8"))
    resume = g.get("output", {}).get("structured_resume")
    if not resume:
        raise HTTPException(status_code=404, detail="No resume in version")
    return resume


@router.patch("/versions/{version_id}/outcome",
              response_model=ResumeVersionOutcome)
def update_outcome(
    version_id: str, profile_id: str, payload: dict
) -> ResumeVersionOutcome:
    out_file = _out_path(profile_id, version_id)
    if not out_file.exists():
        raise HTTPException(status_code=404, detail="Outcome not found")
    o = json.loads(out_file.read_text(encoding="utf-8"))
    for k, v in payload.items():
        if k in {"status", "applied_at", "notes"}:
            o[k] = v
    o["last_updated"] = datetime.now(timezone.utc).isoformat()
    out_file.write_text(
        json.dumps(o, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    return ResumeVersionOutcome(**o)


@router.delete("/versions/{version_id}")
def delete_version(version_id: str, profile_id: str) -> dict:
    gf = _gen_path(profile_id, version_id)
    of = _out_path(profile_id, version_id)
    arch = _archive_dir(profile_id)
    moved = []
    for f in [gf, of]:
        if f.exists():
            f.rename(arch / f.name)
            moved.append(f.name)
    if not moved:
        raise HTTPException(status_code=404, detail="Version not found")
    return {"archived": moved}
