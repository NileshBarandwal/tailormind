import type { JobListing } from "@/types";

interface JobCardProps {
  job: JobListing;
  onSelect: (job: JobListing) => void;
  selected: boolean;
}

function sourceBadge(source: string): string {
  if (source === "adzuna") return "bg-purple-100 text-purple-800";
  if (source === "remotive") return "bg-teal-100 text-teal-800";
  return "bg-slate-100 text-slate-700";
}

function scoreColor(score: number): string {
  if (score >= 0.7) return "text-green-600";
  if (score >= 0.5) return "text-yellow-600";
  return "text-red-600";
}

export default function JobCard({ job, onSelect, selected }: JobCardProps) {
  const snippet = job.description.length > 150
    ? `${job.description.slice(0, 150)}...`
    : job.description;

  return (
    <article
      className={`rounded-lg border bg-white p-4 transition ${
        selected ? "border-blue-500 ring-2 ring-blue-200" : "border-slate-200"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-slate-900">{job.title}</h3>
          <p className="text-sm text-slate-700">
            {job.company} · {job.location}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 text-right">
          <span className={`rounded px-2 py-0.5 text-xs font-medium ${sourceBadge(job.source)}`}>
            {job.source}
          </span>
          <span className={`text-sm font-bold ${scoreColor(job.match_score)}`}>
            {Math.round(job.match_score * 100)}%
          </span>
        </div>
      </div>

      {job.match_reason && (
        <p className="mt-2 text-xs italic text-slate-600">{job.match_reason}</p>
      )}

      <p className="mt-2 text-sm text-slate-700">{snippet}</p>

      <div className="mt-3 flex gap-2">
        <a
          href={job.url}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded bg-slate-100 px-3 py-1 text-xs font-medium text-slate-800 transition hover:bg-slate-200"
        >
          Apply to this job
        </a>
        <button
          type="button"
          onClick={() => onSelect(job)}
          className={`rounded px-3 py-1 text-xs font-medium text-white transition ${
            selected
              ? "bg-green-600 hover:bg-green-700"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {selected ? "Selected ✓" : "Select + Generate ↓"}
        </button>
      </div>
    </article>
  );
}
