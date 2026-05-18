export interface Experience {
  company: string;
  role: string;
  duration: string;
  description: string[];
  tech_used: string[];
}

export interface Project {
  name: string;
  description: string;
  tech_used: string[];
  highlights: string[];
  url: string;
}

export interface Education {
  institution: string;
  degree: string;
  field: string;
  year: number;
  cgpa: number;
}

export interface UserProfile {
  full_name: string;
  email: string;
  phone: string;
  summary: string;
  skills: string[];
  experiences: Experience[];
  projects: Project[];
  education: Education[];
  certifications: string[];
  achievements: string[];
  preferences: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface MatchScore {
  overall_score: number;
  skill_score: number;
  experience_score: number;
  education_score: number;
  rationale: string;
  matched_skills: string[];
  missing_skills: string[];
  recommendations: string[];
}

export interface JobListing {
  job_id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  url: string;
  source: string;
  salary_min: number;
  salary_max: number;
  posted_at: string;
  match_score: number;
  match_reason: string;
}

export interface DiscoveredJobs {
  query: string;
  location: string;
  total_found: number;
  jobs: JobListing[];
  fetched_at: string;
}

export interface ResumeSection {
  title: string;
  bullets: string[];
  order: number;
}

export interface TailoredResume {
  profile_name: string;
  target_role: string;
  summary: string;
  sections: ResumeSection[];
  skills_highlighted: string[];
  jd_keywords_used: string[];
  generated_at: string;
}

export interface TailoredCoverLetter {
  profile_name: string;
  target_role: string;
  company_name: string;
  greeting: string;
  paragraphs: string[];
  closing: string;
  generated_at: string;
}

export interface ApplicationCard {
  profile_name: string;
  email: string;
  phone: string;
  github_url: string;
  linkedin_url: string;
  target_role: string;
  company_name: string;
  job_url: string;
  one_liner_pitch: string;
  why_this_company: string;
  why_this_role: string;
  top_experiences: string[];
  key_skills_to_mention: string[];
  likely_questions: Array<{ question: string; answer: string }>;
  application_checklist: string[];
  generated_at: string;
}

export interface InstructionSet {
  profile_id: string;
  persistent: string[];
  per_job: Record<string, string[]>;
  updated_at: string;
}

export interface SavedApplication {
  id: string;
  profile_id: string;
  job: JobListing;
  resume?: TailoredResume;
  cover_letter?: TailoredCoverLetter;
  card?: ApplicationCard;
  notes: string;
  status: string;
  saved_at: string;
  updated_at: string;
}

export interface ExtractedRole {
  title: string;
  description: string;
  url: string;
  requirements: string[];
  match_score: number;
  match_reason: string;
}

export interface CompanyRoles {
  company_name: string;
  website: string;
  roles: ExtractedRole[];
  scraped_at: string;
}

export interface StructuredContact {
  full_name: string;
  email: string;
  phone: string;
  github_url: string;
  linkedin_url: string;
  iit_email: string;
}

export interface StructuredEducationRow {
  examination: string;
  university: string;
  institute: string;
  year: number;
  cgpa: string;
}

export interface StructuredExperience {
  company: string;
  role: string;
  duration: string;
  guide: string;
  bullets: string[];
}

export interface StructuredProject {
  name: string;
  tech_stack: string;
  bullets: string[];
  live_url: string;
  repo_url: string;
  context: string;
  guide: string;
}

export interface StructuredResume {
  contact: StructuredContact;
  education: StructuredEducationRow[];
  skill_categories: Record<string, string>;
  personal_projects: StructuredProject[];
  work_experience: StructuredExperience[];
  academic_projects: StructuredProject[];
  publications: string[];
  positions: string[];
  achievements: string[];
  target_role: string;
  jd_keywords_used: string[];
  generated_at: string;
}
