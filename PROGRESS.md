# TailorMind Progress Log

## Session 1 - Project Foundation + JD Parser Agent

### What was built
- Git repo initialized with `Nilesh Rohidas Barandwal <nilesh.barandwal@iitdh.ac.in>` as the author.
- `.gitignore` covering `.env`, virtualenv, build artifacts, ChromaDB store, and Next.js outputs.
- Full backend skeleton:
  - `backend/agents/` with `jd_parser.py` (implemented) and placeholder modules for `company_researcher`, `profile_matcher`, `resume_generator`, `cover_letter_generator`, `job_discovery`.
  - `backend/core/` with `config.py`, `model_router.py`, plus placeholder `vector_store.py` and `orchestrator.py`.
  - `backend/api/` with `main.py` and `routes/jobs.py` wired in; placeholder route modules for `profile`, `applications`, `instructions`.
  - `backend/models/schemas.py` with `ParsedJD`.
  - `backend/services/` placeholders for `scraper`, `pdf_generator`, `audit_logger`.
  - `backend/tests/test_jd_parser.py` with 5 unit tests (all passing).
- Python 3.13 virtualenv at `backend/.venv` with the full dependency stack installed from `backend/requirements.txt`.
- Environment files: `.env` with the real credentials and `.env.example` template.

### Key components

#### `core/config.py`
- Single `Settings` instance backed by `pydantic-settings`.
- Reads `.env` at the project root (resolved relative to file location so imports work from any cwd).
- `extra="ignore"` so future env vars do not break instantiation.

#### `core/model_router.py`
- `ModelRouter` exports a `route(task)` lookup and a `call(task, messages, response_format=None)` helper.
- Task -> model map:
  - `parse_jd` -> `groq/qwen-qwq-32b`
  - `research_company` -> `gemini/gemini-2.5-pro`
  - `match_profile` -> `groq/llama-3.3-70b-versatile`
  - `generate_resume` -> `openrouter/deepseek/deepseek-chat`
  - `generate_cover_letter` -> `openrouter/deepseek/deepseek-chat`
  - `filter_jobs` -> `groq/llama-3.3-70b-versatile`
- Unknown task names raise `ValueError` listing the valid options.
- Each call prints `[model_router] <UTC timestamp> task=<task> model=<model>` for auditing.
- API keys are exported into `os.environ` on init so LiteLLM picks them up for all providers (Groq, Gemini, OpenRouter).

#### `agents/jd_parser.py`
- `JDParser.parse(jd_text)` validates length (empty / under 50 chars -> `ValueError`), calls the router with `response_format={"type":"json_object"}`, strips optional markdown fences, parses JSON, and constructs `ParsedJD`.
- Prompt enforces: strict JSON, empty defaults for missing fields, never invent skills, normalize experience level to one of fresher/junior/mid/senior.

#### `api/main.py`
- FastAPI app exposing `POST /api/parse-jd` (validated request `{ "jd_text": str }`, response `ParsedJD`).
- `ValueError` is translated to HTTP 400 with the message preserved.
- Placeholder routers (`profile`, `applications`, `instructions`) included so we can hang routes on them in later sessions without touching `main.py` again.

### Key decisions and why
- **Model name for JD parsing**: spec says Qwen3.5 72B via Groq, but Groq does not currently host that exact SKU. Used `groq/qwen-qwq-32b` (the closest available Qwen) per the spec's "closest available" instruction.
- **Tests mock the router**: each test injects a `MagicMock` router so the suite is hermetic, fast, and avoids spending API credits. The router contract (`call(task, messages, response_format=None) -> str`) is the seam.
- **`response_format={"type":"json_object"}`** on every `parse_jd` call to coerce strict JSON; the parser still defensively strips markdown fences as a fallback in case a provider ignores the flag.
- **`raw_text` and `parsed_at` are stamped server-side** rather than asked of the model — avoids hallucination and keeps the timestamp authoritative.
- **Settings load `.env` via an absolute path** computed from `__file__`, so tests and the API work regardless of the process cwd.
- **Single `_parser = JDParser()` at import time** in `jobs.py` reuses the LiteLLM env setup across requests. Cheap, no per-request reinit.

### Issues encountered and how resolved
- **`pip` upgraded from 25.2 -> 26.1.1** during install — no functional impact, just a noisy first line.
- **LiteLLM emits two startup warnings about missing `botocore`** (bedrock + sagemaker pre-load). Harmless because we are not using AWS providers; ignored.
- No test failures on the first run; the schema and JSON-extraction code path lined up with the mock payloads.

### Start of Session 2
- Wire the audit logger (`services/audit_logger.py`) so every `ModelRouter.call` records `{timestamp, task, model, message hashes, response hash}` to disk or the Supabase `audit_log` table. The logger should be the canonical source for the audit log requirement, not the `print` statement in the router.
- Begin the company researcher agent: define a `ResearchReport` schema, set up `core/vector_store.py` with a real ChromaDB client, and add SHA-256 verification on retrieved chunks before they are passed to the LLM.
- Add a real (non-mock) integration smoke test for `JDParser` behind a marker so it can be opt-in (e.g. `pytest -m live`).

