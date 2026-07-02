---
name: Platform Admin Login Security
overview: "Elevate platform-admin login to a security-first, owner-grade experience: distinct platform branding, forgot-password self-service, and mandatory TOTP 2FA mirroring the proven tenant admin pattern but scoped to `PlatformUser`."
todos:
  - id: contracts-platform-auth
    content: Add platform brand copy, 2FA routes/DTOs, loginRequires2faSetup response, profile twoFactorEnabled in packages/contracts
    status: completed
  - id: prisma-platform-security
    content: "Migration: totp + password-reset fields on PlatformUser"
    status: completed
  - id: api-platform-2fa-auth
    content: PlatformUsers2faService, loginPlatform 2FA/setup branches, complete-2fa-setup endpoint, scoped forgot/reset password
    status: completed
  - id: fe-platform-login-ux
    content: PlatformAuthHeroPanel, AuthShell variant, login page with 2FA + forgot password, forgot/reset/setup-2fa routes
    status: completed
  - id: fe-platform-settings-2fa
    content: 2FA card in PlatformSecuritySection + usePlatformUserProfile hooks
    status: completed
  - id: tests-platform-auth-security
    content: API unit/e2e + platform-admin Playwright for login, 2FA setup, forgot password
    status: completed
isProject: false
---

# Platform admin login — security and owner identity

## Current gaps

The platform login at [`apps/platform-admin/src/app/login/page.tsx`](apps/platform-admin/src/app/login/page.tsx) is a bare email/password form. Compared to [`apps/admin/src/app/login/page.tsx`](apps/admin/src/app/login/page.tsx), it is missing:

| Capability | Tenant admin | Platform admin today |
|---|---|---|
| Forgot password | `/forgot-password` + API | None (API only queries `User`, not `PlatformUser`) |
| 2FA at login | TOTP step when enabled | None (`PlatformUser` has no TOTP columns) |
| 2FA in settings | Security section | [`platform-security-section.tsx`](packages/web-shared/src/features/platform-account/platform-security-section.tsx) — password + sessions only |
| Hero panel | Generic product mock | Same generic mock — feels like a tenant app, not the platform owner console |

```mermaid
flowchart LR
  subgraph today [Today]
    PL[Platform login] --> API["POST /auth/login scope=platform"]
    API --> Session[Direct session]
  end
  subgraph target [Target]
    PL2[Platform login] --> API2[Scoped auth]
    API2 -->|no 2FA yet| Setup["/setup-2fa mandatory"]
    API2 -->|2FA enabled| TOTP[TOTP step]
    Setup --> Console[/tenants]
    TOTP --> Console
  end
```

**Default policy** (since 2FA was called critical): every platform admin must complete 2FA setup before accessing the console; every subsequent login requires TOTP. This is stricter than tenant admin (optional until enabled) and appropriate for Kloqra owners/staff.

---

## 1. Contracts first

Extend [`packages/contracts`](packages/contracts):

- **Brand copy** in [`brand.ts`](packages/contracts/src/brand.ts): `PLATFORM_PORTAL_LABEL`, `PLATFORM_LOGIN_TITLE`, `PLATFORM_LOGIN_DESCRIPTION`, `PLATFORM_HERO_TAGLINE` / `PLATFORM_HERO_SUBTAGLINE` (ops/security tone, not time-tracking marketing).
- **Platform profile**: add `twoFactorEnabled: boolean` to [`platform-user-profile.dto.ts`](packages/contracts/src/dto/platform-user-profile.dto.ts).
- **Login responses**: add `loginRequiresPlatform2faSetupResponseSchema` (`requires2faSetup`, `pendingToken`) alongside reusing existing `loginRequires2faResponseSchema` for the TOTP step.
- **Routes** in [`routes.ts`](packages/contracts/src/routes.ts):
  - `ROUTES.PLATFORM.ME_2FA_ENABLE` → `POST /platform/me/2fa/enable`
  - `ROUTES.PLATFORM.ME_2FA_VERIFY` → `POST /platform/me/2fa/verify`
  - `ROUTES.PLATFORM.ME_2FA_DISABLE` → `POST /platform/me/2fa/disable`
