---
name: kloqra-test-delivery
description: >-
  Require tests when adding or changing Kloqra features. Use when implementing
  API modules, contracts, UI components, or admin/client features — or when the
  user asks about test coverage, TDD, or pre-commit test gates.
---

# Kloqra test delivery

## Non-negotiable

Every feature change ships with tests in the same PR:

| Layer                 | Production path                                   | Required test                                    |
| --------------------- | ------------------------------------------------- | ------------------------------------------------ |
| Contracts             | `packages/contracts/src/**`                       | `*.spec.ts` beside or in `src/`                  |
| API service           | `apps/api/src/modules/*/application/*.service.ts` | `*.service.spec.ts` in same module               |
| API HTTP              | `apps/api/src/modules/*/interface/**`             | module `*.spec.ts` or `apps/api/test/*.e2e.ts`   |
| UI components         | `packages/ui/src/**/*.tsx`                        | sibling `*.spec.tsx`                             |
| Admin/client features | `apps/{admin,client}/src/features/**`             | `apps/{admin,client}/e2e/**` or unit `*.spec.ts` |

Pre-commit enforces this via `scripts/check-staged-has-tests.mjs`. Emergency bypass: `SKIP_TEST_CHECK=1 git commit`.

## TDD order

1. Read spec in `docs/specs/<feature>.md`
2. Update `packages/contracts` + failing contract spec
3. Add failing API unit or Supertest e2e
4. Implement service/controller
5. Add Playwright e2e for user-visible admin/client flows
6. Run `pnpm test:coverage` and open `pnpm test:dashboard`

## Interactive / visual test tools

```bash
pnpm test:dashboard          # local hub: coverage HTML, Playwright reports, Swagger link
pnpm test:ui                 # Vitest UI for API unit tests
pnpm --filter @kloqra/admin test:e2e:ui
pnpm --filter @kloqra/client test:e2e:ui
```

Admin Playwright locally: `pnpm prisma:seed`, then API on `:3001` (or let Playwright start it). CI already migrates, seeds, and starts services.

## Pre-PR

```bash
pnpm format:check && pnpm lint && pnpm typecheck && pnpm test:coverage && pnpm build
```

## References

- [docs/development/TESTING.md](../../../docs/development/TESTING.md)
- [.cursor/rules/testing-tdd.mdc](../../rules/testing-tdd.mdc)
