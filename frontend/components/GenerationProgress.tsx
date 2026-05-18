"use client";

interface Step {
  label: string;
  status: "waiting" | "active" | "done";
}

interface Props {
  steps: Step[];
  error?: string;
}

export default function GenerationProgress({ steps, error }: Props) {
  return (
    <div style={{
      padding: "16px 20px",
      borderRadius: 8,
      border: "1px solid #e2e8f0",
      background: "#f8fafc",
      marginBottom: 16,
    }}>
      <div style={{ marginBottom: error ? 12 : 0 }}>
        {steps.map((step, i) => (
          <div key={i} style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "5px 0",
            opacity: step.status === "waiting" ? 0.35 : 1,
            transition: "opacity 0.2s",
          }}>
            <div style={{
              width: 20,
              height: 20,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 11,
              fontWeight: 700,
              flexShrink: 0,
              background:
                step.status === "done" ? "#22c55e" :
                step.status === "active" ? "#3b82f6" : "#e2e8f0",
              color:
                step.status === "waiting" ? "#94a3b8" : "white",
              transition: "background 0.2s",
            }}>
              {step.status === "done" ? "✓" :
               step.status === "active" ? (
                 <span style={{
                   display: "inline-block",
                   animation: "spin 1s linear infinite",
                 }}>↻</span>
               ) : i + 1}
            </div>
            <span style={{
              fontSize: 13,
              color: step.status === "active" ? "#1e40af" :
                     step.status === "done" ? "#15803d" : "#94a3b8",
              fontWeight: step.status === "active" ? 600 : 400,
            }}>
              {step.label}
            </span>
          </div>
        ))}
      </div>
      {error && (
        <div style={{
          marginTop: 8,
          padding: "8px 12px",
          borderRadius: 6,
          background: "#fef2f2",
          border: "1px solid #fecaca",
          color: "#dc2626",
          fontSize: 13,
        }}>
          {error}
          <div style={{ marginTop: 4, fontSize: 12, color: "#ef4444" }}>
            This may be a rate limit. Wait 30 seconds and try again.
          </div>
        </div>
      )}
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); }
                          to   { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
