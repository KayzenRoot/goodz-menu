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

## Revalidação corretiva após revisão local — 2026-10-07

Esta seção registra o estado atual e supersede o outcome READY acima para o candidato revalidado.
O stop condition do Work Order **não foi atingido**.

- Branch: `execution/gmz-impl-007-catalog-core`.
- Execution base: `1b64fbfbef3d31d215f4a2a1e30e88f8f946860c` (ancestral do candidato).
- Commit de implementação validado: `98bd0390cef640fc34a0729933578388a2b0d74a`.
- Tree do commit de implementação: `86ccf5b5f3ee147bb3636683f5f23aab044686d0`.
- Context Lock: `BOUND_FOR_EXECUTION`; fingerprints: `16 / 16 MATCH`; `.gef` sem diff; `CHECKPOINT.json` preservado.
- Revisão local CodeRabbit após as correções: `0 issues`.
- Checks hospedados após publicar `599a001b21e04e0204c7e7b521d9d8881a7b55e0`: SonarCloud Code Analysis,
  Socket Security Project Report e Socket Security Pull Request Alerts reportaram PASS. O check
  hospedado CodeRabbit marcou `Review skipped: draft pull request`; isso não conta como revisão
  objetiva/independente. Esses checks correspondem ao SHA citado e precisam ser conferidos novamente
  caso um novo commit seja publicado.
- Correções de revisão nesta revalidação: estado de rascunho por formulário de catálogo com reset após sucesso e preservação após recusa; fuso explícito `America/Sao_Paulo` para o histórico; fixture E2E lendo duas linhas e serializando instantes ISO UTC; removida declaração `IMMUTABLE` falsa do helper PL/pgSQL que sempre levanta exceção.
- Validações no snapshot de implementação: frozen install/strict peers PASS; lint PASS; typecheck PASS; unit `93 / 93` PASS; build PASS; `security:braces-disposition` PASS; production audit PASS; secret scan `256` arquivos texto, `0` padrões; client bundle `21` arquivos, `0` identificadores de service-role e `0` padrões de token.
- O raw `pnpm audit` segue `RAW FAIL`, com exatamente um HIGH `GHSA-vfj7-8cjw-p6xm` no grafo dev-only; o guard continua registrando `RESOLVED_NOT_AFFECTED` por reachability e configuração ESLint. O raw audit não é apresentado como PASS.
- `docker compose config --quiet` PASS. Docker build/up e `supabase db reset --local` falharam porque o daemon não atende ao named pipe `dockerDesktopLinuxEngine`. Docker Desktop informa que não consegue iniciar; `wsl -d Ubuntu-24.04 -- uname -r` falha em `Wsl/Service/CreateInstance/CreateVm/HCS/ERROR_NOT_SUPPORTED`.
- Nenhum VHDX em `D:\DockerLive` foi apagado, movido ou reinitializado. O reparo do host requer restaurar WSL/HCS com privilégio administrativo e, se necessário, reiniciar o Windows; essa capacidade não está disponível nesta sessão não elevada.
- Por esse bloqueio, E2E/Axe, pgTAP e Auth/Data API no HEAD corretivo, migration status, DB lint/advisors, readiness/Auth/Postgres e runtime logs **não foram concluídos no snapshot atual**. Resultados anteriores dessas provas permanecem históricos e não são reutilizados como evidência do candidato atual.
- Crédito permanece `52 / 515 = 10.10%`; `.engineering/CHECKPOINT.json` não foi alterado; PR `#69` permanece draft e sem merge.

Estado atual: `BLOCKED_FOR_OBJECTIVE_AUDIT` até recuperação do host e execução do HIGH_ASSURANCE L5 completo no HEAD publicado.


## GMZ-IMPL-007-CD-001 — OBJECTIVE REVIEW CORRECTION DELTA

Status: `AUTHORIZED_FOR_CORRECTION`

