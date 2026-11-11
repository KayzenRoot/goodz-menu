# GMZ-IMPL-007 — Execution Pack

Status: `ADMITTED / BOUND_FOR_EXECUTION`

Amendment: `GMZ-IMPL-007-CD-002`
Proposal branch: `codex/gmz-impl-007-cd-002-admission`
Proposal base: `556a9dbbcb3250b640c40fefe1ade0d5c425d871`
Execution branch: `execution/gmz-impl-007-catalog-core-bound-20a63ab`
Exact execution base: `20a63ab8baa6f0776224c104656e20d05be5d6b0`
Executor: `GEF heavy executor / Codex`  
Merge authority: `NO`

## Mission

Build the first Wave 1 catalog foundation only after this admission is objectively approved, merged, and rebound to the exact admission merge SHA.

## Closed decisions

- Product is canonical and channel-independent.
- Product owns its canonical name and text-first description; optional channel-specific title/description values are presentation overrides only.
- ProductVariant is subordinate canonical identity.
- ChannelOffer owns channel-specific price/availability/presentation.
- Price persistence is exact, not binary floating point.
- Price history must remain reconstructable.
- Only base price is admitted; promotional pricing, discounts, and promotion schedules are deferred to a future Work Order.
- RLS and current membership/RBAC remain the tenant authority.
- Direct ordinary-client catalog mutation is forbidden.
- Server-side catalog mutation uses current user authority, not service-role.
- Base-price/availability mutation requires existing Admin Guard + durable audit.
- Minimal catalog management UI is admitted.
- Modifiers/combos/media/provider sync/inventory/recipes/POS/orders/finance are deferred.

## Planned execution DAG after bind

### W0 — Preflight
Exact execution base/branch, Context Lock, all locked fingerprints, governance snapshot, clean tree, .gef.

### W1 — Current implementation discovery
Inspect existing migrations/RLS/RBAC/audit writer/app shell; revalidate current Supabase RLS/database guidance for the pinned tooling.

### W2 — Catalog schema
Implement ProductCategory/Product (including canonical name and text-first description)/ProductVariant/SalesChannel/ChannelOffer and minimal immutable/versioned price-history substrate with constraints/indexes.

### W3 — RLS and authorization
Tenant-safe SELECT, no direct ordinary-client mutation, current membership/RBAC scope, negative IDOR/cross-tenant proof.

### W4 — Server application contracts
Typed catalog queries/commands using user session authority and deterministic validation/errors/correlation.

### W5 — Privileged material mutations
Base-price/availability mutations through existing Admin Guard; durable audit required and fail-closed. No promotional-price, discount, or promotion-schedule path is admitted.

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

`GMZ_IMPL_007_READY_FOR_OBJECTIVE_AUDIT`
