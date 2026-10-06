# GMZ-IMPL-007 — Catalog Core & Channel Offers Foundation

Status: `ADMITTED / EXECUTION AUTHORIZED`
Issue: `#67`
Assurance: `ELEVATED`
Admission branch: `implementation/gmz-impl-007-catalog-core`

## OBJECTIVE

Establish the first Wave 1 business-domain foundation: one canonical tenant-owned catalog identity for products and variants, with channel-specific offers/pricing/availability, tenant-safe authorization, durable audit for material mutations, and a minimal accessible catalog-management surface.

This Work Order is centered on GMZ-M06 and deliberately stops before recipes, inventory, POS, orders, provider synchronization or media production.

## CONTEXT

Promoted baseline:
- runtime/Docker foundation: promoted;
- tenant hierarchy + RLS foundation: promoted;
- membership/RBAC authorization: promoted;
- login/session + MFA/Admin Guard: promoted;
- durable audit/correlation: promoted;
- validation harness: promoted;
- minimal design shell: promoted;
- current production credit: `52 / 515 = 10.10%`.

Canonical dependency:
- Backlog Wave 1 begins with GMZ-M06 Catalog;
- recipes, inventory, POS, storefront and orders consume Product/ProductVariant/ChannelOffer truth;
- canonical Product must remain independent from channel-specific price/presentation;
- provider schemas must not become canonical Goodz entities.

## SCOPE

### NECESSARY / admitted

1. Physical tenant-aware catalog persistence for the minimum canonical entities required by this slice:
   - ProductCategory;
   - Product;
   - ProductVariant;
   - SalesChannel identity;
   - ChannelOffer;
   - minimal immutable/versioned channel price history sufficient to prevent price changes from rewriting history.
2. Stable opaque identifiers and explicit organization/establishment/branch ownership where applicable.
3. Preserve the invariant:
   - canonical Product/ProductVariant identity is independent from channel-specific offer, price, availability and presentation.
4. Product categories support deterministic hierarchy without cross-tenant parenting.
5. Product lifecycle supports active/archive semantics; hard deletion of referenced canonical identity is not the default mutation path.
6. ProductVariant belongs to exactly one canonical Product in the same tenant.
7. ChannelOffer targets a canonical Product or ProductVariant and an explicit SalesChannel.
8. ChannelOffer may carry admitted:
   - base price;
   - promotional price;
   - currency;
   - availability;
   - visibility;
   - optional channel title/description;
   - organization/establishment/branch scope where applicable.
9. Monetary values use exact database representation; binary floating-point is forbidden for persisted prices.
10. Invalid commercial states fail closed, including negative prices and invalid promotion/base-price relations.
11. RLS is enabled on exposed catalog tables.
12. Reads require current canonical tenant membership/resource scope.
13. Cross-tenant and sibling-scope enumeration/mutation are denied.
14. Direct browser/Data API INSERT/UPDATE/DELETE of catalog truth is forbidden for ordinary end-user roles.
15. Catalog mutations execute through server-side application contracts using current user identity/authorization; service-role is forbidden for catalog authorization and business mutation.
16. Add the minimal RBAC capabilities required for catalog read/write/price/availability control without inventing a new authorization model.
17. Material catalog mutations emit durable audit events with correlation:
   - price/promotional-price changes;
   - availability/visibility changes;
   - archive/reactivation;
   - other mutation classes the executor proves material.
18. Price/promotion/availability mutations require the existing stronger privileged-action boundary (Admin Guard / fresh stronger auth) in addition to canonical tenant authorization.
19. Ordinary metadata edits remain permission-bound and audited as appropriate, but must not silently obtain privileged price/availability authority.
20. Minimal owner/staff catalog management UI under the existing application shell:
   - list/search;
   - create/edit category;
   - create/edit/archive product;
   - create/edit variant;
   - create/edit channel offer;
   - explicit price/availability state;
   - responsive desktop/mobile;
   - light/dark;
   - accessible labels, keyboard/focus and safe errors.
