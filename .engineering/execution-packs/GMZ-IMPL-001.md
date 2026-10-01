# GMZ-IMPL-001 — Marathon Execution Pack

Status: `ADMISSION_CANDIDATE`

## 1. Mission
Produce the smallest professional executable Goodz foundation that validates the runtime, visual system and local development contract without implementing business domains.

## 2. Closed decisions
Do not reopen unless objective incompatibility is discovered:
- Next.js App Router
- TypeScript strict
- pnpm
- src/ layout
- Tailwind CSS
- shadcn/ui-compatible owned components
- bounded Motion for React
- modular monolith
- local Supabase CLI/Docker
- no Auth implementation
- no business schema
- Docker acceptance path
- Windows owner workflow
- no remote provider creation
- no production deployment

## 3. Executor Navigation Map

### MUST_READ
- checkpoint human + JSON
- Source Hierarchy
- GMZ-IMPL-001 Work Order + Context Lock
- frozen Source Pack README
- Architecture
- Deployment
- Local Docker Contract
- UI/UX Design System
- Security
- Test & Benchmark Plan
- Definition of Done
- Performance Budgets

### READ_IF_TRIGGERED
- Requirements: only relevant requirement sections/IDs
- Decisions Ledger: when a tool/architecture choice conflicts
- source archive/master: only if canonical documents omit a required product fact
- Data Model/API/AI docs: only if executor detects accidental pressure to enter excluded domains

### WRITE_ALLOWED
Exactly the Work Order admitted runtime/shell/test/docs/evidence surface.

### WRITE_FORBIDDEN
Master/.gef/frozen-source semantic changes, business domains, remote infra, production, secrets.

## 4. Implementation Seed Tree

