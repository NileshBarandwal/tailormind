"use client";
import type { PoolEducation } from "@/types";
interface Props {
  entries: PoolEducation[];
  onChange: (updated: PoolEducation[]) => void;
}
function blank(): PoolEducation {
  return { examination: "", university: "",
    institute: "", year: new Date().getFullYear(), cgpa: "" };
}
export default function EducationSection({ entries, onChange }: Props) {
  function update(i: number, patch: Partial<PoolEducation>) {
    const copy = [...entries]; copy[i] = { ...copy[i], ...patch }; onChange(copy);
  }
  const s: React.CSSProperties = {
    width: "100%", padding: "6px 9px", borderRadius: 4,
    border: "1px solid #cbd5e1", fontSize: 12, boxSizing: "border-box",
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {entries.map((edu, i) => (
        <div key={i} style={{ border: "1px solid #e2e8f0", borderRadius: 6,
          padding: "12px 14px", position: "relative" }}>
          {entries.length > 1 && (
            <button type="button"
              onClick={() => onChange(entries.filter((_, j) => j !== i))}
              style={{ position: "absolute", top: 8, right: 8, background: "none",
                border: "none", cursor: "pointer", color: "#ef4444", fontSize: 13 }}>
              ✕
            </button>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <input style={s} value={edu.examination}
              placeholder="Examination (e.g. Masters)"
              onChange={(e) => update(i, { examination: e.target.value })} />
            <input style={s} value={edu.university} placeholder="University"
              onChange={(e) => update(i, { university: e.target.value })} />
            <input style={s} value={edu.institute} placeholder="Institute"
              onChange={(e) => update(i, { institute: e.target.value })} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <input style={s} type="number" value={edu.year} placeholder="Year"
                onChange={(e) => update(i, { year: parseInt(e.target.value) || 2024 })} />
              <input style={s} value={edu.cgpa} placeholder="CGPA / %"
                onChange={(e) => update(i, { cgpa: e.target.value })} />
            </div>
          </div>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...entries, blank()])}
        style={{ fontSize: 12, color: "#3b82f6", background: "none",
          border: "none", cursor: "pointer", padding: "4px 0", textAlign: "left" }}>
        + Add education
      </button>
    </div>
  );
}
