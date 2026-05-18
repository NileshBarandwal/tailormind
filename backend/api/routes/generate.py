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


def _load_profile(profile_id: str) -> UserProfile:
    path = PROFILE_DIR / f"{profile_id}.json"
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"Profile '{profile_id}' not found")
    data = json.loads(path.read_text(encoding="utf-8"))
    return UserProfile(**data)


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

    from datetime import datetime, timezone as _tz

    from backend.models.schemas import (
        Education,
        Experience,
        Project,
        UserProfile as _UP,
    )

    _exps = [
        Experience(
            company=e["company"],
            role=e["role"],
            duration=e["duration"],
            description=e.get("bullets", []),
            tech_used=[],
        )
        for e in profile_dict.get("work_experience", [])
    ]
    _projs = [
        Project(
            name=p["name"],
            description=p.get("bullets", [""])[0] if p.get("bullets") else "",
            tech_used=[t.strip() for t in p.get("tech_stack", "").split(",")],
            highlights=p.get("bullets", [])[1:],
            url=p.get("live_url", ""),
        )
        for p in (
            profile_dict.get("projects", [])
            + profile_dict.get("academic_projects", [])
        )
    ]
    _edus = [
        Education(
            institution=e["institute"],
            degree=e["examination"],
            field=e.get("field", "Computer Science"),
            year=e["year"],
            cgpa=(
                float(e["cgpa"].replace("%", ""))
                if "%" not in e["cgpa"]
                else 0.0
            ),
        )
        for e in profile_dict.get("education", [])
    ]
    profile = _UP(
        full_name=profile_dict["full_name"],
        email=profile_dict["email"],
        phone=profile_dict.get("phone", ""),
        skills=profile_dict.get("skills", []),
        experiences=_exps,
        projects=_projs,
        education=_edus,
        created_at=datetime.now(_tz.utc),
        updated_at=datetime.now(_tz.utc),
    )

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
