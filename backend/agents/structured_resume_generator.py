import json
import re
from datetime import datetime, timezone

from backend.core.model_router import ModelRouter
from backend.models.schemas import (
    MatchScore,
    ParsedJD,
    ResearchReport,
    StructuredContact,
    StructuredEducationRow,
    StructuredExperience,
    StructuredProject,
    StructuredResume,
)


SELECTION_SYSTEM_PROMPT = """You are a resume curator. Select which items from the candidate profile pool to include in a resume for this specific job.

Return strict JSON only:
{
  "personal_projects": ["name1", "name2"],
  "academic_projects": ["name1"],
  "work_experience": ["Company1", "Company2"],
  "skill_categories": ["AI & ML", "Languages"],
  "jd_keywords_used": ["keyword1", "keyword2"],
  "target_role": "exact role title from JD"
}

Rules:
- Only use names/companies that exist exactly in the profile pool
- Select personal_projects with highest JD tech stack overlap (max 3)
- Select ALL academic_projects from the pool. Include every one. Do not limit to max 2.
- ALWAYS include the M.Tech thesis as an academic project. It is the strongest project and must always appear. It demonstrates research depth regardless of role.
- For AI/ML roles: prioritize TailorMind, Bolna, Customer Retention
- Always select exactly 3 personal_projects. Never fewer than 3.
- For blockchain/web3 roles: prioritize AMM-DEX, BookMyHotel, Consensus Mechanisms thesis
- For full stack/backend roles: prioritize TailorMind, Armatrix, Bolna
- Always include all work_experience unless JD is highly specialized
- skill_categories: ALWAYS return ALL available category names from the pool. Never filter skills.
- jd_keywords_used: only keywords actually present in profile
- Return JSON only, no preamble, no markdown
"""


REWRITE_SYSTEM_PROMPT = """You are an expert resume writer. Rewrite the provided resume bullets to better align with the target role, while preserving all factual content.

STRICT RULES - these are absolute and non-negotiable:
1. NEVER add tools, frameworks, numbers, or experiences not present in the original bullet. This includes appended phrases, suffixes, and contextual additions of any kind.
2. NEVER invent metrics (no "improved by X%", "reduced by Y%") unless already in the original.
2a. NEVER append any phrase to the end of a bullet. If the original bullet ends at a certain point, your rewrite must end at approximately the same point. Do not add "incorporating...", "leveraging...", "with a focus on...", or any trailing clause not in the original.
2b. NEVER inject AI/ML/LLM buzzwords into bullets that do not already contain them. If the original bullet describes REST APIs, JIRA, or React.js, it stays about those things. Do not add "AI-driven", "Generative AI", "LLM-powered", or similar terms unless those exact words appear in the original.
2c. After writing each rewritten bullet, verify: does it contain any word, phrase, tool, or concept not present in the original? If yes, remove it.
3. You MAY change: verb choice, emphasis, order of clauses, level of technical detail, framing for the role
4. For backend roles: emphasize APIs, scalability, reliability
5. For AI/ML roles: emphasize ML methods, model performance, inference pipelines
6. For blockchain roles: emphasize smart contracts, security, decentralization
7. For full stack roles: emphasize end-to-end ownership, frontend + backend integration
8. Each bullet must remain as a separate item. Never merge two bullets into one. Keep the original length and detail of each bullet.
9. Keep the original bullet if rewriting would make it worse
10. ALWAYS include ALL bullets for each item. Never drop bullets. If the original has 4 bullets, the rewrite must have 4 bullets.
11. The rewritten bullet is a RESTATEMENT of the original, not an enhancement. Your job is better phrasing for the role, not adding new content. When in doubt, keep the original.

Return strict JSON only:
{
  "personal_projects": {
    "ProjectName": ["rewritten bullet 1", "rewritten bullet 2"]
  },
  "academic_projects": {
    "ProjectName": ["rewritten bullet 1"]
  },
  "work_experience": {
    "CompanyName": ["rewritten bullet 1", "rewritten bullet 2"]
  }
}
"""


def _extract_json(raw: str) -> str:
    text = raw.strip()
    fence = re.search(r"```(?:json)?\s*(\{.*\})\s*```", text, re.DOTALL)
    if fence:
        return fence.group(1)
    first = text.find("{")
    last = text.rfind("}")
    if first != -1 and last != -1 and last > first:
        return text[first : last + 1]
    return text


def _safe_parse_json(raw: str) -> dict | None:
    try:
        return json.loads(_extract_json(raw))
    except Exception as exc:
        print(f"[structured_resume] JSON parse failed: {exc}")
        return None


