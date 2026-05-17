import json
from datetime import datetime, timezone
from unittest.mock import MagicMock, patch

import pytest

from backend.models.schemas import (
    CompanyBrief,
    Education,
    MatchScore,
    ParsedJD,
    ResearchReport,
    UserProfile,
)


def _fake_parsed_jd() -> ParsedJD:
    return ParsedJD(
        role_title="Backend Engineer",
        required_skills=["Python"],
        preferred_skills=[],
        experience_level="mid",
        responsibilities=[],
        tech_stack=["Python"],
        culture_signals=[],
        raw_text="sample",
        parsed_at=datetime.now(timezone.utc),
    )


def _fake_report() -> ResearchReport:
    brief = CompanyBrief(
        company_name="Acme",
        website="https://acme.example",
        researched_at=datetime.now(timezone.utc),
    )
    return ResearchReport(
        company_brief=brief,
        raw_chunks=["chunk"],
        chunk_ids=["acme_chunk_0"],
        collection_name="company_acme",
    )


def _fake_match() -> MatchScore:
    return MatchScore(
        overall_score=0.7,
        skill_score=0.7,
        experience_score=0.7,
        education_score=0.7,
        rationale="ok",
        matched_skills=["Python"],
        missing_skills=[],
        recommendations=["a", "b", "c"],
    )


def test_pipeline_state_structure(tmp_path):
    profile_dir = tmp_path / "data" / "profiles"
    profile_dir.mkdir(parents=True)
    now = datetime.now(timezone.utc)
    profile = UserProfile(
        full_name="Test",
        email="test@example.com",
        skills=["Python"],
        education=[Education(institution="x", degree="y", field="z", year=2024)],
        created_at=now,
        updated_at=now,
    )
    (profile_dir / "test_example_com.json").write_text(profile.model_dump_json())

    with patch("backend.core.orchestrator._jd_parser") as mock_parser, patch(
        "backend.core.orchestrator._company_researcher"
    ) as mock_researcher, patch(
        "backend.core.orchestrator._profile_matcher"
    ) as mock_matcher, patch(
        "backend.core.orchestrator.PROFILE_DIR", profile_dir
    ):
        mock_parser.parse.return_value = _fake_parsed_jd()
        mock_researcher.research.return_value = _fake_report()
        mock_matcher.match.return_value = _fake_match()

        from backend.core.orchestrator import run_pipeline

        state = run_pipeline(
            jd_text="Backend Engineer at Acme. Required: Python.",
            company_name="Acme",
            website="https://acme.example",
            profile_id="test_example_com",
        )

    for key in ("parsed_jd", "research_report", "match_score", "error"):
        assert key in state
    assert state["error"] is None
    assert state["parsed_jd"] is not None
    assert state["research_report"] is not None
    assert state["match_score"] is not None


LIVE_JD_TEXT = (
    "Anthropic is hiring an AI Engineer (Fresher) to join our applied "
    "AI team. We are looking for recent M.Tech or B.Tech CSE graduates "
    "with strong fundamentals in Python, deep learning, and modern LLM "
    "tooling. You will build production AI features using LangChain, "
    "FastAPI, and PyTorch, deploy models on GPU infrastructure, and "
    "work directly with founders on customer-facing AI products. "
    "Required skills: Python, PyTorch, LangChain, FastAPI, SQL, REST "
    "APIs. Preferred: Docker, vector databases, RAG pipelines, LLM "
    "fine-tuning. We value engineers who ship fast, learn faster, and "
    "own outcomes end to end."
)


@pytest.mark.live
def test_live_full_pipeline():
    from backend.core.orchestrator import run_pipeline

    state = run_pipeline(
        jd_text=LIVE_JD_TEXT,
        company_name="Anthropic",
        website="https://anthropic.com",
        profile_id="nbarandwal_gmail_com",
        instructions="Highlight secure AI systems work",
    )

    assert state["error"] is None, f"pipeline error: {state['error']}"
    assert state["parsed_jd"] is not None
    assert state["research_report"] is not None
    assert state["match_score"] is not None
    assert state["tailored_resume"] is not None
    assert state["tailored_cover_letter"] is not None
    assert isinstance(state["tailored_resume"].target_role, str)
    assert state["tailored_resume"].target_role.strip() != ""
    assert len(state["tailored_cover_letter"].paragraphs) == 3
