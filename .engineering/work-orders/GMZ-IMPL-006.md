# GMZ-IMPL-006 — Durable Audit Trail & Correlation Foundation

Status: `ADMITTED / EXECUTION AUTHORIZED`
Issue: `#62`
Assurance: `HIGH_ASSURANCE`
Admission branch: `implementation/gmz-impl-006-durable-audit`

## OBJECTIVE

Establish a durable, immutable, tenant-aware audit substrate before any real business/financial/stock/admin mutation is admitted.

This Work Order is centered on GMZ-M23 Observability, Audit & Self-Healing and creates the production audit path required by canonical Security and Definition of Done.

## CONTEXT

Promoted baseline:
- GMZ-IMPL-001 runtime/Docker/correlation bootstrap: promoted;
- GMZ-IMPL-002 tenant hierarchy: promoted;
- GMZ-IMPL-003 membership/RBAC/RLS: promoted;
- GMZ-IMPL-004 login/session/tenant entry: promoted;
- GMZ-IMPL-005 MFA/reauthentication/Admin Guard: promoted;
- GMZ-M02 accepted baseline: `19 / 19 — COMPLETE`;
- current production credit: `44 / 515 = 8.54%`;
- current Admin Guard emits safe structured events but durable AuditEvent persistence is not yet implemented.

Canonical obligations:
- GMZ-REQ-SEC-004 requires material money/price/stock/permission/admin/AI-authorized actions to have audit trails;
- Security §28 requires an audit trail for material actions;
- Data Model §24 defines immutable AuditEvent;
- DoD requires privileged actions audited and material paths correlated/redacted;
- ADR-0003 requires audit/correlation metadata that links effects to their source.

## SCOPE

### NECESSARY / admitted

1. Add a physical `audit_events` persistence model aligned with canonical `AuditEvent`.
2. Audit records are append-only / immutable.
3. Audit records carry:
   - actor identity where available;
   - organization / establishment / branch scope where applicable;
   - action;
   - target type / target identifier where safe;
   - outcome / reason code;
   - correlation ID;
   - source;
   - safe structured metadata;
   - timestamp;
   - optional before/after safe references where directly applicable.
4. Enable RLS and default direct Data API access to fail closed.
5. Direct browser/end-user insert/update/delete is forbidden.
6. Implement a single trusted server-only audit writer boundary.
7. The writer MAY use the Supabase service-role credential only inside the isolated server-only audit-writer module and only for the admitted append path:
   - never in browser code;
   - never in `NEXT_PUBLIC_*`;
   - never for tenant authorization;
   - never for tenant/business reads;
   - never logged;
   - never returned to callers.
8. Add a narrow database append primitive / RPC for audit writes if required by the chosen safe design; direct mutation of arbitrary business tables through the privileged client is forbidden.
9. Prevent UPDATE/DELETE of audit rows even through privileged application paths; DB-level immutability must be proved.
10. Integrate the existing Goodz Admin Guard synthetic protected action with durable audit persistence.
11. An allowed privileged action MUST NOT be reported as allowed if its required audit persistence fails.
12. Denied privileged attempts remain denied even if audit persistence itself is unavailable; audit failure must be safely observable without leaking secrets.
13. Integrate only the minimum security-setting events necessary to prove the durable path, without expanding account-management scope.
14. Correlation IDs must connect request/action/log/audit evidence deterministically.
15. Add safe metadata allowlisting/redaction so passwords, access/refresh tokens, TOTP secrets/codes, authorization headers and unnecessary PII cannot be persisted.
16. Provide local-only evidence/inspection utilities needed to verify persisted rows without exposing a product audit UI.

### IMPORTANT but deferred

- tenant-facing audit viewer/search/filter/export;
- Error Center / Incident grouping;
- self-healing / automated reprocess;
- provider/integration health center;
- retention/archival implementation beyond schema-compatible fields;
- platform-wide audit aggregation.

