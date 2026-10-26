# Evidence Bundle — GMZ-REBOOT-001

**Review status: `BLOCKED`** — published head `4ca68ba72ae45df6aaade7ca5ccab5bdd824c67a` passed app-foundation CI, desktop/mobile E2E, dependency audit, and secret scan. SonarCloud no longer reports Reliability `C`; Security remains `B` for the two local-only HTTP findings. Commit `7eb87ceaa55949395456b0ae93d507927ae13a80` wraps the `.find` predicate flagged in the previous analysis; local unit tests, lint, and typecheck pass. Delta reviews: Standards `PASS`; Spec confirms the ordinary mapped-drive case is rejected; Security and Spec retain a conditional P2 because a forged `SystemDrive` can bypass the check, so the code does not prove the executable is on a local volume. No HIGH/CRITICAL issues were reported. Docker/Supabase lifecycle, formal SonarCloud disposition for the HTTP findings, and manual keyboard/focus/zoom/screen-reader review also remain outstanding; a manual browser review attempt stopped because the Windows Computer Use helper failed to initialize. The objective-audit stop condition has not been met.

## Identity and scope

- Work Order: `.engineering/work-orders/GMZ-REBOOT-001.md`
- Requirement traceability: [`TRACEABILITY.md`](TRACEABILITY.md), checked against the current `APPROVED_V0.1` requirements file.
- Issue: [#73](https://github.com/KayzenRoot/goodz-menu/issues/73)
- Draft PR: [#74](https://github.com/KayzenRoot/goodz-menu/pull/74)
- Branch: `rebuild/gmz-reboot-001-module-01`
- Base: `main@3139534697743494626f4940b78ac3f9d468ceb6`
- Foundation code candidate: `7eb87ceaa55949395456b0ae93d507927ae13a80`
- Local command output excerpts and environment versions: [`LOCAL-VALIDATION.md`](LOCAL-VALIDATION.md).
- Published PR head `4ca68ba72ae45df6aaade7ca5ccab5bdd824c67a` has a passing app-foundation workflow and exact-head manifest (`99` changed paths; binary diff SHA-256 `fc40ebff11c823023453d2d47a8363174c3c826dc14264097a9eb9e94fbf33d1`). SonarCloud fails only the Security Rating condition `B`; the prior Reliability `C` condition cleared after the predicate wrapper. No raw diff or screenshot is uploaded as a workflow artifact.
- Scope: new foundation shell, isolated local runtime, liveness/readiness, correlation IDs, local Docker/Supabase wrappers, and test harness. No business module, product login, tenant model, or business data was carried forward.

Legacy product routes, auth/MFA/admin-guard/tenant/audit source and tests, business migrations, and seed were removed from this reboot branch after inventory. The checkpoint, Source Pack, ADRs, source hierarchy, issue history, and legacy PRs remain untouched. Published head `4ca68ba72ae45df6aaade7ca5ccab5bdd824c67a` has an exact-head manifest and passing app-foundation checks; SonarCloud still fails Security `B`. Implementation commit `7eb87ceaa55949395456b0ae93d507927ae13a80` addresses the annotated predicate and retains the conditional P2 from Spec/Security review.

## Canonical source fingerprints

All six Work Order fingerprints match the approved values:

| File | SHA-1 | Result |
| --- | --- | --- |
| `.engineering/CHECKPOINT.json` | `77b8b2a7dc88d1d97f01e5889f8bf5d2d40a95e8` | PASS |
| `.engineering/SOURCE-HIERARCHY.md` | `189109435a264fe5a7306d6d10fc3ea62145dab2` | PASS |
| `.engineering/DECISIONS-LEDGER.md` | `3e5f06879ea1e60d6be32bb89fa2955885f7ff86` | PASS |
| `.engineering/MODULE-MAP.md` | `c70a041da273787eb0d6f3ce43a6bc3a7260eeb0` | PASS |
| `docs/source-pack/ARCHITECTURE.md` | `a82ff873264a1ba77fa37e6914f321a48e0a75f5` | PASS |
| `docs/source-pack/DEFINITION-OF-DONE.md` | `a3d1652a7dc9edfabafcb98151b9db8aed417888` | PASS |

## Executed checks

| Command | Result |
| --- | --- |
| `pnpm install --frozen-lockfile` | PASS — frozen lockfile and supply-chain policy verification |
| `pnpm lint` | PASS — no warnings or errors |
| `pnpm typecheck` | PASS |
| `pnpm test` | PASS — 44 tests across 5 files, including HTTP 503 readiness, loopback-only network creation/refusal, Docker CLI local path resolution and UNC/SystemDrive mismatch rejection, reset preflight, endpoint allowlist and Docker-context pinning cases |
| `pnpm build` | PASS — Next.js 16.4.3 production build |
| `pnpm test:e2e` | PASS — desktop Chromium and mobile Chromium; light/dark themes, Axe WCAG tags, dynamic status announcements, reduced motion, tablet navigation names at 700 px, health/readiness and responsive width |
| `pnpm security:deps` | PASS — no known vulnerabilities at the audit snapshot; Vite is pinned to patched `8.3.3` through `pnpm-workspace.yaml` |
| `pnpm security:secrets` | PASS — 37 scoped source/config files |
| Standalone start with a synthetic service-role-shaped key | PASS — entrypoint refused to start and did not print the value |
| `node scripts/dev.mjs --port 3200`, then GET `/api/health` and `/api/ready` | PASS — liveness `200`; readiness `503` with sanitized `supabase_anon_key_required` while Supabase is unavailable |
| Workflow YAML and action pins | PASS — YAML parsed; all 4 referenced actions use full 40-character commit SHAs |
| Supabase reset network preflight | PASS — tests verify creation with `host_binding_ipv4=127.0.0.1` and refusal of a network bound to `0.0.0.0`; the pinned CLI accepts `--network-id`. Reset itself was not run |
| Reset confirmation guard | PASS — with `GOODZ_ALLOW_LOCAL_DB_RESET=0`, reset exited 2 before engine access |
| Docker Desktop CLI path | PASS — resolved from standard install location; `docker compose version` reports `v5.6.0` with child `PATH` restricted to that CLI directory |
| `docker info` | BLOCKED — `desktop-linux` selected, but the Docker Desktop Linux engine named pipe is absent |
| `git diff --check` | PASS |

The E2E server uses a synthetic health fixture on loopback, not a Supabase stack. Unit tests cover readiness success, the route's HTTP 503 for missing configuration, upstream failure, timeout, URL restrictions, key validation, isolated local project configuration, endpoint allowlists, Docker readiness through `http://kong:8000`, and pinning operations to the inspected Docker endpoint after a simulated context switch. The current Compose setup attaches the web container to the loopback-restricted Supabase bridge and uses its internal gateway; because Docker is unavailable here, that container-to-container route and reset behavior remain unverified at runtime.

## Visual artifacts

- [Desktop — light](screenshots/foundation-desktop-chromium-light.png)
- [Desktop — dark](screenshots/foundation-desktop-chromium-dark.png)
- [Mobile — light](screenshots/foundation-mobile-chromium-light.png)
- [Mobile — dark](screenshots/foundation-mobile-chromium-dark.png)

## Initial independent review corrections

The initial Standards and Spec reviews examined `87145b01940c42bab515f45bad1e41d029b07260` and requested canonical requirement traceability, app-foundation CI, and live announcements for dynamic runtime states. Preliminary Security reviews of `99514c86a22e3ad179328b7dd25594391fbba2c9` and `ff6331c5286148631036904e345b9261350d0c40` requested immutable action pins and identified TCP loopback Docker endpoints as a possible tunnel to a remote daemon. Standards review of `6fbc64331103b2db44d11e053fb2dd9a8127b1b7` found Docker context time-of-check/time-of-use risk. Review of `584155fb39d32d13430e3bd7a7cddbbfaf3c3c26` found a tablet-width navigation naming gap and an artifact upload path that did not require a passing secret scan. A later Spec review inferred that the web container might not reach a host-loopback-published Supabase API; the current code removes that host route, attaches web and Supabase to the same loopback-restricted bridge, and uses `http://kong:8000`. That fix is supported by the Supabase internal-gateway contract but still needs runtime confirmation. The same review found that database reset did not pass the custom network ID; `supabase:reset` now passes `goodz-menu-reboot-001-loopback`, and the pinned Supabase CLI help confirms the global flag is supported. A direct HTTP test now asserts that the readiness route returns 503 with a sanitized dependency state when Supabase is unconfigured. The reset and container network remain unverified because the local Docker engine is absent. The candidate includes module/requirement traceability, `.github/workflows/goodz-app-foundation.yml`, an atomic polite status region with E2E assertions, accessible names at tablet widths, full action commit SHAs, a Docker Desktop named-pipe-only guard, pinned Docker/Supabase subprocess endpoints, context-switch unit coverage, and a JSON exact-head manifest with changed paths and a binary diff hash. It does not upload the raw diff or screenshots as CI artifacts. The scoped secret scanner covers runtime/config paths; it does not inspect the full history, documentation, or committed screenshots. Fresh independent reviews are required on the final PR head.

The latest Security review found that `--network-id` alone did not ensure the named network was already loopback-bound. After explicit reset confirmation, the wrapper now creates or validates `goodz-menu-reboot-001-loopback` before invoking Supabase; it refuses an existing network with any other host binding. Unit tests cover both safe creation and fail-closed refusal. The reset itself remains unverified because Docker is unavailable.

The published heads' automated review found transitional low-contrast colors on mobile, two local HTTP protocol/endpoints (rule S5332), ambient `PATH` resolution for Docker (rule S4036), and a direct `.find(exists)` predicate flagged by Sonar. The code removes opacity and color interpolation from the relevant text/link states, resolves Docker Desktop from standard local install locations on inherited `SystemDrive`, rejects UNC and differing-drive roots when that variable reflects the actual system drive, restricts child `PATH`, and wraps the predicate in an explicit callback. Custom Docker Desktop installs on another drive are unsupported. Follow-up security review found no HIGH/CRITICAL issues, but retains a P2 because a forged `SystemDrive` can make a mapped drive pass; actual Windows volume type is not checked. Treat this as an accidental-configuration guard, not a strict local-volume boundary. The two S5332 findings remain visible in Sonar because the endpoints are HTTP by local Supabase design; source suppressions were removed. Their false-positive status and the Security `B` gate require maintainer review. The latest app-foundation run passed all checks, and Reliability `C` cleared.

The final Security review also identified that direct `pnpm exec supabase ...` invocations bypass the wrappers. `docs/LOCAL-DEVELOPMENT.md` now defines the supported local lifecycle as the `pnpm supabase:*` wrappers only. Direct CLI invocation is outside that documented contract and is not technically blocked by this repository.

## Blockers and limits

- `docker context show` selected `desktop-linux`. The Docker Desktop CLI exists in the standard per-user install directory, but `docker info` failed because the local engine named pipe does not exist. No engine or volume inventory was available.
- Local checks ran with Node.js `26.4.0`; the app CI pins Node.js `24`, so the exact supported runtime is still awaiting PR CI.
- `pnpm supabase:start` and `pnpm docker:up` stopped at the local-engine preflight before invoking Supabase or Compose. Docker build/up/health/down and Supabase start/status/stop therefore remain unverified. No reset was run.
- `.github/workflows/goodz-app-foundation.yml` runs frozen install, lint, typecheck, unit tests, build, desktop/mobile E2E, dependency audit, and scoped secret scan on PRs and `main`. The previous PR-head run failed on mobile Axe contrast and SonarCloud Security Rating `B`; the corrected head's CI is pending.
- No remote Supabase, remote database, production environment, or production data was accessed. The reboot branch has not been merged; the approved checkpoint has not been changed.
- The current checkpoint remains `GMZ_IMPL_007_ADMISSION_CANDIDATE_READY_FOR_REVIEW` at `52/515`; this reboot does not claim that historical credit as new work.

**Decision:** keep the candidate `BLOCKED` for objective audit until Docker/Supabase local acceptance, final PR-head CI, and the required human visual/manual accessibility reviews are recorded. Do not emit `GMZ_REBOOT_001_READY_FOR_OBJECTIVE_AUDIT` or start `GMZ-M01` yet.
