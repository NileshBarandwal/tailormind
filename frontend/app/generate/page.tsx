"use client";

import { useEffect, useRef, useState } from "react";
import type {
  ApplicationCard,
  StructuredResume,
  TailoredCoverLetter,
} from "@/types";
import {
  generateApplicationCard,
  generateCoverLetter,
  generateStructuredResumeStream,
  type GenerationEvent,
} from "@/lib/api";
import {
  jobKey,
  lsGet,
  lsSet,
  JOB_KEYS,
} from "@/lib/persistence";
import ApplicationCardView from "@/components/ApplicationCardView";
import CoverLetterPreview from "@/components/CoverLetterPreview";
import GenerationProgress, {
  type ProgressStep,
} from "@/components/GenerationProgress";
import { classifyError } from "@/lib/errorMessage";
import StructuredResumePreview from "@/components/StructuredResumePreview";
import { getActiveProfileId } from "@/lib/persistence";
import {
  TAILORING_CHIPS,
  composeInstructions,
  restoreTailoring,
  saveTailoring,
  clearTailoring,
  completeTailoringMigration,
} from "@/lib/tailoring";

export default function GeneratePage() {
  const PROFILE_ID = getActiveProfileId() ?? "nbarandwal_gmail_com";
  const [jdText, setJdText] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [website, setWebsite] = useState("");
  const [jobUrl, setJobUrl] = useState("");

  const [selectedChips, setSelectedChips] = useState<Set<string>>(
    new Set<string>()
  );
  const [additionalInstructions, setAdditionalInstructions] = useState("");
  const [customEmphasis, setCustomEmphasis] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);

  const compiledInstructions = composeInstructions(
    selectedChips,
    additionalInstructions,
    customEmphasis,
  );

  const [coverLetter, setCoverLetter] = useState<TailoredCoverLetter | null>(null);
  const [card, setCard] = useState<ApplicationCard | null>(null);

  const [letterLoading, setLetterLoading] = useState(false);
  const [cardLoading, setCardLoading] = useState(false);
  const [coverLetterError, setCoverLetterError] = useState("");
  const [cardError, setCardError] = useState("");

  const [structuredResume, setStructuredResume] =
    useState<StructuredResume | null>(null);
  const [structuredLoading, setStructuredLoading] = useState(false);
  const [structuredError, setStructuredError] = useState("");

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


  const canGenerate =
    jdText.trim().length >= 50 && companyName.trim() && website.trim();

  const prevCompiledRef = useRef("");
  useEffect(() => {
    if (
      prevCompiledRef.current.trim() === "" &&
      compiledInstructions.trim() !== ""
    ) {
      setPreviewOpen(true);
    }
    prevCompiledRef.current = compiledInstructions;
  }, [compiledInstructions]);

  useEffect(() => {
    const tailoring = restoreTailoring();
    setSelectedChips(tailoring.chips);
    setAdditionalInstructions(tailoring.additional);
    setCustomEmphasis(tailoring.customEmphasis);
    const lastKey = lsGet<string>("tm_generate_last_key");
    if (lastKey) {
      const sr = lsGet<StructuredResume>(JOB_KEYS.structuredResume(lastKey));
      const cl = lsGet<TailoredCoverLetter>(JOB_KEYS.coverLetter(lastKey));
      const ca = lsGet<ApplicationCard>(JOB_KEYS.card(lastKey));
      const cn = lsGet<string>(JOB_KEYS.companyName(lastKey));
      const ws = lsGet<string>(JOB_KEYS.website(lastKey));
      if (sr) setStructuredResume(sr);
      if (cl) setCoverLetter(cl);
      if (ca) setCard(ca);
      if (cn) setCompanyName(cn);
      if (ws) setWebsite(ws);
    }
  }, []);

  function handleClearTailoring() {
    const empty = clearTailoring();
    setSelectedChips(empty.chips);
    setAdditionalInstructions(empty.additional);
    setCustomEmphasis(empty.customEmphasis);
    setPreviewOpen(false);
  }

  function handleChipToggle(key: string) {
    const next = new Set(selectedChips);
    if (next.has(key)) {
      next.delete(key);
      if (key === "custom") setCustomEmphasis("");
    } else {
      next.add(key);
    }
    setSelectedChips(next);
    saveTailoring({
      chips: next,
      additional: additionalInstructions,
      customEmphasis,
    });
  }

  async function handleGenerateCoverLetter() {
    setLetterLoading(true);
    setCoverLetterError("");
    try {
      const l = await generateCoverLetter(
        PROFILE_ID,
        jdText,
        companyName,
        website,
        compiledInstructions,
      );
      setCoverLetter(l);
      if (companyName) {
        const k = jobKey(companyName);
        lsSet("tm_generate_last_key", k);
        lsSet(JOB_KEYS.coverLetter(k), l);
        lsSet(JOB_KEYS.companyName(k), companyName);
        lsSet(JOB_KEYS.website(k), website);
      }
    } catch (e) {
      setCoverLetterError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setLetterLoading(false);
    }
  }

  async function handleGenerateCard() {
    setCardLoading(true);
    setCardError("");
    try {
      const c = await generateApplicationCard(
        PROFILE_ID,
        jdText,
        companyName,
        website,
        jobUrl,
        compiledInstructions,
      );
      setCard(c);
      if (companyName) {
        const k = jobKey(companyName);
        lsSet("tm_generate_last_key", k);
        lsSet(JOB_KEYS.card(k), c);
        lsSet(JOB_KEYS.companyName(k), companyName);
        lsSet(JOB_KEYS.website(k), website);
      }
    } catch (e) {
      setCardError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setCardLoading(false);
    }
  }

  async function handleGenerateStructuredResume() {
    setVersionSavedId(null);
    setStructuredLoading(true);
    setStructuredError("");
    setProgressSteps(
      GENERATION_STEPS.map((label) => ({ label, status: "waiting" as const })),
    );
    try {
      await generateStructuredResumeStream(
        PROFILE_ID,
        jdText,
        companyName,
        website,
        compiledInstructions,
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
            completeTailoringMigration();
            if (event.version_id) {
              setVersionSavedId(event.version_id);
            }
            if (companyName) {
              const k = jobKey(companyName);
              lsSet("tm_generate_last_key", k);
              lsSet(JOB_KEYS.structuredResume(k), event.data);
              lsSet(JOB_KEYS.companyName(k), companyName);
              lsSet(JOB_KEYS.website(k), website);
            }
          } else if (event.type === "error") {
            setStructuredError(event.message);
            setProgressSteps((prev) =>
              prev.map((s) => ({
                ...s,
                status: s.status === "active" ? "failed" : s.status,
              })),
            );
          } else if (event.type === "warning") {
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

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Generate Application</h1>
        <p className="text-sm text-slate-600">
          Paste a JD and company details to generate tailored documents.
        </p>
      </header>

      <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
        <label className="block text-sm">
          <span className="block text-slate-700">Job description</span>
          <textarea
            value={jdText}
            onChange={(e) => setJdText(e.target.value)}
            rows={10}
            placeholder="Paste job description"
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
          />
        </label>

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
              Company website (optional)
            </span>
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
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">
                Tailoring preferences
              </span>
              {(selectedChips.size > 0 ||
                additionalInstructions.trim() ||
                customEmphasis.trim()) && (
                <button
                  type="button"
                  onClick={handleClearTailoring}
                  className="text-xs text-slate-400 hover:text-slate-600 underline"
                >
                  Clear tailoring preferences
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {TAILORING_CHIPS.map((chip) => {
                const selected = selectedChips.has(chip.key);
                return (
                  <button
                    key={chip.key}
                    type="button"
                    onClick={() => handleChipToggle(chip.key)}
                    style={{
                      padding: "4px 12px",
                      borderRadius: 20,
                      fontSize: 12,
                      fontWeight: 500,
                      border: selected ? "1px solid #3b82f6" : "1px solid #cbd5e1",
                      background: selected ? "#eff6ff" : "white",
                      color: selected ? "#1d4ed8" : "#475569",
                      cursor: "pointer",
                      transition: "all 0.1s",
                    }}
                  >
                    {chip.label}
                  </button>
                );
              })}
            </div>

            {selectedChips.has("custom") && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 whitespace-nowrap">
                  Focus area:
                </span>
                <input
                  type="text"
                  value={customEmphasis}
                  onChange={(e) => {
                    setCustomEmphasis(e.target.value);
                    saveTailoring({
                      chips: selectedChips,
                      additional: additionalInstructions,
                      customEmphasis: e.target.value,
                    });
                  }}
                  placeholder="e.g. distributed systems, real-time ML"
                  className="flex-1 rounded border border-slate-300 px-3 py-1.5 text-sm"
                />
              </div>
            )}

            <div>
              <span className="block text-xs text-slate-500 mb-1">
                Additional instructions (optional)
              </span>
              <textarea
                value={additionalInstructions}
                onChange={(e) => {
                  setAdditionalInstructions(e.target.value);
                  saveTailoring({
                    chips: selectedChips,
                    additional: e.target.value,
                    customEmphasis,
                  });
                }}
                rows={2}
                placeholder="Any other instructions..."
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            {compiledInstructions.trim() && (
              <div>
                <button
                  type="button"
                  onClick={() => setPreviewOpen((v) => !v)}
                  className="text-xs text-slate-400 hover:text-slate-600
                    flex items-center gap-1"
                >
                  {previewOpen ? "▼" : "▶"} Compiled instruction
                </button>
                {previewOpen && (
                  <div
                    className="mt-1 rounded border border-slate-200 bg-slate-50
                      px-3 py-2 text-xs text-slate-600"
                    style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
                  >
                    {compiledInstructions}
                  </div>
                )}
              </div>
            )}
          </div>
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
              {cardLoading ? "Generating..." : "Generate Application Card"}
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
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {coverLetter && (
          <CoverLetterPreview letter={coverLetter} />
        )}
      </div>

      {card && (
        <section>
          <h2 className="mb-2 text-lg font-semibold">Application Intelligence Card</h2>
          <ApplicationCardView card={card} />
        </section>
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
          {versionSavedId && (
            <div style={{
              padding: "8px 14px", borderRadius: 6, marginBottom: 8,
              background: "#f0fdf4", border: "1px solid #bbf7d0",
              display: "flex", alignItems: "center",
              justifyContent: "space-between",
              fontSize: 12, color: "#15803d",
            }}>
              <span>✓ Resume version saved</span>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <a
                  href="/dashboard"
                  style={{
                    fontSize: 12, color: "#15803d", fontWeight: 600,
                    textDecoration: "underline", cursor: "pointer",
                  }}
                >
                  Open Dashboard →
                </a>
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
    </div>
  );
}
