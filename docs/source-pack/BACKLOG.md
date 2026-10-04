# Goodz Menu — Weighted Production Backlog Baseline

Status: `APPROVED_V0.1`  
Authority domain: `FUTURE_WORK + COMPLETION`

## 1. Purpose

This backlog defines the complete production denominator for Goodz Menu.

Planning progress and document count do not earn product-completion credit.

Production credit is earned only when admitted module work satisfies the applicable Definition of Done with valid evidence.

## 2. Weight model

```text
RAW_WEIGHT = E + R + I + P
```

Each dimension ranges 1..5:
- `E` implementation effort;
- `R` engineering/security/financial risk;
- `I` integration/dependency breadth;
- `P` proof/validation burden.

A score is not “importance”. It estimates delivery/proof burden.

## 3. Module baseline

| Module | Name | E | R | I | P | Weight |
|---|---|---:|---:|---:|---:|---:|
| GMZ-M00 | Governance & Source Pack | 3 | 3 | 4 | 4 | 14 |
| GMZ-M01 | Platform Core & Multi-Tenancy | 4 | 5 | 5 | 5 | 19 |
| GMZ-M02 | Identity, Auth, RBAC & Admin Guard | 4 | 5 | 5 | 5 | 19 |
| GMZ-M03 | Settings, Policy & Entitlements | 4 | 4 | 4 | 4 | 16 |
| GMZ-M04 | Design System, Feedback, Motion & Notifications | 4 | 3 | 4 | 4 | 15 |
| GMZ-M05 | POS, Cash & Continuity | 5 | 5 | 5 | 5 | 20 |
| GMZ-M06 | Catalog, Product & Channel Offers | 4 | 4 | 4 | 4 | 16 |
| GMZ-M07 | Ingredients, Recipes, Costing & Margin DNA | 4 | 4 | 4 | 4 | 16 |
| GMZ-M08 | Inventory & Smart Stock | 5 | 5 | 5 | 5 | 20 |
| GMZ-M09 | Purchasing & Supplier Intelligence | 4 | 4 | 4 | 4 | 16 |
| GMZ-M10 | Orders & Omnichannel Hub | 5 | 5 | 5 | 5 | 20 |
| GMZ-M11 | Goodz Online & Adaptive Storefront | 5 | 4 | 4 | 5 | 18 |
| GMZ-M12 | Delivery | 4 | 4 | 4 | 4 | 16 |
| GMZ-M13 | Finance & Reconciliation | 5 | 5 | 5 | 5 | 20 |
| GMZ-M14 | Treasury & Profit Allocation | 4 | 5 | 4 | 5 | 18 |
| GMZ-M15 | CRM & Customer Intelligence | 4 | 3 | 4 | 4 | 15 |
| GMZ-M16 | Marketing & Growth | 4 | 4 | 4 | 4 | 16 |
| GMZ-M17 | Analytics, Reports & Goals | 4 | 4 | 4 | 4 | 16 |
| GMZ-M18 | Goodz Intelligence Core | 5 | 5 | 5 | 5 | 20 |
| GMZ-M19 | Simulation, Decision & Optimization | 5 | 5 | 5 | 5 | 20 |
| GMZ-M20 | Forecasting, Quality & Early Warning | 4 | 4 | 4 | 5 | 17 |
| GMZ-M21 | Investment Intelligence | 5 | 5 | 4 | 5 | 19 |
| GMZ-M22 | SaaS & Super Admin | 5 | 5 | 5 | 5 | 20 |
| GMZ-M23 | Observability, Audit & Self-Healing | 4 | 5 | 5 | 5 | 19 |
| GMZ-M24 | External Integrations | 5 | 5 | 5 | 5 | 20 |
| GMZ-M25 | Runtime, Docker & Deployment | 4 | 4 | 5 | 5 | 18 |
| GMZ-M26 | Validation & Quality Engineering | 4 | 4 | 5 | 5 | 18 |
| GMZ-M27 | Privacy, LGPD & Data Governance | 4 | 5 | 4 | 5 | 18 |
| GMZ-M28 | Product Operations & Support | 4 | 4 | 4 | 4 | 16 |

### Total production denominator
`515 weighted points`

## 4. Current production credit

As of this baseline:
- evidence-backed product implementation credit: `44 / 515`;
- production completion: `8.54%`;
- planning/source-pack progress is tracked separately and does not create product credit.

This is intentionally strict.

## 4.1 Accepted production slices

| Increment | Module slice | Credit | Merge |
|---|---|---:|---|
| GMZ-IMPL-001 | GMZ-M25 Runtime/Docker/Deployment | 4 | `04fa311e1839c7070b829438e90ddd670f9dbef1` |
| GMZ-IMPL-001 | GMZ-M04 Design System shell | 1 | `04fa311e1839c7070b829438e90ddd670f9dbef1` |
| GMZ-IMPL-001 | GMZ-M26 Validation/Quality Engineering | 2 | `04fa311e1839c7070b829438e90ddd670f9dbef1` |
| GMZ-IMPL-001 | GMZ-M23 Observability/correlation bootstrap | 1 | `04fa311e1839c7070b829438e90ddd670f9dbef1` |
| GMZ-IMPL-002 | GMZ-M01 Tenant hierarchy and isolation foundation | 10 | `8481193e367a68fc02213d61446f0faed9306e13` |
| GMZ-IMPL-002 | GMZ-M26 Tenancy/database validation & quality | 1 | `8481193e367a68fc02213d61446f0faed9306e13` |
| GMZ-IMPL-003 | GMZ-M02 Membership/RBAC tenant authorization foundation | 10 | `b74be258fa6bff47c7f2ec69db79289a601a2151` |
| GMZ-IMPL-003 | GMZ-M26 Auth/RLS validation & quality | 2 | `b74be258fa6bff47c7f2ec69db79289a601a2151` |
| GMZ-IMPL-004 | GMZ-M02 Auth/session/tenant-entry foundation | 5 | `2bee77001309740b6aa86e605ca56fb4e6bed6a2` |
| GMZ-IMPL-004 | GMZ-M26 Auth/session validation & quality | 2 | `2bee77001309740b6aa86e605ca56fb4e6bed6a2` |
| GMZ-IMPL-005 | GMZ-M02 MFA/reauthentication/Admin Guard completion | 4 | `f5da78f0e901d4f9c0bc571309332c001f028306` |
| GMZ-IMPL-005 | GMZ-M26 stronger-auth validation & quality | 2 | `f5da78f0e901d4f9c0bc571309332c001f028306` |

