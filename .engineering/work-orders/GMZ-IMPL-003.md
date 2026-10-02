# GMZ-IMPL-003 — Membership & Tenant Authorization Foundation

Status: `READY_FOR_OBJECTIVE_AUDIT`
Issue: `#47`
Assurance: `HIGH_ASSURANCE`
Base branch: `main`
Admission base: `81ff6d87c2af25ebf5cd55ba8038bcad5a86b83a`
Work branch: `execution/gmz-impl-003-membership-authz`

## OBJECTIVE

Implement the first authenticated tenant-authorization slice on top of the promoted Organization → Establishment → Branch hierarchy.

The bounded goal is to prove:

```text
authenticated identity
  + active organization membership
  + assigned role/permission
  + resource scope
  => authorized tenant hierarchy read
```

Authentication alone MUST NOT grant tenant access.

This Work Order is a partial GMZ-M02 slice. It MUST NOT claim the complete Identity/Auth/RBAC/Admin Guard module.

## CONTEXT

Canonical state before this increment:
- Source Pack: `FROZEN_V0.1`;
- production credit: `19 / 515 = 3.69%`;
- GMZ-IMPL-002: `PROMOTED_COMPLETE`;
- Organization / Establishment / Branch exist with RLS enabled;
- anon/authenticated table access is currently fail-closed;
- no tenant membership/RBAC source exists yet;
- no tenant-facing RLS policy exists yet;
- implementation authorization is currently inactive.

Canonical ownership:
- Organization / Establishment / Branch → GMZ-M01;
- Membership / Role / Permission → GMZ-M02;
- validation/security proof → GMZ-M26;
- Platform Admin remains a separate authority plane and is not admitted here.

Current official Supabase documentation was revalidated on 2026-10-02 for:
- Auth + RLS integration through authenticated JWT identity;
- `auth.uid()` behavior, including unauthenticated NULL;
- prohibition on user-editable `user_metadata` as authorization authority;
- JWT freshness limitations;
- RBAC/custom-claims patterns;
- MFA/AAL concepts;
- current Next.js/SSR package direction.

This slice deliberately uses canonical database membership as the authorization source of truth rather than relying on a user-editable or potentially stale JWT role claim.

## SCOPE

### NECESSARY

Implement a minimal physical authorization model consistent with the canonical Data Model:

- `UserIdentity`: reference Supabase Auth identity, do not duplicate credentials/password state;
- `OrganizationMembership`;
- tenant `Role`;
- `Permission`;
- `RolePermission`;
- `MembershipRole`.

The physical design MUST support:
- membership lifecycle sufficient for active/suspended/revoked authorization;
- explicit organization ownership;
- optional narrower establishment/branch role assignment;
- database-enforced prevention of cross-organization scope assignment;
- multiple roles per membership where the canonical model requires it;
- immutable/stable permission key identity;
- no platform-admin authority hidden inside tenant roles.

### Authorization behavior admitted

Open only the minimum authenticated SELECT boundary needed to prove GMZ-REQ-PLAT-002:

- anon: no tenant hierarchy access;
- authenticated without active membership: no tenant hierarchy access;
- active membership without required permission: no tenant hierarchy access;
- active authorized organization-scoped role: may read its organization and admitted descendants;
- branch-scoped role: may read the containing organization/establishment and only authorized branch scope;
- wrong-tenant resource substitution: denied;
- suspended/revoked membership: denied on subsequent authorization evaluation;
- multiple role/scope assignments combine only through explicit allowed semantics.

The existing hierarchy tables may receive narrowly scoped SELECT grants/policies required for this behavior. Authenticated INSERT/UPDATE/DELETE remain denied in this Work Order.

### Authorization implementation

Prefer direct, current database membership evaluation for this high-assurance baseline.

If authorization helper functions are necessary:
- minimize SECURITY DEFINER use;
- use controlled `search_path`;
- schema-qualify sensitive references;
- restrict EXECUTE grants;
- do not expose bypass-RLS convenience APIs;
- prevent recursive RLS/self-reference defects;
- prove behavior with negative tests.

### Local Auth proof

Provide local-only integration evidence that a real authenticated identity/token path respects the admitted RLS boundary. SQL-only simulation is not sufficient as the sole proof if the local Data API/Auth path is available.

No remote Supabase operation is admitted.

## OUT OF SCOPE

