# GMZ-IMPL-002 — Tenant Hierarchy and Isolation Foundation

Status: `READY_FOR_OBJECTIVE_AUDIT`
Issue: `#42`  
Assurance: `HIGH`  
Base branch: `main`  
Admission base: `3f8bef75b40751b522aaed0dc6b7d09ad19ee110`  
Work branch: `implementation/gmz-impl-002-tenant-core`

## OBJECTIVE

Implement the first physical multi-tenant database slice for Goodz Menu:

```text
Organization
  → Establishment
    → Branch
```

This Work Order establishes canonical tenant hierarchy, explicit tenant propagation and fail-closed database exposure.

It MUST NOT implement product Auth, Membership, Roles, Permissions or tenant onboarding.

## PREDECLARED PRODUCTION CREDIT

Maximum credit only after governed acceptance and merge:
- GMZ-M01 Platform Core & Multi-Tenancy: `10`
- GMZ-M26 Validation & Quality Engineering: `1`

Maximum this increment: `11 / 515`.

Current earned baseline before this increment: `8 / 515`.

Admission, migration count, LOC or test count earn `0` by themselves.

## REQUIREMENT BINDING

Primary:
- `GMZ-REQ-PLAT-001` Multi-tenancy
- `GMZ-REQ-PLAT-003` Branch awareness
- `GMZ-REQ-GOV-001..004` governed implementation/evidence

Partial prerequisite boundary only:
- `GMZ-REQ-PLAT-002` Tenant-safe authorization

This WO proves a deny-by-default database boundary. Membership-aware authorization remains owned by GMZ-M02 and is NOT claimed complete here.

## EXECUTION BASE BINDING

- admission merge: `4fa468ccf4c03dbb2822c41e8a821ad95fa0f2c9`
- legal execution base: `4fa468ccf4c03dbb2822c41e8a821ad95fa0f2c9`
- branch fast-forwarded to that merge before executor authorization.
- executor mutation is authorized only inside GMZ-IMPL-002 WRITE_ALLOWED scope.

If executor starts from a different lineage, STOP with:
`GMZ_IMPL_002_EXECUTION_BASE_MISMATCH`.

## SOURCE MODEL BINDING

Canonical ownership:
- Organization / Establishment / Branch → `GMZ-M01`
- Membership / Role / Permission → `GMZ-M02`

Data hierarchy:
- Organization = commercial tenant/account boundary
- Establishment = operating business inside organization
- Branch = physical/operational unit

Explicit organization propagation is required on child records where it protects authorization/query safety.

## CURRENT SUPABASE IMPLEMENTATION DECISIONS

Verified against current Supabase documentation on 2026-10-02.

1. Existing pinned CLI remains `supabase@2.119.0` unless an objective incompatibility is demonstrated.
2. This repository uses the migration-first workflow for this slice.
3. New migration files MUST be created through the current CLI command discovered via:
   `supabase migration new --help`
4. Local schema reproducibility MUST be proven with local `db reset`.
5. Database tests use `supabase test db` / pgTAP.
6. The three tenancy tables live in the exposed `public` schema for the canonical baseline.
7. RLS is enabled on all three.
8. No tenant-facing RLS policy is created until GMZ-M02 owns canonical membership/auth data.
9. `anon` and `authenticated` direct table privileges are denied for this slice.
10. No service-role/secret credential enters browser/runtime code.
11. No remote project link, `db push`, linked reset or production operation is admitted.
12. Generated TypeScript database types are allowed and should be committed after schema acceptance.

## REQUIRED PHYSICAL SCHEMA

### public.organizations
Minimum admitted shape:
- `id uuid primary key default gen_random_uuid()`
- `display_name text not null`
- `legal_name text null`
- `status text not null default 'active'`
- `created_at timestamptz not null default now()`

Constraints:
- nonblank bounded display name;
- status limited to `active | suspended | archived`.

### public.establishments
Minimum admitted shape:
- `id uuid primary key default gen_random_uuid()`
- `organization_id uuid not null`
- `display_name text not null`
- `status text not null default 'active'`
- `created_at timestamptz not null default now()`

Constraints:
- FK to organizations, delete behavior `RESTRICT`;
- nonblank bounded display name;
- status constraint;
- composite uniqueness needed to support tenant-safe parent integrity.

### public.branches
Minimum admitted shape:
- `id uuid primary key default gen_random_uuid()`
- `organization_id uuid not null`
- `establishment_id uuid not null`
- `display_name text not null`
- `status text not null default 'active'`
- `created_at timestamptz not null default now()`

Constraints:
- composite FK must prove that `establishment_id` belongs to the same `organization_id`;
- cross-organization parent substitution must fail at database level;
- nonblank bounded display name;
- status constraint.

Do not add owner_user_id, membership_id, role_id, plan_id, setting columns or business-domain fields in this WO.

## RLS / PRIVILEGE POSTURE

