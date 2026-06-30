---
name: Bulk member provisioning
overview: "Enable bulk workspace member invitations via Excel upload or JSON array, processed asynchronously using a robust BullMQ background mailing queue. Graciously skips existing members."
todos:
  - id: contracts
    content: "BulkInviteMemberDto, BulkInviteResponseDto, API routes for bulk, template, and upload"
    status: pending
  - id: dependencies
    content: "Install @nestjs/bullmq and bullmq, configure BullModule in AppModule"
    status: pending
  - id: queue-infrastructure
    content: "Create QueuesModule, register 'mail-queue' and 'bulk-invite-queue'"
    status: pending
  - id: mail-worker
    content: "Implement MailWorker (@Processor) to send credentials with robust SMTP retry/backoff"
    status: pending
  - id: invite-worker
    content: "Implement BulkInviteWorker (@Processor) to handle user creation, membership, and graceful skips"
    status: pending
  - id: excel-parsing
    content: "generateBulkInviteTemplate and parseBulkInviteExcel in WorkspaceService using exceljs"
    status: pending
  - id: endpoints
    content: "GET /template, POST /upload (multer), POST /bulk in WorkspaceMembersController"
    status: pending
  - id: frontend-integration
    content: "Admin UI to download template, upload filled file, and show 'queued' toast"
    status: pending
isProject: false
---

# Bulk member provisioning and Mailing Queue

## End-to-end flow

```mermaid
sequenceDiagram
  participant Admin
  participant UI as Admin App
  participant API
  participant BullMQ
  participant InviteWorker as BulkInvite Worker
  participant MailWorker as Mail Worker
  participant Mailer as Brevo SMTP

  Note over Admin,API: Step 1 — Upload
  Admin->>UI: Clicks "Download Template"
  UI->>API: GET /workspaces/:id/members/bulk/template
  API-->>UI: Download members_template.xlsx
  Admin->>UI: Uploads filled .xlsx
  UI->>API: POST /workspaces/:id/members/bulk/upload

  Note over API,BullMQ: Step 2 — Enqueue Batch
  API->>API: parseBulkInviteExcel (validate rows)
  API->>BullMQ: enqueue 'bulk-invite-queue'
  API-->>UI: 202 Accepted (Batch Job ID)
  UI-->>Admin: Show "Invitations queued" toast

  Note over BullMQ,InviteWorker: Step 3 — Process Invites Async
  BullMQ->>InviteWorker: Process batch job
  loop For each user
      InviteWorker->>InviteWorker: Check if user exists in Workspace
      alt Exists
          InviteWorker->>InviteWorker: Gracefully Skip
      else Does not exist
          InviteWorker->>InviteWorker: Create User + Temp Password
          InviteWorker->>InviteWorker: Create WorkspaceMember
          InviteWorker->>BullMQ: enqueue 'mail-queue' (send credentials)
      end
  end

  Note over BullMQ,Mailer: Step 4 — Robust Mailing
  BullMQ->>MailWorker: Process mail job
  MailWorker->>Mailer: send credentials / invitation email
  alt SMTP Rate Limit / Failure
      Mailer-->>MailWorker: Transient Error
      MailWorker->>BullMQ: Retry with exponential backoff
  end
```

---

## Phase 1 — Contracts & DTOs

[`packages/contracts/src/workspace.dto.ts`](packages/contracts/src/workspace.dto.ts)
- `BulkInviteMemberDto`: Array of `{ email, name, role }`.
- `BulkInviteResponseDto`: `{ jobId: string, status: string, enqueuedCount: number }`.

[`packages/contracts/src/routes.ts`](packages/contracts/src/routes.ts)
- `ROUTES.WORKSPACES.BULK_MEMBERS_TEMPLATE`
- `ROUTES.WORKSPACES.BULK_MEMBERS_UPLOAD`
- `ROUTES.WORKSPACES.BULK_MEMBERS`

---

## Phase 2 — Dependencies & Setup

- Install `@nestjs/bullmq` and `bullmq` in `apps/api`.
- Configure `BullModule.forRootAsync` in `AppModule` pointing to `process.env.REDIS_URL`.
- Note: `exceljs` and file upload interceptors are already standard.

---

## Phase 3 — Background Queues & Workers

Create a new module `src/modules/queues/queues.module.ts`.

### 1. The Mailing Queue (`MailWorker`)
- Decorate with `@Processor('mail-queue')`.
- Injects `MemberProvisioningMailer`.
- Sole responsibility is taking an email payload and calling the SMTP service.
- BullMQ naturally handles exponential backoffs for transient SMTP issues.

### 2. The Bulk Invite Queue (`BulkInviteWorker`)
- Decorate with `@Processor('bulk-invite-queue')`.
- Injects `PrismaService` and `AuthService`.
- Iterates over the payload array.
- Checks `WorkspaceMember` presence — **Gracefully skips existing members**.
- Creates the User (if missing) and Membership.
- Enqueues individual jobs to the `mail-queue`.

---

## Phase 4 — Excel Endpoints & Workspace Service

In `workspace.service.ts`:
- `generateBulkInviteTemplate(res: Response)`: Uses `exceljs` to stream a `.xlsx` with columns `Email`, `Name`, `Role`.
- `parseBulkInviteExcel(buffer)`: Uses `exceljs` to parse the uploaded sheet into `BulkInviteMemberDto`.
- `bulkInvite(workspaceId, payload)`: Validates and pushes the payload to BullMQ. Returns `202 Accepted`.

In `workspace-members.controller.ts`:
- `GET /template`: Returns the Excel stream.
- `POST /upload`: Uses `@UseInterceptors(FileInterceptor('file'))`. Parses via service, enqueues.
- `POST /`: Accepts JSON payload directly (useful for programmatic API access).

---

## Security & Constraints

- Ensure the file upload size is reasonably capped (e.g., 2MB).
- Enforce a maximum batch limit (e.g., 500 members) during parsing to prevent memory exhaustion and queue flooding.
- Excel parser must strictly sanitize input to prevent injection attacks.

---

## Out of scope (v1)

- Complex frontend UI with real-time WebSockets/SSE to track progress bar of the batch. (v1 will rely on simple success toasts).
- Detailed CSV/Excel error reports for partially failed rows (invalid emails). Invalid rows will be skipped and logged in the backend.

---

## Test checklist (pre-PR)

- `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm build`
- API tests: Bulk invite worker successfully skips existing members.
- Manual test: Download template, fill with 5 emails, upload, check DB for memberships, and verify mail delivery.
