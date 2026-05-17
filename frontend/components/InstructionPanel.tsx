"use client";

import { useEffect, useState } from "react";
import type { InstructionSet } from "@/types";
import {
  addPerJobInstruction,
  addPersistentInstruction,
  getInstructions,
  removePerJobInstruction,
  removePersistentInstruction,
} from "@/lib/api";
import LoadingSpinner from "./LoadingSpinner";

interface InstructionPanelProps {
  profileId: string;
}

export default function InstructionPanel({ profileId }: InstructionPanelProps) {
  const [instructions, setInstructions] = useState<InstructionSet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [newPersistent, setNewPersistent] = useState("");
  const [newJobKey, setNewJobKey] = useState("");
  const [newJobInstruction, setNewJobInstruction] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const data = await getInstructions(profileId);
        if (!cancelled) setInstructions(data);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [profileId]);

  async function handleAddPersistent() {
    const text = newPersistent.trim();
    if (!text) return;
    try {
      const updated = await addPersistentInstruction(profileId, text);
      setInstructions(updated);
      setNewPersistent("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Add failed");
    }
  }

  async function handleRemovePersistent(instruction: string) {
    try {
      const updated = await removePersistentInstruction(profileId, instruction);
      setInstructions(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Remove failed");
    }
  }

  async function handleAddPerJob() {
    const key = newJobKey.trim();
    const text = newJobInstruction.trim();
    if (!key || !text) return;
    try {
      const updated = await addPerJobInstruction(profileId, key, text);
      setInstructions(updated);
      setNewJobInstruction("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Add failed");
    }
  }

  async function handleRemovePerJob(jobKey: string, instruction: string) {
    try {
      const updated = await removePerJobInstruction(profileId, jobKey, instruction);
      setInstructions(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Remove failed");
    }
  }

  if (loading) return <LoadingSpinner message="Loading instructions..." />;
  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!instructions) return null;

  const perJobKeys = Object.keys(instructions.per_job);

  return (
    <div className="space-y-6">
      <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
        <h3 className="text-base font-semibold text-slate-900">Persistent instructions</h3>
        <ul className="space-y-2">
          {instructions.persistent.length === 0 && (
            <li className="text-sm italic text-slate-500">None added yet.</li>
          )}
          {instructions.persistent.map((p) => (
            <li
              key={p}
              className="flex items-center justify-between gap-3 rounded border border-slate-200 px-3 py-1.5 text-sm"
            >
              <span className="text-slate-800">{p}</span>
              <button
                type="button"
                onClick={() => handleRemovePersistent(p)}
                className="text-xs text-red-600 hover:text-red-800"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
        <div className="flex gap-2">
          <input
            type="text"
            value={newPersistent}
            onChange={(e) => setNewPersistent(e.target.value)}
            placeholder="e.g. Keep resume to one page"
            className="flex-1 rounded border border-slate-300 px-3 py-1.5 text-sm"
          />
          <button
            type="button"
            onClick={handleAddPersistent}
            className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            Add
          </button>
        </div>
      </section>

      <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
        <h3 className="text-base font-semibold text-slate-900">Per-job instructions</h3>
        {perJobKeys.length === 0 && (
          <p className="text-sm italic text-slate-500">No per-job instructions yet.</p>
        )}
        {perJobKeys.map((key) => (
          <div key={key} className="rounded border border-slate-200 p-3">
            <p className="text-sm font-medium text-slate-700">Job: {key}</p>
            <ul className="mt-1 space-y-1">
              {instructions.per_job[key].map((p) => (
                <li
                  key={p}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <span className="text-slate-800">{p}</span>
                  <button
                    type="button"
                    onClick={() => handleRemovePerJob(key, p)}
                    className="text-xs text-red-600 hover:text-red-800"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div className="grid gap-2 md:grid-cols-[1fr_2fr_auto]">
          <input
            type="text"
            value={newJobKey}
            onChange={(e) => setNewJobKey(e.target.value)}
            placeholder="Job key (e.g. anthropic-ai-eng)"
            className="rounded border border-slate-300 px-3 py-1.5 text-sm"
          />
          <input
            type="text"
            value={newJobInstruction}
            onChange={(e) => setNewJobInstruction(e.target.value)}
            placeholder="Instruction for this job"
            className="rounded border border-slate-300 px-3 py-1.5 text-sm"
          />
          <button
            type="button"
            onClick={handleAddPerJob}
            className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            Add
          </button>
        </div>
      </section>
    </div>
  );
}