For all three tenancy tables:
- enable RLS;
- do not create permissive tenant access policies;
- revoke direct table privileges from `anon` and `authenticated` for this slice;
- preserve privileged migration/administration capability only where local Supabase requires it.

This deliberate closed posture is temporary until GMZ-M02 implements membership/auth authorization.

A reviewer must be able to prove:
- RLS is enabled;
- anon cannot SELECT/INSERT/UPDATE/DELETE;
- authenticated cannot SELECT/INSERT/UPDATE/DELETE;
- no policy accidentally grants access.

## SEED

Synthetic local/dev hierarchy only.

Allowed example:
- one synthetic organization;
- one synthetic establishment;
- one or more synthetic branches.

Forbidden:
- real customer/business PII;
- passwords;
- tokens;
- production identifiers;
- real financial data.

Seed IDs may be stable deterministic UUIDs if this improves repeatable tests.

## GENERATED TYPES

Generate local database types through current CLI after the schema is stable.

Preferred target:
`src/lib/supabase/database.types.ts`

If current CLI output/path conventions differ, preserve current supported behavior and document the delta.

No Supabase client integration is required merely to consume these types in this WO.

## DATABASE TEST REQUIREMENTS

Create database tests under the current Supabase-supported test layout.

Must prove at minimum:
1. all three tables exist;
2. PKs are UUID-backed and non-null;
3. required columns/constraints exist;
4. organization → establishment FK exists;
5. branch composite parent FK exists;
6. valid hierarchy inserts succeed under privileged test setup;
7. cross-organization branch/establishment mismatch fails;
8. invalid lifecycle status fails;
9. blank display name fails;
10. RLS enabled on all three tables;
11. anon has no direct CRUD privilege;
12. authenticated has no direct CRUD privilege;
13. no tenant-facing RLS policy exists yet;
14. reset + seed reproduce the same valid hierarchy.

Tests must be transactional/isolated where supported.

## EXISTING FOUNDATION REGRESSION

GMZ-IMPL-001 must remain healthy.

At exact-head L5:
- install frozen;
- lint;
- typecheck;
- unit tests;
- production build;
- existing E2E;
- Docker web smoke;
- local Supabase status;
- health/readiness;
- secret scan;
- dependency audit;
- .gef integrity.

## MIGRATION / LOCAL VALIDATION

Executor MUST:
1. inspect current CLI help;
2. create migration via current supported CLI command;
3. author/review SQL;
4. run local reset;
5. run database tests;
6. run local migration list/status;
7. run current local DB lint/advisor equivalent if supported by installed CLI;
8. generate TypeScript types;
9. rerun reset/tests after generated artifacts and final corrections.

No linked/remote database operation is allowed.

## WRITE ALLOWED

- `supabase/migrations/**`
- `supabase/seed.sql`
- `supabase/tests/database/**`
- `src/lib/supabase/database.types.ts`
- minimal package scripts needed for local database test/type generation
- database-focused local documentation if required
- GMZ-IMPL-002 evidence/governance files
- checkpoint/progress artifacts after execution closeout

## WRITE FORBIDDEN

- `.gef/**`
- Auth UI/session implementation
- organization memberships
- roles/permissions
- tenant signup/onboarding
- user profiles
- Settings/Entitlements
- business-domain tables
- POS/catalog/inventory/orders/finance
- remote Supabase project/link
- `supabase db push`
- linked reset
- production deployment
- real secrets/data
- arbitrary Source Pack rewrites
- main direct mutation
- force push/history rewrite

## PRE-FLIGHT

Record:
- exact repository/branch/head;
- legal execution base;
- clean working tree;
- Node/pnpm/Supabase CLI/Docker versions;
- stable source fingerprints;
- checkpoint state;
- current `supabase/**` topology;
- current migration history = none before this WO unless branch state proves otherwise.

If the work branch does not descend from the bound execution base, STOP.

## VALIDATION LADDER

### L0
Migration syntax/config/type-generation command validation.

### L1
pgTAP structural and constraint tests.

### L2
RLS/privilege negative tests + reset/seed reproducibility.

### L3
Supabase local integration + generated types + existing app foundation.

### L4
security negative checks, secret scan, migration review, DB lint/advisor where available.

### L5 exact head
Run complete required suite on the exact final candidate and bind all evidence to that head.

## EVIDENCE BUNDLE

Must record:
- exact base/final head;
- migration filename generated by CLI;
- migration SQL review summary;
- schema objects/constraints;
- RLS state;
- grants/policies state;
- pgTAP test names/count/results;
- db reset result;
- migration list/status;
- generated-types result;
- DB lint/advisor result or documented unsupported command;
- existing app regression results;
- Docker/Supabase health;
- secret/dependency checks;
- changed files;
- requirement mapping;
- severity findings;
- explicit statement that GMZ-M02 Auth/Membership remains unimplemented;
- credit eligibility;
- PR number/URL.

## REVIEW DISPOSITION

- `APPROVED`
- `CORRECTION_REQUIRED`
- `BLOCKED`

