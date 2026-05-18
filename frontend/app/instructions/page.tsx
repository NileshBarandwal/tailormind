"use client";

import InstructionPanel from "@/components/InstructionPanel";
import { getActiveProfileId } from "@/lib/persistence";

export default function InstructionsPage() {
  const PROFILE_ID = getActiveProfileId() ?? "nbarandwal_gmail_com";
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Manage Instructions</h1>
        <p className="text-sm text-slate-600">Profile: {PROFILE_ID}</p>
      </header>

      <section className="space-y-2 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700">
        <p>
          <strong>Persistent instructions</strong> apply to every generation for this
          profile (e.g. &ldquo;keep resume to one page&rdquo;).
        </p>
        <p>
          <strong>Per-job instructions</strong> apply only to a specific job, keyed by
          a job identifier of your choosing (e.g. &ldquo;anthropic-ai-eng&rdquo;).
        </p>
      </section>

      <InstructionPanel profileId={PROFILE_ID} />
    </div>
  );
}
