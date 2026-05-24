"use client";
interface Props {
  categories: Record<string, string>;
  onChange: (updated: Record<string, string>) => void;
}
export default function SkillsSection({ categories, onChange }: Props) {
  const entries = Object.entries(categories);
  function updateCategory(oldKey: string, newKey: string, value: string) {
    const updated: Record<string, string> = {};
    for (const [k, v] of Object.entries(categories)) {
      if (k === oldKey) { if (newKey.trim()) updated[newKey.trim()] = value; }
      else { updated[k] = v; }
    }
    onChange(updated);
  }
  function removeCategory(key: string) {
    const updated = { ...categories }; delete updated[key]; onChange(updated);
  }
  function addCategory() {
    const key = `Category ${entries.length + 1}`;
    onChange({ ...categories, [key]: "" });
  }
  const s: React.CSSProperties = {
    padding: "6px 9px", borderRadius: 4,
    border: "1px solid #cbd5e1", fontSize: 12,
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {entries.map(([key, value], i) => (
        <div key={i} style={{ display: "grid",
          gridTemplateColumns: "1fr 2fr auto", gap: 8, alignItems: "center" }}>
          <input style={s} value={key} placeholder="Category name"
            onChange={(e) => updateCategory(key, e.target.value, value)} />
          <input style={s} value={value} placeholder="Skill 1, Skill 2, Skill 3..."
            onChange={(e) => updateCategory(key, key, e.target.value)} />
          {entries.length > 1 && (
            <button type="button" onClick={() => removeCategory(key)}
              style={{ background: "none", border: "none",
                cursor: "pointer", color: "#ef4444", fontSize: 13 }}>✕</button>
          )}
        </div>
      ))}
      <button type="button" onClick={addCategory}
        style={{ fontSize: 12, color: "#3b82f6", background: "none",
          border: "none", cursor: "pointer", padding: "4px 0", textAlign: "left" }}>
        + Add category
      </button>
    </div>
  );
}
