"use client";
import { classifyError } from "@/lib/errorMessage";

export interface ProgressStep {
  label: string;
  status: "waiting" | "active" | "done" | "failed";
}

interface Props {
  steps: ProgressStep[];
  error?: string;
  onRetry?: () => void;
}

export default function GenerationProgress({ steps, error, onRetry }: Props) {
  const errInfo = error ? classifyError(error) : null;
  const isWarning = error?.startsWith("⚠") ?? false;

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
                step.status === "active" ? "#3b82f6" :
                step.status === "failed" ? "#ef4444" : "#e2e8f0",
              color: step.status === "waiting" ? "#94a3b8" : "white",
              transition: "background 0.2s",
            }}>
              {step.status === "done" ? "✓" :
               step.status === "failed" ? "✗" :
               step.status === "active" ? (
                 <span style={{
                   display: "inline-block",
                   animation: "spin 1s linear infinite",
                 }}>↻</span>
               ) : i + 1}
            </div>
            <span style={{
              fontSize: 13,
              color:
                step.status === "active" ? "#1e40af" :
                step.status === "done" ? "#15803d" :
                step.status === "failed" ? "#dc2626" : "#94a3b8",
              fontWeight: step.status === "active" ? 600 : 400,
            }}>
              {step.label}
            </span>
          </div>
        ))}
      </div>

      {errInfo && (
        <div style={{
          marginTop: 8,
          padding: "10px 12px",
          borderRadius: 6,
          background: isWarning ? "#fefce8" : "#fef2f2",
          border: `1px solid ${isWarning ? "#fde047" : "#fecaca"}`,
        }}>
          <div style={{
            color: isWarning ? "#854d0e" : "#dc2626",
            fontSize: 13,
            fontWeight: 500,
          }}>
            {errInfo.message}
          </div>
          <div style={{
            color: isWarning ? "#a16207" : "#ef4444",
            fontSize: 12,
            marginTop: 3,
          }}>
            {errInfo.hint}
          </div>
          {!isWarning && errInfo.canRetry && onRetry && (
            <button
              onClick={onRetry}
              style={{
                marginTop: 10,
                padding: "5px 14px",
                borderRadius: 4,
                border: "1px solid #fca5a5",
                background: "white",
                color: "#dc2626",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              ↺ Try again
            </button>
          )}
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
