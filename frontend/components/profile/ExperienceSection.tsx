"use client";
import type { PoolWorkExperience } from "@/types";
interface Props {
  entries: PoolWorkExperience[];
  onChange: (updated: PoolWorkExperience[]) => void;
}
function blank(): PoolWorkExperience {
  return { company: "", role: "", duration: "", guide: "", bullets: [""] };
}
export default function ExperienceSection({ entries, onChange }: Props) {
  function update(i: number, patch: Partial<PoolWorkExperience>) {
    const copy = [...entries];
    copy[i] = { ...copy[i], ...patch };
    onChange(copy);
  }
  function updateBullet(ei: number, bi: number, val: string) {
    const copy = [...entries];
    const bullets = [...copy[ei].bullets];
    bullets[bi] = val;
    copy[ei] = { ...copy[ei], bullets };
    onChange(copy);
  }
  function addBullet(ei: number) {
    const copy = [...entries];
    copy[ei] = { ...copy[ei], bullets: [...copy[ei].bullets, ""] };
    onChange(copy);
  }
  function removeBullet(ei: number, bi: number) {
    const copy = [...entries];
    copy[ei] = { ...copy[ei], bullets: copy[ei].bullets.filter((_, j) => j !== bi) };
    onChange(copy);
  }
  const s: React.CSSProperties = {
    padding: "6px 9px", borderRadius: 4,
    border: "1px solid #cbd5e1", fontSize: 12, width: "100%",
    boxSizing: "border-box",
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {entries.map((exp, i) => (
        <div key={i} style={{
          border: "1px solid #e2e8f0", borderRadius: 6,
          padding: "12px 14px", position: "relative",
        }}>
          {entries.length > 1 && (
            <button type="button"
              onClick={() => onChange(entries.filter((_, j) => j !== i))}
              style={{ position: "absolute", top: 8, right: 8, background: "none",
                border: "none", cursor: "pointer", color: "#ef4444", fontSize: 13 }}>
              ✕
            </button>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 8 }}>
            <input style={s} value={exp.company} placeholder="Company"
              onChange={(e) => update(i, { company: e.target.value })} />
            <input style={s} value={exp.role} placeholder="Role"
              onChange={(e) => update(i, { role: e.target.value })} />
            <input style={s} value={exp.duration} placeholder="Duration"
              onChange={(e) => update(i, { duration: e.target.value })} />
          </div>
          <input style={{ ...s, marginBottom: 8 }} value={exp.guide}
            placeholder="Guide / Mentor (optional)"
            onChange={(e) => update(i, { guide: e.target.value })} />
          <div style={{ fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>
            Bullets
          </div>
          {exp.bullets.map((b, bi) => (
            <div key={bi} style={{ display: "flex", gap: 6, marginBottom: 4 }}>
              <input style={{ flex: 1, padding: "5px 8px", borderRadius: 4,
                border: "1px solid #cbd5e1", fontSize: 12 }}
                value={b} placeholder={`Bullet ${bi + 1}`}
                onChange={(e) => updateBullet(i, bi, e.target.value)} />
              {exp.bullets.length > 1 && (
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
        + Add experience
      </button>
    </div>
  );
}
