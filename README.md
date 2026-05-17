# TailorMind

Agentic job application platform.

## Local setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Copy `.env.example` to `.env` and fill in credentials.

## Run the API

```bash
source backend/.venv/bin/activate
uvicorn backend.api.main:app --reload
```

## Run tests

```bash
source backend/.venv/bin/activate
pytest backend/tests/ -v
```

See `PROGRESS.md` for session-by-session build log.
