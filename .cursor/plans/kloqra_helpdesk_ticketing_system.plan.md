# Kloqra Help Desk — Platform Admin Ticketing System
## Production-Grade Plan (Queue-Driven Architecture)

**Scope:** Full-stack ticketing system surfaced inside `apps/platform-admin` (Next.js 15) and backed by `apps/api` (NestJS + BullMQ + Prisma + PostgreSQL + Redis). Covers schema, queue workers, REST API, real-time WebSocket push, and the full admin UI.

---

## 1. Vision & Goals

Kloqra platform operators need a first-class internal help-desk so they can:

| Goal | Detail |
|------|--------|
| **Receive** tenant / end-user support requests | Tickets submitted through a public-facing form or an API endpoint |
| **Triage** tickets via smart queues | Auto-routing by category, SLA tier, and agent workload |
| **Respond** with full conversation thread | Email-in & email-out via Brevo (Nodemailer already wired), plus in-app replies |
| **Track SLAs** with breach alerting | First-response & resolution timers; breach notifications via BullMQ delayed jobs |
| **Report** team performance | Queue depth, MTTR, MTTF, agent workload, per-tenant breakdown |
| **Audit** every state change | Leverages existing `PlatformAuditEvent` infrastructure |

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│  apps/platform-admin  (Next.js 15, App Router)          │
│  /helpdesk  — Ticket List, Detail, Agent Console        │
│  /helpdesk/queues — Queue Monitor                       │
│  /helpdesk/reports — SLA & Throughput dashboards        │
└────────────────┬────────────────────────────────────────┘
                 │ REST + WS
┌────────────────▼────────────────────────────────────────┐
│  apps/api  (NestJS)                                     │
│  ┌──────────────────────────────────────────────────┐   │
│  │  HelpDeskModule                                  │   │
│  │  ├── TicketsController  (CRUD, assign, reply)    │   │
│  │  ├── QueuesController   (queue stats)            │   │
│  │  ├── HelpDeskService    (domain logic)           │   │
│  │  ├── SlaService         (breach detection)       │   │
│  │  └── HelpDeskGateway    (Socket.IO real-time)    │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  BullMQ Queues (Redis-backed)                           │
│  ├── helpdesk-ingest-queue  (new ticket processing)     │
│  ├── helpdesk-reply-queue   (outbound email delivery)   │
│  ├── helpdesk-sla-queue     (breach timers)             │
│  └── helpdesk-notify-queue  (in-app + email alerts)     │
│                                                         │
│  PostgreSQL (Prisma)                                    │
│  ├── HelpDeskTicket                                     │
│  ├── HelpDeskTicketMessage                              │
│  ├── HelpDeskQueue (logical routing queue)              │
│  ├── HelpDeskAgent                                      │
│  └── HelpDeskSlaPolicy                                  │
└─────────────────────────────────────────────────────────┘
```

---

## 3. Database Schema (Prisma additions to `schema.prisma`)

### 3.1 Enums

```prisma
enum TicketStatus {
  OPEN
  PENDING        // waiting for requester reply
  IN_PROGRESS
  ON_HOLD
  RESOLVED
  CLOSED
}

enum TicketPriority {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}

enum TicketChannel {
  WEB_FORM       // public submission form
  EMAIL          // email-to-ticket
  PLATFORM_ADMIN // opened directly by platform op
  API            // webhook / API integration
}
```

### 3.2 Models

```prisma
/// Logical queue that groups tickets by topic/team.
/// e.g. "Billing", "Technical", "Onboarding"
model HelpDeskQueue {
  id          String   @id @default(uuid())
  name        String   @unique
  slug        String   @unique
  description String?
  color       String   @default("#6366f1")
  isActive    Boolean  @default(true)  @map("is_active")
  sortOrder   Int      @default(0)     @map("sort_order")
  /// JSON: { firstResponseMinutes: 240, resolutionMinutes: 1440 }
  slaPolicy   Json?    @map("sla_policy")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt      @map("updated_at")

  tickets     HelpDeskTicket[]
  agents      HelpDeskAgent[]

  @@map("helpdesk_queues")
}

