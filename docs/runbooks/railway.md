# Deploy API on Railway (staging and production)

Railway hosts the **NestJS API** with managed PostgreSQL and Redis. Frontends deploy separately on [Vercel](./vercel.md).

## Topology

| Environment | Railway project  | Vercel client           | Vercel admin           |
| ----------- | ---------------- | ----------------------- | ---------------------- |
| Staging     | `kloqra-staging` | `kloqra-client-staging` | `kloqra-admin-staging` |
| Production  | `kloqra-prod`    | `kloqra-client`         | `kloqra-admin`         |

Each environment uses **isolated** Postgres, Redis, and JWT secrets.

---

## Quick start (CLI)

```bash
# 1. Railway API + DB + Redis
bash scripts/deploy/setup-railway.sh staging

# 2. Vercel frontends (after API URL is known)
bash scripts/deploy/setup-vercel.sh staging https://your-staging-api.up.railway.app

# 3. Wire CORS and smoke test
bash scripts/deploy/wire-cors.sh https://kloqra-client-staging.vercel.app https://kloqra-admin-staging.vercel.app
# → paste output as FRONTEND_ORIGIN on Railway API service

bash scripts/deploy/smoke.sh https://your-staging-api.up.railway.app
```

Repeat with `production` for the prod environment.

---

## Dashboard setup (staging)

### 1. Create project

