"use client";
import { useRef } from "react";
import type {
  StructuredProject,
  StructuredExperience,
  StructuredResume,
} from "@/types";

interface Props {
  resume: StructuredResume;
}

export default function StructuredResumePreview({ resume }: Props) {
  const printRef = useRef<HTMLDivElement>(null);

  function handlePrint() {
    window.print();
  }

  return (
    <>
      <div className="no-print mb-4 flex items-center gap-3">
        <button
          onClick={handlePrint}
          className="rounded bg-slate-900 px-4 py-2 text-sm
            font-medium text-white hover:bg-slate-700"
        >
          Export as PDF
        </button>
        <p className="text-xs text-slate-500">
          Press Cmd+P / Ctrl+P → Save as PDF.
          What you see is exactly what you get.
        </p>
      </div>

      <div ref={printRef} id="resume-document" style={PAGE}>

        {/* HEADER */}
        <table style={{
          width: "100%", borderCollapse: "collapse", marginBottom: 8
        }}>
          <tbody>
            <tr>
              <td style={{
                width: "2.4cm", verticalAlign: "middle", paddingRight: 8
              }}>
                <img
                  src="https://upload.wikimedia.org/wikipedia/en/thumb/5/5b/IIT_Dharwad_logo.png/120px-IIT_Dharwad_logo.png"
                  alt="IIT Dharwad"
                  style={{ width: "1.8cm", height: "auto" }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
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
                <div style={{ fontSize: "9pt", fontWeight: "bold" }}>
                  <a href={resume.contact.github_url} style={LINK}>
                    &#9651; GitHub
                  </a>
                  &nbsp;&nbsp;
                  <a href={resume.contact.linkedin_url} style={LINK}>
                    in LinkedIn
                  </a>
                </div>
              </td>
              <td style={{
                verticalAlign: "middle",
                textAlign: "right",
                fontSize: "9pt",
                fontWeight: "bold",
                whiteSpace: "nowrap",
              }}>
                <div>
                  &#9993; {resume.contact.iit_email || resume.contact.email}
                </div>
                <div>&#9743; {resume.contact.phone}</div>
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
              <tr
                key={i}
                style={
                  i === resume.education.length - 1
                    ? { borderBottom: "1px solid #000" }
                    : {}
                }
              >
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

        {/* PAGE BREAK */}
        <div style={{ pageBreakAfter: "always" }} />

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

      <style>{`
        @media print {
          .no-print { display: none !important; }
          nav, header, aside, footer { display: none !important; }
          body * { visibility: hidden; }
          #resume-document,
          #resume-document * { visibility: visible; }
          #resume-document {
            position: absolute;
            left: 0; top: 0;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            max-width: 100% !important;
          }
          @page { size: A4; margin: 14mm; }
        }
      `}</style>
    </>
  );
}

function SecHead({ title }: { title: string }) {
  return (
    <div style={{
      backgroundColor: "#bfbfbf",
      padding: "2px 4px",
      marginTop: 6,
      marginBottom: 2,
    }}>
      <span style={{ fontWeight: "bold", fontSize: "10pt" }}>
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