/// Many-to-many: platform_users who are agents for a queue.
model HelpDeskAgent {
  id        String        @id @default(uuid())
  queueId   String        @map("queue_id")
  platformUserId String   @map("platform_user_id")
  isActive  Boolean       @default(true) @map("is_active")
  createdAt DateTime      @default(now()) @map("created_at")

  queue        HelpDeskQueue @relation(fields: [queueId], references: [id], onDelete: Cascade)
  platformUser PlatformUser  @relation(fields: [platformUserId], references: [id], onDelete: Cascade)

  @@unique([queueId, platformUserId])
  @@index([platformUserId])
  @@map("helpdesk_agents")
}

model HelpDeskTicket {
  id              String          @id @default(uuid())

  /// Ticket reference number shown to humans (TKT-000001)
  ticketNumber    Int             @unique @default(autoincrement()) @map("ticket_number")

  queueId         String          @map("queue_id")
  status          TicketStatus    @default(OPEN)
  priority        TicketPriority  @default(MEDIUM)
  channel         TicketChannel   @default(WEB_FORM)
  subject         String
  /// Requester details (may not be a platform user)
  requesterName   String          @map("requester_name")
  requesterEmail  String          @map("requester_email")
  /// Link to tenant if the request comes from a known tenant
  tenantId        String?         @map("tenant_id")

  /// Assigned platform agent
  assignedToId    String?         @map("assigned_to_id")

  /// Tags stored as JSON array of strings
  tags            Json            @default("[]")

  /// SLA tracking
  firstResponseAt DateTime?       @map("first_response_at")
  resolvedAt      DateTime?       @map("resolved_at")
  closedAt        DateTime?       @map("closed_at")
  slaBreached     Boolean         @default(false) @map("sla_breached")
  firstResponseDue DateTime?      @map("first_response_due")
  resolutionDue   DateTime?       @map("resolution_due")

  /// Internal notes metadata
  internalNote    String?         @map("internal_note")

  createdAt       DateTime        @default(now()) @map("created_at")
  updatedAt       DateTime        @updatedAt      @map("updated_at")

  queue           HelpDeskQueue   @relation(fields: [queueId], references: [id])
  assignedTo      PlatformUser?   @relation("TicketsAssigned", fields: [assignedToId], references: [id])
  tenant          Tenant?         @relation(fields: [tenantId], references: [id], onDelete: SetNull)
  messages        HelpDeskTicketMessage[]
  history         HelpDeskTicketHistory[]

  @@index([queueId, status])
  @@index([assignedToId, status])
  @@index([tenantId])
  @@index([status, createdAt(sort: Desc)])
  @@index([requesterEmail])
  @@index([slaBreached, status])
  @@map("helpdesk_tickets")
}

enum MessageDirection {
  INBOUND    // from requester
  OUTBOUND   // from agent
  INTERNAL   // internal note (not sent to requester)
}

model HelpDeskTicketMessage {
  id          String           @id @default(uuid())
  ticketId    String           @map("ticket_id")
  direction   MessageDirection
  /// Platform user id if agent-sent, null if requester-sent
  authorId    String?          @map("author_id")
  authorName  String           @map("author_name")
  authorEmail String           @map("author_email")
  body        String
  htmlBody    String?          @map("html_body")
  /// Email Message-ID for threading
  emailMessageId String?       @unique @map("email_message_id")
  attachments Json             @default("[]") // [{ filename, storageKey, sizeBytes, contentType }]
  createdAt   DateTime         @default(now()) @map("created_at")

  ticket  HelpDeskTicket @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  author  PlatformUser?  @relation(fields: [authorId], references: [id], onDelete: SetNull)

  @@index([ticketId, createdAt])
  @@map("helpdesk_ticket_messages")
}

