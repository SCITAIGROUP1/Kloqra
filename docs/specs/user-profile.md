# User profile and preferences spec

## User-visible outcome

- **`/profile`** — profile hero, personal info, and work details (name, contact, job context, activity stats).
- **`/settings`** — sidebar hub for appearance, time, notifications, security, and account preferences.
- Preferences are stored per user and sync across devices.
- Workspace settings remain admin-only org defaults; user preferences override where set.

## Routes (UI)

| App    | Profile    | Settings    |
| ------ | ---------- | ----------- |
| Client | `/profile` | `/settings` |
| Admin  | `/profile` | `/settings` |

Settings deep links: `/settings?section=appearance|time|notifications|security|account`

## API

| Method | Route                    | Contract                                                                    | Roles |
| ------ | ------------------------ | --------------------------------------------------------------------------- | ----- |
| GET    | `/users/me`              | [user-profile.dto.ts](../../packages/contracts/src/dto/user-profile.dto.ts) | Auth  |
| PATCH  | `/users/me`              | `updateUserProfileSchema`                                                   | Auth  |
| PATCH  | `/users/me/preferences`  | `updateUserPreferencesSchema`                                               | Auth  |
| POST   | `/users/me/password`     | `changePasswordSchema`                                                      | Auth  |
| GET    | `/users/me/sessions`     | `userSessionSchema[]`                                                       | Auth  |
| DELETE | `/users/me/sessions/:id` | —                                                                           | Auth  |
| POST   | `/users/me/2fa/enable`   | `twoFactorEnableResponseSchema`                                             | Auth  |
| POST   | `/users/me/2fa/verify`   | `twoFactorVerifySchema`                                                     | Auth  |
| POST   | `/users/me/2fa/disable`  | `twoFactorDisableSchema`                                                    | Auth  |

Login may return `{ requires2fa: true, pendingToken }` when TOTP is enabled; complete with `pendingToken` + `totpCode`.

Controller: `apps/api/src/modules/users/interface/http/users.controller.ts`

## Profile fields

- **Editable:** firstName, lastName, phone, location, avatarUrl, jobTitle, department, workStartDate
- **Read-only:** email, defaultHourlyRate, activityStats (totalHours, projectCount, memberSince)

## Preferences

- theme, timezone, dateFormat, timeFormat, weekStart, dailyTargetHours
- language, defaultWorkspaceId, startupPage
- notifications (master switch + per-type email on/off toggles)

## Security

- Scope by JWT `userId` only.
- Throttle password endpoint (5/min).
- TOTP optional per user; refresh tokens track session metadata.
- Impersonation: PATCH/POST on `/users/me*` forbidden while impersonating.

## Shared UI

- `@kloqra/web-shared`: `ProfilePage`, `AccountSettingsPage`, `useUserProfile`
