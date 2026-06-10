# Frontend UI patterns

Shared UI lives in `@kloqra/ui`. Cross-app features (profile, settings, API helpers) live in `@kloqra/web-shared`. Both client and admin apps import these packages — do not duplicate primitives in app folders.

## Package roles

| Package              | Purpose                                                     |
| -------------------- | ----------------------------------------------------------- |
| `@kloqra/ui`         | Design system: buttons, tables, modals, loaders, charts     |
| `@kloqra/web-shared` | `api()`, session stores, profile/settings pages, list hooks |
| `@kloqra/contracts`  | DTO types and `ROUTES` constants                            |

See also: [packages/ui/README.md](../../packages/ui/README.md), [packages/web-shared/README.md](../../packages/web-shared/README.md).

## Data tables

List pages use a consistent table shell:

```tsx
import {
  DataTableCard,
  DataTableCell,
  DataTableHead,
  DataTableHeaderRow,
  Table,
  TableBody,
  TableHeader,
  TablePagination,
  TableToolbar,
  TableLoadingState
} from "@kloqra/ui";
import { usePaginatedList } from "@kloqra/web-shared";
```

**Server-driven lists** — `usePaginatedList` calls paginated API endpoints and exposes `items`, `page`, `setPage`, `search`, `loading`, `error`, `reload`.

**Client-side pagination** — `useClientTablePagination` slices in-memory arrays (dashboard widgets, report breakdowns).

**Loading** — show `TableLoadingState` inside `DataTableCard` while `loading` is true (skeleton rows; toolbar stays visible).

**Empty** — use `EmptyState` from `@kloqra/ui` or a muted paragraph.

Paginated API response shape (from `@kloqra/contracts`):

```json
{ "items": [], "page": 1, "limit": 20, "total": 0, "totalPages": 0 }
```

Query params: `page`, `limit` (default 20 for tables), optional `search`, plus filter keys (e.g. `projectId`).

Dropdowns that need the full list (filters, selects) use `fetchListItems()` with a high `limit` instead of paginating in the UI.

## Modals

| Component                  | Use when                                                                       |
| -------------------------- | ------------------------------------------------------------------------------ |
| `AppModal`                 | Forms and detail views (dismissible, close button, icon + footer)              |
| `ConfirmDialog`            | Destructive or irreversible confirmations (AlertDialog; no accidental dismiss) |
| `Dialog` + `DialogContent` | Custom layouts (e.g. onboarding wizard)                                        |

Shared styling: accent bar, blurred overlay, header/body/footer regions (`modal-styles.ts`).

```tsx
import { AppModal, Button } from "@kloqra/ui";

<AppModal
  open={open}
  onOpenChange={setOpen}
  title="New project"
  description="Add a project to organize work."
  icon={<FolderPlus className="size-5" />}
  size="lg"
  footer={
    <>
      <Button variant="outline" onClick={() => setOpen(false)}>
        Cancel
      </Button>
      <Button type="submit" form="my-form">
        Save
      </Button>
    </>
  }
>
  <form id="my-form" onSubmit={handleSubmit}>
    …
  </form>
</AppModal>;
```

Sizes: `sm` | `md` | `lg` | `xl`. Icon tones: `default` | `warning` | `destructive`.

## Loaders

| Component           | Use when                                 |
| ------------------- | ---------------------------------------- |
| `Spinner`           | Inline (buttons, compact areas)          |
| `CenteredLoader`    | Full card or page section while fetching |
| `TableLoadingState` | Paginated table initial load             |
| `DashboardSkeleton` | Dashboard widget grid placeholder        |

Avoid plain `"Loading…"` text for primary content areas.

## Toasts

Both apps mount Sonner in `app/layout.tsx`:

```tsx
import { Toaster } from "sonner";
<Toaster richColors closeButton position="top-right" />;
```

Use `toast.success()` / `toast.error()` for mutations (create, save, delete, export, submit). Keep inline error text for form validation; toast for async outcomes.

## Dashboard widgets

- Widget registry and layout persistence: `features/dashboard/widget-registry.ts`, `use-widget-layout.ts`
- Arrange mode: `DashboardArrangeBanner` from `@kloqra/web-shared`
- **Done** — persist layout for session only
- **Done & save as default** — persist + save as reset target

## Account pages

Profile and settings are shared:

```tsx
import { ProfilePage, AccountSettingsPage } from "@kloqra/web-shared";
```

Wired in both apps at `/profile` and `/settings`. Spec: [user-profile.md](../specs/user-profile.md).

## Feature module layout (apps)

```
apps/{client|admin}/src/
  app/              # Next.js routes (thin wrappers)
  features/<domain>/  # pages, hooks, components
  components/       # app-specific shell pieces
  lib/api.ts        # re-exports web-shared api with app scope
```

New UI features: read `.cursor/skills/kloqra-fe-feature/SKILL.md`.
