# @kloqra/ui

Shared UI primitives for Kloqra client and admin (Tailwind v4, Radix, shadcn-style components).

## Setup in apps

```tsx
import { Button, Card, AppModal } from "@kloqra/ui";
```

```css
/* app/globals.css */
@import "tailwindcss";
@source "../../../../packages/ui/src/**/*.{ts,tsx}";
@import "tw-animate-css";
@import "@kloqra/ui/globals.css";
```

Theme: `next-themes` in each app's `Providers`.

## Layout & shell

- `AppBar`, `AppBarSecondary`, `PageHeader`, `Section`
- `EmptyState`, `DashboardSkeleton`, `StatCard`
- `ShellToolbarProvider`, `useShellToolbar`

## Forms & inputs

- `Button`, `Input`, `Label`, `Select`, `Badge`, `Card`
- `ProjectColorDot`, `ProjectColorPicker`, `ProjectNameWithColor`

## Data tables

- `DataTableCard`, `TableToolbar`, `TablePagination`
- `DataTableHead`, `DataTableCell`, `DataTableHeaderRow`
- `TableLoadingState`, `TableLoadingRows` — skeleton rows while loading
- `Table`, `TableBody`, `TableHeader`, `TableRow`

See [Frontend UI patterns](../../docs/development/FRONTEND-UI.md).

## Modals & dialogs

- **`AppModal`** — forms and detail panels (title, description, icon, footer, sizes)
- **`ConfirmDialog`** — yes/no confirmations (destructive variant)
- **`Dialog`** primitives — custom multi-step flows
- Shared styles: `modal-styles.ts` (overlay, accent bar, header/body/footer)

## Feedback

- **`Spinner`**, **`CenteredLoader`** — loading states
- **`ConfirmDialog`** — replaces blocking `window.confirm` for deletes

Toasts use **Sonner** in each app layout (not exported from this package).

## Charts

Import chart types from `recharts`; wrap with `ChartContainer`, `ChartTooltip`, etc.

Lazy chart wrappers live in `apps/admin/src/components/charts-lazy.tsx`.

## Timesheet

- `TimeEntryAuditTrail`, `TimesheetApprovalStatusBadge`

## Add components

```bash
cd packages/ui
npx shadcn@latest add <component> -y
```

Export from `src/index.ts`. Add `*.spec.tsx` for non-trivial components (pre-commit gate).

## Tests

```bash
pnpm --filter @kloqra/ui test
```

Coverage includes Button, Input, Select, ConfirmDialog, AppModal, Spinner, DataTable, layout shell.