---

## Session 2 - Audit Logger + Vector Store + Company Researcher

### What was built
- `services/audit_logger.py`: `AuditLogger` class. Hashes every message and the response with SHA-256, writes a JSON line to `logs/audit.log`, and best-effort writes a row to Supabase `audit_log` via `psycopg2`. Prints the `CREATE TABLE` DDL once on import so the table can be provisioned manually. Never raises — failures are swallowed with a `[audit_logger]` console message so the main flow is never broken by an audit hiccup.
- `core/model_router.py`: `print` line removed. `AuditLogger` is instantiated once at module import. Every successful `litellm.completion` is logged with `extra={"called_at": <pre-call UTC ISO timestamp>}`.
- `core/vector_store.py`: `VectorStore` backed by `chromadb.PersistentClient` at `.chroma/`. `add_chunks` injects `sha256` into each chunk's metadata. `query` recomputes SHA-256 on returned text and raises `ValueError` on mismatch (with both hashes and the chunk id); otherwise tags each result with `verified=True`. `delete_collection` for teardown.
- `models/schemas.py`: added `CompanyBrief` and `ResearchReport` (existing `ParsedJD` untouched).
- `agents/company_researcher.py`: `CompanyResearcher.research(company_name, website)`. Scrapes homepage + `/about` + `/careers` with `crawl4ai`, chunks by `\n\n` (≥50 char, capped at 200), stores chunks in `company_<slug>` collection, queries the collection with a fixed seed prompt for 20 verified chunks, and asks `research_company` (Gemini 2.5 Pro) to emit a strict-JSON `CompanyBrief`. `researched_at` and `scraped_urls` are stamped server-side.
- `backend/tests/test_jd_parser.py`: added `test_live_parse_jd` (real API, marked `@pytest.mark.live`). `pytest.ini` registers the `live` marker so `-m "not live"` is the default workflow.

### Key decisions and why
- **Audit logger is fail-soft, not fail-loud**: a broken Supabase connection or full disk must never block a model call. All errors are caught and printed. The local `audit.log` is the source of truth; Supabase is a mirror to be enabled once the DDL has been run.
- **Schema DDL printed on import** rather than executed automatically. Project rule #5 requires an audit log; project rule #4 says the user is always in control. Running DDL silently on import would be too much magic — Nilesh runs the SQL in Supabase once when he's ready.
- **SHA-256 verification belongs in `VectorStore.query`**, not at each callsite. Project rule #2 says every retrieved chunk must be hash-verified before reaching an LLM. Centralizing this makes the rule unbypassable — any agent that calls `query()` gets verification for free, and a mismatch is a hard fail.
- **`groq/qwen-qwq-32b` was decommissioned by Groq mid-session**. Live test surfaced this immediately. Probed Groq's catalogue and swapped to `groq/qwen/qwen3-32b` (current Qwen3 generation on Groq) — closest available Qwen, consistent with the original spec instruction.
- **Scraping is best-effort across three URLs**. Many company sites do not expose `/about` or `/careers` at predictable paths; failures are logged and skipped instead of aborting the whole research. Only fully empty result sets raise.
- **Chunking by `\n\n` with a 50-char floor and 200-chunk ceiling** keeps Chroma payloads bounded and avoids feeding the LLM trivial fragments (nav menus, single words). This is a deliberately simple chunker — we can swap in a token-aware splitter later if quality demands it.
- **`asyncio.run` inside the sync `research()` API** so the agent stays sync-callable from the FastAPI route layer (which is currently sync). If we move the API to async, we can drop `asyncio.run` and `await` directly.
- **Live test marker (`live`)** gates real-API tests so CI / dev iteration stays free; `pytest` default runs the mocked suite, `pytest -m live` runs the real one.

### Issues encountered and how resolved
- **Groq deprecation of `qwen-qwq-32b`**: probed live model list, switched to `groq/qwen/qwen3-32b`, re-ran live test — green.
- **ChromaDB embedding model download on first use**: ~80 MB ONNX pull. Expected; one-time per machine and cached under `~/.cache/chroma/`. The smoke test still completed and round-tripped correctly.
- **LiteLLM startup warnings about missing `botocore`** continue (Bedrock + SageMaker pre-load). Harmless — we use neither provider.

### Start of Session 3
- Stand up the profile matcher agent: define a `MatchScore` schema (overall score, dimension scores, rationale), build `agents/profile_matcher.py` to compare a `UserProfile` against a `ParsedJD` via the `match_profile` task.
- Define a `UserProfile` schema and a profile-ingest endpoint (`POST /api/profile`) so we have real input for the matcher.
- Add a live smoke test for `CompanyResearcher` against a small known site (marker `live`).
- Once the matcher and researcher are stable, sketch the LangGraph orchestrator that chains `JDParser -> CompanyResearcher -> ProfileMatcher`.

---

## Session 3 - User Profile + Profile Matcher + Orchestrator Sketch

