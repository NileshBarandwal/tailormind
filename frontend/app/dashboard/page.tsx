"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  ApplicationCard,
  CompanyRoles,
  DiscoveredJobs,
  ExtractedRole,
  JobListing,
  MatchScore,
  SavedApplication,
  StructuredResume,
  TailoredCoverLetter,
  TailoredResume,
  UserProfile,
} from "@/types";
import {
  checkProfileExists,
  deleteApplication,
  discoverCompanyRoles,
  discoverJobs,
  exportCoverLetter,
  exportResume,
  generateApplicationCard,
  generateCoverLetter,
  generateResume,
  generateStructuredResumeStream,
  getProfile,
  listApplications,
  matchProfile,
  saveApplication,
  type GenerationEvent,
} from "@/lib/api";
import {
  jobKey,
  lsGet,
  lsSet,
  lsDel,
  JOB_KEYS,
  GLOBAL_KEYS,
  getActiveProfileId,
  setActiveProfileId,
} from "@/lib/persistence";
import ApplicationCardView from "@/components/ApplicationCardView";
import CoverLetterPreview from "@/components/CoverLetterPreview";
import InstructionPanel from "@/components/InstructionPanel";
import JobCard from "@/components/JobCard";
import LoadingSpinner from "@/components/LoadingSpinner";
import MatchScoreCard from "@/components/MatchScoreCard";
import GenerationProgress, {
  type ProgressStep,
} from "@/components/GenerationProgress";
import { classifyError } from "@/lib/errorMessage";
import ResumePreview from "@/components/ResumePreview";
import StructuredResumePreview from "@/components/StructuredResumePreview";
import ResumeVersionHistory from "@/components/ResumeVersionHistory";


const ROLE_PRESETS = [
  "AI Engineer",
  "Agent Engineer",
  "RAG Engineer",
  "Prompt Engineer",
  "LLM Engineer",
  "Forward Deployed",
  "MLOps Engineer",
  "Context Engineer",
  "ZK Engineer",
  "Blockchain Engineer",
  "Smart Contract Developer",
  "Web3 Engineer",
  "DeFi Engineer",
  "Protocol Engineer",
  "Full Stack Engineer",
  "Backend Engineer",
  "Frontend Engineer",
  "SDE",
  "Developer Relations",
  "AI Research Engineer",
];

