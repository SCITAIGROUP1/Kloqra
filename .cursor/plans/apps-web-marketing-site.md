# ChronoMint — Public Marketing Site (apps/web) — Complete Final Plan

Standalone Next.js 15 app at `apps/web`, port `3003`.

---

## Site Map

```
/                         Home
/for-members              Member App showcase
/for-admins               Admin App showcase (Workspace Admin + PM)
/roles                    Who gets what — the full role breakdown
  /roles/tenant-owner     Tenant Owner deep-dive
  /roles/tenant-admin     Tenant (Org) Admin deep-dive
  /roles/workspace-admin  Workspace Admin deep-dive
  /roles/project-manager  Project Manager deep-dive
  /roles/member           Member deep-dive
/pricing                  Plans + seat calculator + comparison table
/roadmap                  Product roadmap timeline
/support                  Help desk + ticket form
/support/[slug]           Help article (future)
```

---

## Design System

| Token | Value |
|---|---|
| Primary | `oklch(0.58 0.22 264)` — deep violet |
| Premium | `oklch(0.62 0.22 300)` — vivid purple |
| Success | `oklch(0.72 0.15 175)` — teal |
| Warning | `oklch(0.75 0.15 65)` — amber |
| Background | `oklch(0.14 0.025 264)` — deep navy |
| Card | `oklch(0.28 0.035 264)` glass surface |
| Typography | Inter (300–800) + JetBrains Mono |

**Glass card recipe** (used everywhere):
```css
background: color-mix(in oklch, var(--card) 55%, transparent);
backdrop-filter: blur(20px);
border: 0.5px solid color-mix(in oklch, var(--border) 45%, transparent);
```

**Role identity colors** (used on the Roles pages and comparison matrix):
| Role | Color |
|---|---|
| Tenant Owner | `oklch(0.62 0.22 300)` — premium purple |
| Tenant Admin | `oklch(0.58 0.22 264)` — primary violet |
| Workspace Admin | `oklch(0.72 0.14 175)` — teal |
| Project Manager | `oklch(0.75 0.15 65)` — amber |
| Member | `oklch(0.68 0.03 264)` — neutral blue-grey |

---

## Global Components

### `<MarketingNav />`
Transparent → `backdrop-blur-xl` after 24px scroll.
- Left: SVG logo + "ChronoMint"
- Center: Home · For Members · For Admins · Roles · Pricing · Roadmap · Support
- Right: `Log In` (ghost) · `Start Free Trial` (gradient pill)
- Mobile: hamburger → full-height slide-over drawer

### `<MarketingFooter />`
6 columns: Product · For Teams · Resources · Company · Legal · Support.
Bottom: copyright · socials (GitHub, LinkedIn, X).

---

## Page 1 — Home (`/`)

### Hero Section (`100dvh`)
Three visual depth layers:
1. **Layer 0:** Two animated `blur(140px)` blob divs: primary violet top-left, premium purple bottom-right. 14s orbit loop.
2. **Layer 1:** CSS grid texture at 4% opacity.
3. **Layer 2:**

```
✦ Built for agencies & product teams   ← shimmer pill badge

Time tracking that
actually saves time.                   ← 80px, weight 800, gradient text

ChronoMint captures time automatically,
enforces accountability, and turns hours
into billing-ready insight.            ← muted, 18px

[ Start Tracking — Free ]  [ See It in Action ▶ ]

[ ◉ ◉ ◉ ◉ ◉ ] Trusted by 800+ teams worldwide · ★★★★★ 4.9/5
```

Below: animated dashboard mockup card (parallaxes at 0.25× scroll speed).
Timer increments live with `setInterval(1000)`.

---

### Stats Row
Four animated count-up cards (IntersectionObserver + requestAnimationFrame):
`2.4M+ hours` · `850+ teams` · `140K+ timesheets` · `99.9% uptime`

---

### "Built for Every Role" Section  ← **NEW, bold**
A horizontal scrollable row of five role identity cards (full color, distinct icon, pill badge):

