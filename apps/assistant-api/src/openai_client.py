"""OpenAI chat client and offline fallback."""

from __future__ import annotations

import json
import logging
import re
from typing import TYPE_CHECKING

from openai import AsyncOpenAI

from .config import settings
from .knowledge import NAV_CATALOG
from .prompt import build_system_prompt
from .schemas import AssistantLink, ChatMessage, ChatResponse

if TYPE_CHECKING:
    pass

logger = logging.getLogger(__name__)


def _parse_response_json(raw: str) -> ChatResponse:
    try:
        data = json.loads(raw)
        return ChatResponse.model_validate(data)
    except (json.JSONDecodeError, ValueError):
        return ChatResponse(reply=raw.strip()[:4000])


def _fallback_for_message(text: str) -> ChatResponse:
    lower = text.lower()
    links: list[AssistantLink] = []

    if "timer" in lower or "start" in lower and "track" in lower:
        links.append(AssistantLink(label="Timer", href="/timer"))
        reply = (
            "Open **Timer** from the sidebar, pick your project and task, then click **Start**. "
            "Stop the timer when you are done — the entry appears on your timesheet."
        )
    elif "submit" in lower or "approval" in lower:
        links.append(AssistantLink(label="Submissions", href="/submissions"))
        reply = (
            "Go to **Submissions**, review each project card for the current period, "
            "add an optional note, then submit for approval."
        )
    elif "export" in lower:
        links.append(AssistantLink(label="Timesheet", href="/timesheet"))
        reply = (
            "On **Timesheet**, set your date range, choose report types and format, "
            "then click **Export** to download your own hours."
        )
    elif "timesheet" in lower or "calendar" in lower:
        links.append(AssistantLink(label="Timesheet", href="/timesheet"))
        reply = (
            "**Timesheet** is the calendar view — drag to create entries, move blocks, or resize. "
            "Use **Add entry** for manual logs."
        )
    elif "time tracker" in lower or "list" in lower:
        links.append(AssistantLink(label="Time Tracker", href="/time-tracker"))
        reply = "**Time Tracker** shows your entries in a weekly list with filters and date range."
    else:
        reply = (
            "I can help with Timer, Timesheet, Time Tracker, Submissions, and exports. "
            "Try the sparkles menu in the header for the Full setup guide."
        )
        links = [
            AssistantLink(label=item["label"], href=item["href"]) for item in NAV_CATALOG[:3]
        ]

    return ChatResponse(reply=re.sub(r"\*\*", "", reply), links=links or None)


class OpenAIChatClient:
    def __init__(self) -> None:
        self._client: AsyncOpenAI | None = None
        if settings.openai_api_key:
            self._client = AsyncOpenAI(api_key=settings.openai_api_key)

    @property
    def is_configured(self) -> bool:
        return self._client is not None

    async def chat(self, messages: list[ChatMessage], user_display_name: str | None) -> ChatResponse:
        last_user = next((m.content for m in reversed(messages) if m.role == "user"), "")

        if not self._client or not settings.assistant_enabled:
            return _fallback_for_message(last_user)

        openai_messages: list[dict[str, str]] = [{"role": "system", "content": build_system_prompt()}]
        if user_display_name:
            openai_messages.append(
                {
                    "role": "system",
                    "content": f"The member's display name is {user_display_name}.",
                }
            )
        for msg in messages:
            openai_messages.append({"role": msg.role, "content": msg.content})

        try:
            completion = await self._client.chat.completions.create(
                model=settings.openai_model,
                messages=openai_messages,
                response_format={"type": "json_object"},
                temperature=0.2,
                max_tokens=800,
            )
            choice = completion.choices[0].message.content or ""
            usage = completion.usage
            if usage:
                logger.info(
                    "openai chat prompt_tokens=%s completion_tokens=%s",
                    usage.prompt_tokens,
                    usage.completion_tokens,
                )
            return _parse_response_json(choice)
        except Exception as exc:
            logger.warning("openai chat failed: %s", exc)
            return _fallback_for_message(last_user)


chat_client = OpenAIChatClient()
