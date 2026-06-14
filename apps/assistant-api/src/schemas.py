"""Pydantic models mirroring packages/contracts assistant.dto.ts."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=2000)


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(min_length=1, max_length=10)
    user_display_name: str | None = Field(default=None, max_length=120)


class AssistantLink(BaseModel):
    label: str = Field(min_length=1, max_length=80)
    href: str = Field(min_length=1, max_length=200)


class ChatResponse(BaseModel):
    reply: str = Field(min_length=1, max_length=4000)
    links: list[AssistantLink] | None = Field(default=None, max_length=5)
