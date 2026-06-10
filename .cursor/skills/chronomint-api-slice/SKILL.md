---
name: kloqra-api-slice
description: >-
  Add or extend a NestJS vertical slice in apps/api. Use when creating API
  modules, controllers, or services.
---

# Kloqra API slice

## Scaffold

```
apps/api/src/modules/<name>/
  <name>.module.ts
  application/<name>.service.ts
  interface/http/<name>.controller.ts
```

Register in `apps/api/src/app.module.ts`.

## Module template

- `imports`: `[AuthModule]` (+ other feature modules via Nest, not relative paths)
- `controllers`: from `interface/http/`
- `providers`: services from `application/`
- `exports`: only services other modules need

## Shared logic

- Time aggregation, week boundaries, rounding → `apps/api/src/common/time/`
- Prisma, Redis, guards → `apps/api/src/common/`

## Controller checklist

- `@UseGuards(JwtAuthGuard)` (and `RolesGuard` when needed)
- Paths from `ROUTES` in `@kloqra/contracts`
- Inject services only — no `PrismaService` in controllers