### OUT OF SCOPE

- Platform/Super Admin product surface;
- support mode;
- owner transfer;
- role/membership management UI;
- POS/catalog/inventory/orders/finance mutations;
- AI-authorized business execution;
- remote Supabase;
- production deployment;
- broad logging refactor;
- unrelated schema cleanup.

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
10. `.engineering/adrs/ADR-0003-AUDITABLE-LEDGERS-AND-RELIABLE-EVENTS.md`
11. `docs/source-pack/SCOPE.md`
12. `docs/source-pack/REQUIREMENTS.md`
13. `docs/source-pack/ARCHITECTURE.md`
14. `docs/source-pack/DATA-MODEL.md`
15. `docs/source-pack/SECURITY.md`
16. `docs/source-pack/TEST-BENCHMARK-PLAN.md`
17. `docs/source-pack/DEFINITION-OF-DONE.md`
18. `docs/source-pack/DEPLOYMENT.md`
19. GMZ-IMPL-001 correlation utilities/evidence;
20. GMZ-IMPL-005 Admin Guard runtime/evidence;
21. current Supabase migrations/config/generated DB types;
22. current environment/server-only boundaries and Docker config.

## REQUIREMENTS

Primary:
- GMZ-REQ-SEC-003 — sensitive admin actions;
- GMZ-REQ-SEC-004 — auditability;
- GMZ-REQ-SEC-005 — secret hygiene;
- GMZ-REQ-OBS-001 — correlation;
- GMZ-REQ-PLAT-001/002 — tenant isolation/authorization where audit rows are scoped;
- applicable QA/governance requirements.

Functional:
1. audit records are immutable after insertion.
2. anonymous and ordinary authenticated Data API clients cannot directly create, edit or delete audit rows.
3. direct tenant users cannot enumerate another tenant's audit data.
4. trusted writer derives/receives actor/scope only from server-validated context, never from untrusted browser authority.
5. any use of service-role is isolated server-only and cannot be imported into a client bundle.
6. Admin Guard allow is persisted before the user-visible action result is accepted as allowed.
7. audit persistence failure cannot produce an unaudited allow.
8. persisted Admin Guard events contain safe action/outcome/reason/correlation/scope metadata and no credentials.
9. correlation ID is stable across the guard decision and corresponding persisted audit event.
10. malformed/oversized/unsafe audit metadata is rejected or normalized safely.
11. update/delete attempts against persisted audit rows fail.
12. no product audit UI is exposed in this slice.
13. existing Auth/MFA/RBAC/RLS behavior remains unchanged and green.

## ARCHITECTURE RULES

- AuditEvent belongs to GMZ-M23.
- Audit persistence is not an authorization authority.
- Tenant authorization is still canonical membership/RBAC/RLS.
- Privileged audit writer is write-only at the application abstraction boundary.
- If service-role is used, it is confined to the server-only audit writer and cannot be reused for tenant/business access.
- RLS remains enabled even though the trusted writer may bypass it.
- DB-level immutability must not rely only on TypeScript conventions.
- Audit payloads are allowlisted; arbitrary request bodies are never persisted.
- Audit failure on a path that otherwise would allow a privileged action must fail closed.
- Correlation identifiers contain no tenant secret or PII.
- Audit rows are not destructively edited to "fix" history; corrections are additive.

## CONSTRAINTS

- implementation branch must descend from exact post-admission execution base;
- GEF 1.1.1 preflight required;
- 16 locked source fingerprints must match;
- local Supabase only;
- schema/migration change is ADMITTED only for the audit substrate and its narrow append/immutability mechanics;
- generated DB types must be refreshed and equivalence checked;
- no unrelated schema/policy change;
- no production credentials;
- no force-push/history rewrite;
- executor does not merge;
- no unrelated package upgrade;
- service-role value must never be printed into evidence, logs or screenshots.

## ACCEPTANCE CRITERIA