21. Generated DB types and application contracts are updated.
22. Local deterministic seed/fixture data MAY be added only for test/demo purposes and must remain synthetic.
23. Correlation IDs and safe errors reuse the promoted observability foundation.
24. The complete mutation/read matrix is proven through pgTAP + authenticated Data API/application/E2E tests.

### IMPORTANT but deferred

- ModifierGroup / ModifierOption / ProductModifierRule;
- ComboDefinition / ComboItemRule;
- rich media upload/transformation;
- ChannelFeeProfile profitability logic;
- provider catalog synchronization;
- bulk import/export;
- advanced search/indexing;
- public storefront consumption;
- direct-stock consumption rules;
- automated pricing/promotion intelligence.

### OUT OF SCOPE

- ingredients/recipes/cost propagation/Margin DNA;
- InventoryItem or stock movements;
- purchasing/suppliers;
- POS/cart/payment/cash;
- orders/order snapshots;
- finance/reconciliation;
- iFood/99Food/provider runtime adapters;
- Goodz Online storefront publication;
- Platform/Super Admin;
- autonomous pricing;
- remote Supabase;
- production deployment;
- unrestricted service-role business access;
- unrelated cleanup/refactor.

## FILES / SOURCES TO READ

Mandatory before mutation:
1. `.engineering/CHECKPOINT.json`
2. `.engineering/CHECKPOINT.md`
3. `.engineering/SOURCE-HIERARCHY.md`
4. `.engineering/MODULE-MAP.md`
5. `.engineering/DATA-OWNERSHIP-MATRIX.md`
6. `.engineering/SECURITY-CONTROL-MATRIX.md`
7. `.engineering/TEST-COVERAGE-MATRIX.md`
8. `.engineering/PROGRESS-LEDGER.md`
9. `docs/source-pack/SCOPE.md`
10. `docs/source-pack/REQUIREMENTS.md`
11. `docs/source-pack/ARCHITECTURE.md`
12. `docs/source-pack/DATA-MODEL.md`
13. `docs/source-pack/API-INTEGRATION-CONTRACTS.md`
14. `docs/source-pack/SECURITY.md`
15. `docs/source-pack/TEST-BENCHMARK-PLAN.md`
16. `docs/source-pack/DEFINITION-OF-DONE.md`
17. `docs/source-pack/DEPLOYMENT.md`
18. current catalog-adjacent migrations/generated types/application shell;
19. GMZ-IMPL-003 membership/RBAC/RLS implementation/evidence;
20. GMZ-IMPL-005 Admin Guard implementation/evidence;
21. GMZ-IMPL-006 durable audit writer/schema/evidence.

## REQUIREMENTS

Primary:
- GMZ-REQ-CAT-001 — single canonical product identity;
- GMZ-REQ-CAT-002 — channel-specific offer;
- GMZ-REQ-CAT-003 — rich product model, limited here to categories/products/variants/availability/price history;
- GMZ-REQ-PLAT-001/002/003 — tenancy, authorization, branch awareness;
- GMZ-REQ-SEC-003/004/005 — sensitive actions, auditability, secret hygiene;
- GMZ-REQ-OBS-001 — correlation;
- GMZ-REQ-QA-001..006 as applicable;
- GMZ-REQ-UX-001/002/006/008 for the admitted management UI.

## ARCHITECTURE RULES

- Product ≠ Ingredient ≠ InventoryItem.
- Canonical Product is never duplicated per sales channel.
- ChannelOffer owns channel-specific commercial/presentation state.
- Provider payload/IDs do not leak into canonical Product schema.
- UI does not own authorization or pricing correctness.
- Authentication is not authorization.
- Tenant scope is explicit and RLS-backed.
- No service-role tenant authorization/business mutation.
- Material commands carry actor/context, tenant scope, correlation and resulting audit reference.
- Price history is explainable after later price changes.
- Future order lines will snapshot commercial truth; this slice must not make historical reconstruction impossible.
- Cache/realtime, if used at all, is non-canonical.

