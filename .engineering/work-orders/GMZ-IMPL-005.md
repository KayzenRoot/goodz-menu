# GMZ-IMPL-005 — MFA, Reauthentication & Admin Guard Foundation

Status: `ADMITTED / EXECUTION AUTHORIZED`
Issue: `#57`
Assurance: `HIGH_ASSURANCE`
Admission branch: `implementation/gmz-impl-005-mfa-admin-guard`

## OBJECTIVE

Complete the remaining GMZ-M02 baseline with stronger authentication and reusable privileged-action protection before money, stock, ownership, tenant administration, support or platform-privileged operations are admitted.

The slice introduces MFA/AAL2 support, reauthentication/step-up behavior and a reusable Goodz Admin Guard primitive on top of the already promoted login/session and canonical membership/RBAC/RLS boundary.

## CONTEXT

Promoted baseline:
- GMZ-IMPL-001 runtime/UI/Docker foundation: promoted;
- GMZ-IMPL-002 tenant hierarchy: promoted;
- GMZ-IMPL-003 membership/RBAC/RLS authorization: promoted;
- GMZ-IMPL-004 login/session/logout/protected tenant entry: promoted;
- production credit: `38 / 515 = 7.38%`;
- GMZ-M02 accepted credit: `15 / 19`;
- remaining GMZ-M02 baseline allocation: `4`.

Canonical security requires:
- MFA/AAL2 for privileged roles and selected high-risk actions;
- reauthentication for high-impact actions;
- bounded privileged sessions;
- fresh server-side membership/session checks where risk requires;
- Goodz Admin Guard for destructive/sensitive operations;
- no convenience bypass through platform/support privilege.

## SCOPE

### NECESSARY / admitted

1. Discover and use the currently supported Supabase MFA/AAL APIs for the pinned dependency set.
2. Enroll a TOTP factor in local Supabase Auth using a minimal accessible UI.
3. Challenge and verify TOTP to reach AAL2.
4. Server-side assurance evaluation for protected privileged entry.
5. Reusable Goodz Admin Guard primitive that requires:
   - valid server-verified Auth identity;
   - fresh canonical authorization check;
   - required assurance level;
   - bounded privileged freshness/reauth window.
6. Reauthentication/step-up UX for an admitted synthetic privileged action.
7. Explicit deny states for:
   - unauthenticated;
   - AAL1 when AAL2 is required;
   - expired/stale privileged freshness;
   - suspended/revoked membership;
   - removed factor / invalid challenge;
   - insufficient tenant permission/scope.
8. Logout/session revocation compatibility.
9. Audit-safe security event emission for guard allow/deny decisions without token, secret or TOTP leakage.
10. Local Supabase Auth integration proof using real enrollment/challenge/verification.
11. Preserve all GMZ-IMPL-003 and GMZ-IMPL-004 regressions.

### IMPORTANT but deferred

- password recovery;
- invitation/onboarding UX;
- trusted-device / remembered-device product UX;
- end-user session inventory UI;
- WebAuthn/passkeys;
- recovery codes if not directly supported/required by the chosen local provider path.

### OUT OF SCOPE

- Platform/Super Admin product surface;
- support-mode workflow;
- ownership-transfer business flow;
- tenant role/membership management UI;
- billing/plan/entitlement management;
- POS/catalog/orders/inventory/finance;
- production destructive actions;
- business-domain mutation;
- remote Supabase;
- production deployment;
- unrelated refactor/cleanup.

## FILES / SOURCES TO READ

Mandatory before mutation:
1. `.engineering/CHECKPOINT.json`
2. `.engineering/CHECKPOINT.md`
3. `.engineering/SOURCE-HIERARCHY.md`
4. `.engineering/DECISIONS-LEDGER.md`
5. `.engineering/MODULE-MAP.md`
6. `.engineering/SECURITY-CONTROL-MATRIX.md`
7. `.engineering/TEST-COVERAGE-MATRIX.md`
8. `.engineering/LOCAL-DOCKER-CONTRACT.md`
9. `docs/source-pack/SCOPE.md`
10. `docs/source-pack/REQUIREMENTS.md`
11. `docs/source-pack/ARCHITECTURE.md`
12. `docs/source-pack/DATA-MODEL.md`
13. `docs/source-pack/SECURITY.md`
14. `docs/source-pack/TEST-BENCHMARK-PLAN.md`
15. `docs/source-pack/DEFINITION-OF-DONE.md`
16. `docs/source-pack/DEPLOYMENT.md`
17. `docs/source-pack/UI-UX-DESIGN-SYSTEM.md`
18. GMZ-IMPL-003 and GMZ-IMPL-004 Work Orders, Context Locks and Evidence Bundles
19. current Auth/session/proxy/tenant-entry runtime and tests
20. current package/dependency lock.

