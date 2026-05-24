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


class ResumeSection(BaseModel):
    title: str
    bullets: list[str] = Field(default_factory=list)
    order: int = 0


class TailoredResume(BaseModel):
    profile_name: str
    target_role: str
    summary: str
    sections: list[ResumeSection] = Field(default_factory=list)
    skills_highlighted: list[str] = Field(default_factory=list)
    jd_keywords_used: list[str] = Field(default_factory=list)
    generated_at: datetime


class TailoredCoverLetter(BaseModel):
    profile_name: str
    target_role: str
    company_name: str
    greeting: str
    paragraphs: list[str] = Field(default_factory=list)
    closing: str
    generated_at: datetime


class JobListing(BaseModel):
    job_id: str
    title: str
    company: str
    location: str
    description: str
    url: str
    source: str
    salary_min: float = 0.0
    salary_max: float = 0.0
    posted_at: str = ""
    match_score: float = 0.0
    match_reason: str = ""


class DiscoveredJobs(BaseModel):
    query: str
    location: str
    total_found: int
    jobs: list[JobListing] = Field(default_factory=list)
    fetched_at: datetime


class InstructionSet(BaseModel):
    profile_id: str
    persistent: list[str] = Field(default_factory=list)
    per_job: dict[str, list[str]] = Field(default_factory=dict)
    updated_at: datetime


class ApplicationCard(BaseModel):
    profile_name: str
    email: str
    phone: str
    github_url: str = ""
    linkedin_url: str = ""
    target_role: str
    company_name: str
    job_url: str = ""
    one_liner_pitch: str
    why_this_company: str
    why_this_role: str
    top_experiences: list[str] = Field(default_factory=list)
    key_skills_to_mention: list[str] = Field(default_factory=list)
    likely_questions: list[dict] = Field(default_factory=list)
    application_checklist: list[str] = Field(default_factory=list)
    generated_at: datetime


class SavedApplication(BaseModel):
    id: str
    profile_id: str
    job: JobListing
    resume: TailoredResume | None = None
    cover_letter: TailoredCoverLetter | None = None
    card: ApplicationCard | None = None
    notes: str = ""
    status: str = "draft"
    saved_at: datetime
    updated_at: datetime


class ExtractedRole(BaseModel):
    title: str
    description: str
    url: str = ""
    requirements: list[str] = Field(default_factory=list)
    match_score: float = 0.0
    match_reason: str = ""


class CompanyRoles(BaseModel):
    company_name: str
    website: str
    roles: list[ExtractedRole] = Field(default_factory=list)
    scraped_at: datetime


class StructuredContact(BaseModel):
    full_name: str
    email: str
    phone: str
    github_url: str = ""
    linkedin_url: str = ""
    iit_email: str = ""


class StructuredEducationRow(BaseModel):
    examination: str
    university: str
    institute: str
    year: int
    cgpa: str


class StructuredExperience(BaseModel):
    company: str
    role: str
    duration: str
    guide: str = ""
    bullets: list[str] = Field(default_factory=list)


class StructuredProject(BaseModel):
    name: str
    tech_stack: str
    bullets: list[str] = Field(default_factory=list)
    live_url: str = ""
    repo_url: str = ""
    context: str = ""
    guide: str = ""


class StructuredResume(BaseModel):
    contact: StructuredContact
    education: list[StructuredEducationRow] = Field(default_factory=list)
    skill_categories: dict[str, str] = Field(default_factory=dict)
    personal_projects: list[StructuredProject] = Field(default_factory=list)
    work_experience: list[StructuredExperience] = Field(default_factory=list)
    academic_projects: list[StructuredProject] = Field(default_factory=list)
    publications: list[str] = Field(default_factory=list)
    positions: list[str] = Field(default_factory=list)
    achievements: list[str] = Field(default_factory=list)
    target_role: str = ""
    jd_keywords_used: list[str] = Field(default_factory=list)
    generated_at: datetime


class OnboardingEducation(BaseModel):
    examination: str = ""
    university: str = ""
    institute: str = ""
    year: int = 2024
    cgpa: str = ""


class OnboardingExperience(BaseModel):
    company: str = ""
    role: str = ""
    duration: str = ""
    guide: str = ""
    bullets: list[str] = Field(default_factory=list)


