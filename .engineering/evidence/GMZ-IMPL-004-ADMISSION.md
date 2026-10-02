# GMZ-IMPL-004 — Admission Evidence

Status: `ADMISSION_CANDIDATE`

## Source check

Base: `45ab857e7a509bf1867d6e53b948346f425c754a` after GMZ-IMPL-003 promotion.

Canonical state:
- GMZ-IMPL-003: `PROMOTED_COMPLETE`;
- production credit: `31 / 515 = 6.02%`;
- active implementation authorization: `NO`;
- next canonical action: `ADMIT_NEXT_IMPLEMENTATION_WORK_ORDER`.

## Why this increment is NECESSARY

The promoted backend proves membership-aware authorization, but the application has no supported user-facing Auth/session path. Before commerce/business modules expose tenant data, the app needs a real validated identity/session entry that flows into the existing RLS boundary.

The Source Pack requires authentication to remain separate from authorization, least privilege, tenant-isolation proof, revoked/suspended session behavior testing and compatibility with stronger authentication for later sensitive actions.

## Repository discovery

At admission:
- Next.js runtime is pinned at `16.3.8`;
- no application Supabase SSR/Auth client integration is present;
- no product password sign-in, protected Auth route or login page exists;
- local Supabase/Auth infrastructure is already available;
- GMZ-IMPL-003 provides canonical membership/RBAC and RLS read authorization.

## Scope classification

NECESSARY:
- login/session/logout;
- server-validated identity;
- protected tenant entry;
- session refresh lifecycle;
- no-membership/revoked/suspended fail-closed behavior;
- regression/security evidence.

IMPORTANT / deferred:
- recovery;
- invitation UX;
- richer tenant switcher;
- session inventory.

FUTURE / separate HIGH_ASSURANCE:
- MFA/AAL2;
- Admin Guard;
- Platform Admin;
- support mode;
- owner transfer.

OUT OF SCOPE:
- business CRUD;
- remote Supabase;
- production deployment.

## Fingerprints

Stable locked sources: `16 / 16` captured from admission base. The checkpoint is tracked separately as a mutable governance snapshot.

## Credit guard

- current: `31 / 515`
- GMZ-M02 max this slice: `5`
- GMZ-M26 max this slice: `2`
- maximum increment after later acceptance/merge/promotion: `7`
- projected cumulative only if fully accepted: `38 / 515 = 7.38%`
- admission earns: `0`

## Admission safety

This admission PR is governance-only. It authorizes no executor mutation until objectively reviewed, merged, and the exact admission merge SHA is bound as execution base.

CRITICAL/HIGH planning blocker: `0 / 0`.

STOP CONDITION:
`GMZ_IMPL_004_ADMISSION_READY_FOR_REVIEW`