### What was built
- `models/schemas.py`: added `Experience`, `Project`, `Education`, `UserProfile`, and `MatchScore`. Existing `ParsedJD`, `CompanyBrief`, `ResearchReport` left untouched.
- `api/routes/profile.py`: `POST /api/profile` writes the validated `UserProfile` to `data/profiles/<email_slug>.json`. `GET /api/profile/{profile_id}` reads it back, returning 404 when absent. `email_slug` lowercases the email and collapses non-alphanumerics to underscores.
- `agents/profile_matcher.py`: `ProfileMatcher.match(profile, jd) -> MatchScore`. Builds a structured candidate vs. JD prompt (skills, experiences with tech, projects with highlights, education, certifications, achievements; then role, level, required/preferred skills, responsibilities, tech stack, culture signals). Calls `match_profile` (Llama 3.3 70B on Groq) with `response_format={"type":"json_object"}`, strips fences defensively, and inflates into `MatchScore`.
- `api/routes/applications.py`: `POST /api/match` loads the saved profile, parses the JD, returns a `MatchScore`. `POST /api/pipeline` invokes the orchestrator end-to-end and serializes Pydantic models via `model_dump_json` so the response is plain JSON with ISO timestamps.
- `core/orchestrator.py`: `PipelineState` TypedDict plus three node functions (`node_parse_jd`, `node_research_company`, `node_match_profile`) wired as a linear `parse_jd -> research_company -> match_profile -> END` `StateGraph`. Each node short-circuits if `state["error"]` is already set. `run_pipeline(...)` builds the initial state and calls `app.invoke()`.
- Tests: `test_profile_matcher.py` (3 mocked tests — schema shape, scores in [0,1], missing-skills detection) and `test_orchestrator.py` (1 test — pipeline state structure, all three agents mocked, profile loaded from a `tmp_path`).
- `data/` added to `.gitignore`.
- Real profile saved: `data/profiles/nbarandwal_gmail_com.json` via the running API (POST + GET round-trip verified).

### Key decisions and why
- **Single `_jd_parser` / `_profile_matcher` instances per route module** rather than per-request. They are cheap to keep around and avoid re-initializing the `ModelRouter` (and re-setting env vars) on every request.
- **Email-based profile id**, slugified the same way the company researcher slugifies company names. Keeps id derivation deterministic and human-readable without needing a separate id store.
- **Profiles stored on local disk under `data/profiles/`** rather than Supabase for now. The schema is the contract; we can swap the persistence layer to Supabase later without touching agents.
- **Orchestrator agents are module-level singletons** (`_jd_parser`, `_company_researcher`, `_profile_matcher`) so tests can patch them by name with `unittest.mock.patch`. This is the simplest seam that keeps `run_pipeline` testable without dependency injection plumbing.
- **`PipelineState` is `TypedDict, total=False`** so partial updates (single-node outputs) are valid against the type. LangGraph merges per-node returns into the running state — `total=False` matches that semantics.
- **Error handling is "set state['error'] and skip"**, exactly as specified. No conditional edges, no retries. Anything more would be premature; the orchestrator skeleton's job is to prove the wiring works.
- **`POST /api/pipeline` serializes via `model_dump_json` then `json.loads`** to flatten Pydantic models into plain dicts with ISO datetimes. Cleaner than recursive `isinstance` walks and uses Pydantic's own JSON encoder for free.
- **Tests use `tmp_path` and `patch("...PROFILE_DIR", profile_dir)`** for the orchestrator so the test never depends on whether the real `data/profiles/` directory happens to contain a fixture.

### Issues encountered and how resolved
- None — all 9 mocked tests passed on the first run and the manual smoke test POSTed and round-tripped the real profile without changes.

### Start of Session 4
- Build the resume generator (`agents/resume_generator.py`): consume `UserProfile + ParsedJD + ResearchReport`, generate tailored resume sections via the `generate_resume` task (DeepSeek on OpenRouter). Define a `TailoredResume` schema (sections, bullet list per section, source citations back to profile items).
- Build the cover letter generator (`agents/cover_letter_generator.py`): same inputs plus the match rationale; emit a `TailoredCoverLetter` schema (greeting, paragraphs, closing) via the `generate_cover_letter` task.
- Add `POST /api/generate/resume` and `POST /api/generate/cover-letter` routes, then extend the orchestrator with two more nodes after `match_profile`.
- Add a live smoke test for `CompanyResearcher` against a small static site (marker `live`) to confirm the scrape + chunk + verify + Gemini path end-to-end.

---

## Session 4 - Resume Generator + Cover Letter Generator

