# TailorMind

**AI-powered Job Application Copilot**

TailorMind helps you discover jobs, generate fact-grounded tailored resumes, track every version you submit, and learn which applications get responses over time.

**Live demo**: [tailormind-ebon.vercel.app](https://tailormind-ebon.vercel.app) · **Backend**: [tailormind.onrender.com/health](https://tailormind.onrender.com/health)

---

## Screenshots

<!-- Add screenshots after taking them -->
| Dashboard | Resume Preview | Version History |
|---|---|---|
| ![Dashboard](docs/screenshots/dashboard.png) | ![Resume Preview](docs/screenshots/resume_preview.png) | ![Version History](docs/screenshots/version_history.png) |

---

## Why I Built This

Job seekers repeatedly rewrite the same resume, track multiple versions manually across spreadsheets, and forget which resume was submitted to which company. After observing this pattern, I wanted to build a workflow-centric system — not just a resume generator — that combines intelligent resume tailoring, version tracking, and application outcome insights in one place. The goal was to take per-application prep from two hours to under five minutes, without auto-applying on my behalf.

---

## The Problem

Applying to jobs is repetitive. For every role you need to:

- Analyze the JD and identify what matters
- Tailor your resume to match it without fabricating anything
- Write a cover letter
- Track which version you submitted where
- Remember what worked

TailorMind automates this workflow.

---

## Core Workflow

```
Discover Job (Adzuna / Remotive)
        ↓
Score JD fit against your profile
        ↓
Apply tailoring preferences
        ↓
Generate Structured Resume  ←  select → rewrite (fact-grounded)
        ↓
Preview (HTML) · Export (LaTeX / PDF)
        ↓
Save version · Track outcome (Applied → Interview → Offer)
        ↓
View insights: applied rate, interview rate, top projects
```

---

## Tech Highlights

- FastAPI + Next.js 14 full-stack architecture
- Multi-agent AI pipeline for resume generation and job analysis
- StructuredResume JSON as a single source of truth
- Immutable version snapshots with outcome tracking
- ChromaDB-backed company research with SHA-256 chunk integrity
- Streaming generation with real-time SSE progress updates

---

## Features

### Resume Intelligence
- **Fact-grounded Structured Resume generation** — two-step pipeline: selects the most relevant content for the role, then rewrites it. No invented tools, metrics, or context.
- **Tailoring preferences and ATS optimization** — chip UI (Emphasize backend, Prioritize AI, Keep concise, Strong ATS optimization, etc.) compiles into instructions for the generation pipeline
- **JD keyword coverage visibility** — shows which JD keywords appear in the resume and which are missing
- **PDF and LaTeX export** — browser print-to-PDF from the WYSIWYG preview, or one-click export to Overleaf for publication-grade output

### Application Tracking
- **Resume versioning** — every generation auto-saves an immutable snapshot. Multiple versions per job, tracked separately.
- **Outcome tracking** — mark versions as Applied → Interview → Rejected → Offer
- **Notes and restore** — record why you regenerated, restore any version as a working draft
- **Insights** — applied rate, interview rate, and top-performing projects across all applications

### Profile Management
- **Knowledge pool editing** — edit Work Experience, Projects, Academic Projects, Education, and Skills directly in the UI. No JSON files.
- **Pool-format architecture** — profile edits affect future generations only. Existing version snapshots remain reproducible.

### Job Discovery
- **Adzuna and Remotive integration** — real job listings by role and location
- **Match scoring** — honest fit score across skills, experience, and education with matched/missing skills breakdown
- **Role presets** — quick-select common engineering roles

---

## Resume Pipeline

Unlike template-based resume builders that rewrite an entire resume from scratch, TailorMind first selects the most relevant content from a reusable knowledge pool and then rewrites only the selected content. This improves consistency, reduces hallucination risk, and allows resume versions to remain reproducible.

```
Profile Pool
(work_experience, projects, academic_projects, skills)
        ↓
Step 1: Selection Agent
  — reads JD requirements against full profile pool
  — selects the most relevant items for this specific role
  — enforces bullet budget per section
        ↓
Step 2: Fact-Grounded Rewrite Agent
  — rewrites selected bullets to reframe emphasis for the role
  — strict rules: no invented tools, metrics, or context
  — tailoring preferences applied here
        ↓
StructuredResume JSON  (immutable snapshot, source of truth)
  ├── HTML renderer  →  WYSIWYG preview + browser PDF
  └── LaTeX renderer →  Overleaf export
```

Version safety: the StructuredResume snapshot is stored at generation time. Editing your profile or preferences affects future generations only — old versions always reproduce from their stored snapshot.

---

## Architecture

```
Frontend (Next.js 14 + TypeScript)
        ↓  NEXT_PUBLIC_API_URL proxy
Backend (FastAPI)
        ↓
Agents
  ├── JDParser                     — extracts requirements from JD text
  ├── CompanyResearcher            — scrapes and summarizes company context
  ├── ProfileMatcher               — scores profile against JD
  ├── StructuredResumeGenerator    — two-step selection + rewrite
  ├── CoverLetterGenerator
  ├── ApplicationCardGenerator
  └── JobDiscovery                 — Adzuna + Remotive APIs
        ↓
Storage
  ├── ChromaDB            — vector store for company research (SHA-256 chunk integrity)
  ├── data/profiles/      — pool-format JSON per user
  ├── data/versions/      — immutable resume version snapshots
  └── data/applications/  — saved application records
```

**Model stack:**

| Task | Model |
|---|---|
| Resume generation, cover letter, application card | Llama 3.3 70B via Groq |
| Company research | Gemini 2.5 Flash Lite |
| Fallback chain | Gemini 2.0 Flash → Llama 3.1 8B → Mixtral 8x7B |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| Backend | FastAPI, Python 3.11 |
| LLM abstraction | LiteLLM |
| Vector store | ChromaDB |
| Job APIs | Adzuna, Remotive |
| Frontend hosting | Vercel |
| Backend hosting | Render |

---

## Local Setup

### 1. Clone

```bash
git clone https://github.com/NileshBarandwal/tailormind.git
cd tailormind
```

### 2. Backend

```bash
python3 -m venv backend/.venv
source backend/.venv/bin/activate
pip install -r backend/requirements.txt
cp .env.example .env
# Fill in your API keys in .env
```

### 3. Frontend

```bash
cd frontend && npm install && cd ..
```

### 4. Run

```bash
# Terminal 1
source backend/.venv/bin/activate
uvicorn backend.api.main:app --reload --port 8000

# Terminal 2
cd frontend && npm run dev
```

Open `http://localhost:3000` — first visit redirects to onboarding.

### 5. Tests

```bash
source backend/.venv/bin/activate
python -m pytest backend/tests/ -v -m "not live"
```

---

## Deployment

### Backend → Render

1. New Web Service → connect your GitHub repo
2. Configure:

| Setting | Value |
|---|---|
| Root Directory | `backend` |
| Build Command | `pip install -r requirements.txt` |
| Start Command | `uvicorn api.main:app --host 0.0.0.0 --port $PORT` |

3. Environment variables:

| Variable | Required |
|---|---|
| `GROQ_API_KEY` | Yes |
| `GOOGLE_API_KEY` | Yes |
| `ADZUNA_APP_ID` | Yes |
| `ADZUNA_APP_KEY` | Yes |
| `ALLOWED_ORIGINS` | Yes — your Vercel URL |
| `OPENROUTER_API_KEY` | No — fallback only |
| `SUPABASE_DB_URL` | No — audit logging only |

> **Free tier note:** Render free instances sleep after 15 minutes of inactivity. The frontend pings `/health` every 4 minutes during active sessions. For always-on uptime, add an external monitor (e.g. UptimeRobot) pinging `/health` every 5 minutes.

### Frontend → Vercel

1. Connect GitHub repo → set root directory to `frontend`
2. Add environment variable: `NEXT_PUBLIC_API_URL` = your Render backend URL
3. Deploy. The `next.config.mjs` proxy routes `/api/*` to your backend.

---

## API Keys

| Service | Purpose | Free Tier | Required |
|---|---|---|---|
| Groq | All LLM generation | Yes | Yes |
| Google AI Studio | Company research | Yes | Yes |
| Adzuna | Job listings | Yes | Yes |
| OpenRouter | LLM fallback | Yes | No |
| Supabase | Audit logging | Yes | No |

---

## Project Structure

```
backend/
  agents/
    jd_parser.py
    company_researcher.py
    profile_matcher.py
    structured_resume_generator.py   ← core pipeline
    cover_letter_generator.py
    application_card_generator.py
    job_discovery.py
  api/routes/
    generate.py          — structured resume stream, cover letter, card
    profile.py           — pool GET/PATCH
    versions.py          — versioning, outcome tracking, insights
    applications_store.py
    applications.py      — match scoring
    jobs.py
    instructions.py
  core/
    model_router.py      — LiteLLM + fallback chain
    vector_store.py      — ChromaDB + SHA-256
  models/schemas.py

frontend/
  app/
    dashboard/           — discovery + generation + version history
    generate/            — manual JD paste flow
    profile/             — knowledge pool editing
    instructions/
    onboarding/
  components/
    StructuredResumePreview.tsx   — HTML preview + LaTeX + PDF export
    ResumeVersionHistory.tsx      — versions, outcomes, notes, insights
    GenerationProgress.tsx
    profile/                      — 7 section components
  lib/
    api.ts
    persistence.ts       — localStorage helpers + jobKey
    tailoring.ts         — chip definitions + compose function
    errorMessage.ts
```

---

## Known Limitations

- **Single-user** — no authentication or multi-user support. Profile data is stored on the server filesystem.
- **localStorage session state** — generated resumes persist per job URL in the browser. Clearing localStorage resets the cache (version history on the server is unaffected).
- **Render free tier cold starts** — backend may take 30–60 seconds to wake from sleep on first request.
- **No auto-apply** — TailorMind generates application materials but does not submit applications. Intentional.
- **Job discovery scope** — currently limited to Adzuna (India) and Remotive (remote).

---

## Project Status

**Active Development**

**Completed:**
- ✓ Structured Resume pipeline (two-step selection + fact-grounded rewrite)
- ✓ Resume versioning with immutable snapshots
- ✓ Outcome tracking (Applied / Interview / Rejected / Offer)
- ✓ Profile knowledge pool editing
- ✓ Guided tailoring preferences (chip UI)
- ✓ JD keyword visibility in preview
- ✓ LaTeX export to Overleaf
- ✓ Version restore and notes
- ✓ Insights (applied rate, interview rate, top projects)
- ✓ First-run onboarding

**Planned (post real-usage validation):**
- Resume comparison view
- ATS coverage visualization
- Project pinning (always include specific projects)
- Interview-rate insights by role type
- Application timeline view

---

*Built by [Nilesh Rohidas Barandwal](https://github.com/NileshBarandwal) — M.Tech CSE, IIT Dharwad*
