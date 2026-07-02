# Custom plans — research spike

Status: **deferred** — no implementation until product sign-off.

## Open questions

1. **Catalog shape** — Should each custom customer get a dedicated `plans` row, or should we use `tenant_subscriptions.limits_override` on an existing Enterprise plan?
2. **Pricing display** — How do billing cards show custom pricing when `monthlyPriceCents` is null? Quote-only? Per-tenant override field?
3. **Billing path** — Is custom always `billingMode: contact`, or a third mode (e.g. `custom`)?
4. **Payments** — Fully offline (receipt flow) vs Stripe invoice vs hybrid?
5. **Platform UX** — Where do ops create/edit custom plans — tenant detail only, or Plans catalog with `isPublic: false` per tenant?

## Recommendation (for discussion)

- v1 custom = Enterprise plan + `limits_override` + contact-sales receipt flow (no new catalog entity).
- v2 custom = hidden `plans` row per tenant (`visibleOnPricing: false`, linked via subscription only).

## Related

- [subscriptions.md](./subscriptions.md) — two-path billing (self-serve vs contact sales)
- [plans.md](./plans.md) — catalog SSOT