Known CRITICAL/HIGH defect blocks progression and credit.

## STOP CONDITION

Stop only when implementation is committed/pushed, PR is open against main, exact-head evidence is complete, and executor reports:

`GMZ_IMPL_002_READY_FOR_OBJECTIVE_AUDIT`


## ADMISSION AUDIT
- reviewed candidate: `6f63b2efee74c114316e4b03fd61f822e4716f56`
- governance-only delta: `PASS`
- stable source fingerprints: `14 / 14 MATCH`
- Socket Security checks: `SUCCESS`
- CRITICAL/HIGH: `0 / 0`
- disposition: `APPROVED_FOR_ADMISSION_PROMOTION`
- executor remains blocked until the admission merge SHA is bound.


## EXECUTOR ADMISSION
- admission PR: `#43`
- admission merge / execution base: `4fa468ccf4c03dbb2822c41e8a821ad95fa0f2c9`
- final admission checks: `SonarCloud + Socket = SUCCESS`
- stable source fingerprints: `14 / 14 MATCH`
- execution authority: `ACTIVE FOR GMZ-IMPL-002 ONLY`
- self-merge authority: `NO`


## GMZ-IMPL-002-CD-001 — Objective review correction
- trigger 1: `SonarCloud Quality Gate FAILURE`
- Sonar condition: `18.3% new-code duplication > 3%`
- correction: generated `src/lib/supabase/database.types.ts` excluded only from CPD duplication scoring via `.sonarcloud.properties`
- generated types remain in normal source/security analysis
- trigger 2: branch tenant-parent lookup lacked an explicit referencing-side index
- correction: `branches_organization_establishment_idx (organization_id, establishment_id)`
- regression: pgTAP assertion added for exact index columns
- semantic product scope change: `NO`
- Auth/Membership/RBAC scope change: `NO`
- execution base change: `NO`
- production credit: `8 / 515`
- exact-head L5 after correction: `REQUIRED`
- disposition: `CORRECTION_REQUIRED`


## GMZ-IMPL-002-CD-002 — Objective review correction
- trigger 1: top-level Work Order status remained `CORRECTION_REQUIRED / GMZ-IMPL-002-CD-001` after CD-001 validation; current status synchronized to `READY_FOR_OBJECTIVE_AUDIT` while preserving CD-001 above as historical record
- trigger 2: pgTAP privilege regression covered only table CRUD and did not cover TRUNCATE, REFERENCES, TRIGGER, or column-level privileges
- correction: table-level checks cover SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, and TRIGGER for anon/authenticated on all three tenancy tables
- correction: has_any_column_privilege checks cover SELECT, INSERT, UPDATE, and REFERENCES for anon/authenticated on all three tenancy tables
- migration and seed changes: `NONE`
- production privilege posture: unchanged; current revocations remain in the migration
- pgTAP count: `57 / 57 PASS`
- candidate exact-head L5 after the test correction: `PASS`; final documentation-closeout head is retested and recorded in PR `#44`
- scope/base/Auth/Membership/RBAC/remote Supabase/production: `UNCHANGED / NOT IMPLEMENTED / NOT USED`
- production credit: `8 / 515`
- evidence: `.engineering/evidence/GMZ-IMPL-002-CD-002-EVIDENCE.md`
- disposition: `READY_FOR_OBJECTIVE_AUDIT`

STOP CONDITION:
`GMZ_IMPL_002_CD_002_READY_FOR_OBJECTIVE_AUDIT`


## GMZ-IMPL-002-CD-003 — Objective review correction
- trigger: CodeRabbit finding `4166278998`; `supabase:types` printed generated output without updating the tracked file, and direct redirection could truncate it on failure
- correction: `supabase:types` now invokes `scripts/generate-supabase-types.mjs`; output goes to a unique temporary file beside `database.types.ts`, and `rename` replaces the target only after exit code 0 and non-empty output
- failure handling: preserve the existing target and remove the temporary file on CLI, write, or replacement failure
- Windows compatibility: invoke the Supabase `.cmd` shim using `ComSpec` / `cmd.exe /d /s /c` with `spawn(..., shell: false)`; validated against the local CLI on Windows
- regression proof: success replaces the target; non-zero generator exit preserves existing contents and cleans temporary output; `2 / 2 PASS`
- actual Windows `pnpm supabase:types`: `PASS`; generated output was formatted with the established Oxfmt `0.71.0` workflow afterward
- code candidate: `dcbf3ba`; final documentation-closeout head and complete exact-head L5 results are recorded in PR `#44`
- schema/migration/seed/business scope/`.gef`: `UNCHANGED`
- Context Lock, execution base, branch, and CD-002 history: `UNCHANGED`
- evidence: `.engineering/evidence/GMZ-IMPL-002-CD-003-EVIDENCE.md`
- disposition: `READY_FOR_OBJECTIVE_AUDIT`

STOP CONDITION:
`GMZ_IMPL_002_CD_003_READY_FOR_OBJECTIVE_AUDIT`
