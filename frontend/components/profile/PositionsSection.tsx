"use client";
interface Props {
  positions: string[];
  onChange: (updated: string[]) => void;
}
export default function PositionsSection({ positions, onChange }: Props) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {positions.map((pos, i) => (
        <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
          <textarea rows={2} value={pos}
            placeholder="Position or leadership role..."
            onChange={(e) => {
              const copy = [...positions]; copy[i] = e.target.value; onChange(copy);
            }}
            style={{ flex: 1, padding: "6px 9px", borderRadius: 4,
              border: "1px solid #cbd5e1", fontSize: 12,
              resize: "vertical", fontFamily: "inherit" }} />
          {positions.length > 1 && (
            <button type="button"
              onClick={() => onChange(positions.filter((_, j) => j !== i))}
              style={{ background: "none", border: "none",
                cursor: "pointer", color: "#ef4444", fontSize: 13, marginTop: 4 }}>
              ✕
            </button>
          )}
        </div>
      ))}
      <button type="button" onClick={() => onChange([...positions, ""])}
        style={{ fontSize: 12, color: "#3b82f6", background: "none",
          border: "none", cursor: "pointer", padding: "4px 0", textAlign: "left" }}>
        + Add position
      </button>
    </div>
  );
}