/// Immutable state-change ledger per ticket.
model HelpDeskTicketHistory {
  id          String   @id @default(uuid())
  ticketId    String   @map("ticket_id")
  actorId     String?  @map("actor_id")   // null = system
  actorName   String   @map("actor_name")
  action      String   // e.g. "status_changed", "assigned", "priority_changed"
  before      Json?
  after       Json?
  createdAt   DateTime @default(now()) @map("created_at")

  ticket HelpDeskTicket @relation(fields: [ticketId], references: [id], onDelete: Cascade)

  @@index([ticketId, createdAt(sort: Desc)])
  @@map("helpdesk_ticket_history")
}
```

> **Migration strategy**: Single Prisma migration file. No data risk — all new tables. Add `HelpDeskAgent[]` relation to existing `PlatformUser` model (non-breaking).

---

## 4. BullMQ Queue Architecture

### 4.1 Queue Registry (add to `apps/api/src/common/queues.ts`)

```typescript
// additions only
HELPDESK_INGEST:  "helpdesk-ingest-queue",
HELPDESK_REPLY:   "helpdesk-reply-queue",
HELPDESK_SLA:     "helpdesk-sla-queue",
HELPDESK_NOTIFY:  "helpdesk-notify-queue",
```

### 4.2 Queue Responsibilities

| Queue | Trigger | Worker | Concurrency |
|-------|---------|--------|-------------|
| `helpdesk-ingest-queue` | New ticket arrives (form, email webhook, API) | `HelpdeskIngestWorker` | 5 |
| `helpdesk-reply-queue` | Agent posts an OUTBOUND message | `HelpdeskReplyWorker` | 10 |
| `helpdesk-sla-queue` | Ticket created / status changed (delayed jobs) | `HelpdeskSlaWorker` | 3 |
| `helpdesk-notify-queue` | Any event that needs in-app/email notification | `HelpdeskNotifyWorker` | 10 |

### 4.3 Job Payloads (TypeScript interfaces)

```typescript
// helpdesk-ingest-queue
interface IngestTicketJob {
  channel: TicketChannel;
  subject: string;
  body: string;
  htmlBody?: string;
  requesterName: string;
  requesterEmail: string;
  tenantId?: string;
  emailMessageId?: string;
  attachments?: Attachment[];
  suggestedQueueSlug?: string; // from form selection
}

// helpdesk-reply-queue
interface ReplyEmailJob {
  ticketId: string;
  messageId: string;
  toEmail: string;
  toName: string;
  subject: string;
  body: string;
  htmlBody: string;
  replyToMessageId?: string; // for email threading
}

// helpdesk-sla-queue (delayed job)
interface SlaCheckJob {
  ticketId: string;
  checkType: "first_response" | "resolution";
}

