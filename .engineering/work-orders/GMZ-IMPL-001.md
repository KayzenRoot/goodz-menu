# GMZ-IMPL-001 — Executable Local Runtime Foundation

Status: `CORRECTION_REQUIRED / GMZ-IMPL-001-CD-005`  
Issue: `#36`  
Assurance: `ELEVATED`  
Base branch: `main`  
Admission base: `aba0a70189c90f8b86c855a34a07332e7a8bc5ff`  
Work branch: `implementation/gmz-impl-001-runtime-foundation`

## OBJECTIVE

Create the first executable Goodz Menu slice from frozen Source Pack v0.1.

The accepted outcome is a reproducible local runtime foundation that lets the owner open Goodz locally, inspect a professional Goodz visual shell, validate light/dark/responsive behavior, verify local Supabase availability, and run foundation checks.

This Work Order MUST NOT claim any food-business module is implemented.

## PREDECLARED PRODUCTION CREDIT

Maximum credit only after governed acceptance:
- GMZ-M25 Runtime, Docker & Deployment: `4`
- GMZ-M04 Design System shell: `1`
- GMZ-M26 Validation & Quality Engineering: `2`
- GMZ-M23 Observability/correlation bootstrap: `1`

Maximum: `8 / 515`.

Admission, commits, LOC, screenshots or partial success earn `0` by themselves.

## REQUIREMENT BINDING

Primary requirements:
- `GMZ-REQ-RUN-001` Docker local
- `GMZ-REQ-RUN-002` environment separation
- `GMZ-REQ-UX-001` dual theme
- `GMZ-REQ-UX-002` design system
- `GMZ-REQ-UX-003` controlled glass/depth
- `GMZ-REQ-UX-004` motion system/reduced motion
- `GMZ-REQ-UX-005` feedback system
- `GMZ-REQ-UX-008` responsive quality
- `GMZ-REQ-OBS-001` correlation
- `GMZ-REQ-QA-003` E2E where applicable
- `GMZ-REQ-QA-004` visual quality
- `GMZ-REQ-QA-005` accessibility
- `GMZ-REQ-QA-006` performance
- `GMZ-REQ-SEC-005` secret hygiene
- `GMZ-REQ-GOV-001..004` governed implementation/evidence

## CURRENT TECHNOLOGY DECISIONS

These decisions are closed for this WO unless current tool/runtime evidence makes them impossible:

1. Web framework: current stable **Next.js App Router**.
2. Language: **TypeScript**, strict mode.
3. Package manager: **pnpm**, exact dependency versions locked.
4. Styling: current stable Tailwind CSS as scaffolded/supported by the selected Next.js generation path.
5. UI primitives: **shadcn/ui-compatible** component ownership model.
6. Animation: **Motion for React** only for bounded shell/microinteraction behavior; simple effects prefer CSS; reduced-motion path mandatory.
7. Database/Auth platform: **Supabase local stack**, launched through current Supabase CLI and Docker-compatible runtime.
8. This WO does **not** implement Auth/SSR session architecture. `@supabase/ssr` is deferred to the Auth Work Order unless a current official scaffold requires it for a non-auth foundation reason.
9. Supabase client usage in this slice is server-side foundation/readiness only; no browser business-data access is required.
10. Architecture remains a **modular monolith**.
11. Production deployment is not performed.
12. Exact package versions MUST be discovered from current stable registries/tooling at execution time, reviewed, pinned and captured in the lockfile. Never use unpinned `latest` as a persisted dependency declaration.

Current official source checks on 2026-10-01:
- Next.js App Router is current recommended modern router and Node >=20.9 is documented for current learning/system requirements.
- Supabase CLI via package manager requires Node 20+ and local stack uses Docker-compatible containers.
- Supabase local stack is development/test only and must never be exposed as production.
- Current Supabase docs recommend repository-controlled local config/migrations/seeds.
- Current shadcn docs support current Next.js and `src/` layout.
- Current Motion docs support Next.js App Router and recommend pinning fixed versions.

## EXECUTION BASE BINDING

Execution base is now bound:

- admission merge: `0932c46134ad5e94cf1b5d29c8e7e8ac65d2e585`
- legal executor base: `0932c46134ad5e94cf1b5d29c8e7e8ac65d2e585`
- work branch was fast-forwarded to that merge before post-admission bind.
- executor mutation is authorized only inside this Work Order and its WRITE_ALLOWED surface.

If executor starts from a different lineage, STOP with:
`GMZ_IMPL_001_EXECUTION_BASE_MISMATCH`.

## MUST READ FIRST

