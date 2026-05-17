import type { MatchScore } from "@/types";

interface MatchScoreCardProps {
  score: MatchScore;
}

function colorForScore(value: number): string {
  if (value >= 0.7) return "bg-green-500";
  if (value >= 0.5) return "bg-yellow-500";
  return "bg-red-500";
}

function textColorForScore(value: number): string {
  if (value >= 0.7) return "text-green-600";
  if (value >= 0.5) return "text-yellow-600";
  return "text-red-600";
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  const pct = Math.round(value * 100);
  return (
    <div>
      <div className="flex justify-between text-sm">
        <span className="text-slate-700">{label}</span>
        <span className="font-medium text-slate-900">{pct}%</span>
      </div>
      <div className="mt-1 h-2 w-full overflow-hidden rounded bg-slate-200">
        <div
          className={`h-full ${colorForScore(value)}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function MatchScoreCard({ score }: MatchScoreCardProps) {
  const overallPct = Math.round(score.overall_score * 100);

  return (
    <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-baseline justify-between">
        <h3 className="text-lg font-semibold text-slate-900">Match Score</h3>
        <span className={`text-4xl font-bold ${textColorForScore(score.overall_score)}`}>
          {overallPct}%
        </span>
      </div>

      <div className="space-y-3">
        <ScoreBar label="Overall" value={score.overall_score} />
        <ScoreBar label="Skills" value={score.skill_score} />
        <ScoreBar label="Experience" value={score.experience_score} />
        <ScoreBar label="Education" value={score.education_score} />
      </div>

      {score.matched_skills.length > 0 && (
        <div>
          <p className="text-sm font-medium text-slate-700">Matched skills</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {score.matched_skills.map((s) => (
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

      {score.missing_skills.length > 0 && (
        <div>
          <p className="text-sm font-medium text-slate-700">Missing skills</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {score.missing_skills.map((s) => (
              <span
                key={s}
                className="rounded bg-red-100 px-2 py-0.5 text-xs text-red-800"
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="text-sm font-medium text-slate-700">Rationale</p>
        <p className="mt-1 text-sm text-slate-600">{score.rationale}</p>
      </div>

      {score.recommendations.length > 0 && (
        <div>
          <p className="text-sm font-medium text-slate-700">Recommendations</p>
          <ol className="mt-1 list-inside list-decimal space-y-1 text-sm text-slate-600">
            {score.recommendations.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}