// helpdesk-notify-queue
interface HelpdeskNotifyJob {
  type: "ticket_assigned" | "new_reply" | "sla_breach" | "status_changed";
  ticketId: string;
  recipientPlatformUserIds: string[];
  metadata: Record<string, unknown>;
}
```

### 4.4 Worker Details

#### `HelpdeskIngestWorker`
1. Validate and sanitise input (strip XSS from HTML body)
2. Auto-detect queue: match subject keywords to `HelpDeskQueue` names; fallback to "General"
3. Auto-assign: query queue's active agents ordered by open ticket count (round-robin load balancing)
4. Compute SLA deadlines from `HelpDeskQueue.slaPolicy`
5. `prisma.$transaction`: create `HelpDeskTicket` + initial `HelpDeskTicketMessage` (INBOUND) + `HelpDeskTicketHistory`
6. Enqueue: `helpdesk-sla-queue` (delayed by `firstResponseMinutes`)
7. Enqueue: `helpdesk-notify-queue` → notify assigned agent
8. Emit Socket.IO event `helpdesk:ticket-created` to platform admin room

#### `HelpdeskReplyWorker`
1. Load ticket + requester contact info
2. Build branded email template (Nodemailer / Brevo)
3. Add `In-Reply-To` header using last inbound `emailMessageId` for proper email threading
4. Send email; capture outbound `Message-ID`
5. Update `HelpDeskTicketMessage.emailMessageId`
6. If first agent reply: set `ticket.firstResponseAt = now()`
7. Emit `helpdesk:ticket-updated`

#### `HelpdeskSlaWorker`
1. Load ticket; if already resolved or closed → discard
2. If `checkType = first_response` and `firstResponseAt` is null → breach!
3. If `checkType = resolution` and `resolvedAt` is null → breach!
4. Set `ticket.slaBreached = true`; append history entry
5. Enqueue `helpdesk-notify-queue` with type `sla_breach` → notify assigned agent + queue supervisors
6. Emit `helpdesk:sla-breach` Socket.IO event
7. Write `PlatformAuditEvent`

#### `HelpdeskNotifyWorker`
1. For each `recipientPlatformUserIds`:
   - Create `PlatformNotification` record (uses existing table)
   - Emit `platform:notification` via existing `PlatformNotificationsRealtimeService`
2. For `sla_breach`: also send email via Nodemailer

### 4.5 Dead Letter Queue (DLQ) Strategy

- All four queues configured with `attempts: 3, backoff: { type: 'exponential', delay: 5_000 }`
- Failed jobs land in BullMQ's built-in `failed` list
- A `HelpdeskDlqMonitorService` (scheduled cron every 5 min) queries failed job counts and surfaces alerts in the Queue Monitor UI

---

## 5. API Endpoints (`apps/api` — `HelpDeskModule`)

### 5.1 Public Ticket Submission (no auth)

```
POST /helpdesk/tickets/submit
Body: { subject, body, requesterName, requesterEmail, queueSlug?, tenantSlug? }
Rate-limited: 5 req/min per IP via @nestjs/throttler
Returns: { ticketNumber, message: "We'll be in touch shortly" }
```

### 5.2 Platform Admin Endpoints (auth: `PlatformJwtGuard`)

#### Tickets
```
GET    /platform/helpdesk/tickets
       ?status=OPEN&queueId=&assignedToId=&priority=&search=&page=&limit=
GET    /platform/helpdesk/tickets/:id          — full ticket + messages + history
POST   /platform/helpdesk/tickets              — create on behalf (channel: PLATFORM_ADMIN)
PATCH  /platform/helpdesk/tickets/:id          — update status/priority/assignedTo/tags
POST   /platform/helpdesk/tickets/:id/messages — post reply (OUTBOUND) or internal note
GET    /platform/helpdesk/tickets/:id/messages
DELETE /platform/helpdesk/tickets/:id          — soft-close (CLOSED status only)
```

#### Queues (logical routing queues)
```
GET    /platform/helpdesk/queues
POST   /platform/helpdesk/queues
PATCH  /platform/helpdesk/queues/:id
DELETE /platform/helpdesk/queues/:id
GET    /platform/helpdesk/queues/:id/agents
POST   /platform/helpdesk/queues/:id/agents      — add platform user as agent
DELETE /platform/helpdesk/queues/:id/agents/:agentId
```

#### Reports & Stats
```
GET /platform/helpdesk/stats/overview
    Returns: { openCount, pendingCount, slaBreachedCount, resolvedToday, avgFirstResponseMin }
GET /platform/helpdesk/stats/queue-depth       — per-queue open ticket counts
GET /platform/helpdesk/stats/agent-workload    — per-agent open ticket counts
GET /platform/helpdesk/stats/sla-compliance    — % tickets resolved within SLA (date range)
GET /platform/helpdesk/stats/volume-trend      — daily ticket volume chart (last 30d)
GET /platform/helpdesk/queues/bull-stats       — BullMQ queue depths (active/waiting/failed)
```

### 5.3 Response DTOs (key examples)

```typescript
// TicketListItemDto
{
  id, ticketNumber, subject, status, priority, channel,
  requesterName, requesterEmail,
  queueName, queueColor,
  assignedToName?,
  tenantName?,
  slaBreached, firstResponseDue, resolutionDue,
  messageCount, lastActivityAt, createdAt
}

