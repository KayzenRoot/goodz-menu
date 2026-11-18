# Goodz Menu — Scope

Status: `FROZEN_V0.1 + CSD-002 ACCEPTED + D-0023 PILOT PARAMETERS APPROVED`
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

## First operational release boundary — GMZ-CSD-002

**Decision:** `ACCEPTED_FOR_CANONICAL_SCOPE_UPDATE` by the maintainer after the independent read-only review of GMZ-CSD-002 at PR #75 HEAD `e7215aee8cfacaf0e1fc7e2b7318569118c0e624`. This PR records the additive canonical Scope update; the Checkpoint has not been promoted.

**Outcome:** Goodz's own online menu and orders, with pickup or the business's own delivery and payment at handoff. POS/cash-register operations and integrated payment gateways are deferred. This is a first-release boundary, not a claim that a selected module is complete or that implementation is authorized.

The accepted release contains only these partial module slices:

| Module | First-release boundary |
| --- | --- |
| GMZ-M01–M03 | Tenant/branch identity, owner/staff authorization, and the settings hierarchy required for the pilot; retain tenant isolation, locked policies, and the plan/entitlement boundary. The exact writable settings allowlist remains to be approved in an implementation Work Order. |
| GMZ-M04 | Accessible, responsive application shell and order-state feedback. Advanced notification center `UX-007` is deferred; staffed order-queue operations and response responsibility must be specified before implementation. Human accessibility and visual review remain mandatory. |
| GMZ-M06 | Text-first manual catalog with canonical product identity, categories, descriptions, sizes/flavors, variants, channel-specific price/availability, and auditable price history. Add-ons/complements, combos/kits, promotions, product-level fee/cost modifiers, historical cost records, and custom media upload/storage/transformation are deferred. Preserve the media-provider abstraction; do not claim stock, cost, or margin accuracy. |
| GMZ-M10–M11 | Canonical order domain with only Goodz's own online channel active; customer menu, cart, checkout, pickup/delivery choice, and order status using one approved layout family. Multiple layout families `WEB-002`, AI-assisted design `WEB-004`, marketplaces, messaging-provider adapters, and payment gateways are deferred. |
| GMZ-M12 | Own-delivery zones, fee/minimum rules, and the states preparing, ready, assignment/dispatch, out for delivery, and delivered. Driver views, routing, and live tracking are deferred, while architecture must preserve `DEL-003` future extension without coupling to POS core. |
| GMZ-M23 | Safe correlation, health/readiness, and durable audit for material catalog, authorization, order, delivery, and handoff-payment events. |
| GMZ-M25–M27 | Production-capable runtime, migration and recovery obligations, risk-based quality validation, and privacy/data-governance obligations. Provider, domain, cost, environment configuration, retention, backup/restore, RPO/RTO, and rollback procedures require separate governed Work Orders. |

The following `CORE_REQUIRED` modules remain required for the complete product but are deferred from this first release: M05, M07–M09, M13–M14, M17–M20, and M22. The existing POS/accounting process remains authoritative for counter sales, cash close, reconciliation, and financial reporting. Manual catalog availability requires a named operator and must be paused when uncertain. Handoff-payment recording, if enabled by a later Work Order, requires an authorized and audited staff action; it does not establish cash close, settlement, refund, or accounting truth. Manual onboarding may replace SaaS self-service, but never tenant isolation or least privilege.

Promotional prices, discounts, and schedules remain deferred under the accepted GMZ-CSD-002 first-release boundary. `GMZ-IMPL-007` (Catalog Core & Channel Offers Foundation) excluded those mutations and has been merged and promoted (`c65cd9eb7d0cdcfebd3f6d265b987c7f34f4f971`).

`PRODUCT_INCLUDED` modules M15, M16, M21, M24, and M28 remain outside the first release. All complete-product module classifications above remain unchanged; this overlay neither removes deferred product scope nor reclassifies a `CORE_REQUIRED` module.

The complete-product denominator remains `515`. The seven operational pilot parameters previously listed as open (pilot establishment/branch visibility, `M03` Settings Registry allowlist, handoff-payment policy, manual-availability operator/cadence, customer/staff order and delivery lifecycle, `M27` LGPD consent/retention/anonymization criteria, and `M25` production topology/backup/RPO/RTO/rollback authority) are resolved in `.engineering/DECISIONS-LEDGER.md` (`D-0023`), and the parallel `GMZ-REBOOT-001` draft line was closed in favor of the promoted `main` baseline. Subsequent implementation slices follow governed Work Orders or `ADR-0005` Fast Track contracts according to risk tier.

## Scope invariants
- no master idea disappears because it is deferred;
- deferred work remains traceable in backlog;
- experimental status is evidence maturity, not a synonym for “unimportant”;
- provider-specific failure cannot corrupt canonical core state;
- AI differentiation remains part of product identity.

STOP CONDITION: `GMZ_SCOPE_FROZEN_V0_1`