1. migration creates the admitted AuditEvent persistence only.
2. `audit_events` has explicit actor/scope/action/target/outcome/reason/correlation/source/timestamp fields and bounded safe metadata.
3. RLS is enabled.
4. direct anon/authenticated INSERT/UPDATE/DELETE fails.
5. direct cross-tenant read/enumeration path fails closed.
6. trusted server writer can append a valid audit event.
7. service-role, if used, is server-only and absent from client bundles and public env.
8. DB-level UPDATE and DELETE of audit rows fail, including privileged application attempts.
9. Admin Guard allow produces exactly one durable event with matching correlation and scope.
10. audit-writer failure converts would-be Admin Guard allow into a safe denial/unavailable result.
11. Admin Guard deny remains denied; audit failure cannot create privilege.
12. no password/token/TOTP secret/code/authorization header is persisted or logged.
13. malformed/oversized metadata is rejected/normalized deterministically.
14. existing unit/Auth/MFA/RBAC/RLS suites remain green.
15. pgTAP expands with deterministic audit schema/RLS/immutability proof.
16. Auth/Data API negative matrix proves direct end-user audit mutation denial.
17. E2E proves durable audit row for the synthetic protected flow using local-only inspection.
18. lint/typecheck/unit/build pass.
19. Axe/accessibility regressions remain green for touched UI states, if any.
20. Docker/local Supabase/Auth/Postgres remain healthy.
21. migration status / DB lint / security advisors pass.
22. dependency/peer/secret checks pass.
23. SonarCloud, Socket and CodeRabbit gates pass.
24. no CRITICAL/HIGH unresolved finding.
25. exact-head Evidence Bundle proves all acceptance criteria.
26. PR remains open for separate objective audit; executor does not merge.

## TESTS

Minimum:
- migration/schema tests;
- pgTAP audit table/RLS/immutability tests;
- direct Data API negative CRUD matrix with real authenticated users;
- trusted-writer positive integration test;
- cross-tenant isolation tests;
- audit metadata redaction/validation unit tests;
- Admin Guard allow + durable row + correlation integration proof;
- audit-writer failure fail-closed test;
- existing unit suite;
- existing GMZ-IMPL-003/004/005 regressions;
- lint/typecheck/build;
- E2E desktop/mobile where touched;
- Axe if touched;
- generated DB types;
- migration status;
- DB lint/advisors;
- dependency audit/strict peers;
- secret scan including service-role/public-env leak scan;
- Docker build/up/health/readiness;
- local Supabase/Auth/Postgres status;
- runtime log scan;
- client-bundle/server-only boundary proof;
- SonarCloud;
- Socket;
- CodeRabbit;
- exact-head HIGH_ASSURANCE rerun after all corrections.

## DELIVERABLES

- audit migration/schema;
- append-only DB protection;
- isolated server-only audit writer;
- Admin Guard durable-audit integration;
- safe audit metadata/correlation utilities;
- generated DB type update;
- focused + regression tests;
- GMZ-IMPL-006 Evidence Bundle;
- updated Work Order/checkpoint proposal;
- PR against `main`.

## REVIEW FORMAT

Português brasileiro:
- exact base/head SHA;
- migration/schema delta;
- privileged writer trust boundary;
- service-role containment proof if applicable;
- RLS and immutability proof;
- audit correlation path;
- positive/negative CRUD matrix;
- secret/redaction proof;
- tests with counts;
- findings by severity;
- deferred scope;
- proposed Checkpoint Delta;
- explicit `READY_FOR_OBJECTIVE_AUDIT` or blocker.

## PREDECLARED CREDIT

Maximum after objective acceptance + implementation merge + promotion only:
- GMZ-M23: `6`
- GMZ-M26: `2`
- increment max: `8 / 515`
- current earned: `44 / 515 = 8.54%`
- projected if fully accepted: `52 / 515 = 10.10%`

