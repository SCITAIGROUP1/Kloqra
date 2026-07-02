# Self-serve signup (SaaS-F20)

Trial-first organization signup on the admin app. Gated by env flags until legal sign-off (F23).

## Flow

1. User opens `/signup?plan=starter` (marketing may deep-link here).
2. `POST /auth/signup` creates tenant (`pending_setup`), owner, trial subscription, and default workspace.
3. Verification email links to admin `/verify-email`.
4. Owner completes organization profile → `active`.
5. Optional upgrade via Account → Billing (F13).

## Environment

| Variable                             | App   | Purpose                         |
| ------------------------------------ | ----- | ------------------------------- |
| `SELF_SERVE_SIGNUP_ENABLED=true`     | API   | Enables `POST /auth/signup`     |
| `NEXT_PUBLIC_SELF_SERVE_SIGNUP=true` | Admin | Shows signup page link on login |

Keep both **false** in production until F23 legal sign-off.

## API

- `GET /plans/public` — unauthenticated public plan list
- `POST /auth/signup` — `{ email, password, name, organizationName, planSlug }` → `{ ok: true }`
- `POST /auth/register` — remains disabled (`SELF_REGISTRATION_DISABLED`)

## Decision

**D03:** Self-serve enabled via env flag; superadmin provisioning (F15) remains for enterprise.

## Tests

- `apps/api/test/self-serve-signup.e2e.ts`
- `apps/admin/e2e/signup.spec.ts`
- `apps/api/scripts/migrate-pilots-to-tenants.spec.ts` (F21)