| Target | Mode | Intent |
|---|---|---|
| package.json | NEW_FILE_SEED | scripts, pinned deps/devDeps, engines/packageManager |
| pnpm-lock.yaml | NEW_FILE_SEED | deterministic dependency lock |
| next.config.* | NEW_FILE_SEED | current safe Next config; Docker standalone only if appropriate |
| tsconfig.json | NEW_FILE_SEED | strict TS |
| eslint.config.* | NEW_FILE_SEED | current scaffold lint |
| postcss.config.* | NEW_FILE_SEED | Tailwind pipeline |
| components.json | NEW_FILE_SEED | shadcn ownership/config |
| .env.example | NEW_FILE_SEED | names/placeholders only |
| Dockerfile | NEW_FILE_SEED | local/production-build-capable web image |
| compose.yaml | NEW_FILE_SEED | canonical Docker acceptance web runtime |
| .dockerignore | NEW_FILE_SEED | safe/minimal context |
| src/app/layout.tsx | NEW_FILE_SEED | root theme/font/metadata shell |
| src/app/page.tsx | NEW_FILE_SEED | Foundation Preview only |
| src/app/globals.css | NEW_FILE_SEED | Goodz design tokens/themes/glass/motion |
| src/app/api/health/route.ts | NEW_FILE_SEED | dependency-free liveness |
| src/app/api/ready/route.ts | NEW_FILE_SEED | bounded mandatory dependency readiness |
| src/components/goodz/** | NEW_FILE_SEED | app shell/theme/status/feedback preview |
| src/components/ui/** | NEW_FILE_SEED | only actually-used shadcn primitives |
| src/lib/env/** | NEW_FILE_SEED | validated environment boundary |
| src/lib/runtime/** | NEW_FILE_SEED | readiness/build identity |
| src/lib/observability/** | NEW_FILE_SEED | correlation primitives |
| scripts/** | NEW_FILE_SEED | cross-platform local helpers |
| supabase/config.toml | TOOL_GENERATED_REVIEW | current CLI init output, reviewed |
| supabase/seed.sql | NEW_FILE_SEED/OPTIONAL | non-sensitive, no domain tables |
| tests/e2e/** | NEW_FILE_SEED | foundation shell/health/theme/responsive |
| playwright.config.* | NEW_FILE_SEED | deterministic E2E |
| docs/LOCAL-DEVELOPMENT.md | NEW_FILE_SEED | Windows-first + generic commands |
| .engineering/evidence/GMZ-IMPL-001-EVIDENCE.md | NEW_FILE_SEED | exact-head proof |

Do not precreate unused abstractions.

## 5. Execution DAG

### W0 Preflight
Bind exact execution base, versions, branch, source identities, clean tree.

### W1 Scaffold
Create current stable Next/pnpm scaffold with strict TS/src/Tailwind. Review generated files before preserving.

### W2 Dependency foundation
Add only admitted current stable packages:
- Supabase CLI dev dependency;
- supabase-js only if readiness implementation needs client contract;
- shadcn/ui required primitives;
- Motion;
- E2E tooling.
Pin exact versions and lock.

### W3 Local Supabase
Run current CLI init; review config; establish safe local status/start/stop/reset scripts. No domain migrations.

### W4 Runtime/Docker
Implement Docker acceptance path and cross-platform host connectivity strategy. Validate no production endpoint fallback.

### W5 Design shell
Create Goodz Foundation Preview with light/dark, responsive glass shell, theme toggle, reduced motion and representative feedback/toasts. No fake business metrics.

### W6 Health/observability
Implement liveness, readiness, build identity and correlation.

### W7 Tests
Implement E2E/smoke plus any focused test needed for env/readiness behavior.

### W8 Progressive validation
L0 → L4, repair causal failures only.

### W9 Exact-head sweep
Run all required build/lint/type/test/docker/supabase/security/visual checks on final head.

### W10 Evidence/PR
Create evidence, commit/push, open PR to main. Do not merge.

## 6. Atomic checkpoints
- CP1 scaffold builds
- CP2 local Supabase reproducible
- CP3 Docker web boots
- CP4 shell passes theme/responsive/reduced-motion
- CP5 health/readiness and correlation pass
- CP6 exact-head full assurance green
- CP7 evidence + PR opened

Failure at one checkpoint does not authorize scope expansion.

## 7. File intent capsules

### Runtime health
Purpose: prove app process independently.
Invariant: health does not call optional external providers.
Forbidden: keys/raw errors.

### Runtime readiness
Purpose: prove mandatory local foundation dependency.
Invariant: bounded timeout; sanitized diagnostics; no production fallback.

### Goodz shell
Purpose: visually prove design foundation.
Invariant: “Foundation Preview” labeling; no fake business functionality.
Forbidden: mock revenue/orders presented as real.

### Local environment helper
Purpose: reduce Windows/manual setup friction.
Invariant: cross-platform Node/pnpm orchestration preferred over Bash-only behavior.

### Docker
Purpose: canonical local acceptance.
Invariant: no secret bake-in; non-root/runtime hardening where practical; deterministic install from frozen lockfile.

## 8. Design acceptance
Foundation shell should feel intentional, not starter-template:
- Goodz-specific token names/semantic palette;
- dark/light parity;
- layered translucent surfaces without low-contrast text;
- responsive sidebar/header behavior;
- keyboard-visible focus;
- reduced-motion;
- tasteful microanimation;
- representative toast/feedback states;
- no generic template lorem ipsum.

## 9. Performance guard
At this slice:
- no large chart/data libraries;
- no unnecessary client components;
- Motion only where animation needs it;
- images/fonts optimized through current Next mechanisms;
- shell must not exceed budgets through gratuitous effects.

## 10. Security guard
- publishable values only in client-facing env;
- no service role;
- no remote database;
- no production secrets;
- local config is not production hardened;
- safe errors/correlation IDs;
- dependency/security audit recorded.

## 11. Evidence outputs
Mandatory:
- version matrix;
- exact base/head;
- git status before/after;
- command table with exit codes;
- dependency inventory;
- changed files;
- screenshots dark/light desktop/mobile;
- E2E result;
- build/type/lint result;
- Docker smoke;
- Supabase local smoke;
- env/secret negative check;
- findings table by severity;
- credit eligibility table;
- remaining work.

## 12. Expansion triggers
Executor may broaden read context only if:
- current framework scaffold contradicts planned topology;
- documented API changed;
- Docker networking differs on supported platform;
- Supabase current CLI behavior changed;
- build/test evidence reveals transitive affected source;
- security review requires it.

Expansion is for reading/diagnosis, not scope expansion.

## 13. STOP CONDITION
`GMZ_IMPL_001_READY_FOR_OBJECTIVE_AUDIT`
