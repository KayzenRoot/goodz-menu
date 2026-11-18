# GMZ-IMPL-012 — LGPD/Privacy Governance, Full CI/CD, Rate Limiting, Log Redaction & MVP Go-Live Readiness

Status: `ADMITTED / BOUND_FOR_EXECUTION`
Issue: `#98`
Assurance: `HIGH_ASSURANCE`
Execution branch: `execution/gmz-impl-012-lgpd-cicd-golive`
Execution base: `dca442fbd2eb7a63d190c901ba827c75619a5d84`

## OBJECTIVE

Deliver the Phase 7 final Milestone 1 MVP slice (`GMZ-M27` + `GMZ-M25` + `GMZ-M23` + `GMZ-M26`) under `GMZ-CSD-002` and `D-0023`:
1. **LGPD & Privacy Lifecycle (`GMZ-M27` / `D-0023 §6`):** Immutable `customer_consents` ledger, `365`-day retention eligibility view, and Admin-Guard-protected customer data export (`privacy_export_customer_data`) & PII anonymization (`privacy_anonymize_customer`) preserving immutable order/handoff financial totals, surfaced in `/app/privacy`.
2. **Observability, Log Redaction & Public Rate Limiting (`GMZ-M23` / `GMZ-REQ-SEC`):** Deterministic structured log redactor (`log-redactor.ts`), sliding-window public checkout rate limiter (`public-rate-limiter.ts`), and client-bundle secret/readiness verifier (`verify-production-readiness.mjs`).
3. **Full Application CI/CD, Backup/Restore Proof & Production Runbook (`GMZ-M25` / `D-0023 §7`):** `.github/workflows/ci-production-gate.yml`, real automated PostgreSQL backup/restore drill (`verify-backup-restore-drill.mjs`), and Staging/Production Go-Live, Secret Rotation & Rollback Runbook (`docs/PRODUCTION-GO-LIVE-RUNBOOK.md`).
4. **End-to-End Pilot Onboarding, Go-Live Smoke & WCAG 2.2 AA Validation (`GMZ-M26`):** pgTAP, Data API, Vitest, and full pilot smoke E2E (`privacy-and-golive.spec.ts`).

## REQUIREMENTS

- `GMZ-REQ-MKT-002`, `GMZ-REQ-SEC-001..006`, `GMZ-REQ-OBS-001/002`, `GMZ-REQ-OPS-001..003`, `GMZ-REQ-QA-001..005`

## OUT OF SCOPE

- Post-MVP Milestone 2 modules (`M05` POS/cash, `M07` recipes, `M08` stock, `M13` full DRE/reconciliation, external marketplaces/gateways).

## PREDECLARED CREDIT

Maximum after objective acceptance + merge + promotion:
- `GMZ-M27`: `11` (`11 / 18 — PARTIAL`)
- `GMZ-M25`: `8` (`12 / 18 — PARTIAL`)
- `GMZ-M23`: `2` (`13 / 19 — PARTIAL`)
- `GMZ-M26`: `1` (`18 / 18 — COMPLETE`)
- Increment max: `22 / 515` (`121 -> 143 / 515 = 27.77%`)

## STOP CONDITION

`GMZ_IMPL_012_READY_FOR_OBJECTIVE_AUDIT`
