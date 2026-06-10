# Deploy assets

Configuration and env templates for staging and production.

| File                                               | Purpose                           |
| -------------------------------------------------- | --------------------------------- |
| [env.staging.example](./env.staging.example)       | Variable checklist for staging    |
| [env.production.example](./env.production.example) | Variable checklist for production |

Repo-level config:

| File                            | Purpose                          |
| ------------------------------- | -------------------------------- |
| [railway.toml](../railway.toml) | Railway API build + health check |
| [render.yaml](../render.yaml)   | Optional Render blueprint        |

Scripts (from repo root):

```bash
pnpm install                                     # includes @railway/cli and vercel
pnpm deploy:secrets                              # JWT secrets
pnpm deploy:migrate -- <DATABASE_URL>            # prisma migrate deploy
pnpm deploy:smoke -- <API_URL>                   # GET /health
bash scripts/deploy/wire-cors.sh <client> <admin>
bash scripts/deploy/setup-railway.sh staging     # Interactive Railway bootstrap
bash scripts/deploy/setup-vercel.sh staging <API>
pnpm deploy:railway login                        # Railway CLI
pnpm deploy:vercel login                           # Vercel CLI
```

Runbooks: [docs/runbooks/deploy.md](../docs/runbooks/deploy.md), [docs/runbooks/railway.md](../docs/runbooks/railway.md), [docs/runbooks/vercel.md](../docs/runbooks/vercel.md).

**Full CI/CD:** push to `main` / `staging` runs [CI](../.github/workflows/ci.yml), then [Deploy](../.github/workflows/deploy.yml) (migrate, Railway, Vercel, smoke). See deploy.md § GitHub Actions full deploy for secrets.

## Local and CI database naming

| Environment              | Postgres database | Notes                                                    |
| ------------------------ | ----------------- | -------------------------------------------------------- |
| Local dev (Postgres.app) | `kloqra`          | `createdb kloqra`; set `DATABASE_URL` in `apps/api/.env` |
| Docker Compose           | `kloqra`          | See root `docker-compose.yml`                            |
| GitHub Actions CI        | `kloqra_test`     | Ephemeral; migrate + seed before integration/e2e         |

**Seed (staging only, optional):** `DATABASE_URL="<url>" pnpm --filter @kloqra/api exec prisma db seed` — accounts `admin@kloqra.dev` / `member@kloqra.dev`, password `password123`, primary workspace **Acme Corporation**. Do not seed production unless intentional.

## GitHub Actions (migrate on deploy)

Workflow: [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml)

Configure in GitHub → **Settings → Environments**:

| Environment  | Secret / variable        | Value                            |
| ------------ | ------------------------ | -------------------------------- |
| `staging`    | `DATABASE_URL`           | Railway staging Postgres URL     |
| `staging`    | `API_URL` (optional var) | Staging API public URL for smoke |
| `production` | `DATABASE_URL`           | Railway prod Postgres URL        |
| `production` | `API_URL` (optional var) | Prod API public URL for smoke    |

Triggers on push to `staging` / `main` when `apps/api/**` or Prisma changes.
