# GMZ-IMPL-003 — Execution Pack

Status: `ADMISSION_CANDIDATE`

## Mission

Create the smallest production-grade membership/RBAC foundation that can safely open authenticated READ access to the promoted tenant hierarchy.

Do not implement the whole Auth/Admin surface.

## Closed decisions

- Supabase Auth identity is the authentication identity source.
- Authentication alone grants no tenant access.
- Canonical DB membership + role/permission + resource scope is authorization truth.
- Do not use `user_metadata` for authorization.
- JWT custom claims are not the primary authority in this slice.
- Tenant roles do not imply platform authority.
- Existing RLS remains on.
- Only membership-aware SELECT is admitted on Organization/Establishment/Branch.
- Authenticated tenant hierarchy writes remain closed.
- Membership/RBAC self-service writes remain closed.
- MFA/Admin Guard/platform admin/login UI are deferred.
- local-only Supabase; remote operations forbidden.

## Execution DAG

### W0 — Preflight
Validate repository, branch, execution-base SHA, clean tree, GEF 1.1.1, 16 stable source fingerprints, checkpoint state, current migration/runtime topology and local Supabase status.

### W1 — Current interface discovery
Inspect pinned Supabase CLI/package behavior and current official Auth/RLS guidance. Do not cargo-cult outdated SSR/JWT patterns.

### W2 — Migration design
Create migration via current supported CLI. Implement membership/RBAC physical model with DB-enforced organization/scope integrity.

### W3 — Authorization helpers
Implement only helpers objectively needed by policies. Security-definer helpers must have controlled search path, least execution privilege and negative proof.

### W4 — RLS transition
Keep RLS enabled. Grant only the table operation needed for admitted authenticated reads and enforce membership + permission + resource scope in policies. anon remains denied. Writes remain denied.

### W5 — Synthetic authz fixtures
Create deterministic local test identities and role/membership fixtures without real data or reusable production secrets.

### W6 — Security matrix
Prove positive and negative authorization behavior:
- no identity;
- no membership;
- inactive membership;
- wrong tenant;
- no permission;
- branch-limited;
- org-wide;
- escalation/write attempts.

### W7 — Data API/Auth integration
Exercise local Auth/Data API with synthetic authenticated identities so RLS proof is not solely privileged SQL simulation.

### W8 — Generated types
Use the accepted failure-safe `pnpm supabase:types` workflow, canonical formatting and equivalence check.

### W9 — Existing regressions
Run current unit/lint/typecheck/build/E2E, GMZ-IMPL-002 pgTAP, Docker/health/readiness, audit/security checks.

### W10 — Exact-head HIGH_ASSURANCE
Repeat the complete applicable suite at final candidate head after all corrections.

### W11 — Evidence / PR
Update evidence, commit/push, keep PR open for separate objective audit. Executor never merges.

## Design invariants

- `auth.uid() IS NOT NULL` must be intentional in policies/helpers.
- canonical membership status is checked on authorization.
- active membership alone is insufficient where the policy requires a permission.
- role assignment scope cannot point outside its membership organization.
- branch scope cannot silently become organization-wide.
- no authenticated actor can assign itself a role or modify permission mappings in this slice.
- role/permission tables are not a covert Platform Admin plane.
- helper functions never become arbitrary tenant-enumeration APIs.
- future MFA/Admin Guard remains possible without destructive redesign.

## Failure rules

Never make a security test pass by:
- disabling RLS;
- using service-role in client/runtime;
- granting broad ALL/CRUD;
- trusting `user_metadata`;
- bypassing membership status;
- converting tenant RBAC into app-side-only filtering;
- weakening cross-organization constraints.

## Evidence minimum

Record:
- exact base/final head;
- migration files;
- authorization tables/constraints;
- grants/policies/functions;
- execution privileges;
- synthetic identity strategy;
- full positive/negative matrix;
- pgTAP counts;
- Data API/Auth integration result;
- generated-type result;
- DB lint/advisor;
- current app regression;
- dependency/secret checks;
- Docker/Supabase health;
- SonarCloud/Socket/CodeRabbit;
- CRITICAL/HIGH inventory;
- rollback/recovery note;
- explicit deferred capabilities;
- credit eligibility.

## STOP CONDITION

`GMZ_IMPL_003_READY_FOR_OBJECTIVE_AUDIT`
