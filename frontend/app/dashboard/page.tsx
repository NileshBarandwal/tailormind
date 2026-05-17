"use client";

import { useEffect, useState } from "react";
import type {
  ApplicationCard,
  DiscoveredJobs,
  JobListing,
  TailoredCoverLetter,
  TailoredResume,
  UserProfile,
} from "@/types";
import {
  discoverJobs,
  exportCoverLetter,
  exportResume,
  generateApplicationCard,
  generateCoverLetter,
  generateResume,
  getProfile,
} from "@/lib/api";
import ApplicationCardView from "@/components/ApplicationCardView";
import CoverLetterPreview from "@/components/CoverLetterPreview";
import InstructionPanel from "@/components/InstructionPanel";
import JobCard from "@/components/JobCard";
import LoadingSpinner from "@/components/LoadingSpinner";
import ResumePreview from "@/components/ResumePreview";

const PROFILE_ID = "nbarandwal_gmail_com";

const ROLE_PRESETS = [
  "AI Engineer",
  "Agent Engineer",
  "RAG Engineer",
  "Prompt Engineer",
  "Forward Deployed",
  "Web3 Engineer",
  "Full Stack AI",
  "MLOps Engineer",
  "Context Engineer",
  "ZK Engineer",
  "Smart Contract",
  "Developer Relations",
];

export default function DashboardPage() {
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
  const [jobUrl, setJobUrl] = useState("");
  const [instructions, setInstructions] = useState("");

  const [resume, setResume] = useState<TailoredResume | null>(null);
  const [coverLetter, setCoverLetter] = useState<TailoredCoverLetter | null>(null);
  const [card, setCard] = useState<ApplicationCard | null>(null);

  const [resumeLoading, setResumeLoading] = useState(false);
  const [letterLoading, setLetterLoading] = useState(false);
  const [cardLoading, setCardLoading] = useState(false);
  const [genError, setGenError] = useState("");

  const [exportingResume, setExportingResume] = useState(false);
  const [exportingLetter, setExportingLetter] = useState(false);
  const [resumeExportMsg, setResumeExportMsg] = useState<string>();
  const [letterExportMsg, setLetterExportMsg] = useState<string>();

  const [instructionsOpen, setInstructionsOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await getProfile(PROFILE_ID);
        if (!cancelled) setProfile(data);
      } catch (e) {
        if (!cancelled) setProfileError(e instanceof Error ? e.message : "Failed");
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  function selectJob(job: JobListing) {
    setSelectedJob(job);
    setCompanyName(job.company);
    setJobUrl(job.url);
    setResume(null);
    setCoverLetter(null);
    setCard(null);
    setResumeExportMsg(undefined);
    setLetterExportMsg(undefined);
  }

  async function handleDiscover() {
    setDiscovering(true);
    setDiscoverError("");
    setResults(null);
    setSelectedJob(null);
    try {
      const data = await discoverJobs(PROFILE_ID, query, location, maxResults);
      setResults(data);
    } catch (e) {
      setDiscoverError(e instanceof Error ? e.message : "Discover failed");
    } finally {
      setDiscovering(false);
    }
  }

  function buildJdText(): string {
    if (!selectedJob) return "";
    return `${selectedJob.title} at ${selectedJob.company}\n\n${selectedJob.description}`;
  }

  async function handleGenerateResume() {
    if (!selectedJob) return;
    setResumeLoading(true);
    setGenError("");
    try {
      const r = await generateResume(
        PROFILE_ID,
        buildJdText(),
        companyName,
        website,
        instructions,
      );
      setResume(r);
    } catch (e) {
      setGenError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setResumeLoading(false);
    }
  }

  async function handleGenerateCoverLetter() {
    if (!selectedJob) return;
    setLetterLoading(true);
    setGenError("");
    try {
      const l = await generateCoverLetter(
        PROFILE_ID,
        buildJdText(),
        companyName,
        website,
        instructions,
      );
      setCoverLetter(l);
    } catch (e) {
      setGenError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setLetterLoading(false);
    }
  }

  async function handleGenerateCard() {
    if (!selectedJob) return;
    setCardLoading(true);
    setGenError("");
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
    } catch (e) {
      setGenError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setCardLoading(false);
    }
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
            <h3 className="text-base font-semibold text-blue-900">
              {selectedJob.title} at {selectedJob.company}
            </h3>
            <p className="mt-2 max-h-48 overflow-y-auto whitespace-pre-wrap text-sm text-slate-800">
              {selectedJob.description}
            </p>
          </div>
        )}
      </section>

      {selectedJob && (
        <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
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
              <span className="block text-slate-700">Company website</span>
              <input
                type="text"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://..."
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
              />
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
                onChange={(e) => setInstructions(e.target.value)}
                rows={3}
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
              />
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleGenerateResume}
              disabled={!canGenerate || resumeLoading}
              className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {resumeLoading ? "Generating..." : "Generate Resume"}
            </button>
            <button
              type="button"
              onClick={handleGenerateCoverLetter}
              disabled={!canGenerate || letterLoading}
              className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {letterLoading ? "Generating..." : "Generate Cover Letter"}
            </button>
            <button
              type="button"
              onClick={handleGenerateCard}
              disabled={!canGenerate || cardLoading}
              className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {cardLoading ? "Generating..." : "Generate Card"}
            </button>
          </div>

          {genError && <p className="text-sm text-red-600">{genError}</p>}

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
        </section>
      )}

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
