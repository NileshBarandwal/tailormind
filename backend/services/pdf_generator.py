import re
from datetime import datetime, timezone
from html import escape
from pathlib import Path

from weasyprint import HTML

from backend.models.schemas import TailoredCoverLetter, TailoredResume


_CSS = """
body { font-family: Helvetica, Arial, sans-serif; color: #222; margin: 32px; line-height: 1.45; }
h1 { font-size: 22pt; margin: 0 0 4px 0; }
h2 { font-size: 13pt; margin: 18px 0 6px 0; border-bottom: 1px solid #999; padding-bottom: 2px; }
.target-role { color: #555; font-size: 11pt; margin-bottom: 12px; }
ul { margin: 4px 0 8px 18px; padding: 0; }
li { margin: 2px 0; }
.summary { margin-bottom: 12px; }
.skills-highlighted { margin-top: 12px; font-size: 10pt; color: #444; }
.cover-paragraph { margin: 0 0 10px 0; }
.cover-greeting { margin-bottom: 12px; }
.cover-closing { margin-top: 12px; }
"""


def _slugify(text: str) -> str:
    slug = re.sub(r"[^a-zA-Z0-9]+", "_", text.lower())
    return slug.strip("_") or "untitled"


def _timestamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")


def resume_to_html(resume: TailoredResume) -> str:
    sections = sorted(resume.sections, key=lambda s: s.order)

    section_blocks: list[str] = []
    for section in sections:
        bullets = "".join(f"<li>{escape(b)}</li>" for b in section.bullets)
        section_blocks.append(
            f"<h2>{escape(section.title)}</h2><ul>{bullets}</ul>"
        )

    skills_html = ""
    if resume.skills_highlighted:
        skills = ", ".join(escape(s) for s in resume.skills_highlighted)
        skills_html = (
            f'<div class="skills-highlighted"><strong>Skills highlighted:</strong> {skills}</div>'
        )

    summary_html = ""
    if resume.summary:
        summary_html = (
            f'<div class="summary"><h2>Summary</h2><p>{escape(resume.summary)}</p></div>'
        )

    return (
        "<!DOCTYPE html><html><head><meta charset='utf-8'>"
        f"<style>{_CSS}</style></head><body>"
        f"<h1>{escape(resume.profile_name)}</h1>"
        f"<div class='target-role'>{escape(resume.target_role)}</div>"
        f"{summary_html}"
        f"{''.join(section_blocks)}"
        f"{skills_html}"
        "</body></html>"
    )


def cover_letter_to_html(letter: TailoredCoverLetter) -> str:
    header = (
        f"<h1>{escape(letter.profile_name)}</h1>"
        f"<div class='target-role'>{escape(letter.target_role)} at {escape(letter.company_name)}</div>"
    )
    greeting = f"<p class='cover-greeting'>{escape(letter.greeting)}</p>"
    paragraphs = "".join(
        f"<p class='cover-paragraph'>{escape(p)}</p>" for p in letter.paragraphs
    )
    closing = f"<p class='cover-closing'>{escape(letter.closing)}</p>"

    return (
        "<!DOCTYPE html><html><head><meta charset='utf-8'>"
        f"<style>{_CSS}</style></head><body>"
        f"{header}{greeting}{paragraphs}{closing}"
        "</body></html>"
    )


def html_to_pdf(html: str, output_path: Path) -> Path:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    HTML(string=html).write_pdf(str(output_path))
    return output_path


def export_resume_pdf(resume: TailoredResume, output_dir: Path) -> Path:
    slug = _slugify(resume.profile_name)
    filename = f"resume_{slug}_{_timestamp()}.pdf"
    output_path = output_dir / filename
    html = resume_to_html(resume)
    return html_to_pdf(html, output_path)


def export_cover_letter_pdf(letter: TailoredCoverLetter, output_dir: Path) -> Path:
    slug = _slugify(letter.profile_name)
    filename = f"cover_letter_{slug}_{_timestamp()}.pdf"
    output_path = output_dir / filename
    html = cover_letter_to_html(letter)
    return html_to_pdf(html, output_path)
