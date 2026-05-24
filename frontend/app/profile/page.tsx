"use client";
import { useEffect, useState } from "react";
import type { PoolProfile } from "@/types";
import { getProfilePool, updateProfilePool } from "@/lib/api";
import { getActiveProfileId, lsGet, lsSet } from "@/lib/persistence";
import LoadingSpinner from "@/components/LoadingSpinner";
import ProfileCompleteness from "@/components/profile/ProfileCompleteness";
import BasicInfoSection from "@/components/profile/BasicInfoSection";
import ExperienceSection from "@/components/profile/ExperienceSection";
import ProjectsSection from "@/components/profile/ProjectsSection";
import AcademicProjectsSection from "@/components/profile/AcademicProjectsSection";
import EducationSection from "@/components/profile/EducationSection";
import SkillsSection from "@/components/profile/SkillsSection";
import PositionsSection from "@/components/profile/PositionsSection";

const SECTIONS_KEY = "tm_profile_sections_open";

const DEFAULT_OPEN: Record<string, boolean> = {
  experience: false,
  projects: false,
  academic: false,
  education: false,
  skills: false,
  positions: false,
};

const EDITABLE_FIELDS = [
  "full_name", "email", "phone", "github_url", "linkedin_url",
  "iit_email", "summary", "work_experience", "projects",
  "academic_projects", "education", "skill_categories", "positions",
] as const;

function getEditableSnapshot(p: PoolProfile): string {
  return JSON.stringify(
    EDITABLE_FIELDS.reduce((acc, k) => {
      (acc as Record<string, unknown>)[k] = p[k as keyof PoolProfile];
      return acc;
    }, {} as Partial<PoolProfile>)
  );
}

function computeCompleteness(pool: PoolProfile): number {
  let score = 0;
  if ((pool.work_experience?.length ?? 0) > 0) score += 25;
  if ((pool.projects?.length ?? 0) > 0) score += 25;
  if ((pool.education?.length ?? 0) > 0) score += 25;
  if (Object.keys(pool.skill_categories ?? {}).length > 0) score += 25;
  return score;
}

