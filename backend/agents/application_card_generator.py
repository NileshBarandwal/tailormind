import json
import re
from datetime import datetime, timezone

from backend.core.model_router import ModelRouter
from backend.models.schemas import (
    ApplicationCard,
    MatchScore,
    ParsedJD,
    ResearchReport,
    UserProfile,
)


SYSTEM_PROMPT = """You are an expert job application assistant. Generate a complete application intelligence card for a candidate applying to a specific role.

Return strict JSON only with exactly these keys:
- one_liner_pitch: one sentence, specific to this company and role, not generic. Reference the company's actual focus.
- why_this_company: 2-3 sentences. Use specific details from the company research. Reference their mission, product, or recent focus. Never generic.
- why_this_role: 2-3 sentences. Connect candidate's strongest relevant experience directly to this role's requirements.
- top_experiences: array of exactly 3 strings. The 3 most relevant experience bullets from the candidate profile for this specific role. Achievement-oriented, action verb start.
- key_skills_to_mention: array of skills from candidate profile that directly match JD requirements. Ordered by JD emphasis.
- likely_questions: array of exactly 5 objects with keys "question" and "answer". Most likely screening questions for this role with tailored answers using candidate's actual experience. Never invent experience.
- application_checklist: array of strings. Items to complete before submitting. Always include: attach tailored resume, attach cover letter, add GitHub profile link, add LinkedIn, mention relevant project URLs.

Rules:
- Use only facts from the candidate profile provided.
- Reference specific company details from research context.
- Be specific, never generic.
- Return JSON only, no preamble, no markdown fences.
"""


def _score_relevance(item_tech: list[str], jd_skills: set[str]) -> int:
    return sum(1 for t in item_tech if t.lower() in jd_skills)


def _build_user_prompt(
    profile: UserProfile,
    jd: ParsedJD,
    research: ResearchReport,
    match: MatchScore,
) -> str:
    jd_skills = {
        s.lower() for s in jd.required_skills + jd.preferred_skills + jd.tech_stack
    }
    ranked_experiences = sorted(
        profile.experiences,
        key=lambda e: _score_relevance(e.tech_used, jd_skills),
        reverse=True,
    )[:3]
    ranked_projects = sorted(
        profile.projects,
        key=lambda p: _score_relevance(p.tech_used, jd_skills),
        reverse=True,
    )[:3]

    brief = research.company_brief

    lines: list[str] = []
    lines.append("CANDIDATE:")
    lines.append(f"Name: {profile.full_name}")
    lines.append(f"Email: {profile.email}")
    lines.append(f"Phone: {profile.phone or 'n/a'}")
    lines.append(f"Summary: {profile.summary or 'n/a'}")
    lines.append(
        f"Skills: {', '.join(profile.skills) if profile.skills else 'none listed'}"
    )

    lines.append("")
    lines.append("Top experiences:")
    if ranked_experiences:
        for exp in ranked_experiences:
            desc = "; ".join(exp.description) if exp.description else "n/a"
            tech = ", ".join(exp.tech_used) if exp.tech_used else "n/a"
            lines.append(
                f"- {exp.role} at {exp.company} ({exp.duration})"
                f"\n  Tech: {tech}\n  Description: {desc}"
            )
    else:
        lines.append("- none listed")

    lines.append("")
    lines.append("Top projects:")
    if ranked_projects:
        for proj in ranked_projects:
            highlights = "; ".join(proj.highlights) if proj.highlights else "n/a"
            tech = ", ".join(proj.tech_used) if proj.tech_used else "n/a"
            url = proj.url or "n/a"
            lines.append(
                f"- {proj.name}: {proj.description}"
                f"\n  Tech: {tech}\n  Highlights: {highlights}\n  URL: {url}"
            )
    else:
        lines.append("- none listed")

    lines.append("")
    lines.append("TARGET ROLE:")
    lines.append(f"Role: {jd.role_title}")
    lines.append(f"Experience level: {jd.experience_level}")
    lines.append(
        f"Required skills: {', '.join(jd.required_skills) if jd.required_skills else 'none'}"
    )
    lines.append(
        f"Responsibilities: {'; '.join(jd.responsibilities) if jd.responsibilities else 'none'}"
    )
    lines.append(
        f"Tech stack: {', '.join(jd.tech_stack) if jd.tech_stack else 'none'}"
    )

    lines.append("")
    lines.append("COMPANY CONTEXT:")
    lines.append(f"Company: {brief.company_name}")
    lines.append(f"Website: {brief.website}")
    lines.append(f"Mission: {brief.mission or 'n/a'}")
    lines.append(
        f"Culture signals: {', '.join(brief.culture_signals) if brief.culture_signals else 'none'}"
    )
    lines.append(
        f"Recent news: {'; '.join(brief.recent_news) if brief.recent_news else 'none'}"
    )

    lines.append("")
    lines.append("MATCH INSIGHTS:")
    lines.append(
        f"Matched skills: {', '.join(match.matched_skills) if match.matched_skills else 'none'}"
    )
    lines.append(
        f"Missing skills: {', '.join(match.missing_skills) if match.missing_skills else 'none'}"
    )
    lines.append(f"Rationale: {match.rationale or 'n/a'}")

    return "\n".join(lines)


class ApplicationCardGenerator:
    def __init__(self, model_router: ModelRouter | None = None) -> None:
        self.model_router = model_router or ModelRouter()

    def generate(
        self,
        profile: UserProfile,
        jd: ParsedJD,
        research: ResearchReport,
        match: MatchScore,
        job_url: str = "",
    ) -> ApplicationCard:
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": _build_user_prompt(profile, jd, research, match),
            },
        ]

        raw = self.model_router.call(
            "application_card",
            messages,
            response_format={"type": "json_object"},
        )

        payload = self._extract_json(raw)
        try:
            data = json.loads(payload)
        except json.JSONDecodeError as exc:
            raise ValueError(
                f"Model did not return valid JSON for application card: {exc.msg}"
            ) from exc

        data["profile_name"] = profile.full_name
        data["email"] = profile.email
        data["phone"] = profile.phone or ""
        data["target_role"] = jd.role_title
        data["company_name"] = research.company_brief.company_name
        data["job_url"] = job_url
        data["generated_at"] = datetime.now(timezone.utc)

        return ApplicationCard(**data)

    @staticmethod
    def _extract_json(raw: str) -> str:
        text = raw.strip()
        fence_match = re.search(r"```(?:json)?\s*(\{.*\})\s*```", text, re.DOTALL)
        if fence_match:
            return fence_match.group(1)
        first = text.find("{")
        last = text.rfind("}")
        if first != -1 and last != -1 and last > first:
            return text[first : last + 1]
        return text
