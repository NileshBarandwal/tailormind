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
from backend.core.config import PROJECT_ROOT
from backend.models.schemas import (
    ApplicationCard,
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


def _load_profile(profile_id: str) -> UserProfile:
    path = PROFILE_DIR / f"{profile_id}.json"
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"Profile '{profile_id}' not found")
    data = json.loads(path.read_text(encoding="utf-8"))
    return UserProfile(**data)


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
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    research = _company_researcher.research(req.company_name, req.website)
    match = _profile_matcher.match(profile, parsed_jd)
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