// TicketDetailDto extends TicketListItemDto
{
  ...TicketListItemDto,
  tags: string[],
  messages: TicketMessageDto[],
  history: TicketHistoryDto[]
}
```

---

## 6. Real-Time WebSocket Events

Uses the existing `Socket.IO` gateway infrastructure in `apps/api`.

### New Gateway: `HelpDeskGateway`

```typescript
// Room: platform admin users join "helpdesk" room on connect
@SubscribeMessage("helpdesk:join")

// Server → Client events
helpdesk:ticket-created   { ticketId, ticketNumber, queueId, subject }
helpdesk:ticket-updated   { ticketId, changes: Partial<Ticket> }
helpdesk:message-received { ticketId, message: TicketMessageDto }
helpdesk:sla-breach       { ticketId, ticketNumber, checkType }
helpdesk:queue-stats      { queueId, openCount, waiting, active } (broadcast every 30s)
```

Frontend uses these events to update ticket lists and detail views without polling.

---

## 7. Frontend — `apps/platform-admin`

### 7.1 Route Structure

```
app/(platform)/helpdesk/
├── page.tsx                       — Ticket queue board (default: All Open)
├── layout.tsx                     — Shared sidebar + real-time socket setup
├── [ticketId]/
│   └── page.tsx                   — Ticket detail / conversation thread
├── queues/
│   ├── page.tsx                   — Queue management list
│   └── [queueId]/page.tsx         — Queue config + agent roster
├── reports/
│   └── page.tsx                   — SLA compliance + volume charts
└── settings/
    └── page.tsx                   — Default SLA policies, email templates
```

### 7.2 Key UI Components

#### `src/features/helpdesk/`

```
helpdesk/
├── ticket-board/
│   ├── ticket-list.tsx            — Virtualized list (react-window) w/ filters
│   ├── ticket-list-item.tsx       — Status badge, SLA countdown, priority chip
│   ├── ticket-filters.tsx         — Status / queue / agent / priority / search
│   └── ticket-quick-actions.tsx   — Assign, change status inline
├── ticket-detail/
│   ├── ticket-detail-page.tsx     — Two-column layout: thread | sidebar
│   ├── conversation-thread.tsx    — Message list with direction indicators
│   ├── reply-composer.tsx         — Rich text editor (Markdown/HTML), OUTBOUND or INTERNAL toggle
│   ├── ticket-sidebar.tsx         — Ticket meta, SLA timers, assignment, tags
│   └── ticket-history-log.tsx     — Audit trail accordion
├── queues/
│   ├── queue-list-page.tsx
│   ├── queue-form-modal.tsx       — Create / edit queue + SLA policy
│   └── queue-agent-roster.tsx
├── reports/
│   ├── sla-compliance-chart.tsx   — Line chart (recharts)
│   ├── volume-trend-chart.tsx     — Bar chart (recharts)
│   └── agent-workload-table.tsx
├── queue-monitor/
│   ├── bull-queue-stats-card.tsx  — Live BullMQ depths (active/waiting/failed/delayed)
│   └── dlq-alert-banner.tsx
└── shared/
    ├── sla-countdown-badge.tsx    — Real-time countdown to SLA breach
    ├── ticket-status-badge.tsx
    ├── ticket-priority-chip.tsx
    └── use-helpdesk-socket.ts     — Custom hook: joins "helpdesk" room, maps events to Zustand
```

### 7.3 State Management

**Zustand store** (`src/lib/stores/helpdesk-store.ts`):

```typescript
interface HelpdeskStore {
  // Ticket list
  tickets: TicketListItemDto[];
  total: number;
  filters: TicketFilters;
  
  // Active ticket detail
  activeTicket: TicketDetailDto | null;
  
  // Queue stats (real-time)
  queueStats: Record<string, QueueStatDto>;
  
