# GMZ-IMPL-004 — Execution Pack

Status: `ADMISSION_CANDIDATE`

## Mission

Create the smallest production-grade login/session/tenant-entry path that uses the promoted GMZ-IMPL-003 authorization boundary instead of replacing it.

Do not implement the whole Auth/Admin surface.

## Closed decisions

- Supabase Auth remains authentication identity source.
- Canonical DB membership/RBAC/RLS remains tenant authorization truth.
- Authentication alone grants no tenant access.
- No `user_metadata` tenant authority.
- No custom JWT role claim as primary tenant authority.
- No service-role use in end-user application paths.
- Local Supabase only.
- Login + session entry + logout are admitted.
- Signup/onboarding/recovery/MFA/Admin Guard/Platform Admin are deferred.
- No business-domain CRUD.

## Execution DAG

### W0 — Preflight
Validate repository/account, exact execution base, branch, clean tree, GEF 1.1.1, 16 locked source fingerprints, governance snapshot, package/runtime topology and local Supabase status.

### W1 — Current Auth/SSR guidance discovery
Inspect pinned Next.js and the current supported Supabase application Auth/SSR guidance. Select the smallest supported dependency set and exact versions. Do not cargo-cult obsolete session patterns.

### W2 — Auth client boundaries
Create explicit server/browser/request-refresh utilities with clear trust boundaries. Server protected entry must validate identity through the supported server Auth verification path.

### W3 — Login surface
Build a minimal accessible login page matching the existing Goodz shell. Implement generic invalid-credential handling and safe navigation.

### W4 — Session lifecycle
Implement the supported cookie/session refresh lifecycle and logout. Avoid token/secret logging and open redirects.

### W5 — Protected tenant entry
Create protected tenant entry that denies unauthenticated users and derives visible tenant context only through promoted membership/RBAC/RLS.

### W6 — Negative authorization/session matrix
Prove unauthenticated denial, bad credentials, no active membership, suspended/revoked membership, expired/revoked session, wrong-tenant isolation and logout denial.

### W7 — Existing authorization regression
Run the complete GMZ-IMPL-003 pgTAP and local Auth/Data API suites without weakening them.

### W8 — UI/E2E/accessibility
Prove login and tenant entry on desktop/mobile with Axe accessibility and reduced-motion compatibility.

### W9 — Runtime/security regression
Run lint/typecheck/unit/build, dependency/peer/secret checks, Docker, health/readiness, local Supabase/Auth/Postgres and logs.

### W10 — Exact-head HIGH_ASSURANCE
Repeat the complete applicable suite at final candidate head after all corrections.

### W11 — Evidence / PR
Update evidence and checkpoint proposal, commit/push and keep PR open for separate objective audit. Executor never merges.

## Design invariants

- authenticated identity != tenant authorization;
- browser/client values never select authority by themselves;
- tenant visibility remains bounded by canonical DB membership/RBAC/RLS;
- no stale session is accepted merely because UI state says signed in;
- no service-role key is exposed;
- token/password values never appear in evidence/logs;
- no open redirect;
- no implicit platform authority;
- future MFA/Admin Guard remains compatible.

## Failure rules

Never make tests pass by disabling RLS, using service-role for end-user access, trusting user metadata/tenant query params as authority, weakening existing GMZ-IMPL-003 negative tests, skipping session-revocation proof, or widening scope to signup/admin/business domains.

## Evidence minimum

Record exact base/final head, dependency versions/delta, auth utility boundaries, session-refresh design, login/logout/protected-route behavior, real local Auth integration, tenant authorization path, negative matrix, unit/E2E/Axe counts, pgTAP/Auth-Data regression counts, audit/peer/secret checks, Docker/Supabase health, SonarCloud/Socket/CodeRabbit, CRITICAL/HIGH inventory, deferred capabilities and credit eligibility.

## STOP CONDITION

`GMZ_IMPL_004_READY_FOR_OBJECTIVE_AUDIT`
