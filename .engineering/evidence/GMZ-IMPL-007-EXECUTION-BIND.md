# GMZ-IMPL-007 — Exact Execution Bind

Status: `BOUND_FOR_EXECUTION`

## Identity and authority

- Repository: `KayzenRoot/goodz-menu`
- Work Order / issue: `GMZ-IMPL-007` / `#67`
- Assurance: `ELEVATED`
- Maintainer authorization: bind and execute only GMZ-M06 Catalog (`7`) and GMZ-M26 Validation (`2`) under this Work Order.
- This bind earns no completion credit and grants no authority to merge implementation code, promote earned credit, use remote Supabase, or deploy.

## Admission audit and merge

- Admission PR: `#77`.
- Reviewed base/head: `556a9dbbcb3250b640c40fefe1ade0d5c425d871` / `6fce15cc60b445904d19cc9db003d602926fb98a`.
- Independent disposition: `APPROVED_FOR_MAINTAINER_DECISION`; no CRITICAL/HIGH finding and no scope-alignment defect.
- Durable review readback: PR #77 comment `#6795017886`.
- Merge: `985151f62be6cb26a67bc1c70fac4b7eaf831bd5`.
- Reviewed and merged tree: `39db3c7c3a62a9ce2c2c89fc89f6c52742dab729`.

## Exact execution base

- Authorized base: `20a63ab8baa6f0776224c104656e20d05be5d6b0`.
- Base branch at bind: `main`.
- Executor branch: `execution/gmz-impl-007-catalog-core-bound-20a63ab`.
- The executor branch is created directly from the authorized base and this bind commit is its first governance change.
- The admission source is PR #77; legacy PR #69 and branches `implementation/gmz-impl-007-catalog-core` / `execution/gmz-impl-007-catalog-core` are not execution sources and will not be cherry-picked.

## Fingerprint reconciliation

- The prior Context Lock did not authorize execution: only `13 / 16` stable source fingerprints matched the authorized base, and its Checkpoint governance snapshot was stale.
- The replacement Context Lock records all `16 / 16` stable source blobs at the exact base above.
- It pins the bind-branch Checkpoint JSON blob and records `GMZ_IMPL_007_BOUND_FOR_EXECUTION`.
- `.gef/**`, Source Pack content, approved Scope and Decisions Ledger are not edited by this bind.

## Bound limits

- Admitted scope: canonical ProductCategory/Product/ProductVariant/SalesChannel/ChannelOffer, exact base price and internal availability, tenant-safe RLS/RBAC, Admin Guard, durable audit, minimal catalog UI, and validation necessary for the same slice.
- Maximum eventual credit remains `9 / 515` (GMZ-M06 `7`, GMZ-M26 `2`); current credit remains `52 / 515` until separate objective acceptance, code merge and governed promotion.
- Promotional pricing, discounts, promotion schedules, modifiers, combos, media runtime, inventory, recipes, POS, orders, finance, provider sync, remote Supabase and production deployment remain excluded.
- Executor may not merge the implementation PR or promote the Checkpoint.

## Pre-mutation checks

- Repository and branch identity: `PASS`.
- Clean tree at authorized base: `PASS`.
- Exact base equality with the current `origin/main` before bind: `PASS`.
- Context Lock stable sources after rebind: `16 / 16 MATCH`.
- Checkpoint JSON blob: `279d6974b9a30c7393e2de568aa37941df783ced`.
- Context Lock JSON blob: `d1a78f16a53c77986c8b81260f57ba7e366a52c2`.
- Checkpoint snapshot equals the bound Checkpoint JSON blob: `PASS`.
- `.gef` integrity: unchanged.

STOP CONDITION: `GMZ_IMPL_007_READY_FOR_OBJECTIVE_AUDIT`.
