import json
from pathlib import Path

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from backend.agents.application_card_generator import ApplicationCardGenerator
from backend.agents.company_researcher import CompanyResearcher
from backend.agents.cover_letter_generator import CoverLetterGenerator
from backend.agents.jd_parser import JDParser
from backend.agents.profile_matcher import ProfileMatcher
from backend.agents.resume_generator import ResumeGenerator
from backend.agents.structured_resume_generator import StructuredResumeGenerator
from backend.core.config import PROJECT_ROOT
from backend.models.schemas import (
    ApplicationCard,
    StructuredResume,
    TailoredCoverLetter,
    TailoredResume,
    UserProfile,
)
from backend.services.pdf_generator import (
    export_cover_letter_pdf,
    export_resume_pdf,
)


EXPORT_DIR = PROJECT_ROOT / "data" / "exports"


router = APIRouter()


PROFILE_DIR = PROJECT_ROOT / "data" / "profiles"


_jd_parser = JDParser()
_company_researcher = CompanyResearcher()
_profile_matcher = ProfileMatcher()
_resume_generator = ResumeGenerator()
_cover_letter_generator = CoverLetterGenerator()
_application_card_generator = ApplicationCardGenerator()
_structured_resume_gen = StructuredResumeGenerator()


def _build_userprofile_from_pool(data: dict) -> UserProfile:
    """
    Convert the new knowledge pool profile format into a
    UserProfile Pydantic object for use with legacy agents
    (matcher, card generator, etc).
    Handles both old format (institution/degree/field) and
    new format (institute/examination/cgpa as string).
    """
    from datetime import datetime, timezone as _tz

    from backend.models.schemas import Education, Experience, Project

    exps = [
        Experience(
            company=e["company"],
            role=e["role"],
            duration=e["duration"],
            description=e.get("bullets", []),
            tech_used=[],
        )
        for e in data.get("work_experience", data.get("experiences", []))
    ]

    all_projects = (
        data.get("projects", []) + data.get("academic_projects", [])
    )
    projs = [
        Project(
            name=p["name"],
            description=(
                p.get("bullets", [""])[0]
                if p.get("bullets")
                else p.get("description", "")
            ),
            tech_used=[
                t.strip()
                for t in p.get(
                    "tech_stack",
                    ",".join(p.get("tech_used", [])),
                ).split(",")
                if t.strip()
            ],
            highlights=p.get("bullets", [])[1:],
            url=p.get("live_url", p.get("url", "")),
        )
        for p in all_projects
    ]

    edu_raw = data.get("education", [])
    edus = []
    for e in edu_raw:
        if "examination" in e:
            cgpa_str = e.get("cgpa", "0")
            try:
                cgpa_val = float(cgpa_str.replace("%", "").strip())
            except (ValueError, AttributeError):
                cgpa_val = 0.0
            edus.append(
                Education(
                    institution=e.get("institute", ""),
                    degree=e.get("examination", ""),
                    field=e.get("field", "Computer Science"),
                    year=e.get("year", 2026),
                    cgpa=cgpa_val,
                )
            )
        else:
            edus.append(
                Education(
                    institution=e.get("institution", ""),
                    degree=e.get("degree", ""),
                    field=e.get("field", ""),
                    year=e.get("year", 2026),
                    cgpa=float(e.get("cgpa", 0) or 0),
                )
            )

    return UserProfile(
        full_name=data.get("full_name", ""),
        email=data.get("email", ""),
        phone=data.get("phone", ""),
        summary=data.get("summary", ""),
        skills=data.get("skills", []),
        experiences=exps,
        projects=projs,
        education=edus,
        certifications=data.get("certifications", []),
        achievements=data.get("achievements", []),
        preferences=data.get("preferences", {}),
        created_at=datetime.fromisoformat(
            data.get("created_at", "2026-01-01T00:00:00Z").replace(
                "Z", "+00:00"
            )
        ),
        updated_at=datetime.fromisoformat(
            data.get("updated_at", "2026-01-01T00:00:00Z").replace(
                "Z", "+00:00"
            )
        ),
    )


def _load_profile(profile_id: str) -> UserProfile:
    path = PROFILE_DIR / f"{profile_id}.json"
    if not path.exists():
        raise HTTPException(
            status_code=404, detail=f"Profile '{profile_id}' not found"
        )
    import json as _json

    data = _json.loads(path.read_text(encoding="utf-8"))
    try:
        return _build_userprofile_from_pool(data)
    except Exception as exc:
        raise HTTPException(
            status_code=500, detail=f"Profile format error: {exc}"
        )


def _load_profile_dict(profile_id: str) -> dict:
    import json as _json
    path = PROFILE_DIR / f"{profile_id}.json"
    if not path.exists():
        raise HTTPException(
            status_code=404, detail=f"Profile '{profile_id}' not found"
        )
    return _json.loads(path.read_text(encoding="utf-8"))


class GenerateResumeRequest(BaseModel):
    profile_id: str
    jd_text: str
    company_name: str
    website: str
    instructions: str = ""