- public signup or onboarding;
- invitation workflow;
- production sign-in UI;
- password reset/recovery UI;
- social login;
- tenant role-management UI/API;
- authenticated membership/role/permission mutation;
- tenant ownership transfer;
- Platform Owner / Platform Admin / Super Admin;
- PlatformAdminMembership;
- MFA enrollment or AAL2 enforcement;
- Goodz Admin Guard;
- support mode;
- session inventory/revocation UI;
- custom JWT authorization claims as primary authority;
- business-domain tables or permissions;
- settings/entitlements;
- remote Supabase link/push;
- production deployment;
- service-role/secret exposure in browser/runtime;
- broad Source Pack rewrites;
- `.gef/**` changes.

## FILES / SOURCES TO READ

Before mutation:
1. `.engineering/CHECKPOINT.json`
2. `.engineering/SOURCE-HIERARCHY.md`
3. `.engineering/MODULE-MAP.md`
4. `docs/source-pack/SCOPE.md`
5. `docs/source-pack/REQUIREMENTS.md`
6. `docs/source-pack/ARCHITECTURE.md`
7. `docs/source-pack/DATA-MODEL.md`
8. `docs/source-pack/SECURITY.md`
9. `docs/source-pack/TEST-BENCHMARK-PLAN.md`
10. `docs/source-pack/DEFINITION-OF-DONE.md`
11. `.engineering/DATA-OWNERSHIP-MATRIX.md`
12. `.engineering/SECURITY-CONTROL-MATRIX.md`
13. `.engineering/TEST-COVERAGE-MATRIX.md`
14. `.engineering/adrs/ADR-0002-SUPABASE-POSTGRES-AUTH-BASELINE.md`
15. existing GMZ-IMPL-002 migration/tests/evidence;
16. current Supabase CLI help and official Auth/RLS documentation when implementation behavior is version-sensitive.

## REQUIREMENTS

Primary:
- `GMZ-REQ-PLAT-001` Multi-tenancy;
- `GMZ-REQ-PLAT-002` Tenant-safe authorization;
- `GMZ-REQ-SEC-001` Least privilege;
- `GMZ-REQ-SEC-002` Tenant isolation proof;
- `GMZ-REQ-GOV-001..004` governed implementation/evidence.

Relevant constraints, not claimed complete:
- `GMZ-REQ-SEC-003` sensitive admin actions;
- `GMZ-REQ-SEC-004` auditability.

This Work Order does not implement tenant-facing permission/admin mutation, MFA/Admin Guard or platform authority, therefore it does not claim those requirements complete.

## ARCHITECTURE RULES

1. Authentication identity is separate from tenant membership.
2. Tenant membership/RBAC is canonical database authorization truth.
3. Tenant and platform authority planes remain separate.
4. Authenticated role alone grants nothing.
5. Opaque IDs never replace authorization.
6. RLS remains enabled on all exposed tenant tables.
7. No policy may trust `user_metadata`.
8. Do not use service-role/bypass-RLS as an application authorization shortcut.
9. Cross-tenant role scope must fail at database level where physical relationships can enforce it.
10. RLS UPDATE design is irrelevant here because authenticated writes remain closed.
11. Supabase-specific auth mechanics remain at infrastructure/application boundaries, not business-domain core.
12. Authorization must fail closed on NULL/missing identity, missing membership, inactive membership, missing permission or ambiguous scope.

## CONSTRAINTS

- GEF Bootstrap `1.1.1` remains unchanged.
- admission base is immutable until admission promotion.
- executor mutation is AUTHORIZED only inside this Work Order after preflight confirms the exact bound execution base and all stable fingerprints.
- no force push/history rewrite.
- no direct main mutation.
- no self-merge by executor.
- local-only Supabase.
- synthetic test identities/data only.
- no real credentials/PII.
- migration-first database workflow.
- generated database types must remain synchronized through the accepted failure-safe generator.
- any canonical source incompatibility marks the Context Lock STALE.

## PREDECLARED PRODUCTION CREDIT

Maximum only after objective acceptance, implementation merge and promotion:
- GMZ-M02 Identity/Auth/RBAC foundation slice: `10`;
- GMZ-M26 Validation & Quality Engineering: `2`.

Maximum increment: `12 / 515`.

Current earned baseline: `19 / 515 = 3.69%`.

Projected cumulative only if the full slice is accepted:
`31 / 515 = 6.02%`.

Admission, LOC, migration count and test count earn `0`.

