# GMZ-IMPL-012 — Evidence Bundle

Status: `READY_FOR_OBJECTIVE_AUDIT`  
Work Order: `GMZ-IMPL-012`  
Issue: `#98`  
Branch: `execution/gmz-impl-012-lgpd-cicd-golive`  
Execution Base: `dca442fbd2eb7a63d190c901ba827c75619a5d84`

## 1. Delivered Scope

1. **LGPD & Privacy Lifecycle (`GMZ-M27` / `D-0023 §6` / `GMZ-REQ-MKT-002`):**
   - Migration `supabase/migrations/20261118023000_lgpd_privacy_and_rate_limits.sql`:
     - `privacy.read` and `privacy.manage` RBAC permissions (restricted to `owner` and `admin` at `organization` scope).
     - Append-only `public.customer_consents` ledger with immutability trigger (`customer_consents_immutable`) and automatic checkout opt-in trigger (`customers_record_marketing_consent`).
     - Single-use Admin Guard step-up extension (`append_privacy_step_up_event`, `private.privacy_step_up_consumptions`, `private.consume_privacy_step_up_proof`).
     - `privacy_list_customers` (`365`-day retention window evaluation), `privacy_export_customer_data` (Admin-Guard-protected JSON subject package), and `privacy_anonymize_customer` (blocks active in-flight orders, scrubs PII across `customers`, `customer_addresses`, `orders`, and revokes `private.order_public_tracking_tokens` while preserving exact `numeric(12,2)` `orders.total_amount` and `order_handoff_payments`).
   - `/app/privacy` console (`src/app/app/privacy/page.tsx`, `src/app/app/privacy/actions.ts`, `src/components/goodz/privacy-panel.tsx`) + `src/lib/supabase/privacy-admin-guard*.ts`.

2. **Structured Log Redaction & Public Rate Limiting (`GMZ-M23` / `GMZ-REQ-SEC`):**
   - `src/lib/observability/log-redactor.ts` (+ `.test.ts`): deterministic PII, JWT, `sb_secret_*`, Bearer, and capability-token redaction wired into `scoped-admin-guard.server.ts`, `menu/[slug]/actions.ts`, and `app/privacy/actions.ts`.
   - `src/lib/security/public-rate-limiter.ts` (+ `.test.ts`): bounded sliding-window rate limiter wired into `placePublicStorefrontOrderAction` (`rate_limited` feedback).

3. **Full CI/CD Gate, Secret Boundary Verifier, Backup/Restore Drill & Production Runbook (`GMZ-M25` / `D-0023 §7`):**
   - `.github/workflows/ci-production-gate.yml`: full automated PR & `main` pipeline (`lint`, `typecheck`, `vitest`, `build`, `verify:prod-readiness`, `supabase start`, `db lint`, `pgTAP`, Data API suites, `verify:backup-drill`, and Playwright Chromium E2E).
   - `scripts/verify-production-readiness.mjs`: verifies `SUPABASE_SERVICE_ROLE_KEY` stays confined to `audit-writer.server.ts`, scans client modules and `.next/static` chunks (`39` bundles scanned, `0` leaks), and verifies `Dockerfile` non-root `USER nextjs` and cloud HTTPS enforcement.
   - `scripts/verify-backup-restore-drill.mjs`: executes real schema+data dump & live table recovery parity drill (`8,565ms << 2h RTO`).
   - `docs/PRODUCTION-GO-LIVE-RUNBOOK.md`: Staging/Production topology, secret vault & key rotation runbook, PITR/backup restore procedure, immutable SHA rollback, and Pilot Establishment Onboarding checklist.

## 2. Exact-Head Verification Matrix

- `corepack pnpm lint`: `PASS` (`0` errors / warnings)
- `corepack pnpm typecheck`: `PASS` (`0` errors)
- `corepack pnpm test`: `PASS` (`26` test files, `101 / 101` unit tests)
- `corepack pnpm build`: `PASS` (`16` routes compiled)
- `node scripts/verify-production-readiness.mjs`: `PASS` (`39` client bundles scanned, `0` secret leaks)
- `supabase db lint --local`: `PASS` (`0` schema errors across `extensions`, `private`, `public`)
- `supabase test db --local`: `PASS` (`9` pgTAP files, `308 / 308` tests)
- `node tests/supabase/privacy-data-api.integration.mjs`: `PASS` (`7 / 7` checks)
- `node scripts/verify-backup-restore-drill.mjs`: `PASS` (`20 / 20` permissions restored, `8,565ms`)
- `node scripts/run-local-e2e.mjs tests/e2e/privacy-and-golive.spec.ts --workers=1`: `PASS` (`2 / 2` — `desktop-chromium` `1440px` + `mobile-chromium` `390px`, Light & Dark themes, `0` Axe `WCAG 2.2 AA` violations, `4` visual screenshots reviewed)
