# TailorMind

TailorMind is a targeted opportunity discovery and application engine. It pulls jobs from real listing APIs, researches each company deeply, scores fit against your profile, and generates a tailored resume, cover letter, and application intelligence card you can paste into any application form. The goal is to take per-application prep from two hours down to under five minutes without auto-applying on your behalf.

**Live demo**: https://tailormind-ebon.vercel.app

## What It Does

- Discovers jobs from Adzuna matching your profile and preferences
- Researches each company deeply using RAG over scraped content (homepage, about, careers) with SHA-256 chunk integrity
- Scores your profile against each JD honestly across skills, experience, and education
- Generates a tailored resume, cover letter, and application intelligence card for any opportunity
- Exports PDF-ready resumes with a WYSIWYG HTML preview and LaTeX/Overleaf tab
- SSE-based real-time progress indicator during generation
- First-run onboarding flow — no JSON files to edit manually

## Architecture

- **Backend**: FastAPI, LangGraph orchestration, ChromaDB persistent vector store, LiteLLM provider abstraction
- **Models**: Gemini 2.5 Flash Lite (company research), Llama 3.3 70B via Groq (all generation tasks), with chained fallback across Gemini 2.0 Flash → Llama 3.1 8B → Mixtral 8x7B
- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Storage**: ChromaDB for vectors, local JSON for profiles, instructions, and saved applications

## Local Setup

1. Clone the repo

```bash
git clone https://github.com/NileshBarandwal/tailormind.git
cd tailormind
```

2. Backend

```bash
python3 -m venv backend/.venv
source backend/.venv/bin/activate
pip install -r backend/requirements.txt
cp .env.example .env
# Fill in your API keys in .env
```

3. Frontend

```bash
cd frontend
npm install
cd ..
```

4. Run

```bash
# Terminal 1 — backend
source backend/.venv/bin/activate
uvicorn backend.api.main:app --reload --port 8000

# Terminal 2 — frontend
cd frontend && npm run dev
```

5. Open http://localhost:3000 — first visit redirects to onboarding

## Running Tests

```bash
source backend/.venv/bin/activate
python -m pytest backend/tests/ -v -m "not live"
```

## Deployment

### Backend → Render

1. Go to render.com → New → Web Service
2. Connect your GitHub repo
3. Configure:

| Setting | Value |
|---|---|
| Root Directory | `backend` |
| Build Command | `pip install -r requirements.txt` |
| Start Command | `uvicorn api.main:app --host 0.0.0.0 --port $PORT` |

4. Add environment variables:

| Variable | Value |
|---|---|
| GROQ_API_KEY | your key |
| GOOGLE_API_KEY | your key |
| ADZUNA_APP_ID | your key |
| ADZUNA_APP_KEY | your key |
| ALLOWED_ORIGINS | https://tailormind-ebon.vercel.app |

5. Deploy. Health check: `https://tailormind.onrender.com/health`

> **Keep-alive**: Render's free tier sleeps after 15 minutes of inactivity. Set up a free monitor at uptimerobot.com to ping `/health` every 5 minutes.

### Frontend → Vercel

1. Connect your GitHub repo to Vercel
2. Set the root directory to `frontend`
3. Add this environment variable:

| Variable | Value |
|---|---|
| NEXT_PUBLIC_API_URL | https://tailormind.onrender.com |

4. Deploy. The Next.js proxy in `next.config.mjs` routes `/api/*` to your Render backend automatically.

## API Keys

| Service | Purpose | Free Tier | Required |
|---|---|---|---|
| Groq | All LLM generation tasks | Yes | Yes |
| Google AI Studio | Company research (Gemini) | Yes | Yes |
| Adzuna | Job listings | Yes | Yes |
| OpenRouter | Fallback only | Yes | No |
| Supabase | Audit log database | Yes | No |

## Environment Variables

### Backend (.env)

| Variable | Purpose | Required |
|---|---|---|
| GROQ_API_KEY | Groq LLM API | Yes |
| GOOGLE_API_KEY | Gemini API | Yes |
| ADZUNA_APP_ID | Adzuna job search | Yes |
| ADZUNA_APP_KEY | Adzuna job search | Yes |
| ALLOWED_ORIGINS | CORS allowed origins (comma-separated) | Production |
| OPENROUTER_API_KEY | OpenRouter fallback | No |
| SUPABASE_DB_URL | Supabase audit log | No |

### Frontend (.env.local)

| Variable | Purpose | Required |
|---|---|---|
| NEXT_PUBLIC_API_URL | Render backend URL | Production only |

## Project Structure

```
backend/
agents/         JD parser, company researcher, profile matcher,
                resume/cover letter generators, job discovery,
                application card generator, structured resume generator
api/routes/     jobs, profile, applications, generate, instructions
core/           config, model_router (LiteLLM + fallback chain),
                vector_store (ChromaDB + SHA-256)
models/         Pydantic schemas
services/       audit_logger, pdf_generator
tests/          mocked + live integration tests
frontend/
app/            dashboard, generate, profile, instructions, onboarding
components/     JobCard, ResumePreview, CoverLetterPreview,
                ApplicationCardView, MatchScoreCard, InstructionPanel,
                GenerationProgress, StructuredResumePreview, KeepAlive
lib/            api.ts, persistence.ts, errorMessage.ts
types/          TypeScript mirrors of backend schemas
```

## Known Limitations

- Single-user profile system — no authentication or multi-user support yet
- Render free tier cold starts — first request after inactivity takes 30–60 seconds (mitigated by UptimeRobot keepalive)
- Company research requires a valid website URL — scraping may fail on heavily JS-rendered pages
- LaTeX export requires uploading `iitdh-logo.png` to Overleaf project root for the logo to render

## Resume Line

> Built TailorMind, a multi-agent job application system using LangGraph orchestration, RAG over scraped company data (ChromaDB, SHA-256 integrity), LiteLLM abstraction layer with 5-model fallback chain, and 7 specialized LLM agents for JD parsing, company research, profile matching, resume/cover letter generation, and application card generation. Reduced per-application prep time from 2 hours to under 5 minutes.