## CONSTRAINTS

- Admission PR is governance-only.
- Executor remains blocked until admission merge and exact execution-base bind.
- No direct mutation of `main`.
- No force-push/history rewrite.
- No remote Supabase or production deployment.
- No provider credentials.
- No binary floating-point persisted price.
- No hard-delete behavior that would undermine future order/audit explainability.
- No arbitrary expansion into modifiers/combos/media/inventory/recipes/POS/orders.

## ACCEPTANCE CRITERIA

1. Admission/execution preflight proves exact base/branch/current Context Lock.
2. Physical schema matches the admitted canonical identities and scopes.
3. Local reset applies cleanly from zero.
4. All exposed catalog tables have RLS enabled.
5. Cross-tenant reads and mutations fail closed.
6. Parent/child category and product/variant relationships cannot cross tenant scope.
7. Product identity remains independent from channel offers.
8. Channel offers cannot target foreign-tenant products/variants/scopes.
9. Prices use exact persisted representation and reject invalid values.
10. Price/promotional-price history remains reconstructable after mutation.
11. Direct ordinary-client catalog INSERT/UPDATE/DELETE is denied.
12. Server mutation path uses current user authorization, never service-role business authority.
13. Catalog permission checks bind to current canonical membership/RBAC/resource scope.
14. Price/promotion/availability changes require the admitted privileged-action boundary.
15. Required material mutations produce exactly attributable durable audit events with safe metadata/correlation.
16. Failed required audit persistence prevents would-be privileged price/availability mutation success.
17. Ordinary users cannot enumerate another tenant's catalog through ID substitution/nested relationships.
18. Minimal UI supports the admitted management flow on desktop/mobile with light/dark.
19. UI errors expose safe code/correlation and no secret/SQL/stack details.
20. Accessibility target meets the promoted WCAG 2.2 AA test obligations applicable to the changed UI.
21. Generated DB types match migrations.
22. pgTAP catalog/RLS/security matrix passes.
23. Authenticated Data API/application integration matrix passes.
24. E2E positive and negative catalog flows pass.
25. Lint/typecheck/unit/build pass.
26. DB lint/security advisors pass.
27. Dependency/secret/client-bundle checks pass.
28. Docker/health/readiness/local Supabase/Auth/Postgres/runtime-log checks pass.
29. No out-of-scope runtime/schema/domain is introduced.
30. CRITICAL/HIGH unresolved = `0 / 0`.
31. Final Evidence Bundle binds exact base/head/tree and actual test counts.
32. PR remains unmerged until independent objective audit.

## TESTS

ELEVATED minimum:
- frozen install / strict peers;
- lint;
- typecheck;
- unit;
- production build;
- local Supabase reset;
- pgTAP;
- authenticated Data API/application integration;
- RLS cross-tenant/IDOR/foreign-parent matrix;
- privileged mutation + durable-audit fail-closed tests;
- generated DB types equivalence;
- migration status;
- DB lint/security/performance advisors;
- complete relevant E2E desktop/mobile;
- Axe/accessibility for changed UI;
- secret scan;
- client-bundle containment;
- production dependency audit + full audit truth;
- Docker config/build/up/health;
- app health/readiness;
- local Supabase/Auth/Postgres;
- runtime-log scan;
- `.gef` integrity;
- fresh SonarCloud/Socket/CodeRabbit at final exact HEAD.

## DELIVERABLES

- catalog migration/schema;
- RLS/policies/constraints/indexes;
- catalog server application contracts;
- RBAC capability additions required by this slice;
- durable catalog audit integration;
- minimal responsive catalog-management UI;
- generated DB types;
- unit/integration/pgTAP/E2E/accessibility tests;
- GMZ-IMPL-007 Evidence Bundle;
- updated Work Order/checkpoint proposal;
- implementation PR.