## REQUIREMENTS

Primary:
- GMZ-REQ-SEC-001 — Least privilege;
- GMZ-REQ-SEC-002 — Tenant isolation proof;
- GMZ-REQ-SEC-003 — Sensitive admin actions;
- GMZ-REQ-SEC-004 — Auditability;
- GMZ-REQ-SEC-005 — Secret hygiene;
- GMZ-REQ-PLAT-002 — Tenant-safe authorization.

Functional:
1. AAL1 session cannot pass an AAL2-required guard.
2. Successfully verified MFA can satisfy the AAL2 requirement.
3. MFA enrollment secret/QR material is shown only in the local enrollment flow and never logged/evidenced verbatim.
4. Admin Guard revalidates current Auth identity and canonical authorization server-side.
5. Client-provided tenant, role, AAL or timestamp values cannot grant privilege.
6. Guard freshness expires deterministically and requires reauthentication/step-up.
7. Membership suspension/revocation immediately blocks privileged entry on fresh check.
8. Factor removal/invalidation prevents future AAL2 proof.
9. Failed challenge/verification is generic and leak-safe.
10. Audit event metadata identifies action/outcome/correlation without passwords, access tokens, refresh tokens, TOTP secrets or codes.
11. No platform/support authority is implied by tenant privilege.
12. Existing normal tenant-entry flow continues to function at its previous assurance level.

## ARCHITECTURE RULES

- Authentication remains separate from authorization.
- AAL2 is an additional assurance predicate, never a substitute for membership/RBAC/resource scope.
- Supabase Auth is the identity/MFA source.
- Canonical DB membership/RBAC remains tenant authority.
- User metadata/custom claims do not become primary authorization.
- No service-role credential in browser/end-user runtime.
- Admin Guard is server-side and composable, not a client-only UI check.
- Privileged freshness must be evaluated from server-trusted state/time.
- High-risk guard failure always denies.
- No privileged business mutation is introduced merely to demonstrate the guard; use a synthetic/local protected action.

## CONSTRAINTS

- implementation branch must descend from exact post-admission execution base;
- GEF 1.1.1 preflight required;
- 16 locked source fingerprints must match;
- local Supabase only;
- current Supabase MFA guidance must be revalidated at execution time;
- no production credentials;
- no force-push/history rewrite;
- executor does not merge;
- schema change defaults to NO; only a directly proven audit-event persistence requirement may justify a minimal governed migration inside this Work Order;
- no unrelated package upgrade.

## ACCEPTANCE CRITERIA

1. current supported Supabase MFA/AAL APIs are used and exact dependency compatibility is documented.
2. synthetic local user can enroll TOTP and complete challenge/verification.
3. AAL1 protected-privilege request is denied.
4. AAL2 verified request passes assurance when canonical authorization also passes.
5. insufficient canonical permission/scope is denied even at AAL2.
6. suspended/revoked membership is denied even at AAL2.
7. stale privileged freshness is denied and requires step-up.
8. factor removal/invalid challenge path denies.
9. no Auth token/TOTP secret/code/password appears in logs, screenshots or Evidence Bundle.
10. Admin Guard decision is server-side, deterministic and reusable.
11. normal login/session/logout/tenant-entry regressions remain green.
12. pgTAP `125/125` baseline remains green unless directly expanded without weakening assertions.
13. Auth/Data API `50/50` baseline remains green.
14. lint/typecheck/unit/build pass.
15. E2E includes enrollment/verification, AAL1 denial, AAL2 allow, stale-step-up denial, insufficient-role denial and logout/revocation behavior.
16. Axe/accessibility checks pass on MFA/step-up surfaces.
17. Docker and local Supabase/Auth/Postgres health remain green.
18. dependency/peer/secret checks pass.
19. SonarCloud, Socket and CodeRabbit gates pass.
20. no CRITICAL/HIGH unresolved finding.
21. exact-head Evidence Bundle proves all acceptance criteria.
22. PR remains open for separate objective audit; executor does not merge.

## TESTS

Minimum:
- focused unit tests for assurance evaluation, freshness and guard decisions;
- real local Supabase MFA integration;
- existing unit suite;
- lint/typecheck/build;
- desktop/mobile E2E;
- Axe on MFA/step-up UI;
- existing pgTAP full suite;
- existing Auth/Data authorization integration;
- revoked/suspended membership negative proof;
- AAL1/AAL2 negative/positive matrix;
- stale freshness matrix;
- factor invalidation/removal negative proof;
- dependency audit/strict peers;
- secret scan;
- Docker build/up/health/readiness;
- local Auth/Postgres/Supabase status;
- runtime log scan;
- SonarCloud;
- Socket;
- CodeRabbit;
- exact-head HIGH_ASSURANCE rerun after all corrections.

