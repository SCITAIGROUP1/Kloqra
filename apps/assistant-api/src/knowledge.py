"""Member app help knowledge — keep in sync with docs/user-guides/member/."""

from __future__ import annotations

KNOWLEDGE_VERSION = "2026-06-14-v3"

NAV_CATALOG: list[dict[str, str]] = [
    {"label": "Timer", "href": "/timer", "when": "Start/stop live tracking on a task"},
    {"label": "Time Tracker", "href": "/time-tracker", "when": "Weekly list of time entries"},
    {"label": "Timesheet", "href": "/timesheet", "when": "Calendar views, manual entries, export"},
    {"label": "Dashboard", "href": "/dashboard", "when": "Personal summary widgets and quick timer"},
    {"label": "Submissions", "href": "/submissions", "when": "Submit timesheet for approval"},
    {"label": "My Projects", "href": "/projects", "when": "Projects you are assigned to"},
    {"label": "Tasks", "href": "/tasks", "when": "Browse assigned tasks across projects"},
    {"label": "Notifications", "href": "/notifications", "when": "In-app alerts and reminders"},
    {"label": "Profile", "href": "/profile", "when": "Name, avatar, work details"},
    {"label": "Settings", "href": "/settings", "when": "Password, 2FA, theme, timezone"},
    {"label": "Settings → Security", "href": "/settings?section=security", "when": "Password, 2FA, sessions"},
    {"label": "Settings → Time", "href": "/settings?section=time", "when": "Timezone, week start, daily target"},
    {"label": "Settings → Account", "href": "/settings?section=account", "when": "Startup page, default workspace"},
    {"label": "Forgot password", "href": "/forgot-password", "when": "Reset a forgotten password"},
    {"label": "Login", "href": "/login", "when": "Sign in to the member app"},
]

