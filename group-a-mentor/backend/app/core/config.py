"""
Application settings via pydantic-settings (env vars + .env file).

MIGRATION HINT (post-hackathon) :
    Remplacé par `BaseMicroservice` de `ms-common-api` :
        from ms_common_api.microservice import BaseMicroservice

        microservice = BaseMicroservice(
            service_name="learn-api",
            enable_nats=True,
            enable_postgresql=True,
        )
        settings = microservice.settings

    BaseMicroservice gère :
        - Validation env vars au boot avec messages d'erreur explicites
        - Hot reload settings via NATS (config live update)
        - Auto-config Sentry, Prometheus, structlog selon env

    Voir `MIGRATION_GUIDE.md` section "Configuration → BaseMicroservice".
"""
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Configuration de l'application."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # Identité du service
    SERVICE_NAME: str = "hackathon-template-api"
    BUILD_SHA: str = "dev"
    BUILD_DATE: str = "unknown"
    ENVIRONMENT: Literal["development", "staging", "production"] = "development"

    # Logging
    LOG_LEVEL: Literal["DEBUG", "INFO", "WARNING", "ERROR"] = "INFO"

    # Database (PostgreSQL via Supabase ou local)
    # Format attendu : postgresql+asyncpg://user:password@host:port/dbname
    DATABASE_URL: str

    # Supabase
    SUPABASE_URL: str
    SUPABASE_ANON_KEY: str
    SUPABASE_JWT_SECRET: str = ""  # facultatif si on utilise JWKS RS256 (recommandé)
    SUPABASE_JWKS_URL: str = ""  # auto-derivé depuis SUPABASE_URL si vide

    # OpenRouter (LLM)
    # 1 seule clé partagée pour les 4 groupes pendant le hackathon
    # Cap budget côté OpenRouter dashboard (~$50 pour 3 jours)
    OPENROUTER_API_KEY: str
    OPENROUTER_DEFAULT_MODEL: str = "anthropic/claude-3.5-haiku"

    # MiraClass — Simulation revenu
    PLATFORM_FEE_RATIO: float = 0.25  # 25% de frais de plateforme sur le revenu brut

    # CORS (en hackathon : on autorise tout localhost)
    CORS_ALLOW_ORIGINS: list[str] = Field(default_factory=lambda: [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:8080",
        "http://localhost:8081",
    ])

    def supabase_jwks_url(self) -> str:
        """Construit l'URL JWKS Supabase si pas fournie explicitement."""
        if self.SUPABASE_JWKS_URL:
            return self.SUPABASE_JWKS_URL
        # Pattern Supabase standard : {SUPABASE_URL}/auth/v1/jwks
        return f"{self.SUPABASE_URL.rstrip('/')}/auth/v1/jwks"


settings = Settings()  # type: ignore[call-arg]
