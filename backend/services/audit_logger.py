import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from backend.core.config import PROJECT_ROOT, settings


LOG_DIR = PROJECT_ROOT / "logs"
LOG_PATH = LOG_DIR / "audit.log"

SUPABASE_DDL = """CREATE TABLE IF NOT EXISTS audit_log (
    id BIGSERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL,
    task TEXT NOT NULL,
    model TEXT NOT NULL,
    message_hashes TEXT[] NOT NULL,
    response_hash TEXT NOT NULL,
    extra JSONB
);"""


print("[audit_logger] Ensure this table exists in Supabase:")
print(SUPABASE_DDL)


def _sha256(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


class AuditLogger:
    def __init__(self) -> None:
        LOG_DIR.mkdir(parents=True, exist_ok=True)
        self.log_path = LOG_PATH
        self.db_url = settings.SUPABASE_DB_URL

    def log(
        self,
        task: str,
        model: str,
        messages: list[dict[str, str]],
        response: str,
        extra: dict[str, Any] | None = None,
    ) -> None:
        try:
            entry = {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "task": task,
                "model": model,
                "message_hashes": [
                    _sha256(str(m.get("content", ""))) for m in messages
                ],
                "response_hash": _sha256(response or ""),
                "extra": extra,
            }
            self._write_file(entry)
            self._write_supabase(entry)
        except Exception as exc:
            print(f"[audit_logger] failed to log entry: {exc}")

    def _write_file(self, entry: dict[str, Any]) -> None:
        with self.log_path.open("a", encoding="utf-8") as fh:
            fh.write(json.dumps(entry) + "\n")

    def _write_supabase(self, entry: dict[str, Any]) -> None:
        if not self.db_url:
            return
        try:
            import psycopg2
            from psycopg2.extras import Json

            with psycopg2.connect(self.db_url) as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        INSERT INTO audit_log
                            (timestamp, task, model, message_hashes,
                             response_hash, extra)
                        VALUES (%s, %s, %s, %s, %s, %s)
                        """,
                        (
                            entry["timestamp"],
                            entry["task"],
                            entry["model"],
                            entry["message_hashes"],
                            entry["response_hash"],
                            Json(entry["extra"]) if entry["extra"] else None,
                        ),
                    )
        except Exception as exc:
            print(f"[audit_logger] supabase write failed: {exc}")
