"""
Application Configuration using Pydantic Settings
"""
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class Settings(BaseSettings):
    APP_NAME: str = "Opportune AI"
    APP_ENV: str = "development"
    DEBUG: bool = True
    PORT: int = 8000
    HOST: str = "0.0.0.0"
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ]

    # Database
    DATABASE_URL: str = "sqlite:///./opportune.db"

    # Schedule
    SCHEDULE_CRON: str = "0 9 * * *"
    SCHEDULE_TIMEZONE: str = "Asia/Kolkata"
    SCHEDULE_ENABLED: bool = True

    # AI Provider
    LLM_PROVIDER: str = "mock"  # mock, openai, gemini, anthropic
    OPENAI_API_KEY: str = ""
    GEMINI_API_KEY: str = ""
    ANTHROPIC_API_KEY: str = ""
    LLM_MODEL: str = "gemini-2.5-flash"

    # Email
    EMAIL_PROVIDER: str = "console"  # console, smtp, resend
    EMAIL_FROM: str = "Opportune AI <digest@opportune.ai>"
    DEFAULT_RECIPIENT_EMAIL: str = "user@example.com"
    RESEND_API_KEY: str = ""
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_USE_TLS: bool = True

    # MCP
    MCP_SERVER_COMMAND: str = "python -m backend.mcp_server.server"
    MCP_TIMEOUT_SECONDS: int = 20
    BRAVE_API_KEY: str = ""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()
