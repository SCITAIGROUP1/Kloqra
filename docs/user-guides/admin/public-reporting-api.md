# Admin: Public reporting API (third-party access)

Give an external client or integration read-only access to workspace reporting data using an **API key** and **secret**. Clients call the API from Postman, scripts, or their own systems — they do not need a Kloqra login.

## What the client can access

Each API key is scoped to one or more **projects** you choose. The client can call these read-only endpoints:

| Endpoint                                    | Purpose                                                              |
| ------------------------------------------- | -------------------------------------------------------------------- |
| `GET /public/reporting/dashboard`           | Workspace-style totals, hours by project/user/category, trends       |
| `GET /public/reporting/utilization`         | Member utilization for the date range                                |
| `GET /public/reporting/heatmap`             | Hours by day-of-week and hour                                        |
| `GET /public/reporting/categories-heatmap`  | Category × project heatmap                                           |
| `GET /public/reporting/tasks`               | Top tasks by hours                                                   |
| `GET /public/reporting/projects/:id/budget` | Budget burn-down for one project (must be in the key’s project list) |

Data is limited to time logged on the projects assigned to that key.

## Before you create a key

1. **Projects exist** — create or confirm projects in **Projects** (`/projects`).
2. **Time is logged** — members have logged time on those projects (otherwise reports return zeros).
3. **You know the API base URL** to share with the client:
   - Local development: `http://localhost:3001`
   - Production: your deployed API URL (see [deploy runbook](../../runbooks/deploy.md))

There is no admin UI for API keys yet — use the API (Postman or curl) as an **Admin** user.

**Organization limits:** Each plan caps the total number of active reporting API keys across all workspaces in your organization (`maxReportingApiKeys`). See **Account → Billing** for your plan limits.

## Step 1 — Log in as Admin

1. Open the **Admin** app and sign in with a workspace **Admin** account.
2. Note your **workspace ID** (from browser dev tools → `X-Workspace-Id` on API calls, or from `GET /auth/me` after login).

You need a short-lived **access token** for the next steps.

### Get an access token (Postman)

```http
POST {API_BASE_URL}/auth/login
Content-Type: application/json

{
  "email": "admin@yourcompany.com",
  "password": "your-password"
}
```

Copy `accessToken` and `workspaceId` from the response.

## Step 2 — Find project IDs

List projects to get UUIDs for the client’s scope:

```http
GET {API_BASE_URL}/projects
Authorization: Bearer {accessToken}
X-Workspace-Id: {workspaceId}
```

Copy the `id` of each project the client should see.

## Step 3 — Create an API key

```http
POST {API_BASE_URL}/reporting-api-keys
Authorization: Bearer {accessToken}
X-Workspace-Id: {workspaceId}
Content-Type: application/json

{
  "name": "Acme Corp reporting integration",
  "projectIds": [
    "550e8400-e29b-41d4-a716-446655440000"
  ],
  "expiresAt": "2027-12-31T23:59:59.000Z"
}
```

| Field        | Required | Notes                                              |
| ------------ | -------- | -------------------------------------------------- |
| `name`       | Yes      | Label for your records (e.g. client name)          |
| `projectIds` | Yes      | At least one active project UUID in your workspace |
| `expiresAt`  | No       | ISO datetime with timezone; omit for no expiry     |

### Response — save the secret immediately

```json
{
  "id": "...",
  "name": "Acme Corp reporting integration",
  "apiKey": "klr_a1b2c3...",
  "secret": "sk_x9y8z7...",
  "projectIds": ["..."],
  "isActive": true,
  "lastUsedAt": null,
  "expiresAt": "2027-12-31T23:59:59.000Z",
  "createdAt": "2026-06-18T10:00:00.000Z"
}
```

**Important:** `secret` is shown **only once**. Store it in your password manager and send it to the client through a secure channel (encrypted email, secrets vault, etc.). You cannot retrieve it later.

Share with the client:

- API base URL
- `apiKey` (e.g. `klr_...`)
- `secret` (e.g. `sk_...`)
- Which projects are included (names are enough; IDs are optional)

Point them to: [Public reporting API — client guide](../../api/public-reporting-client-guide.md)

## Step 4 — Verify the key works

```http
GET {API_BASE_URL}/public/reporting/dashboard?from=2026-01-01T00:00:00.000Z&to=2026-01-31T23:59:59.999Z
x-api-key: klr_...
x-api-secret: sk_...
```

A `200` response with `workspace`, `timeByProject`, etc. means the key is working.

## Manage existing keys

### List keys

```http
GET {API_BASE_URL}/reporting-api-keys
Authorization: Bearer {accessToken}
X-Workspace-Id: {workspaceId}
```

Secrets are never returned on list.

### Update a key

```http
PATCH {API_BASE_URL}/reporting-api-keys/{id}
Authorization: Bearer {accessToken}
X-Workspace-Id: {workspaceId}
Content-Type: application/json

{
  "name": "Acme Corp (updated)",
  "projectIds": ["...", "..."],
  "isActive": true,
  "expiresAt": null
}
```

You cannot rotate the secret via PATCH — revoke the key and create a new one.

### Revoke a key

```http
DELETE {API_BASE_URL}/reporting-api-keys/{id}
Authorization: Bearer {accessToken}
X-Workspace-Id: {workspaceId}
```

Revoked keys stop working immediately.

## Security checklist

- Issue **one key per client** (or per integration), not one shared key for everyone.
- Scope `projectIds` to the minimum projects the client needs.
- Set `expiresAt` for time-limited engagements.
- Revoke keys when a contract ends or credentials may be compromised.
- Never commit keys or secrets to git, chat, or tickets in plain text.
- `lastUsedAt` on list responses helps you spot unused or active keys.

## Troubleshooting

| Problem                                | What to check                                                                                          |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `401 Invalid API credentials`          | Wrong key/secret, revoked key, or expired `expiresAt`                                                  |
| `403` organization suspended           | Organization account suspended — keys are revoked; contact your Kloqra admin                           |
| `402 PLAN_LIMIT_EXCEEDED` on create    | Organization reached `maxReportingApiKeys` — revoke unused keys or upgrade plan                        |
| `403 Project not accessible`           | Budget endpoint project not in key’s `projectIds`                                                      |
| `400 One or more projects are invalid` | Project deleted, wrong UUID, or inactive                                                               |
| Empty dashboard                        | No time logs on scoped projects in the date range                                                      |
| Client gets `401` with JWT             | They must use `/public/reporting/*` with `x-api-key` / `x-api-secret`, not admin JWT on `/reporting/*` |

## Related

- [Client connection guide](../../api/public-reporting-client-guide.md) — give this to your client
- [API routes reference](../../api/ROUTES.md)
- [Reporting spec](../../specs/reporting.md) — internal admin reporting behavior