  // Actions
  applyFilter: (filter: Partial<TicketFilters>) => void;
  upsertTicket: (ticket: TicketListItemDto) => void;   // called by WS events
  appendMessage: (ticketId: string, msg: TicketMessageDto) => void;
  markSlaBreached: (ticketId: string) => void;
}
```

### 7.4 Navigation Integration

Add **Help Desk** to the existing platform admin sidebar nav:

```tsx
// In platform sidebar nav config
{
  label: "Help Desk",
  icon: LifeBuoy,
  href: "/helpdesk",
  badge: openTicketCount,    // pulled from overview stats
  children: [
    { label: "All Tickets", href: "/helpdesk" },
    { label: "My Tickets",  href: "/helpdesk?assignedToMe=true" },
    { label: "SLA Breached", href: "/helpdesk?slaBreached=true" },
    { label: "Queues",      href: "/helpdesk/queues" },
    { label: "Reports",     href: "/helpdesk/reports" },
  ]
}
```

### 7.5 Public Submission Form

Route: `apps/web` (or standalone page in `platform-admin`) at `/support`

```
/support
├── page.tsx        — Submission form (subject, message, name, email, queue select)
└── success/page.tsx — Confirmation with ticket number
```

This calls `POST /helpdesk/tickets/submit` (unauthenticated, rate-limited).

---

## 8. Email-to-Ticket (Inbound Email Parsing)

> **Implementation**: Brevo (Sendinblue) Inbound Email Webhook → `POST /helpdesk/email-inbound`

### Flow

```
Requester sends email → support@kloqra.com
         ↓
Brevo parses & POSTs webhook to:
  POST /helpdesk/email-inbound  (secured by HMAC signature)
         ↓
HelpdeskEmailInboundController
  - Verify Brevo HMAC signature
  - Check In-Reply-To header → existing ticket? (thread) : new ticket
  - Enqueue to helpdesk-ingest-queue
         ↓
HelpdeskIngestWorker creates/updates ticket
```

### Controller

```typescript
@Post('email-inbound')
@UseGuards(BrevoWebhookGuard)  // validates x-brevo-signature
async handleInboundEmail(@Body() dto: BrevoInboundDto) {
  // Parse multipart, extract text/html body
  // Resolve existing ticket by In-Reply-To header
  // Enqueue ingest job
}
```

---

## 9. SLA Policy Design

### Per-Queue SLA JSON shape

```json
{
  "firstResponseMinutes": 240,
  "resolutionMinutes": 1440,
  "businessHoursOnly": false,
  "escalateAfterMinutes": 1200
}
```

### Priority multipliers (applied at ticket creation)

| Priority | First Response Factor | Resolution Factor |
|----------|-----------------------|-------------------|
| CRITICAL  | 0.25× (e.g. 1h)      | 0.25×             |
| HIGH      | 0.5×                  | 0.5×              |
| MEDIUM    | 1×                    | 1×                |
| LOW       | 2×                    | 2×                |

### SLA delayed job lifecycle

```
Ticket created → enqueue SlaCheckJob(first_response, delay=firstResponseDue - now())
                 enqueue SlaCheckJob(resolution, delay=resolutionDue - now())

Ticket status → RESOLVED → remove pending SLA jobs via queue.remove(jobId)
```

Job IDs are deterministic: `sla:${ticketId}:first_response` and `sla:${ticketId}:resolution` — enabling easy cancellation.

---

## 10. File Attachment Handling

Attachments follow the existing `ExportJob` / `TenantDataExportJob` storage pattern (local filesystem in dev, object storage in prod).

```
POST /platform/helpdesk/tickets/:id/attachments
  — multipart/form-data upload
  — stores file → .helpdesk-attachments/{ticketId}/{uuid}-{filename}
  — returns { storageKey, filename, sizeBytes, contentType }

GET /platform/helpdesk/tickets/:id/attachments/:storageKey
  — streamed file download, requires auth
