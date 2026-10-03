# GMZ-IMPL-004 — Auth Session & Tenant Entry Foundation

Status: `EXECUTION COMPLETE / READY_FOR_OBJECTIVE_AUDIT`
Issue: `#52`
Assurance: `HIGH_ASSURANCE`
Admission branch: `implementation/gmz-impl-004-auth-session-entry`

## OBJECTIVE

Implement the smallest production-grade user-facing authentication/session slice that can safely enter the already promoted tenant authorization boundary.

This Work Order is a partial GMZ-M02 slice. It MUST NOT claim the complete Identity/Auth/RBAC/Admin Guard module.

The intended result is a real local login/session path whose tenant access is still decided by canonical database membership/RBAC/RLS from GMZ-IMPL-003.

## CONTEXT

Promoted baseline:
- GMZ-IMPL-001 runtime/UI/Docker foundation: promoted;
- GMZ-IMPL-002 Organization → Establishment → Branch tenant hierarchy: promoted;
- GMZ-IMPL-003 membership/RBAC/read-authorization foundation: promoted;
- production credit: `31 / 515 = 6.02%`;
- current app has no product login/session entry implementation;
- Next.js runtime is pinned to `16.3.8`;
- local Supabase CLI exists, but application Auth client/session packages are not yet part of runtime dependencies.

Canonical rules:
- Supabase Auth identity is separate from tenant membership;
- authentication alone never authorizes tenant data;
- canonical DB membership + role/permission + resource scope remains tenant authorization truth;
- user-editable metadata/custom claims never become primary tenant authority;
- exposed tenant data remains protected by RLS;
- platform authority is separate and not admitted here.

## SCOPE

### NECESSARY / admitted

1. Current supported Supabase Auth SSR/session integration for the pinned Next.js App Router runtime.
2. Minimal user-facing login surface using email/password against local Supabase Auth.
3. Server-side authenticated identity validation before protected tenant entry.
4. Supported request/cookie session-refresh lifecycle for the pinned Next.js version.
5. Logout/sign-out flow.
6. Protected authenticated tenant-entry route/shell.
7. Safe state for authenticated identities with no active authorized membership.
8. Authorized tenant context must be obtained through existing promoted membership/RBAC/RLS behavior.
9. Multi-membership behavior must not enumerate or leak unauthorized tenant records.
10. Session expiration/revocation must fail closed.
11. Suspended/revoked membership must stop tenant access on fresh authorization evaluation without requiring privilege claims in user metadata.
12. Existing GMZ-IMPL-003 authorization regressions remain green.
13. Minimal accessible login/session UI consistent with the promoted Goodz design shell.
14. Exact dependency additions only when objectively necessary for supported Supabase application Auth/SSR behavior, pinned and lockfile-controlled.

### IMPORTANT but deferred

- password recovery;
- invitations;
- user profile/preferences;
- richer tenant switcher UX;
- remember-device/session inventory;
- MFA enrollment UI.

### OUT OF SCOPE

- self-service signup/onboarding;
- invitation lifecycle;
- password reset/recovery UX;
- MFA/AAL2 enforcement;
- Platform/Super Admin;
- Goodz Admin Guard;
- support mode;
- owner transfer;
- role/membership management UI or API;
- tenant hierarchy/business writes;
- POS/catalog/orders/inventory/finance;
- service-role use in web/client runtime;
- custom JWT role claims as primary authorization;
- remote Supabase;
- production deployment;
- unrelated cleanup/refactor.

## FILES / SOURCES TO READ