1. [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub** → select `Kloqra`.
2. Name the project `kloqra-staging`.

### 2. Add databases

In the project, click **+ New**:

- **PostgreSQL** — note the service name (e.g. `Postgres`).
- **Redis** — note the connection variable (`REDIS_URL` or `REDIS_PRIVATE_URL`).

### 3. Add API service

1. **+ New** → **GitHub Repo** → same repo (or use the service created in step 1).
2. **Settings → Source:**
   - Root directory: **empty** (monorepo root — **not** `apps/api`)
   - **Builder:** Dockerfile
   - Dockerfile path: `apps/api/Dockerfile`
3. Railway reads [`railway.toml`](../../railway.toml) for build and health check (`GET /health`).

### 4. Environment variables

On the **API service** → **Variables**:

| Variable                    | Value                                                               |
| --------------------------- | ------------------------------------------------------------------- |
| `DATABASE_URL`              | `${{Postgres.DATABASE_URL}}` (reference your Postgres service name) |
| `REDIS_URL`                 | From Redis plugin                                                   |
| `JWT_ACCESS_SECRET`         | `bash scripts/deploy/generate-secrets.sh`                           |
| `JWT_REFRESH_SECRET`        | Same script — unique per environment                                |
| `FRONTEND_ORIGIN`           | Staging Vercel URLs (update after [vercel.md](./vercel.md))         |
| `PUBLIC_ADMIN_URL`          | `https://kloqra-admin-staging.vercel.app`                           |
| `AUTH_COOKIE_SAME_SITE`     | `none` (required for Vercel `*.vercel.app` → Railway API)           |
| `AUTH_COOKIE_SECURE`        | `true`                                                              |
| `REFRESH_ROTATION_GRACE_MS` | `10000`                                                             |
| `NODE_ENV`                  | `production`                                                        |

Do **not** set `PORT` — Railway injects it. Do **not** set `REDIS_USE_MEMORY`. Do **not** set `COOKIE_DOMAIN` for Vercel + Railway (cookies live on the API host).

Template: [`deploy/env.staging.example`](../../deploy/env.staging.example).

### 5. Deploy branch

**Settings → Deploy** → set branch to `staging` or `develop` (your staging branch).

### 6. Run migrations

Once Postgres is reachable:

```bash
DATABASE_URL="<railway-postgres-url>" bash scripts/deploy/migrate.sh
```

Optional seed for staging (demo logins for QA):

```bash
DATABASE_URL="<railway-postgres-url>" pnpm --filter @kloqra/api exec prisma db seed
```

After seed:

| Account             | Password      | Use        |
| ------------------- | ------------- | ---------- |
| `admin@kloqra.dev`  | `password123` | Admin app  |
| `member@kloqra.dev` | `password123` | Client app |

Primary workspace: **Acme Corporation**. Do **not** seed production unless you intend to load demo data.

Or use Railway shell: **API service → Shell** → run migrate with `DATABASE_URL` already set.

### 7. Public URL

**Settings → Networking → Generate Domain** → note URL, e.g. `https://kloqra-api-staging.up.railway.app`.

Smoke test:

```bash
bash scripts/deploy/smoke.sh https://kloqra-api-staging.up.railway.app
```

---

## Production setup

Duplicate the staging project as **`kloqra-prod`** with these differences:

| Item              | Production                               |
| ----------------- | ---------------------------------------- |
| Branch            | `main`                                   |
| JWT secrets       | **New** values — never copy from staging |
| Database          | Separate Postgres instance               |
| Redis             | Separate Redis instance                  |
| Custom domain     | `api.example.com` via Railway Networking |
| `FRONTEND_ORIGIN` | Production Vercel URLs + custom domains  |
| Seed              | Do not seed unless intentional           |

Template: [`deploy/env.production.example`](../../deploy/env.production.example).

### Production checklist

- [ ] Separate Railway project `kloqra-prod`
- [ ] Unique JWT secrets (`generate-secrets.sh`)
- [ ] `prisma migrate deploy` against prod DB before traffic
- [ ] Custom domains on Railway (API) and Vercel (client/admin)
- [ ] `FRONTEND_ORIGIN` lists all HTTPS frontend origins
- [ ] Smoke: health, login, timer, presence, export
- [ ] Entry in [CHANGELOG.md](../../CHANGELOG.md)

---

## Wire CORS after Vercel deploy

Once both Vercel apps are live:

```bash
bash scripts/deploy/wire-cors.sh \
  https://kloqra-client-staging.vercel.app \
  https://kloqra-admin-staging.vercel.app
```

Set the output as `FRONTEND_ORIGIN` on the Railway API service and redeploy.

For custom domains, include every origin:

```env
FRONTEND_ORIGIN=https://app.example.com,https://admin.example.com
```

---

## CI migrations

GitHub Actions runs `prisma migrate deploy` on pushes to `staging` / `main` when API or Prisma files change. Configure:

- GitHub **Environment** `staging` → secret `DATABASE_URL`
- GitHub **Environment** `production` → secret `DATABASE_URL`

See [`.github/workflows/deploy.yml`](../../.github/workflows/deploy.yml).

Run migrations **before** or **with** each API rollout. Railway auto-deploys on push; ensure the migrate workflow completes first (or run migrate manually).

---

## Assistant API service (optional)

The member help assistant runs as a **second Railway service** (`apps/assistant-api`) on private networking. The NestJS API proxies `POST /assistant/chat` to it.

### Add assistant service

1. **+ New** → **GitHub Repo** → same monorepo.
2. **Settings → Source → Root Directory:** leave as **`/`** (repo root). Do not set `assistant-api /` unless you also change `dockerfilePath` in the config file.
3. **Settings → Config-as-code → Config file path:** `/apps/assistant-api/railway.toml` (leading `/` required).
4. Confirm **Build → Dockerfile path** is `apps/assistant-api/Dockerfile` (from config — not plain `Dockerfile`).
5. Enable **Private Networking** — do **not** assign a public domain.
6. Health check: `GET /health`.

**`couldn't locate the dockerfile at path Dockerfile`:** Root Directory is `/` but Dockerfile path was `Dockerfile`. Use `apps/assistant-api/Dockerfile` via the config file above (already in repo).

**Local Docker (from repo root):** `docker build -f apps/assistant-api/Dockerfile .`

### Variables

**Assistant service:**

| Variable                    | Value                                                |
| --------------------------- | ---------------------------------------------------- |
| `OPENAI_API_KEY`            | OpenAI API key                                       |
| `OPENAI_MODEL`              | `gpt-4o-mini` (optional)                             |
| `ASSISTANT_INTERNAL_SECRET` | Shared secret (generate with `openssl rand -hex 32`) |
| `ASSISTANT_ENABLED`         | `true`                                               |

**NestJS API service (add):**

| Variable                    | Value                                                |
| --------------------------- | ---------------------------------------------------- |
| `ASSISTANT_SERVICE_URL`     | `http://<assistant-service>.railway.internal:<port>` |
| `ASSISTANT_INTERNAL_SECRET` | Same secret as assistant service                     |
| `ASSISTANT_ENABLED`         | `true`                                               |

If assistant vars are omitted, `/assistant/chat` returns a static fallback (help links) without calling OpenAI.

### Local dev

```bash
cd apps/assistant-api
pip install -r requirements.txt -r requirements-dev.txt
ASSISTANT_INTERNAL_SECRET=dev-secret uvicorn src.main:app --reload --port 3003
```

Set matching vars in `apps/api/.env`.

---

## Alternatives

| Platform | Config                                                            | Runbook                        |
| -------- | ----------------------------------------------------------------- | ------------------------------ |
| Render   | [`render.yaml`](../../render.yaml)                                | Same env vars as Railway       |
| Fly.io   | `fly launch` + [`apps/api/Dockerfile`](../../apps/api/Dockerfile) | [vercel.md](./vercel.md) § API |
| AWS ECS  | See [deploy.md](./deploy.md)                                      | When PaaS limits are hit       |

---

## Troubleshooting

| Issue                                      | Fix                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Build fails — can't find contracts         | Logs show `/app/apps/api` + `pnpm start` → Railway is using Nixpacks with wrong root. Set **Root Directory** to repo root (empty), **Builder** to Dockerfile `apps/api/Dockerfile`. Or redeploy with latest code (`prebuild` builds contracts).                                                                                                                                                                                                                                                                                                            |
| `pnpm deploy` / `WORKSPACE_PKG_NOT_FOUND`  | Dockerfile must include root workspace packages (`config-eslint`, `config-prettier`) so `pnpm deploy --prod` can resolve the monorepo. Use latest `apps/api/Dockerfile`.                                                                                                                                                                                                                                                                                                                                                                                   |
| `Cannot find module '@kloqra/contracts'`   | `packages/contracts` missing from the image — use per-package `COPY` lines in `apps/api/Dockerfile` (not one multi-source `COPY`). Confirm **Root Directory** is repo root (empty).                                                                                                                                                                                                                                                                                                                                                                        |
| `DATABASE_URL is empty` / `PGHOST=<unset>` | Railway is **not** passing any DB vars into the **API** container. Variables on the Postgres service alone do nothing. On the **API** service → **Variables** → **New Variable** → **Reference** (use the dropdown; do not type `${{Postgres...}}` by hand unless the service name matches exactly) → Postgres → `DATABASE_URL`. Or paste the full `postgresql://` URL in **Raw Editor** on the API service. **Redeploy API.** Verify with `bash scripts/deploy/railway-check-vars.sh production`. Success logs: `DATABASE_URL configured (N characters)`. |
| Health check failing                       | Check deploy logs for startup crash (often `DATABASE_URL` / Prisma). App must listen on Railway's injected `PORT` at `0.0.0.0`. Verify `GET /health` returns 200. Do not hardcode `PORT=3001` in Railway variables.                                                                                                                                                                                                                                                                                                                                        |
| `@prisma/client did not initialize yet`    | `pnpm deploy` omits `prisma generate` in the runtime bundle. Use latest `apps/api/Dockerfile` (runs `prisma generate` against `/prod/prisma/schema.prisma` after deploy). Rebuild and redeploy.                                                                                                                                                                                                                                                                                                                                                            |
| `InstanceLoader` / Prisma engine error     | Deploy logs often show only a Nest stack tail — scroll up for `PrismaClientInitializationError` or `libquery_engine-linux-musl`. Use latest `apps/api/Dockerfile` (OpenSSL + `prisma generate` in `/prod`). Set **Config file** to `/railway.toml`.                                                                                                                                                                                                                                                                                                        |
| Timer/presence broken                      | Confirm `REDIS_URL` is set; `REDIS_USE_MEMORY` is unset                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| CORS errors                                | `FRONTEND_ORIGIN` must match exact frontend URL (scheme + host)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Migrations pending                         | Run `scripts/deploy/migrate.sh` with prod/staging `DATABASE_URL`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |

See also [deploy.md](./deploy.md), [vercel.md](./vercel.md), [ENVIRONMENT.md](../development/ENVIRONMENT.md).