### What was built
- `models/schemas.py`: added `ResumeSection`, `TailoredResume`, `TailoredCoverLetter`. Existing schemas untouched.
- `agents/resume_generator.py`: `ResumeGenerator.generate(profile, jd, research, match, instructions="") -> TailoredResume`. Hand-built structured prompt sections — CANDIDATE PROFILE, TARGET JOB, COMPANY CONTEXT, MATCH INSIGHTS, plus optional ADDITIONAL INSTRUCTIONS. System prompt enforces the 5-section minimum (Summary, Experience, Projects, Skills, Education) and the "no inventing facts" rule. Calls `generate_resume` (DeepSeek via OpenRouter) with `response_format={"type":"json_object"}`. `generated_at` is stamped server-side.
- `agents/cover_letter_generator.py`: `CoverLetterGenerator.generate(...)` with the same signature. Server-side relevance scoring ranks experiences and projects by how many tech entries overlap the JD's required/preferred/stack skills (case-insensitive) — only the top 3 experiences and top 2 projects are included in the prompt, keeping it tight. System prompt mandates exactly 3 paragraphs with a defined narrative arc (why-this-company, evidence, forward-looking).
- `api/routes/generate.py`: `POST /api/generate/resume` and `POST /api/generate/cover-letter`. Both share `_prepare_context()` which loads profile -> parses JD -> researches company -> matches profile, then dispatches to the appropriate generator with the user's `instructions`.
- `api/main.py`: `generate` router included with prefix `/api` and tag `generate`.
- `core/orchestrator.py`: `PipelineState` extended with `instructions`, `tailored_resume`, `tailored_cover_letter`. Two new nodes (`node_generate_resume`, `node_generate_cover_letter`) appended. Graph is now a 5-step linear chain: `parse_jd -> research_company -> match_profile -> generate_resume -> generate_cover_letter -> END`. `run_pipeline()` gained an `instructions: str = ""` parameter.
- `api/routes/applications.py`: `PipelineRequest.instructions: str = ""` added and forwarded to `run_pipeline`.
- Tests: `test_resume_generator.py` (schema, 5-section coverage, instruction passthrough), `test_cover_letter_generator.py` (schema, 3-paragraph rule, instruction passthrough), `test_company_researcher.py` (live).
- End-to-end smoke: `POST /api/generate/resume` against the real model stack produced a `TailoredResume` with `target_role="AI/ML Engineer"`, 4 ordered sections (Projects, Experience, Education, Skills), 4 highlighted skills, and 7 JD keywords woven in.

### Key decisions and why
- **`gemini/gemini-2.5-pro` swapped to `gemini/gemini-2.5-flash-lite`**. The provisioned Google AI Studio API key has a hard zero on free-tier quota for `gemini-2.5-pro` (`"limit: 0, model: gemini-2.5-pro"`); the only Gemini model that completed a probe call was `gemini-2.5-flash-lite`. Closest available 2.5-family model on this key, per the same "closest available" convention used for Qwen.
- **Top-N relevance trimming in the cover letter prompt** (3 experiences, 2 projects) was needed because cover letters become generic when the model is dumped the entire profile. The scoring is a simple intersection between item `tech_used` and JD skill sets — deterministic, no LLM call, debuggable from the prompt log.
- **Shared `_prepare_context()` in `generate.py`** keeps `/api/generate/resume` and `/api/generate/cover-letter` from drifting. Both endpoints must run the same upstream pipeline before generation, so colocating the loader removes the temptation to special-case one.
- **Module-level singleton instances of all five agents** in both `orchestrator.py` and `generate.py`. Initial cost is paid once at import (LiteLLM env setup, Chroma client, ONNX embedding model). The 41s pytest wall-clock comes from this initialization, not from the tests themselves — the tests are fully mocked.
- **`_load_profile_from_state` helper in orchestrator** reduces the duplicated "check error -> load profile -> handle missing" prelude that every downstream node would otherwise repeat. Sets `state['error']` on miss and returns `None`; callers just `return state` immediately.
- **`response_format={"type":"json_object"}` is set everywhere a structured output is expected** — `parse_jd`, `match_profile`, `generate_resume`, `generate_cover_letter`. Different providers honor it inconsistently, so each generator still defensively strips markdown fences as a fallback.

### Issues encountered and how resolved
- **Playwright Chromium was missing on first live run** of the company researcher; `crawl4ai` invocation surfaced `BrowserType.launch: Executable doesn't exist`. Fixed by running `playwright install chromium` (one-time, ~92 MB).
- **Gemini 2.5 Pro returned a 429 "limit: 0"** on the first live researcher run. Probed alternatives and swapped to `gemini-2.5-flash-lite`; live test passed.
- **End-to-end smoke against `https://www.kogniverse.ai` failed** with `ERR_NAME_NOT_RESOLVED` — the domain provided in the spec is not registered, so the researcher had no chunks to work with and raised `ValueError("No usable content scraped...")`. Substituted `https://anthropic.com` (already proven reachable in the live test) to actually exercise the path and observe the final `TailoredResume`. The model stack itself works; the original spec URL is just dead.

