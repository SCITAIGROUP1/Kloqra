---
name: kloqra-feature-delivery
description: >-
  Kloqra feature delivery order, MIP handoff, and pre-PR checks. Use when
  implementing any feature across contracts, API, or frontend apps.
---

# Kloqra feature delivery

## Execution order

1. Read `docs/specs/<feature>.md`
2. Update `packages/contracts` (LSA / contract gate)
3. QA writes failing tests (required — pre-commit blocks code without tests)
4. BE implements `apps/api/src/modules/<feature>/`
5. FE implements `apps/client` or `apps/admin`
6. Verify with `pnpm test:coverage` and `pnpm test:dashboard`
7. Update `docs/agent/ROC.md` and `TASK_BOARD.json`

## MIP handoff template

```markdown
<AGENT_INSTRUCTION role="BE" task_id="P1-07">

- Target: apps/api/src/modules/timer/
- Contracts: packages/contracts/src/dto/timer.dto.ts
- TDD: apps/api/src/modules/timer/\*_/_.spec.ts must fail first
  </AGENT_INSTRUCTION>
```

## Pre-PR checklist

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## References

- [kloqra-test-delivery](../kloqra-test-delivery/SKILL.md)
- [docs/development/TESTING.md](../../../docs/development/TESTING.md)
- [docs/agent/AGENTS.md](../../docs/agent/AGENTS.md)
- [CONTRIBUTING.md](../../CONTRIBUTING.md)
