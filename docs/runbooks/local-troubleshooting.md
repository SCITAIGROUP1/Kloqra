# Local development troubleshooting

## Database connection failed

**Symptom:** API fails on startup with Prisma / PostgreSQL errors.

**Fix:**

1. Ensure PostgreSQL is running (Postgres.app or `docker compose up -d`).
2. Create the database once: `createdb kloqra`
3. Set `DATABASE_URL` in `apps/api/.env`:
   - Postgres.app: `postgresql://YOUR_MAC_USERNAME@localhost:5432/kloqra`
   - Docker: `postgresql://kloqra:kloqra@localhost:5432/kloqra`
4. Run `pnpm prisma:migrate`

## Migrations out of sync

```bash
pnpm prisma:migrate
pnpm prisma:generate
```

If you reset locally: drop and recreate `kloqra`, then migrate and `pnpm prisma:seed`.

**Migrating from the old `chronomint` database name:** create `createdb kloqra`, set `DATABASE_URL=postgresql://YOUR_USER@localhost:5432/kloqra` in `apps/api/.env`, then `pnpm prisma:migrate && pnpm prisma:seed`. Seed accounts are `@kloqra.dev` (not `@chronomint.dev`). Primary workspace: **Acme Corporation**.

## Timer does not start

**Symptom:** `POST /timer/start` errors or timer state is lost.

**Fix:**

- For local dev without Docker, set `REDIS_USE_MEMORY=true` in `apps/api/.env`.
- With Docker, set `REDIS_URL=redis://localhost:6379` and remove `REDIS_USE_MEMORY`.

## CORS or login fails from browser

**Symptom:** Network errors, blocked requests, or cookies not sent.

**Fix:**

1. `FRONTEND_ORIGIN` in `apps/api/.env` must include both:
   - `http://localhost:3000` (client)
   - `http://localhost:3002` (admin)
2. Frontends must use `NEXT_PUBLIC_API_BASE_URL=http://localhost:3001`.
3. API requests from the browser should use `credentials: "include"` where cookies are used.

## Admin redirects to client or “not admin”

Sign in to admin with **`admin@kloqra.dev`**. Member accounts are workspace `MEMBER` role and are not intended for the admin app.

## Weird login/logout with client and admin both open

Both apps talk to the same API (`localhost:3001`) and share **httpOnly auth cookies** on that host. Each app keeps its own Bearer token in `localStorage` (scoped by `NEXT_PUBLIC_AUTH_SCOPE`).

**Symptoms:** Wrong user after switching apps, 401 loops, admin shows member session, logout in one app leaves the other “half logged in”.

**Fix:**

1. Log out from **both** apps (admin now calls the API logout; client already did).
2. Hard refresh both tabs or clear site data for `localhost`.
3. Set in `apps/admin/.env.local`: `NEXT_PUBLIC_AUTH_SCOPE=admin`
4. Set in `apps/client/.env.local`: `NEXT_PUBLIC_AUTH_SCOPE=client`
5. Restart both frontends after changing env.

See [AUTH.md](../architecture/AUTH.md).

## Workspace required / 401 on API calls

Authenticated routes need:

- `Authorization: Bearer <accessToken>` (from login response or `localStorage` in frontends), and
- `X-Workspace-Id: <workspace uuid>` matching the active workspace.

Refresh via `POST /auth/refresh` if the access token expired (uses httpOnly refresh cookie).

## Port already in use

| Port | App    |
| ---- | ------ |
| 3000 | Client |
| 3001 | API    |
| 3002 | Admin  |

Stop the conflicting process or change `PORT` in `apps/api/.env` and update `NEXT_PUBLIC_API_BASE_URL` if you change the API port.

## Contracts / UI out of date after pull

```bash
pnpm install
pnpm --filter @kloqra/contracts build
pnpm --filter @kloqra/ui build
pnpm dev
```

## Still stuck?

See [ENVIRONMENT.md](../development/ENVIRONMENT.md) and [deploy.md](deploy.md) for production differences.
