# Subscriptions — Stripe integration & lifecycle

SaaS-F11–F13: paid plans via Stripe Checkout, webhooks, subscription write-guards, and Account billing UX.

## API routes

| Route                                   | Method   | Role  | Purpose                                                                         |
| --------------------------------------- | -------- | ----- | ------------------------------------------------------------------------------- |
| `ROUTES.TENANTS.SUBSCRIPTION`           | GET      | OWNER | Current plan, limits, `billingAlert`, `billingMode`                             |
| `ROUTES.TENANTS.SUBSCRIPTION`           | PATCH    | OWNER | Simulated plan change (`{ planSlug }`) — only when `billingMode` is `simulated` |
| `ROUTES.TENANTS.CHECKOUT`               | POST     | OWNER | Stripe Checkout Session (`{ planSlug }`)                                        |
| `ROUTES.TENANTS.PORTAL`                 | POST     | OWNER | Stripe Customer Portal session                                                  |
| `ROUTES.TENANTS.SALES_INQUIRY`          | GET/POST | OWNER | Contact-sales inquiry (Enterprise)                                              |
| `ROUTES.TENANTS.SALES_INQUIRY_RECEIPTS` | POST     | OWNER | Upload payment receipt (when `awaiting_receipt`)                                |
| `ROUTES.WEBHOOKS.STRIPE`                | POST     | —     | Stripe webhook ingestion (raw body)                                             |

## Two-path billing

| Path              | Plans (`billingMode`)   | Tenant flow                                                    | Platform role                                  |
| ----------------- | ----------------------- | -------------------------------------------------------------- | ---------------------------------------------- |
| **Self-serve**    | `stripe` (Starter, Pro) | Simulated PATCH (dev) or Stripe Checkout (prod)                | None                                           |
| **Contact sales** | `contact` (Enterprise)  | Submit inquiry → receive payment instructions → upload receipt | Send instructions, review receipt, assign plan |

### Contact sales lifecycle

Statuses: `open` → `awaiting_receipt` → `receipt_submitted` → `fulfilled` (or `closed`).

1. Owner `POST TENANTS.SALES_INQUIRY` with `{ planSlug: "pilot", message?, billingInterval? }`.
2. Platform superadmins receive `SALES_INQUIRY` notification (in-app + email).
3. Platform `POST …/send-instructions` emails owner and sets `awaiting_receipt`.
4. Owner uploads receipt via `POST TENANTS.SALES_INQUIRY_RECEIPTS` (multipart `file`, PDF/PNG/JPG ≤ 5 MB).
5. Platform receives `SALES_RECEIPT_UPLOADED` notification.
6. Platform assigns plan via `PATCH PLATFORM.TENANT` with `planId` — inquiry marked `fulfilled`, owner emailed.

Platform routes: `GET PLATFORM.TENANT_SALES_INQUIRIES`, `POST …/send-instructions`, `GET …/receipts/:id` (download).

See [custom-plans-research.md](./custom-plans-research.md) for deferred custom-plan work.

## Simulated billing (local / pre-Stripe)

When `billingMode` is `simulated`, tenant owners change plans via `PATCH TENANTS.SUBSCRIPTION` with `{ planSlug: "starter" | "pro" }`. The API updates `tenant_subscriptions.plan_id`, sets `status: active`, and clears `trialEndsAt` — payment is assumed complete.

| Condition                         | `billingMode`                     |
| --------------------------------- | --------------------------------- |
| Unset (default)                   | `simulated` — instant plan change |
| `BILLING_STRIPE_CHECKOUT=true`    | `stripe` — real Stripe Checkout   |
| `BILLING_SIMULATE_CHECKOUT=false` | `stripe` (legacy)                 |

Admin billing UI reads `billingMode` from `GET TENANTS.SUBSCRIPTION` and uses PATCH (simulated) or Checkout (stripe).

## Subscription statuses

`trial` · `active` · `past_due` · `suspended` · `canceled`

- **Write block (F12):** `past_due`, `suspended`, `canceled` → `402 PAYMENT_REQUIRED` on timer start, timelog create/batch.
- **Allowed:** timer stop, GET/export, workspace read.
- **Grace:** `invoice.payment_failed` → `past_due` immediately (0-day). Cron suspends after 7 days `past_due`.

