# GMZ-IMPL-006 — Execution Pack

Status: `BOUND_FOR_EXECUTION`

Execution branch: `execution/gmz-impl-006-durable-audit`  
Exact execution base: `2490ed590a6fb21f53d79b7ab7c93fee854c01ee`  
Executor: `GEF heavy executor / Codex`  
Merge authority: `NO`

## Mission

Create the durable audit substrate required before real business or privileged mutations are admitted. Preserve existing tenant authorization and stronger-auth boundaries.

## Closed decisions

- AuditEvent is GMZ-M23-owned.
- Audit rows are append-only and immutable.
- Direct browser/end-user audit mutation is forbidden.
- RLS remains enabled.
- Trusted write path is server-only.
- Service-role is permitted only if isolated inside the audit writer, never for tenant authorization or reads.
- No user-facing audit explorer in this slice.
- No business mutation is introduced.
- Admin Guard allow must not succeed if required durable audit persistence fails.
- Secrets/TOTP/tokens/passwords/authorization headers never enter audit payloads.
- Correlation IDs must join guard decision and persisted event.

## Execution DAG

### W0 — Preflight
Verify exact execution base, branch, clean tree, GEF 1.1.1, 16 fingerprints, governance snapshot, .gef integrity and local Supabase.

### W1 — Current Supabase privilege/RLS discovery
Revalidate current service-role/RLS/security-definer guidance for pinned Supabase tooling. Confirm the narrowest safe trusted writer design before mutation.

### W2 — Audit schema
Add the minimal AuditEvent migration with explicit scope/action/target/outcome/reason/correlation/source/timestamp and bounded metadata.

### W3 — Immutability + RLS
Enable RLS, deny direct end-user mutation and implement DB-level update/delete prevention.

### W4 — Server-only audit writer
Build a write-only application abstraction. If service-role is used, isolate construction/imports and prove it cannot reach client bundles/public env.

### W5 — Safe metadata
Implement allowlist/normalization/size limits and deterministic secret/credential rejection.

### W6 — Admin Guard persistence
Persist guard decisions with correlation. A would-be allow must fail closed if durable persistence fails.

### W7 — Security event minimum
Integrate only the minimum admitted security-setting event(s) necessary to prove the writer. Do not broaden account-management scope.

### W8 — DB / Data API matrix
Prove schema, RLS, direct mutation denial, cross-tenant denial, writer allow and privileged update/delete rejection.

### W9 — Regression
Run the complete existing Auth/session/RBAC/MFA/Admin Guard suites without weakening them.

### W10 — Runtime/security
Run generated types, lint/typecheck/unit/build, dependency/peer/secret checks, Docker, Supabase/Auth/Postgres, DB advisors and logs.

### W11 — Exact-head HIGH_ASSURANCE
Repeat the complete applicable suite at the final candidate.

### W12 — Evidence / PR
Update Evidence Bundle/checkpoint proposal, commit/push, update PR and stop for independent objective audit. No merge.

## Non-negotiable invariants

- audit persistence never grants authorization;
- no direct client audit mutation;
- no un-audited Admin Guard allow;
- no service-role browser/public-env exposure;
- no destructive audit rewrite;
- no secret/credential persistence;
- no business-domain expansion;
- no remote Supabase or production deployment;
- executor does not merge.

## STOP CONDITION

`GMZ_IMPL_006_READY_FOR_OBJECTIVE_AUDIT`


## GMZ-IMPL-006-CD-001 — correction execution

Status: `CORRECTION_REQUIRED`

### C0 — Re-preflight
Confirm PR #64, authorized branch, ancestry from execution base, 16/16 stable fingerprints, Context Lock correction binding, clean tree and unchanged .gef. Preserve production credit at 44/515.

### C1 — Advisory truth capture
Capture exact `pnpm audit`, production-only audit and `pnpm why/list` evidence for `braces`. Do not hide the raw HIGH result.

### C2 — Reachability proof
Verify the pinned Next ESLint plugin's `getRootDirs` semantics and prove Goodz's active ESLint flat configuration does not define `settings.next.rootDir`. Prove `braces` is dev-only and absent from the production dependency tree.

### C3 — Mechanical guard
Add the smallest deterministic repository guard that fails if an active ESLint config later introduces `settings.next.rootDir` or if the affected dependency becomes reachable from the production tree. Add only a script entry if required. No dependency/version/lockfile mutation.

### C4 — Security disposition
If and only if C1–C3 pass, record `GHSA-vfj7-8cjw-p6xm` as `RESOLVED_NOT_AFFECTED` with evidence. This resolves the finding for the Work Order without claiming the raw package-manager audit itself is clean. If proof fails, remain `BLOCKED`.

### C5 — Regression and exact-head L5
Run the correction guard, lint, frozen strict-peer install and the complete applicable GMZ-IMPL-006 HIGH_ASSURANCE suite. Confirm Next ESLint recommended rules remain active. Rerun external gates on the final published head.

### C6 — Evidence / stop
Update the existing Evidence Bundle and proposed Checkpoint Delta, commit/push to the same branch/PR and stop. No merge, no credit promotion.

Correction STOP CONDITION:
`GMZ_IMPL_006_CD_001_READY_FOR_OBJECTIVE_AUDIT`


## GMZ-IMPL-006-CD-002 — hosted-review correction execution

Status: `CORRECTION_REQUIRED`

### D0 — Re-preflight
Confirm branch/PR, ancestry, 16/16 fingerprints, Context Lock CD-002 binding, clean tree and unchanged .gef. Credit stays 44/515.

### D1 — Checkpoint human-summary correction
Update only the stale Active increment summary in `.engineering/CHECKPOINT.md` so historical pre-CD-001 BLOCKED state is not presented as current. Do not mutate CHECKPOINT.json.

### D2 — Bounded audit persistence
Add a 3-second abort boundary to the server-only append RPC. Preserve generic error handling and fail-closed semantics.

### D3 — Focused regression proof
Add/adjust the smallest deterministic test proving audit timeout/abort cannot return an allowed privileged decision. Keep existing durable-audit, RLS, metadata and correlation tests intact.

### D4 — FUTURE observation
Record retention/erasure/pseudonymization/tenant-offboarding as a prerequisite before production tenant admission. Do not change the audit migration or immutability in this delta.

### D5 — Exact-head HIGH_ASSURANCE
Rerun the complete applicable GMZ-IMPL-006 suite at final HEAD, including CD-001 guard and raw-audit disposition, then fresh hosted SonarCloud/Socket/CodeRabbit. Resolve actionable review threads only after proof passes.

### D6 — Evidence / stop
Update Evidence Bundle and Work Order closeout, commit/push to PR #64 and stop. No merge and no credit promotion.

STOP CONDITION:
`GMZ_IMPL_006_CD_002_READY_FOR_OBJECTIVE_AUDIT`
