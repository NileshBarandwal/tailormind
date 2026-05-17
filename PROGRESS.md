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
