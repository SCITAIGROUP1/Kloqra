# Member: Profile and settings

Available at **Profile** (`/profile`) and **Settings** (`/settings`) in the client app (same pages in the admin app for your personal account).

## Profile

- Update **name**, phone, location, job title, and work details
- View read-only **email**, activity stats, and member-since date
- Upload or set **avatar URL**

Changes save per section with success/error feedback.

## Settings sections

| Section           | What you can change                                                |
| ----------------- | ------------------------------------------------------------------ |
| **Appearance**    | Light / dark / system theme                                        |
| **Time**          | Timezone, date/time format, week start, daily target hours         |
| **Notifications** | Email notification toggles                                         |
| **Security**      | Change password, enable/disable 2FA, view and revoke sessions      |
| **Account**       | Language, default workspace, startup page (timer, dashboard, etc.) |

Deep links: `/settings?section=appearance|time|notifications|security|account`

## Two-factor authentication

1. **Settings → Security → Enable 2FA**
2. Add the secret to an authenticator app
3. Enter the 6-digit code to verify
4. To disable: confirm password + current TOTP code

## Active sessions

**Settings → Security → View Sessions** lists devices where you are signed in. Revoke any session except the current one.

## Related

- Spec: [user-profile.md](../../specs/user-profile.md)
