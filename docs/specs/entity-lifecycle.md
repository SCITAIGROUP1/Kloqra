# Entity lifecycle (active / inactive)

## User-visible outcome

- **Admins** can activate or deactivate workspace categories, project tasks, and projects.
- **Members and admins** cannot log time or start timers against inactive entities.
- **Existing time entries** remain in the database but become read-only when their project, category, or task is inactive.

## Effective loggability

A task is loggable only when:

`project.isActive && category.isActive && task.isActive`

## API rules

| Action                 | Inactive project       | Inactive category      | Inactive task          |
| ---------------------- | ---------------------- | ---------------------- | ---------------------- |
| `POST /timelogs`       | `ENTITY_INACTIVE`      | `ENTITY_INACTIVE`      | `ENTITY_INACTIVE`      |
| `POST /timer/start`    | `ENTITY_INACTIVE`      | `ENTITY_INACTIVE`      | `ENTITY_INACTIVE`      |
| `PATCH /timelogs/:id`  | `TIMELOG_NOT_EDITABLE` | `TIMELOG_NOT_EDITABLE` | `TIMELOG_NOT_EDITABLE` |
| `DELETE /timelogs/:id` | `TIMELOG_NOT_EDITABLE` | `TIMELOG_NOT_EDITABLE` | `TIMELOG_NOT_EDITABLE` |

### Task activation guards

- `PATCH /tasks/:id` with `{ isActive: true }` is rejected when the task's category or project is inactive.

### List filters

- `GET /tasks?loggableOnly=true` returns tasks where project, category, and task are all active.
- `GET /categories?isActive=true|false` and `GET /projects?isActive=true|false` filter admin lists.
- Members can still list inactive projects they belong to (for read-only time entry display); client logging selectors filter to active entities only.

## Real-time client sync

When an admin toggles `isActive`, the API notifies workspace members via WebSocket. Clients invalidate `projects`, `tasks`, and/or `categories` scopes and refetch catalogs only — timelog lists are not refetched. Frozen entry UI is derived from catalog `isActive` flags in `useMemo`.

## Given / When / Then

### Deactivate category

**When** admin sets `isActive: false` on a category  
**Then** tasks in that category are excluded from `loggableOnly` task lists and existing entries on those tasks cannot be edited or deleted.

### Deactivate task

**When** admin sets `isActive: false` on a task  
**Then** the task is hidden from logging selectors and its existing entries are read-only.

### Deactivate project

**When** admin sets `isActive: false` on a project  
**Then** the project is hidden from logging selectors and **all** entries on that project are read-only.

### Reactivate

**When** an entity is reactivated  
**Then** logging and editing resume unless a higher-level parent remains inactive or the timesheet period is submitted/approved.

## UI

- Admin categories: `apps/admin/src/features/categories/categories-page.tsx`
- Admin project tasks: `apps/admin/src/features/projects/project-tasks-panel.tsx`
- Admin project settings: `apps/admin/src/features/projects/project-settings-tab.tsx`
- Client read-only detection: `apps/client/src/features/time-tracker/entry-approval-status.ts`
