# GMZ-IMPL-005 — Execution Pack

Status: `ADMISSION_CANDIDATE`

## Mission

Add stronger authentication and reusable privileged-action protection on top of the promoted Auth/session/RBAC/RLS baseline. Do not introduce real business or platform-admin mutations.

## Closed decisions

- Supabase Auth remains identity and MFA provider.
- AAL2 is an assurance predicate, not authorization.
- Canonical membership/RBAC/resource scope remains authority.
- Goodz Admin Guard executes server-side.
- Privileged freshness is bounded and server-trusted.
- User metadata/custom claims cannot grant tenant privilege.
- No service-role in browser/end-user paths.
- Local Supabase only.
- Synthetic privileged action is used for proof.
- Platform Admin/support/owner-transfer/business mutations remain deferred.

## Execution DAG

### W0 — Preflight
Verify repository, exact execution base, branch, clean tree, GEF 1.1.1, 16 fingerprints, checkpoint snapshot, .gef integrity and local Supabase.

### W1 — Current MFA API discovery
Verify current official Supabase MFA enrollment/challenge/verify/AAL guidance for the pinned dependency versions before coding.

### W2 — Assurance primitives
Create server-trusted helpers for current assurance level, required AAL and privileged freshness.

### W3 — MFA enrollment
Implement minimal local TOTP enrollment flow. Keep QR/secret data out of logs/evidence.

### W4 — Challenge / verification / step-up
Implement challenge and verification flow with generic failure behavior and safe navigation.

### W5 — Goodz Admin Guard
Compose server Auth identity + fresh canonical authorization + AAL requirement + freshness window into a reusable deny-by-default guard.

### W6 — Synthetic privileged action
Add a non-business local protected action/page solely to exercise the guard. No tenant/business mutation.

### W7 — Security event proof
Emit or capture audit-safe decision metadata without credentials, tokens, factors or codes.

### W8 — Negative matrix
Prove unauthenticated, AAL1, stale freshness, insufficient role/scope, suspended/revoked membership, invalid factor/challenge and logout/revocation denial.

### W9 — Existing regression
Run GMZ-IMPL-003 and GMZ-IMPL-004 complete regression suites without weakening them.

### W10 — UI/E2E/accessibility
Validate MFA/step-up flows desktop/mobile and Axe.

### W11 — Runtime/security validation
Run lint/typecheck/unit/build, dependency/peer/secret checks, Docker, health/readiness, Supabase/Auth/Postgres and logs.

### W12 — Exact-head HIGH_ASSURANCE
Repeat the complete applicable suite after all corrections.

### W13 — Evidence / PR
Update evidence/checkpoint proposal, commit/push and stop for separate objective audit. No merge.

## Non-negotiable invariants

- AAL2 never bypasses authorization.
- Authorization never assumes MFA.
- Browser-supplied role/tenant/AAL/freshness values are untrusted.
- Guard failure always denies.
- Secrets and OTP codes never enter logs/evidence.
- No service-role browser exposure.
- No business-domain mutation.
- No platform/support authority expansion.
- Executor does not merge.

## STOP CONDITION

`GMZ_IMPL_005_READY_FOR_OBJECTIVE_AUDIT`