Objective-review implementation HEAD: `5e0712a0084126d39e0b36d9236892715e9c375b`  
CodeRabbit hosted implementation review: `812e624c-c4cc-48fa-91bf-733d75c92a2a`  
Production credit: unchanged at `52 / 515 = 10.10%`  
Merge authority: `NO`

### Confirmed findings

1. **MAJOR / functional correctness — establishment containment**
   - `private.catalog_scope_grants` currently requires `p_branch_id IS NULL` for an establishment-scoped role.
   - That contradicts the promoted tenant hierarchy, where an establishment scope contains every branch in that establishment.
   - Correction: an establishment-scoped catalog role must admit rows whose `establishment_id` matches, whether the row is establishment-level or branch-level.
   - Negative boundaries remain mandatory: sibling establishment, foreign establishment and foreign tenant stay denied.

2. **MAJOR / security least privilege — settlement helper EXECUTE**
   - The promoted membership migration grants `USAGE ON SCHEMA private TO authenticated`.
   - `private.catalog_settle` and `private.catalog_settle_revision` are `SECURITY DEFINER` helpers and were omitted from the explicit function revocation block.
   - PostgreSQL function EXECUTE defaults must not be relied on here.
   - Correction: explicitly `REVOKE ALL` on both exact signatures from `PUBLIC, anon, authenticated, service_role`.
   - Add deterministic privilege proof that `authenticated` cannot execute either helper directly.

3. **MINOR / test integrity — false-negative presentation-control assertion**
   - `tests/e2e/catalog.spec.ts` queries the text `Salvar apresentação` with `getByLabel`, although it is a button.
   - Correction: use a semantic button-role locator so the assertion fails if a forbidden presentation control is rendered.

4. **LOW / performance hardening — deferred**
   - Unbounded overview loading of append-only price history is real scalability debt but is not an acceptance criterion of this slice.
   - Tracked separately in **Issue #70**. CD-001 MUST NOT expand into that optimization.

### Authorized write set

Runtime / SQL / tests:
- `supabase/migrations/20261005090100_catalog_authorization.sql`
- `supabase/migrations/20261005090200_catalog_contracts.sql`
- `supabase/tests/database/catalog_tenant_authorization.test.sql`
- `tests/supabase/catalog-authorization.integration.mjs` only if needed for establishment-scope authenticated proof
- `tests/e2e/catalog.spec.ts`

Governance / evidence:
- `.engineering/work-orders/GMZ-IMPL-007.md`
- `.engineering/execution-packs/GMZ-IMPL-007.md`
- `.engineering/context-locks/GMZ-IMPL-007.json`
- `.engineering/evidence/GMZ-IMPL-007-EVIDENCE.md`
- `.engineering/CHECKPOINT.md` proposal only

### Forbidden

- `.engineering/CHECKPOINT.json`
- `.gef/**`
- dependency or lockfile changes
- unrelated UI redesign
- price-history performance work from Issue #70
- remote Supabase / production deployment
- provider integrations
- inventory / recipes / POS / orders / finance
- service-role catalog business authority
- merge, force-push, history rewrite, direct main mutation

### Acceptance proof

- Establishment-scoped catalog principal:
  - can read a branch-scoped catalog row inside its assigned establishment;
  - can create/write an admitted branch-scoped row inside its assigned establishment;
  - cannot read/write sibling-establishment or foreign-tenant rows.
- Organization- and branch-scoped behavior remains correct.
- `authenticated` has no EXECUTE privilege on either `private.catalog_settle` helper signature.
- Public catalog wrappers continue to function with current-user authority.
- Reader E2E presentation-control negative assertion is semantically real, not vacuous.
- Focused pgTAP / integration / E2E proofs pass.
- Complete ELEVATED exact-head L5 is rerun after the correction.
- Fresh SonarCloud, Socket and CodeRabbit run on the exact final HEAD.
- Unresolved CRITICAL/HIGH = `0 / 0`.
- PR remains open/draft and unmerged.