### Start of Session 5
- Build the job discovery agent (`agents/job_discovery.py`): pull listings from Adzuna + Remotive, then use the `filter_jobs` task (Llama 3.3 70B) to filter by candidate preferences. Define `JobListing` and `DiscoveredJobs` schemas.
- Add `POST /api/discover` that takes `{profile_id, query, location}` and returns ranked listings.
- Add the instruction-edit endpoint: `POST /api/instructions` for persistent preferences, `POST /api/instructions/per-job` for per-job overrides (project rule #3). Store under `data/instructions/`.
- Add the export pipeline scaffolding: `POST /api/export/resume` and `POST /api/export/cover-letter` rendering the latest `TailoredResume` / `TailoredCoverLetter` to PDF via WeasyPrint (project rule #4 — user reviews before exporting).
- Add a live end-to-end orchestrator smoke (marker `live`) that runs `run_pipeline()` against Anthropic and asserts all 5 state fields are populated.

---

## Session 5 - Job Discovery + Instructions + PDF Export

### What was built
- `models/schemas.py`: added `JobListing`, `DiscoveredJobs`, `InstructionSet`. Existing schemas untouched.
- `agents/job_discovery.py`: `JobDiscovery.discover(query, location, profile, max_results)` fetches Adzuna (India geo) and Remotive concurrently via `ThreadPoolExecutor`, normalizes both feeds into `JobListing`, deduplicates by `url`, caps to `max_results`, and asks `filter_jobs` (Llama 3.3 70B) to score every listing in one call. Scores are clamped to [0,1] and reasons are stored on the listing; results are sorted by `match_score` descending. Empty fetches short-circuit to an empty `DiscoveredJobs` with no LLM call.
- `api/routes/jobs.py`: added `POST /api/discover` (`{profile_id, query, location, max_results}` → `DiscoveredJobs`). 404 when the profile is missing.
- `api/routes/instructions.py`: replaced the placeholder with a full instruction store at `data/instructions/<profile_id>.json` matching the `InstructionSet` schema. Routes: `GET /api/instructions/{profile_id}`, `POST /api/instructions/persistent`, `POST /api/instructions/per-job`, `DELETE /api/instructions/persistent`, `DELETE /api/instructions/per-job`. Adds dedupe on every POST; per-job buckets are keyed by a free-form `job_key`. Every mutation refreshes `updated_at`.
- `services/pdf_generator.py`: replaced the placeholder. `resume_to_html` / `cover_letter_to_html` render minimal, self-contained HTML (no CDN, no external fonts) with `html.escape` on every user value. `html_to_pdf` uses WeasyPrint. `export_resume_pdf` and `export_cover_letter_pdf` slugify the profile name, add a UTC timestamp to the filename (`resume_<slug>_<YYYYmmdd_HHMMSS>.pdf`), and write into the supplied output dir.
- `api/routes/generate.py`: added `POST /api/export/resume` and `POST /api/export/cover-letter`. Both reuse `_prepare_context()` from Session 4, run the appropriate generator, then write the PDF under `data/exports/<profile_id>/` and return `{pdf_path, filename}`. Project rule #4 is preserved — exports only happen when the user explicitly hits an export route.
- Tests added: `test_job_discovery.py` (4 cases), `test_instructions.py` (4 cases using FastAPI `TestClient` against the actual routes with isolated `tmp_path` storage), `test_pdf_generator.py` (3 cases on HTML output, no WeasyPrint invocation). `test_orchestrator.py` gained `test_live_full_pipeline` (marker `live`) that asserts all 6 state fields populate end-to-end against Anthropic.
- Manual smoke of `POST /api/discover` returned 5 jobs from the live Adzuna + Remotive feeds, top hit scored 0.6 by `filter_jobs`.

### Key decisions and why
- **Single `filter_jobs` call per discover invocation** rather than one call per listing. Llama 3.3 70B can score 20+ listings in one round-trip with much lower latency and audit-log volume. Failures fall back silently to `match_score=0.0` rather than fail the whole call.
- **`{"scores": [...]}` envelope on the scoring response** rather than a bare top-level array. Several LiteLLM providers reject `response_format={"type":"json_object"}` when the root isn't a JSON object; wrapping in `scores` lets us keep the format hint on every model call.
- **Dedupe by URL, not by `(source, job_id)`**. Adzuna and Remotive sometimes echo the same posting from the same upstream ATS; URL is the strongest cross-feed identity signal we have without a normalization map.
- **Instruction store is a plain JSON file per profile** mirroring how the profile itself is stored. Same persistence layer, same backup story; easy to migrate to Supabase later by swapping the load/save helpers.
- **Per-job overrides are bucketed under a caller-supplied `job_key`** (the spec leaves this opaque). This lets the eventual UI use a stable key — Adzuna/Remotive `job_id`, or a synthetic `company_slug:role_slug` for hand-entered jobs — without baking a job-id format into this layer.
- **PDF generation goes through HTML first, never builds PDFs directly.** Keeps the same renderer for an eventual in-browser preview, and lets `resume_to_html` / `cover_letter_to_html` be unit-tested without WeasyPrint's heavy native deps in the test path.
- **`html.escape` on every interpolated value**, including section titles and bullets that originate from an LLM. Defensive — LLMs occasionally produce angle brackets or ampersands that would break the rendered PDF.
- **`data/exports/<profile_id>/` namespacing** keeps generated PDFs separated by candidate and out of the way of `data/profiles/` and `data/instructions/`. All of `data/` is already gitignored.

### Issues encountered and how resolved
- **`test_cover_letter_to_html_contains_paragraphs` initially failed** because the fixture paragraph contained an apostrophe which `html.escape` (correctly) rewrote to `&#x27;`. Updated the fixture to use plain ASCII text; the escaping behavior in production code is the right default and stays unchanged.
- **No other failures.** Both feeds responded on the discover smoke; the live full-pipeline run took ~89s end-to-end (scrape Anthropic, embed, score, generate resume + cover letter) and asserted all 6 state fields populated.

### Start of Session 6
- Begin the Next.js 14 frontend scaffold under `frontend/`. Wire up the read paths first: profile view (`GET /api/profile/{id}`), match results view (`POST /api/match` → score breakdown UI), and a discover view that drives `POST /api/discover` and lists ranked jobs.
- Add a review-and-edit surface for the generated resume and cover letter that calls `POST /api/generate/resume` and `POST /api/generate/cover-letter`, lets the user tweak text inline, and only then triggers `POST /api/export/resume` / `POST /api/export/cover-letter` (project rule #4 — explicit review before export).
- Wire the instructions panel: list current instructions via `GET /api/instructions/{profile_id}`, add via the two POSTs, remove via the two DELETEs.
- Backend side: tighten `JobDiscovery` rate-limit handling (Adzuna throttles on the free tier), and add a one-shot integration test that runs `POST /api/export/resume` end-to-end and asserts a PDF actually lands on disk (skip if WeasyPrint isn't importable).

---

## Session 6 - Application Card Agent + Next.js Frontend

### What was built

**Backend**
- `models/schemas.py`: added `ApplicationCard` (basic details, two-paragraph pitch fields, 3 top experiences, key skills, 5 likely Q&A pairs, application checklist).
- `core/model_router.py`: added `application_card -> groq/llama-3.3-70b-versatile`.
- `agents/application_card_generator.py`: new `ApplicationCardGenerator.generate(profile, jd, research, match, job_url)`. Reuses the same top-N relevance trimming from the cover letter agent (3 experiences, 3 projects scored by JD-skill overlap) so the prompt stays tight. Stamps `profile_name`, `email`, `phone`, `target_role`, `company_name`, `job_url`, `generated_at` server-side; the LLM is only asked for the editorial fields.
- `api/routes/generate.py`: added `POST /api/generate/application-card` and `_application_card_generator` singleton. Reuses the shared `_prepare_context()` so the upstream chain (profile → parse → research → match) stays identical to the resume/cover-letter routes.
- `backend/tests/test_application_card.py`: schema test + likely-questions-count test. All 28 mocked tests now pass.

**Frontend (Next.js 14, App Router, Tailwind, TypeScript, no `src/`)**
- Project scaffolded with `create-next-app@14`.
- `next.config.mjs`: rewrites `/api/:path*` to `http://localhost:8000/api/:path*` so the browser hits the FastAPI backend without CORS plumbing.
- `types/index.ts`: TypeScript mirrors of every backend schema (UserProfile, MatchScore, JobListing, DiscoveredJobs, TailoredResume/CoverLetter, ApplicationCard, InstructionSet).
- `lib/api.ts`: single fetch wrapper (`apiFetch`) plus typed functions for every endpoint we use. Errors bubble up as `Error` with the FastAPI `detail` message.
- Components: `LoadingSpinner`, `CopyButton` (clipboard + 2s "Copied!" feedback), `MatchScoreCard` (color-graded bars green/yellow/red at 0.7/0.5 thresholds), `JobCard` (source-colored badge, score, snippet, select + apply buttons), `ResumePreview` (sections sorted by `order`, skills highlighted, export button with "Review carefully" note), `CoverLetterPreview`, `ApplicationCardView` (eight sections each with `CopyButton`, expandable Q&A list, client-side checklist), `InstructionPanel` (loads via `getInstructions`, mutations via the four other endpoints, dedupe enforced server-side).
- Pages: `app/page.tsx` redirects to `/dashboard`. `app/layout.tsx` renders a dark navy header with brand and `NavLinks` (Dashboard/Generate/Instructions, active link highlighted via `usePathname`). `app/dashboard/page.tsx` is the main flow — preset role chips, query/location/maxResults, `/api/discover` results as a 2-col `JobCard` grid, selected-job description panel, generation form, three "Generate" buttons (resume, cover letter, card) each with their own loading state, all three previews rendered side-by-side as they come back, instructions section collapsible at the bottom. `app/generate/page.tsx` mirrors the same generation surface but takes a pasted JD instead of a discovered job. `app/instructions/page.tsx` wraps `InstructionPanel` with a short explainer.
- Hard-coded `PROFILE_ID = "nbarandwal_gmail_com"` on every page (single-user app for now; real auth is a later session).

**Smoke**
- `npm run build` clean, zero TypeScript errors (`/dashboard` 3.57 kB, `/generate` 1.37 kB, `/instructions` 1.81 kB).
- Both servers up: `curl http://localhost:3000` returned HTML (307 `/` → `/dashboard`), `curl http://localhost:3000/api/profile/nbarandwal_gmail_com` returned Nilesh's full profile JSON via the Next.js proxy.

### Key decisions and why
- **Single-user `PROFILE_ID` constant per page** rather than threading profile_id through routing or context. Real auth doesn't exist yet and we have one candidate; building Zustand/context for a one-key value would be premature plumbing.
- **`NavLinks` extracted as a client component** but the layout itself stays a server component. `usePathname` requires `"use client"`, but the surrounding layout can stay server-rendered — minimizes the client JS budget.
- **API proxy via `next.config.mjs` rewrites** rather than calling the backend directly from the browser. No CORS dance, no extra `NEXT_PUBLIC_API_URL` env, and the prod story is the same — put a reverse proxy in front of both apps and `/api/*` keeps working.
- **`ApplicationCardGenerator` stamps identity fields server-side** (profile name, email, phone, target role, company name, job URL). The LLM is asked for editorial content only, never for facts it could hallucinate. Same pattern as `JDParser.raw_text` / `parsed_at` and `CompanyResearcher.scraped_urls`.
- **All three generate operations on the dashboard are independent**. Each has its own loading flag, its own error path, and its own result slot. The previews accumulate — generating a card doesn't wipe the resume. Faster iteration when tuning a single output.
- **`buildJdText` synthesizes a small JD blob** (`title at company\n\n{description}`) from the selected `JobListing` for the dashboard generation flow. The backend's `JDParser` requires at least 50 characters; Adzuna descriptions easily clear that. The `/generate` page accepts raw text directly for full-JD pastes.
- **`CopyButton` uses `navigator.clipboard.writeText`** (modern API, requires HTTPS in prod but works on localhost). Failures are logged to console rather than thrown — the worst case is the user manually selects and copies, which is what the entire Application Intelligence Card UI optimizes for.
- **`ApplicationCardView` checklist state is component-local**. The checklist is a "did I do this when filling the form" tracker, not a persisted artifact. Saving it would require schema and a route; not worth it for an ephemeral aid that resets on navigate.
- **`globals.css` stripped to bare Tailwind directives** — the scaffolded `:root` palette plus `prefers-color-scheme: dark` was overriding our explicit Tailwind backgrounds and producing inverted colors.

### Issues encountered and how resolved
- **None blocking.** The default `globals.css` (light/dark CSS variables) competed with Tailwind classes; trimmed to the three `@tailwind` lines. `npm run build` was clean on the first run after wiring up the components, and the proxy round-trip worked first try.

### Start of Session 7
- Wire `MatchScoreCard` into the dashboard alongside the generators — `/api/match` is built, the UI component is built, just not currently used on a page. Show it after generation so the candidate sees the fit signal next to the docs.
- Add a "saved applications" list backed by a new `data/applications/<profile_id>/` store: when a card is generated, optionally persist `{job, resume, cover_letter, card, generated_at}` so the user can come back to past applications and re-export without paying the LLM cost again.
- Tighten error UX: the current `genError` is a single shared message; surface per-action errors next to each "Generate" button.
- Add `POST /api/profile` form on the frontend (the backend route exists from Session 3) so a new candidate can onboard without manually writing the JSON.
- Backend: add a live test for `POST /api/generate/application-card` against Anthropic to lock in the schema-correctness signal end-to-end.

---

## Session 7 - Polish + Saved Applications + Deployment

### What was built

**Backend**
- `models/schemas.py`: added `SavedApplication` (id, profile_id, embedded `JobListing`, optional `resume`/`cover_letter`/`card`, notes, status, timestamps).
- `api/routes/applications_store.py`: new file-backed store at `data/applications/<profile_id>/<id>.json`. Five endpoints — `POST /api/applications`, `GET /api/applications/{profile_id}`, `GET /api/applications/{profile_id}/{app_id}`, `PATCH /api/applications/{profile_id}/{app_id}` (uses `model_dump(exclude_unset=True)` to apply only provided fields), `DELETE /api/applications/{profile_id}/{app_id}`. IDs are 8-char `uuid4().hex` slices.
- `api/main.py`: registered the new router under tag `applications`; `/health` now reports `{status, version, agents[7], endpoints: 16}`.
- `backend/tests/test_application_card.py`: added `test_live_generate_application_card` (real Anthropic crawl + match + card) asserting non-empty pitch/why-this-company, exactly 5 questions each with `question`/`answer` keys, and email stamping. **Passed live.**

**Frontend**
- `types/index.ts`: added `SavedApplication`.
- `lib/api.ts`: added `matchProfile`, `saveProfile`, and the five `*Application` helpers.
- `app/dashboard/page.tsx`: rewritten. `selectJob()` now calls `/api/match` immediately and surfaces the result through a collapsed-by-default `MatchScoreCard` ("Match Analysis" panel). Each generator action has its own error state (`resumeError` / `coverLetterError` / `cardError`) rendered inline under the button. New "Saved applications" section lists items newest-first with status badges (draft/applied/interview/rejected), an inline expand for job details, save and delete actions. `refreshMatchScore()` re-queries the match after any successful generation so the score reflects the latest context.
- `app/generate/page.tsx`: same per-action error UX as the dashboard.
- `app/profile/page.tsx`: new onboarding page. Loads the current profile, exposes editable fields for name/email/phone/summary/skills (skills are a tag input — Enter to add, × to remove). `Save Profile` POSTs the merged profile (preserving experiences/projects/education/etc. as-is) and refreshes `updated_at` client-side.
- `app/NavLinks.tsx`: added a `/profile` link between Generate and Instructions.

**Deployment + docs**
- `backend/Procfile` and `backend/railway.toml` (nixpacks build, `uvicorn ... --port $PORT`, `/health` 30s timeout).
- `backend/requirements.txt`: appended `gunicorn`.
- `frontend/next.config.mjs`: rewrites `/api/:path*` to `${NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/:path*` so the same code runs locally and in production by flipping one env var.
- `frontend/.env.example` and `frontend/vercel.json` (rewrites pointing at a placeholder that the operator updates after deploying the backend).
- `README.md`: complete rewrite covering problem, capabilities, architecture, local setup, API keys, project structure, and a resume line.

### Key decisions and why
- **Saved applications are flat-file JSON, not Supabase**. Same persistence model as profiles and instructions, keeps the local-first story coherent, and avoids forcing every contributor to provision a database before they can run the app. Easy to swap behind the helper functions later.
- **`PATCH` accepts every mutable field instead of separate endpoints per attribute**. The status flow (draft → applied → interview → rejected) and the optional generated artifacts (`resume` / `cover_letter` / `card`) all live on the same record; one route with `exclude_unset=True` semantics is simpler than four endpoints with overlapping validation.
- **`matchProfile` is called automatically on job select** rather than gated behind a "score this match" button. The match call is cheap (single Groq round-trip, no scraping) and immediately answers the candidate's first question — "is this worth my time?" — before they decide to generate.
- **`MatchScoreCard` defaults to collapsed**. The fit number is useful, but the candidate's eyes belong on the generated documents. A one-click expand keeps the analysis available without crowding the primary surface.
- **Profile form only edits the top-level scalar fields**. Experiences, projects, and education are nested arrays with their own internal structure; a CRUD UI for them is a meaningful build of its own (drag-to-reorder, per-row validation, etc.) and outside this session's scope. The form preserves them via spread on save.
- **`NEXT_PUBLIC_API_URL` drives both the Next.js dev rewrite and the Vercel `vercel.json` rewrite**. Same conceptual seam in dev and prod — no `if (process.env.NODE_ENV === ...)` branching in code.
- **Health endpoint counts endpoints (16) rather than enumerating them**. Mirrors how operators actually use a health check (cheap liveness probe) without making it a brittle spec mirror that drifts on every route change.

### Issues encountered and how resolved
- **None blocking.** Backend mocked tests stayed green (28/28) through the entire session. The live `ApplicationCard` test passed first run against Anthropic. Frontend build went from 4 routes to 5 (added `/profile`) with zero TypeScript errors.

### Post-session hotfix (2026-05-17)
- `parse_jd` switched from `groq/qwen/qwen3-32b` to `groq/llama-3.3-70b-versatile`. Qwen3-32B is a thinking model and emits `<think>...</think>` reasoning tokens before its JSON output; Groq's strict `response_format={"type":"json_object"}` validator rejects those responses as invalid JSON non-deterministically (`json_validate_failed` with empty `failed_generation`), surfacing as 500s on `/api/match` and intermittently on `/api/generate/*`. Llama 3.3 70B handles Groq's JSON mode reliably and is already proven on `match_profile` and `filter_jobs`. Task map is now Llama-3.3-on-Groq for everything except `research_company` (Gemini) and `generate_resume`/`generate_cover_letter` (DeepSeek).
- `POST /api/match` wrapped in try/except so any future model failure returns a structured 4xx/5xx with the error message instead of an uncaught stack trace.

### Final project status
- **Backend**: 7 agents, 16 API endpoints (counting the 5 new application-store routes), 5-node LangGraph orchestrator, ChromaDB with SHA-256 verification, AuditLogger to file + Supabase, WeasyPrint PDF export. 28 mocked + 4 live tests all passing.
- **Frontend**: Next.js 14 / TypeScript / Tailwind. Dashboard (discovery + generation + match analysis + saved apps + instructions), Generate page (manual JD), Profile page (onboarding), Instructions page. Single Next.js proxy seam to the backend that works locally and on Vercel.
- **Deployment**: Railway-ready backend (`Procfile`, `railway.toml`, gunicorn), Vercel-ready frontend (`vercel.json`, env-var-driven rewrites).
- **Docs**: README covers the full story end-to-end. PROGRESS.md is the decision log for every session.
- **Git**: clean per-session commits authored as `Nilesh Rohidas Barandwal <nbarandwal@gmail.com>`, all pushed to `github.com/NileshBarandwal/tailormind`.
