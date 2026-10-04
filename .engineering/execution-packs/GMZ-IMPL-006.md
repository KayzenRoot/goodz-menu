# GMZ-IMPL-006 — Execution Pack

Status: `ADMISSION_CANDIDATE`

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