CD-001 STOP CONDITION:
`GMZ_IMPL_007_CD_001_READY_FOR_OBJECTIVE_AUDIT`.


### CD-001 execution closeout — 2026-10-07

- Validated implementation commit/tree: `3151f7c9879e90175a2f2c81cccd1017f2b6d593` /
  `e3b4b397a91b538fbbbd52cd6caf027c32024e13`.
- Preflight: execution base ancestral; Context Lock `BOUND_FOR_EXECUTION`; `16 / 16 MATCH`; protected
  `.gef` and `CHECKPOINT.json` unchanged from mandatory starting HEAD `a1b806c549e75b8ce8df65c76aebb68c3ee6e008`.
- CD-001 establishment containment, exact helper revocations, pgTAP privilege proof and semantic
  reader assertion are implemented. pgTAP passed `385 / 385`; local Auth/Data API passed `91` checks;
  focused desktop reader E2E passed `1 / 1`; the mobile reader case passed in the full run.
- The complete ELEVATED L5 is **BLOCKED**: latest full desktop/mobile E2E completed with `27 / 32`
  passed, `2` failed and `3` did not run. The failures were missing desktop channel-created feedback
  and missing QR image after mobile MFA enrollment; neither is part of CD-001 and neither was changed.
- Other current checks: frozen strict-peer install with pinned pnpm `12.8.1`, lint, typecheck, unit
  `93 / 93`, build, generated-type equivalence, migration status, DB lint, advisors (`0 WARN / 0 ERROR`),
  production dependency audit, secret scan, client-bundle containment, Docker health/readiness, local
  Supabase/Auth/Postgres and runtime logs passed. The raw full audit remains RAW FAIL with one dev-only
  HIGH `GHSA-vfj7-8cjw-p6xm`; the mechanical reachability guard and five self-tests pass and record
  `RESOLVED_NOT_AFFECTED`.
- Local CodeRabbit: `0 issues`. Fresh hosted SonarCloud, Socket and CodeRabbit statuses must be recorded
  from the published closeout HEAD in PR `#69`.
- Production credit remains `52 / 515 = 10.10%`; no checkpoint promotion. PR remains OPEN/DRAFT and
  unmerged.

Execution disposition: `BLOCKED_FOR_OBJECTIVE_AUDIT`; the CD-001 stop condition is **not reached**.


## GMZ-IMPL-007-CD-002 — Deterministic E2E diagnosis and bounded correction

Status: `AUTHORIZED_FOR_DIAGNOSTIC_CORRECTION`

Authorization implementation/evidence HEAD: `a6c853e4874b67ccefba558c7afd413463196065`  
CD-001 corrected implementation SHA: `3151f7c9879e90175a2f2c81cccd1017f2b6d593`  
CD-001 corrected implementation tree: `e3b4b397a91b538fbbbd52cd6caf027c32024e13`  
PR: `#69 OPEN/DRAFT/UNMERGED`  
Assurance: `ELEVATED`

### Trigger

CD-001 has completed its original three source/test corrections with focused regression proof (pgTAP `385/385`, local Auth/Data API `91`, unit `93/93`, focused reader desktop/mobile PASS). The full two-project browser suite did not pass: `27/32` PASS, `2` FAIL, `3` NOT RUN.

Two current failures must be classified by objective evidence, not assumed flaky:
1. Desktop catalog manager expected `Canal criado.` after submitting a new SalesChannel. The application contains the success message and `useActionState`; inspect actual Server Action request/response, returned `CatalogActionResult`, validation, persisted channel row, render/hydration and locator before choosing a fix.
2. Mobile MFA enrollment expected a QR image after reauthentication. Inspect actual Server Action request/response, password-grant/identity, factors, pending factor, UI state, and any project-concurrency/fixture interference. MFA runtime/auth policy is OUTSIDE GMZ-IMPL-007; do not weaken it to make tests green.

