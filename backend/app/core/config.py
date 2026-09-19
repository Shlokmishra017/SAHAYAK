"""Environment-backed application settings."""

import os
from dataclasses import dataclass
from dotenv import load_dotenv

load_dotenv()


@dataclass(frozen=True)
class Settings:
    demo_mode: bool = os.getenv("DEMO_MODE", "true").lower() == "true"
    database_url: str = os.getenv("DATABASE_URL", "sqlite:///./sahayak.db")
    jwt_secret: str = os.getenv("JWT_SECRET")
    jwt_issuer: str = os.getenv("JWT_ISSUER", "sahayak-api")
    jwt_expiry_minutes: int = int(os.getenv("JWT_EXPIRY_MINUTES", "60"))
    cors_origins: tuple[str, ...] = tuple(
        origin.strip()
        for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
        if origin.strip()
    )


settings = Settings()

# Validate JWT_SECRET is set and strong enough
if not settings.jwt_secret:
    raise RuntimeError("JWT_SECRET environment variable must be set")
if not settings.demo_mode and len(settings.jwt_secret) < 32:
    raise RuntimeError("JWT_SECRET must be at least 32 characters long when DEMO_MODE is disabled")