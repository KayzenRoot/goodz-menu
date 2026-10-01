# GMZ-SP-004-CD-001 — Evidence Bundle

Status: `APPROVED_FOR_CORRECTION_PROMOTION`

## Binding
- Repository: `KayzenRoot/goodz-menu`
- Issue: `#15`
- Parent Work Order: `GMZ-SP-004`
- Correction Work Order: `GMZ-SP-004-CD-001`
- Exact base: `main@c7f7c2a3081d9a3790fc51e1380f8c7df3038473`
- Branch: `correction/gmz-sp-004-stock-identity`

## Defect
Promoted SP-004 separated Product from Ingredient but lacked an explicit canonical physical-stock identity.

This was unsafe/ambiguous for:
- resale merchandise;
- packaging;
- non-recipe stock;
- produced preparations held in inventory.

## Correction
The canonical model now states:

`Product ≠ Ingredient ≠ InventoryItem`

Added:
- `InventoryItem` — canonical physical stock identity;
- Ingredient linked to InventoryItem as recipe/culinary role;
- `ProductInventoryConsumptionRule` — direct stock depletion for resale;
- `ProductionRun` — explicit intermediate/preparation production into stock;
- inventory movements reference InventoryItem;
- ownership/scope matrix rows for these concepts.

## Verification
- original required SP-004 data families remain represented: `52 / 52`
- ownership matrix rows: `45`
- Data Model status: `APPROVED_V0.1`
- Data Ownership Matrix status: `APPROVED_V0.1`
- SQL: `NONE`
- migrations: `NONE`
- runtime code: `NONE`
- dependencies/CI/deployment changes: `NONE`

## Severity
- CRITICAL: `0`
- HIGH: `0`
- unresolved defect after correction: `0 known`

## Disposition
`APPROVED_FOR_CORRECTION_PROMOTION`

Audit is owner-operated and is not represented as independent.

STOP CONDITION: `GMZ_SP_004_CD_001_STOCK_IDENTITY_CORRECTED`
