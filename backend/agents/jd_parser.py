import json
import re
from datetime import datetime, timezone

from backend.core.model_router import ModelRouter
from backend.models.schemas import ParsedJD


SYSTEM_PROMPT = """You are a job description parser. Your job is to extract structured information from a job description into a strict JSON object.

You must return JSON with exactly these keys:
- role_title: string. The job title.
- required_skills: array of strings. Skills explicitly listed as required, must-have, or mandatory.
- preferred_skills: array of strings. Skills listed as preferred, nice-to-have, bonus, or a plus.
- experience_level: string. One of: "fresher", "junior", "mid", "senior".
- responsibilities: array of strings. The key duties and responsibilities.
- tech_stack: array of strings. Specific technologies, frameworks, languages, tools mentioned.
- culture_signals: array of strings. Phrases that signal company culture, working style, or values.

Rules:
- Return JSON only. No preamble, no commentary, no markdown code fences.
- If a field has no relevant content, return an empty list or an empty string.
- Never invent skills, technologies, or responsibilities that are not present in the job description text.
- Map experience seniority based on cues in the text (e.g. "0-1 years" -> fresher, "1-3 years" -> junior, "3-6 years" -> mid, "6+ years" or "lead/staff/principal" -> senior). If unclear, use "mid".
"""

USER_PROMPT_TEMPLATE = """Parse the following job description and return the JSON object as specified.

Job description:
\"\"\"
{jd_text}
\"\"\"
"""


class JDParser:
    def __init__(self, model_router: ModelRouter | None = None) -> None:
        self.model_router = model_router or ModelRouter()

    def parse(self, jd_text: str) -> ParsedJD:
        if jd_text is None or not jd_text.strip():
            raise ValueError("Job description text is empty.")
        if len(jd_text.strip()) < 50:
            raise ValueError(
                "Job description text is too short to parse (under 50 characters)."
            )

        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": USER_PROMPT_TEMPLATE.format(jd_text=jd_text)},
        ]

        raw = self.model_router.call(
            "parse_jd",
            messages,
            response_format={"type": "json_object"},
        )

        payload = self._extract_json(raw)

        try:
            data = json.loads(payload)
        except json.JSONDecodeError as exc:
            raise ValueError(
                f"Model did not return valid JSON for JD parsing: {exc.msg}"
            ) from exc

        data["raw_text"] = jd_text
        data["parsed_at"] = datetime.now(timezone.utc)

        return ParsedJD(**data)

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
