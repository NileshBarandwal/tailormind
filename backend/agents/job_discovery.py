import json
import re
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from typing import Any

import httpx

from backend.core.config import settings
from backend.core.model_router import ModelRouter
from backend.models.schemas import DiscoveredJobs, JobListing, UserProfile


ADZUNA_URL = "https://api.adzuna.com/v1/api/jobs/in/search/1"
REMOTIVE_URL = "https://remotive.com/api/remote-jobs"


SYSTEM_PROMPT = """You are a job relevance scorer. Score how well each job matches a candidate's skills.

Return a single JSON object with a key "scores" mapping to an array of objects:
{"scores": [{"job_id": string, "score": number between 0 and 1, "reason": short string}, ...]}

Rules:
- Return JSON only. No preamble, no markdown fences.
- Include one entry per job in the input, identified by job_id.
- score: 1.0 = perfect match, 0.0 = no relevant overlap.
- reason: one short sentence citing the most relevant signal.
- Be honest. Do not inflate.
"""


class JobDiscovery:
    def __init__(self, model_router: ModelRouter | None = None) -> None:
        self.model_router = model_router or ModelRouter()

    def _fetch_adzuna(
        self, query: str, location: str, results: int = 20
    ) -> list[dict]:
        try:
            response = httpx.get(
                ADZUNA_URL,
                params={
                    "app_id": settings.ADZUNA_APP_ID,
                    "app_key": settings.ADZUNA_APP_KEY,
                    "results_per_page": results,
                    "what": query,
                    "where": location,
                    "content-type": "application/json",
                },
                timeout=20,
            )
            response.raise_for_status()
            return response.json().get("results", []) or []
        except Exception as exc:
            print(f"[job_discovery] adzuna fetch failed: {exc}")
            return []

    def _fetch_remotive(self, query: str) -> list[dict]:
        results = []
        try:
            response = httpx.get(
                REMOTIVE_URL,
                params={"search": query, "limit": 20},
                timeout=20,
            )
            response.raise_for_status()
            results = response.json().get("jobs", []) or []
        except Exception as exc:
            print(f"[job_discovery] remotive fetch failed: {exc}")

        web3_keywords = [
            "blockchain", "web3", "solidity", "defi",
            "crypto", "zkp", "zk engineer", "protocol",
        ]
        query_lower = query.lower()
        is_web3_query = any(k in query_lower for k in web3_keywords)

        if is_web3_query and len(results) < 5:
            try:
                response2 = httpx.get(
                    REMOTIVE_URL,
                    params={"search": "blockchain developer", "limit": 20},
                    timeout=20,
                )
                response2.raise_for_status()
                extra = response2.json().get("jobs", []) or []
                existing_ids = {str(r.get("id")) for r in results}
                for job in extra:
                    if str(job.get("id")) not in existing_ids:
                        results.append(job)
            except Exception as exc:
                print(
                    f"[job_discovery] remotive web3 fallback failed: {exc}"
                )

        return results

    def _fetch_wellfound(self, query: str) -> list[dict]:
        """Wellfound (AngelList) has no public API. Placeholder for a
        future scraping approach. Returns empty list for now."""
        return []

    def _fetch_cutshort(self, query: str) -> list[dict]:
        """Cutshort has no public API. Placeholder for a future scraping
        approach. Returns empty list for now."""
        return []

    @staticmethod
    def _normalize_adzuna(raw: dict) -> JobListing:
        company = (raw.get("company") or {}).get("display_name", "")
        loc = (raw.get("location") or {}).get("display_name", "")
        return JobListing(
            job_id=str(raw.get("id", "")),
            title=raw.get("title", ""),
            company=company,
            location=loc,
            description=(raw.get("description", "") or "")[:500],
            url=raw.get("redirect_url", ""),
            source="adzuna",
            salary_min=float(raw.get("salary_min", 0) or 0),
            salary_max=float(raw.get("salary_max", 0) or 0),
            posted_at=raw.get("created", "") or "",
        )

    @staticmethod
    def _normalize_remotive(raw: dict) -> JobListing:
        return JobListing(
            job_id=str(raw.get("id", "")),
            title=raw.get("title", ""),
            company=raw.get("company_name", ""),
            location=raw.get("candidate_required_location", "Remote") or "Remote",
            description=(raw.get("description", "") or "")[:500],
            url=raw.get("url", ""),
            source="remotive",
            posted_at=raw.get("publication_date", "") or "",
        )

    def discover(
        self,
        query: str,
        location: str,
        profile: UserProfile,
        max_results: int = 20,
    ) -> DiscoveredJobs:
        with ThreadPoolExecutor(max_workers=4) as pool:
            adzuna_future = pool.submit(self._fetch_adzuna, query, location)
            remotive_future = pool.submit(self._fetch_remotive, query)
            wellfound_future = pool.submit(self._fetch_wellfound, query)
            cutshort_future = pool.submit(self._fetch_cutshort, query)
            adzuna_raw = adzuna_future.result()
            remotive_raw = remotive_future.result()
            wellfound_future.result()
            cutshort_future.result()

        normalized: list[JobListing] = []
        for raw in adzuna_raw:
            try:
                normalized.append(self._normalize_adzuna(raw))
            except Exception as exc:
                print(f"[job_discovery] adzuna normalize failed: {exc}")
        for raw in remotive_raw:
            try:
                normalized.append(self._normalize_remotive(raw))
            except Exception as exc:
                print(f"[job_discovery] remotive normalize failed: {exc}")

        deduped: list[JobListing] = []
        seen_urls: set[str] = set()
        for job in normalized:
            if not job.url or job.url in seen_urls:
                continue
            seen_urls.add(job.url)
            deduped.append(job)

        deduped = deduped[:max_results]

        now = datetime.now(timezone.utc)

        if not deduped:
            return DiscoveredJobs(
                query=query,
                location=location,
                total_found=0,
                jobs=[],
                fetched_at=now,
            )

        try:
            self._score_jobs(deduped, profile)
        except Exception as exc:
            print(f"[job_discovery] scoring failed: {exc}")

        deduped.sort(key=lambda j: j.match_score, reverse=True)

        return DiscoveredJobs(
            query=query,
            location=location,
            total_found=len(deduped),
            jobs=deduped,
            fetched_at=now,
        )

    def _score_jobs(self, jobs: list[JobListing], profile: UserProfile) -> None:
        skills = ", ".join(profile.skills) if profile.skills else "none listed"
        lines = [f"Candidate skills: {skills}", "", "Jobs:"]
        for job in jobs:
            snippet = job.description[:200]
            lines.append(
                f"- job_id={job.job_id}; title={job.title}; company={job.company};\n"
                f"  description: {snippet}"
            )
        user_prompt = "\n".join(lines)

        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ]
        raw = self.model_router.call(
            "filter_jobs",
            messages,
            response_format={"type": "json_object"},
        )

        payload = self._extract_json(raw)
        data = json.loads(payload)
        scores = data.get("scores") if isinstance(data, dict) else None
        if not isinstance(scores, list):
            return

        score_map: dict[str, dict[str, Any]] = {}
        for entry in scores:
            if not isinstance(entry, dict):
                continue
            jid = str(entry.get("job_id", ""))
            if jid:
                score_map[jid] = entry

        for job in jobs:
            entry = score_map.get(job.job_id)
            if not entry:
                continue
            try:
                job.match_score = max(0.0, min(1.0, float(entry.get("score", 0))))
            except (TypeError, ValueError):
                job.match_score = 0.0
            job.match_reason = str(entry.get("reason", ""))

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