Mandatory before mutation:
1. `.engineering/CHECKPOINT.json`
2. `.engineering/CHECKPOINT.md`
3. `.engineering/SOURCE-HIERARCHY.md`
4. `.engineering/DECISIONS-LEDGER.md`
5. `.engineering/MODULE-MAP.md`
6. `.engineering/DATA-OWNERSHIP-MATRIX.md`
7. `.engineering/SECURITY-CONTROL-MATRIX.md`
8. `.engineering/TEST-COVERAGE-MATRIX.md`
9. `.engineering/LOCAL-DOCKER-CONTRACT.md`
10. `docs/source-pack/SCOPE.md`
11. `docs/source-pack/REQUIREMENTS.md`
12. `docs/source-pack/ARCHITECTURE.md`
13. `docs/source-pack/DATA-MODEL.md`
14. `docs/source-pack/SECURITY.md`
15. `docs/source-pack/TEST-BENCHMARK-PLAN.md`
16. `docs/source-pack/DEFINITION-OF-DONE.md`
17. `docs/source-pack/DEPLOYMENT.md`
18. `docs/source-pack/UI-UX-DESIGN-SYSTEM.md`
19. GMZ-IMPL-003 Work Order, Context Lock and Evidence Bundle
20. current `package.json`, app routes/components and Supabase configuration.

## REQUIREMENTS

Primary:
- GMZ-REQ-PLAT-002 — Tenant-safe authorization;
- GMZ-REQ-SEC-001 — Least privilege;
- GMZ-REQ-SEC-002 — Tenant isolation proof;
- GMZ-REQ-SEC-003 — stronger authentication for sensitive actions remains compatible, but no high-risk admin action is admitted in this slice;
- GMZ-REQ-SEC-004 — auditability where this slice creates material auth/session events;
- applicable governance/validation requirements.

Functional requirements:
1. unauthenticated protected entry is denied and routed to the login surface;
2. invalid credentials produce a generic user-safe error;
3. successful local sign-in establishes the supported session path;
4. protected server code validates authenticated identity using the current supported server-side Auth verification path, not client state alone;
5. authenticated identity without active tenant membership receives no tenant records;
6. active authorized membership permits only existing RLS-authorized tenant context;
7. suspended/revoked membership loses tenant visibility on fresh evaluation;
8. logout removes effective authenticated access and protected entry fails afterward;
9. session refresh/expiry paths cannot silently retain stale tenant access;
10. no token/secret/password is logged or rendered;
11. no open redirect is introduced by post-login navigation.

## ARCHITECTURE RULES

- Authentication is not authorization.
- Supabase Auth remains identity source.
- Membership/Role/Permission remain owned by GMZ-M02.
- Organization/Establishment/Branch remain owned by GMZ-M01.
- Existing RLS is authoritative for exposed tenant rows.
- No service-role credential in application/client runtime.
- Server-side protected entry must validate identity through the supported Supabase Auth server path.
- Do not trust a browser-supplied user ID, tenant ID, role, user_metadata, or stale client session as authorization truth.
- Session-refresh integration must follow the current supported pattern for pinned Next.js + Supabase packages discovered at execution time.
- New Auth dependencies must be minimal, exact/pinned and justified.
- Future MFA/Admin Guard must remain addable without destructive redesign.

## CONSTRAINTS

- implementation branch must descend from the exact post-admission execution base;
- GEF 1.1.1 preflight required;
- locked sources must match before mutation;
- local Supabase only;
- no production credentials;
- no force-push/history rewrite;
- no merge by executor;
- no migration/schema change unless a directly demonstrated blocker proves it necessary and a Correction Delta is approved; default is NO schema change;
- no broadening existing hierarchy write grants;
- no unrelated package upgrades.

## ACCEPTANCE CRITERIA

