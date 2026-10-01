# GMZ-SP-004-CD-001 — Stock Identity Correction

Status: `ADMITTED / CORRECTION`  
Parent Work Order: `GMZ-SP-004`  
Issue: `#15`  
Risk: `MODERATE_PLANNING`

## Exact base
`main@c7f7c2a3081d9a3790fc51e1380f8c7df3038473`

## Defect
The promoted Data Model had Product and Ingredient separation but no explicit canonical physical-stock entity. That leaves resale items, packaging and produced stocked preparations ambiguous.

## Required correction
Freeze the invariant:

`Product ≠ Ingredient ≠ InventoryItem`

Add/clarify:
- `InventoryItem` — physical stock identity;
- `Ingredient` — recipe/culinary role linked to InventoryItem;
- `Product` — sellable catalog identity;
- `ProductInventoryConsumptionRule` — direct stock depletion for resale;
- `ProductionRun` — production of intermediate/preparation stock;
- inventory movements always change InventoryItem quantity.

## WRITE_ALLOWED
- `docs/source-pack/DATA-MODEL.md`
- `.engineering/DATA-OWNERSHIP-MATRIX.md`
- correction Work Order / Context Lock / Evidence
- Checkpoint

## WRITE_FORBIDDEN
- SQL/migrations
- runtime code
- dependencies
- CI/build/deployment
- `.gef/**`

## Acceptance
- corrected entity separation is explicit;
- ownership/scope matrix is synchronized;
- original 52 issue data families remain covered;
- no runtime/schema implementation;
- CRITICAL/HIGH = 0.

STOP CONDITION: `GMZ_SP_004_CD_001_STOCK_IDENTITY_CORRECTED`