- Reuse existing `twoFactorEnableResponseSchema`, `twoFactorVerifySchema`, `twoFactorDisableSchema` from [`user-profile.dto.ts`](packages/contracts/src/dto/user-profile.dto.ts).
- Update [`contracts.spec.ts`](packages/contracts/src/contracts.spec.ts).

---

## 2. Database migration

Add to `PlatformUser` in [`schema.prisma`](apps/api/prisma/schema.prisma) (mirror `User` security fields):

```prisma
totpSecret              String?   @map("totp_secret")
totpEnabledAt           DateTime? @map("totp_enabled_at")
passwordResetTokenHash  String?   @map("password_reset_token_hash")
passwordResetExpiresAt  DateTime? @map("password_reset_expires_at")
```

New migration under `apps/api/prisma/migrations/`.

---

## 3. API — auth and platform security

### 3a. Platform 2FA service

Create [`platform-users-2fa.service.ts`](apps/api/src/modules/platform/application/platform-users-2fa.service.ts) by adapting [`users-2fa.service.ts`](apps/api/src/modules/users/application/users-2fa.service.ts) for `platformUser` table. TOTP issuer label: `"Kloqra Platform"`.

Wire endpoints on [`platform-users.controller.ts`](apps/api/src/modules/platform/interface/http/platform-users.controller.ts) behind `PlatformJwtAuthGuard`.

### 3b. Login flow (`loginPlatform`)

Extend [`auth.service.ts`](apps/api/src/modules/auth/application/auth.service.ts) `loginPlatform`:

1. Validate email/password (unchanged).
2. If `totpEnabledAt` set → return `{ requires2fa: true, pendingToken }` (do **not** issue session cookies yet).
3. On 2FA completion (`pendingToken` + `totpCode`) → issue platform session.
4. If `totpEnabledAt` is null → return `{ requires2faSetup: true, pendingToken }` (mandatory setup gate).

Use a **platform-scoped** pending JWT purpose (`platform-2fa-pending`) separate from tenant `2fa-pending` to prevent cross-scope token reuse.

Update [`auth.controller.ts`](apps/api/src/modules/auth/interface/http/auth.controller.ts) platform login branch to handle the new response shapes (no cookies until 2FA complete).

### 3c. Forgot / reset password (platform-scoped)

Branch existing endpoints by `X-Auth-Scope`:

- `forgotPassword` → when `scope === "platform"`, lookup `PlatformUser`, store reset hash, email link.
- `resetPassword` → when platform scope, update `PlatformUser`, revoke all `PlatformRefreshToken` rows.

Add [`platform-origin.util.ts`](apps/api/src/common/mailer/platform-origin.util.ts) (`PUBLIC_PLATFORM_URL` or `localhost:3003` default) and `buildPlatformPasswordResetUrl()` in [`auth.mailer.ts`](apps/api/src/common/mailer/auth.mailer.ts). Platform reset emails use platform-specific copy (“Reset your platform admin password”).

### 3d. Audit and notifications

Record platform audit events on: `platform.2fa.enabled`, `platform.2fa.disabled`, `platform.password.reset`, `platform.login.failed` (optional). Dispatch security alert notification if `securityAlerts` preference is on (existing platform notifications pipeline).

### 3e. Tests

- Unit: `platform-users-2fa.service.spec.ts`, extend `auth.service.spec.ts` for platform 2FA branches.
- E2E: extend [`platform-auth.e2e.ts`](apps/api/test/platform-auth.e2e.ts) — login requires setup, enable 2FA, login with TOTP, forgot/reset password, session revocation on reset.

---

## 4. Frontend — login identity (“owner of Kloqra”)

### 4a. Distinct platform auth shell

Extend [`auth-shell.tsx`](packages/web-shared/src/components/auth-shell.tsx) with optional `hero?: ReactNode` (or `variant: "default" | "platform"`).

Add [`platform-auth-hero-panel.tsx`](packages/web-shared/src/components/platform-auth-hero-panel.tsx):
- Ops-focused copy from contracts (e.g. “Operate Kloqra.” / “Tenant oversight, billing, and platform health — staff access only.”)
- Replace time-tracking product preview with a **platform console preview** (tenant count, ops health, audit activity — static mock, same pattern as [`auth-product-preview.tsx`](packages/web-shared/src/components/auth-product-preview.tsx))
- Subtle security cue (shield / lock icon row)

