from datetime import datetime, timezone

from backend.models.schemas import (
    ResumeSection,
    TailoredCoverLetter,
    TailoredResume,
)
from backend.services.pdf_generator import (
    cover_letter_to_html,
    resume_to_html,
)


def _resume() -> TailoredResume:
    return TailoredResume(
        profile_name="Nilesh Rohidas Barandwal",
        target_role="AI Engineer",
        summary="M.Tech CSE focused on verifiable AI.",
        sections=[
            ResumeSection(title="Summary", bullets=["Built APIs"], order=0),
            ResumeSection(title="Experience", bullets=["Backend at Acme"], order=1),
            ResumeSection(title="Projects", bullets=["AMM-DEX"], order=2),
            ResumeSection(title="Skills", bullets=["Python, FastAPI"], order=3),
            ResumeSection(title="Education", bullets=["M.Tech IIT Dharwad"], order=4),
        ],
        skills_highlighted=["Python", "FastAPI"],
        jd_keywords_used=["Python"],
        generated_at=datetime.now(timezone.utc),
    )


def _cover_letter() -> TailoredCoverLetter:
    return TailoredCoverLetter(
        profile_name="Nilesh Rohidas Barandwal",
        target_role="AI Engineer",
        company_name="Anthropic",
        greeting="Dear Hiring Manager,",
        paragraphs=[
            "I am applying for the AI Engineer role.",
            "At Acme I built APIs in Python.",
            "I look forward to discussing how I can contribute.",
        ],
        closing="Sincerely, Nilesh",
        generated_at=datetime.now(timezone.utc),
    )


def test_resume_to_html_contains_name():
    html = resume_to_html(_resume())
    assert "Nilesh Rohidas Barandwal" in html


def test_resume_to_html_contains_sections():
    html = resume_to_html(_resume())
    for title in ("Summary", "Experience", "Projects", "Skills", "Education"):
        assert title in html


def test_cover_letter_to_html_contains_paragraphs():
    letter = _cover_letter()
    html = cover_letter_to_html(letter)
    for paragraph in letter.paragraphs:
        assert paragraph in html
