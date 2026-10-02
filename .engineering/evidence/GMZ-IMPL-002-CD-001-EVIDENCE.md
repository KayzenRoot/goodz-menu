# GMZ-IMPL-002-CD-001 — Objective Review Correction Evidence

Status: `CORRECTION_APPLIED / EXACT_HEAD_L5_PENDING`

## Parent
- Work Order: `GMZ-IMPL-002`
- Issue: `#42`
- PR: `#44`
- prior final head: `d728a36bdd7d55e4196752dcf19381686e529639`

## Finding A — Sonar Quality Gate
Severity: `BLOCKING QUALITY GATE`

SonarCloud result:
- Quality Gate: `FAIL`
- new-code duplication: `18.3%`
- required: `<= 3%`

The new generated Supabase database types file contains generator-owned structural boilerplate. The correction uses the documented narrow duplication exclusion:
`sonar.cpd.exclusions=src/lib/supabase/database.types.ts`

This does NOT exclude the file from normal issue/security analysis.

## Finding B — tenant-parent index
Severity: `LOW / PERFORMANCE-READINESS`

`branches` used the correct composite FK but did not have a referencing-side composite index.

Correction:
`branches_organization_establishment_idx (organization_id, establishment_id)`

This supports:
- tenant-prefixed branch queries;
- establishment-parent integrity operations;
- future tenant/RLS hot-path planning.

## Regression
pgTAP now asserts the named index exists with exact ordered columns.

## Boundaries
- Auth/Membership/RBAC: `UNCHANGED / NOT IMPLEMENTED`
- remote Supabase: `NONE`
- production deploy: `NONE`
- business-domain tables: `NONE`
- .gef: `UNCHANGED`
- legal execution base: `UNCHANGED`
- production credit: `8 / 515`

## Required gate
Because schema/test/quality-config files changed:
- repeat GEF preflight;
- stable fingerprints 14/14;
- governance snapshot check;
- db reset;
- pgTAP;
- generated-type equivalence;
- lint/typecheck/unit/build/E2E;
- Docker/Supabase health;
- security/advisor/audit checks;
- SonarCloud green on the new PR head;
- exact-head evidence refresh.

STOP CONDITION:
`GMZ_IMPL_002_CD_001_EXACT_HEAD_L5_REQUIRED`
