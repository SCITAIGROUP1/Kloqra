# Pilot migration communication template (SaaS-F21)

Use when rolling out the tenant (Organization) model to existing pilot customers after backfill.

## When to send

- After staging dry-run passes with zero D08 conflicts
- **Before** or **immediately after** production backfill (coordinate with maintenance window)
- Before enabling paid self-serve signup (F20) if pilots are still on legacy access

## Subject line options

- `Kloqra update: your workspaces are now grouped under an Organization`
- `Scheduled maintenance — Kloqra organization accounts`

## Email body (customize bracketed fields)

---

Hi [First name],

We're updating Kloqra to support **Organizations** — a single account that can own multiple workspaces. This prepares your team for consolidated billing and account management.

**What changes for you**

- Your existing workspace(s) **[workspace names]** are now under the organization **[Organization name]**.
- Your login email and password are unchanged.
- Workspace admins and members keep the same access within each workspace.

**Action required**

- **[No action]** — if you only use one workspace and your login still works.
- **[Organization owners]** — on next admin login you may see **Finish setup** to confirm your organization name and URL slug. This takes under a minute.

**Maintenance window**

- Date/time: **[UTC window]**
- Expected downtime: **[none / brief read-only if applicable]**

**Support**

Reply to this email or contact **[support@kloqra.com]** if you have trouble signing in or see missing workspaces.

Thanks,  
**[Your name]**  
Kloqra Team

---

## Internal checklist before send

- [ ] Dry-run completed on production mapping file
- [ ] Cross-tenant conflict audit clean (D08)
- [ ] Post-migration validation SQL run (see [tenant-migration.md](./tenant-migration.md))
- [ ] Support team briefed on Organization terminology and `pending_setup` flow
- [ ] Waived in writing if no pilot email needed (note date + approver in ops log)