class StructuredResumeGenerator:
    def __init__(self, model_router: ModelRouter | None = None) -> None:
        self.model_router = model_router or ModelRouter()

    def generate(
        self,
        profile: dict,
        jd: ParsedJD,
        research: ResearchReport,
        match: MatchScore,
        instructions: str = "",
    ) -> StructuredResume:
        personal_projects_pool = profile.get("projects", []) or []
        academic_pool = profile.get("academic_projects", []) or []
        experience_pool = profile.get("work_experience", []) or []
        skill_pool = profile.get("skill_categories", {}) or {}

        selection = self._select(
            personal_projects_pool,
            academic_pool,
            experience_pool,
            skill_pool,
            jd,
            instructions,
        )

        selected_project_names = [
            p["name"] for p in personal_projects_pool
            if p["name"] in selection["personal_projects"]
        ]
        selected_academic_names = [
            p["name"] for p in academic_pool
            if p["name"] in selection["academic_projects"]
        ]
        selected_company_names = [
            e["company"] for e in experience_pool
            if e["company"] in selection["work_experience"]
        ]
        selected_skill_keys = [
            key for key in selection["skill_categories"] if key in skill_pool
        ]

        if not selected_project_names:
            selected_project_names = [p["name"] for p in personal_projects_pool]
        if not selected_academic_names:
            selected_academic_names = [p["name"] for p in academic_pool]
        if not selected_company_names:
            selected_company_names = [e["company"] for e in experience_pool]
        if not selected_skill_keys:
            selected_skill_keys = list(skill_pool.keys())

        rewrites = self._rewrite(
            personal_projects_pool,
            academic_pool,
            experience_pool,
            selected_project_names,
            selected_academic_names,
            selected_company_names,
            jd,
            selection.get("target_role") or jd.role_title,
            instructions,
        )

        personal_projects: list[StructuredProject] = []
        for name in selected_project_names:
            project = next(
                (p for p in personal_projects_pool if p["name"] == name),
                None,
            )
            if not project:
                continue
            bullets = rewrites.get("personal_projects", {}).get(
                name, project.get("bullets", [])
            )
            if not isinstance(bullets, list) or not bullets:
                bullets = project.get("bullets", [])
            personal_projects.append(
                StructuredProject(
                    name=project.get("name", ""),
                    tech_stack=project.get("tech_stack", ""),
                    bullets=bullets,
                    live_url=project.get("live_url", "") or "",
                    repo_url=project.get("repo_url", "") or "",
                    context=project.get("context", "") or "",
                    guide=project.get("guide", "") or "",
                )
            )

        academic_projects: list[StructuredProject] = []
        for name in selected_academic_names:
            project = next(
                (p for p in academic_pool if p["name"] == name),
                None,
            )
            if not project:
                continue
            bullets = rewrites.get("academic_projects", {}).get(
                name, project.get("bullets", [])
            )
            if not isinstance(bullets, list) or not bullets:
                bullets = project.get("bullets", [])
            academic_projects.append(
                StructuredProject(
                    name=project.get("name", ""),
                    tech_stack=project.get("tech_stack", ""),
                    bullets=bullets,
                    live_url=project.get("live_url", "") or "",
                    repo_url=project.get("repo_url", "") or "",
                    context=project.get("context", "") or "",
                    guide=project.get("guide", "") or "",
                )
            )

        work_experience: list[StructuredExperience] = []
        for company in selected_company_names:
            entry = next(
                (e for e in experience_pool if e["company"] == company),
                None,
            )
            if not entry:
                continue
            bullets = rewrites.get("work_experience", {}).get(
                company, entry.get("bullets", [])
            )
            if not isinstance(bullets, list) or not bullets:
                bullets = entry.get("bullets", [])
            work_experience.append(
                StructuredExperience(
                    company=entry.get("company", ""),
                    role=entry.get("role", ""),
                    duration=entry.get("duration", ""),
                    guide=entry.get("guide", "") or "",
                    bullets=bullets,
                )
            )

        education: list[StructuredEducationRow] = []
        for row in profile.get("education", []) or []:
            try:
                education.append(StructuredEducationRow(**row))
            except Exception as exc:
                print(f"[structured_resume] skipping education row: {exc}")

        selected_skill_categories = {
            key: skill_pool[key] for key in selected_skill_keys if key in skill_pool
        }

        contact = StructuredContact(
            full_name=profile.get("full_name", ""),
            email=profile.get("email", ""),
            phone=profile.get("phone", ""),
            github_url=profile.get("github_url", "") or "",
            linkedin_url=profile.get("linkedin_url", "") or "",
            iit_email=profile.get("iit_email", "") or "",
        )

        return StructuredResume(
            contact=contact,
            education=education,
            skill_categories=selected_skill_categories,
            personal_projects=personal_projects,
            work_experience=work_experience,
            academic_projects=academic_projects,
            publications=profile.get("publications", []) or [],
            positions=profile.get("positions", []) or [],
            achievements=profile.get("achievements", []) or [],
            target_role=selection.get("target_role") or jd.role_title,
            jd_keywords_used=selection.get("jd_keywords_used", []) or [],
            generated_at=datetime.now(timezone.utc),
        )

    def _select(
        self,
        personal_pool: list[dict],
        academic_pool: list[dict],
        experience_pool: list[dict],
        skill_pool: dict[str, str],
        jd: ParsedJD,
        instructions: str,
    ) -> dict:
        lines: list[str] = ["PROFILE POOL:"]
        for p in personal_pool:
            first_bullet = (p.get("bullets") or [""])[0]
            lines.append(
                f"- {p.get('name', '')} ({p.get('tech_stack', '')}): {first_bullet}"
            )
        lines.append("")
        lines.append("Academic projects:")
        for p in academic_pool:
            first_bullet = (p.get("bullets") or [""])[0]
            lines.append(
                f"- {p.get('name', '')} ({p.get('context', '')}): {first_bullet}"
            )
        lines.append("")
        lines.append("Work experience:")
        for e in experience_pool:
            first_bullet = (e.get("bullets") or [""])[0]
            lines.append(
                f"- {e.get('company', '')} ({e.get('role', '')}): {first_bullet}"
            )
        lines.append("")
        lines.append(f"Skill categories: {list(skill_pool.keys())}")
        lines.append("")
        lines.append("JD REQUIREMENTS:")
        lines.append(f"Role: {jd.role_title}")
        lines.append(f"Required skills: {jd.required_skills}")
        lines.append(f"Tech stack: {jd.tech_stack}")
        if instructions:
            lines.append("")
            lines.append(f"CANDIDATE INSTRUCTIONS: {instructions}")

        messages = [
            {"role": "system", "content": SELECTION_SYSTEM_PROMPT},
            {"role": "user", "content": "\n".join(lines)},
        ]

        defaults = {
            "personal_projects": [p["name"] for p in personal_pool[:3]],
            "academic_projects": [p["name"] for p in academic_pool[:2]],
            "work_experience": [e["company"] for e in experience_pool],
            "skill_categories": list(skill_pool.keys()),
            "jd_keywords_used": [],
            "target_role": jd.role_title,
        }

        try:
            raw = self.model_router.call(
                "generate_resume",
                messages,
                response_format={"type": "json_object"},
            )
        except Exception as exc:
            print(f"[structured_resume] selection call failed: {exc}")
            return defaults

        parsed = _safe_parse_json(raw)
        if not parsed:
            return defaults

        for key, default_value in defaults.items():
            value = parsed.get(key)
            if value is None:
                parsed[key] = default_value
            elif key == "target_role" and not isinstance(value, str):
                parsed[key] = str(value) if value else default_value
            elif key != "target_role" and not isinstance(value, list):
                parsed[key] = default_value

        return parsed

    def _rewrite(
        self,
        personal_pool: list[dict],
        academic_pool: list[dict],
        experience_pool: list[dict],
        selected_projects: list[str],
        selected_academic: list[str],
        selected_companies: list[str],
        jd: ParsedJD,
        target_role: str,
        instructions: str,
    ) -> dict:
        if not (selected_projects or selected_academic or selected_companies):
            return {}

        lines: list[str] = []
        lines.append(f"TARGET ROLE: {target_role}")
        lines.append(f"JD REQUIRED SKILLS: {jd.required_skills}")
        lines.append(f"JD TECH STACK: {jd.tech_stack}")
        lines.append(f"JD RESPONSIBILITIES: {jd.responsibilities[:3]}")
        lines.append("")

        if selected_projects:
            lines.append("PERSONAL PROJECTS (rewrite bullets for each):")
            for name in selected_projects:
                project = next((p for p in personal_pool if p["name"] == name), None)
                if not project:
                    continue
                lines.append(f"- {name}:")
                for b in project.get("bullets", []):
                    lines.append(f"  * {b}")
            lines.append("")

        if selected_academic:
            lines.append("ACADEMIC PROJECTS (rewrite bullets for each):")
            for name in selected_academic:
                project = next((p for p in academic_pool if p["name"] == name), None)
                if not project:
                    continue
                lines.append(f"- {name}:")
                for b in project.get("bullets", []):
                    lines.append(f"  * {b}")
            lines.append("")

        if selected_companies:
            lines.append("WORK EXPERIENCE (rewrite bullets for each):")
            for company in selected_companies:
                entry = next(
                    (e for e in experience_pool if e["company"] == company),
                    None,
                )
                if not entry:
                    continue
                lines.append(f"- {company}:")
                for b in entry.get("bullets", []):
                    lines.append(f"  * {b}")
            lines.append("")

        if instructions:
            lines.append(f"CANDIDATE INSTRUCTIONS: {instructions}")

        messages = [
            {"role": "system", "content": REWRITE_SYSTEM_PROMPT},
            {"role": "user", "content": "\n".join(lines)},
        ]

        try:
            raw = self.model_router.call(
                "generate_resume",
                messages,
                response_format={"type": "json_object"},
            )
        except Exception as exc:
            print(f"[structured_resume] rewrite call failed: {exc}")
            return {}

        parsed = _safe_parse_json(raw)
        if not parsed:
            return {}

        return {
            "personal_projects": parsed.get("personal_projects", {}) or {},
            "academic_projects": parsed.get("academic_projects", {}) or {},
            "work_experience": parsed.get("work_experience", {}) or {},
        }
