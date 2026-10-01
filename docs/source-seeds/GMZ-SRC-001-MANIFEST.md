# GMZ-SRC-001 — Preservation Manifest

Status: `SOURCE_VERIFIED / ARCHIVE_COPY_IN_PROGRESS`

Original source:
- filename: `GOODZ-MENU-MASTER-IDEAS-v0.3-FINAL.md`
- bytes: `79,633`
- lines: `4,770`
- SHA-256: `b18a7870bcefb73db6e6faad8e79eb10d1e7ee2af36d9ebd1eab2746474cd5f5`
- encoding: UTF-8
- terminal newline: present

Local source bytes were revalidated on 2026-10-01 before archival:
- byte count matched
- line count matched
- SHA-256 matched the registered GMZ-SRC-001 digest

The archive is stored as ordered base64 chunks under this directory so exact bytes can be reconstructed without editorial transformation.

Reconstruction rule:
1. decode each `GMZ-SRC-001.part-NNN.b64` independently in numeric order;
2. concatenate decoded bytes with no separators;
3. resulting file MUST have SHA-256 `b18a7870bcefb73db6e6faad8e79eb10d1e7ee2af36d9ebd1eab2746474cd5f5`.

No reconstructed artifact may be called GMZ-SRC-001 if the digest differs.
