# GMZ-SP-004 — Canonical Data Model Baseline

Status: `APPROVED / READY_FOR_PROMOTION`  
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


## Audit disposition
- Required issue data families checked: `52 / 52` represented.
- Ownership matrix rows: `45` data families.
- Tenant scope: explicit.
- Inventory/financial append-ledger semantics: explicit.
- Historical economic snapshots: explicit.
- External mapping/idempotency records: explicit.
- AI insight/recommendation/evidence/action/outcome separation: explicit.
- Platform administration separated from tenant administration: explicit.
- SQL/migrations/runtime code: `NONE`.
- CRITICAL/HIGH: `0 / 0`.
- Disposition: `APPROVED_FOR_PLANNING_PROMOTION`.


## Correction Delta CD-001
Review identified a modeling gap for resale products and packaging.

Correction:
- added `InventoryItem` as canonical physical stock identity;
- retained `Product` as sellable identity;
- retained `Ingredient` as recipe/culinary role;
- added `ProductInventoryConsumptionRule` for direct resale stock depletion;
- added `ProductionRun` for intermediate/preparation stock production.

Validated invariant: `Product ≠ Ingredient ≠ InventoryItem`.

No SQL/runtime implementation was introduced.
