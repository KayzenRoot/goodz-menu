# GMZ-IMPL-007 — Execution Pack

Status: `BOUND_FOR_EXECUTION`

Admission branch: `implementation/gmz-impl-007-catalog-core`  
Admission base: `f98b54a2a933e1cf312575a571afb57566422d82`  
Intended execution branch after admission merge: `execution/gmz-impl-007-catalog-core`  
Exact execution base: `1b64fbfbef3d31d215f4a2a1e30e88f8f946860c`  
Executor: `GEF heavy executor / Codex`  
Merge authority: `NO`

## Mission

Build the first Wave 1 catalog foundation only after this admission is objectively approved, merged, and rebound to the exact admission merge SHA.

## Closed decisions

- Product is canonical and channel-independent.
- ProductVariant is subordinate canonical identity.
- ChannelOffer owns channel-specific price/availability/presentation.
- Price persistence is exact, not binary floating point.
- Price history must remain reconstructable.
- RLS and current membership/RBAC remain the tenant authority.
- Direct ordinary-client catalog mutation is forbidden.
- Server-side catalog mutation uses current user authority, not service-role.
- Price/promotion/availability mutation requires existing Admin Guard + durable audit.
- Minimal catalog management UI is admitted.
- Modifiers/combos/media/provider sync/inventory/recipes/POS/orders/finance are deferred.

## Planned execution DAG after bind

### W0 — Preflight
Exact execution base/branch, Context Lock, all locked fingerprints, governance snapshot, clean tree, .gef.

### W1 — Current implementation discovery
Inspect existing migrations/RLS/RBAC/audit writer/app shell; revalidate current Supabase RLS/database guidance for the pinned tooling.

### W2 — Catalog schema
Implement ProductCategory/Product/ProductVariant/SalesChannel/ChannelOffer and minimal immutable/versioned price-history substrate with constraints/indexes.

### W3 — RLS and authorization
Tenant-safe SELECT, no direct ordinary-client mutation, current membership/RBAC scope, negative IDOR/cross-tenant proof.

### W4 — Server application contracts
Typed catalog queries/commands using user session authority and deterministic validation/errors/correlation.

### W5 — Privileged material mutations
Price/promotion/availability mutations through existing Admin Guard; durable audit required and fail-closed.

### W6 — Minimal management UI
Accessible responsive catalog management for admitted entities/fields only.

### W7 — Database and API proof
pgTAP + authenticated Data API/application matrix + generated types + DB advisors.

### W8 — UI/E2E proof
Desktop/mobile positive/negative flows, accessibility, safe error/correlation.

### W9 — ELEVATED regression
Full applicable Auth/RBAC/Admin Guard/audit regressions; dependency/security/Docker/runtime checks.

### W10 — Exact-head evidence
Publish final candidate, fresh hosted gates, Evidence Bundle, checkpoint proposal, stop without merge.

## STOP CONDITION

Before bind:
`GMZ_IMPL_007_ADMISSION_READY_FOR_REVIEW`

After governed execution:
`GMZ_IMPL_007_READY_FOR_OBJECTIVE_AUDIT`


## Execution-base bind

- admission PR: `#68`
- admission audited head: `9abc2f690f035b41801662688cb6f7ab9e2e9f9a`
- admission merge / exact execution base: `1b64fbfbef3d31d215f4a2a1e30e88f8f946860c`
- execution branch: `execution/gmz-impl-007-catalog-core`
- stable source fingerprints at admission audit: `16 / 16 MATCH`
- assurance: `ELEVATED`
- executor/Codex: `AUTHORIZED FOR GMZ-IMPL-007 ONLY`
- merge authority: `NO`
- current production credit: `52 / 515 = 10.10%`
- maximum later eligible credit: `9 / 515`
- projected only after objective acceptance + merge + promotion: `61 / 515 = 11.84%`

STOP CONDITION:
`GMZ_IMPL_007_READY_FOR_OBJECTIVE_AUDIT`
