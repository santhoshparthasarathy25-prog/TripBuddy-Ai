import os
import tempfile
from dataclasses import dataclass, field
from pathlib import Path
from typing import List


@dataclass
class Settings:
    app_name: str = field(default_factory=lambda: os.getenv("APP_NAME", "TripBuddy AI"))
    app_env: str = field(default_factory=lambda: os.getenv("APP_ENV", "development"))
    operating_mode: str = field(default_factory=lambda: os.getenv("OPERATING_MODE", "demo"))
    debug: bool = field(default_factory=lambda: os.getenv("DEBUG", "false").lower() == "true")
    api_v1_prefix: str = field(default_factory=lambda: os.getenv("API_V1_PREFIX", "/api/v1"))
    host: str = field(default_factory=lambda: os.getenv("HOST", "0.0.0.0"))
    port: int = field(default_factory=lambda: int(os.getenv("PORT", "8000")))

    # CORS
    allowed_origins: List[str] = field(
        default_factory=lambda: [
            o.strip()
            for o in os.getenv(
                "ALLOWED_ORIGINS",
                "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173",
            ).split(",")
            if o.strip()
        ]
    )

    # Security & Privacy
    jwt_secret_key: str = field(
        default_factory=lambda: os.getenv(
            "JWT_SECRET_KEY", "tripbuddy-ephemeral-dev-key-do-not-use-in-prod-98a7b6c5d4e3"
        )
    )
    jwt_algorithm: str = field(default_factory=lambda: os.getenv("JWT_ALGORITHM", "HS256"))
    access_token_expire_minutes: int = field(
        default_factory=lambda: int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
    )
    rate_limit_per_minute: int = field(
        default_factory=lambda: int(os.getenv("RATE_LIMIT_PER_MINUTE", "120"))
    )
    journey_retention_days: int = field(
        default_factory=lambda: int(os.getenv("JOURNEY_RETENTION_DAYS", "30"))
    )
    redact_pii_logs: bool = field(
        default_factory=lambda: os.getenv("REDACT_PII_LOGS", "true").lower() == "true"
    )

    # Database
    database_url: str = field(
        default_factory=lambda: os.getenv(
            "DATABASE_URL",
            "postgresql+psycopg://tripbuddy_user:placeholder@localhost:5432/tripbuddy_db",
        )
    )
    sqlite_fallback_path: str = field(
        default_factory=lambda: os.getenv(
            "SQLITE_FALLBACK_PATH",
            str(Path(tempfile.gettempdir()) / "tripbuddy_local.sqlite3"),
        )
    )
    use_sqlite_fallback: bool = field(
        default_factory=lambda: os.getenv("USE_SQLITE_FALLBACK", "true").lower() == "true"
    )

    # Providers
    llm_provider: str = field(
        default_factory=lambda: os.getenv("LLM_PROVIDER", "local_RuleAndHybrid")
    )
    llm_api_key: str = field(default_factory=lambda: os.getenv("LLM_API_KEY", ""))
    llm_model_name: str = field(default_factory=lambda: os.getenv("LLM_MODEL_NAME", "gpt-4o-mini"))
    llm_timeout_seconds: int = field(
        default_factory=lambda: int(os.getenv("LLM_TIMEOUT_SECONDS", "15"))
    )
    llm_max_tokens: int = field(default_factory=lambda: int(os.getenv("LLM_MAX_TOKENS", "1024")))

    bmtc_api_key: str = field(default_factory=lambda: os.getenv("BMTC_API_KEY", ""))
    bmtc_gtfs_rt_url: str = field(default_factory=lambda: os.getenv("BMTC_GTFS_RT_URL", ""))
    namma_metro_api_key: str = field(default_factory=lambda: os.getenv("NAMMA_METRO_API_KEY", ""))
    traffic_api_key: str = field(default_factory=lambda: os.getenv("TRAFFIC_API_KEY", ""))
    weather_api_url: str = field(
        default_factory=lambda: os.getenv(
            "WEATHER_API_URL", "https://api.open-meteo.com/v1/forecast"
        )
    )


settings = Settings()