### 4b. Platform login page

Rewrite [`apps/platform-admin/src/app/login/page.tsx`](apps/platform-admin/src/app/login/page.tsx) to mirror admin login structure:

- Email validation, generic error copy
- **Forgot password** link → `/forgot-password`
- **2FA step** when `requires2fa`
- Redirect to `/setup-2fa` when `requires2faSetup`
- Updated `AuthShell` props: platform hero + new copy constants

### 4c. Auth recovery pages

Add thin route wrappers (same pattern as admin):

- [`apps/platform-admin/src/app/forgot-password/page.tsx`](apps/platform-admin/src/app/forgot-password/page.tsx) — reuse [`ForgotPasswordForm`](packages/web-shared/src/features/auth/forgot-password-form.tsx) with platform copy variant
- [`apps/platform-admin/src/app/reset-password/page.tsx`](apps/platform-admin/src/app/reset-password/page.tsx) — reuse [`ResetPasswordForm`](packages/web-shared/src/features/auth/reset-password-form.tsx)

### 4d. Mandatory 2FA setup page

Add [`apps/platform-admin/src/app/setup-2fa/page.tsx`](apps/platform-admin/src/app/setup-2fa/page.tsx):
- Accepts `pendingToken` from login (query param or sessionStorage)
- Reuses [`TwoFaSetupPanel`](packages/web-shared/src/features/account/settings/sections/two-fa-setup-panel.tsx)
- Calls `POST /platform/me/2fa/enable` + `verify` using pending-token auth path (new short-lived setup endpoint or extend login to accept setup with pending token — prefer dedicated `POST /auth/platform/complete-2fa-setup` to keep `/platform/me/*` behind full session)

**Recommended**: add `POST /auth/platform/complete-2fa-setup` (contracts + controller) that accepts `{ pendingToken, secret confirmation via totpCode }` and returns full platform session — avoids chicken-and-egg of needing JWT before 2FA is enabled.

### 4e. Settings parity

Extend [`platform-security-section.tsx`](packages/web-shared/src/features/platform-account/platform-security-section.tsx) with 2FA card (enable/disable), wired through [`use-platform-user-profile.ts`](packages/web-shared/src/features/platform-account/use-platform-user-profile.ts).

### 4f. Shell gate

Update [`platform-shell.tsx`](apps/platform-admin/src/components/platform-shell.tsx) to redirect authenticated users without 2FA back to `/setup-2fa` if somehow bypassed.

---

## 5. Environment and docs

- Add `PUBLIC_PLATFORM_URL=http://localhost:3003` to [`apps/platform-admin/.env.example`](apps/platform-admin/.env.example) and API env docs in [`docs/development/ENVIRONMENT.md`](docs/development/ENVIRONMENT.md).
- Ensure `FRONTEND_ORIGIN` / CORS allows `:3003` (already planned in platform admin setup).

---

## 6. E2E tests (platform-admin)

Extend [`apps/platform-admin/e2e/platform-login.spec.ts`](apps/platform-admin/e2e/platform-login.spec.ts) and add `platform-auth-security.spec.ts`:

- Login shows forgot-password link and platform hero copy
- Full flow: login → setup 2FA → reach `/tenants`
- Login with 2FA enabled requires TOTP
- Forgot password page submits without error (API mocked or seeded)

---

## Security checklist

- Separate pending-token purposes for tenant vs platform
- No email enumeration on forgot-password (`{ ok: true }` always)
- Revoke all platform refresh tokens on password reset
- Throttle auth endpoints (existing `@Throttle` on login)
- Platform audit trail for security mutations
- TOTP disable requires current password + valid code (same as tenant)
- Dev seed: document that first platform login will force 2FA setup (update seed README / [`ENVIRONMENT.md`](docs/development/ENVIRONMENT.md))

---

## Suggested delivery order

Contract + migration → API (2FA service, login branches, forgot/reset) → platform login UX + setup page → settings 2FA card → tests → env/docs.

This reuses ~80% of the tenant security UX while keeping platform identity isolated (`PlatformUser`, `X-Auth-Scope: platform`, platform JWT).
