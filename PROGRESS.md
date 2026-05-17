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