### Authorization

**First diagnosis, then the smallest proven correction**. Permitted test/fixture paths:
- `tests/e2e/catalog.spec.ts`
- `tests/e2e/mfa-admin-guard.spec.ts`
- `tests/e2e/catalog-ui-fixture.ts` if proven necessary
- `tests/e2e/auth-session-fixture.ts` if proven necessary

Permitted catalog runtime paths **only if the failing evidence proves a true catalog product defect**:
- `src/components/goodz/catalog-console.tsx`
- `src/app/app/catalog/actions.ts`
- `src/lib/catalog/catalog-commands.server.ts`

Governance/evidence paths:
- `.engineering/work-orders/GMZ-IMPL-007.md`
- `.engineering/execution-packs/GMZ-IMPL-007.md`
- `.engineering/context-locks/GMZ-IMPL-007.json`
- `.engineering/evidence/GMZ-IMPL-007-EVIDENCE.md`
- `.engineering/CHECKPOINT.md` **human proposal only**

Forbidden:
- `.engineering/CHECKPOINT.json`, `.gef/**`, dependencies, lockfile, migration/schema/RLS, catalog money/audit/privilege weakening;
- MFA/Auth/Admin Guard/reauthentication runtime code without a separately admitted runtime delta;
- removing/skipping tests, fixed sleeps, blind retries, `test.skip`, weakening assertions or `first()/nth()` locator camouflage;
- issue #70, provider adapters, recipes, inventory, POS, orders, finance, production or remote Supabase;
- merge, push to main, force-push, credit promotion.

If the MFA failure proves a runtime/Auth regression outside test/fixture scope, STOP `BLOCKED` with reproducible evidence, request a separate owned runtime correction. If the catalog defect requires paths outside the narrow authorized runtime set, STOP for authorization expansion, never silent scope creep.

### Acceptance

1. Exact branch/base ancestry and Context Lock preflight; `16/16` locked source fingerprints.
2. Capture complete failures with Playwright trace/error/action response, browser and server logs; redact tokens/QR/TOTP/passwords and secrets.
3. Focused desktop channel creation `>=3/3` consecutive at same code revision.
4. Focused mobile MFA enrollment `>=3/3` consecutive at same code revision; QR behavior, factor lifecycle and security assertions preserved.
5. Whole E2E normal workers `32/32`; workers=1 `32/32` if fixtures support single-worker setup. No skipped/not-run tests.
6. Full applicable Axe/accessibility tests PASS with zero violations.
7. Full `ELEVATED` exact-head L5 repeated, including pgTAP/Auth API, unit, lint/type/build, local DB reset, Docker, health, secret/dependency/security, migration/types, runtime logs, `.gef` integrity.
8. Preserve raw full dependency audit truth for `GHSA-vfj7-8cjw-p6xm` and revalidate `RESOLVED_NOT_AFFECTED` guard.
9. SonarCloud reports `22` new issues at authorization HEAD, described as `17 CRITICAL / 5 MAJOR code smells`. Obtain individual rule/file/severity/impact, verify changed-scope relevance, disposition each finding and resolve all actionable release blockers. A PASS Quality Gate alone is not sufficient to claim there are no unresolved CRITICAL/HIGH findings.
10. Fresh exact-final-HEAD SonarCloud, Socket Project Report, Socket PR Alerts and **manual real hosted CodeRabbit full implementation review**, not `Review skipped: draft pull request`; all actionable review threads resolved only with evidence.
11. No runtime/security/money weakening, no double count, no merge, no credit promotion; keep `52/515 = 10.10%`.
12. Document diagnosis, minimal code diff, test counts, Sonar dispositions, hosted results and STOP token.

### STOP CONDITION

`GMZ_IMPL_007_CD_002_READY_FOR_OBJECTIVE_AUDIT`