## DELIVERABLES

- supported local MFA enrollment/challenge/verification;
- reusable server-side Goodz Admin Guard;
- reauthentication/step-up path;
- minimal accessible MFA/step-up UI;
- audit-safe decision evidence;
- focused and regression tests;
- Evidence Bundle;
- updated Work Order/checkpoint proposal;
- PR against `main`.

## REVIEW FORMAT

Português brasileiro:
- exact base/head SHA;
- dependency/API choices;
- MFA/AAL architecture;
- Admin Guard trust boundaries;
- privileged freshness model;
- positive/negative security matrix;
- tests with counts;
- secret/log review;
- findings by severity;
- deferred scope;
- proposed Checkpoint Delta;
- explicit `READY_FOR_OBJECTIVE_AUDIT` or blocker.

## PREDECLARED CREDIT

Maximum after objective acceptance + implementation merge + promotion only:
- GMZ-M02: `4`
- GMZ-M26: `2`
- increment max: `6 / 515`
- current earned: `38 / 515 = 7.38%`
- projected if fully accepted: `44 / 515 = 8.54%`

If fully accepted, GMZ-M02 reaches `19 / 19` accepted baseline weight. No other module is completed by this claim.

## STOP CONDITION

Admission:
`GMZ_IMPL_005_ADMISSION_READY_FOR_REVIEW`

Execution after governed admission promotion and exact bind:
`GMZ_IMPL_005_READY_FOR_OBJECTIVE_AUDIT`


## EXECUTION-BASE BIND

- admission PR: `#58`
- admission disposition: `APPROVED_FOR_ADMISSION_PROMOTION`
- exact execution base: `036d26b92d32ccb6ef69e46721e48b339d1b7332`
- execution branch: `execution/gmz-impl-005-mfa-admin-guard`
- Context Lock: `BOUND_FOR_EXECUTION`
- stable source fingerprints: `16 / 16 MATCH`
- executor/Codex authorization: `YES, GMZ-IMPL-005 ONLY`
- merge authority: `NO`
- production credit remains `38 / 515 = 7.38%`

The executor must inspect the repository before mutation, revalidate current Supabase MFA/AAL guidance, execute the complete Work Order, run the HIGH_ASSURANCE evidence suite, correct failures introduced by the increment, commit/push to this execution branch, update the same PR, and stop for separate objective audit.

STOP CONDITION:
`GMZ_IMPL_005_READY_FOR_OBJECTIVE_AUDIT`


## GMZ-IMPL-005-CD-001 — objective-review corrections

Status: `EXECUTION IN PROGRESS`; current correction stop condition is recorded below.

- Review target: PR `#59`, exact audited head `777aba66789db0bb01603960e497c61ed245fde0`.
- Scope is limited to independent Auth-verified reauthentication before the admitted app's TOTP enrollment flow, server-trusted stale-freshness E2E proof, truthful user-metadata spoofing E2E proof, and matching governance/evidence updates.
- Revalidated current official Supabase Auth/TOTP/changelog guidance for pinned `@supabase/supabase-js 2.117.2` and `@supabase/ssr 0.12.7`. Supabase documents that AAL1 can enroll and then verify TOTP; its `auth.reauthenticate()` endpoint sends an email/phone OTP, while this admitted account uses password proof. Therefore the server action obtains a fresh provider-verified password grant, validates the signed claims and exact user/session identity, then uses that same ephemeral Auth client for TOTP enrollment or unverified-factor cleanup. Provider errors and identity mismatch clear or never create the HttpOnly proof; expiration is rejected by the guard; abandoning the form before submission creates neither proof nor factor. The Admin Guard independently verifies the short-lived provider-signed password proof against the current identity before allowing the synthetic privileged action, so a stolen AAL1 session alone cannot both complete the app's factor-creation flow and pass the guard. No service-role credential is used. References: Supabase [TOTP flow](https://supabase.com/docs/guides/auth/auth-mfa/totp), [password grant](https://supabase.com/docs/reference/javascript/auth-signinwithpassword), and [reauthenticate](https://supabase.com/docs/reference/javascript/auth-reauthenticate).
- The guard continues to require AAL2, a verified TOTP factor, a latest TOTP AMR timestamp within 300 seconds, and current canonical RLS authorization. Auth failures, identity/claim mismatch, stale or missing proof, and invalid test-clock signatures deny.
- Added a deterministic local E2E clock seam authenticated by a random per-run HMAC secret. It accepts only signed timestamps on loopback, non-production local E2E; production ignores the seam. The browser test proves fresh TOTP allow, server-observed age greater than 300 seconds deny with `step_up_required`, and allow again after fresh TOTP plus server-verified password step-up.
- The no-membership fixture now carries false tenant/role/permission/AAL/platform metadata. The local Auth/Data API profile is read back to prove those values exist; the Admin Guard still denies. The browser test also types a valid password and abandons the server action before submit, then proves the AAL1 guard still denies and no proof cookie/factor was created. The evidence coverage claim now refers to these actual regressions.
- No Platform/Super Admin, support mode, owner transfer, business-domain mutation, remote Supabase, production deployment, schema/migration/RLS/policy/dependency, or `.gef` change is authorized or included. Production credit remains `38 / 515 = 7.38%`.
- Correction L5 is rerun on the exact pushed candidate and the SHA/tree plus each result are recorded in the CD-001 Evidence Bundle and PR `#59`; this Work Order section must not inherit results from an earlier HEAD.