GMZ-M23 would become `7 / 19` accepted and remains PARTIAL.

## STOP CONDITION

Admission:
`GMZ_IMPL_006_ADMISSION_READY_FOR_REVIEW`

Execution after governed admission promotion and exact bind:
`GMZ_IMPL_006_READY_FOR_OBJECTIVE_AUDIT`


## EXECUTION-BASE BIND

- admission PR: `#63`
- admission disposition: `APPROVED_FOR_ADMISSION_PROMOTION`
- exact execution base: `2490ed590a6fb21f53d79b7ab7c93fee854c01ee`
- execution branch: `execution/gmz-impl-006-durable-audit`
- Context Lock: `BOUND_FOR_EXECUTION`
- stable source fingerprints: `16 / 16 MATCH`
- executor/Codex authorization: `YES, GMZ-IMPL-006 ONLY`
- merge authority: `NO`
- production credit remains `44 / 515 = 8.54%`

The executor must inspect the repository before mutation, revalidate current Supabase service-role/RLS/security-definer guidance, execute the complete Work Order, run the HIGH_ASSURANCE evidence suite, correct failures introduced by the increment, commit/push to this execution branch, update the same PR, and stop for separate objective audit.

STOP CONDITION:
`GMZ_IMPL_006_READY_FOR_OBJECTIVE_AUDIT`


## Execution attempt — 2026-10-04

- Implementation commit: `1055bcf93a37858027165e4e177b9701ec4bdd0d`.
- Tested implementation tree: `520c9eeaa63d3ec4a38a9145f2c8c87a38a9f0b9`.
- Local database/Auth/E2E regressions and CodeRabbit local evidence are recorded in `.engineering/evidence/GMZ-IMPL-006-EVIDENCE.md`.
- Final CodeRabbit local review of the three closeout documents completed with `0 findings`.
- The full development dependency audit reports one unresolved HIGH in the existing transitive development-only chain `@next/eslint-plugin-next → fast-glob → micromatch → braces <=3.0.3`; the upstream advisory lists no patched version. Production dependency audit passed. No out-of-scope dependency override or upgrade was applied.
- SonarCloud, Socket Security Pull Request Alerts/Project Report and hosted CodeRabbit status passed on published PR head `6ba0d36c39fa6457b044773ec33e7c39b83251c9`; exact check URLs/results are recorded in the Evidence Bundle.
- Execution disposition: `BLOCKED`; Work Order acceptance criteria 22–24 are not all satisfied. Do not declare readiness, promote credit, merge, or alter the execution base.
- Current earned credit remains `44 / 515 = 8.54%`.
- Proposed next action: resolve the dependency gate within admitted scope or obtain a governed correction; rerun complete L5 and update the same PR before objective audit.


## GMZ-IMPL-006-CD-001 — dependency-audit HIGH reachability disposition

Status: `AUTHORIZED — CORRECTION REQUIRED`
Review target: PR `#64`
Reviewed head: `6e91279f9c42047645fd354e06c3a45c35e723cf`
Assurance: `HIGH_ASSURANCE`

### Trigger

The complete development dependency audit reports one `HIGH` advisory, `GHSA-vfj7-8cjw-p6xm / CVE-2026-93687`, for transitive `braces@3.0.3` through `@next/eslint-plugin-next@16.3.8 → fast-glob@3.3.1 → micromatch@4.0.8 → braces@3.0.3`. The production dependency audit passes. The upstream advisory currently lists no patched npm release.

### Independent review finding

The scanner finding is valid, but the currently configured Goodz Menu lint path is not affected by the vulnerable input path:

1. `@next/eslint-plugin-next` uses `fast-glob.globSync(...)` in its root-directory helper only when ESLint `settings.next.rootDir` is configured as a string or array.
2. Goodz Menu's `eslint.config.mjs` does not define `settings.next.rootDir`; the plugin therefore uses `context.cwd` and does not invoke that glob-processing branch in the current configuration.
3. `braces` is present only in the development toolchain; the production dependency audit has no HIGH/CRITICAL finding from this advisory.
4. No dependency override, fork, fake version, advisory suppression, or broad toolchain replacement is authorized merely to make the scanner green.

