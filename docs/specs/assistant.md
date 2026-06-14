# Member help assistant

## Scope (v1)

- Member client app only (`apps/client`)
- Conversational help powered by OpenAI via `apps/assistant-api` (FastAPI)
- Public API: `POST /assistant/chat` (NestJS proxy, JWT required)
- Answers product questions and returns in-app deep links
- No timer/timesheet writes, no personal time data sent to the model

## Architecture

```
Client → NestJS POST /assistant/chat → FastAPI POST /internal/chat → OpenAI
```

- `OPENAI_API_KEY` lives on the assistant service only
- Python service is internal (Railway private networking in production)
- Shared secret header: `X-Assistant-Secret`

## Contracts

- Request: `assistantChatRequestSchema` — up to 10 messages, 2k chars each
- Response: `assistantChatResponseSchema` — `reply` + optional `links[]`

## Safety rules

- LLM must use curated knowledge only; say “I’m not sure” when unknown
- Never ask for passwords or perform actions on behalf of the user
- NestJS enforces per-user Redis rate limit (20 req/min)
- Circuit breaker returns static fallback links when Python/OpenAI is unavailable

## Knowledge base

SSOT: [`apps/assistant-api/src/knowledge.py`](../../apps/assistant-api/src/knowledge.py)

Update when:

- Member nav routes change (`workspace-shell.tsx`)
- Member user guides under `docs/user-guides/member/`
- Onboarding copy in `onboarding-steps.ts`

Bump `KNOWLEDGE_VERSION` in `knowledge.py` when content changes.

## Environment

| Variable                    | Service             | Purpose               |
| --------------------------- | ------------------- | --------------------- |
| `OPENAI_API_KEY`            | assistant-api       | OpenAI API            |
| `OPENAI_MODEL`              | assistant-api       | Default `gpt-4o-mini` |
| `ASSISTANT_INTERNAL_SECRET` | api + assistant-api | Internal auth         |
| `ASSISTANT_SERVICE_URL`     | api                 | Python base URL       |
| `ASSISTANT_ENABLED`         | api + assistant-api | Kill switch           |

## Future phases

See plan: read-only tools, RAG, confirm-before-execute time entry actions.
