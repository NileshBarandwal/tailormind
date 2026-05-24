"use client";
import type { PoolProfile } from "@/types";
type BasicFields = Pick<PoolProfile,
  "full_name"|"email"|"phone"|"github_url"|"linkedin_url"|"iit_email"|"summary"
>;
interface Props {
  data: BasicFields;
  onChange: (updated: Partial<PoolProfile>) => void;
}
export default function BasicInfoSection({ data, onChange }: Props) {
  const inp = (
    label: string,
    key: keyof BasicFields,
    type = "text",
    colSpan = 1,
  ) => (
    <div style={{ gridColumn: `span ${colSpan}` }}>
      <label style={{
        display: "block", fontSize: 12, fontWeight: 600,
        color: "#475569", marginBottom: 3,
      }}>
        {label}
      </label>
      <input
        type={type}
        value={(data[key] as string) ?? ""}
        onChange={(e) => onChange({ [key]: e.target.value })}
        style={{
          width: "100%", padding: "7px 10px", borderRadius: 5,
          border: "1px solid #cbd5e1", fontSize: 13, boxSizing: "border-box",
        }}
      />
    </div>
  );
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
      {inp("Full Name *", "full_name")}
      {inp("Email *", "email", "email")}
      {inp("Phone", "phone")}
      {inp("Institute Email", "iit_email")}
      {inp("GitHub URL", "github_url", "url")}
      {inp("LinkedIn URL", "linkedin_url", "url")}
      <div style={{ gridColumn: "span 2" }}>
        <label style={{
          display: "block", fontSize: 12, fontWeight: 600,
          color: "#475569", marginBottom: 3,
        }}>
          Summary
        </label>
        <textarea
          value={data.summary ?? ""}
          onChange={(e) => onChange({ summary: e.target.value })}
          rows={3}
          style={{
            width: "100%", padding: "7px 10px", borderRadius: 5,
            border: "1px solid #cbd5e1", fontSize: 13,
            resize: "vertical", boxSizing: "border-box",
          }}
        />
      </div>
    </div>
  );
}