1. current supported Auth application dependencies are pinned and lockfile reproducible if added.
2. login page is accessible, responsive and consistent with the existing shell.
3. invalid login does not disclose whether an account exists beyond provider-safe generic behavior.
4. valid local synthetic credentials can sign in through the real Auth endpoint.
5. protected tenant-entry route is inaccessible without valid server-validated identity.
6. authenticated no-membership user receives safe no-access/empty tenant state.
7. authorized organization-scoped user sees only admitted tenant hierarchy.
8. establishment/branch scope remains bounded by existing RLS.
9. suspended/revoked membership denies tenant entry on fresh evaluation.
10. logout invalidates the app entry path.
11. stale/expired/revoked session path fails closed.
12. tokens, passwords and secret material are absent from logs/UI/evidence.
13. no service-role credential is bundled or used.
14. existing pgTAP `125/125` baseline remains green or is deterministically updated only for directly admitted proof without weakening assertions.
15. existing local Auth/Data authorization `50/50` baseline remains green.
16. unit/lint/typecheck/build pass.
17. E2E covers login, protected-route denial, successful authorized entry, no-membership denial/state, logout and at least one revoked/suspended path.
18. desktop/mobile accessibility checks remain green.
19. Docker health/readiness and local Supabase/Auth/Postgres remain healthy.
20. dependency audit, peer checks, secret scan, SonarCloud, Socket and CodeRabbit gates pass.
21. no CRITICAL/HIGH unresolved finding.
22. exact-head Evidence Bundle proves all acceptance criteria.
23. PR remains open for separate objective audit; executor does not merge.

## TESTS

Minimum:
- focused unit tests for auth/session helpers and redirect/error guards;
- existing unit suite;
- lint;
- typecheck;
- production build;
- E2E desktop/mobile;
- Axe on login and protected entry;
- local Supabase Auth real sign-in integration;
- existing pgTAP full suite;
- existing Auth/Data authorization integration;
- session expiry/revocation negative proof;
- suspended/revoked membership negative proof;
- dependency audit + peer validation;
- secret-pattern scan;
- Docker config/build/up;
- health/readiness;
- local Supabase/Auth/Postgres status;
- runtime log scan;
- SonarCloud;
- Socket;
- CodeRabbit;
- exact-head HIGH_ASSURANCE rerun after all corrections.

## DELIVERABLES

- supported local Auth session integration;
- login UI;
- logout;
- protected tenant-entry shell;
- required tests;
- dependency/lockfile changes only if necessary;
- GMZ-IMPL-004 Evidence Bundle;
- updated Work Order/checkpoint at executor closeout;
- PR against `main`.

## REVIEW FORMAT

Português brasileiro:
- exact base/head SHA;
- files/components changed;
- dependency delta;
- auth/session architecture;
- protected route behavior;
- tenant/RLS behavior;
- positive/negative identity matrix;
- tests with counts;
- security findings by severity;
- limitations/deferred scope;
- proposed Checkpoint Delta;
- explicit `READY_FOR_OBJECTIVE_AUDIT` or blocker.

## PREDECLARED CREDIT

Maximum after objective acceptance + implementation merge + promotion only:
- GMZ-M02: `5`
- GMZ-M26: `2`
- increment max: `7 / 515`
- current earned: `31 / 515 = 6.02%`
- projected if fully accepted: `38 / 515 = 7.38%`

This does not mark GMZ-M02 complete. The remaining GMZ-M02 weight is reserved for later stronger-auth / privileged-admin capabilities.

## STOP CONDITION

Admission stage:
`GMZ_IMPL_004_ADMISSION_READY_FOR_REVIEW`

Execution stage after governed admission promotion and execution-base bind:
`GMZ_IMPL_004_READY_FOR_OBJECTIVE_AUDIT`


## EXECUTION-BASE BIND

- admission PR: `#53`
- admission disposition: `APPROVED_FOR_ADMISSION_PROMOTION`
- exact execution base: `e43d4b791b9bcabf806d115424218a4b0240647c`
- execution branch: `execution/gmz-impl-004-auth-session-entry`
- Context Lock: `BOUND_FOR_EXECUTION`
- stable source fingerprints: `16 / 16 MATCH`
- executor/Codex authorization: `YES, GMZ-IMPL-004 ONLY`
- merge authority: `NO`
- production credit remains `31 / 515 = 6.02%`

