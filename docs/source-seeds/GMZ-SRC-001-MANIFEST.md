# GMZ-SRC-001 — Preservation Manifest

Status: `ARCHIVED / RECONSTRUCTABLE`

Original source:
- filename: `GOODZ-MENU-MASTER-IDEAS-v0.3-FINAL.md`
- bytes: `79,633`
- lines: `4,770`
- SHA-256: `b18a7870bcefb73db6e6faad8e79eb10d1e7ee2af36d9ebd1eab2746474cd5f5`
- encoding: UTF-8
- terminal newline: present

## Verified local artifact
The original artifact available to this planning session was revalidated on 2026-10-01:
- byte count: MATCH
- line count: MATCH
- SHA-256: MATCH

## Repository archival status
The source is preserved as deterministic gzip+base64 chunks:

- `GMZ-SRC-001.gzip.b64.part-001`
- `GMZ-SRC-001.gzip.b64.part-002`
- `GMZ-SRC-001.gzip.b64.part-003`
- `GMZ-SRC-001.gzip.b64.part-004`

The four parts are concatenated in lexical order, Base64-decoded, then gzip-decompressed to reconstruct the original UTF-8 bytes.

The archive segmentation uses four equal Base64 chunks of 9,041 characters. The deterministic gzip stream was generated with zero mtime so the archive is reproducible.

## Verification contract
A valid reconstruction MUST produce:
- bytes: `79,633`
- lines: `4,770`
- SHA-256: `b18a7870bcefb73db6e6faad8e79eb10d1e7ee2af36d9ebd1eab2746474cd5f5`

Any mismatch invalidates the archive claim.

STOP CONDITION: `GMZ_SRC_001_ARCHIVE_COMPLETE`