1. `.engineering/CHECKPOINT.md` + `.engineering/CHECKPOINT.json`
2. `.engineering/SOURCE-HIERARCHY.md`
3. this Work Order
4. `.engineering/context-locks/GMZ-IMPL-001.json`
5. `.engineering/execution-packs/GMZ-IMPL-001.md`
6. `docs/source-pack/README.md`
7. `docs/source-pack/ARCHITECTURE.md`
8. `docs/source-pack/DEPLOYMENT.md`
9. `.engineering/LOCAL-DOCKER-CONTRACT.md`
10. `docs/source-pack/UI-UX-DESIGN-SYSTEM.md`
11. `docs/source-pack/SECURITY.md`
12. `docs/source-pack/TEST-BENCHMARK-PLAN.md`
13. `docs/source-pack/DEFINITION-OF-DONE.md`
14. `.engineering/PERFORMANCE-BUDGETS.md`

Do not reread the entire 4,770-line master unless a genuine source conflict or missing requirement triggers expansion.

## REQUIRED IMPLEMENTATION

### A. Runtime scaffold
Create one current stable Next.js App Router application at repository root using TypeScript, `src/` layout and pnpm.

Required:
- lockfile;
- strict TS;
- deterministic scripts;
- build/lint/typecheck support;
- safe environment schema/validation;
- no hidden production endpoint defaults.

### B. Local Supabase
Initialize repository-owned local Supabase development configuration through the current CLI.

Required:
- committed `supabase/config.toml`;
- safe seed placeholder/fixtures only when supported;
- no production data;
- no remote project link;
- no business schema tables;
- no service-role secret exposed to client;
- reproducible `start/status/stop/reset` workflow.

### C. Docker runtime
Provide a supported Docker-compatible Goodz web runtime.

Requirements:
- Dockerfile and compose/runtime configuration as appropriate;
- Windows/Docker Desktop compatible;
- no public Supabase exposure;
- explicit local host gateway handling where a container must reach the locally exposed Supabase stack;
- local runtime may offer a fast native Next dev mode, but Docker mode is the canonical acceptance path.

### D. Goodz visual foundation
Implement only a **foundation preview shell**, clearly labeled as such.

Must include:
- Goodz brand shell;
- light/dark themes;
- responsive desktop/mobile layout;
- controlled glassmorphism/depth tokens;
- typography/spacing/radius/shadow tokens;
- theme toggle;
- reduced-motion behavior;
- representative polished success/info/warning/error feedback/toast demo;
- foundation status cards for local app/Supabase/runtime;
- disabled/not-implemented navigation labels may exist only when clearly marked as preview/not implemented.

No fake functional dashboard metrics that could be mistaken for real business data.

### E. Health/readiness
Create safe:
- liveness endpoint;
- readiness endpoint.

Liveness must not depend on optional external providers.

Readiness must verify mandatory local foundation dependency state using supported/documented Supabase interfaces, bounded timeout and sanitized failure output.

Responses include safe:
- status;
- environment;
- build/revision identity when available;
- correlation/request identifier.

Never expose keys, tokens, database credentials or raw provider errors.

### F. Correlation / observability bootstrap
Establish minimal request correlation/build identity utility used by foundation health paths and logs.

Do not introduce a full observability vendor in this WO.

### G. Validation harness
Required final-head commands/cases:
- install with frozen lockfile;
- lint;
- typecheck;
- production build;
- automated foundation tests;
- Playwright or equivalent E2E smoke for shell;
- dark/light check;
- responsive mobile/desktop check;
- reduced-motion check;
- health/readiness check;
- Docker build/up smoke;
- local Supabase status;
- secret scan / dependency audit at repository-approved threshold;
- no cross-environment production fallback.

Visual evidence must include representative dark and light screenshots from the final candidate head.

## TARGET FILE TOPOLOGY

Expected intent, not permission to create unrelated files:

```text
/
├── package.json
├── pnpm-lock.yaml
├── next.config.*
├── tsconfig.json
├── eslint.config.*
├── postcss.config.*
├── components.json
├── .env.example
├── .dockerignore
├── Dockerfile
├── compose.yaml
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── globals.css
│   │   └── api/
│   │       ├── health/route.ts
│   │       └── ready/route.ts
│   ├── components/
│   │   ├── goodz/**
│   │   └── ui/**
│   └── lib/
│       ├── env/**
│       ├── runtime/**
│       └── observability/**
├── scripts/
│   └── local-development helpers as needed
├── supabase/
│   ├── config.toml
│   └── seed.sql or current supported seed layout if used
├── tests/
│   └── e2e/**
├── playwright.config.*
└── docs/
    └── LOCAL-DEVELOPMENT.md
```

If current official scaffolding produces materially different healthy filenames, preserve current conventions and record the delta. Do not fight the framework for cosmetic conformity.

## WRITE ALLOWED

- application/runtime scaffold files admitted above;
- `supabase/**` local config with **no business domain schema**;
- tests/e2e foundation;
- local-development docs/scripts;
- Work Order evidence;
- checkpoint/progress artifacts;
- files generated by current stable scaffold/toolchain that are necessary for this slice.

## WRITE FORBIDDEN

