import type {
  ApplicationCard,
  CompanyRoles,
  DiscoveredJobs,
  InstructionSet,
  JobListing,
  MatchScore,
  PoolProfile,
  SavedApplication,
  StructuredResume,
  TailoredCoverLetter,
  UserProfile,
  VersionInsights,
  VersionListItem,
  VersionOutcome,
  VersionSummary,
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

export function checkProfileExists(): Promise<{
  exists: boolean;
  profile_id: string | null;
}> {
  return apiFetch("/profile-exists");
}

export function submitOnboarding(payload: unknown): Promise<{
  status: string;
  profile_id: string;
}> {
  return apiFetch("/onboarding", {
    method: "POST",
    body: JSON.stringify(payload),
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

export function generateStructuredResume(
  profileId: string,
  jdText: string,
  companyName: string,
  website: string,
  instructions: string,
): Promise<StructuredResume> {
  return apiFetch<StructuredResume>("/generate/structured-resume", {
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

export interface GenerationProgressEvent {
  type: "progress";
  step: number;
  total: number;
  label: string;
}

export interface GenerationDoneEvent {
  type: "done";
  data: StructuredResume;
  version_id?: string;
}

export interface GenerationErrorEvent {
  type: "error";
  message: string;
}

export interface GenerationWarningEvent {
  type: "warning";
  message: string;
}

export type GenerationEvent =
  | GenerationProgressEvent
  | GenerationDoneEvent
  | GenerationErrorEvent
  | GenerationWarningEvent;

export async function generateStructuredResumeStream(
  profileId: string,
  jdText: string,
  companyName: string,
  website: string,
  instructions: string,
  onEvent: (event: GenerationEvent) => void,
): Promise<void> {
  const res = await fetch(`${API_BASE}/generate/structured-resume/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      profile_id: profileId,
      jd_text: jdText,
      company_name: companyName,
      website,
      instructions,
    }),
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.replace(/^data: /, "").trim();
      if (!trimmed) continue;
      try {
        const event = JSON.parse(trimmed) as GenerationEvent;
        onEvent(event);
      } catch {
        // skip malformed lines
      }
    }
  }
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

export function listVersions(
  profileId: string,
  limit = 20,
): Promise<VersionListItem[]> {
  return apiFetch(`/versions?profile_id=${profileId}&limit=${limit}`);
}

export function getVersionSummary(
  versionId: string,
  profileId: string,
): Promise<VersionSummary> {
  return apiFetch(
    `/versions/${versionId}/summary?profile_id=${profileId}`,
  );
}

export function getVersionResume(
  versionId: string,
  profileId: string,
): Promise<StructuredResume> {
  return apiFetch(
    `/versions/${versionId}/resume?profile_id=${profileId}`,
  );
}

export function updateVersionOutcome(
  versionId: string,
  profileId: string,
  payload: Partial<VersionOutcome>,
): Promise<VersionOutcome> {
  return apiFetch(
    `/versions/${versionId}/outcome?profile_id=${profileId}`,
    { method: "PATCH", body: JSON.stringify(payload) },
  );
}

export function getVersionInsights(
  profileId: string,
): Promise<VersionInsights> {
  return apiFetch(`/versions/insights?profile_id=${profileId}`);
}

export function deleteVersion(
  versionId: string,
  profileId: string,
): Promise<{ archived: string[] }> {
  return apiFetch(
    `/versions/${versionId}?profile_id=${profileId}`,
    { method: "DELETE" },
  );
}

export function getProfilePool(profileId: string): Promise<PoolProfile> {
  return apiFetch(`/profile/${profileId}/pool`);
}

export function updateProfilePool(
  profileId: string,
  payload: Omit<PoolProfile, "updated_at">,
): Promise<{ status: string; profile_id: string; updated_at: string }> {
  return apiFetch(`/profile/${profileId}/pool`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}
