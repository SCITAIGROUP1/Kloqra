# Deploy client & admin on Vercel

Kloqra has **three** deployable parts:

| App                        | Platform                   | Why                                                               |
| -------------------------- | -------------------------- | ----------------------------------------------------------------- |
| **Client** (`apps/client`) | Vercel                     | Next.js 15                                                        |
| **Admin** (`apps/admin`)   | Vercel                     | Next.js 15                                                        |
| **API** (`apps/api`)       | Railway, Render, or Fly.io | NestJS + PostgreSQL + Redis (long-running, not Vercel serverless) |

Deploy the **API first** (see [railway.md](./railway.md)), then point both frontends at it.

---

## Staging and production projects

Use **four Vercel projects per environment** (two apps × two envs), or one project per app with Preview/Production env vars.

| Environment | Client project          | Admin project          | Git branch            |
| ----------- | ----------------------- | ---------------------- | --------------------- |
| Staging     | `kloqra-client-staging` | `kloqra-admin-staging` | `staging` / `develop` |
| Production  | `kloqra-client`         | `kloqra-admin`         | `main`                |

Env templates: [`deploy/env.staging.example`](../../deploy/env.staging.example), [`deploy/env.production.example`](../../deploy/env.production.example).

### CLI bootstrap

```bash
bash scripts/deploy/setup-vercel.sh staging https://your-staging-api.up.railway.app
bash scripts/deploy/setup-vercel.sh production https://api.example.com
```

---

## 1. API (required before frontends work)

Use a host that supports Docker or Node 20 + Postgres + Redis.

### Option A — Railway (recommended)

Full guide: **[railway.md](./railway.md)**.

Summary:

1. Project `kloqra-staging` or `kloqra-prod`
2. PostgreSQL + Redis plugins
3. API service: monorepo root, Dockerfile `apps/api/Dockerfile`, config in [`railway.toml`](../../railway.toml)
4. Run migrations: `bash scripts/deploy/migrate.sh <DATABASE_URL>`

### Option B — Render

Import [`render.yaml`](../../render.yaml) or create a Docker web service manually. Same env vars as Railway.

Health check: `GET /health` on your API URL.

---

## 2. Vercel — Client app

1. [vercel.com](https://vercel.com) → **Add New Project** → Import your GitHub repo.
2. **Project name:** e.g. `kloqra-client-staging` or `kloqra-client`
3. **Root Directory:** `apps/client`
4. **Framework Preset:** Next.js (auto)
5. Enable **“Include source files outside of the Root Directory”** (required for `packages/ui` and `packages/contracts`).
6. Build settings (from [`apps/client/vercel.json`](../../apps/client/vercel.json)):
   - Install: `pnpm install --frozen-lockfile`
   - Build: `pnpm --filter @kloqra/client... build`
7. **Environment variables:**

   | Name                                     | Value                                                                      |
   | ---------------------------------------- | -------------------------------------------------------------------------- |
   | `NEXT_PUBLIC_API_BASE_URL`               | `https://your-api-host.example.com` (no trailing slash)                    |
   | `NEXT_PUBLIC_AUTH_SCOPE`                 | `client`                                                                   |
   | `NEXT_PUBLIC_CLIENT_COMMERCIAL_FEATURES` | Match API `CLIENT_COMMERCIAL_FEATURES_ENABLED` (`true` prod / `false` UAT) |

8. Deploy → copy production URL.

---

## 3. Vercel — Admin app

Create a **second** Vercel project (same repo, different root):

1. **Add New Project** → same GitHub repo.
2. **Project name:** e.g. `kloqra-admin-staging` or `kloqra-admin`
3. **Root Directory:** `apps/admin`
4. **Include source files outside of the Root Directory:** ON
5. Build from [`apps/admin/vercel.json`](../../apps/admin/vercel.json):
   - Build: `pnpm --filter @kloqra/admin... build`
6. **Environment variables:**

   | Name                                     | Value                                      |
   | ---------------------------------------- | ------------------------------------------ |
   | `NEXT_PUBLIC_API_BASE_URL`               | Same API URL as client                     |
   | `NEXT_PUBLIC_AUTH_SCOPE`                 | `admin`                                    |
   | `NEXT_PUBLIC_ADMIN_URL`                  | Admin public URL (share links)             |
   | `NEXT_PUBLIC_CLIENT_COMMERCIAL_FEATURES` | Match API flag (`true` prod / `false` UAT) |

7. Deploy.

---

## 4. Wire CORS on the API

After both frontends are deployed:

```bash
bash scripts/deploy/wire-cors.sh \
  https://kloqra-client-staging.vercel.app \
  https://kloqra-admin-staging.vercel.app
```

Set the output as `FRONTEND_ORIGIN` on the Railway API service and redeploy.

For production with custom domains:

```env
FRONTEND_ORIGIN=https://app.example.com,https://admin.example.com
```

---

## 5. Smoke test

```bash
bash scripts/deploy/smoke.sh https://your-api-host
```

1. Open admin URL → login (`admin@kloqra.dev` if you seeded staging).
2. Open client URL → login as member → start timer.
3. Admin **Team live** should show activity.
4. Run an **Export** from admin and confirm download.

---

## CLI (optional)

From repo root, with [Vercel CLI](https://vercel.com/docs/cli) installed and logged in:

```bash
# Staging client
cd apps/client && vercel link
vercel env add NEXT_PUBLIC_API_BASE_URL production
vercel env add NEXT_PUBLIC_AUTH_SCOPE production
vercel --prod

# Staging admin (separate project)
cd apps/admin && vercel link
vercel env add NEXT_PUBLIC_API_BASE_URL production
vercel env add NEXT_PUBLIC_AUTH_SCOPE production
vercel env add NEXT_PUBLIC_ADMIN_URL production
vercel --prod
```

Or use `scripts/deploy/setup-vercel.sh`.

---

## Custom domains (production)

In each Vercel project: **Settings → Domains**:

- Client: `app.yourdomain.com`
- Admin: `admin.yourdomain.com`

Add those origins to API `FRONTEND_ORIGIN`. Set API custom domain on Railway (`api.yourdomain.com`).

---

## Why not all three on Vercel?

The API is a **NestJS** server with **Prisma**, **PostgreSQL**, **Redis** (timer/presence), SSE streams, and a background export scheduler. Vercel is optimized for Next.js and serverless functions, not a persistent Node API + Redis.

---

## Troubleshooting

| Issue                                        | Fix                                                                                                                                                |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Build can’t find `@kloqra/ui`                | Turn on “Include source files outside Root Directory”; ensure `vercel.json` build uses `...` filter                                                |
| `pnpm: command not found`                    | Vercel project Settings → enable pnpm (`packageManager` in root `package.json` is `pnpm@9.15.0`)                                                   |
| Login works locally, fails in prod           | Check `NEXT_PUBLIC_API_BASE_URL`, API `FRONTEND_ORIGIN`, and API logs                                                                              |
| Invalid token / refresh fails after ~15m     | Set Railway `AUTH_COOKIE_SAME_SITE=none` and `AUTH_COOKIE_SECURE=true` (Vercel + Railway are cross-site)                                           |
| 404 to `vercel.app/your-api.railway.app/...` | `NEXT_PUBLIC_API_BASE_URL` is missing `https://` (e.g. set to `api.up.railway.app` only). Use `https://api.up.railway.app`, redeploy client/admin. |
| CORS error in browser                        | `FRONTEND_ORIGIN` must list exact frontend origins (scheme + host)                                                                                 |

See also [deploy.md](./deploy.md), [railway.md](./railway.md), [ENVIRONMENT.md](../development/ENVIRONMENT.md).
