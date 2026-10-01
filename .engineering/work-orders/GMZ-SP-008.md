# GMZ-SP-008 — Test & Benchmark Plan Baseline

Status: `PROMOTED / MERGED`  
Risk: `HIGH_ASSURANCE_PLANNING`  
Issue: `#27`

## Source Lock
Base: `main@7b1dec75847f2d882f9b94be2fad67e78811e71d`

Mandatory current sources:
- Requirements v0.1
- Scope v0.1
- Architecture v0.1
- Data Model v0.1 corrected
- API/Integration Contracts v0.1
- AI Architecture v0.1
- UI/UX Design System v0.1
- Security v0.1
- Security Control Matrix

## Objective
Freeze the validation methodology and measurable quality/performance gates required before implementation can claim completion.

## WRITE_ALLOWED
- `docs/source-pack/TEST-BENCHMARK-PLAN.md`
- `.engineering/TEST-COVERAGE-MATRIX.md`
- `.engineering/PERFORMANCE-BUDGETS.md`
- this Work Order
- Context Lock
- Checkpoint
- Evidence Bundle

## WRITE_FORBIDDEN
- runtime/application code
- test code
- CI workflow implementation
- package/dependency manifests
- deployment artifacts
- provider credentials/configuration
- weakening Security/Requirements/Architecture

## Acceptance
- test levels and ownership explicit;
- negative/security cases explicit;
- finance/inventory invariants explicit;
- tenant isolation test obligations explicit;
- AI truth/policy/proof/tool boundaries testable;
- UI visual/accessibility gates explicit;
- performance budgets explicit;
- Docker/local smoke defined;
- reliability/recovery/idempotency tests defined;
- exact-head evidence rules explicit;
- no known HIGH/CRITICAL planning defect.

STOP CONDITION: `GMZ_SP_008_TEST_BENCHMARK_PLAN_READY_FOR_REVIEW`


## Promotion
- PR: `#28`
- audited head: `3cd9b85fe0893dcdf336a6a6d64f7c60e7fdef46`
- merge: `f59a71f5d86144c4d3048416c4dcf740beed740e`
- CRITICAL/HIGH: `0 / 0`
- next: `GMZ-SP-009 — Deployment + Local Docker Contract`