```
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐ ...
│ 👑 Tenant Owner  │ │ 🏢 Org Admin     │ │ 🛠 WS Admin      │
│ ─────────────── │ │ ─────────────── │ │ ─────────────── │
│ Cross-workspace  │ │ Delegates &      │ │ Projects, teams, │
│ analytics,       │ │ workspace setup  │ │ exports, rates   │
│ billing & plans  │ │                  │ │                  │
│ [Explore →]      │ │ [Explore →]      │ │ [Explore →]      │
└──────────────────┘ └──────────────────┘ └──────────────────┘
```

Each card links to `/roles/[role]`. Hover: lift + colored glow matching role identity color.

---

### Dual App Pitch ("Two Apps, One Workflow")
Side-by-side glass cards: Member App (left) → `/for-members` and Admin App (right) → `/for-admins`.

### Integrations Marquee
Dual-row CSS marquee: Jira · Slack · GitHub · Notion · Zapier · QuickBooks · Google Calendar.

### Testimonials
Three glass quote cards (swipe carousel on mobile).

### Final CTA Banner
Pulsing glow ring behind centered: "14-day free trial · No credit card · Cancel anytime"

---

## Page 2 — For Members (`/for-members`)

### Hero
```
Your time, tracked automatically.
Stop managing spreadsheets. Start a timer, we handle the rest.
```

### Feature 1 — Live Timer (alternating row)
Copy: keyboard shortcut (`Space`), pause/resume, auto-stop, tab title sync.
Mockup: Live-incrementing glass card (`02:14:33 ⏱ API Redesign › Auth module`). Green pulsing dot.

### Feature 2 — Timesheet Calendar
Copy: Day/Week/Month view, drag-to-create, conflict detection.
Mockup: Animated 5-day grid with color blocks filling in on scroll entry.

### Feature 3 — Submission Workflow
Copy: DRAFT → SUBMITTED → APPROVED/REJECTED pipeline with realtime push notifications.
Mockup: Status card with teal `✓ APPROVED` and amber `⏳ SUBMITTED` badges.
Pipeline diagram: 3-step horizontal flow with animated connector line drawing in on scroll.

### Feature 4 — Tasks
Copy: Filter by project, log time directly from task card, paginated.
Mockup: Compact task list with project badge + hours pill.

### Feature 5 — Personal Dashboard
Copy: Customizable widget layout (drag/resize), daily goal tracker, hours by category.
Mockup: 2×2 widget grid (animated bar chart + donut + goal ring + stat card).

### Feature 6 — AI Assistant (with "AI" badge)
Copy: GPT-4o mini powered, in-app deep links, rate-limited, **no personal time data sent to the model**.
Mockup: Chat interface with a sample exchange about submitting timesheets.

### Member CTA Banner
```
Everything you need. Nothing you don't.
[ Start Free Trial ]   [ Log In ]
```

---

## Page 3 — For Admins (`/for-admins`)

### Hero
```
Full visibility. Zero chasing.
Approve timesheets, monitor your team live, and export
payroll-ready reports — all in one place.
[ Request a Demo ]
```

### Feature 1 — Live Team Presence (SSE)
Copy: Real-time Server-Sent Events, who's tracking, task + elapsed time, idle detection.
Mockup: Presence list with live-incrementing elapsed times per member.

### Feature 2 — Approval Workflow
Copy: Pending queue, missing submission list, one-click approve/reject with review note, amendment requests, automated reminder emails.
Mockup: Approvals table with SUBMITTED/APPROVED/REJECTED badges and action buttons.

### Feature 3 — Analytics Dashboard
Copy: Drag-and-resize customizable widgets, hours by project/member/category, billable amounts, shareable public widget links.
Mockup: 2×2 glass widget grid (bar chart, donut, stat card, table).

