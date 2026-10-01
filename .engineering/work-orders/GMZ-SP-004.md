# GMZ-SP-004 — Canonical Data Model Baseline

Status: `ADMITTED / PLANNING_ONLY`  
Risk: `ELEVATED_PLANNING`  
Issue: `#10`

## Source Lock
Base: `main@d63bfb0e13822710b8954f3ccc5c323954bfed3a`  
GEF: `1.1.1`

Mandatory sources:
- `docs/source-pack/PROJECT-OVERVIEW.md`
- `docs/source-pack/REQUIREMENTS.md`
- `docs/source-pack/SCOPE.md`
- `docs/source-pack/ARCHITECTURE.md`
- `.engineering/REQUIREMENT-TRACEABILITY.md`
- `.engineering/DECISIONS-LEDGER.md`
- ADR-0001..ADR-0004
- current Checkpoint

## Objective
Define the canonical logical data model, domain ownership, tenant scope and ledger/history invariants required to satisfy the approved requirements without creating executable database schema.

## WRITE_ALLOWED
- `docs/source-pack/DATA-MODEL.md`
- `.engineering/DATA-OWNERSHIP-MATRIX.md`
- this Work Order
- its Context Lock
- Checkpoint
- evidence bundle
- Issue/PR metadata

## WRITE_FORBIDDEN
- SQL/migrations
- runtime/application code
- dependency manifests
- CI/build workflows
- deployment implementation
- secrets
- `.gef/**`

## Required proof
- every material data family has one canonical owner;
- tenant scope is explicit;
- append/audit semantics exist for money and inventory;
- external idempotency/mappings are represented;
- historical economic snapshots are preserved;
- AI recommendation/action/proof records are separated;
- platform administration is separate from tenant administration;
- no known HIGH/CRITICAL planning defect.

STOP CONDITION: `GMZ_SP_004_DATA_MODEL_READY_FOR_REVIEW`
