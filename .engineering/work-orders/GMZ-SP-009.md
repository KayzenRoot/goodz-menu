# GMZ-SP-009 — Deployment + Local Docker Contract Baseline

Status: `APPROVED / READY_FOR_PROMOTION`  
Risk: `ELEVATED_PLANNING`  
Issue: `#31`

## Source Lock
Base: `main@1c326c0b5774ef260f125284ea503c56f506e58c`

Mandatory sources:
- Architecture v0.1
- Data Model v0.1 corrected
- Security v0.1
- Test & Benchmark Plan v0.1
- Requirements v0.1
- current official Supabase local-development/deployment documentation revalidated on 2026-10-01

## Objective
Freeze the deployment/runtime contract that future implementation must satisfy, with reproducible local Docker development as a first-class supported path.

## WRITE_ALLOWED
- `docs/source-pack/DEPLOYMENT.md`
- `.engineering/LOCAL-DOCKER-CONTRACT.md`
- `.engineering/ENVIRONMENT-MATRIX.md`
- this Work Order
- Context Lock
- Checkpoint
- Evidence Bundle

## WRITE_FORBIDDEN
- Dockerfile/compose implementation
- Supabase project initialization
- migrations/schema implementation
- package/dependency manifests
- CI/CD workflow implementation
- cloud/provider project creation
- credentials/secrets
- production deployment

## Acceptance
- local runtime topology explicit;
- environment separation explicit;
- secret/config boundary explicit;
- database migration source-of-truth rules explicit;
- seed-data and reset behavior explicit;
- local-network exposure restrictions explicit;
- provider mock/sandbox boundary explicit;
- production topology remains portable where not yet frozen;
- backups/recovery/health/observability expectations explicit;
- no HIGH/CRITICAL planning defect.

STOP CONDITION: `GMZ_SP_009_DEPLOYMENT_LOCAL_DOCKER_READY_FOR_REVIEW`


## Audit disposition
- candidate head: `187faa259b808f8c46ceb2d6008d9972d828c4d0`
- Socket Security checks: `SUCCESS`
- CRITICAL/HIGH: `0 / 0`
- implementation: `NONE`
- disposition: `APPROVED_FOR_PLANNING_PROMOTION`
