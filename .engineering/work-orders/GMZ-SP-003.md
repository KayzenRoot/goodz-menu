# GMZ-SP-003 — Scope Freeze + Architecture Baseline + Master Source Preservation

Status: `ADMITTED / PLANNING_ONLY`  
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
3. preserve the original master source artifact in-repository before Source Pack closure;
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
- source preservation status is truthful;
- no known HIGH/CRITICAL planning defect.

STOP CONDITION: `GMZ_SP_003_SCOPE_ARCHITECTURE_READY_FOR_REVIEW`
