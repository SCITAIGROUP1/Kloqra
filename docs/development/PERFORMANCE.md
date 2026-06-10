# Performance

## Bundle analysis

After `pnpm install`, analyze production chunks:

```bash
pnpm --filter @kloqra/admin analyze
pnpm --filter @kloqra/client analyze
```

Open the generated report in the browser. Re-run after changing heavy dependencies (e.g. `recharts`) or route-level `next/dynamic` splits.

## API guardrails

- Report, export, and billing date ranges are capped at **366 days** (contracts validation).
- `GET /timelogs` returns `{ items, nextCursor? }` with default `limit` 500 and a 90-day lookback when `from`/`to` are omitted.
- Admin dashboard responses may be cached in Redis for 120s; cache is invalidated on time log and hourly rate writes.

## Frontend patterns

- Admin dashboard and exports use `next/dynamic` for large client features and chart chunks.
- `experimental.optimizePackageImports` is enabled in both Next apps for `@kloqra/ui`, `lucide-react`, and (admin) `recharts`.