export default function ProfilePage() {
  const PROFILE_ID = getActiveProfileId() ?? "nbarandwal_gmail_com";
  const [pool, setPool] = useState<PoolProfile | null>(null);
  const [draft, setDraft] = useState<PoolProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<{
    ok: boolean; message: string; updatedAt?: string;
  } | null>(null);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(
    () => lsGet<Record<string, boolean>>(SECTIONS_KEY) ?? DEFAULT_OPEN
  );

  useEffect(() => {
    setLoading(true);
    setLoadError("");
    getProfilePool(PROFILE_ID)
      .then((data) => { setPool(data); setDraft(data); })
      .catch((e) => setLoadError(e instanceof Error ? e.message : "Failed"))
      .finally(() => setLoading(false));
  }, []);

  const isDirty =
    pool !== null &&
    draft !== null &&
    getEditableSnapshot(pool) !== getEditableSnapshot(draft);

  function toggleSection(key: string) {
    const updated = { ...openSections, [key]: !openSections[key] };
    setOpenSections(updated);
    lsSet(SECTIONS_KEY, updated);
  }

  function handleCancel() {
    setDraft(pool);
    setSaveResult(null);
  }

  async function handleSave() {
    if (!draft) return;
    setSaving(true);
    setSaveResult(null);
    try {
      const result = await updateProfilePool(PROFILE_ID, draft);
      const updated = { ...draft, updated_at: result.updated_at };
      setPool(updated);
      setDraft(updated);
      setSaveResult({ ok: true, message: "✓ Profile updated", updatedAt: result.updated_at });
    } catch (e) {
      setSaveResult({ ok: false, message: e instanceof Error ? e.message : "Save failed" });
    } finally {
      setSaving(false);
    }
  }

  function patchDraft(patch: Partial<PoolProfile>) {
    setDraft((d) => d ? { ...d, ...patch } : d);
    setSaveResult(null);
  }

  function Section({ id, label, children }: {
    id: string; label: string; children: React.ReactNode;
  }) {
    const open = openSections[id] ?? false;
    return (
      <div style={{ border: "1px solid #e2e8f0", borderRadius: 8,
        overflow: "hidden", marginBottom: 8 }}>
        <button type="button" onClick={() => toggleSection(id)}
          style={{ width: "100%", padding: "12px 16px",
            display: "flex", justifyContent: "space-between", alignItems: "center",
            background: "white", border: "none", cursor: "pointer",
            fontSize: 14, fontWeight: 600, color: "#1e293b", textAlign: "left" }}>
          <span>{label}</span>
          <span style={{ color: "#94a3b8", fontSize: 12 }}>{open ? "▲" : "▼"}</span>
        </button>
        {open && (
          <div style={{ padding: "12px 16px",
            borderTop: "1px solid #e2e8f0", background: "#fafafa" }}>
            {children}
          </div>
        )}
      </div>
    );
  }

  if (loading) return <LoadingSpinner message="Loading profile..." />;
  if (loadError || !draft) return (
    <p className="text-sm text-red-600">{loadError || "No profile found"}</p>
  );

  return (
    <div className="space-y-4 max-w-3xl">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
      </header>

      <ProfileCompleteness score={computeCompleteness(draft)} updatedAt={draft.updated_at} />

      <div style={{ border: "1px solid #e2e8f0", borderRadius: 8,
        padding: "16px", background: "white" }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, color: "#1e293b", marginBottom: 14 }}>
          Basic Info
        </h2>
        <BasicInfoSection data={draft} onChange={patchDraft} />
      </div>

      <Section id="experience" label="Work Experience">
        <ExperienceSection
          entries={draft.work_experience ?? []}
          onChange={(v) => patchDraft({ work_experience: v })}
        />
      </Section>

      <Section id="projects" label="Projects">
        <ProjectsSection
          entries={draft.projects ?? []}
          onChange={(v) => patchDraft({ projects: v })}
        />
      </Section>

      <Section id="academic" label="Academic Projects">
        <AcademicProjectsSection
          entries={draft.academic_projects ?? []}
          onChange={(v) => patchDraft({ academic_projects: v })}
        />
      </Section>

      <Section id="education" label="Education">
        <EducationSection
          entries={draft.education ?? []}
          onChange={(v) => patchDraft({ education: v })}
        />
      </Section>

      <Section id="skills" label="Skills">
        <SkillsSection
          categories={draft.skill_categories ?? {}}
          onChange={(v) => patchDraft({ skill_categories: v })}
        />
      </Section>

      <Section id="positions" label="Positions & Leadership">
        <PositionsSection
          positions={draft.positions ?? []}
          onChange={(v) => patchDraft({ positions: v })}
        />
      </Section>

      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0" }}>
        {isDirty && (
          <button type="button" onClick={handleCancel}
            style={{ padding: "8px 20px", borderRadius: 5,
              border: "1px solid #cbd5e1", background: "white",
              fontSize: 13, cursor: "pointer", color: "#374151" }}>
            Cancel
          </button>
        )}
        <button type="button" onClick={handleSave}
          disabled={saving || !isDirty}
          style={{ padding: "8px 20px", borderRadius: 5,
            background: isDirty ? "#3b82f6" : "#e2e8f0",
            color: isDirty ? "white" : "#94a3b8",
            border: "none", fontSize: 13, fontWeight: 500,
            cursor: isDirty && !saving ? "pointer" : "default" }}>
          {saving ? "Saving..." : "Save Profile"}
        </button>
        {isDirty && (
          <span style={{ fontSize: 12, color: "#f59e0b", fontWeight: 500 }}>
            ● Unsaved changes
          </span>
        )}
        {saveResult && (
          <span style={{ fontSize: 12,
            color: saveResult.ok ? "#15803d" : "#dc2626", fontWeight: 500 }}>
            {saveResult.message}
            {saveResult.ok && saveResult.updatedAt && (
              <span style={{ fontWeight: 400, marginLeft: 6 }}>
                Last updated:{" "}
                {new Date(saveResult.updatedAt).toLocaleString("en-IN", {
                  day: "numeric", month: "short", year: "numeric",
                  hour: "2-digit", minute: "2-digit",
                })}
              </span>
            )}
          </span>
        )}
      </div>
    </div>
  );
}
