# GMZ-IMPL-002 — Execution Pack

Status: `READY_FOR_EXECUTOR`

## Mission

Create the canonical tenant hierarchy in local PostgreSQL/Supabase with fail-closed exposure and reproducible database tests.

## Closed decisions
- Organization → Establishment → Branch.
- GMZ-M01 owns those entities.
- GMZ-M02 owns Membership/Auth/Roles and is out of scope.
- migration-first workflow for this slice.
- public schema + RLS enabled + no tenant policies yet.
- anon/authenticated direct privileges denied.
- explicit organization_id on Establishment and Branch.
- Branch parent relationship must prevent cross-organization substitution.
- UUID identifiers.
- synthetic seeds only.
- no remote Supabase.

## Execution DAG

### W0 — Preflight
Read GEF files, validate execution base, source fingerprints, CLI versions and current Supabase topology.

### W1 — CLI discovery
Run relevant `supabase ... --help` commands before mutation. Confirm local-only flags/workflow.

### W2 — Migration creation
Create the first migration through Supabase CLI. Do not invent timestamp filenames.

### W3 — Physical tenant schema
Implement organizations, establishments and branches with constraints, RLS and closed grants.

### W4 — Seed
Add deterministic synthetic hierarchy only.

### W5 — Database test harness
Add pgTAP tests for structure, constraints, RLS/grants and cross-tenant parent mismatch.

### W6 — Reset + prove
Run local db reset and database tests until causal defects are fixed.

### W7 — Types
Generate local TypeScript DB types and commit them.

### W8 — Existing foundation regression
Run current app/unit/build/E2E/Docker/health suite.

### W9 — Exact-head L5
Repeat all required database + application + security checks on final head.

### W10 — Evidence / PR
Update evidence, commit/push same branch, open PR, do not merge.

## Expected file intent

```text
supabase/
├── migrations/
│   └── <CLI-generated>_tenant_hierarchy.sql
├── seed.sql
└── tests/
    └── database/
        └── tenant_core*.sql

src/lib/supabase/
└── database.types.ts

package.json
.engineering/evidence/GMZ-IMPL-002-EVIDENCE.md
```

Additional files require direct necessity and must remain within WO scope.

## Schema integrity notes

Prefer database-enforced parent consistency over application-only checks.

For Branch:
```text
(organization_id, establishment_id)
  → establishments(organization_id, id)
```

This requires a matching unique candidate key on Establishment.

Do not rely on globally unique `establishment_id` alone to prove tenant parent consistency.

## RLS posture

No Membership source exists yet, therefore do not invent temporary membership policies.

The correct state for this slice is:
- RLS ON;
- tenant access policies absent;
- anon/authenticated table privileges closed.

GMZ-M02 later introduces authenticated membership-aware access through a separate Work Order.

## Test intent capsules

### tenant schema structure
Prove tables, columns, PK/FK/check constraints.

### hierarchy integrity
Prove a Branch cannot bind organization B to an Establishment owned by organization A.

### closed tenant access
Prove anon/authenticated cannot perform CRUD against tenancy tables.

### RLS baseline
Prove relrowsecurity is true and no permissive tenant policy exists.

### seed reproducibility
Prove db reset restores valid synthetic hierarchy.

## Security guard

Never solve a failing RLS/privilege test by:
- disabling RLS;
- adding broad authenticated policy;
- exposing service role;
- using user-editable metadata;
- granting ALL to anon/authenticated.

## Current-doc snapshot

Revalidated 2026-10-02:
- Supabase local migration workflow;
- local reset/migration tracking;
- RLS guidance;
- database testing via `supabase test db` / pgTAP.

Executor must consult current CLI `--help` and official docs if actual behavior differs.

## STOP CONDITION
`GMZ_IMPL_002_READY_FOR_OBJECTIVE_AUDIT`
