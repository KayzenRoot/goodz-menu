# GMZ-SP-003A — Byte-Exact Source Archive Evidence

Status: `READY_FOR_REVIEW`

## Binding
- Repository: `KayzenRoot/goodz-menu`
- Issue: `#9`
- Base: `0d247eb651995bcea2d9912dd4698d040503fda8`
- Branch: `planning/gmz-sp-003a-source-archive`
- Work Order: `GMZ-SP-003A`

## Original source verification
Materialized original conversation artifact:
- name: `GOODZ-MENU-MASTER-IDEAS-v0.3-FINAL.md`
- bytes: `79,633`
- lines: `4,770`
- SHA-256: `b18a7870bcefb73db6e6faad8e79eb10d1e7ee2af36d9ebd1eab2746474cd5f5`
- expected Git blob SHA-1: `12becc0f50e09a63f1b35fca1c04d769e9b7a486`

## Transport proof
The repository blob was created directly and returned:
- Git blob SHA-1: `12becc0f50e09a63f1b35fca1c04d769e9b7a486`
- expected: same
- result: `MATCH`

## Independent repository recovery proof
The blob was fetched back from GitHub and independently re-hashed:
- bytes: `79,633 / MATCH`
- lines: `4,770 / MATCH`
- SHA-256: `b18a7870bcefb73db6e6faad8e79eb10d1e7ee2af36d9ebd1eab2746474cd5f5 / MATCH`
- result: `PASS`

## Repository path
`docs/source-archive/GOODZ-MENU-MASTER-IDEAS-v0.3-FINAL.md`

## Integrity rule
No approximate, partial or normalized copy is accepted as GMZ-SRC-001.

## Preliminary audit
- byte identity: PASS
- line identity: PASS
- SHA-256: PASS
- Git blob identity: PASS
- runtime/product changes: NONE
- CRITICAL: 0
- HIGH: 0

STOP CONDITION: `GMZ_SRC_001_ARCHIVED_BYTE_EXACT`
