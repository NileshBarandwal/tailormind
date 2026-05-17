import type { TailoredCoverLetter } from "@/types";

interface CoverLetterPreviewProps {
  letter: TailoredCoverLetter;
  onExport: () => void;
  exporting: boolean;
  exportResult?: string;
}

export default function CoverLetterPreview({
  letter,
  onExport,
  exporting,
  exportResult,
}: CoverLetterPreviewProps) {
  return (
    <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
      <header>
        <h3 className="text-xl font-semibold text-slate-900">{letter.profile_name}</h3>
        <p className="text-sm text-slate-600">
          {letter.target_role} at {letter.company_name}
        </p>
      </header>

      <p className="text-sm text-slate-800">{letter.greeting}</p>

      <div className="space-y-3">
        {letter.paragraphs.map((p, i) => (
          <p key={i} className="text-sm leading-relaxed text-slate-800">
            {p}
          </p>
        ))}
      </div>

      <p className="text-sm text-slate-800">{letter.closing}</p>

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
