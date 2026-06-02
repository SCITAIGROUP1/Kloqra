# Staging deployment runbook

## Prerequisites

- PostgreSQL 16+ and Redis 7+
- Node.js 20+
- Vercel account (frontends)
- Container host for API (Fly.io / Railway / AWS)

## Environment checklist

Full variable reference: [ENVIRONMENT.md](../development/ENVIRONMENT.md).  
Security notes: [SECURITY.md](../development/SECURITY.md).

| Service | Required variables |
|---------|-------------------|
| API | `DATABASE_URL`, `REDIS_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `FRONTEND_ORIGIN`, `PORT` |
| Client | `NEXT_PUBLIC_API_BASE_URL` |
| Admin | `NEXT_PUBLIC_API_BASE_URL` |

Production API must **not** set `REDIS_USE_MEMORY` — use a real Redis for timer and presence.

Set `FRONTEND_ORIGIN` to your deployed client and admin URLs (comma-separated, HTTPS).

## API

1. Build Docker image from the **monorepo root** (workspace packages must be in context):

   ```bash
   docker build -f apps/api/Dockerfile -t chronomint-api .
   ```

2. Set env per checklist above
3. Run `prisma migrate deploy` on release (see [CONTRIBUTING.md](../development/CONTRIBUTING.md))
4. Health check: `GET /health` — documented in [api/ROUTES.md](../api/ROUTES.md)

## Client and Admin (Vercel)

1. Connect repo; set root directory to `apps/client` or `apps/admin`
2. Env: `NEXT_PUBLIC_API_BASE_URL=https://api.yourdomain.com`
3. Deploy preview, then production

Per-app notes: [apps/client/README.md](../../apps/client/README.md), [apps/admin/README.md](../../apps/admin/README.md).

## Post-deploy smoke

```bash
curl https://api.yourdomain.com/health
```

Manual checks:

1. Login as `admin@chronomint.dev` (or production admin) — open admin **Dashboard** (`/dashboard`).
2. Login as member on client — **Start timer**, then confirm **Team live** on admin (`/team`) shows active timer.
3. Run a small **Export** from admin (`/exports`) and confirm download.

User walkthroughs: [user-guides](../user-guides/README.md).

## Migrations

- Always run `prisma migrate deploy` before or as part of API rollout.
- Do not roll back migrations without DBA review.
- Schema reference: [DATA_MODEL.md](../architecture/DATA_MODEL.md).

## Rollback

- Revert Vercel deployment for client/admin.
- Roll back API container to previous image.
- **Do not** rollback database migrations without a reviewed plan.

## Local issues before deploy

See [local-troubleshooting.md](local-troubleshooting.md).

## Changelog

Record production releases in [CHANGELOG.md](../../CHANGELOG.md).
