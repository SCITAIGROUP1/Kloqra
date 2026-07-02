# Legal sign-off record (F23)

| Field              | Value                                                 |
| ------------------ | ----------------------------------------------------- |
| Status             | **Pending counsel review**                            |
| Target launch gate | Paid SaaS + `SELF_SERVE_SIGNUP_ENABLED` in production |

## Documents

| Document         | Path                                         | Version   | SHA / date |
| ---------------- | -------------------------------------------- | --------- | ---------- |
| Terms of Service | [terms-of-service.md](./terms-of-service.md) | 1.0-draft | —          |
| Privacy Policy   | [privacy-policy.md](./privacy-policy.md)     | 1.0-draft | —          |
| DPA template     | [dpa-template.md](./dpa-template.md)         | 1.0-draft | —          |
| Subprocessors    | [subprocessors.md](./subprocessors.md)       | 1.0-draft | —          |
| Refund policy    | [refund-policy.md](./refund-policy.md)       | 1.0-draft | —          |

## Engineering alignment

| Item                   | Spec                                                                                         |
| ---------------------- | -------------------------------------------------------------------------------------------- |
| Tenant data export API | [compliance.md](../specs/compliance.md)                                                      |
| Hard delete retention  | `TENANT_DELETE_MIN_DAYS_AFTER_CHURN` (default 30)                                            |
| Public URLs            | `NEXT_PUBLIC_LEGAL_TOS_URL`, `NEXT_PUBLIC_LEGAL_PRIVACY_URL`, `NEXT_PUBLIC_LEGAL_REFUND_URL` |

## Sign-off

| Role              | Name | Date | Approved |
| ----------------- | ---- | ---- | -------- |
| Product           |      |      | [ ]      |
| Legal counsel     |      |      | [ ]      |
| LSA / engineering |      |      | [ ]      |

## Notion (optional)

External review link: _TBD_
