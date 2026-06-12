# Environment variables

## API (`apps/api`)

Copy `apps/api/.env.example` to `apps/api/.env`.

| Variable              | Required            | Description                                                                                                                                                |
| --------------------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`        | Yes                 | PostgreSQL connection string. Postgres.app: `postgresql://YOUR_MAC_USER@localhost:5432/kloqra`. Docker: `postgresql://kloqra:kloqra@localhost:5432/kloqra` |
| `REDIS_USE_MEMORY`    | Local dev           | Set `true` to run the timer without Redis (in-memory store). Remove when using real Redis                                                                  |
| `REDIS_URL`           | Production / Docker | e.g. `redis://localhost:6379`. Used when `REDIS_USE_MEMORY` is not set                                                                                     |
| `JWT_ACCESS_SECRET`   | Yes                 | Min 32 characters. Signs short-lived access tokens                                                                                                         |
| `JWT_REFRESH_SECRET`  | Yes                 | Min 32 characters. Signs refresh tokens (httpOnly cookie)                                                                                                  |
| `JWT_ACCESS_EXPIRES`  | No                  | Default `15m`                                                                                                                                              |
| `JWT_REFRESH_EXPIRES` | No                  | Default `7d`                                                                                                                                               |
| `FRONTEND_ORIGIN`     | Yes                 | Comma-separated CORS origins, e.g. `http://localhost:3000,http://localhost:3002`                                                                           |
| `PORT`                | No                  | API listen port. Default `3001`                                                                                                                            |
| `SMTP_HOST`           | Member emails       | SMTP host (e.g. Brevo `smtp-relay.brevo.com`). Omit locally — temp passwords log to the API console                                                        |
| `SMTP_PORT`           | With SMTP           | Usually `587`                                                                                                                                              |
| `SMTP_USER`           | With SMTP           | SMTP login                                                                                                                                                 |
| `SMTP_PASS`           | With SMTP           | SMTP password or API key                                                                                                                                   |
| `SMTP_FROM`           | With SMTP           | From address for outbound mail                                                                                                                             |
| `PUBLIC_ADMIN_URL`    | No                  | Admin app URL for links in emails. Default dev: `http://localhost:3002`                                                                                    |

## Client (`apps/client`)

Copy `apps/client/.env.example` to `apps/client/.env.local`.

| Variable                   | Required | Description                                        |
| -------------------------- | -------- | -------------------------------------------------- |
| `NEXT_PUBLIC_API_BASE_URL` | Yes      | API base URL. Default dev: `http://localhost:3001` |

## Admin (`apps/admin`)

Copy `apps/admin/.env.example` to `apps/admin/.env.local`.

| Variable                   | Required | Description                                        |
| -------------------------- | -------- | -------------------------------------------------- |
| `NEXT_PUBLIC_API_BASE_URL` | Yes      | API base URL. Default dev: `http://localhost:3001` |

## Local ports

| App    | URL                   |
| ------ | --------------------- |
| Client | http://localhost:3000 |
| API    | http://localhost:3001 |
| Admin  | http://localhost:3002 |

## Local database and seed

Create the database once (Postgres.app):

```bash
createdb kloqra
```

Set `DATABASE_URL` in `apps/api/.env` (see table above). Apply schema and demo data:

```bash
pnpm prisma:migrate
pnpm prisma:seed
```

| Account             | Password      | Role             | App    |
| ------------------- | ------------- | ---------------- | ------ |
| `admin@kloqra.dev`  | `password123` | Workspace ADMIN  | Admin  |
| `member@kloqra.dev` | `password123` | Workspace MEMBER | Client |

Demo workspaces after seed: **Acme Corporation** (primary), **Meridian Product Co**, **Apex Consulting**.

**Upgrading from ChronoMint:** rename is branding-only for the app; the breaking local change is the default DB name `chronomint` → `kloqra`. Create `kloqra`, update `.env`, migrate, and seed — or keep your old DB name in `DATABASE_URL` until you are ready to reset.

## CI / integration tests

GitHub Actions (`.github/workflows/ci.yml`) uses ephemeral Postgres:

- User / password: `kloqra` / `kloqra`
- Database: `kloqra_test`
- `DATABASE_URL`: `postgresql://kloqra:kloqra@localhost:5432/kloqra_test`

Each `integration` and `e2e` job runs `prisma migrate deploy` then `pnpm prisma:seed` before tests.

## Production notes

- Set `secure: true` on auth cookies in production (see auth controller).
- Use strong, unique `JWT_*_SECRET` values; rotate on compromise.
- `FRONTEND_ORIGIN` must list every deployed frontend origin (no wildcards in production unless intentional).
- Run `pnpm prisma:migrate` (or `prisma migrate deploy`) before starting the API.

See also [SECURITY.md](SECURITY.md) and [runbooks/deploy.md](../runbooks/deploy.md).