## Webhooks (minimum)

| Event                           | Action                                          |
| ------------------------------- | ----------------------------------------------- |
| `checkout.session.completed`    | Link Stripe customer/subscription; set `active` |
| `customer.subscription.updated` | Sync status, period end, plan from price        |
| `customer.subscription.deleted` | Set `canceled`                                  |
| `invoice.payment_failed`        | Set `past_due`; email tenant owner              |

Idempotency: `stripe_webhook_events` table keyed by Stripe event id.

## Environment

| Variable                              | Required        | Notes                                                             |
| ------------------------------------- | --------------- | ----------------------------------------------------------------- |
| `STRIPE_SECRET_KEY`                   | Prod / checkout | Test mode `sk_test_…`                                             |
| `STRIPE_WEBHOOK_SECRET`               | Prod / webhooks | From Stripe CLI or Dashboard                                      |
| `STRIPE_PRICE_STARTER`                | Optional        | Overrides seed price id                                           |
| `STRIPE_PRICE_PRO`                    | Optional        | Overrides seed price id                                           |
| `PUBLIC_ADMIN_URL`                    | Recommended     | Checkout success/cancel URLs and billing email links              |
| `BILLING_MANUAL_PAYMENT_INSTRUCTIONS` | Optional        | Wire/bank copy emailed when platform sends payment instructions   |
| `BILLING_RECEIPTS_DIR`                | Optional        | Local storage for uploaded receipts (default `.billing-receipts`) |

### Local webhooks

```bash
stripe listen --forward-to localhost:3001/webhooks/stripe
```

Set `STRIPE_WEBHOOK_SECRET` to the CLI signing secret.

## Billing alerts

`GET TENANTS.SUBSCRIPTION` returns `billingAlert`:

- `past_due` — payment failed or suspended billing state
- `trial_ending` — trial ends within 7 days
- `null` — no alert

Admin shell shows a global banner for tenant owners when `billingAlert` is set.

## Subscription Lifecycle & Event Logging (SaaS-F14)

To support fleet-wide operations, subscriptions track historical tenures and period details:

### Extended Schema (`TenantSubscription`)

- `current_period_start` (`DateTime?`): The start timestamp of the current billing cycle.
- `billing_interval` (`String?`): `monthly` | `yearly`.
- `plan_assigned_at` (`DateTime`): Timestamp when the current plan was assigned. Updated on plan changes.
- `billing_source` (`String`): `stripe` | `simulated` | `manual`.

### Immutable Event Logs (`tenant_subscription_events`)

All changes to subscription state (plan changes, renewals, cancellations) are recorded immutably:

- `eventType`: `created`, `plan_changed`, `status_changed`, `period_renewed`, `trial_started`, `trial_ended`, `canceled`.
- `occurredAt`: The timestamp of the change.
- `fromPlanId`/`toPlanId` and `fromStatus`/`toStatus`: Captures the transition state.
- `actorType` / `actorId`: Identifies if the change was triggered by `system`, a `platform_user` (staff), or the `tenant_owner`.
- `metadata`: JSON payload for Stripe event IDs, wire transfer receipt references, etc.

### Centralized Recorder (`SubscriptionLifecycleService`)

Coordinates all subscription mutations to ensure consistency:

1. **Stripe Webhooks**: Sets `billing_source = 'stripe'` and records `period_renewed`/`plan_changed`/`status_changed` events.
2. **Simulated Changes**: Sets `billing_source = 'simulated'` and logs owner-initiated dev-mode updates.
3. **Manual Overrides**: Sets `billing_source = 'manual'` and records changes made by platform staff (audited with staff user IDs).

## Tests

- Unit: `subscription-sync.service.spec.ts`, `stripe-webhook.service.spec.ts`, `subscriptions.service.spec.ts`, `subscription-lifecycle.service.spec.ts`
- E2E: `stripe-webhook.e2e.ts`, `subscription-lifecycle.e2e.ts`, `subscription-plan-change.e2e.ts`, `sales-inquiry.e2e.ts`, `platform-subscriptions.e2e.ts`
- Playwright: `apps/admin/e2e/account-billing.spec.ts`, `apps/platform-admin/e2e/subscriptions.spec.ts`
