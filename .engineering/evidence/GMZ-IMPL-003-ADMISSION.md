# GMZ-IMPL-003 — Admission Evidence

Status: `ADMISSION_CANDIDATE`

## Binding
- Issue: `#47`
- admission base: `main@81ff6d87c2af25ebf5cd55ba8038bcad5a86b83a`
- branch: `implementation/gmz-impl-003-membership-authz`
- GEF: `1.1.1`
- assurance: `HIGH_ASSURANCE`
- current production credit: `19 / 515 = 3.69%`
- max additional accepted credit: `12`
- projected cumulative only if later accepted: `31 / 515 = 6.02%`

## Source check

The next NECESSARY Wave 0 dependency is GMZ-M02 because:
- GMZ-M01 tenant hierarchy is promoted;
- GMZ-REQ-PLAT-002 requires identity + membership + role/policy + resource scope;
- GMZ-IMPL-002 intentionally left authenticated tenant access fail-closed until GMZ-M02;
- canonical Data Model assigns Membership / Role / Permission to GMZ-M02.

## Security boundary

Admitted now:
- Supabase Auth identity binding;
- tenant membership;
- tenant RBAC;
- narrower establishment/branch role scope;
- membership-aware hierarchy READ authorization;
- high-assurance negative tests.

Deferred:
- signup/onboarding/invites;
- login UI;
- membership/role management API/UI;
- platform admin;
- MFA/AAL2 enforcement;
- Admin Guard;
- support mode;
- ownership transfer;
- session-management UI;
- business-domain authorization.

## Current-doc validation

Official Supabase documentation was revalidated on 2026-10-02:
- Auth tokens integrate with RLS;
- unauthenticated `auth.uid()` is NULL;
- user-editable `user_metadata` is unsafe as authorization truth;
- JWT authorization claims can be stale until token refresh;
- current MFA uses assurance levels such as AAL1/AAL2;
- current RBAC guidance supports claims/hooks but does not require claims as the only authorization design;
- current Next.js SSR guidance uses the supported Supabase server-side packages/cookie model when UI/session integration is later admitted.

The admitted baseline therefore favors fresh canonical DB membership evaluation for tenant authorization.

## Credit

Predeclared maximum:
- GMZ-M02: `10`;
- GMZ-M26: `2`;
- total: `12 / 515`.

Admission earns `0`.

## Admission gate

Executor mutation remains blocked until:
1. admission packet is reviewed;
2. admission PR checks are green;
3. CRITICAL/HIGH = 0;
4. admission PR is merged;
5. exact admission merge SHA is bound as execution base;
6. branch descends from that SHA;
7. Context Lock state becomes `BOUND_FOR_EXECUTION`.

STOP CONDITION:
`GMZ_IMPL_003_ADMISSION_READY_FOR_REVIEW`
