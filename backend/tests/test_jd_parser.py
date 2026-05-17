import json
from unittest.mock import MagicMock

import pytest

from backend.agents.jd_parser import JDParser
from backend.models.schemas import ParsedJD


SAMPLE_JD = """
Senior Backend Engineer - Acme Cloud

We are looking for a Senior Backend Engineer with 6+ years of experience to join our
distributed systems team. You will design and build large-scale APIs that power our
data platform used by thousands of enterprises.

Required skills:
- Strong Python and FastAPI experience
- PostgreSQL and database design
- Kubernetes and Docker

Preferred skills:
- Experience with Kafka or other event streaming systems
- Familiarity with LangChain or LLM tooling

Responsibilities:
- Design and ship backend services
- Mentor junior engineers
- Own production reliability for owned services

We value autonomy, written communication, and a bias to action.
"""


def _make_parser(response_json: dict) -> JDParser:
    router = MagicMock()
    router.call.return_value = json.dumps(response_json)
    return JDParser(model_router=router)


def test_parse_normal_jd():
    response = {
        "role_title": "Senior Backend Engineer",
        "required_skills": ["Python", "FastAPI", "PostgreSQL", "Kubernetes", "Docker"],
        "preferred_skills": ["Kafka", "LangChain"],
        "experience_level": "senior",
        "responsibilities": [
            "Design and ship backend services",
            "Mentor junior engineers",
            "Own production reliability",
        ],
        "tech_stack": ["Python", "FastAPI", "PostgreSQL", "Kubernetes", "Docker", "Kafka"],
        "culture_signals": ["autonomy", "written communication", "bias to action"],
    }
    parser = _make_parser(response)
    parsed = parser.parse(SAMPLE_JD)

    assert isinstance(parsed, ParsedJD)
    assert parsed.role_title == "Senior Backend Engineer"
    assert "Python" in parsed.required_skills
    assert "Kafka" in parsed.preferred_skills
    assert parsed.experience_level == "senior"
    assert len(parsed.responsibilities) == 3
    assert "FastAPI" in parsed.tech_stack
    assert "autonomy" in parsed.culture_signals
    assert parsed.raw_text == SAMPLE_JD
    assert parsed.parsed_at is not None


def test_parse_minimal_jd():
    minimal_jd = (
        "Frontend Developer position. Required: React. Some experience expected."
    )
    response = {
        "role_title": "Frontend Developer",
        "required_skills": ["React"],
        "preferred_skills": [],
        "experience_level": "mid",
        "responsibilities": [],
        "tech_stack": ["React"],
        "culture_signals": [],
    }
    parser = _make_parser(response)
    parsed = parser.parse(minimal_jd)

    assert isinstance(parsed, ParsedJD)
    assert parsed.role_title == "Frontend Developer"
    assert parsed.required_skills == ["React"]
    assert parsed.preferred_skills == []
    assert parsed.experience_level == "mid"


def test_parse_empty_jd():
    parser = _make_parser({})
    with pytest.raises(ValueError):
        parser.parse("")


def test_parse_short_jd():
    parser = _make_parser({})
    with pytest.raises(ValueError):
        parser.parse("Hiring engineer.")


def test_preferred_skills_empty():
    jd_text = (
        "Data Engineer. We need a strong SQL person to build pipelines on AWS. "
        "Mid-level role with 3-5 years experience needed."
    )
    response = {
        "role_title": "Data Engineer",
        "required_skills": ["SQL", "AWS"],
        "preferred_skills": [],
        "experience_level": "mid",
        "responsibilities": ["Build pipelines"],
        "tech_stack": ["SQL", "AWS"],
        "culture_signals": [],
    }
    parser = _make_parser(response)
    parsed = parser.parse(jd_text)

    assert isinstance(parsed.preferred_skills, list)
    assert parsed.preferred_skills == []


@pytest.mark.live
def test_live_parse_jd():
    parser = JDParser()
    result = parser.parse(SAMPLE_JD)

    assert isinstance(result.role_title, str) and result.role_title
    assert isinstance(result.required_skills, list) and len(result.required_skills) > 0
    assert result.experience_level in ("fresher", "junior", "mid", "senior")
