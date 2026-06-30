# Billing spec

## User-visible outcome

- **Admins** configure hourly rates at workspace, user, or project level and view a billable summary for a date range.

## API

| Method | Route              | Roles | Contract                                                                                                      |
| ------ | ------------------ | ----- | ------------------------------------------------------------------------------------------------------------- |
| GET    | `/billing/rates`   | ADMIN | [billing.dto.ts](../../packages/contracts/src/dto/billing.dto.ts)                                             |
| POST   | `/billing/rates`   | ADMIN | billing.dto                                                                                                   |
| GET    | `/billing/summary` | ADMIN | [reporting.dto.ts](../../packages/contracts/src/dto/reporting.dto.ts) (query: `from`, `to`, optional filters) |

Controller: [billing.controller.ts](../../apps/api/src/modules/billing/interface/http/billing.controller.ts)

## Rate resolution

For each billable time log, amount uses the first available rate:

1. **Project rate** — `HourlyRate` with matching `projectId`, latest `effectiveFrom`
2. **User rate** — `HourlyRate` with matching `userId`
3. **User default** — `User.defaultHourlyRate`

Same resolution is used in reporting and export aggregation.

## Summary response

Returns `totalHours`, `billableHours`, `totalAmount`, `currency: "USD"` for the filtered period.

## UI

- [apps/admin/src/app/(admin)/billing/page.tsx](<../../apps/admin/src/app/(admin)/billing/page.tsx>)

## Edge cases

- Non-billable logs contribute to total hours but not billable hours or amount.
- Missing rate → amount uses `0` for that entry’s billable portion.
