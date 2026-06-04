import type { TailoredCoverLetter } from "@/types";

interface CoverLetterPreviewProps {
  letter: TailoredCoverLetter;
}

export default function CoverLetterPreview({
  letter,
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
    </section>
  );
}
