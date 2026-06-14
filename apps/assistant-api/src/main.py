"""FastAPI application."""

from __future__ import annotations

import logging
import os
from typing import Annotated

from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.responses import JSONResponse

from .config import settings
from .knowledge import KNOWLEDGE_VERSION
from .openai_client import chat_client
from .schemas import ChatRequest, ChatResponse

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Kloqra Assistant API",
    description="Internal member help assistant service",
    version="0.1.0",
    docs_url="/docs" if settings.assistant_enabled else None,
    redoc_url=None,
)


def verify_internal_secret(
    x_assistant_secret: Annotated[str | None, Header()] = None,
) -> None:
    expected = os.getenv("ASSISTANT_INTERNAL_SECRET") or settings.assistant_internal_secret
    if not expected:
        if settings.assistant_enabled:
            logger.warning("ASSISTANT_INTERNAL_SECRET not set — rejecting internal requests")
            raise HTTPException(status_code=503, detail="Assistant not configured")
        return
    if x_assistant_secret != expected:
        raise HTTPException(status_code=401, detail="Unauthorized")


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "knowledgeVersion": KNOWLEDGE_VERSION}


@app.post("/internal/chat", response_model=ChatResponse)
async def internal_chat(
    body: ChatRequest,
    request: Request,
    _: Annotated[None, Depends(verify_internal_secret)] = None,
) -> ChatResponse:
    if not settings.assistant_enabled:
        raise HTTPException(status_code=503, detail="Assistant disabled")

    request_id = request.headers.get("x-request-id") if request else None
    if request_id:
        logger.info("chat request_id=%s messages=%s", request_id, len(body.messages))

    return await chat_client.chat(body.messages, body.user_display_name)


@app.exception_handler(Exception)
async def unhandled_exception_handler(_request: Request, exc: Exception) -> JSONResponse:
    logger.exception("unhandled error: %s", exc)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})
