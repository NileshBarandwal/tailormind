"use client";

import { useEffect, useState, type KeyboardEvent } from "react";
import type { UserProfile } from "@/types";
import { getProfile, saveProfile } from "@/lib/api";
import { getActiveProfileId } from "@/lib/persistence";
import LoadingSpinner from "@/components/LoadingSpinner";

export default function ProfilePage() {
  const PROFILE_ID = getActiveProfileId() ?? "nbarandwal_gmail_com";
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [summary, setSummary] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState("");

  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setLoadError("");
      try {
        const data = await getProfile(PROFILE_ID);
        if (cancelled) return;
        setProfile(data);
        setFullName(data.full_name);
        setEmail(data.email);
        setPhone(data.phone);
        setSummary(data.summary);
        setSkills(data.skills);
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : "Failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  function addSkill() {
    const value = newSkill.trim();
    if (!value || skills.includes(value)) {
      setNewSkill("");
      return;
    }
    setSkills([...skills, value]);
    setNewSkill("");
  }

  function removeSkill(skill: string) {
    setSkills(skills.filter((s) => s !== skill));
  }

  function handleSkillKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      addSkill();
    }
  }

  async function handleSave() {
    if (!profile) return;
    setSaving(true);
    setSaveMessage("");
    const updated: UserProfile = {
      ...profile,
      full_name: fullName,
      email,
      phone,
      summary,
      skills,
      updated_at: new Date().toISOString(),
    };
    try {
      const result = await saveProfile(updated);
      setSaveMessage(`Saved as ${result.profile_id}`);
      setProfile(updated);
    } catch (e) {
      setSaveMessage(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingSpinner message="Loading profile..." />;
  if (loadError) return <p className="text-sm text-red-600">{loadError}</p>;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
        <p className="text-sm text-slate-600">
          Edit your top-level profile fields. Experiences, projects, and
          education are managed via the JSON file directly for now.
        </p>
      </header>

      <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-sm">
            <span className="block text-slate-700">Full name</span>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="block text-slate-700">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="block text-slate-700">Phone</span>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="text-sm md:col-span-2">
            <span className="block text-slate-700">Summary</span>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={4}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            />
          </label>
        </div>

        <div className="text-sm">
          <p className="text-slate-700">Skills</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {skills.map((s) => (
              <span
                key={s}
                className="flex items-center gap-1 rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-800"
              >
                {s}
                <button
                  type="button"
                  onClick={() => removeSkill(s)}
                  className="text-blue-700 hover:text-blue-900"
                  aria-label={`Remove ${s}`}
                >
                  ×
                </button>
              </span>
            ))}
            {skills.length === 0 && (
              <span className="text-xs italic text-slate-500">No skills yet.</span>
            )}
          </div>
          <div className="mt-2 flex gap-2">
            <input
              type="text"
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              onKeyDown={handleSkillKey}
              placeholder="Type a skill and press Enter"
              className="flex-1 rounded border border-slate-300 px-3 py-1.5 text-sm"
            />
            <button
              type="button"
              onClick={addSkill}
              className="rounded bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
            >
              Add
            </button>
          </div>
        </div>

        <div>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Profile"}
          </button>
          {saveMessage && (
            <p
              className={`mt-2 text-sm ${
                saveMessage.startsWith("Saved")
                  ? "text-green-700"
                  : "text-red-600"
              }`}
            >
              {saveMessage}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