### Feature 4 — Export Wizard (bold "14 Report Types" badge)
Copy: Time Entries · Invoice · Daily/Weekly Summary · By Project · By Member · Budget vs Actual · Utilization · Overtime · Missing Days · Hours by Source · Timesheet Approval Status. CSV/Excel/PDF. Async jobs. Scheduled exports. Shareable links (no login needed).
Mockup: 3-step wizard card showing filter → report types → format.

### Feature 5 — Project & Team Management
Copy: Create projects, color-code, task management, generate invite links, Jira issue linking.
Mockup: Project list with color dots, member counts, hours this month.

### Feature 6 — Global Command Palette ⌘K
Copy: Search projects, tasks, categories, people, pages. 300ms debounced. Keyboard-first.
Mockup: Dark dialog with grouped results.

### Feature 7 — Billing Rates
Copy: Set hourly rates per member, per project, workspace default. Billable flags. Auto-applied to invoice exports.

### Feature 8 — Project Manager Role
**Callout box** (amber accent):
> "Not a full admin? Project Managers get scoped access — tasks, team invites, approvals, and reporting for their projects only. No billing, no workspace settings."
Link: "See the full Project Manager capabilities →" → `/roles/project-manager`

### Admin CTA Banner
```
Give your team the visibility they deserve.
[ Start Free Trial ]   [ Book a Demo ]
```

---

## Page 4 — Roles Showcase (`/roles`) ← **BOLD NEW PAGE**

This is the centrepiece. No SaaS competitor presents this this clearly.

### Hero
```
Built for real organizations.
Every role has exactly the right access. Nothing more. Nothing less.
```

### Role Hierarchy Diagram
Large, beautiful, animated SVG/CSS diagram showing the 4-layer hierarchy:

```
        ☁ Platform (Superadmin)
              │
    ┌─────────▼──────────┐
    │   Organization      │  ← Tenant layer
    │  Owner   ├── Admin  │
    └─────┬────────┬──────┘
          │        │
    ┌─────▼─┐  ┌───▼────────────────────┐
    │       │  │   Workspace             │
    │ Owns  │  │  Admin    Project Mgr   │
    │ all   │  └───┬────────────┬────────┘
    │ WS    │      │            │
    └───────┘  ┌───▼────┐  ┌───▼────┐
               │ Member │  │ Team   │
               └────────┘  │ Member │
                            └────────┘
```

Lines animate in on scroll. Each node is clickable, linking to its role deep-dive page.

---

### Role Card Grid

Five large, visually distinct horizontal role cards (one per role), stacked vertically with alternating background shading and the role identity color as a left-side accent stripe.

---

#### Card 1 — Tenant Owner 👑 (Purple)

**Badge:** `ORGANIZATIONAL LEADER`

**Who is this?** The agency principal or company founder who signs up for ChronoMint. One per organization.

**App:** Admin app → Account mode (`/account`)

**What they get:**

| Domain | Access |
|---|---|
| Organization profile | ✅ Full edit (name, slug, branding) |
| Create workspaces | ✅ Unlimited (within plan) |
| Assign workspace admins | ✅ Per workspace |
| Invite Org Admins | ✅ Delegate ops role |
| **Cross-workspace analytics rollup** | ✅ **Exclusive — total hours, billable amount, active members across ALL workspaces** |
| Subscription & billing | ✅ **Exclusive — upgrade, downgrade, Stripe Checkout, Customer Portal** |
| Organization data export (GDPR) | ✅ **Exclusive — full org ZIP export** |
| All workspace ops | ✅ If also workspace member |

**Exclusive power callout** (large purple glass card):
> "Only the Tenant Owner sees the organization-wide rollup dashboard — total hours, billable revenue, and active member counts across every workspace, in one view. 14-day preset, 30-day default, or custom date range."

**Mockup:** Account overview card:
```
┌─────────────────────────────────────────────────┐
│ Organization Overview          Jun 1 – Jun 25   │
│  Total Hours      Billable       Active Members  │
│  1,240h           $24,800        18 of 22        │
│                                                  │
│  By Workspace                                    │
│  Design Team     480h   $9,600    7 members      │
│  Engineering     620h   $12,400   9 members      │
│  Marketing       140h   $2,800    2 members      │
└─────────────────────────────────────────────────┘
```

