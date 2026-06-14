import pytest
from httpx import ASGITransport, AsyncClient

from src.main import app


@pytest.fixture
def secret(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("ASSISTANT_INTERNAL_SECRET", "test-secret")
    monkeypatch.setenv("ASSISTANT_ENABLED", "true")
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    return "test-secret"


@pytest.mark.asyncio
async def test_health():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"


@pytest.mark.asyncio
async def test_internal_chat_rejects_missing_secret(secret: str):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post(
            "/internal/chat",
            json={"messages": [{"role": "user", "content": "How do I start a timer?"}]},
        )
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_internal_chat_fallback_without_openai(secret: str):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post(
            "/internal/chat",
            json={"messages": [{"role": "user", "content": "How do I start a timer?"}]},
            headers={"X-Assistant-Secret": secret},
        )
    assert res.status_code == 200
    body = res.json()
    assert "timer" in body["reply"].lower()
    assert any(link["href"] == "/timer" for link in body.get("links") or [])


def test_openai_client_export_fallback():
    from src.openai_client import _fallback_for_message

    res = _fallback_for_message("How do I export my hours?")
    assert any(link.href == "/timesheet" for link in res.links or [])