MEMBER_HELP_DOCUMENT = """
# Kloqra member app help

Kloqra is a time-tracking app. The member (client) app is for logging your own hours on assigned projects and tasks.

## Help assistant
Click the floating chat button (bottom-right) or press Ctrl+/ (Cmd+/ on Mac) to open this help assistant.
It answers how-to questions about the member app. It cannot log time, submit timesheets, or see your personal hours.

## App navigation
Use the sidebar on desktop. On mobile, open the menu (☰) in the header to reach Timer, Time Tracker, and other sections.

## Sign in
Self-registration is disabled. Workspace admins add members from Team Management in the admin app.
1. Check email for a sign-in link and temporary password (new accounts) or a notification that you were added (existing users).
2. Open Login (/login) on the client app.
3. Enter email and temporary password.
4. Set a new password when prompted if required, then land on your startup page (timer, dashboard, or timesheet — configurable in Settings → Account).
If 2FA is enabled on your account, enter the 6-digit authenticator code after your password.

## Forgot password
On the login page, click Forgot password (/forgot-password) and follow the email reset link.

## Workspaces
You may belong to multiple workspaces. Use the workspace switcher in the sidebar to change workspace — projects, tasks, and hours are scoped to the active workspace.
Set a default workspace in Settings → Account so you land in the right place after sign-in.

## Join a project
1. Open the invite link from your admin (e.g. /invite/...).
2. Sign in if prompted. You must already belong to the workspace before accepting a project invite.
3. Accept the invite — you are added to that project's team.
4. Open My Projects (/projects) to see the project, its tasks, and your hours.

## My Projects
Go to My Projects (/projects) to see projects you are assigned to. Open a project for:
- Overview (/projects/{projectId}): your hours and charts for that project; personalize your display color (does not affect others).
- Tasks (/projects/{projectId}/tasks): tasks assigned to you on that project — use these when logging time.

## Dashboard
Go to Dashboard (/dashboard) for a customizable home screen.
- Period filter: Today, This week, or custom date range — stats update for the selected period.
- Customize: open the customize panel to show/hide widgets, drag to reposition, resize edges.
- Available widgets: Total Hours, Billable Hours, Active Projects, Weekly Progress chart, Project Distribution, Category Split, Quick Timer, Daily Progress, Pinned Favorites, Recent Activity, Today's Activity Feed, My Timesheets (submission statuses).
- Reset layout from the customize panel if your layout gets messy.

## Timer
Go to Timer (/timer). Choose a project and task (only assigned projects/tasks appear). Click Start; Pause/Resume or Stop when done. One active timer per user.
Stopping creates a time entry with source "timer" on your timesheet. Timer-created entries are read-only in the UI — adjust time via a manual entry if your process allows.

### Timer keyboard shortcuts (when focus is not in a text field)
- Space or Ctrl+Shift+T — start or stop the timer
- Shift+Space — pause or resume

### Pinned favorites
On Timer, pin up to 3 favorite project/task combos for quick starts. Pinned favorites also appear on the Dashboard widget.

### Timer tips
Pick the correct task before starting to avoid reallocation later. Use billable flags consistently if your workspace tracks billable vs non-billable work.

## Timesheet
Go to Timesheet (/timesheet) for day, week, or month calendar views.
- Drag on the grid to create entries; drag blocks to move; resize edges.
- Toggle occupied slots to see busy time logged in your other workspaces (helps avoid double-booking).
- Add entry: select project, task, start/end date and time, optional description, billable toggle. Manual entries (source "manual") can be edited or deleted.
- Tasks are grouped by category in the entry dialog.
- Week summary widget shows personal reporting totals for the visible week (hours and billable breakdown).
- Entry history tab shows audit trail when editing an existing entry.

## Time Tracker
Go to Time Tracker (/time-tracker) for a weekly list of entries with pagination.
- Period presets: this week, last week, this month, last month, or custom date range.
- Filters: search text, project, category, task, billable / non-billable / all.
- Edit or delete entries inline (respects timesheet lock when submitted or approved).
- Stat cards show total and billable hours for the filtered period.

## Tasks
Go to Tasks (/tasks) to browse tasks across your assigned projects. Tasks are created by admins. Filter by project from the list. You can also open tasks from a project detail page (/projects/{projectId}/tasks).

## Submissions (timesheet approval)
Not all projects require approval — only those with timesheet approval enabled by your admin.

Go to Submissions (/submissions) to submit and track status by project for the selected week. Use Today and week navigation arrows to change period. The sidebar badge shows actionable items.

### Submission statuses
- Draft — not yet submitted; you can still edit entries and submit.
- Pending review (Submitted) — sent to approvers; entries in that period are locked until reviewed.
- Approved — period accepted; entries remain locked.
- Rejected — approver returned it with a reason shown on the card; fix entries and resubmit.

### How to submit
1. Open Submissions (/submissions) or use the My Timesheets widget on Dashboard.
2. Review each project card for the current period.
3. Add an optional submission note for your approver.
4. Click Submit for review (label varies: Submit day/month for review on daily/monthly approval projects).
5. Confirm in the preview dialog — multiple periods may cascade if required.

### After submit or approval
Entries in submitted or approved periods cannot be edited. To change locked time:
- If rejected: fix entries while in Rejected status, then resubmit.
- If submitted or approved: click Request edit, explain why, and wait for admin approval of the edit request (shows as Edit pending).

Approval period is set per project: daily, weekly, or monthly.

## Notifications
Go to Notifications (/notifications) for in-app alerts. Unread count appears in the sidebar badge.
Member-relevant notification types include: project/task assignment, timesheet reminders, timesheet approved/rejected/amendment updates, idle timer alerts, workspace added.
Toggle email notifications in Settings → Notifications.

## Export my data
On Timesheet (/timesheet):
1. Set date range (from / to).
2. Optionally filter by project or billable status.
3. Choose report type(s): Time entries (one row per log), Daily summary (hours by day and project), By project (totals per project).
4. Choose format: CSV, Excel, or PDF.
5. Click Export — browser downloads the file.
Member exports only include your own hours. Filenames include workspace slug, date range, and a -my-timesheet segment.
Not included: other members' hours, workspace-wide revenue, admin-only reports, or unassigned projects.

## Profile
Profile (/profile): update name, phone, location, job title, work details, and avatar URL. Email, activity stats, and member-since date are read-only. Changes save per section.

## Settings
Settings (/settings) sections:
- Appearance: light / dark / system theme
- Time: timezone, date/time format, week start (Monday or Sunday), daily target hours
- Notifications: email notification toggles (timesheet reminders, status updates, etc.)
- Security: change password, enable/disable 2FA, view and revoke sessions
- Account: language, default workspace, startup page (timer, dashboard, timesheet, etc.)
Deep links: /settings?section=appearance|time|notifications|security|account

### Two-factor authentication
Settings → Security → Enable 2FA. Add the secret to an authenticator app, enter the 6-digit code to verify. To disable: confirm password + current TOTP code.

### Active sessions
Settings → Security → View Sessions lists devices where you are signed in. Revoke any session except the current one.

## Onboarding replay
Use the sparkles icon in the header → Full setup guide or Quick product tour. Replay anytime.

## Member permissions
Members can: track time on assigned tasks, view/edit own timesheet (when not locked), submit for approval, export own hours, manage profile/settings, see assigned projects and tasks, personalize project display color.
Members cannot: create projects or tasks, set billing rates, approve timesheets, see other members' detailed hours, or access admin billing/exports.

## Three ways to track time
1. Timer (/timer) — live start/pause/stop; best for active work
2. Time Tracker (/time-tracker) — weekly list with search and filters; best for reviewing and bulk edits
3. Timesheet (/timesheet) — calendar drag-and-drop and manual entries; best for planning and exports

## Common questions

**Why don't I see a project or task?**
Only projects you are assigned to appear. Ask your workspace admin for a project invite or task assignment.

**Why can't I edit a time entry?**
The entry may be from the timer (read-only in UI), or the period may be locked because it was submitted or approved. Check Submissions (/submissions) for status. Request edit if approved and locked.

**Why is Submissions empty or missing a project?**
That project may not have timesheet approval enabled, or you have no entries in the selected week.

**Timer won't start?**
Select both a project and a task first. Only one timer can run at a time — stop the current one first.

**Hours look wrong on timesheet?**
Check Settings → Time for timezone and week start. Timesheet views respect your timezone preference.

**How do I switch workspace?**
Use the workspace switcher at the bottom of the sidebar.

**Where is the admin app?**
Workspace admins use a separate admin app for team management, billing, and approvals. Members use this client app only.
"""


def format_nav_catalog() -> str:
    lines = ["## App navigation (deep links)"]
    for item in NAV_CATALOG:
        lines.append(f"- {item['label']} ({item['href']}): {item['when']}")
    return "\n".join(lines)


def build_knowledge_block() -> str:
    return f"{MEMBER_HELP_DOCUMENT.strip()}\n\n{format_nav_catalog()}"