---

#### Card 2 — Tenant (Org) Admin 🏢 (Violet)

**Badge:** `OPERATIONS DELEGATE`

**Who is this?** An ops manager or COO delegated by the owner to manage the organization structure — without having billing or subscription access.

**App:** Admin app → Account mode (Workspaces, Workspace Admins, Organization settings)

**What they get:**

| Domain | Access |
|---|---|
| Organization profile | ✅ Edit |
| Create workspaces | ✅ |
| Assign/manage workspace admins | ✅ |
| Workspace admin overview | ✅ |
| Subscription / billing | ❌ Owner only |
| Org data export | ❌ Owner only |
| Invite other Org Admins | ❌ Owner only |
| Cross-workspace rollup | ❌ Owner only |

**Callout:** "The Org Admin role lets you delegate organizational management — creating workspaces and assigning admins — without ever exposing billing details."

---

#### Card 3 — Workspace Admin 🛠 (Teal)

**Badge:** `WORKSPACE OPERATOR`

**Who is this?** A client manager or department head responsible for one workspace. One workspace per membership row — needs separate invite for each workspace.

**App:** Admin app → Workspace mode (full nav)

**What they get — the full list:**

| Domain | Access |
|---|---|
| Projects CRUD | ✅ All projects in workspace |
| Tasks CRUD | ✅ All projects |
| Categories CRUD | ✅ |
| Team invites | ✅ |
| Timesheet approval workflow | ✅ All projects |
| Amendment requests | ✅ Approve/deny |
| Missing submissions — send reminders | ✅ |
| Analytics dashboard (customizable widgets) | ✅ Workspace-wide |
| Team live presence (SSE) | ✅ All members |
| Billing rates (hourly, per-member, per-project) | ✅ |
| Export wizard (14 report types) | ✅ CSV/Excel/PDF |
| Async export jobs | ✅ |
| Scheduled exports | ✅ |
| Shareable export links | ✅ |
| Public API keys | ✅ |
| Jira integration config | ✅ |
| Global command palette (⌘K) | ✅ |
| Timer & personal logs | ✅ |
| Own timesheet submission | ✅ |

**Mockup:** Full admin nav sidebar shown with all items highlighted.

---

#### Card 4 — Project Manager ⚡ (Amber)

**Badge:** `PROJECT LEAD`

**Who is this?** A senior team member elevated to manage specific projects. Not a full admin — scoped to their assigned projects only. Can lead multiple projects simultaneously.

**App:** Admin app with filtered nav (no billing, no categories, no workspace settings, no exports wizard) AND client app (for personal time logging).

**What they get:**

| Domain | Access |
|---|---|
| Tasks CRUD | ✅ Led projects only |
| Project team list | ✅ Led projects only |
| Team invites | ✅ Led projects only |
| Timesheet approvals | ✅ Led projects only |
| Amendment requests | ✅ Led projects only |
| Analytics/reporting | ✅ Scoped to led projects |
| Team live presence | ✅ Scoped to led teams |
| Timer & personal logs | ✅ |
| Own timesheet submission | ✅ |
| Assign LEAD role | ❌ Workspace Admin only |
| Billing rates | ❌ |
| Export wizard | ❌ (personal export-me available) |
| Categories CRUD | ❌ |
| Create projects | ❌ |
| Workspace team management | ❌ |
| Workspace settings | ❌ |

**Dual-app callout** (amber glass card):
> "Project Managers live in both worlds — use the client app to track personal time, and the admin app to manage their projects."

**Mockup:** Admin nav with greyed-out restricted items and amber-highlighted accessible items.

---

#### Card 5 — Member 👤 (Neutral)

**Badge:** `TIME LOGGER`

**Who is this?** Staff members logging their time. Their experience is intentionally simplified — no admin clutter, no team financials.

**App:** Client app only.

**What they get:**

