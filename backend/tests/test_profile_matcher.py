import json
from datetime import datetime, timezone
from unittest.mock import MagicMock

import pytest

from backend.agents.profile_matcher import ProfileMatcher
from backend.models.schemas import (
    Education,
    Experience,
    MatchScore,
    ParsedJD,
    UserProfile,
)


def _sample_profile(skills: list[str] | None = None) -> UserProfile:
    now = datetime.now(timezone.utc)
    return UserProfile(
        full_name="Test Candidate",
        email="test@example.com",
        skills=skills if skills is not None else ["Python", "FastAPI"],
        experiences=[
            Experience(
                company="Acme",
                role="Backend Engineer",
                duration="2022-2024",
                description=["Built APIs"],
                tech_used=["Python", "FastAPI"],
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


def _sample_jd(required: list[str] | None = None) -> ParsedJD:
    return ParsedJD(
        role_title="Backend Engineer",
        required_skills=required if required is not None else ["Python", "FastAPI"],
        preferred_skills=[],
        experience_level="mid",
        responsibilities=["Build services"],
        tech_stack=["Python"],
        culture_signals=[],
        raw_text="Backend Engineer at Acme. Required: Python, FastAPI.",
        parsed_at=datetime.now(timezone.utc),
    )


def _make_matcher(response: dict) -> ProfileMatcher:
    router = MagicMock()
    router.call.return_value = json.dumps(response)
    return ProfileMatcher(model_router=router)


def test_match_returns_valid_schema():
    response = {
        "overall_score": 0.82,
        "skill_score": 0.9,
        "experience_score": 0.75,
        "education_score": 0.8,
        "matched_skills": ["Python", "FastAPI"],
        "missing_skills": [],
        "rationale": "Strong Python and FastAPI background. Mid-level experience aligns.",
        "recommendations": [
            "Highlight production API scale",
            "Add observability examples",
            "Quantify impact",
        ],
    }
    matcher = _make_matcher(response)
    result = matcher.match(_sample_profile(), _sample_jd())

    assert isinstance(result, MatchScore)
    assert result.rationale
    assert result.matched_skills == ["Python", "FastAPI"]
    assert len(result.recommendations) == 3


def test_match_scores_in_range():
    response = {
        "overall_score": 0.6,
        "skill_score": 0.5,
        "experience_score": 0.65,
        "education_score": 0.7,
        "matched_skills": ["Python"],
        "missing_skills": ["Docker"],
        "rationale": "Some overlap, gaps in containers.",
        "recommendations": ["Learn Docker", "Ship a containerized side project", "Get a cert"],
    }
    matcher = _make_matcher(response)
    result = matcher.match(_sample_profile(), _sample_jd())

    for score in (
        result.overall_score,
        result.skill_score,
        result.experience_score,
        result.education_score,
    ):
        assert 0.0 <= score <= 1.0


def test_match_missing_skills_identified():
    response = {
        "overall_score": 0.55,
        "skill_score": 0.5,
        "experience_score": 0.6,
        "education_score": 0.6,
        "matched_skills": ["Python"],
        "missing_skills": ["Docker"],
        "rationale": "Python is solid. Docker is missing.",
        "recommendations": ["Learn Docker basics", "Containerize a project", "Add to resume"],
    }
    matcher = _make_matcher(response)
    profile = _sample_profile(skills=["Python"])
    jd = _sample_jd(required=["Python", "Docker"])

    result = matcher.match(profile, jd)
    assert "Docker" in result.missing_skills
