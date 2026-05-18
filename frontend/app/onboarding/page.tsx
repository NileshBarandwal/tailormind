"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { submitOnboarding } from "@/lib/api";
import { setActiveProfileId } from "@/lib/persistence";

// --- Types for form state ---
interface EduEntry {
  examination: string;
  university: string;
  institute: string;
  year: string;
  cgpa: string;
}

interface ExpEntry {
  company: string;
  role: string;
  duration: string;
  bullets: string[];
}

interface ProjEntry {
  name: string;
  tech_stack: string;
  category: "personal" | "academic";
  live_url: string;
  repo_url: string;
  bullets: string[];
}

interface SkillCat {
  category: string;
  skills: string;
}

const STEPS = ["Basic Info", "Education", "Skills", "Experience & Projects"];

function blankEdu(): EduEntry {
  return { examination: "", university: "", institute: "", year: "", cgpa: "" };
}
function blankExp(): ExpEntry {
  return { company: "", role: "", duration: "", bullets: ["", "", ""] };
}
function blankProj(): ProjEntry {
  return {
    name: "", tech_stack: "", category: "personal",
    live_url: "", repo_url: "", bullets: ["", "", ""],
  };
}
function blankSkillCat(): SkillCat {
  return { category: "", skills: "" };
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Step 1: Basic Info
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [iitEmail, setIitEmail] = useState("");
  const [summary, setSummary] = useState("");

  // Step 2: Education
  const [education, setEducation] = useState<EduEntry[]>([blankEdu()]);

  // Step 3: Skills
  const [skillCats, setSkillCats] = useState<SkillCat[]>([blankSkillCat()]);

  // Step 4: Experience & Projects
  const [experiences, setExperiences] = useState<ExpEntry[]>([blankExp()]);
  const [projects, setProjects] = useState<ProjEntry[]>([blankProj()]);

  function nextStep() {
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }
  function prevStep() {
    setStep((s) => Math.max(s - 1, 0));
  }

  async function handleSubmit() {
    if (!fullName.trim() || !email.trim()) {
      setSubmitError("Full name and email are required.");
      return;
    }
    setSubmitting(true);
    setSubmitError("");
    try {
      const payload = {
        full_name: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        github_url: githubUrl.trim(),
        linkedin_url: linkedinUrl.trim(),
        iit_email: iitEmail.trim(),
        summary: summary.trim(),
        education: education
          .filter((e) => e.examination.trim() || e.university.trim())
          .map((e) => ({
            ...e,
            year: parseInt(e.year) || 2024,
          })),
        skill_categories: Object.fromEntries(
          skillCats
            .filter((s) => s.category.trim() && s.skills.trim())
            .map((s) => [s.category.trim(), s.skills.trim()])
        ),
        work_experience: experiences
          .filter((e) => e.company.trim())
          .map((e) => ({
            ...e,
            guide: "",
            bullets: e.bullets.filter((b) => b.trim()),
          })),
        projects: projects
          .filter((p) => p.name.trim())
          .map((p) => ({
            ...p,
            bullets: p.bullets.filter((b) => b.trim()),
          })),
      };
      const { profile_id } = await submitOnboarding(payload);
      setActiveProfileId(profile_id);
      router.replace("/dashboard");
    } catch (e) {
      setSubmitError(
        e instanceof Error ? e.message : "Failed to save profile."
      );
    } finally {
      setSubmitting(false);
    }
  }

  // --- Render helpers ---

  function StepIndicator() {
    return (
      <div style={{ display: "flex", gap: 8, marginBottom: 28 }}>
        {STEPS.map((label, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 28, height: 28, borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 13, fontWeight: 700,
              background: i < step ? "#22c55e" : i === step ? "#3b82f6" : "#e2e8f0",
              color: i <= step ? "white" : "#94a3b8",
            }}>
              {i < step ? "✓" : i + 1}
            </div>
            <span style={{
              fontSize: 13,
              color: i === step ? "#1e40af" : i < step ? "#15803d" : "#94a3b8",
              fontWeight: i === step ? 600 : 400,
            }}>
              {label}
            </span>
            {i < STEPS.length - 1 && (
              <div style={{
                width: 24, height: 1,
                background: i < step ? "#22c55e" : "#e2e8f0",
              }} />
            )}
          </div>
        ))}
      </div>
    );
  }

  function inputStyle(width = "100%"): React.CSSProperties {
    return {
      width, padding: "7px 10px", borderRadius: 5,
      border: "1px solid #cbd5e1", fontSize: 13,
      outline: "none", boxSizing: "border-box",
    };
  }

  function labelStyle(): React.CSSProperties {
    return { fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 3, display: "block" };
  }

  function addBtn(onClick: () => void, label = "+ Add") {
    return (
      <button type="button" onClick={onClick} style={{
        fontSize: 12, color: "#3b82f6", background: "none",
        border: "none", cursor: "pointer", padding: "4px 0",
      }}>
        {label}
      </button>
    );
  }

  function removeBtn(onClick: () => void) {
    return (
      <button type="button" onClick={onClick} style={{
        fontSize: 12, color: "#ef4444", background: "none",
        border: "none", cursor: "pointer", padding: "2px 6px",
      }}>
        ✕
      </button>
    );
  }

  // --- Step renderers ---

  function renderStep1() {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={labelStyle()}>Full Name *</label>
            <input style={inputStyle()} value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nilesh Barandwal" />
          </div>
          <div>
            <label style={labelStyle()}>Email *</label>
            <input style={inputStyle()} value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com" />
          </div>
          <div>
            <label style={labelStyle()}>Phone</label>
            <input style={inputStyle()} value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98765 43210" />
          </div>
          <div>
            <label style={labelStyle()}>Institute Email (optional)</label>
            <input style={inputStyle()} value={iitEmail}
              onChange={(e) => setIitEmail(e.target.value)}
              placeholder="you@iitdh.ac.in" />
          </div>
          <div>
            <label style={labelStyle()}>GitHub URL</label>
            <input style={inputStyle()} value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              placeholder="https://github.com/username" />
          </div>
          <div>
            <label style={labelStyle()}>LinkedIn URL</label>
            <input style={inputStyle()} value={linkedinUrl}
              onChange={(e) => setLinkedinUrl(e.target.value)}
              placeholder="https://linkedin.com/in/username" />
          </div>
        </div>
        <div>
          <label style={labelStyle()}>Summary (optional)</label>
          <textarea
            style={{ ...inputStyle(), height: 72, resize: "vertical" }}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Brief professional summary..." />
        </div>
      </div>
    );
  }

  function renderStep2() {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>
          Add your education history. Example: Masters, IIT Dharwad, 2026, 8.15
        </p>
        {education.map((edu, i) => (
          <div key={i} style={{
            border: "1px solid #e2e8f0", borderRadius: 6,
            padding: "12px 14px", position: "relative",
          }}>
            <div style={{ position: "absolute", top: 8, right: 8 }}>
              {education.length > 1 && removeBtn(() =>
                setEducation(education.filter((_, j) => j !== i))
              )}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={labelStyle()}>Examination</label>
                <input style={inputStyle()} value={edu.examination}
                  onChange={(e) => {
                    const copy = [...education];
                    copy[i] = { ...copy[i], examination: e.target.value };
                    setEducation(copy);
                  }}
                  placeholder="Masters / Graduation / Intermediate" />
              </div>
              <div>
                <label style={labelStyle()}>University</label>
                <input style={inputStyle()} value={edu.university}
                  onChange={(e) => {
                    const copy = [...education];
                    copy[i] = { ...copy[i], university: e.target.value };
                    setEducation(copy);
                  }}
                  placeholder="IIT Dharwad" />
              </div>
              <div>
                <label style={labelStyle()}>Institute</label>
                <input style={inputStyle()} value={edu.institute}
                  onChange={(e) => {
                    const copy = [...education];
                    copy[i] = { ...copy[i], institute: e.target.value };
                    setEducation(copy);
                  }}
                  placeholder="IIT Dharwad" />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div>
                  <label style={labelStyle()}>Year</label>
                  <input style={inputStyle()} value={edu.year}
                    onChange={(e) => {
                      const copy = [...education];
                      copy[i] = { ...copy[i], year: e.target.value };
                      setEducation(copy);
                    }}
                    placeholder="2026" />
                </div>
                <div>
                  <label style={labelStyle()}>CGPA / %</label>
                  <input style={inputStyle()} value={edu.cgpa}
                    onChange={(e) => {
                      const copy = [...education];
                      copy[i] = { ...copy[i], cgpa: e.target.value };
                      setEducation(copy);
                    }}
                    placeholder="8.15" />
                </div>
              </div>
            </div>
          </div>
        ))}
        {addBtn(() => setEducation([...education, blankEdu()]), "+ Add education")}
      </div>
    );
  }

  function renderStep3() {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>
          Add skill categories. Each category has a name and a comma-separated list of skills.
        </p>
        {skillCats.map((sc, i) => (
          <div key={i} style={{
            border: "1px solid #e2e8f0", borderRadius: 6,
            padding: "12px 14px", position: "relative",
          }}>
            <div style={{ position: "absolute", top: 8, right: 8 }}>
              {skillCats.length > 1 && removeBtn(() =>
                setSkillCats(skillCats.filter((_, j) => j !== i))
              )}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10 }}>
              <div>
                <label style={labelStyle()}>Category</label>
                <input style={inputStyle()} value={sc.category}
                  onChange={(e) => {
                    const copy = [...skillCats];
                    copy[i] = { ...copy[i], category: e.target.value };
                    setSkillCats(copy);
                  }}
                  placeholder="AI & ML" />
              </div>
              <div>
                <label style={labelStyle()}>Skills (comma-separated)</label>
                <input style={inputStyle()} value={sc.skills}
                  onChange={(e) => {
                    const copy = [...skillCats];
                    copy[i] = { ...copy[i], skills: e.target.value };
                    setSkillCats(copy);
                  }}
                  placeholder="Python, TensorFlow, PyTorch, Scikit-learn" />
              </div>
            </div>
          </div>
        ))}
        {addBtn(() => setSkillCats([...skillCats, blankSkillCat()]), "+ Add category")}
      </div>
    );
  }

  function renderStep4() {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: "#1e293b", margin: "0 0 12px" }}>
            Work Experience
          </h3>
          {experiences.map((exp, i) => (
            <div key={i} style={{
              border: "1px solid #e2e8f0", borderRadius: 6,
              padding: "12px 14px", marginBottom: 12, position: "relative",
            }}>
              <div style={{ position: "absolute", top: 8, right: 8 }}>
                {experiences.length > 1 && removeBtn(() =>
                  setExperiences(experiences.filter((_, j) => j !== i))
                )}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
                <div>
                  <label style={labelStyle()}>Company</label>
                  <input style={inputStyle()} value={exp.company}
                    onChange={(e) => {
                      const copy = [...experiences];
                      copy[i] = { ...copy[i], company: e.target.value };
                      setExperiences(copy);
                    }}
                    placeholder="Avegen India" />
                </div>
                <div>
                  <label style={labelStyle()}>Role</label>
                  <input style={inputStyle()} value={exp.role}
                    onChange={(e) => {
                      const copy = [...experiences];
                      copy[i] = { ...copy[i], role: e.target.value };
                      setExperiences(copy);
                    }}
                    placeholder="Software Developer" />
                </div>
                <div>
                  <label style={labelStyle()}>Duration</label>
                  <input style={inputStyle()} value={exp.duration}
                    onChange={(e) => {
                      const copy = [...experiences];
                      copy[i] = { ...copy[i], duration: e.target.value };
                      setExperiences(copy);
                    }}
                    placeholder="Aug'21–Apr'22" />
                </div>
              </div>
              <label style={labelStyle()}>Key bullets (up to 3)</label>
              {exp.bullets.map((b, j) => (
                <input key={j} style={{ ...inputStyle(), marginBottom: 6 }}
                  value={b}
                  onChange={(e) => {
                    const copy = [...experiences];
                    copy[i] = {
                      ...copy[i],
                      bullets: copy[i].bullets.map((x, k) =>
                        k === j ? e.target.value : x
                      ),
                    };
                    setExperiences(copy);
                  }}
                  placeholder={`Bullet ${j + 1}`} />
              ))}
            </div>
          ))}
          {addBtn(() => setExperiences([...experiences, blankExp()]), "+ Add experience")}
        </div>

        <div>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: "#1e293b", margin: "0 0 12px" }}>
            Projects
          </h3>
          {projects.map((proj, i) => (
            <div key={i} style={{
              border: "1px solid #e2e8f0", borderRadius: 6,
              padding: "12px 14px", marginBottom: 12, position: "relative",
            }}>
              <div style={{ position: "absolute", top: 8, right: 8 }}>
                {projects.length > 1 && removeBtn(() =>
                  setProjects(projects.filter((_, j) => j !== i))
                )}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1fr", gap: 10, marginBottom: 10 }}>
                <div>
                  <label style={labelStyle()}>Project Name</label>
                  <input style={inputStyle()} value={proj.name}
                    onChange={(e) => {
                      const copy = [...projects];
                      copy[i] = { ...copy[i], name: e.target.value };
                      setProjects(copy);
                    }}
                    placeholder="TailorMind" />
                </div>
                <div>
                  <label style={labelStyle()}>Tech Stack</label>
                  <input style={inputStyle()} value={proj.tech_stack}
                    onChange={(e) => {
                      const copy = [...projects];
                      copy[i] = { ...copy[i], tech_stack: e.target.value };
                      setProjects(copy);
                    }}
                    placeholder="FastAPI, Next.js, LangChain" />
                </div>
                <div>
                  <label style={labelStyle()}>Type</label>
                  <select
                    style={{ ...inputStyle(), cursor: "pointer" }}
                    value={proj.category}
                    onChange={(e) => {
                      const copy = [...projects];
                      copy[i] = {
                        ...copy[i],
                        category: e.target.value as "personal" | "academic",
                      };
                      setProjects(copy);
                    }}
                  >
                    <option value="personal">Personal</option>
                    <option value="academic">Academic</option>
                  </select>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                <div>
                  <label style={labelStyle()}>Live URL (optional)</label>
                  <input style={inputStyle()} value={proj.live_url}
                    onChange={(e) => {
                      const copy = [...projects];
                      copy[i] = { ...copy[i], live_url: e.target.value };
                      setProjects(copy);
                    }}
                    placeholder="https://myproject.vercel.app" />
                </div>
                <div>
                  <label style={labelStyle()}>Repo URL (optional)</label>
                  <input style={inputStyle()} value={proj.repo_url}
                    onChange={(e) => {
                      const copy = [...projects];
                      copy[i] = { ...copy[i], repo_url: e.target.value };
                      setProjects(copy);
                    }}
                    placeholder="https://github.com/username/project" />
                </div>
              </div>
              <label style={labelStyle()}>Key bullets (up to 3)</label>
              {proj.bullets.map((b, j) => (
                <input key={j} style={{ ...inputStyle(), marginBottom: 6 }}
                  value={b}
                  onChange={(e) => {
                    const copy = [...projects];
                    copy[i] = {
                      ...copy[i],
                      bullets: copy[i].bullets.map((x, k) =>
                        k === j ? e.target.value : x
                      ),
                    };
                    setProjects(copy);
                  }}
                  placeholder={`Bullet ${j + 1}`} />
              ))}
            </div>
          ))}
          {addBtn(() => setProjects([...projects, blankProj()]), "+ Add project")}
        </div>
      </div>
    );
  }

  const stepContent = [renderStep1, renderStep2, renderStep3, renderStep4];

  return (
    <div style={{
      maxWidth: 720, margin: "0 auto", padding: "40px 20px",
      fontFamily: "system-ui, -apple-system, sans-serif",
    }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#0f172a", margin: "0 0 6px" }}>
          Set up your TailorMind profile
        </h1>
        <p style={{ fontSize: 14, color: "#64748b", margin: 0 }}>
          This takes about 5 minutes. You can edit everything later.
        </p>
      </div>

      <StepIndicator />

      <div style={{
        background: "white", border: "1px solid #e2e8f0",
        borderRadius: 10, padding: "24px 28px", marginBottom: 24,
      }}>
        <h2 style={{
          fontSize: 16, fontWeight: 600, color: "#1e293b",
          margin: "0 0 20px",
        }}>
          {STEPS[step]}
        </h2>
        {stepContent[step]()}
      </div>

      {submitError && (
        <p style={{ color: "#dc2626", fontSize: 13, marginBottom: 12 }}>
          {submitError}
        </p>
      )}

      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <button
          type="button"
          onClick={prevStep}
          disabled={step === 0}
          style={{
            padding: "8px 20px", borderRadius: 5, fontSize: 14,
            border: "1px solid #cbd5e1", background: "white",
            color: step === 0 ? "#94a3b8" : "#374151",
            cursor: step === 0 ? "default" : "pointer",
          }}
        >
          Back
        </button>
        {step < STEPS.length - 1 ? (
          <button
            type="button"
            onClick={nextStep}
            style={{
              padding: "8px 20px", borderRadius: 5, fontSize: 14,
              background: "#3b82f6", color: "white", border: "none",
              cursor: "pointer", fontWeight: 500,
            }}
          >
            Continue →
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            style={{
              padding: "8px 20px", borderRadius: 5, fontSize: 14,
              background: submitting ? "#93c5fd" : "#22c55e",
              color: "white", border: "none",
              cursor: submitting ? "default" : "pointer",
              fontWeight: 500,
            }}
          >
            {submitting ? "Saving..." : "Finish setup →"}
          </button>
        )}
      </div>
    </div>
  );
}
