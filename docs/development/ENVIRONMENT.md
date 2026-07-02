# Environment variables

## API (`apps/api`)

Copy `apps/api/.env.example` to `apps/api/.env`.

| Variable                              | Required            | Description                                                                                                                                                |
| ------------------------------------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                        | Yes                 | PostgreSQL connection string. Postgres.app: `postgresql://YOUR_MAC_USER@localhost:5432/kloqra`. Docker: `postgresql://kloqra:kloqra@localhost:5432/kloqra` |
| `REDIS_USE_MEMORY`                    | Local dev           | Set `true` to run the timer without Redis (in-memory store). Remove when using real Redis                                                                  |
| `REDIS_URL`                           | Production / Docker | e.g. `redis://localhost:6379`. Used when `REDIS_USE_MEMORY` is not set                                                                                     |
| `JWT_ACCESS_SECRET`                   | Yes                 | Min 32 characters. Signs short-lived access tokens                                                                                                         |
| `JWT_REFRESH_SECRET`                  | Yes                 | Min 32 characters. Signs refresh tokens (httpOnly cookie)                                                                                                  |
| `JWT_ACCESS_EXPIRES`                  | No                  | Default `15m`                                                                                                                                              |
| `JWT_REFRESH_EXPIRES`                 | No                  | Default `7d`                                                                                                                                               |
| `FRONTEND_ORIGIN`                     | Yes                 | Comma-separated CORS origins, e.g. `http://localhost:3000,http://localhost:3002,http://localhost:3003`                                                     |
| `PORT`                                | No                  | API listen port. Default `3001`                                                                                                                            |
| `HARD_AUTO_STOP_HOURS`                | No                  | Max running timer length before auto-stop. Default `12`. Set `NEXT_PUBLIC_HARD_AUTO_STOP_HOURS` to the same value on the client.                           |
| `PUBLIC_CLIENT_URL`                   | Production          | Client app URL for member login links in email. Defaults to the non-admin origin in `FRONTEND_ORIGIN`.                                                     |
| `SMTP_HOST`                           | Production          | **Required in production** for invite/password emails (e.g. `smtp-relay.brevo.com`). Without mail config, members are created but no email is sent.        |
| `SMTP_PORT`                           | With SMTP           | Usually `587` (local dev). Railway Hobby blocks outbound SMTP — see `BREVO_API_KEY` below.                                                                 |
| `SMTP_USER`                           | With SMTP           | SMTP login                                                                                                                                                 |
| `SMTP_PASS`                           | With SMTP           | Brevo SMTP key (`xsmtpsib-…`) for local SMTP only                                                                                                          |
| `SMTP_FROM`                           | With SMTP           | From address for outbound mail (must be authorized by your SMTP provider)                                                                                  |
| `BREVO_API_KEY`                       | Railway / Brevo API | Brevo **API** key (`xkeysib-…`) from SMTP & API → API keys. **Not** the same as `SMTP_PASS`. Required on Railway.                                          |
| `STRIPE_SECRET_KEY`                   | Paid SaaS           | Stripe secret key (`sk_test_…` / `sk_live_…`). Required for Checkout, Portal, reconciliation. Omit locally to enable simulated billing.                    |
| `BILLING_STRIPE_CHECKOUT`             | No                  | Set `true` to use real Stripe Checkout on tenant billing. **Default is simulated** (instant plan change) even when `STRIPE_SECRET_KEY` is set.             |
| `BILLING_SIMULATE_CHECKOUT`           | No                  | Legacy alias. `false` disables simulation. Prefer `BILLING_STRIPE_CHECKOUT=true` for Stripe.                                                               |
| `STRIPE_WEBHOOK_SECRET`               | Paid SaaS webhooks  | Signing secret from Stripe Dashboard or `stripe listen`.                                                                                                   |
| `STRIPE_PRICE_STARTER`                | No                  | Overrides seeded `starter` price id (default `price_test_starter`).                                                                                        |
| `STRIPE_PRICE_PRO`                    | No                  | Overrides seeded `pro` price id (default `price_test_pro`).                                                                                                |
| `STRIPE_PRODUCT_STARTER`              | No                  | Overrides seeded `starter` product id (default `prod_test_starter`).                                                                                       |
| `STRIPE_PRODUCT_PRO`                  | No                  | Overrides seeded `pro` product id (default `prod_test_pro`).                                                                                               |
| `EMAIL_TRANSPORT`                     | No                  | `brevo_api` forces HTTPS API; `smtp` forces SMTP (local). Default: auto (API on Railway + Brevo, else SMTP).                                               |
| `PUBLIC_ADMIN_URL`                    | No                  | Admin app URL for billing checkout return links and emails. Default dev: `http://localhost:3002`                                                           |
| `BILLING_MANUAL_PAYMENT_INSTRUCTIONS` | No                  | Wire/bank copy included when platform sends Enterprise payment instructions email                                                                          |
| `BILLING_RECEIPTS_DIR`                | No                  | Local directory for tenant-uploaded payment receipts. Default: `.billing-receipts` under API cwd                                                           |
| `PLATFORM_SUPERADMIN_EMAIL`           | No                  | Seed email for platform superadmin (`platform@kloqra.dev` default). SaaS-F14.                                                                              |
| `PLATFORM_SUPERADMIN_PASSWORD`        | No                  | Seed password for platform superadmin (`password123` default). SaaS-F14.                                                                                   |
| `PUBLIC_PLATFORM_URL`                 | No                  | Platform-admin URL for password-reset emails. Default dev: `http://localhost:3003`                                                                         |

## Client (`apps/client`)

Copy `apps/client/.env.example` to `apps/client/.env.local`.

| Variable                           | Required | Description                                                                                      |
| ---------------------------------- | -------- | ------------------------------------------------------------------------------------------------ |
| `NEXT_PUBLIC_API_BASE_URL`         | Yes      | API base URL. Default dev: `http://localhost:3001`                                               |
| `NEXT_PUBLIC_HARD_AUTO_STOP_HOURS` | No       | Timer auto-stop ceiling shown in UI toasts. Default `12`; must match API `HARD_AUTO_STOP_HOURS`. |

## Admin (`apps/admin`)

Copy `apps/admin/.env.example` to `apps/admin/.env.local`.

| Variable                   | Required | Description                                        |
| -------------------------- | -------- | -------------------------------------------------- |
| `NEXT_PUBLIC_API_BASE_URL` | Yes      | API base URL. Default dev: `http://localhost:3001` |

## Platform admin (`apps/platform-admin`)

Copy `apps/platform-admin/.env.example` to `apps/platform-admin/.env.local`.

| Variable                   | Required | Description                                        |
| -------------------------- | -------- | -------------------------------------------------- |
| `NEXT_PUBLIC_AUTH_SCOPE`   | Yes      | Must be `platform`                                 |
| `NEXT_PUBLIC_API_BASE_URL` | Yes      | API base URL. Default dev: `http://localhost:3001` |

First sign-in to the platform console requires mandatory two-factor authentication (TOTP) setup before accessing tenant ops routes.

## Local ports

| App            | URL                   |
| -------------- | --------------------- |
| Client         | http://localhost:3000 |
| API            | http://localhost:3001 |
| Admin          | http://localhost:3002 |
| Platform admin | http://localhost:3003 |

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

Demo workspaces after seed: **Acme Corporation** (client services) and **Meridian Product Co** (internal product).

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
