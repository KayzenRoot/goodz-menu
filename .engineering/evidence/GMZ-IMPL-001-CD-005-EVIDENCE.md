# GMZ-IMPL-001-CD-005 — Stale Refresh Race Correction Evidence

Status: `CORRECTION_VALIDATED / L5_PASS_AT_ae869620`

## Finding
A status refresh starts every 15 seconds. If an older refresh is unusually slow, a newer refresh can complete first. Without ordering protection, the older completion can later overwrite the newer state.

Severity: `LOW`

## Correction
- added a monotonically increasing refresh sequence;
- each refresh captures its sequence at start;
- state is committed only when the completing refresh still owns the latest sequence;
- cleanup invalidates in-flight refreshes;
- no scope expansion.

## Regression
Added an E2E case that:
1. delays the first health/readiness responses beyond the 15s interval;
2. allows the second refresh to complete successfully first;
3. lets the older failed response finish later;
4. verifies the UI keeps the newer successful state.

## Boundaries
- business-domain code: `NONE`
- Source Pack change: `NONE`
- .gef change: `NONE`
- execution base change: `NONE`
- dependencies changed: `NONE`

## Gate
Previous L5/objective approval is stale because runtime/test files changed.

Completed on candidate `ae8696200876495c5acb1a662a8893e8d6b842d4`:
- complete GEF 1.1.1 preflight: `PASS`;
- locked fingerprints: `14/14 MATCH`;
- execution base unchanged: `0932c46134ad5e94cf1b5d29c8e7e8ac65d2e585`;
- `.gef/**`: unchanged;
- frozen install, lint, typecheck, unit tests, production build, full E2E, accessibility/Axe, dependency audit and peer check: `PASS`;
- stale-refresh race regression: `PASS` on desktop and mobile;
- secret-pattern scan: `PASS`, 124 textual tracked files, zero findings;
- Docker Compose config/build/up/health and local Supabase status/readiness/Auth: `PASS`;
- runtime logs and `.gef` integrity: `PASS`;
- no dependency or scope changes.

After committing the checkpoint/evidence closeout, the complete exact-head L5 is repeated on the final candidate. Its exact SHA and results are recorded in PR #38. Objective re-audit remains a separate next action.

STOP CONDITION:
`GMZ_IMPL_001_READY_FOR_OBJECTIVE_AUDIT`
