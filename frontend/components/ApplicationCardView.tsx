"use client";

import { useState } from "react";
import type { ApplicationCard } from "@/types";
import CopyButton from "./CopyButton";

interface ApplicationCardViewProps {
  card: ApplicationCard;
}

function Field({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="flex items-center justify-between gap-2 border-b border-slate-100 py-1.5 text-sm">
      <div className="min-w-0">
        <span className="font-medium text-slate-600">{label}: </span>
        <span className="text-slate-900">{value}</span>
      </div>
      <CopyButton text={value} />
    </div>
  );
}

function Section({
  title,
  copyText,
  children,
}: {
  title: string;
  copyText?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-sm font-bold uppercase tracking-wide text-slate-700">
          {title}
        </h4>
        {copyText !== undefined && <CopyButton text={copyText} />}
      </div>
      {children}
    </div>
  );
}

function QuestionItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <li className="rounded border border-slate-200">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm font-medium text-slate-800 hover:bg-slate-50"
      >
        <span>{question}</span>
        <span className="text-xs text-slate-500">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div className="space-y-2 border-t border-slate-200 bg-slate-50 px-3 py-2">
          <p className="text-sm text-slate-800">{answer}</p>
          <CopyButton text={answer} label="Copy answer" />
        </div>
      )}
    </li>
  );
}

export default function ApplicationCardView({ card }: ApplicationCardViewProps) {
  const [checked, setChecked] = useState<Record<number, boolean>>({});

  function toggle(idx: number) {
    setChecked((c) => ({ ...c, [idx]: !c[idx] }));
  }

  const topExperiencesBlock = card.top_experiences
    .map((e, i) => `${i + 1}. ${e}`)
    .join("\n");
  const skillsBlock = card.key_skills_to_mention.join(", ");

  return (
    <div className="space-y-4">
      <Section title="Basic details">
        <div className="space-y-1">
          <Field label="Name" value={card.profile_name} />
          <Field label="Email" value={card.email} />
          <Field label="Phone" value={card.phone} />
          <Field label="GitHub" value={card.github_url} />
          <Field label="LinkedIn" value={card.linkedin_url} />
        </div>
      </Section>

      <Section title="One-liner pitch" copyText={card.one_liner_pitch}>
        <p className="text-sm text-slate-800">{card.one_liner_pitch}</p>
      </Section>

      <Section title="Why this company" copyText={card.why_this_company}>
        <p className="text-sm text-slate-800">{card.why_this_company}</p>
      </Section>

      <Section title="Why this role" copyText={card.why_this_role}>
        <p className="text-sm text-slate-800">{card.why_this_role}</p>
      </Section>

      <Section title="Top experiences to mention" copyText={topExperiencesBlock}>
        <ol className="list-inside list-decimal space-y-1 text-sm text-slate-800">
          {card.top_experiences.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ol>
      </Section>

      <Section title="Key skills to mention" copyText={skillsBlock}>
        <div className="flex flex-wrap gap-1">
          {card.key_skills_to_mention.map((s) => (
            <span
              key={s}
              className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-800"
            >
              {s}
            </span>
          ))}
        </div>
      </Section>

      <Section title="Likely interview questions">
        <ul className="space-y-2">
          {card.likely_questions.map((q, i) => (
            <QuestionItem key={i} question={q.question} answer={q.answer} />
          ))}
        </ul>
      </Section>

      <Section title="Application checklist">
        <ul className="space-y-1 text-sm text-slate-800">
          {card.application_checklist.map((item, i) => (
            <li key={i} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={!!checked[i]}
                onChange={() => toggle(i)}
                className="h-4 w-4 rounded border-slate-300"
              />
              <span className={checked[i] ? "text-slate-400 line-through" : ""}>
                {item}
              </span>
            </li>
          ))}
        </ul>
      </Section>

      {card.job_url && (
        <div className="flex justify-center">
          <a
            href={card.job_url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded bg-blue-600 px-6 py-3 text-base font-semibold text-white transition hover:bg-blue-700"
          >
            Apply Now
          </a>
        </div>
      )}
    </div>
  );
}
