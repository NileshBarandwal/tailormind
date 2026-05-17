import type { TailoredResume } from "@/types";

interface ResumePreviewProps {
  resume: TailoredResume;
  onExport: () => void;
  exporting: boolean;
  exportResult?: string;
}

export default function ResumePreview({
  resume,
  onExport,
  exporting,
  exportResult,
}: ResumePreviewProps) {
  const sections = [...resume.sections].sort((a, b) => a.order - b.order);

  return (
    <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
      <header>
        <h3 className="text-xl font-semibold text-slate-900">{resume.profile_name}</h3>
        <p className="text-sm text-slate-600">{resume.target_role}</p>
      </header>

      {resume.summary && (
        <div>
          <h4 className="text-sm font-bold uppercase tracking-wide text-slate-700">
            Summary
          </h4>
          <p className="mt-1 text-sm text-slate-800">{resume.summary}</p>
        </div>
      )}

      {sections.map((section) => (
        <div key={`${section.title}-${section.order}`}>
          <h4 className="text-sm font-bold uppercase tracking-wide text-slate-700">
            {section.title}
          </h4>
          <ul className="mt-1 list-inside list-disc space-y-1 text-sm text-slate-800">
            {section.bullets.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        </div>
      ))}

      {resume.skills_highlighted.length > 0 && (
        <div>
          <h4 className="text-sm font-bold uppercase tracking-wide text-slate-700">
            Skills highlighted
          </h4>
          <div className="mt-1 flex flex-wrap gap-1">
            {resume.skills_highlighted.map((s) => (
              <span
                key={s}
                className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-800"
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {resume.jd_keywords_used.length > 0 && (
        <div>
          <h4 className="text-sm font-bold uppercase tracking-wide text-slate-700">
            JD keywords used
          </h4>
          <div className="mt-1 flex flex-wrap gap-1">
            {resume.jd_keywords_used.map((k) => (
              <span
                key={k}
                className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-800"
              >
                {k}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="border-t border-slate-200 pt-4">
        <button
          type="button"
          onClick={onExport}
          disabled={exporting}
          className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {exporting ? "Exporting..." : "Export as PDF"}
        </button>
        {exportResult && (
          <p className="mt-2 text-xs text-green-700">{exportResult}</p>
        )}
        <p className="mt-1 text-xs text-slate-500">
          Review carefully before exporting.
        </p>
      </div>
    </section>
  );
}
