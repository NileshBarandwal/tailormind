from datetime import datetime

from pydantic import BaseModel, Field


class ParsedJD(BaseModel):
    role_title: str
    required_skills: list[str] = Field(default_factory=list)
    preferred_skills: list[str] = Field(default_factory=list)
    experience_level: str
    responsibilities: list[str] = Field(default_factory=list)
    tech_stack: list[str] = Field(default_factory=list)
    culture_signals: list[str] = Field(default_factory=list)
    raw_text: str
    parsed_at: datetime


class CompanyBrief(BaseModel):
    company_name: str
    website: str
    mission: str = ""
    tech_stack: list[str] = Field(default_factory=list)
    culture_signals: list[str] = Field(default_factory=list)
    recent_news: list[str] = Field(default_factory=list)
    funding_stage: str = "unknown"
    employee_count: str = "unknown"
    scraped_urls: list[str] = Field(default_factory=list)
    researched_at: datetime


class ResearchReport(BaseModel):
    company_brief: CompanyBrief
    raw_chunks: list[str] = Field(default_factory=list)
    chunk_ids: list[str] = Field(default_factory=list)
    collection_name: str
