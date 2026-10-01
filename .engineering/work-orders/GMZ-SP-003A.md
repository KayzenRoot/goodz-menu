# GMZ-SP-003A — Preserve GMZ-SRC-001 Byte-Exact in Repository

Status: `APPROVED / READY_FOR_PROMOTION`  
Risk: `HIGH_INTEGRITY_PLANNING`  
Issue: `#9`

## Source Lock
Base: `main@0d247eb651995bcea2d9912dd4698d040503fda8`

## Objective
Preserve the original Goodz Menu ideation seed in repository truth without changing a byte, then close the final blocker to Source Pack freeze.

## Source identity
- file: `GOODZ-MENU-MASTER-IDEAS-v0.3-FINAL.md`
- bytes: `79,633`
- lines: `4,770`
- SHA-256: `b18a7870bcefb73db6e6faad8e79eb10d1e7ee2af36d9ebd1eab2746474cd5f5`
- expected Git blob SHA-1: `12becc0f50e09a63f1b35fca1c04d769e9b7a486`

## Archive path
`docs/source-archive/GOODZ-MENU-MASTER-IDEAS-v0.3-FINAL.md`

## WRITE_ALLOWED
- source archive path above;
- source archive README;
- Master Source Register;
- Source Pack README;
- Checkpoint human + machine;
- this Work Order;
- Context Lock;
- Evidence Bundle.

## WRITE_FORBIDDEN
- any semantic edit to the master file;
- product/runtime code;
- schema/migrations;
- dependencies;
- CI/build/deploy implementation;
- .gef mutation.

## Acceptance
Repository-recovered source independently verifies:
- bytes `79,633`;
- lines `4,770`;
- SHA-256 exact match;
- Git blob SHA exact match;
- Source Register promoted;
- Source Pack final-freeze blocker removed;
- no HIGH/CRITICAL defect.

STOP CONDITION: `GMZ_SRC_001_ARCHIVED_BYTE_EXACT`


## Audit disposition
- audited candidate head: `645548fa1fc49bb2e533201def9a6392574c3179`
- Socket Security checks: `SUCCESS`
- repository archive blob: `12becc0f50e09a63f1b35fca1c04d769e9b7a486 / MATCH`
- recovered bytes: `79,633 / MATCH`
- recovered lines: `4,770 / MATCH`
- recovered SHA-256: `MATCH`
- CRITICAL/HIGH: `0 / 0`
- disposition: `APPROVED_FOR_PLANNING_PROMOTION`
