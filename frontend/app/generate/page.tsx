"use client";

import { useState } from "react";
import type {
  ApplicationCard,
  StructuredResume,
  TailoredCoverLetter,
  TailoredResume,
} from "@/types";
import {
  exportCoverLetter,
  exportResume,
  generateApplicationCard,
  generateCoverLetter,
  generateResume,
  generateStructuredResume,
} from "@/lib/api";
import ApplicationCardView from "@/components/ApplicationCardView";
import CoverLetterPreview from "@/components/CoverLetterPreview";
import ResumePreview from "@/components/ResumePreview";
import StructuredResumePreview from "@/components/StructuredResumePreview";

const PROFILE_ID = "nbarandwal_gmail_com";

export default function GeneratePage() {
  const [jdText, setJdText] = useState("");
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
  const [resumeError, setResumeError] = useState("");
  const [coverLetterError, setCoverLetterError] = useState("");
  const [cardError, setCardError] = useState("");

  const [structuredResume, setStructuredResume] =
    useState<StructuredResume | null>(null);
  const [structuredLoading, setStructuredLoading] = useState(false);
  const [structuredError, setStructuredError] = useState("");

  const [exportingResume, setExportingResume] = useState(false);
  const [exportingLetter, setExportingLetter] = useState(false);
  const [resumeExportMsg, setResumeExportMsg] = useState<string>();
  const [letterExportMsg, setLetterExportMsg] = useState<string>();

  const canGenerate =
    jdText.trim().length >= 50 && companyName.trim() && website.trim();

  async function handleGenerateResume() {
    setResumeLoading(true);
    setResumeError("");
    try {
      setResume(
        await generateResume(PROFILE_ID, jdText, companyName, website, instructions),
      );
    } catch (e) {
      setResumeError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setResumeLoading(false);
    }
  }

  async function handleGenerateCoverLetter() {
    setLetterLoading(true);
    setCoverLetterError("");
    try {
      setCoverLetter(
        await generateCoverLetter(
          PROFILE_ID,
          jdText,
          companyName,
          website,
          instructions,
        ),
      );
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
      setCard(
        await generateApplicationCard(
          PROFILE_ID,
          jdText,
          companyName,
          website,
          jobUrl,
          instructions,
        ),
      );
    } catch (e) {
      setCardError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setCardLoading(false);
    }
  }

  async function handleGenerateStructuredResume() {
    setStructuredLoading(true);
    setStructuredError("");
    setStructuredResume(null);
    try {
      const r = await generateStructuredResume(
        PROFILE_ID, jdText, companyName, website, instructions);
      setStructuredResume(r);
    } catch (e) {
      setStructuredError(
        e instanceof Error ? e.message : "Generation failed");
    } finally {
      setStructuredLoading(false);
    }
  }

  async function handleExportResume() {
    setExportingResume(true);
    setResumeExportMsg(undefined);
    try {
      const out = await exportResume(
        PROFILE_ID,
        jdText,
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
        jdText,
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
          <label className="text-sm md:col-span-2">
            <span className="block text-slate-700">Instructions</span>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
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
            {structuredError && (
              <p className="text-xs text-red-600">{structuredError}</p>
            )}
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
            {resumeError && <p className="text-xs text-red-600">{resumeError}</p>}
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
            {coverLetterError && (
              <p className="text-xs text-red-600">{coverLetterError}</p>
            )}
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
            {cardError && <p className="text-xs text-red-600">{cardError}</p>}
          </div>
        </div>
      </section>

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
        <section>
          <h2 className="mb-2 text-lg font-semibold">Application Intelligence Card</h2>
          <ApplicationCardView card={card} />
        </section>
      )}

      {structuredResume && (
        <div className="mt-4 space-y-2">
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
