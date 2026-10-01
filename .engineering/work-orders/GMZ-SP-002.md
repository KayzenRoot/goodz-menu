# GMZ-SP-002 — Canonical Project Overview + Requirements Decomposition

Status: `ADMITTED / PLANNING_ONLY`  
Risk: `ELEVATED_PLANNING`  
Issue: `#4`

## Source Lock
Base: `main@dd8c87e9883f4109509df5160ad6e0e58417f4c7`  
GEF: `1.1.1`  
Seed: `GMZ-SRC-001` SHA-256 `b18a7870bcefb73db6e6faad8e79eb10d1e7ee2af36d9ebd1eab2746474cd5f5`

Mandatory current sources:
- `.engineering/PROJECT-IDENTITY.md`
- `.engineering/SOURCE-HIERARCHY.md`
- `.engineering/MODULE-MAP.md`
- `.engineering/SCOPE.md`
- `.engineering/DECISIONS-LEDGER.md`
- `.engineering/CHECKPOINT.md`
- `.engineering/MASTER-SOURCE-REGISTER.md`

## Objective
Promote the ideation seed into the first canonical Source Pack product contracts:
1. Project Overview
2. Requirements
3. requirement-to-module traceability

## WRITE_ALLOWED
- `docs/source-pack/PROJECT-OVERVIEW.md`
- `docs/source-pack/REQUIREMENTS.md`
- `.engineering/REQUIREMENT-TRACEABILITY.md`
- this Work Order
- its Context Lock
- Checkpoint
- its evidence bundle
- PR/Issue metadata

## WRITE_FORBIDDEN
- runtime/application code
- database schema/migrations
- dependencies/manifests
- CI/build workflows
- deployment files
- `.gef/**`
- secrets/credentials
- final Architecture/Security/DoD claims not owned by this increment

## Acceptance
- Project Overview accurately represents complete-product intent and staged construction;
- Requirements use stable IDs;
- all major seed families are represented;
- each requirement maps to at least one canonical module;
- money/AI/security/autonomy guardrails are explicit;
- no implementation detail is falsely frozen as architecture unless already decided;
- no known HIGH/CRITICAL planning defect.

STOP CONDITION: `GMZ_SP_002_OVERVIEW_REQUIREMENTS_READY_FOR_REVIEW`