| Domain | Access |
|---|---|
| Live timer (keyboard shortcut) | ✅ |
| Pause / resume / discard | ✅ |
| Timesheet calendar (day/week/month) | ✅ |
| Task-level time logging | ✅ Assigned projects |
| Submit timesheets | ✅ Per project |
| Track submission status (DRAFT/SUBMITTED/APPROVED/REJECTED) | ✅ |
| Request amendments on locked periods | ✅ |
| Personal analytics dashboard | ✅ |
| AI assistant | ✅ |
| Personal export (CSV, PDF) | ✅ |
| Real-time notifications (bell) | ✅ |
| Profile & account settings | ✅ |
| Other members' hours or rates | ❌ Privacy protected |
| Organization-wide revenue | ❌ Privacy protected |
| Admin aggregates | ❌ |

**Privacy callout** (subtle card):
> "Member privacy is a first-class principle. Members never see peer rankings, org-wide revenue, or anyone else's billing rates."

---

### Full Permission Matrix (large interactive table)

A full-width comparison table with all domains as rows and all 5 roles as columns. Uses color-coded cells:
- ✅ Green — full access
- ⚡ Amber — scoped access
- ❌ Muted — no access
- `👑` Crown badge on cells exclusive to Owner

The table has collapsible category sections: Timer · Timesheets · Approvals · Analytics · Exports · Team · Billing · Organization · Platform.

On mobile: horizontal scroll with sticky first column (domain labels).

---

### Roles CTA
```
Not sure which role fits your team?
Talk to us — we'll help you map your org in 15 minutes.
[ Book a Call ]   [ Read the Docs ]
```

---

## Page 5 — Role Deep-Dive Pages (`/roles/[role]`)

Five separate pages, each with:
1. **Hero:** Role name, identity color, persona description, "who is this?" paragraph.
2. **Full feature list** (accordion by domain) with detailed descriptions.
3. **What they CAN'T do** section — equally important for clarity.
4. **App routing diagram** — which app(s) they use and how the nav looks.
5. **Setup guide** — how to provision this role (e.g., "Workspace Admin needs a separate invite per workspace").
6. **CTA** — "Learn how to set up [Role] →" links to docs.

---

## Page 6 — Pricing (`/pricing`)

### Header + Toggle
"Simple pricing. Serious features."
Monthly / Annual toggle → Annual saves 20%.

### Plan Cards

**Starter** — `$12/seat/mo`
- 3 workspaces, 10 seats
- Timer, timesheet, tasks, submissions
- Personal dashboard + basic CSV export
- Member + Workspace Admin roles
- Email support

**Pro** ⭐ — `$22/seat/mo` (premium glow border, scale(1.02))
- 10 workspaces, 50 seats
- Everything in Starter +
- 14 export report types (CSV, Excel, PDF) + async jobs + scheduled exports
- Analytics dashboard (drag/resize widgets)
- Shareable export & widget links
- Team live presence (SSE)
- Jira integration
- AI Assistant
- Global ⌘K command palette
- Timesheet approval workflow
- Project Manager role
- Public API access
- Priority support

**Enterprise** — Custom
- Unlimited workspaces + seats
- Custom limits override per tenant
- Tenant Owner + Org Admin hierarchy
- Organization-wide rollup analytics
- Org data export (GDPR compliance)
- SSO (SAML/OIDC) — roadmap
- Dedicated CSM + SLA
- Custom contracts + NDA
- "Talk to Sales"

### Role-to-Plan Matrix (NEW)
A small visual matrix showing which roles are available on which plans:

| Role | Starter | Pro | Enterprise |
|---|---|---|---|
| Member | ✅ | ✅ | ✅ |
| Workspace Admin | ✅ | ✅ | ✅ |
| Project Manager | — | ✅ | ✅ |
| Tenant Admin | — | — | ✅ |
| Tenant Owner | — | — | ✅ |

### Seat Calculator
Slider 1–200 seats → recommended plan + monthly/annual cost estimate.

### Full Feature Comparison Table
All features as rows, 3 plans as columns. Collapsible by category.

