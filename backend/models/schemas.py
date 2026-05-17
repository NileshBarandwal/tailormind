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


class Experience(BaseModel):
    company: str
    role: str
    duration: str
    description: list[str] = Field(default_factory=list)
    tech_used: list[str] = Field(default_factory=list)


class Project(BaseModel):
    name: str
    description: str
    tech_used: list[str] = Field(default_factory=list)
    highlights: list[str] = Field(default_factory=list)
    url: str = ""


class Education(BaseModel):
    institution: str
    degree: str
    field: str
    year: int
    cgpa: float = 0.0


class UserProfile(BaseModel):
    full_name: str
    email: str
    phone: str = ""
    summary: str = ""
    skills: list[str] = Field(default_factory=list)
    experiences: list[Experience] = Field(default_factory=list)
    projects: list[Project] = Field(default_factory=list)
    education: list[Education] = Field(default_factory=list)
    certifications: list[str] = Field(default_factory=list)
    achievements: list[str] = Field(default_factory=list)
    preferences: dict = Field(default_factory=dict)
    created_at: datetime
    updated_at: datetime


class MatchScore(BaseModel):
    overall_score: float
    skill_score: float
    experience_score: float
    education_score: float
    rationale: str
    matched_skills: list[str] = Field(default_factory=list)
    missing_skills: list[str] = Field(default_factory=list)
    recommendations: list[str] = Field(default_factory=list)