const STATUS_BADGE: Record<string, string> = {
  draft: "bg-slate-200 text-slate-800",
  applied: "bg-blue-100 text-blue-800",
  interview: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

export default function DashboardPage() {
  const PROFILE_ID = getActiveProfileId() ?? "nbarandwal_gmail_com";
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileError, setProfileError] = useState("");

  const [query, setQuery] = useState("AI Engineer");
  const [location, setLocation] = useState("India");
  const [maxResults, setMaxResults] = useState(10);

  const [discovering, setDiscovering] = useState(false);
  const [discoverError, setDiscoverError] = useState("");
  const [results, setResults] = useState<DiscoveredJobs | null>(null);
  const [selectedJob, setSelectedJob] = useState<JobListing | null>(null);

  const [companyName, setCompanyName] = useState("");
  const [website, setWebsite] = useState("");
  const [companySearchUrl, setCompanySearchUrl] = useState("");
  const [jobUrl, setJobUrl] = useState("");
  const [instructions, setInstructions] = useState("");

  const generationRef = useRef<HTMLDivElement>(null);

  const [resume, setResume] = useState<TailoredResume | null>(null);
  const [coverLetter, setCoverLetter] = useState<TailoredCoverLetter | null>(null);
  const [card, setCard] = useState<ApplicationCard | null>(null);
  const [matchScore, setMatchScore] = useState<MatchScore | null>(null);

  const [resumeLoading, setResumeLoading] = useState(false);
  const [letterLoading, setLetterLoading] = useState(false);
  const [cardLoading, setCardLoading] = useState(false);

  const [resumeError, setResumeError] = useState("");
  const [coverLetterError, setCoverLetterError] = useState("");
  const [cardError, setCardError] = useState("");

  const [structuredResume, setStructuredResume] =
    useState<StructuredResume | null>(null);
  const [structuredLoading, setStructuredLoading] = useState(false);
  const [structuredError, setStructuredError] = useState("");

  const [restoredFrom, setRestoredFrom] = useState<{
    version_id: string;
    company_name: string;
    created_at: string;
  } | null>(null);

  const [versionRefreshKey, setVersionRefreshKey] = useState(0);
  const [versionSavedId, setVersionSavedId] = useState<string | null>(null);

  const GENERATION_STEPS = [
    "Parsing job description...",
    "Researching company...",
    "Matching your profile...",
    "Generating resume...",
  ];

  const [progressSteps, setProgressSteps] = useState<ProgressStep[]>(
    GENERATION_STEPS.map((label) => ({
      label,
      status: "waiting" as const,
    })),
  );

  const [exportingResume, setExportingResume] = useState(false);
  const [exportingLetter, setExportingLetter] = useState(false);
  const [resumeExportMsg, setResumeExportMsg] = useState<string>();
  const [letterExportMsg, setLetterExportMsg] = useState<string>();

  const [matchOpen, setMatchOpen] = useState(false);
  const [instructionsOpen, setInstructionsOpen] = useState(false);

  const [savedApps, setSavedApps] = useState<SavedApplication[]>([]);
  const [savingApp, setSavingApp] = useState(false);
  const [expandedAppId, setExpandedAppId] = useState<string | null>(null);

  const [targetOpen, setTargetOpen] = useState(false);
  const [targetCompany, setTargetCompany] = useState("");
  const [targetWebsite, setTargetWebsite] = useState("");
  const [targetLoading, setTargetLoading] = useState(false);
  const [targetError, setTargetError] = useState("");
  const [targetRoles, setTargetRoles] = useState<CompanyRoles | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      // First-run detection: check if any profile exists
      try {
        const { exists, profile_id } = await checkProfileExists();
        if (!exists) {
          router.replace("/onboarding");
          return;
        }
        if (profile_id) {
          const stored = getActiveProfileId();
          if (!stored) {
            setActiveProfileId(profile_id);
          }
        }
      } catch {
        // If check fails, proceed normally (don't block dashboard)
      }
      try {
        const data = await getProfile(PROFILE_ID);
        if (!cancelled) setProfile(data);
      } catch (e) {
        if (!cancelled) setProfileError(e instanceof Error ? e.message : "Failed");
      }
    }
    load();

    try {
      const cached = sessionStorage.getItem("tm_results");
      const cachedQuery = sessionStorage.getItem("tm_query");
      const cachedJob = sessionStorage.getItem("tm_selected_job");
      if (cached) setResults(JSON.parse(cached) as DiscoveredJobs);
      if (cachedQuery) setQuery(cachedQuery);
      if (cachedJob) setSelectedJob(JSON.parse(cachedJob) as JobListing);
    } catch (e) {
      console.error("Failed to restore session cache:", e);
    }

    // Restore global persisted state
    const savedInstructions = lsGet<string>(GLOBAL_KEYS.instructions);
    if (savedInstructions) setInstructions(savedInstructions);

    return () => {
      cancelled = true;
    };
  }, []);

  const loadSavedApps = useCallback(async () => {
    try {
      const apps = await listApplications(PROFILE_ID);
      setSavedApps(apps);
    } catch (e) {
      console.error("Failed to load saved applications:", e);
    }
  }, []);

  useEffect(() => {
    loadSavedApps();
  }, [loadSavedApps]);

  function buildJdText(job: JobListing | null = selectedJob): string {
    if (!job) return "";
    return `${job.title} at ${job.company}\n\n${job.description}`;
  }

  async function selectJob(job: JobListing, websiteOverride?: string) {
    setSelectedJob(job);
    setCompanyName(job.company);
    setWebsite("");
    const searchQuery = encodeURIComponent(
      `${job.company} official website careers`,
    );
    setCompanySearchUrl(
      `https://www.google.com/search?q=${searchQuery}`,
    );
    if (websiteOverride) {
      setWebsite(websiteOverride);
      setCompanySearchUrl("");
    }
    setJobUrl(job.url);
    setResume(null);
    setCoverLetter(null);
    setCard(null);
    setMatchScore(null);
    setResumeExportMsg(undefined);
    setLetterExportMsg(undefined);
    setResumeError("");
    setCoverLetterError("");
    setCardError("");
    setStructuredResume(null);
    setStructuredError("");

    // Restore persisted content for this job if it exists
    const k = jobKey(job.url);
    const savedResume = lsGet<StructuredResume>(
      JOB_KEYS.structuredResume(k)
    );
    const savedLetter = lsGet<TailoredCoverLetter>(
      JOB_KEYS.coverLetter(k)
    );
    const savedCard = lsGet<ApplicationCard>(JOB_KEYS.card(k));
    const savedCompany = lsGet<string>(JOB_KEYS.companyName(k));
    const savedWebsite = lsGet<string>(JOB_KEYS.website(k));

    if (savedResume) setStructuredResume(savedResume);
    if (savedLetter) setCoverLetter(savedLetter);
    if (savedCard) setCard(savedCard);
    if (savedCompany) setCompanyName(savedCompany);
    if (savedWebsite) setWebsite(savedWebsite);

    try {
      sessionStorage.setItem("tm_selected_job", JSON.stringify(job));
    } catch (e) {
      console.error("Failed to persist selected job:", e);
    }

    setTimeout(() => {
      generationRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 100);

    try {
      const score = await matchProfile(PROFILE_ID, buildJdText(job));
      setMatchScore(score);
    } catch (e) {
      console.error("Match failed:", e);
    }
  }

  async function refreshMatchScore() {
    if (!selectedJob) return;
    try {
      const score = await matchProfile(PROFILE_ID, buildJdText());
      setMatchScore(score);
    } catch (e) {
      console.error("Match refresh failed:", e);
    }
  }

  async function handleDiscover() {
    setDiscovering(true);
    setDiscoverError("");
    setResults(null);
    setSelectedJob(null);
    try {
      sessionStorage.removeItem("tm_results");
      sessionStorage.removeItem("tm_query");
      sessionStorage.removeItem("tm_selected_job");
    } catch (e) {
      console.error("Failed to clear session cache:", e);
    }
    try {
      const data = await discoverJobs(PROFILE_ID, query, location, maxResults);
      setResults(data);
      try {
        sessionStorage.setItem("tm_results", JSON.stringify(data));
        sessionStorage.setItem("tm_query", query);
      } catch (e) {
        console.error("Failed to persist results:", e);
      }
    } catch (e) {
      setDiscoverError(e instanceof Error ? e.message : "Discover failed");
    } finally {
      setDiscovering(false);
    }
  }

  async function handleGenerateResume() {
    if (!selectedJob) return;
    setResumeLoading(true);
    setResumeError("");
    try {
      const r = await generateResume(
        PROFILE_ID,
        buildJdText(),
        companyName,
        website,
        instructions,
      );
      setResume(r);
      refreshMatchScore();
    } catch (e) {
      setResumeError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setResumeLoading(false);
    }
  }

  async function handleGenerateCoverLetter() {
    if (!selectedJob) return;
    setLetterLoading(true);
    setCoverLetterError("");
    try {
      const l = await generateCoverLetter(
        PROFILE_ID,
        buildJdText(),
        companyName,
        website,
        instructions,
      );
      setCoverLetter(l);
      if (selectedJob?.url) {
        lsSet(JOB_KEYS.coverLetter(jobKey(selectedJob.url)), l);
      }
      refreshMatchScore();
    } catch (e) {
      setCoverLetterError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setLetterLoading(false);
    }
  }

  async function handleGenerateCard() {
    if (!selectedJob) return;
    setCardLoading(true);
    setCardError("");
    try {
      const c = await generateApplicationCard(
        PROFILE_ID,
        buildJdText(),
        companyName,
        website,
        jobUrl,
        instructions,
      );
      setCard(c);
      if (selectedJob?.url) {
        lsSet(JOB_KEYS.card(jobKey(selectedJob.url)), c);
      }
      refreshMatchScore();
    } catch (e) {
      setCardError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setCardLoading(false);
    }
  }

  async function handleGenerateStructuredResume() {
    if (!selectedJob) return;
    setRestoredFrom(null);
    setVersionSavedId(null);
    setStructuredLoading(true);
    setStructuredError("");
    setProgressSteps(
      GENERATION_STEPS.map((label) => ({ label, status: "waiting" as const })),
    );
    try {
      await generateStructuredResumeStream(
        PROFILE_ID,
        buildJdText(),
        companyName,
        website,
        instructions,
        (event: GenerationEvent) => {
          if (event.type === "progress") {
            setProgressSteps((prev) =>
              prev.map((s, i) => ({
                ...s,
                status:
                  i + 1 < event.step ? "done" :
                  i + 1 === event.step ? "active" : "waiting",
              })),
            );
          } else if (event.type === "done") {
            setProgressSteps((prev) =>
              prev.map((s) => ({ ...s, status: "done" as const })),
            );
            setStructuredResume(event.data);
            setVersionRefreshKey((k) => k + 1);
            if (event.version_id) {
              setVersionSavedId(event.version_id);
            }
            if (selectedJob?.url) {
              const k = jobKey(selectedJob.url);
              lsSet(JOB_KEYS.structuredResume(k), event.data);
              lsSet(JOB_KEYS.companyName(k), companyName);
              lsSet(JOB_KEYS.website(k), website);
            }
          } else if (event.type === "error") {
            setStructuredError(event.message);
            // Mark the currently active step as failed
            setProgressSteps((prev) =>
              prev.map((s) => ({
                ...s,
                status: s.status === "active" ? "failed" : s.status,
              })),
            );
          } else if (event.type === "warning") {
            // Non-fatal: show as yellow note, do not stop progress
            setStructuredError("⚠ " + event.message);
          }
        },
      );
    } catch (e) {
      setStructuredError(
        e instanceof Error ? e.message : "Generation failed",
      );
    } finally {
      setStructuredLoading(false);
    }
  }

  function handleRestore(
    resume: StructuredResume,
    meta: { version_id: string; company_name: string; created_at: string },
  ) {
    setStructuredResume(resume);
    setRestoredFrom(meta);
  }

  async function handleExportResume() {
    setExportingResume(true);
    setResumeExportMsg(undefined);
    try {
      const out = await exportResume(
        PROFILE_ID,
        buildJdText(),
        companyName,
        website,
        instructions,
      );
      setResumeExportMsg(`Saved to ${out.filename}`);
    } catch (e) {
      setResumeExportMsg(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExportingResume(false);
    }
  }

  async function handleExportCoverLetter() {
    setExportingLetter(true);
    setLetterExportMsg(undefined);
    try {
      const out = await exportCoverLetter(
        PROFILE_ID,
        buildJdText(),
        companyName,
        website,
        instructions,
      );
      setLetterExportMsg(`Saved to ${out.filename}`);
    } catch (e) {
      setLetterExportMsg(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExportingLetter(false);
    }
  }

  async function handleSaveApplication() {
    if (!selectedJob) return;
    setSavingApp(true);
    try {
      await saveApplication(PROFILE_ID, selectedJob);
      await loadSavedApps();
    } catch (e) {
      console.error("Save failed:", e);
    } finally {
      setSavingApp(false);
    }
  }

  async function handleDeleteApp(appId: string) {
    try {
      await deleteApplication(PROFILE_ID, appId);
      await loadSavedApps();
      if (expandedAppId === appId) setExpandedAppId(null);
    } catch (e) {
      console.error("Delete failed:", e);
    }
  }

  async function handleFindCompanyRoles() {
    const company = targetCompany.trim();
    const site = targetWebsite.trim();
    if (!company || !site) return;
    setTargetLoading(true);
    setTargetError("");
    setTargetRoles(null);
    try {
      const result = await discoverCompanyRoles(PROFILE_ID, company, site);
      setTargetRoles(result);
    } catch (e) {
      setTargetError(e instanceof Error ? e.message : "Failed to find roles");
    } finally {
      setTargetLoading(false);
    }
  }

  function selectTargetRole(role: ExtractedRole, index: number) {
    if (!targetRoles) return;
    const synthetic: JobListing = {
      job_id: `direct_${index}`,
      title: role.title,
      company: targetRoles.company_name,
      location: "See posting",
      description: role.description,
      url: role.url || targetRoles.website,
      source: "direct",
      salary_min: 0,
      salary_max: 0,
      posted_at: "",
      match_score: 0,
      match_reason: "",
    };
    selectJob(synthetic, targetRoles.website);
  }

  const canGenerate = !!selectedJob && !!companyName.trim();

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">TailorMind</h1>
        {profileError ? (
          <p className="text-sm text-red-600">Profile load failed: {profileError}</p>
        ) : profile ? (
          <p className="text-sm text-slate-600">Logged in as: {profile.full_name}</p>
        ) : (
          <p className="text-sm text-slate-500">Loading profile...</p>
        )}
      </header>

      <section className="rounded-lg border border-slate-200 bg-white">
        <button
          type="button"
          onClick={() => setTargetOpen((v) => !v)}
          className="flex w-full items-center justify-between p-4 text-left"
        >
          <h2 className="text-lg font-semibold">Target a company directly</h2>
          <span className="text-sm text-slate-500">{targetOpen ? "−" : "+"}</span>
        </button>
        {targetOpen && (
          <div className="space-y-3 border-t border-slate-200 p-4">
            <p className="text-sm text-slate-600">
              Skip the job boards. Paste any company name and website to scrape
              their careers page and surface open roles.
            </p>
            <div className="grid gap-2 md:grid-cols-[2fr_2fr_auto]">
              <input
                type="text"
                value={targetCompany}
                onChange={(e) => setTargetCompany(e.target.value)}
                placeholder="Company name (e.g. Sarvam AI)"
                className="rounded border border-slate-300 px-3 py-2 text-sm"
              />
              <input
                type="text"
                value={targetWebsite}
                onChange={(e) => setTargetWebsite(e.target.value)}
                placeholder="https://www.sarvam.ai"
                className="rounded border border-slate-300 px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={handleFindCompanyRoles}
                disabled={
                  targetLoading || !targetCompany.trim() || !targetWebsite.trim()
                }
                className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {targetLoading ? "Scraping..." : "Find open roles"}
              </button>
            </div>

            {targetError && <p className="text-sm text-red-600">{targetError}</p>}
            {targetLoading && (
              <LoadingSpinner message="Scraping careers page..." />
            )}

            {targetRoles && (
              <div className="space-y-2">
                <p className="text-sm text-slate-600">
                  Found {targetRoles.roles.length} role(s) at{" "}
                  {targetRoles.company_name}
                </p>
                {targetRoles.roles.length === 0 ? (
                  <p className="text-sm italic text-slate-500">
                    No open roles detected in the scraped content. The careers
                    page may use a JS-driven listing — try a different URL.
                  </p>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {targetRoles.roles.map((role, idx) => {
                      const hasGoodDescription =
                        role.description.length > 60 &&
                        !role.description.startsWith("Full Time") &&
                        !role.description.startsWith("Part Time") &&
                        !role.description.startsWith("Contract");
                      const snippet = hasGoodDescription
                        ? role.description.length > 200
                          ? `${role.description.slice(0, 200)}...`
                          : role.description
                        : role.requirements.length > 0
                        ? `Requirements: ${role.requirements.slice(0, 3).join(", ")}`
                        : null;
                      return (
                        <article
                          key={`${role.title}-${idx}`}
                          className="rounded-lg border border-slate-200 bg-white p-3"
                        >
                          <h3 className="text-sm font-semibold text-slate-900">
                            {role.title}
                          </h3>
                          {role.match_score > 0 && (
                            <span
                              className={`inline-block rounded px-2 py-0.5 text-xs font-bold mt-1 ${
                                role.match_score >= 0.7
                                  ? "bg-green-100 text-green-800"
                                  : role.match_score >= 0.5
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {Math.round(role.match_score * 100)}% match
                            </span>
                          )}
                          {role.match_reason && (
                            <p className="text-xs text-slate-500 mt-0.5 italic">
                              {role.match_reason}
                            </p>
                          )}
                          {snippet && (
                            <p className="mt-1 text-xs text-slate-700">
                              {snippet}
                            </p>
                          )}
                          {role.requirements.length > 0 && (
                            <ul className="mt-2 list-inside list-disc space-y-0.5 text-xs text-slate-600">
                              {role.requirements.slice(0, 4).map((r, i) => (
                                <li key={i}>{r}</li>
                              ))}
                            </ul>
                          )}
                          <button
                            type="button"
                            onClick={() => selectTargetRole(role, idx)}
                            className="mt-2 rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700"
                          >
                            Select this role
                          </button>
                        </article>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </section>

      <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-semibold">Discover jobs</h2>

        <div className="flex flex-wrap gap-2">
          {ROLE_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setQuery(preset)}
              className={`rounded border px-3 py-1 text-xs font-medium transition ${
                query === preset
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
              }`}
            >
              {preset}
            </button>
          ))}
        </div>

        <div className="grid gap-2 md:grid-cols-[2fr_1fr_auto_auto]">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Query"
            className="rounded border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Location"
            className="rounded border border-slate-300 px-3 py-2 text-sm"
          />
          <select
            value={maxResults}
            onChange={(e) => setMaxResults(Number(e.target.value))}
            className="rounded border border-slate-300 px-3 py-2 text-sm"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
          </select>
          <button
            type="button"
            onClick={handleDiscover}
            disabled={discovering}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {discovering ? "Discovering..." : "Discover Jobs"}
          </button>
        </div>

        {discoverError && <p className="text-sm text-red-600">{discoverError}</p>}
        {discovering && <LoadingSpinner message="Fetching jobs..." />}

        {results && (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              Found {results.total_found} jobs for &ldquo;{results.query}&rdquo;
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              {results.jobs.map((job) => (
                <JobCard
                  key={`${job.source}:${job.job_id}`}
                  job={job}
                  onSelect={selectJob}
                  selected={selectedJob?.url === job.url}
                />
              ))}
            </div>
          </div>
        )}

        {selectedJob && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-base font-semibold text-blue-900">
                {selectedJob.title} at {selectedJob.company}
              </h3>
              <button
                type="button"
                onClick={handleSaveApplication}
                disabled={savingApp}
                className="rounded bg-slate-900 px-3 py-1 text-xs font-medium text-white hover:bg-slate-700 disabled:opacity-50"
              >
                {savingApp ? "Saving..." : "Save this application"}
              </button>
            </div>
            <p className="mt-2 max-h-48 overflow-y-auto whitespace-pre-wrap text-sm text-slate-800">
              {selectedJob.description}
            </p>
          </div>
        )}
      </section>

      {selectedJob && (
        <section
          ref={generationRef}
          className="space-y-4 rounded-lg border border-slate-200 bg-white p-4"
        >
          <div className="flex items-center gap-2 text-sm text-blue-700 bg-blue-50 rounded px-3 py-2">
            <span>⚡</span>
            <span>
              Generating for: <strong>{selectedJob.title}</strong> at{" "}
              <strong>{selectedJob.company}</strong>
            </span>
            <button
              type="button"
              onClick={() => {
                if (selectedJob?.url) {
                  const k = jobKey(selectedJob.url);
                  lsDel(JOB_KEYS.structuredResume(k));
                  lsDel(JOB_KEYS.coverLetter(k));
                  lsDel(JOB_KEYS.card(k));
                  lsDel(JOB_KEYS.companyName(k));
                  lsDel(JOB_KEYS.website(k));
                }
                setSelectedJob(null);
                try {
                  sessionStorage.removeItem("tm_selected_job");
                } catch (e) {
                  console.error("Failed to clear selected job:", e);
                }
              }}
              className="ml-auto text-slate-500 hover:text-slate-700 text-xs"
            >
              ✕ Clear
            </button>
          </div>

          <h2 className="text-lg font-semibold">Generate application</h2>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-sm">
              <span className="block text-slate-700">Company name</span>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="text-sm">
              <span className="block text-slate-700">
                Company website (optional — used for deeper research)
              </span>
              <input
                type="text"
                value={website}
                onChange={(e) => {
                  setWebsite(e.target.value);
                  if (e.target.value) setCompanySearchUrl("");
                }}
                placeholder="https://..."
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
              />
              {companySearchUrl && !website && (
                <p className="text-xs text-slate-500 mt-1">
                  Add website for deeper company research (optional).{" "}
                  <a
                    href={companySearchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline hover:text-blue-800"
                  >
                    Find {companyName} website →
                  </a>
                </p>
              )}
            </label>
            <label className="text-sm md:col-span-2">
              <span className="block text-slate-700">Job URL</span>
              <input
                type="text"
                value={jobUrl}
                onChange={(e) => setJobUrl(e.target.value)}
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="text-sm md:col-span-2">
              <span className="block text-slate-700">Any specific instructions?</span>
              <textarea
                value={instructions}
                onChange={(e) => {
                  setInstructions(e.target.value);
                  lsSet(GLOBAL_KEYS.instructions, e.target.value);
                }}
                rows={3}
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
              />
            </label>
          </div>

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <button
                type="button"
                onClick={handleGenerateStructuredResume}
                disabled={!canGenerate || structuredLoading}
                className="w-full rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {structuredLoading ? "Composing..." : "New Resume ✦"}
              </button>
            </div>
            <div className="space-y-1">
              <button
                type="button"
                onClick={handleGenerateResume}
                disabled={!canGenerate || resumeLoading}
                className="w-full rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {resumeLoading ? "Generating..." : "Generate Resume"}
              </button>
              {resumeError && (() => {
                const ei = classifyError(resumeError);
                return (
                  <div className="mt-1 text-xs">
                    <span className="text-red-600">{ei.message} {ei.hint}</span>
                    {ei.canRetry && (
                      <button
                        onClick={handleGenerateResume}
                        className="ml-2 text-red-600 underline font-medium"
                      >
                        Try again
                      </button>
                    )}
                  </div>
                );
              })()}
            </div>
            <div className="space-y-1">
              <button
                type="button"
                onClick={handleGenerateCoverLetter}
                disabled={!canGenerate || letterLoading}
                className="w-full rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {letterLoading ? "Generating..." : "Generate Cover Letter"}
              </button>
              {coverLetterError && (() => {
                const ei = classifyError(coverLetterError);
                return (
                  <div className="mt-1 text-xs">
                    <span className="text-red-600">{ei.message} {ei.hint}</span>
                    {ei.canRetry && (
                      <button
                        onClick={handleGenerateCoverLetter}
                        className="ml-2 text-red-600 underline font-medium"
                      >
                        Try again
                      </button>
                    )}
                  </div>
                );
              })()}
            </div>
            <div className="space-y-1">
              <button
                type="button"
                onClick={handleGenerateCard}
                disabled={!canGenerate || cardLoading}
                className="w-full rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {cardLoading ? "Generating..." : "Generate Card"}
              </button>
              {cardError && (() => {
                const ei = classifyError(cardError);
                return (
                  <div className="mt-1 text-xs">
                    <span className="text-red-600">{ei.message} {ei.hint}</span>
                    {ei.canRetry && (
                      <button
                        onClick={handleGenerateCard}
                        className="ml-2 text-red-600 underline font-medium"
                      >
                        Try again
                      </button>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>

          {matchScore && (
            <div className="rounded-lg border border-slate-200 bg-white">
              <button
                type="button"
                onClick={() => setMatchOpen((v) => !v)}
                className="flex w-full items-center justify-between p-3 text-left"
              >
                <h3 className="text-base font-semibold">Match Analysis</h3>
                <span className="text-sm text-slate-500">{matchOpen ? "−" : "+"}</span>
              </button>
              {matchOpen && (
                <div className="border-t border-slate-200 p-3">
                  <MatchScoreCard score={matchScore} />
                </div>
              )}
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            {resume && (
              <ResumePreview
                resume={resume}
                onExport={handleExportResume}
                exporting={exportingResume}
                exportResult={resumeExportMsg}
              />
            )}
            {coverLetter && (
              <CoverLetterPreview
                letter={coverLetter}
                onExport={handleExportCoverLetter}
                exporting={exportingLetter}
                exportResult={letterExportMsg}
              />
            )}
          </div>

          {card && (
            <div>
              <h3 className="mb-2 text-lg font-semibold">Application Intelligence Card</h3>
              <ApplicationCardView card={card} />
            </div>
          )}

          {structuredLoading && (
            <GenerationProgress steps={progressSteps} />
          )}
          {!structuredLoading && structuredError && (
            <GenerationProgress
              steps={progressSteps}
              error={structuredError}
              onRetry={handleGenerateStructuredResume}
            />
          )}
          {structuredResume && (
            <div className="mt-4 space-y-2">
              {restoredFrom && (
                <div style={{
                  padding: "8px 14px", borderRadius: 6, marginBottom: 8,
                  background: "#eff6ff", border: "1px solid #bfdbfe",
                  display: "flex", alignItems: "center",
                  justifyContent: "space-between",
                  fontSize: 12, color: "#1d4ed8",
                }}>
                  <span>
                    Working draft restored from{" "}
                    <strong>{restoredFrom.company_name}</strong>
                    {" · "}
                    {new Date(restoredFrom.created_at).toLocaleDateString()}
                    {" · "}
                    <em>Not saved</em>
                  </span>
                  <button
                    onClick={() => setRestoredFrom(null)}
                    style={{
                      background: "none", border: "none",
                      cursor: "pointer", color: "#93c5fd", fontSize: 13,
                    }}
                  >
                    ✕
                  </button>
                </div>
              )}
              {versionSavedId && !restoredFrom && (
                <div style={{
                  padding: "8px 14px", borderRadius: 6, marginBottom: 8,
                  background: "#f0fdf4", border: "1px solid #bbf7d0",
                  display: "flex", alignItems: "center",
                  justifyContent: "space-between",
                  fontSize: 12, color: "#15803d",
                }}>
                  <span>✓ Version saved</span>
                  <button
                    onClick={() => setVersionSavedId(null)}
                    style={{
                      background: "none", border: "none",
                      cursor: "pointer", color: "#86efac", fontSize: 13,
                    }}
                  >
                    ✕
                  </button>
                </div>
              )}
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold">Resume Preview</h3>
                <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800 font-medium">
                  WYSIWYG
                </span>
              </div>
              <StructuredResumePreview resume={structuredResume} />
            </div>
          )}

          <div className="mt-3">
            <ResumeVersionHistory
              profileId={PROFILE_ID}
              onRestore={handleRestore}
              refreshKey={versionRefreshKey}
            />
          </div>
        </section>
      )}

      <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-semibold">Saved applications</h2>
        {savedApps.length === 0 ? (
          <p className="text-sm italic text-slate-500">No saved applications yet.</p>
        ) : (
          <ul className="space-y-2">
            {savedApps.map((app) => {
              const badge = STATUS_BADGE[app.status] ?? STATUS_BADGE.draft;
              const expanded = expandedAppId === app.id;
              return (
                <li key={app.id} className="rounded border border-slate-200">
                  <div className="flex items-center justify-between gap-3 px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {app.job.title}
                      </p>
                      <p className="truncate text-xs text-slate-600">
                        {app.job.company} ·{" "}
                        {new Date(app.saved_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-medium ${badge}`}
                      >
                        {app.status}
                      </span>
                      <button
                        type="button"
                        onClick={() => setExpandedAppId(expanded ? null : app.id)}
                        className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-100"
                      >
                        {expanded ? "Hide" : "View"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteApp(app.id)}
                        className="rounded px-2 py-1 text-xs text-red-600 hover:text-red-800"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  {expanded && (
                    <div className="space-y-2 border-t border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                      <p>
                        <span className="font-medium text-slate-700">Location:</span>{" "}
                        {app.job.location || "—"}
                      </p>
                      <p>
                        <span className="font-medium text-slate-700">URL:</span>{" "}
                        <a
                          href={app.job.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          {app.job.url}
                        </a>
                      </p>
                      <p className="whitespace-pre-wrap text-slate-800">
                        {app.job.description}
                      </p>
                      {app.notes && (
                        <p>
                          <span className="font-medium text-slate-700">Notes:</span>{" "}
                          {app.notes}
                        </p>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white">
        <button
          type="button"
          onClick={() => setInstructionsOpen((v) => !v)}
          className="flex w-full items-center justify-between p-4 text-left"
        >
          <h2 className="text-lg font-semibold">Instructions</h2>
          <span className="text-sm text-slate-500">{instructionsOpen ? "−" : "+"}</span>
        </button>
        {instructionsOpen && (
          <div className="border-t border-slate-200 p-4">
            <InstructionPanel profileId={PROFILE_ID} />
          </div>
        )}
      </section>
    </div>
  );
}
