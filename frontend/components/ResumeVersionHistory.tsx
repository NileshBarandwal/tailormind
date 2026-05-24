"use client";
import { useEffect, useState } from "react";
import {
  listVersions,
  updateVersionOutcome,
  getVersionResume,
  deleteVersion,
  getVersionInsights,
} from "@/lib/api";
import type {
  VersionListItem,
  VersionInsights,
  StructuredResume,
} from "@/types";

const STATUS_COLORS: Record<string, string> = {
  generated: "#94a3b8",
  applied: "#3b82f6",
  interview: "#f59e0b",
  rejected: "#ef4444",
  offer: "#22c55e",
};

const STATUS_LABELS: Record<string, string> = {
  generated: "Generated",
  applied: "Applied",
  interview: "Interview",
  rejected: "Rejected",
  offer: "Offer",
};

interface Props {
  profileId: string;
  onRestore: (
    resume: StructuredResume,
    meta: {
      version_id: string;
      company_name: string;
      created_at: string;
    }
  ) => void;
  refreshKey?: number;
}

export default function ResumeVersionHistory({
  profileId,
  onRestore,
  refreshKey,
}: Props) {
  const [versions, setVersions] = useState<VersionListItem[]>([]);
  const [insights, setInsights] = useState<VersionInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [showInsights, setShowInsights] = useState(false);
  const [editingNotes, setEditingNotes] = useState<Record<string, string>>({});
  const [savingNotes, setSavingNotes] = useState<Record<string, boolean>>({});
  const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!profileId) return;
    setLoading(true);
    listVersions(profileId, 20)
      .then((data) => {
        setVersions(data);
        const initial: Record<string, string> = {};
        data.forEach((v) => { initial[v.version_id] = v.notes ?? ""; });
        setEditingNotes(initial);
      })
      .catch(() => setVersions([]))
      .finally(() => setLoading(false));
  }, [profileId, refreshKey]);

  function refreshList() {
    listVersions(profileId, 20)
      .then((data) => {
        setVersions(data);
        const initial: Record<string, string> = {};
        data.forEach((v) => { initial[v.version_id] = v.notes ?? ""; });
        setEditingNotes(initial);
      })
      .catch(() => {});
  }

  async function handleSaveNotes(vid: string) {
    setSavingNotes((s) => ({ ...s, [vid]: true }));
    try {
      await updateVersionOutcome(vid, profileId, {
        notes: editingNotes[vid] ?? "",
      });
      refreshList();
    } catch {
      // ignore
    } finally {
      setSavingNotes((s) => ({ ...s, [vid]: false }));
    }
  }

  function loadInsights() {
    if (insights) { setShowInsights(true); return; }
    getVersionInsights(profileId)
      .then((d) => { setInsights(d); setShowInsights(true); })
      .catch(() => {});
  }

  async function handleStatusChange(vid: string, status: string) {
    await updateVersionOutcome(vid, profileId, {
      status: status as VersionListItem["status"],
      applied_at:
        status === "applied" ? new Date().toISOString() : undefined,
    });
    refreshList();
  }

  async function handleRestore(v: VersionListItem) {
    try {
      const resume = await getVersionResume(v.version_id, profileId);
      onRestore(resume, {
        version_id: v.version_id,
        company_name: v.company_name,
        created_at: v.created_at,
      });
    } catch {
      alert("Could not restore this version.");
    }
  }

  async function handleDelete(vid: string) {
    if (!confirm("Archive this version?")) return;
    await deleteVersion(vid, profileId);
    refreshList();
  }

  function formatDate(iso: string) {
    try {
      return new Date(iso).toLocaleDateString("en-IN", {
        day: "numeric", month: "short", year: "numeric",
      });
    } catch { return iso; }
  }

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        style={{
          width: "100%", padding: "10px 16px", borderRadius: 6,
          border: "1px solid #e2e8f0", background: "#f8fafc",
          textAlign: "left", cursor: "pointer", fontSize: 13,
          color: "#475569", fontWeight: 500,
        }}
      >
        📋 Version History{" "}
        {versions.length > 0 ? `(${versions.length})` : ""}
      </button>
    );
  }

  return (
    <div style={{
      border: "1px solid #e2e8f0", borderRadius: 8,
      background: "#f8fafc", overflow: "hidden",
    }}>
      <div style={{
        display: "flex", alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 16px", borderBottom: "1px solid #e2e8f0",
        background: "white",
      }}>
        <span style={{
          fontSize: 13, fontWeight: 600, color: "#1e293b",
        }}>
          📋 Version History
        </span>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={loadInsights}
            style={{
              fontSize: 12, padding: "3px 10px", borderRadius: 4,
              border: "1px solid #e2e8f0", background: "white",
              cursor: "pointer", color: "#475569",
            }}
          >
            Insights
          </button>
          <button
            onClick={() => setExpanded(false)}
            style={{
              fontSize: 12, padding: "3px 10px",
              border: "none", background: "none",
              cursor: "pointer", color: "#94a3b8",
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {showInsights && insights && (
        <div style={{
          padding: "12px 16px", borderBottom: "1px solid #e2e8f0",
          background: "#fafafa",
        }}>
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8,
          }}>
            {[
              { label: "Generated", value: insights.total_generated },
              { label: "Applied", value: insights.total_applied },
              { label: "Interview", value: insights.total_interview },
              { label: "Offer", value: insights.total_offer },
            ].map((s) => (
              <div key={s.label} style={{
                textAlign: "center", padding: "8px 4px",
                background: "white", borderRadius: 6,
                border: "1px solid #e2e8f0",
              }}>
                <div style={{
                  fontSize: 20, fontWeight: 700, color: "#1e293b",
                }}>
                  {s.value}
                </div>
                <div style={{ fontSize: 11, color: "#94a3b8" }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>
          {insights.top_selected_projects.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <div style={{
                fontSize: 11, color: "#94a3b8", marginBottom: 4,
              }}>
                Top projects
              </div>
              <div style={{
                display: "flex", gap: 6, flexWrap: "wrap",
              }}>
                {insights.top_selected_projects.slice(0, 4).map((p) => (
                  <span key={p.name} style={{
                    fontSize: 11, padding: "2px 8px", borderRadius: 10,
                    background: "#eff6ff", color: "#3b82f6",
                  }}>
                    {p.name} ({p.count})
                  </span>
                ))}
              </div>
            </div>
          )}
          <button
            onClick={() => setShowInsights(false)}
            style={{
              marginTop: 8, fontSize: 11, color: "#94a3b8",
              background: "none", border: "none",
              cursor: "pointer", display: "block", marginLeft: "auto",
            }}
          >
            Hide insights
          </button>
        </div>
      )}

      {loading ? (
        <div style={{ padding: 16, fontSize: 13, color: "#94a3b8" }}>
          Loading...
        </div>
      ) : versions.length === 0 ? (
        <div style={{ padding: 16, fontSize: 13, color: "#94a3b8" }}>
          No versions yet. Generate a resume to start tracking.
        </div>
      ) : (
        <div style={{ maxHeight: 320, overflowY: "auto" }}>
          {versions.map((v) => (
            <div key={v.version_id}>
              <div style={{
                padding: "10px 16px", borderBottom: "1px solid #f1f5f9",
                background: "white", display: "flex",
                alignItems: "center", gap: 10,
              }}>
                <div style={{
                  width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                  background: STATUS_COLORS[v.status] ?? "#94a3b8",
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 12, fontWeight: 600, color: "#1e293b",
                    overflow: "hidden", textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}>
                    {v.company_name || "Unknown"} · {v.target_role || "Unknown role"}
                  </div>
                  <div style={{
                    fontSize: 11, color: "#94a3b8", marginTop: 1,
                  }}>
                    {formatDate(v.created_at)}
                    {v.generation_duration_ms > 0 && (
                      <span>
                        {" "}· {(v.generation_duration_ms / 1000).toFixed(1)}s
                      </span>
                    )}
                  </div>
                </div>
                <select
                  value={v.status}
                  onChange={(e) =>
                    handleStatusChange(v.version_id, e.target.value)
                  }
                  style={{
                    fontSize: 11, padding: "2px 4px", borderRadius: 4,
                    border: "1px solid #e2e8f0", background: "white",
                    cursor: "pointer",
                    color: STATUS_COLORS[v.status] ?? "#94a3b8",
                  }}
                >
                  {Object.entries(STATUS_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
                <button
                  onClick={() => handleRestore(v)}
                  style={{
                    fontSize: 11, padding: "2px 8px", borderRadius: 4,
                    border: "1px solid #e2e8f0", background: "white",
                    cursor: "pointer", color: "#3b82f6",
                  }}
                >
                  Restore
                </button>
                <button
                  onClick={() => handleDelete(v.version_id)}
                  style={{
                    fontSize: 11, padding: "2px 6px", borderRadius: 4,
                    border: "none", background: "none",
                    cursor: "pointer", color: "#ef4444",
                  }}
                >
                  ✕
                </button>
                <button
                  onClick={() =>
                    setExpandedNotes((s) => ({
                      ...s,
                      [v.version_id]: !s[v.version_id],
                    }))
                  }
                  style={{
                    fontSize: 11, padding: "2px 6px", borderRadius: 4,
                    border: "none", background: "none",
                    cursor: "pointer", color: "#94a3b8",
                  }}
                  title="Add note"
                >
                  📝
                </button>
              </div>
              {expandedNotes[v.version_id] && (
                <div style={{
                  padding: "8px 16px 10px",
                  borderBottom: "1px solid #f1f5f9",
                  background: "#fafafa",
                  display: "flex", gap: 8, alignItems: "flex-start",
                }}>
                  <textarea
                    rows={2}
                    placeholder="Add a note: e.g. Emphasized FastAPI, Reduced project count..."
                    value={editingNotes[v.version_id] ?? ""}
                    onChange={(e) =>
                      setEditingNotes((s) => ({
                        ...s,
                        [v.version_id]: e.target.value,
                      }))
                    }
                    style={{
                      flex: 1, fontSize: 12, padding: "6px 8px",
                      borderRadius: 4, border: "1px solid #e2e8f0",
                      resize: "vertical", fontFamily: "inherit",
                    }}
                  />
                  <button
                    onClick={() => handleSaveNotes(v.version_id)}
                    disabled={savingNotes[v.version_id]}
                    style={{
                      fontSize: 12, padding: "5px 12px", borderRadius: 4,
                      background: "#3b82f6", color: "white", border: "none",
                      cursor: savingNotes[v.version_id] ? "default" : "pointer",
                      opacity: savingNotes[v.version_id] ? 0.6 : 1,
                    }}
                  >
                    {savingNotes[v.version_id] ? "Saving..." : "Save"}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
