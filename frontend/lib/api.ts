import type {
  ApplicationCard,
  CompanyRoles,
  DiscoveredJobs,
  InstructionSet,
  JobListing,
  MatchScore,
  SavedApplication,
  TailoredCoverLetter,
  TailoredResume,
  UserProfile,
} from "@/types";

const API_BASE = "/api";

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `API error ${res.status}`);
  }
  return res.json();
}

export function getProfile(id: string): Promise<UserProfile> {
  return apiFetch<UserProfile>(`/profile/${id}`);
}

export function saveProfile(
  profile: UserProfile,
): Promise<{ status: string; profile_id: string }> {
  return apiFetch("/profile", {
    method: "POST",
    body: JSON.stringify(profile),
  });
}

export function matchProfile(
  profileId: string,
  jdText: string,
): Promise<MatchScore> {
  return apiFetch<MatchScore>("/match", {
    method: "POST",
    body: JSON.stringify({ profile_id: profileId, jd_text: jdText }),
  });
}

export function discoverJobs(
  profileId: string,
  query: string,
  location: string,
  maxResults: number,
): Promise<DiscoveredJobs> {
  return apiFetch<DiscoveredJobs>("/discover", {
    method: "POST",
    body: JSON.stringify({
      profile_id: profileId,
      query,
      location,
      max_results: maxResults,
    }),
  });
}

export function discoverCompanyRoles(
  profileId: string,
  companyName: string,
  website: string,
): Promise<CompanyRoles> {
  return apiFetch<CompanyRoles>("/discover/company", {
    method: "POST",
    body: JSON.stringify({
      profile_id: profileId,
      company_name: companyName,
      website,
    }),
  });
}

export function generateResume(
  profileId: string,
  jdText: string,
  companyName: string,
  website: string,
  instructions: string,
): Promise<TailoredResume> {
  return apiFetch<TailoredResume>("/generate/resume", {
    method: "POST",
    body: JSON.stringify({
      profile_id: profileId,
      jd_text: jdText,
      company_name: companyName,
      website,
      instructions,
    }),
  });
}

export function generateCoverLetter(
  profileId: string,
  jdText: string,
  companyName: string,
  website: string,
  instructions: string,
): Promise<TailoredCoverLetter> {
  return apiFetch<TailoredCoverLetter>("/generate/cover-letter", {
    method: "POST",
    body: JSON.stringify({
      profile_id: profileId,
      jd_text: jdText,
      company_name: companyName,
      website,
      instructions,
    }),
  });
}

export function generateApplicationCard(
  profileId: string,
  jdText: string,
  companyName: string,
  website: string,
  jobUrl: string,
  instructions: string,
): Promise<ApplicationCard> {
  return apiFetch<ApplicationCard>("/generate/application-card", {
    method: "POST",
    body: JSON.stringify({
      profile_id: profileId,
      jd_text: jdText,
      company_name: companyName,
      website,
      job_url: jobUrl,
      instructions,
    }),
  });
}

export function exportResume(
  profileId: string,
  jdText: string,
  companyName: string,
  website: string,
  instructions: string,
): Promise<{ pdf_path: string; filename: string }> {
  return apiFetch("/export/resume", {
    method: "POST",
    body: JSON.stringify({
      profile_id: profileId,
      jd_text: jdText,
      company_name: companyName,
      website,
      instructions,
    }),
  });
}

export function exportCoverLetter(
  profileId: string,
  jdText: string,
  companyName: string,
  website: string,
  instructions: string,
): Promise<{ pdf_path: string; filename: string }> {
  return apiFetch("/export/cover-letter", {
    method: "POST",
    body: JSON.stringify({
      profile_id: profileId,
      jd_text: jdText,
      company_name: companyName,
      website,
      instructions,
    }),
  });
}

export function getInstructions(profileId: string): Promise<InstructionSet> {
  return apiFetch<InstructionSet>(`/instructions/${profileId}`);
}

export function addPersistentInstruction(
  profileId: string,
  instruction: string,
): Promise<InstructionSet> {
  return apiFetch<InstructionSet>("/instructions/persistent", {
    method: "POST",
    body: JSON.stringify({ profile_id: profileId, instruction }),
  });
}

export function addPerJobInstruction(
  profileId: string,
  jobKey: string,
  instruction: string,
): Promise<InstructionSet> {
  return apiFetch<InstructionSet>("/instructions/per-job", {
    method: "POST",
    body: JSON.stringify({ profile_id: profileId, job_key: jobKey, instruction }),
  });
}

export function removePersistentInstruction(
  profileId: string,
  instruction: string,
): Promise<InstructionSet> {
  return apiFetch<InstructionSet>("/instructions/persistent", {
    method: "DELETE",
    body: JSON.stringify({ profile_id: profileId, instruction }),
  });
}

export function removePerJobInstruction(
  profileId: string,
  jobKey: string,
  instruction: string,
): Promise<InstructionSet> {
  return apiFetch<InstructionSet>("/instructions/per-job", {
    method: "DELETE",
    body: JSON.stringify({ profile_id: profileId, job_key: jobKey, instruction }),
  });
}

export function saveApplication(
  profileId: string,
  job: JobListing,
  notes: string = "",
): Promise<SavedApplication> {
  return apiFetch<SavedApplication>("/applications", {
    method: "POST",
    body: JSON.stringify({ profile_id: profileId, job, notes }),
  });
}

export function listApplications(profileId: string): Promise<SavedApplication[]> {
  return apiFetch<SavedApplication[]>(`/applications/${profileId}`);
}

export function getApplication(
  profileId: string,
  appId: string,
): Promise<SavedApplication> {
  return apiFetch<SavedApplication>(`/applications/${profileId}/${appId}`);
}

export function updateApplication(
  profileId: string,
  appId: string,
  updates: Partial<SavedApplication>,
): Promise<SavedApplication> {
  return apiFetch<SavedApplication>(`/applications/${profileId}/${appId}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
}

export function deleteApplication(
  profileId: string,
  appId: string,
): Promise<{ deleted: string }> {
  return apiFetch(`/applications/${profileId}/${appId}`, {
    method: "DELETE",
  });
}
