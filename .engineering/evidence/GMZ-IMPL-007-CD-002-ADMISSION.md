# GMZ-IMPL-007-CD-002 — Scope Reconciliation Admission Evidence

Status: `PROPOSED / GOVERNANCE-ONLY / INDEPENDENT AUDIT PENDING`

## Identity

- Repository: `KayzenRoot/goodz-menu`
- Existing Work Order / issue: `GMZ-IMPL-007` / `#67`
- Correction Delta: `GMZ-IMPL-007-CD-002`
- Assurance: `ELEVATED`
- Proposal branch: `codex/gmz-impl-007-cd-002-admission`
- Exact proposal base: `556a9dbbcb3250b640c40fefe1ade0d5c425d871`
- Proposal base tree: `a7413fc512bc084766a4f7d0fbf2c47ce9c04da0`
- Accepted Scope decision source: PR #76 merge `556a9dbbcb3250b640c40fefe1ade0d5c425d871`

## Purpose and bounded change

The accepted GMZ-CSD-002 Scope defers promotional pricing. The active GMZ-IMPL-007 admission candidate still includes promotional-price fields, validation, history, privileged actions, and tests. This delta proposes a governance-only amendment to remove that conflict before any execution bind.

Changed paths in this proposal:

- `.engineering/work-orders/GMZ-IMPL-007.md`
- `.engineering/execution-packs/GMZ-IMPL-007.md`
- `.engineering/evidence/GMZ-IMPL-007-CD-002-ADMISSION.md`

No runtime code, schema, migration, generated type, test, `CHECKPOINT.json`, Context Lock, `.gef`, issue body, or PR #69 file is changed. No implementation, credit, checkpoint promotion, deployment, remote Supabase use, or merge of the legacy implementation candidate is authorized by this proposal.

## Exact source and lock reconciliation

- Current `main` Checkpoint status: `GMZ_IMPL_007_ADMISSION_CANDIDATE_READY_FOR_REVIEW`.
- Current `implementationAuthorized`: `false`; `executionBaseSha`: `null`.
- Existing Context Lock `codexAllowed`: `false`; `executionBaseSha`: `null`.
- Existing Context Lock admission base remains historical `f98b54a2a933e1cf312575a571afb57566422d82`.
- Of its 16 pinned stable sources, 15 match current `main`; `docs/source-pack/SCOPE.md` changed from blob `88c516753fabf67e67bbec25df3efc70b0c6bfa8` to `b6aa3380cfc344813b0d58cffd549cbc3d9c339c`.
- Its governance snapshot pins Checkpoint blob `789223da901d9c0415da82bf5d8cb781d9d486e4`, while current `main` has Checkpoint blob `77b8b2a7dc88d1d97f01e5889f8bf5d2d40a95e8`.
- Current Decisions Ledger blob at proposal base: `bf34c92e7c80562dbf5b552fe3830551010b44ab`.

| Lock input | Pinned value | Current proposal-base value | Result |
|---|---|---|---|
| `docs/source-pack/SCOPE.md` | `88c516753fabf67e67bbec25df3efc70b0c6bfa8` | `b6aa3380cfc344813b0d58cffd549cbc3d9c339c` | `STALE` |
| `.engineering/CHECKPOINT.json` governance snapshot | `789223da901d9c0415da82bf5d8cb781d9d486e4` | `77b8b2a7dc88d1d97f01e5889f8bf5d2d40a95e8` | `STALE` |
| Other 15 pinned stable sources | exact per existing Context Lock | unchanged at proposal base | `MATCH` |

The existing `.engineering/evidence/GMZ-IMPL-007-ADMISSION.md` remains as a historical record of the old admission inputs; it is not replaced or represented as current evidence.

The existing Context Lock is stale and remains non-authorizing. This proposal does not rewrite it. A fresh Context Lock and exact execution-base bind require a separate approved action after the corrected Work Order passes its admission audit and is promoted.

## Scope alignment and retained limits

- The catalog slice retains canonical Product/ProductVariant identity, categories, manual text-first descriptions, text labels for size/flavor variants, ChannelOffer base price and availability, tenant isolation, current RBAC, Admin Guard for base-price/availability changes, durable audit, and minimal accessible catalog management.
- Availability remains internal catalog state for this slice; missing/uncertain state fails closed to unavailable. Public use, the named responsible operator, and update cadence remain future M10/M11 Work Order decisions.
- Promotional price, discounts, promotion schedules, promotional history/authorization/UI/tests, add-ons, combos, custom media runtime, recipes, inventory, POS, orders, finance, provider sync, remote Supabase, and production deployment remain outside this Work Order.
- Existing project credit remains `52 / 515`; this correction assigns and earns no credit. Any later slice credit remains subject to independent audit, accepted evidence, merge, and governed promotion.
- Open CSD-002 operating decisions remain unresolved for separate Work Orders, including settings allowlist, named availability operator/cadence, order lifecycle, handoff-payment policy, privacy/retention, and production provider/domain/configuration/backup/recovery/rollback.
- The human keyboard, real-zoom, screen-reader, and visual sign-off for GMZ-REBOOT-001 remains pending.

## Legacy implementation candidate

At the proposal base, PR #69 was open and draft at head `35862001485ca2221f126ef0a1fb0c279d2b02b7`, based on historical commit `1b64fbfbef3d31d215f4a2a1e30e88f8f946860c`. It is not an execution authorization or source of current evidence. This correction neither edits nor closes PR #69 and does not authorize cherry-picking or merging its implementation. Any future implementation must start from a newly admitted exact base after a fresh lock/bind.

## Validation and review

- `git diff --cached --check`: `PASS` for all three staged proposal files.
- Runtime tests, lint, typecheck, build, and Docker/Supabase checks: `NOT RUN` — this is a governance-only proposal with no executable changes.
- Independent exact-head review: `PENDING`.
- Source comparison: read `.engineering/context-locks/GMZ-IMPL-007.json`; for each `lockedSources[].path`, compare its `gitBlobSha` with `git rev-parse HEAD:<path>`, and compare `governanceSnapshot.checkpointGitBlobSha` with `git rev-parse HEAD:.engineering/CHECKPOINT.json`.
- Deterministic result at base `556a9dbbcb3250b640c40fefe1ade0d5c425d871`: 15/16 locked sources match; Scope is stale; the separate Checkpoint governance snapshot is stale.
- Current status: remain draft until the proposal diff and evidence pass independent review; then stop at `GMZ_IMPL_007_CD_002_ADMISSION_READY_FOR_REVIEW`.

## Stop condition

`GMZ_IMPL_007_CD_002_ADMISSION_READY_FOR_REVIEW`

Reaching this token means only that this governance proposal is ready for independent audit. It does not authorize admission promotion, Context Lock replacement, execution, checkpoint promotion, merge, or deployment.
