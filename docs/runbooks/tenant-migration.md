# Tenant migration runbook (SaaS-F21)

Backfill `workspaces.tenant_id` for databases that existed before SaaS-F02, then enforce NOT NULL.

## Local development (recommended)

If you only have **seed/demo data**, skip backfill and reset:

```bash
cd apps/api
npx prisma migrate reset --force
```

This applies all migrations and runs seed with the correct **1 tenant + 3 workspaces** layout.

## When to run backfill

- Production or pilot DB after deploying migration `20260623120000_add_tenants`
- Before deploying migration `20260623120100_workspaces_tenant_id_not_null`

Fresh dev/CI (`migrate deploy` + `prisma db seed`) does not need this script — seed sets `tenant_id` directly.

## Preconditions

1. Backup database.
2. Confirm [D09](../architecture/SAAS_PLATFORM_PLAN.md): one tenant per customer org; multiple workspaces per tenant allowed.
3. Prepare a mapping file if multiple workspaces belong to one organization (see below).

## Steps

### 1. Dry-run audit

From `apps/api`:

```bash
npx tsx --tsconfig tsconfig.seed.json scripts/migrate-pilots-to-tenants.ts --dry-run
```

Optional explicit grouping:

```bash
npx tsx --tsconfig tsconfig.seed.json scripts/migrate-pilots-to-tenants.ts --dry-run --mapping pilot-tenant-map.json
```

Example `pilot-tenant-map.json`:

```json
{
  "tenants": [
    {
      "slug": "acme-corp",
      "name": "Acme Corporation",
      "workspaceSlugs": ["acme", "meridian", "apex"]
    }
  ]
}
```

Without `--mapping`, each workspace with null `tenant_id` becomes its own tenant (safe for single-workspace pilots).

### 2. Resolve conflicts

If the script exits with **cross-tenant user conflicts** (D08):

- Confirm workspaces truly belong to one org → use a single tenant in the mapping file, or
- Remove cross-org `workspace_members` rows, or
- Split users into separate accounts per organization.

Re-run dry-run until clean.

### 3. Apply backfill

```bash
npx tsx --tsconfig tsconfig.seed.json scripts/migrate-pilots-to-tenants.ts --apply --mapping pilot-tenant-map.json
```

Creates `tenants`, assigns `workspaces.tenant_id`, and adds `tenant_members` (`OWNER`) for the earliest workspace ADMIN per tenant when the user has no `tenant_members` row.

### 4. Verify

```sql
SELECT COUNT(*) FROM workspaces WHERE tenant_id IS NULL;
-- must be 0 before NOT NULL migration

-- Every tenant should have an OWNER (when workspace admins existed pre-migration)
SELECT t.slug, tm.role
FROM tenants t
LEFT JOIN tenant_members tm ON tm.tenant_id = t.id AND tm.role = 'OWNER'
WHERE tm.id IS NULL;

-- After F09 migration deploy: every tenant needs a subscription row
SELECT t.slug
FROM tenants t
LEFT JOIN tenant_subscriptions ts ON ts.tenant_id = t.id
WHERE ts.id IS NULL;
```

Migration `20260623130000_add_plans_and_subscriptions` backfills `tenant_subscriptions` with the **pilot** plan for any tenant missing a row. Deploy plan migrations **before** smoke-testing billing or plan limits.

### 5. Deploy NOT NULL migration

```bash
npx prisma migrate deploy
```

Applies `20260623120100_workspaces_tenant_id_not_null`.

### 6. Staging dry-run (required once per environment)

- [ ] Run steps 1–5 on a staging DB clone with production-like workspace layout
- [ ] Record dry-run output and conflict resolution in ops log
- [ ] Run `pnpm --filter @kloqra/api test tenant-isolation` (or full API e2e) against staging
- [ ] Owner login → Account → Organization shows **active** (or **Finish setup** if `pending_setup`)
- [ ] Send pilot communication from [pilot-migration-comms.md](./pilot-migration-comms.md) or document waiver

## Rollback

1. Do not deploy NOT NULL migration if backfill must be reversed.
2. To undo backfill only:
   - `UPDATE workspaces SET tenant_id = NULL WHERE ...` (scoped)
   - Delete created `tenant_members` / `tenants` rows from the migration window
3. Restore from backup if data was corrupted.

## Tenant delete behavior

`tenants` use `ON DELETE CASCADE` to workspaces (F02). Prefer `status = churned` over hard delete in product flows.
