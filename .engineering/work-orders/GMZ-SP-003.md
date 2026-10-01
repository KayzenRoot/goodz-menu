# GMZ-SP-003 — Scope Freeze + Architecture Baseline + Master Source Preservation

Status: `APPROVED / READY_FOR_PROMOTION`  
Risk: `ELEVATED_PLANNING`  
Issue: `#6`

## Source Lock
Base: `main@10feef3f6976dcd8a6b36740e8711fb6234503b1`  
GEF: `1.1.1`  
Seed: `GMZ-SRC-001` SHA-256 `b18a7870bcefb73db6e6faad8e79eb10d1e7ee2af36d9ebd1eab2746474cd5f5`

Mandatory sources:
- `.engineering/SOURCE-HIERARCHY.md`
- `.engineering/MODULE-MAP.md`
- `.engineering/DECISIONS-LEDGER.md`
- `.engineering/REQUIREMENT-TRACEABILITY.md`
- `docs/source-pack/PROJECT-OVERVIEW.md`
- `docs/source-pack/REQUIREMENTS.md`
- current Supabase documentation consulted for local-development/RLS assumptions

## Objective
1. freeze complete-product scope classification;
2. establish architecture baseline and invariants;
3. verify and register the original master source identity while delegating byte-exact repository transport to GMZ-SP-003A / Issue #9;
4. record foundational ADRs.

## WRITE_ALLOWED
- `docs/source-pack/SCOPE.md`
- `docs/source-pack/ARCHITECTURE.md`
- `docs/source-seeds/**`
- `.engineering/SCOPE.md`
- `.engineering/MASTER-SOURCE-REGISTER.md`
- `.engineering/DECISIONS-LEDGER.md`
- `.engineering/adrs/**`
- this Work Order / Context Lock / Checkpoint / evidence

## WRITE_FORBIDDEN
- runtime/application code
- schema/migrations
- dependency manifests
- CI/build workflows
- deployment implementation
- credentials/secrets
- `.gef/**`

## Acceptance
- scope classifications reconcile every GMZ-M00..M28 module;
- architecture maps all 110 requirements to a coherent bounded system shape;
- tenant/security, ledger, integration, offline and AI invariants are explicit;
- architecture distinguishes baseline from later implementation choices;
- source identity/integrity status is truthful and the byte-exact repository archive gap is delegated to GMZ-SP-003A / Issue #9;
- no known HIGH/CRITICAL planning defect.

STOP CONDITION: `GMZ_SP_003_SCOPE_ARCHITECTURE_READY_FOR_REVIEW`


## Correction Delta CD-001 — source archive transport split
Large connector payloads failed byte-exact verification. All noncanonical archive fragments were deleted.

GMZ-SP-003A / Issue #9 now exclusively owns byte-for-byte repository preservation of GMZ-SRC-001.

This Work Order may promote Scope/Architecture independently, but **final Source Pack freeze remains blocked** until GMZ-SP-003A reaches `GMZ_SRC_001_ARCHIVED_BYTE_EXACT`.

The canonical seed identity remains:
- bytes: `79,633`
- lines: `4,770`
- SHA-256: `b18a7870bcefb73db6e6faad8e79eb10d1e7ee2af36d9ebd1eab2746474cd5f5`


## Audit disposition
- Scope module coverage: `29 / 29`
- Architecture invariants: `12`
- foundational ADRs: `4`
- source identity SHA-256: verified
- byte-exact repository archive: delegated to `GMZ-SP-003A / Issue #9`
- CRITICAL findings: `0`
- HIGH findings: `0`
- runtime/product code introduced: `NO`
- disposition: `APPROVED_FOR_PLANNING_PROMOTION`


## Audit disposition
- Scope classification: all GMZ-M00..M28 accounted for.
- Architecture invariants: tenant isolation, auditable ledgers, idempotent integrations, offline authority, AI truth/action boundary and admin-plane separation documented.
- Current Supabase assumptions: revalidated against official docs on 2026-10-01.
- Master seed identity: VERIFIED.
- Byte-exact repository archival: delegated to GMZ-SP-003A / Issue #9 and remains a final Source Pack freeze gate.
- Runtime/product code introduced: NO.
- CRITICAL findings: 0.
- HIGH findings: 0.
- Disposition: `APPROVED_FOR_PLANNING_PROMOTION`.
