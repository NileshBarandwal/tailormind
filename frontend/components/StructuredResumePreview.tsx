"use client";
import { useRef, useState } from "react";
import type {
  StructuredProject,
  StructuredExperience,
  StructuredResume,
} from "@/types";

interface Props {
  resume: StructuredResume;
}

function escTex(s: string): string {
  if (!s) return "";
  return s
    .replace(/\\/g, "\\textbackslash{}")
    .replace(/&/g, "\\&")
    .replace(/%/g, "\\%")
    .replace(/#/g, "\\#")
    .replace(/_/g, "\\_")
    .replace(/\$/g, "\\$")
    .replace(/\^/g, "\\^{}")
    .replace(/~/g, "\\~{}")
    .replace(/\{/g, "\\{")
    .replace(/\}/g, "\\}");
}

export function generateLatex(resume: StructuredResume): string {
  const lines: string[] = [];

  lines.push("\\documentclass[a4paper,10pt]{article}");
  lines.push(
    "\\usepackage[top=16mm,bottom=16mm,left=14mm,right=14mm]{geometry}",
  );
  lines.push("\\usepackage{palatino}");
  lines.push("\\usepackage[T1]{fontenc}");
  lines.push("\\usepackage{enumitem}");
  lines.push("\\usepackage{hyperref}");
  lines.push("\\usepackage{graphicx}");
  lines.push("\\usepackage{tabularx}");
  lines.push("\\usepackage{booktabs}");
  lines.push("\\usepackage{xcolor}");
  lines.push("\\pagestyle{empty}");
  lines.push("\\setlength{\\parindent}{0pt}");
  lines.push(
    "\\newcommand{\\resheading}[1]{{\\setlength{\\fboxsep}{2pt}\\colorbox{lightgray!60}{\\parbox{\\dimexpr\\linewidth-2\\fboxsep}{\\textbf{#1}}}}}",
  );
  lines.push("");
  lines.push("\\begin{document}");
  lines.push("");

  // HEADER
  const email = escTex(resume.contact.iit_email || resume.contact.email);
  const phone = escTex(resume.contact.phone);
  const github = resume.contact.github_url;
  const linkedin = resume.contact.linkedin_url;
  const fullName = escTex(resume.contact.full_name);

  lines.push(
    "\\begin{tabular}{p{1.6cm} p{9cm} p{6.5cm}}",
  );
  lines.push(
    "\\includegraphics[width=1.6cm]{iitdh-logo} &",
  );
  lines.push(
    `\\textbf{\\large ${fullName}} \\newline \\textbf{CSE (Computer Science \\& Engineering)} &`,
  );
  const rightLines: string[] = [];
  rightLines.push(`\\textit{Email:} ${email}`);
  rightLines.push(`\\textit{Phone:} ${phone}`);
  if (github)
    rightLines.push(`\\href{${github}}{GitHub Profile}`);
  if (linkedin)
    rightLines.push(`\\href{${linkedin}}{LinkedIn Profile}`);
  lines.push(rightLines.join(" \\newline "));
  lines.push("\\end{tabular}");
  lines.push("");
  lines.push("\\vspace{4pt}");

  // EDUCATION
  lines.push("\\begin{tabularx}{\\linewidth}{l l X l l}");
  lines.push("\\toprule");
  lines.push(
    "\\textbf{Examination} & \\textbf{University} & \\textbf{Institute} & \\textbf{Year} & \\textbf{CGPA} \\\\",
  );
  lines.push("\\midrule");
  for (const row of resume.education) {
    lines.push(
      `${escTex(row.examination)} & ${escTex(row.university)} & ${escTex(row.institute)} & ${row.year} & ${escTex(row.cgpa)} \\\\`,
    );
  }
  lines.push("\\bottomrule");
  lines.push("\\end{tabularx}");
  lines.push("");

  // TECHNICAL SKILLS
  lines.push("\\resheading{TECHNICAL SKILLS}");
  lines.push("\\begin{itemize}[leftmargin=*,noitemsep,topsep=2pt]");
  for (const [cat, skills] of Object.entries(resume.skill_categories)) {
    lines.push(`\\item \\textbf{${escTex(cat)}}: ${escTex(skills)}`);
  }
  lines.push("\\end{itemize}");
  lines.push("");

  // PERSONAL PROJECTS
  if (resume.personal_projects.length > 0) {
    lines.push("\\resheading{PERSONAL PROJECTS}");
    lines.push("\\begin{itemize}[leftmargin=*,noitemsep,topsep=2pt]");
    for (const p of resume.personal_projects) {
      lines.push(
        `\\item \\textbf{${escTex(p.name)}} \\hfill \\textit{${escTex(p.tech_stack)}}`,
      );
      lines.push("\\begin{itemize}[label=$\\circ$,leftmargin=*,noitemsep,topsep=1pt]");
      for (const b of p.bullets) {
        lines.push(`  \\item ${escTex(b)}`);
      }
      if (p.live_url) {
        lines.push(`  \\item \\textit{Live:} \\href{${p.live_url}}{${escTex(p.live_url)}}`);
      }
      if (p.repo_url) {
        lines.push(`  \\item \\textit{Repo:} \\href{${p.repo_url}}{${escTex(p.repo_url)}}`);
      }
      lines.push("\\end{itemize}");
    }
    lines.push("\\end{itemize}");
    lines.push("");
  }

  // WORK EXPERIENCE
  if (resume.work_experience.length > 0) {
    lines.push("\\resheading{WORK EXPERIENCE}");
    lines.push("\\begin{itemize}[leftmargin=*,noitemsep,topsep=2pt]");
    for (const e of resume.work_experience) {
      lines.push(
        `\\item \\textbf{${escTex(e.company)} (${escTex(e.role)})} \\hfill \\textit{${escTex(e.duration)}}`,
      );
      if (e.guide) {
        lines.push(`\\\\ \\textit{Guide: \\textbf{${escTex(e.guide)}}}`);
      }
      lines.push("\\begin{itemize}[label=$\\circ$,leftmargin=*,noitemsep,topsep=1pt]");
      for (const b of e.bullets) {
        lines.push(`  \\item ${escTex(b)}`);
      }
      lines.push("\\end{itemize}");
    }
    lines.push("\\end{itemize}");
    lines.push("");
  }

  // ACADEMIC PROJECTS
  if (resume.academic_projects.length > 0) {
    lines.push("\\resheading{ACADEMIC PROJECTS}");
    lines.push("\\begin{itemize}[leftmargin=*,noitemsep,topsep=2pt]");
    for (const p of resume.academic_projects) {
      const ctx = p.context ? ` ~~ ${escTex(p.context)}` : "";
      lines.push(
        `\\item \\textbf{${escTex(p.name)}}${ctx} \\hfill \\textit{${escTex(p.tech_stack)}}`,
      );
      if (p.guide) {
        lines.push(`\\\\ \\textit{(Guide: \\textbf{${escTex(p.guide)}})}`);
      }
      lines.push("\\begin{itemize}[label=$\\circ$,leftmargin=*,noitemsep,topsep=1pt]");
      for (const b of p.bullets) {
        lines.push(`  \\item ${escTex(b)}`);
      }
      lines.push("\\end{itemize}");
    }
    lines.push("\\end{itemize}");
    lines.push("");
  }

  // PUBLICATIONS
  if (resume.publications.length > 0) {
    lines.push("\\resheading{PUBLICATIONS}");
    lines.push("\\begin{itemize}[leftmargin=*,noitemsep,topsep=2pt]");
    for (const pub of resume.publications) {
      lines.push(`\\item ${escTex(pub)}`);
    }
    lines.push("\\end{itemize}");
    lines.push("");
  }

  // POSITIONS
  if (resume.positions.length > 0) {
    lines.push("\\resheading{POSITIONS OF RESPONSIBILITY}");
    lines.push("\\begin{itemize}[leftmargin=*,noitemsep,topsep=2pt]");
    for (const pos of resume.positions) {
      lines.push(`\\item ${escTex(pos)}`);
    }
    lines.push("\\end{itemize}");
    lines.push("");
  }

  // ACHIEVEMENTS
  if (resume.achievements.length > 0) {
    lines.push("\\resheading{ACHIEVEMENTS \\& ACTIVITIES}");
    lines.push("\\begin{itemize}[leftmargin=*,noitemsep,topsep=2pt]");
    for (const ach of resume.achievements) {
      lines.push(`\\item ${escTex(ach)}`);
    }
    lines.push("\\end{itemize}");
    lines.push("");
  }

  lines.push("\\end{document}");
  return lines.join("\n");
}

export default function StructuredResumePreview({ resume }: Props) {
  const printRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<"preview" | "latex">("preview");
  const [latexCode, setLatexCode] = useState("");
  const [copied, setCopied] = useState(false);

  function handlePrint() {
    window.print();
  }

  function handleTabChange(tab: "preview" | "latex") {
    setActiveTab(tab);
    if (tab === "latex" && !latexCode) {
      setLatexCode(generateLatex(resume));
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(latexCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleOpenOverleaf() {
    const form = document.createElement("form");
    form.method = "POST";
    form.action = "https://www.overleaf.com/docs";
    form.target = "_blank";
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = "snip";
    input.value = latexCode || generateLatex(resume);
    form.appendChild(input);
    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);
  }

  return (
    <>
      <div className="no-print mb-3">
        <div style={{ display: "flex", alignItems: "center", borderBottom: "1px solid #e2e8f0", marginBottom: 12 }}>
          {(["preview", "latex"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              style={{
                padding: "8px 16px",
                fontSize: 14,
                fontWeight: 500,
                border: "none",
                borderBottom: activeTab === tab ? "2px solid #0f172a" : "2px solid transparent",
                background: "none",
                cursor: "pointer",
                color: activeTab === tab ? "#0f172a" : "#94a3b8",
              }}
            >
              {tab === "preview" ? "Preview" : "LaTeX"}
            </button>
          ))}
          <div style={{ marginLeft: "auto", display: "flex", gap: 8, paddingBottom: 4 }}>
            {activeTab === "preview" && (
              <>
                <button
                  onClick={handlePrint}
                  style={{ background: "#0f172a", color: "white", border: "none", borderRadius: 4, padding: "6px 14px", fontSize: 13, cursor: "pointer" }}
                >
                  Export PDF
                </button>
                <span style={{ fontSize: 12, color: "#94a3b8", alignSelf: "center" }}>Cmd+P → Save as PDF</span>
              </>
            )}
            {activeTab === "latex" && (
              <>
                <button
                  onClick={handleCopy}
                  style={{ background: "white", color: "#374151", border: "1px solid #d1d5db", borderRadius: 4, padding: "6px 14px", fontSize: 13, cursor: "pointer" }}
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
                <button
                  onClick={handleOpenOverleaf}
                  style={{ background: "#4cae4f", color: "white", border: "none", borderRadius: 4, padding: "6px 14px", fontSize: 13, cursor: "pointer" }}
                >
                  Open in Overleaf
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {activeTab === "preview" && (
      <div id="resume-print-root">
      <div ref={printRef} id="resume-document" style={PAGE}>

        {/* HEADER */}
        <table style={{
          width: "100%", borderCollapse: "collapse", marginBottom: 8
        }}>
          <tbody>
            <tr>
              <td style={{
                width: "2cm", verticalAlign: "middle", paddingRight: 8
              }}>
                <img
                  src="/iitdh-logo.png"
                  alt="IIT Dharwad"
                  style={{ width: "1.6cm", height: "auto" }}
                  onError={(e) => {
                    const img = e.target as HTMLImageElement;
                    if (!img.src.includes("drive.google")) {
                      img.src =
                        "https://drive.google.com/uc?export=download&id=1MDKqBdYk8ZrMdG9ykiGAvXLPGm_GTni3";
                    } else {
                      img.style.display = "none";
                    }
                  }}
                />
              </td>
              <td style={{ verticalAlign: "middle", paddingLeft: 8 }}>
                <div style={{ fontWeight: "bold", fontSize: "12pt" }}>
                  {resume.contact.full_name}
                </div>
                <div style={{ fontWeight: "bold", fontSize: "10pt" }}>
                  CSE (Computer Science &amp; Engineering)
                </div>
              </td>
              <td style={{
                verticalAlign: "middle",
                textAlign: "right",
                fontSize: "9pt",
                fontWeight: "bold",
                whiteSpace: "nowrap",
              }}>
                <div>&#9993; {resume.contact.iit_email || resume.contact.email}</div>
                <div>&#9743; {resume.contact.phone}</div>
                <div><a href={resume.contact.github_url} style={LINK}>&#9651; GitHub Profile</a></div>
                <div><a href={resume.contact.linkedin_url} style={LINK}>in LinkedIn Profile</a></div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* EDUCATION TABLE */}
        <table style={{
          width: "100%",
          borderCollapse: "collapse",
          marginBottom: 6,
          fontSize: "10pt",
        }}>
          <thead>
            <tr style={{
              borderTop: "1px solid #000",
              borderBottom: "1px solid #000",
            }}>
              {["Examination","University","Institute","Year","CGPA"]
                .map((h) => (
                <th key={h} style={{
                  padding: "2px 8px",
                  textAlign: "left",
                  fontWeight: "bold",
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {resume.education.map((row, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #000" }}>
                <td style={EDU_TD}>{row.examination}</td>
                <td style={EDU_TD}>{row.university}</td>
                <td style={EDU_TD}>{row.institute}</td>
                <td style={EDU_TD}>{row.year}</td>
                <td style={EDU_TD}>{row.cgpa}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* TECHNICAL SKILLS */}
        <SecHead title="TECHNICAL SKILLS" />
        <ul style={LIST}>
          {Object.entries(resume.skill_categories).map(
            ([cat, skills]) => (
              <li key={cat} style={LI}>
                <strong>{cat}</strong>: {skills}
              </li>
            )
          )}
        </ul>

        {/* PERSONAL PROJECTS */}
        {resume.personal_projects.length > 0 && (
          <>
            <SecHead title="PERSONAL PROJECTS" />
            <ul style={LIST}>
              {resume.personal_projects.map((p, i) => (
                <ProjItem key={i} p={p} />
              ))}
            </ul>
          </>
        )}

        {/* WORK EXPERIENCE */}
        {resume.work_experience.length > 0 && (
          <>
            <SecHead title="WORK EXPERIENCE" />
            <ul style={LIST}>
              {resume.work_experience.map((e, i) => (
                <ExpItem key={i} e={e} />
              ))}
            </ul>
          </>
        )}

        {/* ACADEMIC PROJECTS */}
        {resume.academic_projects.length > 0 && (
          <>
            <SecHead title="ACADEMIC PROJECTS" />
            <ul style={LIST}>
              {resume.academic_projects.map((p, i) => (
                <ProjItem key={i} p={p} isAcademic />
              ))}
            </ul>
          </>
        )}

        {/* PUBLICATIONS */}
        {resume.publications.length > 0 && (
          <>
            <SecHead title="PUBLICATIONS" />
            <ul style={LIST}>
              {resume.publications.map((pub, i) => (
                <li key={i} style={LI}>{pub}</li>
              ))}
            </ul>
          </>
        )}

        {/* POSITIONS */}
        {resume.positions.length > 0 && (
          <>
            <SecHead title="POSITIONS OF RESPONSIBILITY" />
            <ul style={LIST}>
              {resume.positions.map((pos, i) => (
                <li key={i} style={LI}>{pos}</li>
              ))}
            </ul>
          </>
        )}

        {/* ACHIEVEMENTS */}
        {resume.achievements.length > 0 && (
          <>
            <SecHead title="ACHIEVEMENTS &amp; ACTIVITIES" />
            <ul style={LIST}>
              {resume.achievements.map((ach, i) => (
                <li key={i} style={LI}>{ach}</li>
              ))}
            </ul>
          </>
        )}

      </div>
      </div>
      )}

      {activeTab === "latex" && (
        <div style={{ borderRadius: 6, border: "1px solid #30363d", background: "#0d1117", padding: 16 }}>
          <textarea
            value={latexCode}
            onChange={(e) => setLatexCode(e.target.value)}
            spellCheck={false}
            style={{
              width: "100%",
              height: "70vh",
              background: "transparent",
              color: "#7ee787",
              fontFamily: "'Fira Code', 'Courier New', monospace",
              fontSize: 12,
              resize: "none",
              outline: "none",
              border: "none",
              lineHeight: 1.6,
            }}
          />
        </div>
      )}

      <style>{`
        @media print {
          * {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          @page { size: A4; margin: 0; }
          .no-print { display: none !important; }
          body * { visibility: hidden !important; }
          #resume-document {
            visibility: visible !important;
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 14mm !important;
            box-shadow: none !important;
            background: white !important;
          }
          #resume-document * { visibility: visible !important; }
        }
      `}</style>
    </>
  );
}

function SecHead({ title }: { title: string }) {
  return (
    <div
      className="section-head"
      style={{
        backgroundColor: "#999",
        padding: "2px 4px",
        marginTop: 6,
        marginBottom: 2,
      }}
    >
      <span style={{ fontWeight: "bold", fontSize: "10pt", color: "#000" }}>
        {title}
      </span>
    </div>
  );
}

function ProjItem({
  p,
  isAcademic = false,
}: {
  p: StructuredProject;
  isAcademic?: boolean;
}) {
  return (
    <li style={{ marginBottom: 6, listStyle: "none" }}>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
      }}>
        <span style={{ fontWeight: "bold", fontSize: "10pt" }}>
          {p.name}
          {isAcademic && p.context && (
            <span style={{ fontWeight: "normal" }}>
              &nbsp;&nbsp;{p.context}
            </span>
          )}
        </span>
        <em style={{ fontSize: "10pt", textAlign: "right" }}>
          {p.tech_stack}
        </em>
      </div>
      {isAcademic && p.guide && (
        <div style={{ fontSize: "10pt", fontStyle: "italic" }}>
          (Guide: <strong>{p.guide}</strong>)
        </div>
      )}
      <ul style={{ listStyle: "none", margin: 0, paddingLeft: 16 }}>
        {p.bullets.map((b, i) => (
          <li key={i} style={{ fontSize: "10pt", marginBottom: 1 }}>
            &#9702; {b}
          </li>
        ))}
      </ul>
      {(p.live_url || p.repo_url) && (
        <div style={{
          fontSize: "9pt", paddingLeft: 16, marginTop: 1
        }}>
          {p.live_url && (
            <span>
              Live:{" "}
              <a href={p.live_url} style={LINK}>{p.live_url}</a>
              &nbsp;&nbsp;
            </span>
          )}
          {p.repo_url && (
            <span>
              Repo:{" "}
              <a href={p.repo_url} style={LINK}>{p.repo_url}</a>
            </span>
          )}
        </div>
      )}
    </li>
  );
}

function ExpItem({ e }: { e: StructuredExperience }) {
  return (
    <li style={{ marginBottom: 6, listStyle: "none" }}>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
      }}>
        <strong style={{ fontSize: "10pt" }}>
          {e.company} ({e.role})
        </strong>
        <em style={{ fontSize: "10pt" }}>{e.duration}</em>
      </div>
      {e.guide && (
        <div style={{ fontSize: "10pt", fontStyle: "italic" }}>
          (Guide: <strong>{e.guide}</strong>)
        </div>
      )}
      <ul style={{ listStyle: "none", margin: 0, paddingLeft: 16 }}>
        {e.bullets.map((b, i) => (
          <li key={i} style={{ fontSize: "10pt", marginBottom: 1 }}>
            &#9702; {b}
          </li>
        ))}
      </ul>
    </li>
  );
}

const FONT =
  "'Palatino Linotype', 'Book Antiqua', Palatino, serif";

const PAGE: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: "10pt",
  lineHeight: 1.3,
  color: "#000",
  backgroundColor: "#fff",
  maxWidth: "210mm",
  margin: "0 auto",
  padding: "14mm",
  boxShadow: "0 0 8px rgba(0,0,0,0.15)",
};

const LINK: React.CSSProperties = {
  color: "#000",
  textDecoration: "none",
};

const EDU_TD: React.CSSProperties = {
  padding: "2px 8px",
  textAlign: "left",
  fontSize: "10pt",
};

const LIST: React.CSSProperties = {
  listStyle: "none",
  margin: 0,
  padding: "0 0 4px 8px",
};

const LI: React.CSSProperties = {
  fontSize: "10pt",
  marginBottom: 2,
};
