from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


PROJECT_ROOT = Path(__file__).resolve().parents[2]

VERSIONS_DIR = PROJECT_ROOT / "data" / "versions"
VERSIONS_ARCHIVE_DIR = PROJECT_ROOT / "data" / "versions_archive"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(PROJECT_ROOT / ".env"),
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    GROQ_API_KEY: str = ""
    GOOGLE_API_KEY: str = ""
    OPENROUTER_API_KEY: str = ""

    ALLOWED_ORIGINS: str = "*"

    ADZUNA_APP_ID: str = ""
    ADZUNA_APP_KEY: str = ""

    SUPABASE_URL: str = ""
    SUPABASE_DB_PASSWORD: str = ""
    SUPABASE_DB_URL: str = ""

    NEXT_PUBLIC_SUPABASE_URL: str = ""
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: str = ""


settings = Settings()
