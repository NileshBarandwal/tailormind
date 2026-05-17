import json
from datetime import datetime, timezone
from unittest.mock import MagicMock

from backend.agents.application_card_generator import ApplicationCardGenerator
from backend.models.schemas import (
    ApplicationCard,
    CompanyBrief,
    Education,
    Experience,
    MatchScore,
    ParsedJD,
    Project,
    ResearchReport,
    UserProfile,
)


def _sample_profile() -> UserProfile:
    now = datetime.now(timezone.utc)
    return UserProfile(
        full_name="Test Candidate",
        email="test@example.com",
        phone="9999999999",
        summary="Summary",
        skills=["Python", "FastAPI"],
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
        culture_signals=[],
        raw_text="Backend Engineer role",
        parsed_at=datetime.now(timezone.utc),
    )


def _sample_research() -> ResearchReport:
    brief = CompanyBrief(
        company_name="Acme",
        website="https://acme.example",
        mission="Build great APIs",
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
        "one_liner_pitch": "Backend engineer focused on shipping APIs at Acme.",
        "why_this_company": "Acme builds great APIs and that aligns with my work.",
        "why_this_role": "Built Python and FastAPI services that map to the role.",
        "top_experiences": [
            "Shipped Python APIs at Acme",
            "Optimized FastAPI services",
            "Owned production reliability",
        ],
        "key_skills_to_mention": ["Python", "FastAPI"],
        "likely_questions": [
            {"question": "Tell me about yourself.", "answer": "Engineer."},
            {"question": "Why Acme?", "answer": "API focus matches mine."},
            {"question": "Hardest bug.", "answer": "Race in queue."},
            {"question": "Why Python?", "answer": "Range and ecosystem."},
            {"question": "Where in 5 years?", "answer": "Tech lead on AI APIs."},
        ],
        "application_checklist": [
            "Attach tailored resume",
            "Attach cover letter",
            "Add GitHub profile link",
            "Add LinkedIn",
            "Mention relevant project URLs",
        ],
    }


def _make_generator(response: dict) -> ApplicationCardGenerator:
    router = MagicMock()
    router.call.return_value = json.dumps(response)
    return ApplicationCardGenerator(model_router=router)


def test_generate_returns_valid_schema():
    gen = _make_generator(_valid_response())
    result = gen.generate(
        _sample_profile(),
        _sample_jd(),
        _sample_research(),
        _sample_match(),
        job_url="https://acme.example/jobs/123",
    )
    assert isinstance(result, ApplicationCard)
    assert result.profile_name == "Test Candidate"
    assert result.email == "test@example.com"
    assert result.target_role == "Backend Engineer"
    assert result.company_name == "Acme"
    assert result.job_url == "https://acme.example/jobs/123"


def test_likely_questions_count():
    gen = _make_generator(_valid_response())
    result = gen.generate(
        _sample_profile(),
        _sample_jd(),
        _sample_research(),
        _sample_match(),
    )
    assert len(result.likely_questions) == 5