Cumulative accepted credit: `44 / 515 = 8.54%`.

GMZ-M02 accepted baseline: `19 / 19 — COMPLETE`.

## 5. Weight rationale classes

### Weight 20
Highest interaction of implementation, risk, dependencies and proof.
Examples: POS/cash, inventory, orders, finance, AI core, simulation, SaaS/admin, integrations.

### Weight 18–19
High-risk/high-breadth foundation or advanced domain.
Examples: tenancy, Auth/Admin Guard, treasury, investment intelligence, observability, runtime, quality, privacy.

### Weight 15–17
Substantial product module with narrower risk/integration surface.

### Weight 14
Governance/source-pack implementation burden is real but lower than transactional production domains. Planning itself does not automatically earn this module's production credit.

## 6. Dependency order

Construction is incremental. Recommended dependency waves:

### Wave 0 — Executable foundation
- GMZ-M25 Runtime/Docker/Deployment
- GMZ-M01 Platform Core/Multi-Tenancy
- GMZ-M02 Auth/RBAC/Admin Guard
- GMZ-M26 Validation/Quality
- GMZ-M23 Observability/Audit
- minimal GMZ-M04 Design System shell

### Wave 1 — Commerce truth foundations
- GMZ-M06 Catalog
- GMZ-M07 Recipes/Costing
- GMZ-M08 Inventory
- GMZ-M05 POS/Cash
- GMZ-M13 Finance
- GMZ-M03 Settings/Policy/Entitlements

### Wave 2 — Orders and operational expansion
- GMZ-M10 Orders/Omnichannel
- GMZ-M09 Purchasing
- GMZ-M11 Goodz Online
- GMZ-M12 Delivery
- GMZ-M24 External Integrations

### Wave 3 — Intelligence and owner visibility
- GMZ-M17 Analytics/Reports/Goals
- GMZ-M18 Intelligence Core
- GMZ-M20 Forecasting/Data Quality/Early Warning
- GMZ-M14 Treasury/Profit Allocation
- GMZ-M19 Simulation/Decision/Optimization

### Wave 4 — Customer/growth/SaaS maturity
- GMZ-M15 CRM
- GMZ-M16 Marketing/Growth
- GMZ-M22 SaaS/Super Admin expansion
- GMZ-M28 Product Operations/Support
- GMZ-M27 Privacy/LGPD maturity across all modules

### Wave 5 — Advanced investment intelligence
- GMZ-M21 Investment Intelligence
Only read-only/recommendation scope initially unless separately admitted.

Dependency waves are not permission to batch all modules into one PR.

## 7. First implementation increment

The first executable Work Order should be narrower than an entire wave.

Recommended first implementation objective:
**Runtime + design shell + local Supabase connectivity + health smoke + no business feature claim.**

Expected ownership:
- GMZ-M25 primary;
- GMZ-M04 minimal design-shell dependency;
- GMZ-M26 test harness;
- GMZ-M23 minimal observability/correlation bootstrap.

This creates a visible local foundation without prematurely mixing finance/stock/auth/business logic.

## 8. Credit rules

A module receives credit only for proven accepted portions mapped to backlog slices.

Partial credit requires:
- stable slice ID;
- weight allocation defined before implementation acceptance;
- exact requirements;
- DoD/evidence;
- no double counting.

Planning documents, issue creation, code quantity, PR count and elapsed time do not generate credit by themselves.

## 9. Invalidation

Accepted credit may be invalidated or reduced if:
- canonical requirements materially change;
- architecture/security change invalidates evidence;
- test/proof is discovered false/stale;
- critical regression breaks accepted behavior.

Invalidation must be targeted when dependencies allow.

## 10. Experimental capabilities

`EXPERIMENTAL_GATED` technology does not earn production credit merely by existing.

It must pass:
1. Utility;
2. Assurance;
3. Validity/Stability;
4. Engineering ROI;
5. applicable Security/Privacy;
6. requirement-specific quality gates.

## 11. Optional/provider capabilities

Provider adapters may have separate subweights when implementation Work Orders are admitted.

Core product completion cannot claim an adapter is shipped unless its own evidence passes.

## 12. Baseline changes

Changing the 515 denominator requires:
- explicit scope/requirement reason;
- before/after weight table;
- impact on completion percentage;
- owner audit;
- checkpoint promotion.

No denominator edits to make progress look better.

STOP CONDITION: `GMZ_BACKLOG_BASELINE_V0_1_READY_FOR_REVIEW`