## ACCEPTANCE CRITERIA

1. Canonical membership/RBAC tables exist and follow GMZ-M02 ownership.
2. Membership binds to Supabase Auth identity without duplicating credential truth.
3. Tenant-role vs platform-role separation is preserved.
4. Cross-organization role scope assignment is rejected by DB integrity.
5. RLS remains enabled on Organization/Establishment/Branch.
6. anon cannot read tenant hierarchy.
7. authenticated user without active membership cannot read tenant hierarchy.
8. active membership alone without required role/permission cannot read tenant hierarchy.
9. authorized org-scoped identity can read only its organization hierarchy.
10. branch-scoped identity cannot enumerate sibling/foreign branches.
11. wrong-tenant ID substitution returns no unauthorized rows.
12. suspended/revoked membership loses authorized access on fresh evaluation.
13. authenticated users cannot self-insert/update/delete membership, roles, permissions or role assignments.
14. no authorization uses user-editable metadata.
15. no browser/service secret exposure.
16. local Auth/Data API integration proves the same boundary, not only privileged SQL.
17. reset + seed/test setup is deterministic and synthetic.
18. generated TypeScript DB types exactly match final local schema after canonical formatting.
19. existing GMZ-IMPL-001/002 runtime/database regressions remain green.
20. exact-head HIGH_ASSURANCE evidence is complete; CRITICAL/HIGH = 0.

## TESTS

Risk Class A / HIGH_ASSURANCE.

Required:
- migration/schema structural tests;
- FK/unique/check/scope-integrity tests;
- RLS policy inspection;
- pgTAP authorization negative matrix;
- anon denial;
- unauthenticated NULL-identity denial;
- no-membership denial;
- inactive membership denial;
- missing-permission denial;
- foreign tenant denial;
- branch scope denial;
- role escalation/write denial;
- authorized positive controls;
- local Auth/Data API integration with synthetic users;
- generated-type equivalence;
- full existing unit/lint/typecheck/build/E2E regression;
- local db reset/test/lint/advisor;
- dependency audit and secret scan;
- Docker health/readiness;
- SonarCloud / Socket / CodeRabbit;
- exact-head rerun after any security/runtime correction.

If concurrency or token freshness behavior is introduced by implementation, add the applicable deterministic regression before acceptance.

## WRITE ALLOWED

- `supabase/migrations/**`;
- `supabase/seed.sql` only if synthetic authz fixtures are objectively necessary;
- `supabase/tests/database/**`;
- `src/lib/supabase/database.types.ts`;
- minimal auth/RLS test helpers under existing test structure;
- minimal package scripts required for admitted local proof;
- GMZ-IMPL-003 governance/evidence files;
- checkpoint/progress artifacts only at governed closeout/promotion.

Any new runtime Auth client/session files require an explicit demonstrated necessity and remain forbidden by default in this slice.

## DELIVERABLES

- CLI-generated migration(s);
- membership/RBAC schema;
- membership-aware tenant hierarchy SELECT policies/helpers;
- synthetic local authorization fixtures/test setup;
- database + local Auth/Data API security tests;
- synchronized generated DB types;
- Evidence Bundle;
- updated PR description with exact-head results;
- proposed Checkpoint Delta.

## REVIEW FORMAT

Report in Portuguese:
- exact base/head;
- files changed;
- requirement mapping;
- schema/policy summary;
- positive + negative authorization matrix;
- tests/checks and counts;
- security findings by severity;
- secret/key impact;
- tenant-boundary impact;
- limitations/deferred GMZ-M02 capabilities;
- rollback/recovery note;
- credit eligibility;
- proposed Checkpoint Delta.

## STOP CONDITION

During admission:
`GMZ_IMPL_003_ADMISSION_READY_FOR_REVIEW`

After exact execution-base bind:
`GMZ_IMPL_003_READY_FOR_OBJECTIVE_AUDIT`


## ADMISSION AUDIT + EXECUTION-BASE BIND
- admission PR: `#48`
- audited admission head: `5cfdcfbd6811b2cda2d3caa4d141a5b3018ae710`
- admission checks: `SonarCloud PASS / CodeRabbit SUCCESS / 0 unresolved threads`
- CRITICAL/HIGH: `0 / 0`
- admission disposition: `APPROVED_FOR_ADMISSION_PROMOTION`
- admission merge / exact execution base: `c08e385dee86eb7af1c133f730e74951891b63f8`
- execution branch: `execution/gmz-impl-003-membership-authz`
- branch lineage from exact merge SHA: `YES`
- stable source fingerprints: `16 / 16 MATCH`
- Context Lock: `BOUND_FOR_EXECUTION`
- executor/Codex: `AUTHORIZED FOR GMZ-IMPL-003 ONLY`
- current production credit: `19 / 515 = 3.69%`
- merge authority for executor: `NO`

