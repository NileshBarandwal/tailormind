"use client";
interface Props {
  score: number;
  updatedAt: string;
}
export default function ProfileCompleteness({ score, updatedAt }: Props) {
  const label =
    score === 100 ? "Complete" :
    score >= 75 ? "Almost there" :
    score >= 50 ? "Good start" : "Getting started";
  function fmt(iso: string) {
    try {
      return new Date(iso).toLocaleString("en-IN", {
        day: "numeric", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      });
    } catch { return iso; }
  }
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{
        display: "flex", justifyContent: "space-between",
        alignItems: "center", marginBottom: 6,
      }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>
          Profile completeness: {score}% — {label}
        </span>
        <span style={{ fontSize: 11, color: "#94a3b8" }}>
          Last updated: {fmt(updatedAt)}
        </span>
      </div>
      <div style={{
        height: 8, borderRadius: 4, background: "#e2e8f0", overflow: "hidden",
      }}>
        <div style={{
          height: "100%",
          width: `${score}%`,
          borderRadius: 4,
          background: score === 100 ? "#22c55e" : "#3b82f6",
          transition: "width 0.3s ease",
        }} />
      </div>
    </div>
  );
}
