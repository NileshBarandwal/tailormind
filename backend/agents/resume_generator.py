import json
import re
from datetime import datetime, timezone

from backend.core.model_router import ModelRouter
from backend.models.schemas import (
    MatchScore,
    ParsedJD,
    ResearchReport,
    TailoredResume,
    UserProfile,
)


SYSTEM_PROMPT = """You are an expert resume writer. Your job is to create a tailored resume for a specific job application.

Rules:
- Use only facts from the candidate profile. Never invent experience, skills, or achievements.
- Mirror the language and keywords from the job description naturally.
- Prioritize experiences and projects most relevant to the target role.
- Every bullet point must be achievement-oriented and start with a strong action verb.
- Return strict JSON only matching the schema. No preamble, no markdown fences.
- sections must include at minimum: Summary, Experience, Projects, Skills, Education.
- Order sections by relevance to the role (most relevant first after Summary).
- skills_highlighted: skills from the profile that directly match the JD.
- jd_keywords_used: keywords from the JD naturally woven into bullets.

Return a single JSON object with exactly these keys:
- profile_name: string
- target_role: string
- summary: string
- sections: array of objects, each with: title (string), bullets (array of strings), order (integer)
- skills_highlighted: array of strings
- jd_keywords_used: array of strings
"""


def _build_user_prompt(
    profile: UserProfile,
    jd: ParsedJD,
    research: ResearchReport,
    match: MatchScore,
    instructions: str,
) -> str:
    lines: list[str] = []

    lines.append("CANDIDATE PROFILE:")
    lines.append(f"Name: {profile.full_name}")
    lines.append(f"Summary: {profile.summary or 'n/a'}")
    lines.append(
        f"Skills: {', '.join(profile.skills) if profile.skills else 'none listed'}"
    )

    lines.append("")
    lines.append("Experiences:")
    if profile.experiences:
        for exp in profile.experiences:
            desc = "; ".join(exp.description) if exp.description else "n/a"
            tech = ", ".join(exp.tech_used) if exp.tech_used else "n/a"
            lines.append(
                f"- {exp.role} at {exp.company} ({exp.duration})"
                f"\n  Description: {desc}\n  Tech: {tech}"
            )
    else:
        lines.append("- none listed")

    lines.append("")
    lines.append("Projects:")
    if profile.projects:
        for proj in profile.projects:
            highlights = "; ".join(proj.highlights) if proj.highlights else "n/a"
            tech = ", ".join(proj.tech_used) if proj.tech_used else "n/a"
            lines.append(
                f"- {proj.name}: {proj.description}\n  Highlights: {highlights}\n  Tech: {tech}"
            )
    else:
        lines.append("- none listed")

    lines.append("")
    lines.append("Education:")
    if profile.education:
        for edu in profile.education:
            lines.append(
                f"- {edu.degree} in {edu.field}, {edu.institution} ({edu.year}), CGPA {edu.cgpa}"
            )
    else:
        lines.append("- none listed")

    lines.append("")
    lines.append(
        f"Achievements: {'; '.join(profile.achievements) if profile.achievements else 'none'}"
    )

    lines.append("")
    lines.append("TARGET JOB:")
    lines.append(f"Role: {jd.role_title}")
    lines.append(f"Experience level: {jd.experience_level}")
    lines.append(
        f"Required skills: {', '.join(jd.required_skills) if jd.required_skills else 'none'}"
    )
    lines.append(
        f"Preferred skills: {', '.join(jd.preferred_skills) if jd.preferred_skills else 'none'}"
    )
    lines.append(
        f"Responsibilities: {'; '.join(jd.responsibilities) if jd.responsibilities else 'none'}"
    )
    lines.append(
        f"Tech stack: {', '.join(jd.tech_stack) if jd.tech_stack else 'none'}"
    )
    lines.append(
        f"Culture signals: {', '.join(jd.culture_signals) if jd.culture_signals else 'none'}"
    )

    brief = research.company_brief
    lines.append("")
    lines.append("COMPANY CONTEXT:")
    lines.append(f"Company: {brief.company_name}")
    lines.append(f"Mission: {brief.mission or 'n/a'}")
    lines.append(
        f"Culture signals: {', '.join(brief.culture_signals) if brief.culture_signals else 'none'}"
    )

    lines.append("")
    lines.append("MATCH INSIGHTS:")
    lines.append(
        f"Matched skills: {', '.join(match.matched_skills) if match.matched_skills else 'none'}"
    )
    lines.append(
        f"Missing skills: {', '.join(match.missing_skills) if match.missing_skills else 'none'}"
    )
    lines.append(
        f"Recommendations: {'; '.join(match.recommendations) if match.recommendations else 'none'}"
    )

    if instructions:
        lines.append("")
        lines.append(f"ADDITIONAL INSTRUCTIONS FROM CANDIDATE:\n{instructions}")

    return "\n".join(lines)


class ResumeGenerator:
    def __init__(self, model_router: ModelRouter | None = None) -> None:
        self.model_router = model_router or ModelRouter()

    def generate(
        self,
        profile: UserProfile,
        jd: ParsedJD,
        research: ResearchReport,
        match: MatchScore,
        instructions: str = "",
    ) -> TailoredResume:
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": _build_user_prompt(profile, jd, research, match, instructions),
            },
        ]

        raw = self.model_router.call(
            "generate_resume",
            messages,
            response_format={"type": "json_object"},
        )

        payload = self._extract_json(raw)
        try:
            data = json.loads(payload)
        except json.JSONDecodeError as exc:
            raise ValueError(
                f"Model did not return valid JSON for resume generation: {exc.msg}"
            ) from exc

        data["generated_at"] = datetime.now(timezone.utc)
        return TailoredResume(**data)

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
