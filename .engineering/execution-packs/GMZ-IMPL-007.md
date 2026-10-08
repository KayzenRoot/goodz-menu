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


## GMZ-IMPL-007-CD-001 — Correction Execution Pack

Authorization source: objective review of `5e0712a0084126d39e0b36d9236892715e9c375b`.

### Decision-economy rule — Jev / TypeSafe

The executor has the TypeSafe/Jev skill and MCP installed. Use them to reduce expensive coding-model reasoning **only when the decision is atomic and structured**, for example:
- choose one option from a closed set;
- score candidates against a stated rubric;
- evaluate a narrow true/false proposition;
- classify or route a task before selecting a handler.

Prefer one batched Jev call for independent atomic questions. Use returned probabilities/confidence as routing evidence. If confidence is low, the state is underspecified, or the decision is security/auth/money/high-impact, Jev is advisory only: verify with deterministic repository evidence/tests and use the primary coding model for the required reasoning. Do **not** use Jev as a replacement for code generation, SQL authoring, multi-step reasoning, open-ended architecture, or final objective acceptance.

Repository truth, locked sources, tests and deterministic security proof outrank any model judgment.

### CD-001 execution order

1. Preflight exact branch/ancestry, Context Lock, `16 / 16 MATCH`, clean tree, `.gef` unchanged.
2. Correct establishment-scope containment in `catalog_scope_grants`.
3. Add positive and negative establishment-scoped catalog pgTAP proof; extend authenticated integration proof only if needed.
4. Explicitly revoke EXECUTE on exact `private.catalog_settle` and `private.catalog_settle_revision` signatures from `PUBLIC, anon, authenticated, service_role`.
5. Add deterministic privilege assertions proving the helpers cannot be invoked directly by `authenticated`.
6. Correct the reader E2E locator to a semantic button-role assertion.
7. Run focused proofs first.
8. Run complete ELEVATED L5 at the exact corrected implementation head.
9. Publish evidence, refresh hosted SonarCloud/Socket/CodeRabbit on the exact final head, leave PR open/draft.
10. Do not touch Issue #70 performance hardening in this delta.

If any correction requires widening runtime scope beyond the authorized write set, STOP `BLOCKED` and request a separate delta.

CD-001 STOP CONDITION:
`GMZ_IMPL_007_CD_001_READY_FOR_OBJECTIVE_AUDIT`.


### CD-001 execution result

Implementation HEAD `3151f7c9879e90175a2f2c81cccd1017f2b6d593` (tree
`e3b4b397a91b538fbbbd52cd6caf027c32024e13`) contains the authorized scope correction, private-helper
EXECUTE revocations and semantic E2E locator, with deterministic database and Auth/Data API regressions.
The full exact candidate ELEVATED L5 did not pass: latest E2E was `27 / 32` passed, `2` failed, `3` did
not run. The desktop catalog-feedback and mobile MFA QR failures are documented in the Evidence Bundle;
no unrelated code was changed. Other local gates and Docker/Supabase readiness passed. External hosted
checks are to be refreshed after publication. Outcome: `BLOCKED_FOR_OBJECTIVE_AUDIT`, not READY.


## GMZ-IMPL-007-CD-002 — E2E diagnosis-first execution pack

Authorization HEAD: `a6c853e4874b67ccefba558c7afd413463196065`.

### Mandatory JEV / TypeSafe decision-economy rule

Load the installed TypeSafe/Jev MCP and skill. Use Jev only when an independent question can be represented as closed-set Choice, Score or boolean/Noul classification, preferably batched. Use its confidence to triage/reroute inexpensive work; for security, auth, money or ambiguous runtime behavior the result is advisory and must be verified against source, real action responses and deterministic tests. Never use Jev instead of writing/debugging code, SQL, end-to-end reasoning, evidence validation or final review. Do not incur Jev API charges for trivia that requires no decision.

### Steps

D0. Preflight the exact authorized head, 16 fingerprints, branch/base, preserved `CHECKPOINT.json`/`.gef`, local Docker/Supabase health.

D1. Reproduce the two failures individually (no fixed sleeps/retry camouflage) and save *sanitized* request/response/status/trace diagnostics. Identify whether a true product defect, fixture conflict, auth-factor state, or timing/synchronization defect; don't assume.

D2. Correct the desktop catalog `Canal criado.` scenario in the smallest authorized test/fixture or catalog runtime path. Prove DB row identity and UI feedback together. No weaker success assertion.

D3. Correct mobile MFA only within authorized test/fixture scope if its cause is fixture/test synchronization. Do not touch MFA runtime/auth policy. If a true runtime defect is demonstrated, STOP `BLOCKED` for separate authorization.

D4. Run focused desktop channel creation >=3/3 and focused mobile MFA enrollment >=3/3 at an unchanged candidate SHA/tree.

D5. Run complete E2E both default workers and `--workers=1`, each 32/32. All Axe PASS, zero violations.

D6. Run complete exact-head ELEVATED L5 (including pgTAP, Auth/Data API, unit, build, migrations/types, Docker/local services, runtime logs, dependency guard, raw audit honesty, secrets, `.gef`).

D7. Triage all new SonarCloud CRITICAL/MAJOR code-smell issues individually by rule/file/severity/impact. Never silently waive an actionable blocking finding or mistake quality issues for security vulnerabilities. Require separate correction authorization if out of scope.

D8. Commit/push unchanged authorized branch, then obtain fresh Sonar/Socket and request real hosted CodeRabbit manual review despite PR draft. Update Evidence Bundle, Work Order and human checkpoint proposal; leave CHECKPOINT.json and credit unchanged.

STOP:
`GMZ_IMPL_007_CD_002_READY_FOR_OBJECTIVE_AUDIT`