The executor must inspect the repository before mutation, execute the complete Work Order, run the HIGH_ASSURANCE evidence suite, correct failures introduced by the increment, commit/push to this execution branch, update the same PR, and stop for separate objective audit.

STOP CONDITION:
`GMZ_IMPL_004_READY_FOR_OBJECTIVE_AUDIT`


## EXECUTION CLOSEOUT — GMZ-IMPL-004

- execution base: `e43d4b791b9bcabf806d115424218a4b0240647c`
- execution branch: `execution/gmz-impl-004-auth-session-entry`
- Sonar correction commit: `ace5ec51ae4c164ac4472b411177b52616105f32`
- exact-head L5 validation candidate after all code, runbook and checkpoint corrections: `6c4f6a378cdedba141c6772c672f8cecc5498c0f`
- PR: `#54` against `main`, remains open/draft; the final published exact head and its fresh remote check results are recorded in the PR description after push
- Context Lock: `BOUND_FOR_EXECUTION`; stable fingerprints `16/16 MATCH`
- local Auth identity validation uses Supabase SSR `getUser()` on protected server entry; tenant rows remain selected without client tenant filters through the existing anon-key/RLS boundary
- result: login, cookie/session refresh, logout and protected tenant-entry slice implemented; no schema, migration, RLS, policy or business-domain change
- complete local exact-head HIGH_ASSURANCE L5 at `6c4f6a3`: frozen strict-peer install, lint, typecheck, unit `13 / 13`, production build, E2E `20 / 20` across desktop/mobile, Axe `8 / 8` scans with `0` violations, Supabase reset, pgTAP `125 / 125`, Auth/Data API `50 / 50`, migration status, DB lint/advisors, dependency audit, secret-pattern scan, Docker build/up/health, local health/readiness/Auth/Postgres, runtime logs, and `.gef` integrity: `PASS`; the earlier transient mobile feedback-preview miss at `97eff37` passed in isolation and in immediate full rerun, with no source change
- native local Auth runbook now obtains loopback Supabase status and keeps the public anon key only in the `pnpm dev` process environment; the guard was exercised without exposing key material
- CodeRabbit local deep review of the complete diff at `0a4a4a8`: `0 findings`; it corrected the native Auth runbook gap. An earlier request to restore PR `#49` as next action conflicted with current checkpoint state and GMZ-IMPL-003 promotion history and was not applied
- SonarCloud and Socket at `6c4f6a3`: PASS; Sonar Quality Gate `OK`, zero hotspots and one retained minor SQL-fixture code smell; both Socket checks pass. The final evidence-only commit is followed by a new exact-head suite, with its final SHA and remote checks recorded in PR `#54`
- validation details: `.engineering/evidence/GMZ-IMPL-004-EVIDENCE.md`
- current earned credit remains `31 / 515 = 6.02%`; no credit is claimed before separate objective acceptance and promotion
- proposed checkpoint state: `GMZ_IMPL_004_READY_FOR_OBJECTIVE_AUDIT`

STOP CONDITION:
`GMZ_IMPL_004_READY_FOR_OBJECTIVE_AUDIT`


## GMZ-IMPL-004-CD-001 — governance integrity correction