This is not a blanket waiver. The disposition is valid only while the reachability conditions above remain mechanically guarded and the production tree remains unaffected.

### CORRECTION SCOPE

Only the following corrective work is authorized:

1. Add a focused machine-verifiable security guard, preferably `scripts/verify-eslint-braces-not-affected.mjs`, plus a package script such as `security:braces-disposition`.
2. The guard MUST fail if any active flat ESLint config entry defines a non-null `settings.next.rootDir` value.
3. The guard MUST prove that `braces` is absent from the production dependency tree; use deterministic package-manager output or equivalent local inspection.
4. Record the exact dev dependency chain and the upstream call-path/reachability rationale in the Evidence Bundle.
5. Preserve the raw full-audit result truthfully: if `pnpm audit` still reports the advisory, do not claim the raw scanner passed. Instead record the specific advisory as `RESOLVED_NOT_AFFECTED` only after the mechanical guard and reachability evidence pass.
6. Rerun lint and prove the Next ESLint rules remain enabled and functional.
7. Rerun the complete applicable HIGH_ASSURANCE L5 at the exact corrected final HEAD, including production audit, full audit capture, guard, unit, build, E2E, pgTAP, Auth/Data API, Docker/Supabase/Auth/Postgres, secret/client-bundle checks, DB checks, SonarCloud, Socket and CodeRabbit.
8. Update the existing `.engineering/evidence/GMZ-IMPL-006-EVIDENCE.md`, Work Order closeout and proposed Checkpoint Delta. Do not promote credit.
9. Commit/push only to `execution/gmz-impl-006-durable-audit`; keep PR #64 open/draft and unmerged.

### Explicitly prohibited in CD-001

- upgrading, downgrading, overriding or forking `braces`, `micromatch`, `fast-glob`, `@next/eslint-plugin-next`, Next.js or ESLint solely to bypass the advisory;
- changing `pnpm-lock.yaml` unless a separately demonstrated correction blocker requires a new governed delta;
- disabling Next ESLint rules;
- changing `settings.next.rootDir` to manufacture a proof result;
- suppressing/ignoring the advisory without evidence;
- application/runtime/schema/business changes unrelated to this correction;
- merge, force-push, history rewrite, remote Supabase or production deployment.

### ACCEPTANCE CRITERIA — CD-001

1. The raw advisory and exact dependency chain remain explicitly documented.
2. Upstream advisory status is recorded as having no patched npm release at correction time.
3. Production dependency tree contains no affected `braces` path.
4. Active ESLint config contains no `settings.next.rootDir` value.
5. A committed guard automatically fails if either condition 3 or 4 stops being true.
6. Next ESLint recommended rules remain enabled; `pnpm lint` passes.
7. No dependency version or lockfile mutation is introduced by CD-001.
8. The finding is recorded as `RESOLVED_NOT_AFFECTED`, not deleted or falsely reported as a passing raw audit.
9. Unresolved CRITICAL/HIGH after disposition: `0 / 0`.
10. Complete exact-head HIGH_ASSURANCE L5 passes with the correction guard included.
11. Evidence Bundle distinguishes scanner result, reachability disposition, proof and residual risk.
12. PR #64 remains open/draft; no merge or production-credit promotion occurs.

### STOP CONDITION — CD-001

If every CD-001 criterion and the original GMZ-IMPL-006 criteria are objectively satisfied:

`GMZ_IMPL_006_CD_001_READY_FOR_OBJECTIVE_AUDIT`

If the guard/reachability proof fails, `braces` appears in production, the vulnerable `rootDir` path becomes active, or any other unresolved CRITICAL/HIGH remains:

`BLOCKED`