class GenerateCoverLetterRequest(BaseModel):
    profile_id: str
    jd_text: str
    company_name: str
    website: str
    instructions: str = ""


class GenerateCardRequest(BaseModel):
    profile_id: str
    jd_text: str
    company_name: str
    website: str
    job_url: str = ""
    instructions: str = ""


def _prepare_context(req) -> tuple:
    profile = _load_profile(req.profile_id)
    try:
        parsed_jd = _jd_parser.parse(req.jd_text)
    except Exception as exc:
        raise HTTPException(
            status_code=400, detail=f"JD parsing failed: {exc}"
        )

    research = None
    if req.website and req.website.strip():
        try:
            research = _company_researcher.research(
                req.company_name, req.website
            )
        except Exception as exc:
            print(
                f"[generate] company research failed, "
                f"continuing without it: {exc}"
            )
            research = None

    if research is None:
        from datetime import datetime, timezone

        from backend.models.schemas import CompanyBrief, ResearchReport

        brief = CompanyBrief(
            company_name=req.company_name,
            website=req.website or "",
            mission="",
            tech_stack=[],
            culture_signals=[],
            recent_news=[],
            funding_stage="unknown",
            employee_count="unknown",
            scraped_urls=[],
            researched_at=datetime.now(timezone.utc),
        )
        research = ResearchReport(
            company_brief=brief,
            raw_chunks=[],
            chunk_ids=[],
            collection_name="",
        )

    try:
        match = _profile_matcher.match(profile, parsed_jd)
    except Exception as exc:
        raise HTTPException(
            status_code=500, detail=f"Profile matching failed: {exc}"
        )
    return profile, parsed_jd, research, match


@router.post("/generate/resume", response_model=TailoredResume)
def generate_resume(request: GenerateResumeRequest) -> TailoredResume:
    profile, parsed_jd, research, match = _prepare_context(request)
    return _resume_generator.generate(
        profile, parsed_jd, research, match, request.instructions
    )


@router.post("/generate/cover-letter", response_model=TailoredCoverLetter)
def generate_cover_letter(request: GenerateCoverLetterRequest) -> TailoredCoverLetter:
    profile, parsed_jd, research, match = _prepare_context(request)
    return _cover_letter_generator.generate(
        profile, parsed_jd, research, match, request.instructions
    )


@router.post("/export/resume")
def export_resume(request: GenerateResumeRequest) -> dict[str, str]:
    profile, parsed_jd, research, match = _prepare_context(request)
    resume = _resume_generator.generate(
        profile, parsed_jd, research, match, request.instructions
    )
    output_dir = EXPORT_DIR / request.profile_id
    pdf_path = export_resume_pdf(resume, output_dir)
    return {"pdf_path": str(pdf_path), "filename": pdf_path.name}


@router.post("/export/cover-letter")
def export_cover_letter(request: GenerateCoverLetterRequest) -> dict[str, str]:
    profile, parsed_jd, research, match = _prepare_context(request)
    letter = _cover_letter_generator.generate(
        profile, parsed_jd, research, match, request.instructions
    )
    output_dir = EXPORT_DIR / request.profile_id
    pdf_path = export_cover_letter_pdf(letter, output_dir)
    return {"pdf_path": str(pdf_path), "filename": pdf_path.name}


@router.post("/generate/application-card", response_model=ApplicationCard)
def generate_application_card(request: GenerateCardRequest) -> ApplicationCard:
    profile, parsed_jd, research, match = _prepare_context(request)
    return _application_card_generator.generate(
        profile, parsed_jd, research, match, request.job_url
    )


@router.post("/generate/structured-resume", response_model=StructuredResume)
def generate_structured_resume_route(
    request: GenerateResumeRequest,
) -> StructuredResume:
    profile_dict = _load_profile_dict(request.profile_id)
    profile = _build_userprofile_from_pool(profile_dict)

    try:
        parsed_jd = _jd_parser.parse(request.jd_text)
    except Exception as exc:
        raise HTTPException(
            status_code=400, detail=f"JD parsing failed: {exc}"
        )
    research = None
    if request.website and request.website.strip():
        try:
            research = _company_researcher.research(
                request.company_name, request.website
            )
        except Exception as exc:
            print(f"[structured_resume] research skipped: {exc}")
    if research is None:
        from datetime import datetime, timezone

        from backend.models.schemas import CompanyBrief, ResearchReport

        brief = CompanyBrief(
            company_name=request.company_name,
            website=request.website or "",
            mission="",
            tech_stack=[],
            culture_signals=[],
            recent_news=[],
            funding_stage="unknown",
            employee_count="unknown",
            scraped_urls=[],
            researched_at=datetime.now(timezone.utc),
        )
        research = ResearchReport(
            company_brief=brief,
            raw_chunks=[],
            chunk_ids=[],
            collection_name="",
        )
    try:
        match = _profile_matcher.match(profile, parsed_jd)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Matching failed: {exc}")
    return _structured_resume_gen.generate(
        profile_dict,
        parsed_jd,
        research,
        match,
        request.instructions or "",
    )
