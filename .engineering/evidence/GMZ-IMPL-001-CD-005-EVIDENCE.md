# GMZ-IMPL-001-CD-005 — Stale Refresh Race Correction Evidence

Status: `CORRECTION_APPLIED / EXACT_HEAD_L5_PENDING`

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

Required:
- complete GEF preflight;
- 14/14 fingerprints;
- full exact-head L5;
- E2E including stale-refresh race;
- update GMZ-IMPL-001 evidence and PR head;
- objective re-audit.

STOP CONDITION:
`GMZ_IMPL_001_CD_005_EXACT_HEAD_L5_REQUIRED`
