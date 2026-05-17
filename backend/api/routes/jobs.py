import json
import re
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from backend.agents.company_researcher import CompanyResearcher
from backend.agents.jd_parser import JDParser
from backend.agents.job_discovery import JobDiscovery
from backend.core.config import PROJECT_ROOT
from backend.core.model_router import ModelRouter
from backend.core.vector_store import VectorStore
from backend.models.schemas import (
    CompanyRoles,
    DiscoveredJobs,
    ExtractedRole,
    ParsedJD,
    UserProfile,
)


router = APIRouter()

_parser = JDParser()
_discovery = JobDiscovery()
_researcher = CompanyResearcher()
_model_router = ModelRouter()
_vector_store = VectorStore()


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


class CompanyTargetRequest(BaseModel):
    profile_id: str
    company_name: str
    website: str


_DISCOVER_COMPANY_SYSTEM_PROMPT = (
    "Extract open job roles from the company content below. "
    "Return strict JSON only: "
    '{"roles": [{"title": str, "description": str, "url": str, '
    '"requirements": [str]}]}. '
    'If no roles found, return {"roles": []}. '
    "Use only information present in the content. "
    "No preamble, no markdown."
)


@router.post("/discover/company", response_model=CompanyRoles)
def discover_company_roles(request: CompanyTargetRequest) -> CompanyRoles:
    try:
        report = _researcher.research(request.company_name, request.website)
    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Could not scrape {request.website}: {exc}",
        )
    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Company scrape error: {exc}",
        )

    try:
        job_chunks = _vector_store.query(
            report.collection_name,
            "open positions jobs hiring roles engineer developer",
            n_results=15,
        )
        context = "\n\n".join(c["text"] for c in job_chunks)
    except Exception as exc:
        print(f"[discover_company] chunk query failed: {exc}")
        context = ""

    user_prompt = (
        f"Company: {request.company_name}\n"
        f"Website: {request.website}\n\n"
        f"Content:\n{context}"
    )

    roles: list[ExtractedRole] = []
    try:
        raw = _model_router.call(
            "filter_jobs",
            [
                {"role": "system", "content": _DISCOVER_COMPANY_SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            response_format={"type": "json_object"},
        )
        text = raw.strip()
        fence = re.search(r"```(?:json)?\s*(\{.*\})\s*```", text, re.DOTALL)
        payload = fence.group(1) if fence else text
        first = payload.find("{")
        last = payload.rfind("}")
        if first != -1 and last != -1:
            payload = payload[first : last + 1]
        data = json.loads(payload)
        for entry in data.get("roles", []):
            if isinstance(entry, dict):
                roles.append(ExtractedRole(**entry))
    except Exception as exc:
        print(f"[discover_company] role extraction failed: {exc}")

    return CompanyRoles(
        company_name=request.company_name,
        website=request.website,
        roles=roles,
        scraped_at=datetime.now(timezone.utc),
    )
