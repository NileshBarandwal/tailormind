import os
from datetime import datetime, timezone
from typing import Any

import litellm
from litellm.exceptions import RateLimitError

from backend.core.config import settings
from backend.services.audit_logger import AuditLogger


TASK_MODEL_MAP: dict[str, str] = {
    "parse_jd": "groq/llama-3.3-70b-versatile",
    "research_company": "gemini/gemini-2.5-flash-lite",
    "match_profile": "groq/llama-3.3-70b-versatile",
    "generate_resume": "groq/llama-3.3-70b-versatile",
    "generate_cover_letter": "groq/llama-3.3-70b-versatile",
    "filter_jobs": "groq/llama-3.3-70b-versatile",
    "application_card": "groq/llama-3.3-70b-versatile",
}


FALLBACK_MODEL_MAP: dict[str, str] = {
    "groq/llama-3.3-70b-versatile": "gemini/gemini-2.5-flash-lite",
    "groq/qwen/qwen3-32b": "gemini/gemini-2.5-flash-lite",
    "openrouter/deepseek/deepseek-chat": "groq/llama-3.3-70b-versatile",
}


audit_logger = AuditLogger()


class ModelRouter:
    def __init__(self) -> None:
        os.environ["GROQ_API_KEY"] = settings.GROQ_API_KEY
        os.environ["GEMINI_API_KEY"] = settings.GOOGLE_API_KEY
        os.environ["GOOGLE_API_KEY"] = settings.GOOGLE_API_KEY
        os.environ["OPENROUTER_API_KEY"] = settings.OPENROUTER_API_KEY

    def route(self, task: str) -> str:
        if task not in TASK_MODEL_MAP:
            raise ValueError(
                f"Unknown task '{task}'. Valid tasks: {sorted(TASK_MODEL_MAP)}"
            )
        return TASK_MODEL_MAP[task]

    def call(
        self,
        task: str,
        messages: list[dict[str, str]],
        response_format: dict[str, Any] | None = None,
    ) -> str:
        model = self.route(task)
        timestamp = datetime.now(timezone.utc).isoformat()

        kwargs: dict[str, Any] = {"model": model, "messages": messages}
        if response_format is not None:
            kwargs["response_format"] = response_format

        try:
            response = litellm.completion(**kwargs)
        except RateLimitError:
            fallback = FALLBACK_MODEL_MAP.get(model)
            if fallback:
                print(
                    f"[model_router] Groq rate limit hit for {model}, "
                    f"falling back to {fallback}"
                )
                kwargs["model"] = fallback
                response = litellm.completion(**kwargs)
                model = fallback
            else:
                raise

        content = response["choices"][0]["message"]["content"]

        audit_logger.log(
            task=task,
            model=model,
            messages=messages,
            response=content,
            extra={"called_at": timestamp},
        )

        return content
