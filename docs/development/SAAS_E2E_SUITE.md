# SaaS E2E suite (F24)

Minimum regression cases for multi-tenant SaaS, mapped to integration tests in `apps/api/test/`.

| Case                                       | Test file                                                                         |
| ------------------------------------------ | --------------------------------------------------------------------------------- |
| Cross-tenant IDOR denied                   | `tenant-isolation.e2e.ts`                                                         |
| D08 — user cannot join second tenant       | `self-serve-signup.e2e.ts`, `platform-tenants-provision.e2e.ts`, `tenants.e2e.ts` |
| D14 — workspace admin isolation            | `tenant-isolation.e2e.ts`, `workspace-lifecycle.e2e.ts`                           |
| Plan limit blocks workspace create         | `plan-limits.e2e.ts`                                                              |
| D12 — `past_due` blocks timer + timelog    | `subscription-lifecycle.e2e.ts`                                                   |
| Subscription webhook updates status        | `stripe-webhook.e2e.ts`                                                           |
| D16 — owner account + superadmin provision | `platform-tenants-provision.e2e.ts`, `tenants.e2e.ts`, admin `account-*.spec.ts`  |
| D06 — multi-project PROJECT_MANAGER scope  | `project-lead.e2e.ts`, admin `project-lead.spec.ts`                               |
| D13 — no platform impersonation            | `platform-audit.e2e.ts`                                                           |

## Suite entrypoints

- `tenant-isolation.e2e.ts` — isolation gate
- `subscriptions.e2e.ts` — billing lifecycle + webhooks (re-exports lifecycle + webhook suites)

## CI

All `apps/api/test/**/*.e2e.ts` files run in the GitHub Actions `integration` job via `pnpm test:integration`.

Optional local filter:

```bash
pnpm --filter @kloqra/api test:e2e:saas
```

## Playwright

- Admin: `apps/admin/e2e/` (account, billing, compliance footer)
- Platform-admin: `apps/platform-admin/e2e/` (included in CI `e2e` job)