```

---

## 11. Module File Structure (`apps/api`)

```
src/modules/helpdesk/
├── helpdesk.module.ts
├── application/
│   ├── helpdesk-tickets.service.ts       — Core CRUD + business logic
│   ├── helpdesk-queues.service.ts        — Queue management
│   ├── helpdesk-sla.service.ts           — SLA deadline computation + breach handling
│   ├── helpdesk-stats.service.ts         — Report queries
│   ├── helpdesk-email-parser.service.ts  — Brevo inbound email parsing
│   └── helpdesk-attachments.service.ts   — File storage
├── interface/
│   └── http/
│       ├── helpdesk-tickets.controller.ts
│       ├── helpdesk-queues.controller.ts
│       ├── helpdesk-stats.controller.ts
│       ├── helpdesk-email-inbound.controller.ts
│       └── dto/
│           ├── create-ticket.dto.ts
│           ├── update-ticket.dto.ts
│           ├── create-message.dto.ts
│           ├── submit-ticket.dto.ts
│           ├── ticket-list-item.dto.ts
│           ├── ticket-detail.dto.ts
│           └── queue-stats.dto.ts
├── gateway/
│   └── helpdesk.gateway.ts
└── workers/
    ├── helpdesk-ingest.worker.ts
    ├── helpdesk-reply.worker.ts
    ├── helpdesk-sla.worker.ts
    └── helpdesk-notify.worker.ts
