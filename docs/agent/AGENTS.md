# Kloqra Agent Playbook

## Execution order per task

1. Read `docs/specs/<feature>.md`
2. Update `packages/contracts` (contract gate — LSA only)
3. QA writes failing tests
4. BE implements `apps/api/src/modules/<feature>/`
5. FE implements `apps/client` or `apps/admin`
6. Update `docs/agent/ROC.md` and `TASK_BOARD.json`

## Role directory bounds

| Role | May edit                                      |
| ---- | --------------------------------------------- |
| BA   | `docs/specs/`, `docs/` markdown               |
| BE   | `apps/api/src/`                               |
| FE   | `apps/client/`, `apps/admin/`, `packages/ui/` |
| QA   | `**/*.spec.ts`, `**/test/**`, `**/e2e/**`     |
| LSA  | `packages/contracts/`, orchestration          |

## MIP handoff block

```markdown
<AGENT_INSTRUCTION role="BE" task_id="P1-07">

- Target: apps/api/src/modules/timer/
- Contracts: packages/contracts/src/dto/timer.dto.ts
- TDD: apps/api/src/modules/timer/\*_/_.spec.ts must fail first
  </AGENT_INSTRUCTION>
```

## Commands

```bash
pnpm dev          # all apps
pnpm test         # unit tests
pnpm test:e2e     # API + client e2e
pnpm lint
pnpm build
```

## Documentation

- Hub: [docs/README.md](../README.md)
- Feature specs: `docs/specs/<feature>.md`
- API routes: [docs/api/ROUTES.md](../api/ROUTES.md)
