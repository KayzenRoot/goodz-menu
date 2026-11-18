# Goodz Menu — Production Go-Live, Backup/Restore & Rollback Runbook

Status: `ACTIVE_MVP_OPERATIONAL_RUNBOOK`  
Governed Scope: `GMZ-CSD-002` + `D-0023` + `GMZ-SP-009` + `GMZ-IMPL-012`

---

## 1. Environment Topology & Separation

Goodz Menu enforces strict four-tier environment separation in `src/lib/env/runtime-env.ts`:

| Environment | `GOODZ_ENVIRONMENT` | Supabase Endpoint Requirement | Purpose |
| --- | --- | --- | --- |
| Local Dev | `local` | Loopback HTTP (`127.0.0.1` / `localhost`) | Developer workstation & local Supabase CLI |
| Automated Test | `test` | Loopback HTTP (`127.0.0.1` / `localhost`) | CI ephemeral Supabase + Vitest + Playwright |
| Cloud Staging | `staging` | Mandatory `https://` isolated Supabase project | Pre-production rehearsals, migration smoke, visual QA |
| Cloud Production | `production` | Mandatory `https://` isolated Supabase project | Live tenant & pilot establishment operations |

Invariants:
- `staging` and `production` **never** share database credentials, JWT secrets, or storage buckets.
- `GOODZ_E2E_TEST_SEAM_SECRET` is **prohibited** in `staging` and `production` (`admin-guard-test-clock.ts` also hard-blocks non-local environments).
- `SUPABASE_SERVICE_ROLE_KEY` is server-only and read exclusively inside `src/lib/supabase/audit-writer.server.ts` for narrow step-up audit appends (`verify:prod-readiness` enforces zero leakage into client modules or `.next/static` chunks).

---

## 2. Secret Vault Matrix & Key Rotation Procedure

### 2.1 Required Environment Variables (`staging` / `production`)

| Variable | Sensitivity | Exposure | Description |
| --- | --- | --- | --- |
| `NODE_ENV` | Public | Server | Must be `production` |
| `GOODZ_ENVIRONMENT` | Public | Server | `staging` or `production` |
| `GOODZ_RUNTIME` | Public | Server | `docker` (container) or `native` |
| `BUILD_REVISION` | Public | Server | Exact immutable Git commit SHA (`40` hex chars or release tag) |
| `SUPABASE_API_URL` | Public | Server/Auth | `https://<project-ref>.supabase.co` |
| `SUPABASE_ANON_KEY` | Public (`anon`) | Browser/SSR | Publishable/anon key (`sb_publishable_...` or `role=anon` JWT) |
| `SUPABASE_SERVICE_ROLE_KEY` | **CRITICAL SECRET** | Server-only (`audit-writer.server.ts`) | Secret/service-role key — never exposed to client or `NEXT_PUBLIC_*` |

### 2.2 Secret Rotation Runbook

1. **Routine Rotation Cadence:** Every `90` days or immediately upon suspected exposure.
2. **Rotating `SUPABASE_SERVICE_ROLE_KEY` (`sb_secret_...`):**
   - Generate a new secret key in the Supabase Dashboard / Management API.
   - Update `SUPABASE_SERVICE_ROLE_KEY` in the cloud platform secret manager (`staging` first, verify `/api/ready` and `/app/admin-guard`, then `production`).
   - Trigger a zero-downtime rolling container restart.
   - Revoke the previous secret key once all old container instances are drained and structured logs confirm `admin_guard_decision` `audit_persisted: true`.
3. **Rotating `SUPABASE_ANON_KEY` (`sb_publishable_...`):**
   - Issue a secondary publishable key in Supabase.
   - Update `SUPABASE_ANON_KEY` in the secret manager and roll out the new revision.
   - Verify `/login` and `/menu/[slug]` public checkout, then deactivate the retired publishable key.

---

## 3. Backup, PITR & Disaster Recovery (`D-0023 §7`)

### 3.1 Recovery Objectives
- **RPO (Recovery Point Objective):** `<= 24 hours` (Supabase automated daily physical backups; PITR WAL archiving recommended for zero-data-loss window).
- **RTO (Recovery Time Objective):** `<= 2 hours`.

