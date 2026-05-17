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