## REVIEW FORMAT

Português brasileiro:
- exact base/head/tree;
- schema/data-model delta;
- tenant/RLS authorization matrix;
- price/history invariants;
- mutation trust boundary;
- audit/correlation proof;
- UI/accessibility proof;
- test counts;
- findings by severity;
- deferred scope;
- proposed Checkpoint Delta;
- explicit `READY_FOR_OBJECTIVE_AUDIT` or blocker.

## PREDECLARED CREDIT

Maximum after objective acceptance + implementation merge + promotion only:
- GMZ-M06: `7`
- GMZ-M26: `2`
- increment max: `9 / 515`
- current earned: `52 / 515 = 10.10%`
- projected if fully accepted: `61 / 515 = 11.84%`

GMZ-M06 would become `7 / 16 — PARTIAL`.
GMZ-M26 would become `13 / 18 — PARTIAL`.

## STOP CONDITION

Admission:
`GMZ_IMPL_007_ADMISSION_READY_FOR_REVIEW`

Execution after governed admission promotion and exact bind:
`GMZ_IMPL_007_READY_FOR_OBJECTIVE_AUDIT`


## EXECUTION-BASE BIND

- admission PR: `#68`
- admission audited head: `9abc2f690f035b41801662688cb6f7ab9e2e9f9a`
- admission merge / exact execution base: `1b64fbfbef3d31d215f4a2a1e30e88f8f946860c`
- execution branch: `execution/gmz-impl-007-catalog-core`
- Context Lock: `BOUND_FOR_EXECUTION`
- stable source fingerprints: `16 / 16 MATCH`
- assurance: `ELEVATED`
- executor/Codex: `AUTHORIZED FOR GMZ-IMPL-007 ONLY`
- merge authority: `NO`
- current production credit remains `52 / 515 = 10.10%`
- maximum later eligible credit remains `9 / 515`
- implementation must execute W0 → W10 from the Execution Pack and stop without merge

Execution STOP CONDITION:
`GMZ_IMPL_007_READY_FOR_OBJECTIVE_AUDIT`


## EXECUTION CLOSEOUT

Executed on `execution/gmz-impl-007-catalog-core` from the exact execution base
`1b64fbfbef3d31d215f4a2a1e30e88f8f946860c`, under the Context Lock bound at `16 / 16 MATCH` with
assurance `ELEVATED`. Merge authority was `NO` and none was exercised.

### Schema / data-model delta

- `supabase/migrations/20261005090000_catalog_core_schema.sql`
  - `product_categories`, `products`, `product_variants`, `sales_channels`, `channel_offers`
  - `channel_offer_price_history`, immutable, exposed read-only as `channel_offer_price_timeline`
  - money is `numeric(19,4)`; a price is never a binary float
  - a `ChannelOffer` names exactly one canonical `Product` **or** one `ProductVariant`, never both and
    never neither; uniqueness is per `(sales_channel_id, product_id)` and per
    `(sales_channel_id, product_variant_id)`
  - a `ProductVariant` belongs to exactly one `Product`; a parent from another tenant is refused
- `20261005090100_catalog_authorization.sql` — tenant-aware RLS, direct-client mutation denied,
  `SECURITY DEFINER` + `SET search_path = ''`, EXECUTE to `authenticated` only, actor from the JWT
- `20261005090200_catalog_contracts.sql` — catalog commands, `catalog_require_step_up()`, receipted
  idempotency

### Tenant / RLS authorization matrix

Own tenant: read admitted rows, write within the admitted scope. Sibling tenant in the same
organization: denied. Foreign tenant: denied. ID substitution: denied. Nested relationship IDOR:
denied. Foreign parent on insert: denied. Cross-tenant enumeration: denied — a foreign name is
indistinguishable from a name that does not exist. Direct client `INSERT`/`UPDATE`/`DELETE` on every
catalog table through the Data API: denied. No service-role path exists for catalog authorization,
catalog business mutation or tenant bypass.

