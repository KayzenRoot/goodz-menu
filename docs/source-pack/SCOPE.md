# Goodz Menu — Scope

Status: `FROZEN_V0.1`  
Authority domain: `SCOPE`

## Scope model
Goodz Menu is a complete-product program constructed incrementally. Construction order does not silently remove admitted product scope.

Canonical classifications:
- `CORE_REQUIRED` — required for product identity, correctness, security, operational viability or foundational continuity.
- `PRODUCT_INCLUDED` — part of the complete product, but not necessarily required in the first implementation slice.
- `EXPERIMENTAL_GATED` — admitted concept whose production use requires utility, assurance, validity/stability and engineering-ROI proof.
- `OPTIONAL_ADAPTER` — provider-specific capability whose absence cannot block the independent core.
- `OUT_OF_SCOPE` — explicitly excluded.

## Module classification

### CORE_REQUIRED
- GMZ-M00 Governance & Source Pack
- GMZ-M01 Platform Core & Multi-Tenancy
- GMZ-M02 Identity, Auth, RBAC & Admin Guard
- GMZ-M03 Settings, Policy & Entitlements
- GMZ-M04 Design System, Feedback, Motion & Notifications
- GMZ-M05 POS, Cash & Continuity
- GMZ-M06 Catalog, Product & Channel Offers
- GMZ-M07 Ingredients, Recipes, Costing & Margin DNA
- GMZ-M08 Inventory & Smart Stock
- GMZ-M09 Purchasing & Supplier Intelligence foundation
- GMZ-M10 Orders & Omnichannel Hub
- GMZ-M11 Goodz Online & Adaptive Storefront
- GMZ-M12 Delivery foundation
- GMZ-M13 Finance & Reconciliation
- GMZ-M14 Treasury & Profit Allocation foundation
- GMZ-M17 Analytics, Reports & Goals foundation
- GMZ-M18 Goodz Intelligence Core
- GMZ-M19 Simulation, Decision & Optimization foundation
- GMZ-M20 Forecasting, Quality & Early Warning foundation
- GMZ-M22 SaaS & Super Admin foundation
- GMZ-M23 Observability, Audit & Self-Healing foundation
- GMZ-M25 Runtime, Docker & Deployment
- GMZ-M26 Validation & Quality Engineering
- GMZ-M27 Privacy, LGPD & Data Governance

### PRODUCT_INCLUDED
- GMZ-M15 CRM & Customer Intelligence
- GMZ-M16 Marketing & Growth
- GMZ-M21 Investment Intelligence
- GMZ-M24 External Integrations
- GMZ-M28 Product Operations & Support
- advanced portions of M09, M12, M17, M19, M20, M22 and M23 that are not first-slice foundations

### EXPERIMENTAL_GATED capabilities
The following may belong to a core/included module but cannot be promoted to production merely because code exists:
- autonomous pricing/promotion changes;
- causal/counterfactual recommendations presented as more than bounded estimates;
- advanced Business Optimizer decisions;
- cross-tenant benchmark/network intelligence;
- learned recommendation policies with material financial impact;
- investment allocation recommendations using volatile market inputs;
- Crypto/Web3/DeFi risk/yield analytics beyond read-only reporting;
- any automated external investment execution;
- autonomy above approved policy-bounded low-risk actions.

Promotion gates:
1. Utility Gate
2. Assurance Gate
3. Validity/Stability Gate
4. Engineering ROI Gate

### OPTIONAL_ADAPTER
Provider-specific adapters other than product-required supported channels remain optional independently deployable adapters.
iFood and 99Food integration contracts are part of the complete product plan because they are explicit product requirements, even though their provider-specific runtime availability depends on external authorization/certification.

### OUT_OF_SCOPE
- invisible impersonation of tenant users;
- administrator access to user passwords;
- secrets exposed in UI/logs/repository;
- unrestricted cross-tenant access;
- raw vector/RAG output as official financial truth;
- guaranteed-return investment claims;
- unapproved autonomous money movement;
- unrestricted arbitrary CSS injection in standard SaaS storefronts;
- weakening security/test gates to make delivery appear complete;
- architecture that requires a microservice split without evidence.

## First implementation slice
Not frozen by this Scope document.

The first slice will be selected only after Architecture, Data Model, Security, Test/Benchmark Plan and DoD provide enough proof obligations to admit an implementation Work Order.

Likely foundation ordering is constrained by:
1. project/runtime shell + Docker;
2. tenant/auth/settings/security;
3. design system/application shell;
4. core data model and ledgers;
5. POS/catalog/recipes/inventory/finance vertical slices;
but this ordering is not yet an execution contract.

## Scope invariants
- no master idea disappears because it is deferred;
- deferred work remains traceable in backlog;
- experimental status is evidence maturity, not a synonym for “unimportant”;
- provider-specific failure cannot corrupt canonical core state;
- AI differentiation remains part of product identity.

STOP CONDITION: `GMZ_SCOPE_FROZEN_V0_1`
