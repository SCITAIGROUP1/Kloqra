# QA testing guide (non-technical)

This guide is for **QA engineers and testers** who check Kloqra before releases. You do **not** need to write code. You **do** need the app running on your Mac and a browser.

For developer commands and CI details, see [TESTING.md](../../development/TESTING.md).

---

## What you are checking

Kloqra has two web apps:

| App                     | Who uses it                                 | Local URL             |
| ----------------------- | ------------------------------------------- | --------------------- |
| **Client** (member app) | People who log their own time               | http://localhost:3000 |
| **Admin**               | Managers who run projects, billing, exports | http://localhost:3002 |

Both talk to one **API** (backend) at http://localhost:3001 — you usually do not open this in the browser unless a developer asks you to.

### Three kinds of testing (simple view)

| Kind                           | What it is                                              | Who runs it                 |
| ------------------------------ | ------------------------------------------------------- | --------------------------- |
| **Manual testing**             | You click through the app like a real user              | **You (QA)**                |
| **Automated browser tests**    | A robot opens Chrome and repeats key flows (Playwright) | Developers + CI on every PR |
| **Automated API / unit tests** | Scripts check logic without a browser                   | Developers + CI             |

Your main job: **manual testing** on every release candidate, plus **reading automated results** when a pull request fails.

---

## First-time setup (from scratch)

Do this once on a new Mac.

### 1. Install basics

Ask a developer to confirm you have:

- **Git** (to get the project code)
- **Node.js 20+** (runs the apps)
- **PostgreSQL** — easiest on Mac: [Postgres.app](https://postgresapp.com/) (elephant icon, port 5432)
- **Cursor** or **VS Code** (optional — only to read docs and copy commands)

You do **not** need Docker for the simple local path.

### 2. Get the code

In **Terminal** (Applications → Utilities → Terminal):

```bash
cd ~/Desktop
git clone https://github.com/SCITAIGROUP1/Kloqra.git
cd Kloqra
```

(Your team may use a different folder — that is fine.)

### 3. One-command start

From the project folder:

```bash
corepack pnpm serve
```

If `pnpm` is not found, the script falls back automatically. First run takes several minutes (install + database setup).

When it finishes, you should see:

| Service             | URL                            |
| ------------------- | ------------------------------ |
| Client              | http://localhost:3000          |
| Admin               | http://localhost:3002          |
| API docs (optional) | http://localhost:3001/api/docs |

**Leave this Terminal window open** while you test. Press `Ctrl+C` to stop everything.

### 4. If setup fails

Common fixes (or ask a developer):

| Problem                      | What to try                                                                       |
| ---------------------------- | --------------------------------------------------------------------------------- |
| “PostgreSQL is not running”  | Open Postgres.app and wait until it shows “Running”                               |
| “Cannot login” / empty app   | Run `corepack pnpm prisma:seed` from the project folder, then refresh the browser |
| “Too Many Requests” on login | Wait 60 seconds — the API limits rapid login attempts                             |
| Admin page will not load     | Make sure `pnpm serve` is still running                                           |

More detail: [local-troubleshooting.md](../../runbooks/local-troubleshooting.md)

---

## Every-day start (after first setup)

1. Open **Postgres.app** (if it is not already running).
2. Open **Terminal** → `cd` to the Kloqra folder.
3. Run:

```bash
corepack pnpm serve
```

4. Open http://localhost:3000 and http://localhost:3002 in your browser.

### Demo accounts (after seed)

Password for all demo users: **`password123`**

| Email               | Use for    | Role                      |
| ------------------- | ---------- | ------------------------- |
| `member@kloqra.dev` | Client app | Member (logs time)        |
| `admin@kloqra.dev`  | Admin app  | Admin (manages workspace) |

Demo workspaces include **Acme Corporation**, **Meridian Product Co**, and **Apex Consulting** (names may vary slightly by seed version).

---

## Manual test checklists

Use these before signing off a release or after a big feature merge.

### Client app (member) — smoke checklist

Log in as `member@kloqra.dev`.

| #   | Area           | Steps                                                         | Pass? |
| --- | -------------- | ------------------------------------------------------------- | ----- |
| 1   | Login          | Sign in → lands on Timer or Dashboard                         | ☐     |
| 2   | Timer          | Start timer on a task → stop → entry appears                  | ☐     |
| 3   | Timesheet      | Week view loads; can open a day; timezone badge looks correct | ☐     |
| 4   | Timesheet edit | Add or move a time block (no error toast)                     | ☐     |
| 5   | Projects       | “My projects” lists projects you are on                       | ☐     |
| 6   | Account        | Account / Preferences opens; save daily target or timezone    | ☐     |
| 7   | Logout         | Log out → returned to login                                   | ☐     |

Member how-to docs: [getting-started.md](../member/getting-started.md), [timer-and-timesheet.md](../member/timer-and-timesheet.md)

### Admin app — smoke checklist

Log in as `admin@kloqra.dev`.

| #   | Area       | Steps                                                        | Pass? |
| --- | ---------- | ------------------------------------------------------------ | ----- |
| 1   | Login      | Sign in → Dashboard loads                                    | ☐     |
| 2   | Dashboard  | Charts/widgets load without errors                           | ☐     |
| 3   | Projects   | List loads; open a project                                   | ☐     |
| 4   | Categories | Categories page loads (if your release includes categories)  | ☐     |
| 5   | Workspace  | Members list shows; “View as member” opens client (optional) | ☐     |
| 6   | Billing    | Rates page loads                                             | ☐     |
| 7   | Exports    | Can open export screen / preview                             | ☐     |
| 8   | Logout     | Log out cleanly                                              | ☐     |

Admin how-to docs: [getting-started.md](../admin/getting-started.md)

### Cross-app checks (when relevant)

| Scenario         | How to test                                                               |
| ---------------- | ------------------------------------------------------------------------- |
| Impersonation    | Admin → Workspace → “View as member” → client dashboard opens with banner |
| Workspace switch | Switch workspace in sidebar → data refreshes, no crash                    |
| Two browsers     | Client + admin open together → log out of both if sessions feel “stuck”   |

---

## Automated tests (what they mean for you)

Developers add **automated tests** so robots repeat important flows on every code change. You do not need to run them daily, but you should know where results appear.

### On GitHub (every pull request)

Open the PR → **Checks** tab. Typical jobs:

| Check           | Meaning if red ❌                              |
| --------------- | ---------------------------------------------- |
| **quality**     | Code style or build broken — usually dev fixes |
| **unit**        | Backend logic tests failed                     |
| **integration** | API contract tests failed                      |
| **e2e**         | Browser robot tests failed                     |

If **e2e** fails, ask for the Playwright HTML report artifact (attached to the workflow run, kept ~7 days).

### What the robots currently cover (high level)

**Client browser** (`apps/client/e2e/`):

- Login page loads
- Admin impersonation → client dashboard
- (Optional local-only screenshot test — skipped in CI)

**Admin browser** (`apps/admin/e2e/`):

- Login / smoke
- Categories flow
- Projects flow

**API integration** (`apps/api/test/`):

- Login, users, timelogs, categories, projects, timer, health

When QA finds a bug that **should never happen again**, ask a developer to add an automated test in the matching area above.

---

## Visual feedback (see test results in the browser)

These tools help you **see** coverage and failures without reading raw logs. Ask a developer to start them, or run from Terminal if you are comfortable.

### Test hub (recommended starting point)

```bash
corepack pnpm test:dashboard
```

Opens **http://localhost:9321** — a simple home page linking to:

- Coverage reports (how much code is tested)
- Playwright HTML reports (screenshots and steps when browser tests fail)
- Swagger API docs

**Tip:** Run `corepack pnpm test:coverage` first if coverage cards say “not generated.”

### Interactive test runners (optional)

| Command                                            | Opens                   | Best for                             |
| -------------------------------------------------- | ----------------------- | ------------------------------------ |
| `cd apps/api && corepack pnpm test:ui`             | Vitest UI (~port 51204) | Watching API unit tests              |
| `corepack pnpm --filter @kloqra/admin test:e2e:ui` | Playwright UI           | Stepping through admin browser tests |

---

## How to report a bug

Use your team’s tracker (GitHub Issues, Jira, etc.). Include:

1. **Which app** — Client (3000) or Admin (3002)
2. **Account** — e.g. `member@kloqra.dev`
3. **Workspace** — e.g. Meridian Product Co
4. **Steps** — numbered, exact clicks
5. **Expected** vs **Actual**
6. **Screenshot or screen recording**
7. **Browser** — Safari, Chrome, version
8. **Console errors** (optional): right-click → Inspect → Console, copy red text

Good title example: _“Timesheet: red ‘now’ line shows wrong time when timezone is Browser default”_

---

## When a new feature ships — how QA continues

Use this rhythm each sprint or release.

### 1. Read what changed (15 minutes)

| Source                                | What to look for                                |
| ------------------------------------- | ----------------------------------------------- |
| Pull request description              | Summary + test plan checklist                   |
| `docs/specs/*.md`                     | Official behavior (e.g. timelogs, user-profile) |
| [CHANGELOG.md](../../../CHANGELOG.md) | User-visible changes                            |
| Member/admin user guides              | Updated how-to steps                            |

### 2. Extend your manual checklist

For each new feature, add 3–5 rows to the smoke tables above:

- Happy path (works as spec says)
- Permission (member vs admin)
- Empty state (no data yet)
- Error state (invalid input)
- Regression (old flows still work)

### 3. Run smoke on the release branch

1. `git pull` latest `main` (or the release branch)
2. `corepack pnpm serve`
3. Complete Client + Admin checklists
4. Note any failed GitHub **Checks** on the release PR

### 4. Sign-off template

Copy into your ticket or PR comment:

```text
QA sign-off — [version or PR #]
Environment: local serve / staging URL
Client smoke: PASS / FAIL (notes)
Admin smoke: PASS / FAIL (notes)
New feature [name]: PASS / FAIL (notes)
Blockers: none / list
Tester: [name] — [date]
```

### 5. What to request from developers

| Situation                   | Ask for                              |
| --------------------------- | ------------------------------------ |
| Bug keeps coming back       | Automated Playwright or API test     |
| New screen or major flow    | Spec in `docs/specs/` + PR test plan |
| Data looks wrong            | Reseed: `corepack pnpm prisma:seed`  |
| CI e2e fails only on GitHub | Link to Playwright HTML artifact     |

---

## Quick glossary

| Term           | Plain English                                           |
| -------------- | ------------------------------------------------------- |
| **API**        | Server that stores data and enforces rules              |
| **Seed**       | Reset demo database with sample users and time entries  |
| **PR**         | Pull request — proposed code change on GitHub           |
| **CI**         | Automatic checks that run on every PR                   |
| **Playwright** | Tool that drives Chrome like a user for automated tests |
| **E2E**        | End-to-end — full flow through the real UI              |
| **Coverage**   | Percentage of code exercised by automated tests         |
| **Smoke test** | Short checklist that the app basically works            |

---

## Where to go next

| Topic                              | Document                                                            |
| ---------------------------------- | ------------------------------------------------------------------- |
| Member app usage                   | [member guides](../member/)                                         |
| Admin app usage                    | [admin guides](../admin/)                                           |
| Developer test commands            | [TESTING.md](../../development/TESTING.md)                          |
| Local problems                     | [local-troubleshooting.md](../../runbooks/local-troubleshooting.md) |
| Feature behavior (source of truth) | [specs/](../../specs/)                                              |

If you are stuck, message the dev channel with: what you ran, what you expected, and a screenshot. You do not need to fix Terminal errors yourself.