### FAQ Accordion
10 questions: trial, billing, seat counting, plan changes, data export, API keys.

---

## Page 7 — Roadmap (`/roadmap`)

### Header
"What's shipped. What's coming."

### Timeline (vertical spine, full-width)

**Shipped (left, full color with checkmarks):**
- ✅ Live timer engine (pause/resume/discard, Redis-backed)
- ✅ Timesheet calendar (day/week/month, drag-to-create)
- ✅ Per-project timesheet approval workflow
- ✅ Amendment requests
- ✅ Admin analytics dashboard (drag/resize widgets)
- ✅ 14 export report types (CSV, Excel, PDF)
- ✅ Async export jobs + BullMQ queue
- ✅ Scheduled exports
- ✅ Shareable export links + public widget links
- ✅ Team live presence (SSE)
- ✅ Real-time notifications (Socket.IO + Redis fan-out)
- ✅ Jira Cloud integration (OAuth + issue linking)
- ✅ AI Assistant (GPT-4o mini, privacy-first)
- ✅ Global ⌘K command palette
- ✅ Project Manager role (scoped permissions)
- ✅ Multi-tenant SaaS (tenants, workspaces, subscriptions)
- ✅ Self-serve signup (Starter/Pro)
- ✅ Stripe Checkout + Customer Portal (F13)
- ✅ Organization-wide rollup analytics (Owner only)
- ✅ Platform admin console (internal staff ops)
- ✅ PostgreSQL partitioning on time logs (scale-ready)
- ✅ Multi-device session management
- ✅ GDPR org data export

**Coming soon (right, shimmer + muted):**
- 🔜 Budget burn-down widget — H1 2026
- 🔜 Project detail hub (per-project dashboard) — H1 2026
- 🔜 Audit log v1 — H1 2026
- 🔜 Utilization report — H2 2026
- 🔜 Invoice generation (draft PDF from billable export) — H2 2026
- 🔜 Native mobile apps (iOS + Android) — Q3 2026
- 🔜 AI auto-categorization — Q3 2026
- 🔜 SSO (SAML/OIDC) — Q4 2026
- 🔜 Client portal (read-only external access) — H3 2027
- 🔜 QuickBooks / Xero sync — H3 2027
- 🔜 Payroll integrations (Gusto, Rippling) — H4 2027

### Feature Voting CTA
"Want to influence what ships next? Vote on features or submit an idea."

---

## Page 8 — Help Desk (`/support`)

### Hero Search
"How can we help?" — real-time filter input with animated focus glow.

### Category Pills
All · Billing · Account · Timer · Timesheets · Approvals · Exports · Roles & Permissions · Integrations · API

### FAQ Grid (2-col → 1-col mobile)
16 cards, color-coded by category badge.

### Ticket Form (glass card)
Fields: Name · Email · Organization · Category · Subject · Description · Attachment (5MB).
Validation: React Hook Form + Zod. Success: animated ✓ with reference number.

---

## Animation Inventory

| Animation | Where | Technique |
|---|---|---|
| Blob orbit | Home hero | CSS `@keyframes` 14s translate loop |
| Timer/presence tick | All live mockups | `setInterval(1000)` JS |
| Stats count-up | Home stats row | `IntersectionObserver` + `requestAnimationFrame` easeOutExpo |
| Feature row entrance | All pages | Staggered `animate-fade-in-up` |
| Calendar blocks fill | `/for-members` | Staggered CSS `@keyframes` height reveal |
| Approval pipeline draw | `/for-members` | SVG stroke `dashoffset` animate on scroll |
| Role hierarchy animate | `/roles` | SVG/CSS line draw on scroll, nodes fade in |
| Role card hover | `/roles` | `translateY(-6px)` + colored glow `box-shadow` |
| Permission matrix reveal | `/roles` | Staggered row fade-in on scroll |
| Pricing card hover | `/pricing` | `translateY(-6px)` + `box-shadow` |
| Pricing toggle crossfade | `/pricing` | React state + `opacity 150ms` transition |
| Seat calculator live | `/pricing` | React controlled state, instant DOM |
| Nav blur | All pages | JS `scroll` → `classList.toggle` |
| Roadmap shimmer | `/roadmap` | CSS `@keyframes shimmer` on upcoming items |
| Integration marquee | Home | CSS `@keyframes marquee-ltr/rtl` infinite |
| Form success | `/support` | Crossfade: form `opacity→0` → checkmark `fade-in-up` |
| Mobile drawer | Nav | CSS `transform: translateY` + `opacity` |

