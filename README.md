# TailorMind

TailorMind is a targeted opportunity discovery and application engine. It pulls jobs from real listing APIs, researches each company deeply, scores fit against your profile, and generates a tailored resume, cover letter, and an application intelligence card you can paste into any application form. The goal is to take per-application prep from two hours down to under five minutes without auto-applying on your behalf.

## The Problem

Manual job searching forces you to choose between volume and quality. Generic mass applications get filtered out; deeply tailored ones take so long you can only manage a handful per week. The actual research, role mapping, and writing is mechanical work that a system should do, leaving the judgment calls to the human.

## What It Does

- Discovers jobs from Adzuna and Remotive matching your profile and preferences
- Researches each company deeply using RAG over scraped content (homepage, about, careers) with SHA-256 chunk integrity
- Scores your profile against each JD honestly across skills, experience, and education
- Generates a tailored resume, cover letter, and application intelligence card for any opportunity
- Exports PDFs and pre-fills every application form field so submitting takes minutes

## Architecture

- **Backend**: FastAPI, LangGraph orchestration, ChromaDB persistent vector store, LiteLLM provider abstraction
- **Models**: Gemini 2.5 Flash Lite (company research), Llama 3.3 70B via Groq (profile match, job filter, application card), Qwen3 32B via Groq (JD parsing), DeepSeek Chat via OpenRouter (resume, cover letter)
- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Storage**: ChromaDB for vectors, PostgreSQL via Supabase for the audit log, local JSON for profiles, instructions, and saved applications

## Local Setup

1. Clone the repo

   ```bash
   git clone https://github.com/NileshBarandwal/tailormind.git
   cd tailormind
   ```

2. Backend

   ```bash
   cd backend
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   playwright install chromium
   cd ..
   cp .env.example .env   # then fill in keys
   ```

3. Frontend

   ```bash
   cd frontend
   npm install
   cp .env.example .env.local   # only needed if pointing at a remote backend
   cd ..
   ```

4. Run the backend (from repo root)

   ```bash
   source backend/.venv/bin/activate
   uvicorn backend.api.main:app --reload --port 8000
   ```

5. Run the frontend (in a second terminal)

   ```bash
   cd frontend
   npm run dev
   ```

6. Open http://localhost:3000

## API Keys Required

| Service | Purpose | Free Tier |
| --- | --- | --- |
| Groq | JD parsing, profile match, job filter, application card | Yes |
| Google AI Studio | Company research (Gemini) | Yes |
| OpenRouter | Resume and cover letter (DeepSeek) | Yes |
| Adzuna | Job listings | Yes |
| Supabase | Audit log database | Yes |

## Project Structure

```
backend/
  agents/         JD parser, company researcher, profile matcher,
                  resume generator, cover letter generator,
                  job discovery, application card generator
  api/
    routes/       jobs, profile, applications, generate,
                  instructions, applications_store
  core/           config, model_router (LiteLLM), vector_store
                  (ChromaDB + SHA-256), orchestrator (LangGraph)
  models/         schemas (Pydantic)
  services/       audit_logger, pdf_generator (WeasyPrint)
  tests/          mocked + live integration tests

frontend/
  app/            dashboard, generate, profile, instructions
  components/     JobCard, ResumePreview, CoverLetterPreview,
                  ApplicationCardView, MatchScoreCard,
                  InstructionPanel, CopyButton, LoadingSpinner
  lib/api.ts      typed wrappers for every backend endpoint
  types/          TypeScript mirrors of backend schemas
```

## Resume Line

> Built TailorMind, a multi-agent job application system using LangGraph orchestration, RAG over scraped company data (ChromaDB, SHA-256 integrity), and 6 specialized LLM agents for JD parsing, company research, profile matching, resume generation, cover letter generation, and application card generation. Reduced per-application prep time from 2 hours to under 5 minutes.
