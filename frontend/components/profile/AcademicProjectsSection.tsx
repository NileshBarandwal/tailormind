"use client";
import type { PoolAcademicProject } from "@/types";
interface Props {
  entries: PoolAcademicProject[];
  onChange: (updated: PoolAcademicProject[]) => void;
}
function blank(): PoolAcademicProject {
  return { name: "", context: "", guide: "",
    year: new Date().getFullYear(), tech_stack: "", bullets: [""] };
}
export default function AcademicProjectsSection({ entries, onChange }: Props) {
  function update(i: number, patch: Partial<PoolAcademicProject>) {
    const copy = [...entries]; copy[i] = { ...copy[i], ...patch }; onChange(copy);
  }
  function updateBullet(ei: number, bi: number, val: string) {
    const copy = [...entries];
    const bullets = [...copy[ei].bullets]; bullets[bi] = val;
    copy[ei] = { ...copy[ei], bullets }; onChange(copy);
  }
  function addBullet(ei: number) {
    const copy = [...entries];
    copy[ei] = { ...copy[ei], bullets: [...copy[ei].bullets, ""] }; onChange(copy);
  }
  function removeBullet(ei: number, bi: number) {
    const copy = [...entries];
    copy[ei] = { ...copy[ei], bullets: copy[ei].bullets.filter((_, j) => j !== bi) };
    onChange(copy);
  }
  const s: React.CSSProperties = {
    padding: "6px 9px", borderRadius: 4,
    border: "1px solid #cbd5e1", fontSize: 12, boxSizing: "border-box",
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {entries.map((proj, i) => (
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
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr",
            gap: 8, marginBottom: 8 }}>
            <input style={s} value={proj.name} placeholder="Project name"
              onChange={(e) => update(i, { name: e.target.value })} />
            <input style={s} type="number" value={proj.year} placeholder="Year"
              onChange={(e) => update(i, { year: parseInt(e.target.value) || 2024 })} />
            <input style={s} value={proj.tech_stack} placeholder="Tech stack"
              onChange={(e) => update(i, { tech_stack: e.target.value })} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr",
            gap: 8, marginBottom: 8 }}>
            <input style={s} value={proj.context}
              placeholder="Context (e.g. M.Tech MTP)"
              onChange={(e) => update(i, { context: e.target.value })} />
            <input style={s} value={proj.guide}
              placeholder="Guide / Advisor (optional)"
              onChange={(e) => update(i, { guide: e.target.value })} />
          </div>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>
            Bullets
          </div>
          {proj.bullets.map((b, bi) => (
            <div key={bi} style={{ display: "flex", gap: 6, marginBottom: 4 }}>
              <input style={{ flex: 1, padding: "5px 8px", borderRadius: 4,
                border: "1px solid #cbd5e1", fontSize: 12 }}
                value={b} placeholder={`Bullet ${bi + 1}`}
                onChange={(e) => updateBullet(i, bi, e.target.value)} />
              {proj.bullets.length > 1 && (
                <button type="button" onClick={() => removeBullet(i, bi)}
                  style={{ background: "none", border: "none",
                    cursor: "pointer", color: "#94a3b8", fontSize: 12 }}>✕</button>
              )}
            </div>
          ))}
          <button type="button" onClick={() => addBullet(i)}
            style={{ fontSize: 12, color: "#3b82f6", background: "none",
              border: "none", cursor: "pointer", padding: "2px 0" }}>
            + Add bullet
          </button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...entries, blank()])}
        style={{ fontSize: 12, color: "#3b82f6", background: "none",
          border: "none", cursor: "pointer", padding: "4px 0", textAlign: "left" }}>
        + Add academic project
      </button>
    </div>
  );
}
