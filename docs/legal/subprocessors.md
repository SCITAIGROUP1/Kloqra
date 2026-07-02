# Subprocessors

**Last updated:** June 2026

Kloqra uses the following subprocessors to deliver the Service. This list is incorporated by reference in our [Privacy Policy](./privacy-policy.md) and [DPA](./dpa-template.md).

| Subprocessor           | Purpose                                  | Data categories                                                            | Location    | Vendor DPA                                           |
| ---------------------- | ---------------------------------------- | -------------------------------------------------------------------------- | ----------- | ---------------------------------------------------- |
| **Stripe, Inc.**       | Payment processing, subscription billing | Billing contact, payment method metadata, Stripe customer/subscription IDs | US / global | [stripe.com/legal/dpa](https://stripe.com/legal/dpa) |
| **Railway Corp.**      | API hosting, PostgreSQL, Redis           | All application data at rest and in transit through API                    | US          | Railway customer agreement                           |
| **Vercel Inc.**        | Admin and client web application hosting | Session cookies, static assets, request logs                               | US / global | [vercel.com/legal/dpa](https://vercel.com/legal/dpa) |
| **Brevo (Sendinblue)** | Transactional email                      | Email address, name, message content                                       | EU / global | Brevo DPA                                            |
| **OpenAI**             | Optional AI assistant (member help chat) | Chat messages only; no time-entry payloads per product spec                | US          | OpenAI DPA                                           |

## Updates

Material changes to this list will be announced via email to organization owners at least 30 days before new subprocessors process Customer data, where contractually required.

## Infrastructure note

Customer data is logically isolated per Organization (tenant). Workspace-scoped credentials and JWT tenant claims enforce boundaries. See [SECURITY.md](../development/SECURITY.md).