### 3.2 Automated CI Backup/Restore Verification
Every PR and `main` push executes `pnpm verify:backup-drill` (`scripts/verify-backup-restore-drill.mjs`), which:
1. Dumps `public` and `private` schemas via `supabase db dump`;
2. Dumps seeded governance catalogs (`--data-only`);
3. Executes a live schema/table restore roundtrip and asserts row-count parity within `< 120s`.

### 3.3 Production Restore Procedure
1. **Pause Storefront Intake (if partial incident):** Toggle `storefront.ordering_enabled = false` in `/app/settings` if the control plane is reachable.
2. **Database Recovery:**
   - In Supabase Dashboard -> **Database -> Backups**, select either the latest Automated Daily Backup or exact PITR timestamp prior to the incident.
   - Restore into the target environment (or into a fresh recovery project when preserving forensics).
3. **Post-Restore Verification:**
   - Verify `GET /api/health` (`200`) and `GET /api/ready` (`200`).
   - Run `supabase db lint` against the restored database.
   - Confirm `public.audit_events`, `public.orders`, and `public.order_handoff_payments` ledger triggers remain enabled (`tgenabled = 'O'`).
4. **Re-enable Traffic:** Point `SUPABASE_API_URL` / credentials if restored to a new project ref, roll application containers, and re-enable `storefront.ordering_enabled = true`.

---

## 4. Deployment & Rollback Runbook

### 4.1 Pre-Deploy Gate Checklist
1. GitHub Actions **`Goodz Production Gate`** (`ci-production-gate.yml`) === `SUCCESS`.
2. **SonarCloud Quality Gate** === `OK` (`0` CRITICAL/HIGH issues, `<= 3%` duplication).
3. **Socket Security** === `SUCCESS`.
4. Staging migration rehearsal (`supabase db push` on `staging`) completed cleanly.

### 4.2 Production Rollout Sequence
1. Apply forward-only SQL migrations to Production Supabase (`supabase db push --linked`).
2. Deploy immutable container image built from the exact `main` commit SHA (`BUILD_REVISION=<git-sha>`).
3. Verify `GET /api/health` and `GET /api/ready` report the new `buildRevision` and `ready: true`.

### 4.3 Rollback Procedure
- **Application Rollback (< 5 minutes):** Re-pin the container service / deployment target to the previous known-good immutable image digest (`BUILD_REVISION=<previous-sha>`). All MVP migrations are additive/forward-compatible with the prior release.
- **Database Emergency Rollback:** Never rewrite migration history (`AGENTS.md`). Ship a forward compensating migration (or execute §3.3 PITR restore in case of catastrophic data corruption).

---

## 5. Pilot Establishment Onboarding Checklist (`GMZ-CSD-002` + `D-0023`)

1. **Tenant & Owner Provisioning:**
   - Create `organizations`, `establishments`, and `branches` rows (`America/Sao_Paulo`, `BRL`, `pt-BR`).
   - Assign the establishment owner to `owner` role at `organization` scope (`tenant_roles_seed_*` triggers automatically grant catalog, settings, orders, delivery, storefront, and privacy permissions) and assign `mvp_pilot` plan subscription.
2. **Owner Security Enrollment (`/app/security`):**
   - Owner signs in at `/login` and enrolls + verifies a **TOTP MFA factor** (`AAL2`) so Admin Guard step-up is active.
3. **Operational Policy (`/app/settings`):**
   - Confirm `storefront.ordering_enabled = true`, `fulfillment.pickup_enabled = true`, `fulfillment.delivery_enabled = true`, `payments.accepted_handoff_methods`, `payments.cash_change_enabled`, and `storefront.support_whatsapp`.
4. **Catalog & Media (`/app/catalog` & `/app/storefront`):**
   - Create categories, products, `GOODZ_ONLINE` channel offers (`BRL`), and HTTPS product media with WCAG `alt_text`.
5. **Delivery Zones (`/app/delivery`):**
   - Configure neighborhood allowlists, exact `BRL` delivery fee, minimum order amount, and ETA minutes (step-up verified).
6. **Publish Storefront (`/app/storefront`):**
   - Choose `public_slug`, layout family (`editorial_bistro` or `express_grid`), accent preset, card style, and mark **Publicar vitrine** (`is_published = true` via Admin Guard).
7. **Live Smoke Verification:**
   - Open `/menu/<public_slug>`, place a test order, verify opaque capability tracking at `/menu/<public_slug>/orders/<token>`, advance & record handoff payment in `/app/orders`, and verify LGPD export readiness in `/app/privacy`.
