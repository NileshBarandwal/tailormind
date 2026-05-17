import json
from datetime import datetime, timezone
from unittest.mock import MagicMock

import pytest

from backend.agents.cover_letter_generator import CoverLetterGenerator
from backend.models.schemas import (
    CompanyBrief,
    Education,
    Experience,
    MatchScore,
    ParsedJD,
    Project,
    ResearchReport,
    TailoredCoverLetter,
    UserProfile,
)


def _sample_profile() -> UserProfile:
    now = datetime.now(timezone.utc)
    return UserProfile(
        full_name="Test Candidate",
        email="test@example.com",
        summary="Test summary",
        skills=["Python", "TEE", "Solidity"],
        experiences=[
            Experience(
                company="Acme",
                role="Backend Engineer",
                duration="2022-2024",
                description=["Built APIs"],
                tech_used=["Python"],
            )
        ],
        projects=[
            Project(
                name="Secure AI Pipeline",
                description="TEE-based inference",
                tech_used=["Python", "TEE"],
                highlights=["Remote attestation"],
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
        role_title="AI Engineer",
        required_skills=["Python"],
        preferred_skills=[],
        experience_level="mid",
        responsibilities=["Build AI systems"],
        tech_stack=["Python"],
        culture_signals=["autonomy"],
        raw_text="AI Engineer role.",
        parsed_at=datetime.now(timezone.utc),
    )


def _sample_research() -> ResearchReport:
    brief = CompanyBrief(
        company_name="Acme",
        website="https://acme.example",
        mission="Build great AI",
        culture_signals=["autonomy"],
        recent_news=["Series B"],
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
        matched_skills=["Python"],
        missing_skills=[],
        recommendations=["a", "b", "c"],
    )


def _valid_response() -> dict:
    return {
        "profile_name": "Test Candidate",
        "target_role": "AI Engineer",
        "company_name": "Acme",
        "greeting": "Dear Acme team,",
        "paragraphs": [
            "I'm writing to apply for the AI Engineer role.",
            "At Acme I built APIs in Python with measurable impact.",
            "I look forward to discussing how I can contribute.",
        ],
        "closing": "Sincerely, Test Candidate",
    }


def _make_generator(response: dict) -> tuple[CoverLetterGenerator, MagicMock]:
    router = MagicMock()
    router.call.return_value = json.dumps(response)
    return CoverLetterGenerator(model_router=router), router


def test_generate_returns_valid_schema():
    gen, _ = _make_generator(_valid_response())
    result = gen.generate(
        _sample_profile(), _sample_jd(), _sample_research(), _sample_match()
    )
    assert isinstance(result, TailoredCoverLetter)
    assert result.target_role == "AI Engineer"
    assert result.generated_at is not None


def test_cover_letter_has_three_paragraphs():
    gen, _ = _make_generator(_valid_response())
    result = gen.generate(
        _sample_profile(), _sample_jd(), _sample_research(), _sample_match()
    )
    assert len(result.paragraphs) == 3


def test_instructions_included_in_prompt():
    gen, router = _make_generator(_valid_response())
    gen.generate(
        _sample_profile(),
        _sample_jd(),
        _sample_research(),
        _sample_match(),
        instructions="Mention my TEE research",
    )
    sent_messages = router.call.call_args.args[1]
    user_content = next(m["content"] for m in sent_messages if m["role"] == "user")
    assert "TEE" in user_content