All animations respect `@media (prefers-reduced-motion: reduce)`.

---

## File Structure

```
apps/web/
├── package.json                         # @kloqra/web, port 3003
├── next.config.ts
├── tsconfig.json
├── postcss.config.mjs
└── src/
    ├── app/
    │   ├── layout.tsx                   # Root: Inter font, nav, footer, metadata
    │   ├── globals.css                  # @kloqra/ui/globals.css + marketing extras
    │   ├── page.tsx                     # Home
    │   ├── for-members/page.tsx
    │   ├── for-admins/page.tsx
    │   ├── roles/
    │   │   ├── page.tsx                 # Role overview + hierarchy diagram + matrix
    │   │   ├── tenant-owner/page.tsx
    │   │   ├── tenant-admin/page.tsx
    │   │   ├── workspace-admin/page.tsx
    │   │   ├── project-manager/page.tsx
    │   │   └── member/page.tsx
    │   ├── pricing/page.tsx
    │   ├── roadmap/page.tsx
    │   └── support/
    │       ├── page.tsx
    │       └── [slug]/page.tsx          # Future help articles
    └── components/
        ├── layout/
        │   ├── marketing-nav.tsx
        │   └── marketing-footer.tsx
        ├── home/
        │   ├── hero-section.tsx
        │   ├── stats-row.tsx
        │   ├── role-cards-strip.tsx     # 5 role identity cards
        │   ├── dual-app-pitch.tsx
        │   ├── integrations-marquee.tsx
        │   └── testimonials.tsx
        ├── showcase/
        │   ├── feature-row.tsx          # Alternating copy + mockup
        │   ├── timer-mockup.tsx         # Live-incrementing
        │   ├── presence-mockup.tsx      # Live-incrementing
        │   ├── approvals-mockup.tsx
        │   ├── dashboard-mockup.tsx
        │   ├── calendar-mockup.tsx      # Animated fill
        │   ├── export-mockup.tsx
        │   ├── command-palette-mockup.tsx
        │   └── chat-mockup.tsx
        ├── roles/
        │   ├── role-hierarchy-diagram.tsx
        │   ├── role-card.tsx
        │   ├── permission-matrix.tsx    # Full color-coded table
        │   └── role-feature-accordion.tsx
        ├── pricing/
        │   ├── plan-card.tsx
        │   ├── billing-toggle.tsx
        │   ├── seat-calculator.tsx
        │   ├── role-plan-matrix.tsx     # Which roles on which plan
        │   └── comparison-table.tsx
        ├── roadmap/
        │   └── timeline.tsx
        └── support/
            ├── faq-grid.tsx
            ├── category-pills.tsx
            ├── support-search.tsx
            └── ticket-form.tsx
```

---

## Verification Plan

```bash
pnpm --filter @kloqra/web build   # TypeScript + Next.js
pnpm --filter @kloqra/web dev     # http://localhost:3003
```

### Manual Checklist
- [ ] All 8 pages render correctly, SEO metadata on every page
- [ ] Role hierarchy diagram lines animate on scroll
- [ ] Permission matrix is readable and correct vs TENANT_RBAC.md
- [ ] Timer + presence mockups increment every second
- [ ] Pricing toggle crossfades, seat calculator is live
- [ ] Ticket form validates + shows animated success state
- [ ] Fully responsive at 375 / 768 / 1280 / 1920px
- [ ] `prefers-reduced-motion` disables all animations
