"""Environment and feature flags."""

from __future__ import annotations

import os
from dataclasses import dataclass


def _env_bool(name: str, default: bool = True) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in ("1", "true", "yes", "on")


@dataclass(frozen=True)
class Settings:
    openai_api_key: str | None
    openai_model: str
    assistant_internal_secret: str | None
    assistant_enabled: bool
    port: int

    @classmethod
    def load(cls) -> Settings:
        return cls(
            openai_api_key=os.getenv("OPENAI_API_KEY") or None,
            openai_model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
            assistant_internal_secret=os.getenv("ASSISTANT_INTERNAL_SECRET") or None,
            assistant_enabled=_env_bool("ASSISTANT_ENABLED", True),
            port=int(os.getenv("PORT", "3003")),
        )


settings = Settings.load()
