---
name: Inactive row styling
overview: Add a shared muted-row style for inactive projects, categories, and tasks, then apply it on the client and admin list UIs shown in your screenshots so inactive rows are visually distinct at a glance.
todos:
  - id: shared-helper
    content: Add entityRowClassName helper + unit spec in packages/ui and export it
    status: completed
  - id: client-lists
    content: Apply inactive row classes on client My projects and project tasks tables
    status: completed
  - id: admin-lists
    content: Apply inactive row classes on admin projects, categories, and project task cards
    status: completed
  - id: gate-tests
    content: Add lightweight admin/client unit specs for the shared class helper contract
    status: completed
isProject: false
---

# Inactive entity row styling

## Goal

When `isActive` is false, list rows should read as inactive via a muted background (and muted text), not only via Yes/No or a badge. Scope matches your screenshots: **projects, categories, and tasks** in client + admin. Team/member tables are out of scope unless you ask later.

## Visual convention

Reuse design tokens already used for muted UI (aligned with timesheet `inactiveEntryColors` using `--muted` / `--muted-foreground`):

- Inactive: `bg-muted/40 text-muted-foreground`
- Hover (tables): `hover:bg-muted/55` so clickable rows stay interactive
- Active rows: unchanged

Badges and Lock/Unlock actions stay as they are; the row chrome carries the inactive signal.

## Shared helper

Add a small util in `@kloqra/ui` (same pattern as [`packages/ui/src/lib/filter-options.ts`](packages/ui/src/lib/filter-options.ts)):

- New file: [`packages/ui/src/lib/inactive-entity-row.ts`](packages/ui/src/lib/inactive-entity-row.ts)
- Export `inactiveEntityRowClassName` and `entityRowClassName(isActive, className?)` via `cn(...)`
- Unit test: [`packages/ui/src/lib/inactive-entity-row.spec.ts`](packages/ui/src/lib/inactive-entity-row.spec.ts)
- Re-export from [`packages/ui/src/index.ts`](packages/ui/src/index.ts)

```ts
entityRowClassName(false) // => muted row classes
entityRowClassName(true, "cursor-pointer") // => only the extra classes
```

## Apply on screenshot surfaces

| Surface | File | Change |
|---------|------|--------|
| Client My projects | [`apps/client/src/features/projects/projects-page.tsx`](apps/client/src/features/projects/projects-page.tsx) | `TableRow` → `className={entityRowClassName(p.isActive)}` |
| Client project tasks | [`apps/client/src/features/projects/member-project-tasks-tab.tsx`](apps/client/src/features/projects/member-project-tasks-tab.tsx) | Same using `t.isActive` (field exists on `TaskDto`, unused in UI today) |
| Admin Projects | [`apps/admin/src/features/projects/projects-list-page.tsx`](apps/admin/src/features/projects/projects-list-page.tsx) | Merge with existing `group cursor-pointer hover:...` via `entityRowClassName(p.isActive, "...")` |
| Admin Categories | [`apps/admin/src/features/categories/categories-page.tsx`](apps/admin/src/features/categories/categories-page.tsx) | `TableRow` using `category.isActive` |
| Admin project Tasks | [`apps/admin/src/features/projects/project-tasks-panel.tsx`](apps/admin/src/features/projects/project-tasks-panel.tsx) | Card `<li>`: when `!task.isActive`, apply the same muted classes alongside existing border/padding (override `bg-muted/10`) |

No API/contracts changes — `isActive` is already on the DTOs.

## Tests (pre-commit gate)

- `packages/ui` helper unit spec (required for the new util)
- One small unit spec under admin and client that imports `entityRowClassName` and asserts inactive vs active class output (satisfies feature-file gate when those `.tsx` files change)

## Out of scope

- Team management / org members / project team tabs
- Changing badge copy or status filters
- Detail-page header badges (already show Active/Inactive)
