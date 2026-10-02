# GMZ-IMPL-003 — Executor Evidence Bundle

Status: `READY_FOR_OBJECTIVE_AUDIT`

## Binding and exact state

- Repository: `KayzenRoot/goodz-menu`
- Branch: `execution/gmz-impl-003-membership-authz`
- Work Order: `GMZ-IMPL-003`, Issue `#47`
- Context Lock: `.engineering/context-locks/GMZ-IMPL-003.json`
- Execution base: `c08e385dee86eb7af1c133f730e74951891b63f8`
- Implementation code candidate: `b3c18f9dde2b85ddd425c8794f798be2ee6e9487`
- Implementation PR: [#49 — GMZ-IMPL-003](https://github.com/KayzenRoot/goodz-menu/pull/49), draft, target `main`
- Exact documentation-closeout HEAD and its repeated complete L5 are recorded in the updated PR description. The full applicable suite is repeated after the evidence/checkpoint commit before the executor stops.
- Merge: `NOT PERFORMED`; objective audit: `PENDING`.

The execution branch includes five previously committed admission/binding governance commits followed by the implementation candidate. The branch descends from the exact required execution base. The implementation candidate is the code commit identified above; the final closeout commit adds only Work Order, checkpoint, and evidence state.

## GEF Bootstrap 1.1.1 preflight

Preflight completed before the first implementation change, at the clean bound branch head `ff7a9032bb5411df12806ead5770bf7f05cb9251`.

| Gate | Result |
|---|---|
| Repository and remote | `PASS` — `KayzenRoot/goodz-menu`, `https://github.com/KayzenRoot/goodz-menu.git` |
| Authenticated GitHub identity | `PASS` — `KayzenRoot` |
| Authorized branch | `PASS` — `execution/gmz-impl-003-membership-authz` |
| Execution base | `PASS` — `c08e385dee86eb7af1c133f730e74951891b63f8`, exact required SHA and ancestor |
| Tree at preflight | `PASS` — clean before implementation |
| GEF version and initialization | `PASS` — `1.1.1`, applied and confirmed |
| Stable locked source fingerprints | `PASS` — `16 / 16 MATCH` |
| Governance snapshot | `PASS` — checkpoint Git blob `a8e0c6711a6c2d7601497895806a5b9f326888d9` matched at entry |
| Context Lock | `PASS` — `BOUND_FOR_EXECUTION` on the exact branch/base |
| `.gef` | `PASS` — unchanged from the execution base; no `.gef` file was edited |
| Supabase remote link | `PASS` — no local remote project reference; all operations were local |

After implementation, the branch, base ancestry, 16 source fingerprints, initial governance snapshot, and `.gef` integrity were rechecked before closeout. The Context Lock remains unchanged and records the historical execution-base binding; the current checkpoint advances only through executor closeout.

## Implemented authorization foundation

The CLI-generated migration `supabase/migrations/20261002152627_membership_tenant_authorization.sql` adds:

- `organization_memberships`, bound to `auth.users`, with active/suspended/revoked lifecycle, optional organization-bound establishment/branch defaults, and timestamps;
- tenant-bound `tenant_roles`;
- a stable-key `permissions` catalog containing only the admitted `tenant.hierarchy.read` permission, with immutable permission identity;
- `role_permissions` and `membership_roles` with organization-safe composite foreign keys;
- organization, establishment, and branch scope shape checks, uniqueness rules, and lookup indexes;
- a private `SECURITY DEFINER` read helper with an empty search path and restricted execution grants.

RLS stays enabled on every authorization table and the tenant hierarchy. Authenticated users receive only table-level `SELECT` on organizations, establishments, and branches. `anon` receives no hierarchy grant. Authenticated writes to the hierarchy and all direct access to membership/RBAC tables remain denied. No browser Auth client, signup/login flow, role-management API/UI, or business-domain module was added.

## Requirement and authorization proof

| Requirement area | Evidence | Result |
|---|---|---|
| Supabase Auth is the identity source | membership FK to `auth.users`; local signup + password-token integration | `PASS` |
| Canonical membership and role permission decide access | helper joins current active membership, scoped role assignment, and stable permission key | `PASS` |
| Cross-organization membership/role/resource integrity | composite foreign keys and pgTAP negative insert cases | `PASS` |
| Scope levels | organization, establishment, branch assignments with shape constraints | `PASS` |
| Authenticated hierarchy SELECT only | explicit grants and exactly three membership-aware SELECT policies | `PASS` |
| Anon and missing identity denied | pgTAP and local Data API checks | `PASS` |
| No membership or user-metadata spoof denied | pgTAP and authenticated local user carrying spoofed metadata | `PASS` |
| No permission, suspended, and revoked memberships denied | pgTAP plus fresh local Data API requests after status changes | `PASS` |
| Foreign tenant isolation | positive control in tenant B; denial for tenant A | `PASS` |
| Branch scope excludes siblings | parent-context positive reads; sibling establishments/branches and foreign branch denied | `PASS` |
| Authorized positive controls | organization-wide and branch-limited synthetic users | `PASS` |
| No authenticated writes | catalog checks and attempted local writes to membership/RBAC and hierarchy | `PASS` |
| No service-role exposure | no role key in source/client/test requests; local status values were not printed or used | `PASS` |

The helper does not use `user_metadata` or JWT custom role claims as authorization truth. It evaluates current database membership and permission state for each request. The `private` schema is not in the configured Data API exposed schemas.

## Complete validation — implementation candidate

The following checks passed at implementation candidate `b3c18f9dde2b85ddd425c8794f798be2ee6e9487`:

| Check | Result |
|---|---|
| `pnpm install --frozen-lockfile --strict-peer-dependencies` | `PASS` — pnpm `12.8.1`; lockfile unchanged; peer constraints clean |
| Lint | `PASS` |
| Typecheck | `PASS` |
| Unit tests | `PASS` — 3 files, `8 / 8` tests |
| Production build | `PASS` — Next.js `16.3.8` |
| Full E2E | `PASS` — desktop/mobile, `8 / 8`; includes Axe, malformed-health, stale-refresh race |
| Local Supabase reset | `PASS` — both migrations and seed applied |
| pgTAP | `PASS` — 2 files, `120 / 120` assertions |
| Synthetic local Auth/Data API | `PASS` — `34 / 34` checks; synthetic `.invalid` users; actual password grant; all data local |
| Migration status | `PASS` — migrations `20261002093358` and `20261002152627` present in local history |
| Generated database types | `PASS` — failure-safe generator succeeded; Oxfmt `0.71.0`; formatted output SHA-256 `FC3AF6B2C25584365F3642F02B5027F3C77FAEC6A936DD7A3B9483B4CDADEBBF` matched the tracked output before regeneration |
| Database lint | `PASS` — no schema errors |
| Security advisor | `PASS` — no findings |
| Dependency audit | `PASS` — no known vulnerabilities at high threshold |
| Peer dependency check | `PASS` — strict frozen install |
| Secret-pattern scan | `PASS` — zero matches across the six changed implementation files; private-key, cloud/token, JWT, credential-URL, and secret-assignment patterns |
| Docker Compose config/build/up | `PASS` — local web container healthy |
| Docker health/readiness | `PASS` — HTTP 200; `ok`/`ready`; exact implementation revision; Supabase dependency `available` |
| Local Supabase API/Auth/Postgres | `PASS` — status JSON exit 0 and loopback API; Auth health HTTP 200; Postgres accepting connections on local port 5432; local Auth/Data API integration succeeded |
| Runtime logs | `PASS` — 10 structured health/readiness events; zero severe errors |
| SonarCloud | `PASS` — PR check `SonarCloud Code Analysis` succeeded |
| Socket | `PASS` — Project Report and Pull Request Alerts succeeded |
| CodeRabbit | `PASS` — authenticated CLI review covered all six changed implementation files and returned `0 issues`; GitHub PR check was skipped because the PR is a draft |
| `.gef` integrity | `PASS` — unchanged; 16/16 locked source fingerprints still match |

The complete exact-head L5 is repeated after this evidence/checkpoint closeout. The final closeout HEAD and its repeat results are recorded in the PR description. All remaining mutations are limited to the authorized branch and local test/runtime state.

## Changed files and scope

Implementation files:

- `package.json` — local authz integration script only; no dependency/lockfile change.
- `src/lib/supabase/database.types.ts` — generated database type definitions.
- `supabase/migrations/20261002152627_membership_tenant_authorization.sql` — admitted schema and policies.
- `supabase/tests/database/membership_authorization.test.sql` — synthetic pgTAP matrix.
- `supabase/tests/database/tenant_hierarchy.test.sql` — updated expectations for the admitted SELECT-only policy.
- `tests/supabase/tenant-authorization.integration.mjs` — local Auth/Data API proof and cleanup.

The PR also carries the previously committed GMZ-IMPL-003 admission/bind changes to checkpoint, Context Lock, admission evidence, and Work Order. No locked source pack, Context Lock, progress ledger, or `.gef` file was changed by the implementation.

## Security impact, compatibility, risks, and limits

- Read exposure increases only for an authenticated identity with active canonical membership, `tenant.hierarchy.read`, and an assignment covering the requested resource scope.
- Anonymous reads, active users without permission, suspended/revoked users, foreign tenants, and out-of-scope branches are denied.
- All authenticated writes to tenant hierarchy and membership/RBAC remain denied.
- Schema is additive; no dependency version, application HTTP route, UI, or runtime Auth/session code changed.
- Synthetic test accounts and fixtures use only the local Supabase stack and are cleaned after integration checks.
- Optional Supabase services reported stopped by local CLI status; core REST/Kong/Auth/Postgres, readiness, and required Data API tests were healthy. No remote project was contacted.
- Deferred: signup/onboarding/invites, login UI, membership/role management, platform admin, MFA/AAL2, Admin Guard, support mode, ownership transfer, remote Supabase, production, and business-domain authorization.
- Rollback/recovery: no remote migration or deployment occurred. To discard the implementation candidate, use a normal revert commit (no history rewrite) and reset only the local database with `supabase db reset --local`.

## Findings, credit, and proposed checkpoint delta

- Executed automated CRITICAL/HIGH findings: `0 / 0`; CodeRabbit CLI actionable issues: `0`.
- Independent objective audit: `PENDING`; this bundle is executor evidence, not an approval.
- Current earned production credit remains `19 / 515 = 3.69%`.
- GMZ-IMPL-003 has predeclared additional eligibility of up to `12 / 515` only after separate governed acceptance and merge; no credit is earned here.
- Proposed checkpoint delta: synchronize current state to `GMZ_IMPL_003_READY_FOR_OBJECTIVE_AUDIT`, set next action `OBJECTIVE_AUDIT_GMZ_IMPL_003`, preserve execution base and current earned credit, and keep PR `#49` draft/open/unmerged.

## Current official references consulted

- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase Auth users and user metadata](https://supabase.com/docs/guides/auth/users)
- [Supabase changelog](https://supabase.com/changelog?types=breaking-change)

STOP CONDITION: `GMZ_IMPL_003_READY_FOR_OBJECTIVE_AUDIT`.