class OnboardingProject(BaseModel):
    name: str = ""
    tech_stack: str = ""
    category: str = "personal"
    live_url: str = ""
    repo_url: str = ""
    bullets: list[str] = Field(default_factory=list)


class OnboardingRequest(BaseModel):
    full_name: str
    email: str
    phone: str = ""
    github_url: str = ""
    linkedin_url: str = ""
    iit_email: str = ""
    summary: str = ""
    education: list[OnboardingEducation] = Field(default_factory=list)
    skill_categories: dict[str, str] = Field(default_factory=dict)
    work_experience: list[OnboardingExperience] = Field(default_factory=list)
    projects: list[OnboardingProject] = Field(default_factory=list)


class VersionJDMeta(BaseModel):
    parser_version: str = "1.0"
    role_title: str = ""
    required_skills: list[str] = Field(default_factory=list)
    experience_level: str = ""


class VersionInput(BaseModel):
    jd_text: str = ""
    jd_meta: VersionJDMeta = Field(default_factory=VersionJDMeta)
    company_name: str = ""
    website: str = ""
    instructions: str = ""


class VersionSelectedSource(BaseModel):
    projects: list[str] = Field(default_factory=list)
    work: list[str] = Field(default_factory=list)
    academic: list[str] = Field(default_factory=list)


class VersionProfileSnapshot(BaseModel):
    profile_id: str
    profile_updated_at: str = ""
    selected_projects: list[str] = Field(default_factory=list)
    selected_work: list[str] = Field(default_factory=list)
    selected_academic: list[str] = Field(default_factory=list)
    skill_categories_used: list[str] = Field(default_factory=list)
    jd_keywords_matched: list[str] = Field(default_factory=list)
    selected_source: VersionSelectedSource = Field(
        default_factory=VersionSelectedSource
    )


class VersionExportMeta(BaseModel):
    html_exported: bool = False
    pdf_exported: bool = False
    latex_opened: bool = False


class VersionOutput(BaseModel):
    structured_resume: "StructuredResume"
    export: VersionExportMeta = Field(default_factory=VersionExportMeta)


class VersionObservability(BaseModel):
    target_role: str = ""
    model_used: str = ""
    fallback_triggered: bool = False
    generation_duration_ms: int = 0


class ResumeVersionGeneration(BaseModel):
    version_id: str
    profile_id: str
    created_at: str
    input: VersionInput = Field(default_factory=VersionInput)
    profile_snapshot: VersionProfileSnapshot
    output: VersionOutput
    observability: VersionObservability = Field(
        default_factory=VersionObservability
    )


class ResumeVersionOutcome(BaseModel):
    version_id: str
    profile_id: str
    status: str = "generated"
    applied_at: str | None = None
    last_updated: str = ""
    notes: str = ""


class VersionListItem(BaseModel):
    version_id: str
    profile_id: str
    company_name: str
    target_role: str
    created_at: str
    status: str
    model_used: str
    generation_duration_ms: int
    notes: str = ""


class VersionSummary(BaseModel):
    version_id: str
    company_name: str
    target_role: str
    created_at: str
    status: str
    selected_projects: list[str]


class VersionInsights(BaseModel):
    total_generated: int
    total_applied: int
    total_interview: int
    total_offer: int
    applied_rate: float
    interview_rate: float
    top_selected_projects: list[dict]
    role_distribution: list[dict]
    model_distribution: list[dict]


class PoolAcademicProject(BaseModel):
    name: str = ""
    context: str = ""
    guide: str = ""
    year: int = 2024
    tech_stack: str = ""
    bullets: list[str] = Field(default_factory=list)


class PoolUpdateRequest(BaseModel):
    full_name: str = ""
    email: str = ""
    phone: str = ""
    github_url: str = ""
    linkedin_url: str = ""
    iit_email: str = ""
    summary: str = ""
    education: list[OnboardingEducation] = Field(default_factory=list)
    skill_categories: dict[str, str] = Field(default_factory=dict)
    work_experience: list[OnboardingExperience] = Field(default_factory=list)
    projects: list[OnboardingProject] = Field(default_factory=list)
    academic_projects: list[PoolAcademicProject] = Field(default_factory=list)
    positions: list[str] = Field(default_factory=list)