### Price / history invariants

- a negative price is refused; a promotional price that is not below the base price is refused;
  impossible commercial states are refused
- four decimal places survive the round trip exactly
- a repricing closes the prior revision and writes a new one; the prior revision keeps its own price,
  its own effective window and its own audit event, so the prior truth is reconstructable
- history rows refuse deletion, so the archive is append-only by construction

### Mutation trust boundary

Server actions re-derive authority independently of anything the interface displayed. A privileged
commercial mutation (price, promotional price, availability, material visibility) additionally
requires a single bearer that carries `aal2`, a fresh `totp` and a fresh `password` authentication —
exactly what `catalog_require_step_up()` demands. A durable `AuditEvent` with the command's
correlation is written inside the same transaction; if that write cannot happen, the mutation fails
closed. Audit metadata is restricted by `private.is_safe_audit_metadata` to
`required_permission`/`resource_kind`/`changed_fields`/`previous_value`/`next_value`.

### UI / accessibility proof

`/app/catalog` inside the existing app shell. Axe reports zero violations at `wcag2a`, `wcag2aa`,
`wcag21a`, `wcag21aa` and `wcag22aa` in light and dark, on desktop and mobile. Layout was verified by
measurement at `1440x1000` and `390x844`: no horizontal overflow, no target below `24x24`, the wide
price table reachable through an `overflow-x: auto` region, and a `3px solid` focus ring. This session
could not ingest raster images, so no pixel-level visual review was performed; that limit is recorded
in the Evidence Bundle rather than papered over.

### Test counts

- pgTAP `356 / 356` in 6 files
- Auth/Data API integration `59 / 59`
- catalog Auth/Data API integration `74 / 74`
- unit `93 / 93` in 13 files
- E2E `32 / 32` across `desktop-chromium` and `mobile-chromium`

### Findings by severity

- CRITICAL: `0`
- HIGH: `0` (the raw full dependency audit stays nonzero on `GHSA-vfj7-8cjw-p6xm`; the evidence-backed
  `RESOLVED_NOT_AFFECTED` disposition is preserved and is not represented as a raw audit pass)
- MEDIUM, all corrected within scope: the privileged bearer was AAL1 so no price change could ever
  succeed; the console never revalidated after a mutation; the archive buttons were inverted; a
  refused submission emptied every dropdown; an offer could not name a variant
- LOW, recorded not fixed: `.mfa-status-success` on `/app/security` sits at `4.37:1`, outside this
  Work Order's authorized scope
- LOW, recorded not fixed: the E2E fixture and auth specs rewrite screenshots belonging to the promoted
  GMZ-IMPL-001 and GMZ-IMPL-004 evidence directories; the artifacts were restored to their committed
  bytes and are not part of this delta

### Deferred scope

Everything the Work Order listed as prohibited was left untouched: modifiers, combos, rich media,
ingredients, recipes, inventory, stock, purchasing, suppliers, POS, cart, payments, orders, finance,
reconciliation, iFood and 99Food adapters, provider catalog sync, Goodz Online publishing, autonomous
pricing, Platform/Super Admin, remote Supabase and production deployment. No need arose outside the
authorized scope, so no `STOP BLOCKED` finding was raised.

### Proposed Checkpoint Delta

Appended to `.engineering/CHECKPOINT.md` and explicitly `NOT APPLIED`. `CHECKPOINT.json` stays at
`GMZ_IMPL_007_BOUND_FOR_EXECUTION` with credit `52 / 515 = 10.10%`, pending independent objective
audit. On acceptance only: `61 / 515 = 11.84%`.

Outcome:
`READY_FOR_OBJECTIVE_AUDIT`