STOP CONDITION:
`GMZ_IMPL_003_READY_FOR_OBJECTIVE_AUDIT`


## EXECUTOR CLOSEOUT
- initial implementation code candidate: `b3c18f9dde2b85ddd425c8794f798be2ee6e9487`
- latest code candidate after objective-review correction: `8f71f571c7fc08746e5b0fcae5b8e6f620d8c0bf`
- execution base: `c08e385dee86eb7af1c133f730e74951891b63f8`
- implementation PR: `#49`, open draft against `main`; not merged
- complete GEF 1.1.1 preflight: `PASS`; locked source fingerprints: `16 / 16 MATCH`; Context Lock was `BOUND_FOR_EXECUTION`; governance snapshot matched; `.gef` unchanged
- objective-review correction: Sonar initially reported 48 duplicated SQL-literal maintainability findings at CRITICAL/HIGH impact plus two integration-helper issues; these were fixed in three bounded commits without changing the admitted scope
- exact-head code-candidate L5 at `d3054b2`: `PASS`; frozen strict-peer install, lint, typecheck, unit `8 / 8`, production build, E2E `8 / 8`, database reset, pgTAP `117 / 117`, Auth/Data API `34 / 34`, migration status, generated-type equivalence, DB lint/security advisor, dependency audit, secret-pattern scan, Docker health/readiness, local Supabase/Auth/Postgres, runtime logs, and GEF integrity
- final code-only test delta at `8f71f57`: pgTAP `117 / 117`; per-table policy assertion; SonarCloud `PASS` with issue API `0` open and `0` CRITICAL/HIGH; Socket `PASS`
- CodeRabbit CLI: `0 issues` across the complete 12-file PR diff at `d3054b2` and `0 issues` for the final SQL test delta before `8f71f57`; GitHub CodeRabbit check is skipped while the PR remains draft
- complete exact-head L5 is repeated after evidence/checkpoint synchronization; its final documentation-closeout SHA and repeated results are recorded in the PR description
- current CRITICAL/HIGH findings: `0 / 0`; independent objective audit remains `PENDING`
- current earned production credit remains `19 / 515`; no implementation credit is awarded by executor closeout
- next action: `OBJECTIVE_AUDIT_GMZ_IMPL_003`

STOP CONDITION:
`GMZ_IMPL_003_READY_FOR_OBJECTIVE_AUDIT`


## GMZ-IMPL-003-CD-001 — Establishment-scope authorization proof

- Objective-review finding: establishment-scoped access was not independently covered by the pgTAP or local authenticated Auth/Data API matrices.
- Correction: added one synthetic Auth user, active organization membership, tenant role with `tenant.hierarchy.read`, and `MembershipRole(scope_type = establishment)` assigned to establishment A1.
- Database proof: the scoped identity reads its assigned establishment and all two descendant branches; it is denied a sibling establishment and its branch, a foreign-tenant establishment and branch, and a foreign parent organization. Its parent organization remains readable, matching the existing policy's parent-context semantics.
- Local Auth/Data API proof: the same matrix passes through a real local password-grant access token.
- Existing organization/branch-scope, no-membership, no-permission, suspended/revoked, metadata-spoof, cross-tenant, and write-denial tests are retained.
- Scope guard: no migration, schema, RLS policy, permission behavior, dependency, `.gef`, or business module changed.
- Targeted validation: frozen install `pnpm 12.8.1`, lint, typecheck, and unit tests passed; pgTAP `125 / 125`; local Auth/Data API `42 / 42`; changed-file secret-pattern scan `0` matches.
- Complete exact-head L5 is rerun after the evidence/checkpoint closeout. The final closeout SHA and the complete exact-head results are recorded in PR `#49`.
- PR remains OPEN/DRAFT and unmerged. Objective audit remains a separate pending action.

STOP CONDITION:
`GMZ_IMPL_003_CD_001_READY_FOR_OBJECTIVE_AUDIT`