```

---

## 12. Security & Compliance

| Concern | Approach |
|---------|----------|
| **Auth** | All `/platform/helpdesk/*` routes behind `PlatformJwtGuard` (existing) |
| **Public form** | `ThrottlerGuard` 5 req/min/IP; CAPTCHA-ready field |
| **Email webhook** | HMAC-SHA256 signature validation per Brevo docs |
| **XSS** | Sanitise all HTML bodies with `sanitize-html` before storage |
| **File uploads** | MIME type validation; max 10 MB; stored with opaque key (no path traversal) |
| **Audit trail** | Every ticket state change → `HelpDeskTicketHistory` + `PlatformAuditEvent` |
| **Data isolation** | Platform agents cannot access tenant workspace data via ticket API |
| **Rate limiting** | Ingest queue max 100 concurrent, overflow DLQ'd |

---

## 13. Observability & Monitoring

- **BullMQ Bull Board** (optional): mount `@bull-board/express` at `/platform/bull-board` behind platform auth for visual queue inspection
- **Queue depth alerts**: `HelpdeskDlqMonitorService` cron → emit `PlatformNotification` if failed job count > 5
- **Metrics**: ticket volume, queue depth, and SLA breach rate logged via NestJS Logger; ready for Datadog/Prometheus export
- **Health check**: `GET /health` (existing) extended with Redis ping check

---

## 14. Testing Strategy

### Unit Tests (`vitest`)

| File | Coverage target |
|------|-----------------|
| `helpdesk-sla.service.spec.ts` | SLA deadline math, priority multipliers |
| `helpdesk-tickets.service.spec.ts` | CRUD, state machine transitions |
| `helpdesk-ingest.worker.spec.ts` | Queue routing, auto-assign logic |
| `helpdesk-sla.worker.spec.ts` | Breach detection, job cancellation |

### E2E Tests (`vitest e2e`)

```
test/helpdesk.e2e.ts
  ✓ POST /helpdesk/tickets/submit — creates ticket, enqueues job
  ✓ PATCH /platform/helpdesk/tickets/:id — status transitions
  ✓ POST /platform/helpdesk/tickets/:id/messages — OUTBOUND enqueues reply job
  ✓ SLA breach: ticket with 1-min SLA policy → breach job fires
  ✓ Queue agent assignment — round-robin across 2 agents
```

---

## 15. Implementation Phases

### Phase 1 — Foundation (Week 1)
- [ ] Prisma schema additions + migration
- [ ] `HelpDeskModule` skeleton (module, controllers, service stubs)
- [ ] BullMQ queue registration (4 new queues)
- [ ] `HelpdeskIngestWorker` (create ticket, auto-assign, history)
- [ ] `POST /helpdesk/tickets/submit` (public, rate-limited)
- [ ] Basic `GET/POST/PATCH` ticket endpoints

### Phase 2 — Agent Console UI (Week 2)
- [ ] Platform admin `/helpdesk` route + layout
- [ ] `TicketList` with filters (status, queue, priority)
- [ ] `TicketDetail` — conversation thread view
- [ ] `ReplyComposer` — OUTBOUND + INTERNAL toggle
- [ ] `HelpdeskReplyWorker` — email send via Nodemailer/Brevo
- [ ] Sidebar nav integration with open badge count

### Phase 3 — SLA & Real-Time (Week 3)
- [ ] `HelpdeskSlaWorker` — breach detection + notification
- [ ] `HelpDeskGateway` — Socket.IO room + events
- [ ] `use-helpdesk-socket.ts` hook + Zustand store
- [ ] `SlaCountdownBadge` component (real-time)
- [ ] `HelpdeskNotifyWorker` — `PlatformNotification` + email

### Phase 4 — Queues, Reports & Email-In (Week 4)
- [ ] Queue management UI (`/helpdesk/queues`)
- [ ] Reports page (SLA compliance, volume, agent workload)
- [ ] BullMQ queue monitor card
- [ ] Brevo inbound email webhook + `HelpdeskEmailParserService`
- [ ] Public submission form on `apps/web`
- [ ] File attachment upload + download endpoints + UI

### Phase 5 — Hardening (Week 5)
- [ ] Unit tests for all services
- [ ] E2E tests
- [ ] DLQ monitor cron + alerting
- [ ] TypeScript strict check (`tsc --noEmit`)
- [ ] ESLint + Prettier pass
- [ ] Swagger/OpenAPI annotations on all DTO classes
- [ ] README update

---

## 16. Environment Variables (additions)

```env
# apps/api/.env additions
HELPDESK_INBOUND_EMAIL_SECRET=   # HMAC secret for Brevo webhook
HELPDESK_SUPPORT_EMAIL=support@kloqra.com
HELPDESK_SUPPORT_EMAIL_NAME=Kloqra Support
HELPDESK_ATTACHMENT_DIR=.helpdesk-attachments
HELPDESK_MAX_ATTACHMENT_SIZE_BYTES=10485760
```

---

## 17. Open Questions / Decisions Needed

1. **Email provider**: Is Brevo the confirmed email-in provider, or should we design for a generic webhook adapter (Mailgun, Postmark, SendGrid)?
2. **Public form location**: Should the submission form live in `apps/web` (marketing site) or as a standalone page in `platform-admin`?
3. **Bull Board**: Should we expose `/platform/bull-board` UI in production or restrict to local dev only?
4. **File storage backend**: Local filesystem (`.helpdesk-attachments/`) is fine for Phase 1; do we need S3/R2 integration from day 1?
5. **Agent roles**: Should all `PlatformUser`s with `SUPERADMIN` role automatically be queue agents, or is the `HelpDeskAgent` join table the single source of truth?
6. **CAPTCHA**: reCAPTCHA v3 on the public form — required from Phase 1, or Phase 4 hardening?
7. **Tenant self-service**: Should tenants be able to view their own ticket history inside `apps/client`? (Out of scope for this plan but affects schema design.)

---

## 18. Dependency Additions

| Package | App | Purpose |
|---------|-----|---------|
| `sanitize-html` | `apps/api` | Strip XSS from HTML ticket bodies |
| `@types/sanitize-html` | `apps/api` | Types |
| `multer` / `@types/multer` | `apps/api` | File upload handling (already a NestJS peer dep) |
| `recharts` | `apps/platform-admin` | SLA & volume charts in reports |
| `react-window` | `apps/platform-admin` | Virtualised ticket list for performance |
| `@bull-board/express` | `apps/api` | Optional BullMQ UI (dev/staging) |
| `@bull-board/nestjs` | `apps/api` | NestJS adapter for Bull Board |

---

*Plan authored: 2026-06-25. Revision: 1.0*
