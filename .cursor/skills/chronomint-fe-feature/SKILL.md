---
name: kloqra-fe-feature
description: >-
  Add UI features to Kloqra client or admin Next.js apps. Use for new
  pages, features folder structure, and web-shared integration.
---

# Kloqra frontend feature

## Pattern

1. Server `app/.../page.tsx` — default export, imports feature component
2. Client `features/<domain>/<name>-page.tsx` — `"use client"`, data + UI
3. Use `api()` from `@kloqra/web-shared` with `useWorkspacesStore` for workspace id
4. Primitives from `@kloqra/ui`

## Example page wrapper

```tsx
import { TimesheetPage } from "@/features/timesheet/timesheet-page";

export default function Page() {
  return <TimesheetPage />;
}
```

## Public routes (share, invite)

Use `publicFetch(path)` from `@kloqra/web-shared` — no inline `API_BASE`.

## Admin vs client

- Admin: `filterRole: "ADMIN"`, default redirect `/dashboard`
- Client: clear project store on workspace change, redirect `/timer`
