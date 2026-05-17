import json
import re

from backend.core.model_router import ModelRouter
from backend.models.schemas import MatchScore, ParsedJD, UserProfile


SYSTEM_PROMPT = """You are a hiring evaluator. Score how well a candidate's profile matches a job's requirements.

Return a single JSON object with exactly these keys:
- overall_score: float between 0.0 and 1.0
- skill_score: float between 0.0 and 1.0
- experience_score: float between 0.0 and 1.0
- education_score: float between 0.0 and 1.0
- matched_skills: array of strings (skills present in both the candidate profile and the job description)
- missing_skills: array of strings (skills required by the job that are absent from the candidate profile)
- rationale: string, 2-3 sentences, honest assessment of fit
- recommendations: array of exactly 3 specific actions the candidate could take to improve fit

Rules:
- Return JSON only. No preamble, no commentary, no markdown code fences.
- Be honest. Do not inflate scores. A weak match should score low.
- A score of 1.0 means perfect alignment; 0.0 means no relevant overlap.
- Skills must match case-insensitively but be returned with the casing used in the source.
- Never invent skills or experience the candidate does not have.
"""


def _build_user_prompt(profile: UserProfile, jd: ParsedJD) -> str:
    profile_lines = [
        "CANDIDATE PROFILE:",
        f"Name: {profile.full_name}",
        f"Skills: {', '.join(profile.skills) if profile.skills else 'none listed'}",
        "",
        "Experiences:",
    ]
    if profile.experiences:
        for exp in profile.experiences:
            tech = ", ".join(exp.tech_used) if exp.tech_used else "n/a"
            profile_lines.append(
                f"- {exp.role} at {exp.company} ({exp.duration}); tech: {tech}"
            )
    else:
        profile_lines.append("- none listed")

    profile_lines.append("")
    profile_lines.append("Projects:")
    if profile.projects:
        for proj in profile.projects:
            tech = ", ".join(proj.tech_used) if proj.tech_used else "n/a"
            highlights = "; ".join(proj.highlights) if proj.highlights else "n/a"
            profile_lines.append(
                f"- {proj.name}: tech: {tech}; highlights: {highlights}"
            )
    else:
        profile_lines.append("- none listed")

    profile_lines.append("")
    profile_lines.append("Education:")
    if profile.education:
        top = profile.education[0]
        profile_lines.append(
            f"- Highest: {top.degree} in {top.field}, {top.institution} ({top.year}), CGPA {top.cgpa}"
        )
        for edu in profile.education[1:]:
            profile_lines.append(
                f"- {edu.degree} in {edu.field}, {edu.institution} ({edu.year}), CGPA {edu.cgpa}"
            )
    else:
        profile_lines.append("- none listed")

    profile_lines.append("")
    profile_lines.append(
        f"Certifications: {', '.join(profile.certifications) if profile.certifications else 'none'}"
    )
    profile_lines.append(
        f"Achievements: {'; '.join(profile.achievements) if profile.achievements else 'none'}"
    )

    jd_lines = [
        "",
        "JOB REQUIREMENTS:",
        f"Role: {jd.role_title}",
        f"Experience level: {jd.experience_level}",
        f"Required skills: {', '.join(jd.required_skills) if jd.required_skills else 'none'}",
        f"Preferred skills: {', '.join(jd.preferred_skills) if jd.preferred_skills else 'none'}",
        f"Responsibilities: {'; '.join(jd.responsibilities) if jd.responsibilities else 'none'}",
        f"Tech stack: {', '.join(jd.tech_stack) if jd.tech_stack else 'none'}",
        f"Culture signals: {', '.join(jd.culture_signals) if jd.culture_signals else 'none'}",
    ]

    return "\n".join(profile_lines + jd_lines)


class ProfileMatcher:
    def __init__(self, model_router: ModelRouter | None = None) -> None:
        self.model_router = model_router or ModelRouter()

    def match(self, profile: UserProfile, jd: ParsedJD) -> MatchScore:
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": _build_user_prompt(profile, jd)},
        ]

        raw = self.model_router.call(
            "match_profile",
            messages,
            response_format={"type": "json_object"},
        )

        payload = self._extract_json(raw)
        try:
            data = json.loads(payload)
        except json.JSONDecodeError as exc:
            raise ValueError(
                f"Model did not return valid JSON for profile match: {exc.msg}"
            ) from exc

        return MatchScore(**data)

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
