# Public reporting API — client connection guide

This guide is for **third-party clients** (your organization’s developers or analysts) who need read-only access to Kloqra reporting data via HTTP — for example Postman, Excel Power Query, Python, or a custom dashboard.

You do **not** need a Kloqra user account. Your workspace admin provides an **API key**, **secret**, and **API base URL**.

## What you receive from the admin

| Item          | Example                            | Notes                                             |
| ------------- | ---------------------------------- | ------------------------------------------------- |
| API base URL  | `https://api.your-kloqra-host.com` | No trailing slash                                 |
| API key       | `klr_a1b2c3d4e5f6...`              | Public identifier; safe to label in config        |
| API secret    | `sk_x9y8z7w6v5u4...`               | **Confidential** — treat like a password          |
| Project scope | Names or IDs                       | You only see data for projects the admin assigned |

Store the secret in a secrets manager or environment variable. Do not embed it in source code committed to git.

## Authentication

Every request to `/public/reporting/*` must include these headers:

| Header         | Value                      |
| -------------- | -------------------------- |
| `x-api-key`    | Your API key (`klr_...`)   |
| `x-api-secret` | Your API secret (`sk_...`) |

No `Authorization: Bearer` token and no `X-Workspace-Id` header are required — your workspace and project scope are resolved from the key.

### Example (curl)

```bash
curl -s \
  -H "x-api-key: klr_YOUR_KEY" \
  -H "x-api-secret: sk_YOUR_SECRET" \
  "https://api.example.com/public/reporting/dashboard?from=2026-01-01T00:00:00.000Z&to=2026-01-31T23:59:59.999Z"
```

### Example (Postman)

1. Create a new **GET** request.
2. URL: `{API_BASE_URL}/public/reporting/dashboard`
3. **Params** tab: add `from` and `to` (ISO 8601 datetimes with offset, e.g. `2026-01-01T00:00:00.000Z`).
4. **Headers** tab:
   - `x-api-key` → your key
   - `x-api-secret` → your secret
5. Send — expect `200` and JSON.

## Available endpoints

All paths are relative to your API base URL. All are **GET**, read-only.

### Dashboard

```http
GET /public/reporting/dashboard?from={iso}&to={iso}
```

Optional query filters (must stay within your project scope):

| Param        | Type         | Description                                   |
| ------------ | ------------ | --------------------------------------------- |
| `from`       | ISO datetime | Range start (required)                        |
| `to`         | ISO datetime | Range end (required)                          |
| `projectId`  | UUID         | Narrow to one project (must be in your scope) |
| `userId`     | UUID         | Filter by member                              |
| `categoryId` | UUID         | Filter by category                            |
| `taskId`     | UUID         | Filter by task                                |

**Response highlights:** `workspace` totals, `timeByProject`, `timeByUser`, `timeByCategory`, `weeklyHours`, `dailyHours`, `currency`.

Maximum date range: **366 days**.

### Utilization

```http
GET /public/reporting/utilization?from={iso}&to={iso}&page=1&limit=20
```

| Param    | Default | Description           |
| -------- | ------- | --------------------- |
| `page`   | `1`     | Page number           |
| `limit`  | `20`    | Page size (max 1000)  |
| `search` | —       | Filter by member name |
| `userId` | —       | Filter to one user    |

Returns paginated `members` with logged vs target hours.

### Heatmap

```http
GET /public/reporting/heatmap?from={iso}&to={iso}
```

Returns `slots` with `dayOfWeek` (0–6), `hour` (0–23), and `hours`.

### Categories heatmap

```http
GET /public/reporting/categories-heatmap?from={iso}&to={iso}
```

Returns category × project hour grid for charts.

### Tasks

```http
GET /public/reporting/tasks?from={iso}&to={iso}
```

Returns top tasks by hours (plus an “Other Tasks” rollup when needed).

### Project budget burn-down

```http
GET /public/reporting/projects/{projectId}/budget
```

No date query — cumulative burn-down for the project. The `projectId` must be one your key is allowed to access.

## Date and time format

Use **ISO 8601** datetimes with a timezone offset or `Z`:

- Good: `2026-01-01T00:00:00.000Z`
- Good: `2026-01-01T00:00:00+00:00`
- Avoid: `2026-01-01` alone (may fail validation)

`from` must be before or equal to `to`. The span cannot exceed 366 days.

## Response format

- **Content-Type:** `application/json`
- **Success:** HTTP `200` with a JSON body
- **Errors:** JSON with `code` and `message`, for example:

```json
{
  "code": "UNAUTHORIZED",
  "message": "Invalid API credentials"
}
```

| HTTP status | Typical cause                                       |
| ----------- | --------------------------------------------------- |
| `400`       | Invalid query params or date range                  |
| `401`       | Missing/wrong key or secret, expired or revoked key |
| `403`       | Project not in your key’s scope                     |
| `404`       | Budget endpoint — project not found                 |

## Postman collection tips

1. Create an **environment** with variables:
   - `api_base` — base URL
   - `api_key` — `klr_...`
   - `api_secret` — `sk_...` (mark as secret type)
2. Set collection-level headers:
   - `x-api-key`: `{{api_key}}`
   - `x-api-secret`: `{{api_secret}}`
3. Duplicate requests per endpoint; only change path and query params.

## Code examples

### JavaScript (fetch)

```javascript
const base = process.env.KLOQRA_API_BASE;
const from = "2026-01-01T00:00:00.000Z";
const to = "2026-01-31T23:59:59.999Z";

const res = await fetch(
  `${base}/public/reporting/dashboard?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
  {
    headers: {
      "x-api-key": process.env.KLOQRA_API_KEY,
      "x-api-secret": process.env.KLOQRA_API_SECRET
    }
  }
);

if (!res.ok) {
  const err = await res.json();
  throw new Error(`${err.code}: ${err.message}`);
}

const data = await res.json();
console.log(data.timeByProject);
```

### Python (requests)

```python
import os
import requests

base = os.environ["KLOQRA_API_BASE"]
params = {
    "from": "2026-01-01T00:00:00.000Z",
    "to": "2026-01-31T23:59:59.999Z",
}
headers = {
    "x-api-key": os.environ["KLOQRA_API_KEY"],
    "x-api-secret": os.environ["KLOQRA_API_SECRET"],
}

r = requests.get(f"{base}/public/reporting/dashboard", params=params, headers=headers, timeout=30)
r.raise_for_status()
print(r.json()["timeByProject"])
```

## What you cannot do

- Write or change time logs, projects, or billing
- Access projects not assigned to your key
- Use these credentials on internal routes (`/reporting/dashboard`, `/export`, etc.) — those require a Kloqra user login
- Retrieve the secret again if lost — ask the admin to revoke and issue a new key

**Organization suspension:** If the workspace’s organization account is suspended, API keys stop working immediately (requests return `403`). Keys may be deleted on suspend — the admin must issue new keys after the account is restored.

## Health check (optional)

To confirm the API host is reachable (no auth):

```http
GET {API_BASE_URL}/health
```

## Support

If credentials fail or data looks wrong:

1. Confirm the API base URL (including `https://`).
2. Re-check key and secret (no extra spaces).
3. Ask the admin to verify the key is **active**, not **expired**, and includes the right **projects**.
4. Confirm time was logged on those projects in your requested date range.

Admin setup guide: [public-reporting-api.md](../user-guides/admin/public-reporting-api.md)

Technical route catalog: [ROUTES.md](./ROUTES.md)