- `.gef/**`
- master source archive bytes
- semantic rewrite of frozen Source Pack without a governed scope delta
- product/ingredient/inventory/finance/order domain models
- business database tables/migrations
- tenant/Auth/RBAC implementation
- iFood/99Food adapters
- WhatsApp/e-mail integrations
- AI agents/model providers
- investment tooling
- SaaS billing/subscription implementation
- remote Supabase project creation/link
- production deployment
- real credentials/secrets
- main direct mutation
- force push/history rewrite

## OUT OF SCOPE

No feature is “implemented” merely because its navigation item exists.

Specifically excluded:
- sign-up/login;
- tenant creation;
- real dashboard metrics;
- POS sale;
- product CRUD;
- inventory;
- finance;
- Goodz Online ordering;
- marketplace integration;
- AI/Business Copilot;
- Super Admin business behavior.

## PREFLIGHT

Executor records:
- exact `git rev-parse HEAD`;
- exact `git status --short`;
- Node version;
- pnpm version;
- Docker version;
- Supabase CLI version;
- current stable Next.js/shadcn/Motion versions selected;
- fingerprints/SHAs of locked canonical sources;
- confirmation branch descends from bound execution base.

Working tree must be clean before mutation.

## VALIDATION LADDER

### L0
- package/config syntax;
- lockfile integrity;
- TS config;
- current framework config validation.

### L1
- direct foundation unit/smoke tests.

### L2
- shell/theme/health affected closure.

### L3
- Docker + local Supabase + application readiness integration.

### L4
- security/secret/environment negative checks;
- visual/accessibility smoke;
- Windows/path assumptions review.

### L5 exact-head
Run all acceptance commands on final candidate head and bind evidence to that head.

## EVIDENCE BUNDLE

Must record:
- legal execution base;
- final head SHA;
- package/tool versions;
- changed files;
- exact commands + exit codes;
- test names/counts/results;
- Docker/Supabase status;
- build/type/lint results;
- E2E results;
- light/dark screenshots/artifacts;
- accessibility smoke;
- dependency/security audit;
- secret scan;
- unresolved findings by severity;
- requirement mapping;
- credit eligibility mapping by M25/M04/M26/M23;
- explicit statement of excluded business features;
- PR URL/number.

## EXECUTOR RULES

1. Inspect before edit.
2. Do not rediscover product scope.
3. Use current official framework/provider docs when version-specific behavior is encountered.
4. Pin exact versions and commit lockfile.
5. Never weaken strictness/test/security for speed.
6. Do not create remote infrastructure.
7. Do not merge.
8. Do not mark module done.
9. Commit/push work branch and open PR to `main`.
10. Final execution report in pt-BR includes exact head, validation, findings, screenshots/evidence and STOP CONDITION.

## REVIEW DISPOSITION

Auditor returns one:
- `APPROVED`
- `CORRECTION_REQUIRED`
- `BLOCKED`

Known CRITICAL/HIGH forbids progression and credit.

## STOP CONDITION

Stop only when implementation is committed/pushed, PR is open against `main`, final exact-head evidence is complete, and executor reports:

`GMZ_IMPL_001_READY_FOR_OBJECTIVE_AUDIT`


## ADMISSION AUDIT
- reviewed admission candidate: `e9f5d274f5316d223b0a6bb1ad632388e325e04f`
- governance-only delta: `PASS`
- Socket Security checks: `SUCCESS`
- CRITICAL/HIGH: `0 / 0`
- disposition: `APPROVED_FOR_ADMISSION_PROMOTION`
- executor remains blocked until the admission merge SHA is written to Context Lock.


## EXECUTOR ADMISSION
- admission PR: `#37`
- admission final head: `59bc67a4555cfee164d17ea2dc17a8b9fd2cc5ae`
- admission merge / execution base: `0932c46134ad5e94cf1b5d29c8e7e8ac65d2e585`
- final admission checks: `SUCCESS`
- execution authority: `ACTIVE FOR GMZ-IMPL-001 ONLY`
- self-merge authority: `NO`


## OBJECTIVE AUDIT FINAL
- exact runtime/test head: `b231ecd0a8fb62c8c6330671a38133f4df12dc37`
- final L5: `PASS`
- GEF fingerprints: `14 / 14 MATCH`
- Socket Security: `SUCCESS`
- unresolved review threads: `0`
- historical LOW findings: `3 / FIXED`
- accepted residual LOW hardening: `Issue #39`
- CRITICAL/HIGH: `0 / 0`
- eligible credit after merge: `8 / 515`
- credit before merge: `0 / 515`
- disposition: `APPROVED_FOR_PROMOTION`


## GMZ-IMPL-001-CD-005
- source: final CodeRabbit review after CD-003
- finding: overlapping 15s status refreshes could complete out of order and allow an older result to overwrite a newer state
- severity: `LOW`
- correction: refresh sequence guard with stale-result discard
- regression test: delayed older health/readiness request vs newer refresh
- scope expansion: `NO`
- production credit: `0 / 515`
- required next: `complete exact-head L5 rerun`
- disposition: `CORRECTION_REQUIRED`
