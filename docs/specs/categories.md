# Categories spec

## User-visible outcome

- **Admins** create, edit, and delete task categories; bulk-import from Excel or JSON.
- **Members** see categories when picking tasks; categories scope task organization per workspace.

## API

| Method | Route                       | Roles | Contract                                                            |
| ------ | --------------------------- | ----- | ------------------------------------------------------------------- |
| GET    | `/categories`               | Auth  | [category.dto.ts](../../packages/contracts/src/dto/category.dto.ts) |
| POST   | `/categories`               | ADMIN | category.dto                                                        |
| PATCH  | `/categories/:id`           | ADMIN | category.dto                                                        |
| DELETE | `/categories/:id`           | ADMIN | —                                                                   |
| POST   | `/categories/bulk`          | ADMIN | `bulkCategoryImportSchema` (up to 500 rows)                         |
| GET    | `/categories/bulk/template` | ADMIN | Excel template download                                             |
| POST   | `/categories/bulk/upload`   | ADMIN | Multipart Excel upload (max 2 MB) → same as bulk JSON               |

Controller: [categories.controller.ts](../../apps/api/src/modules/categories/interface/http/categories.controller.ts)

List responses are paginated (`page`, `limit`, `search`).

## Domain rules

1. Category names are unique per workspace.
2. **Bulk import** enqueues a BullMQ job (`QUEUES.BULK_CATEGORY`); the API returns `{ jobId, status }` immediately. Poll job status via the queues module or wait for UI refresh.
3. **Delete with logged time:** when a category has tasks with time logs, logs are re-associated to an **Uncategorized** fallback category/task (same pattern as project/task deletion) so historical hours are preserved.

## Given / When / Then

**When** ADMIN POSTs `/categories/bulk` with a valid `categories[]` array  
**Then** a background job creates or updates rows; duplicates by name are skipped or merged per service rules.

**When** ADMIN DELETEs a category that has logged hours  
**Then** time logs remain in the workspace under the uncategorized fallback; the category row is removed.

## UI

- Admin categories: [apps/admin/src/features/categories/](../../apps/admin/src/features/categories/)

## Edge cases

- Bulk upload rejects files over 2 MB or with invalid column layout.
- Empty `categories: []` fails Zod validation (min 1 item).