STOP CONDITION:
`GMZ_IMPL_005_CD_001_READY_FOR_OBJECTIVE_AUDIT`


## EXECUTOR CLOSEOUT — GMZ-IMPL-005

- Executor result: `READY_FOR_OBJECTIVE_AUDIT`; canonical stop condition remains `GMZ_IMPL_005_READY_FOR_OBJECTIVE_AUDIT`.
- Authorized branch: `execution/gmz-impl-005-mfa-admin-guard`; PR `#59` remains open/draft against `main`; merge authority: `NO`.
- Exact execution base: `036d26b92d32ccb6ef69e46721e48b339d1b7332`; initial bind Context Lock `BOUND_FOR_EXECUTION`; stable source fingerprints `16/16 MATCH`; `.gef` unchanged.
- Implementation commit: `6bc3aec1246e353250e9f90a2ce3791032c48e74`.
- Added local Supabase TOTP enrollment, challenge/verification, AAL2 step-up, a deny-by-default server-side Goodz Admin Guard, bounded 300-second privileged freshness, synthetic non-business proof action, accessible security UI and focused tests. Supabase Auth identity and current canonical Data API/RLS checks remain the authorities; caller-provided tenant/AAL/freshness/metadata are not trusted.
- Local CodeRabbit review of the current implementation and checkpoint at `6bc3aec`: `SUCCESS`, `0 findings`.
- Full-diff CodeRabbit review at candidate `47319cc` returned two `MAJOR` documentation findings: one stale request tied to GMZ-IMPL-003/PR `#49`, rejected against the active GMZ-IMPL-005 binding and checkpoint; the second identified a missing complete L5 entry in the Evidence Bundle, corrected in this closeout. No runtime/security defect was identified. The local review is repeated after this evidence correction.
- Fresh full-diff CodeRabbit review after the evidence correction: `SUCCESS`, `0 findings`.
- Exact-branch CodeRabbit review at `c08122d`: two governance/documentation suggestions, both rejected as stale/non-actionable. The MAJOR request concerns GMZ-IMPL-003 PR `#49`, not this bound/authorized Work Order; the MINOR request conflicts with the required and user-specified stop token `GMZ_IMPL_005_READY_FOR_OBJECTIVE_AUDIT`. No runtime/security defect was reported.
- Complete local exact-head HIGH_ASSURANCE L5 at `47319cc231c02c96ea3d0012afa860cbcbfc721f` / tree `6322e52df691972130c869de0f8b2424a04f0206`: frozen strict-peer install, lint, typecheck, unit `40/40`, build, desktop/mobile E2E `24/24`, Axe `22` scans with `0` violations, Supabase reset, pgTAP `125/125`, Auth/Data API `50/50`, migration list, DB lint, security advisors, dependency audit, secret scan, Docker config/build/up/health/readiness, local Supabase/Auth/Postgres and runtime-log scan all passed. The five informational no-policy RLS advisor results remain unchanged.
- Complete exact-head HIGH_ASSURANCE L5 is rerun after the documentation/evidence closeout. The exact published candidate SHA and its fresh command results are recorded in the description of PR `#59`; do not carry forward results from another SHA.
- No Platform/Super Admin, support mode, ownership transfer, business-domain mutation, remote Supabase, production deployment, schema/migration/RLS/policy/dependency change, or `.gef` edit was made. Production credit remains `38 / 515 = 7.38%`; no incremental credit is claimed.
- Evidence Bundle: `.engineering/evidence/GMZ-IMPL-005-EVIDENCE.md`.

STOP CONDITION:
`GMZ_IMPL_005_READY_FOR_OBJECTIVE_AUDIT`
