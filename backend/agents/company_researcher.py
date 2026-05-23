import asyncio
import json
import re
from datetime import datetime, timezone

import httpx
from bs4 import BeautifulSoup

from backend.core.model_router import ModelRouter
from backend.core.vector_store import VectorStore
from backend.models.schemas import CompanyBrief, ResearchReport


SYSTEM_PROMPT = """You are a company researcher. Build a structured brief about a company strictly from the research context provided.

Return a single JSON object with exactly these keys:
- company_name: string
- website: string
- mission: string (empty string if unknown)
- tech_stack: array of strings (empty if unknown)
- culture_signals: array of strings (empty if unknown)
- recent_news: array of strings (empty if unknown)
- funding_stage: string (use "unknown" if not present in context)
- employee_count: string (use "unknown" if not present in context)
- scraped_urls: array of strings (empty list; this will be filled in by the caller)

Rules:
- Return JSON only. No preamble, no commentary, no markdown code fences.
- Never invent facts. Use only what is present in the research context.
- If a field has no supporting evidence in the context, return the empty default ("" / [] / "unknown").
"""


class CompanyResearcher:
    def __init__(self) -> None:
        self.model_router = ModelRouter()
        self.vector_store = VectorStore()

    @staticmethod
    def _slugify(name: str) -> str:
        slug = re.sub(r"[^a-zA-Z0-9]+", "_", name.lower())
        return slug.strip("_")

    async def _scrape_urls(self, urls: list[str]) -> tuple[list[str], list[str]]:
        markdowns: list[str] = []
        successful: list[str] = []
        async with httpx.AsyncClient(
            timeout=30,
            follow_redirects=True,
            headers={"User-Agent": "Mozilla/5.0"},
        ) as client:
            for url in urls:
                try:
                    response = await client.get(url)
                    soup = BeautifulSoup(response.text, "html.parser")
                    md = soup.get_text(separator="\n", strip=True)
                    if md.strip():
                        markdowns.append(md)
                        successful.append(url)
                    else:
                        print(f"[company_researcher] empty content from {url}")
                except Exception as exc:
                    print(f"[company_researcher] crawl failed for {url}: {exc}")
        return markdowns, successful

    def research(self, company_name: str, website: str) -> ResearchReport:
        slug = self._slugify(company_name)
        collection_name = f"company_{slug}"

        base = website.rstrip("/")
        urls_to_try = [base, f"{base}/about", f"{base}/careers"]

        markdowns, scraped_urls = asyncio.run(self._scrape_urls(urls_to_try))

        combined = "\n\n".join(markdowns)
        raw_chunks = [c.strip() for c in combined.split("\n\n")]
        chunks = [c for c in raw_chunks if len(c) >= 50]
        chunks = chunks[:200]

        if not chunks:
            raise ValueError(f"No usable content scraped from {website}")

        chunk_ids = [f"{slug}_chunk_{i}" for i in range(len(chunks))]
        metadatas = [
            {"source": website, "company": company_name} for _ in chunks
        ]
        self.vector_store.add_chunks(collection_name, chunks, metadatas, chunk_ids)

        verified = self.vector_store.query(
            collection_name,
            "company mission technology culture funding team size",
            n_results=20,
        )
        context = "\n\n".join(r["text"] for r in verified)

        user_prompt = (
            f"Research context:\n{context}\n\n"
            f"Company: {company_name}\nWebsite: {website}"
        )

        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ]
        raw = self.model_router.call("research_company", messages)

        payload = self._extract_json(raw)
        try:
            data = json.loads(payload)
        except json.JSONDecodeError as exc:
            raise ValueError(
                f"Model did not return valid JSON for company research: {exc.msg}"
            ) from exc

        data["company_name"] = company_name
        data["website"] = website
        data["scraped_urls"] = scraped_urls
        data["researched_at"] = datetime.now(timezone.utc)

        brief = CompanyBrief(**data)

        return ResearchReport(
            company_brief=brief,
            raw_chunks=chunks,
            chunk_ids=chunk_ids,
            collection_name=collection_name,
        )

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
