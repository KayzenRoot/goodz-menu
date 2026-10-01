# GMZ-SP-001 — Planning Bootstrap + Canonical Source Pack Foundation

Status: `ADMITTED / PLANNING_ONLY`  
Risk: `MODERATE`  
Issue: `#2`

## Source Lock
Execution base: `main@4ef67d1af85f400f893adee54f7fc19961730b70`  
GEF state: `.gef/init-state.json` productVersion `1.1.1`, transaction `APPLIED`.  
Seed source: `GMZ-SRC-001`, SHA-256 `b18a7870bcefb73db6e6faad8e79eb10d1e7ee2af36d9ebd1eab2746474cd5f5`.

## Objective
Create the smallest durable planning/governance foundation needed to decompose the Goodz Menu ideation seed into a canonical Source Pack without introducing product code.

## WRITE_ALLOWED
- `README.md`
- `AGENTS.md`
- `.engineering/**`
- `docs/source-pack/**`

## WRITE_FORBIDDEN
- application/runtime source
- database migrations
- package/dependency manifests unless a separate requirement is admitted
- CI/build workflows in this planning increment
- deployment artifacts
- credentials/secrets
- `.gef/**` mutation
- destructive Git history operations

## Required outputs
- Project Identity
- Source Hierarchy
- Master Source Register
- Module Map
- preliminary Scope
- Decisions Ledger
- Work Order
- Context Lock
- Checkpoint human + machine views
- Source Pack index/skeleton

## Acceptance
- no application code;
- every current seed family has a module/cross-cutting/future mapping;
- current authority domains are explicit;
- current state is reconstructable from repository alone except for the registered byte-for-byte seed portability gap;
- product completion remains `NOT_YET_BASELINED`;
- next action is Source Pack elaboration, not implementation;
- no known HIGH/CRITICAL planning blocker.

## Stop condition
`GMZ_SP_001_PLANNING_BOOTSTRAP_READY_FOR_SOURCE_PACK_ELABORATION`
