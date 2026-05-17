import json
from datetime import datetime, timezone
from unittest.mock import MagicMock

import pytest

from backend.agents.resume_generator import ResumeGenerator
from backend.models.schemas import (
    CompanyBrief,
    Education,
    Experience,
    MatchScore,
    ParsedJD,
    Project,
    ResearchReport,
    TailoredResume,
    UserProfile,
)


def _sample_profile() -> UserProfile:
    now = datetime.now(timezone.utc)
    return UserProfile(
        full_name="Test Candidate",
        email="test@example.com",
        summary="Test summary",
        skills=["Python", "FastAPI", "Solidity"],
        experiences=[
            Experience(
                company="Acme",
                role="Backend Engineer",
                duration="2022-2024",
                description=["Built APIs"],
                tech_used=["Python", "FastAPI"],
            )
        ],
        projects=[
            Project(
                name="AMM-DEX",
                description="On-chain AMM",
                tech_used=["Solidity"],
                highlights=["x*y=k"],
            )
        ],
        education=[
            Education(
                institution="IIT",
                degree="M.Tech",
                field="CSE",
                year=2024,
                cgpa=8.0,
            )
        ],
        achievements=["Top 25 e-YRC"],
        created_at=now,
        updated_at=now,
    )


def _sample_jd() -> ParsedJD:
    return ParsedJD(
        role_title="Backend Engineer",
        required_skills=["Python", "FastAPI"],
        preferred_skills=[],
        experience_level="mid",
        responsibilities=["Build APIs"],
        tech_stack=["Python"],
        culture_signals=["autonomy"],
        raw_text="Backend Engineer role at Acme.",
        parsed_at=datetime.now(timezone.utc),
    )


def _sample_research() -> ResearchReport:
    brief = CompanyBrief(
        company_name="Acme",
        website="https://acme.example",
        mission="Build great APIs",
        culture_signals=["autonomy"],
        researched_at=datetime.now(timezone.utc),
    )
    return ResearchReport(
        company_brief=brief,
        raw_chunks=["chunk"],
        chunk_ids=["acme_chunk_0"],
        collection_name="company_acme",
    )


def _sample_match() -> MatchScore:
    return MatchScore(
        overall_score=0.8,
        skill_score=0.8,
        experience_score=0.8,
        education_score=0.8,
        rationale="strong fit",
        matched_skills=["Python", "FastAPI"],
        missing_skills=[],
        recommendations=["a", "b", "c"],
    )


def _valid_response() -> dict:
    return {
        "profile_name": "Test Candidate",
        "target_role": "Backend Engineer",
        "summary": "Backend engineer with Python depth.",
        "sections": [
            {"title": "Summary", "bullets": ["Senior Python engineer"], "order": 0},
            {"title": "Experience", "bullets": ["Built APIs at Acme"], "order": 1},
            {"title": "Projects", "bullets": ["AMM-DEX: x*y=k"], "order": 2},
            {"title": "Skills", "bullets": ["Python, FastAPI"], "order": 3},
            {"title": "Education", "bullets": ["M.Tech CSE, IIT"], "order": 4},
        ],
        "skills_highlighted": ["Python", "FastAPI"],
        "jd_keywords_used": ["Python", "FastAPI"],
    }


def _make_generator(response: dict) -> tuple[ResumeGenerator, MagicMock]:
    router = MagicMock()
    router.call.return_value = json.dumps(response)
    return ResumeGenerator(model_router=router), router


def test_generate_returns_valid_schema():
    gen, _ = _make_generator(_valid_response())
    result = gen.generate(
        _sample_profile(), _sample_jd(), _sample_research(), _sample_match()
    )
    assert isinstance(result, TailoredResume)
    assert result.target_role == "Backend Engineer"
    assert result.generated_at is not None


def test_resume_has_required_sections():
    gen, _ = _make_generator(_valid_response())
    result = gen.generate(
        _sample_profile(), _sample_jd(), _sample_research(), _sample_match()
    )
    titles = {s.title.lower() for s in result.sections}
    for required in ("summary", "experience", "projects", "skills", "education"):
        assert required in titles


def test_instructions_included_in_prompt():
    gen, router = _make_generator(_valid_response())
    gen.generate(
        _sample_profile(),
        _sample_jd(),
        _sample_research(),
        _sample_match(),
        instructions="Focus on blockchain experience",
    )
    sent_messages = router.call.call_args.args[1]
    user_content = next(m["content"] for m in sent_messages if m["role"] == "user")
    assert "blockchain" in user_content