- Objective review of PR `#54` identified an internal checkpoint inconsistency: top-level and active earned production credit are `31`, completion is `6.02%`, while `currentOutputs.productionEarned` was stale at `19`.
- Correction is limited to `.engineering/CHECKPOINT.json`: `currentOutputs.productionEarned` is synchronized to `31`.
- Historical sections describing earlier promoted states are preserved unchanged.
- Production credit remains `31 / 515 = 6.02%`; no GMZ-IMPL-004 credit is added or claimed.
- Governance-integrity documentation only: no runtime/auth/session, UI, dependency, schema, migration, RLS/policy, `.gef`, or business-scope behavior changes.
- GEF 1.1.1 preflight passed at correction candidate `770d5b1aacd49cb5c515515a754babccf73c01b3`: correct repository/branch, unchanged execution base `e43d4b791b9bcabf806d115424218a4b0240647c`, Context Lock `BOUND_FOR_EXECUTION`, `16/16` locked fingerprints `MATCH`, governance snapshot `MATCH`, clean tree, and `.gef` unchanged.
- Complete correction-candidate HIGH_ASSURANCE L5 at `770d5b1`: frozen strict-peer install, lint, typecheck, unit `13/13`, build, E2E `20/20` desktop/mobile, Axe `8/8` with `0` violations, Supabase reset, pgTAP `125/125`, Auth/Data API `50/50`, migration status, DB lint/advisors, dependency audit, strict peers, secret scan `0` matches, Docker config/build/up/healthy, health/readiness `ok`/`ready`, login HTTP `200`, local Auth/Postgres healthy, runtime log scan `18` lines with `0` severe/secret matches, and `.gef` integrity: `PASS`.
- The Evidence Bundle records the correction-candidate results; the exact published SHA and fresh exact-head results are recorded in the PR `#54` description.
- PR `#54` remains OPEN/DRAFT against `main`; no merge is performed.
- Correction stop condition: `GMZ_IMPL_004_CD_001_READY_FOR_OBJECTIVE_AUDIT`.

STOP CONDITION:
`GMZ_IMPL_004_CD_001_READY_FOR_OBJECTIVE_AUDIT`


## GMZ-IMPL-004-CD-002 — bounded runtime review corrections

- Scope is limited to the three findings in CD-002: complete deterministic RLS-backed pagination for organizations/establishments/branches; tolerant parsing of local `supabase status --output json` preambles; and preserving Auth cookies for retryable/transient claims-verification failures while continuing to fail closed and clear confirmed-invalid sessions.
- Tenant hierarchy reads retain RLS as authority, sort by `display_name` with stable `id` tie-breaks, paginate until the exact count is exhausted, and return no partial result after a page/query/count failure. No service-role credential or client-supplied tenant filter is introduced.
- The Supabase status parser begins at the first `{` and retains one generic failure message for absent/invalid JSON. Proxy verification preserves cookies only for retryable/unclassified verification failures; confirmed-invalid cleanup removes matching auth cookies from both the incoming request forwarded downstream and the response, including after `setAll` rebuilt it. Protected entry continues to require `auth.getUser()` and valid server-verified identity.
- Deterministic regressions cover more than one page for each hierarchy table, stable ordering, intermediate-page failure, pure/prefixed/invalid status output, and invalid/transient/valid claim outcomes. The real local desktop/mobile E2E also exercises malformed-session denial.
- No schema, migration, RLS/policy, membership/RBAC semantics, service-role posture, dependencies, business scope, `.gef`, remote Supabase, or production/deployment behavior changed.
- CD-001 remains in the history above. Its correction-specific stop token is historical and does not replace the canonical Work Order/checkpoint lifecycle state. The active CD-002 correction completion token is `GMZ_IMPL_004_CD_002_READY_FOR_OBJECTIVE_AUDIT`; completing it leaves the overall checkpoint at `GMZ_IMPL_004_READY_FOR_OBJECTIVE_AUDIT` for the separate objective audit.
- Production credit remains `31 / 515 = 6.02%`; no implementation credit, objective approval, merge, or promotion is claimed.
- Current implementation/test candidate after local review correction: `ea155b5d881f4296b5c080b5458559c5cf0a5758`; the focused proxy cookie-preservation/forwarding suite passes `4 / 4`. The final evidence-closeout commit receives another complete exact-head HIGH_ASSURANCE L5; its exact SHA and fresh remote SonarCloud/Socket/PR checks are recorded in PR `#54`.

STOP CONDITION:
`GMZ_IMPL_004_CD_002_READY_FOR_OBJECTIVE_AUDIT`
