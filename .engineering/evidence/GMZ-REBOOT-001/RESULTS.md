# Evidence Bundle — GMZ-REBOOT-001

**Review status: `BLOCKED`** — at the recorded PR #74 snapshot, the PR was OPEN/Draft at HEAD `78b013b95afc8a3e9de66a2e6f83ab51b94120fd`; this documentation-only head sits on implementation code head `2d65738c9a79e0315171bb7798aee1de5b1a431c`. App-foundation run [40398881229](https://github.com/KayzenRoot/goodz-menu/actions/runs/40398881229) for that exact PR head completed successfully, including desktop/mobile browser checks and dependency/secret scans. The earlier code-head run [40396937840](https://github.com/KayzenRoot/goodz-menu/actions/runs/40396937840) also passed. Both Socket checks passed; SonarCloud failed Security Rating `B` (required `A`). Local tests, lint, typecheck, exact Windows junction verification, and independent Security review pass; the former mapped-drive and reparse-point P2 findings are closed. Residual limits remain documented: the helper trusts the normal Windows `SystemRoot`/`WINDIR` environment and cannot prevent same-user path changes between inspection and execution. Docker/Supabase lifecycle and manual keyboard/focus/zoom/screen-reader review remain outstanding. Static screenshots were inspected for layout and text readability; this does not constitute human visual or accessibility sign-off. The prior Computer Use attempt stopped before browser interaction because it could not determine the current URL. No HIGH/CRITICAL issues were reported. The objective-audit stop condition has not been met.

## Identity and scope

- Work Order: `.engineering/work-orders/GMZ-REBOOT-001.md`
- Requirement traceability: [`TRACEABILITY.md`](TRACEABILITY.md), checked against the current `APPROVED_V0.1` requirements file.
- Issue: [#73](https://github.com/KayzenRoot/goodz-menu/issues/73)
- Draft PR: [#74](https://github.com/KayzenRoot/goodz-menu/pull/74)
- Branch: `rebuild/gmz-reboot-001-module-01`
- Base: `main@3139534697743494626f4940b78ac3f9d468ceb6`
- Foundation code candidate: `2d65738c9a79e0315171bb7798aee1de5b1a431c`
- Local command output excerpts and environment versions: [`LOCAL-VALIDATION.md`](LOCAL-VALIDATION.md).
- Implementation code head `2d65738c9a79e0315171bb7798aee1de5b1a431c` retains base `3139534697743494626f4940b78ac3f9d468ceb6`; its app-foundation run `40396937840` passed. At the separately recorded PR snapshot `78b013b95afc8a3e9de66a2e6f83ab51b94120fd`, documentation-only changes sat above that code head; app run `40398881229` passed, both Socket checks passed, and SonarCloud failed Security Rating `B` (required `A`). No raw diff or screenshot is uploaded as a workflow artifact.
- Scope: new foundation shell, isolated local runtime, liveness/readiness, correlation IDs, local Docker/Supabase wrappers, and test harness. No business module, product login, tenant model, or business data was carried forward.

Legacy product routes, auth/MFA/admin-guard/tenant/audit source and tests, business migrations, and seed were removed from this reboot branch after inventory. The checkpoint, Source Pack, ADRs, source hierarchy, issue history, and legacy PRs remain untouched. Implementation commit `2d65738c9a79e0315171bb7798aee1de5b1a431c` closes the mapped-drive access ordering and generic reparse-point checks. The approved checkpoint remains unchanged.

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
| `pnpm test` | PASS — 50 tests across 5 files, including HTTP 503 readiness, loopback-only network creation/refusal, mapped-drive rejection before path inspection, raw reparse-point rejection, and a real Windows junction check; also reset preflight, endpoint allowlist and Docker-context pinning cases |
| `pnpm build` | PASS — Next.js 16.4.3 production build |
| `pnpm test:e2e` | PASS — desktop Chromium and mobile Chromium; light/dark themes, Axe WCAG tags, dynamic status announcements, reduced motion, tablet navigation names at 700 px, health/readiness and responsive width |
| `pnpm security:deps` | PASS — no known vulnerabilities at the audit snapshot; Vite is pinned to patched `8.3.3` through `pnpm-workspace.yaml` |
| `pnpm security:secrets` | PASS — 37 scoped source/config files |
| Standalone start with a synthetic service-role-shaped key | PASS — entrypoint refused to start and did not print the value |
| `node scripts/dev.mjs --port 3200`, then GET `/api/health` and `/api/ready` | PASS — liveness `200`; readiness `503` with sanitized `supabase_anon_key_required` while Supabase is unavailable |
| Workflow YAML and action pins | PASS — YAML parsed; all 4 referenced actions use full 40-character commit SHAs |
| Supabase reset network preflight | PASS — tests verify creation with `host_binding_ipv4=127.0.0.1` and refusal of a network bound to `0.0.0.0`; the pinned CLI accepts `--network-id`. Reset itself was not run |
| Reset confirmation guard | PASS — with `GOODZ_ALLOW_LOCAL_DB_RESET=0`, reset exited 2 before engine access |
| Docker Desktop CLI path | PASS — Windows resolver returned `C:\Users\csn19\AppData\Local\Programs\DockerDesktop\resources\bin\docker.exe`; raw Windows attribute query rejected a real junction before `realpath` |
| `docker info` | PASS — `desktop-linux` selected; Docker Engine `29.8.2` responded on the Docker Desktop Linux pipe |
| `docker network inspect goodz-menu-reboot-001-loopback` | PASS — `host_binding_ipv4=127.0.0.1`, IPv4 enabled, IPv6 disabled |
| `pnpm supabase:start` | BLOCKED — local images pulled; starting `supabase_db_goodz-menu-reboot-001` failed with `runtime: cannot allocate memory`. The CLI printed `Stopping containers...`; a subsequent `docker ps -a` showed no Goodz containers. No reset was run |
| `git diff --check` | PASS |

The E2E server uses a synthetic health fixture on loopback, not a Supabase stack. Unit tests cover readiness success, the route's HTTP 503 for missing configuration, upstream failure, timeout, URL restrictions, key validation, isolated local project configuration, endpoint allowlists, Docker readiness through `http://kong:8000`, and pinning operations to the inspected Docker endpoint after a simulated context switch. The current Compose setup attaches the web container to the loopback-restricted Supabase bridge and uses its internal gateway; Supabase startup failed with `runtime: cannot allocate memory`, so that container-to-container route and reset behavior remain unverified at runtime.

## Visual artifacts

- [Desktop — light](screenshots/foundation-desktop-chromium-light.png)
- [Desktop — dark](screenshots/foundation-desktop-chromium-dark.png)
- [Mobile — light](screenshots/foundation-mobile-chromium-light.png)
- [Mobile — dark](screenshots/foundation-mobile-chromium-dark.png)

The four screenshots were inspected at desktop and mobile widths in light/dark themes; the layout and text remained readable. Keyboard traversal, visible focus, zoom, and screen-reader behavior are still unverified. The Windows Computer Use attempt stopped before browser interaction because it could not determine the current URL.

## Initial independent review corrections

The initial Standards and Spec reviews examined `87145b01940c42bab515f45bad1e41d029b07260` and requested canonical requirement traceability, app-foundation CI, and live announcements for dynamic runtime states. Preliminary Security reviews of `99514c86a22e3ad179328b7dd25594391fbba2c9` and `ff6331c5286148631036904e345b9261350d0c40` requested immutable action pins and identified TCP loopback Docker endpoints as a possible tunnel to a remote daemon. Standards review of `6fbc64331103b2db44d11e053fb2dd9a8127b1b7` found Docker context time-of-check/time-of-use risk. Review of `584155fb39d32d13430e3bd7a7cddbbfaf3c3c26` found a tablet-width navigation naming gap and an artifact upload path that did not require a passing secret scan. A later Spec review inferred that the web container might not reach a host-loopback-published Supabase API; the current code removes that host route, attaches web and Supabase to the same loopback-restricted bridge, and uses `http://kong:8000`. That fix is supported by the Supabase internal-gateway contract but still needs runtime confirmation. The same review found that database reset did not pass the custom network ID; `supabase:reset` now passes `goodz-menu-reboot-001-loopback`, and the pinned Supabase CLI help confirms the global flag is supported. A direct HTTP test now asserts that the readiness route returns 503 with a sanitized dependency state when Supabase is unconfigured. The loopback network is now verified by local inspect, but the reset and full container lifecycle remain unverified: the local engine is available and Supabase startup failed before the stack became healthy because of a memory allocation error. The candidate includes module/requirement traceability, `.github/workflows/goodz-app-foundation.yml`, an atomic polite status region with E2E assertions, accessible names at tablet widths, full action commit SHAs, a Docker Desktop named-pipe-only guard, pinned Docker/Supabase subprocess endpoints, context-switch unit coverage, and a JSON exact-head manifest with changed paths and a binary diff hash. It does not upload the raw diff or screenshots as CI artifacts. The scoped secret scanner covers runtime/config paths; it does not inspect the full history, documentation, or committed screenshots. Fresh independent reviews are required on the final PR head.

The latest Security review found that `--network-id` alone did not ensure the named network was already loopback-bound. After explicit reset confirmation, the wrapper now creates or validates `goodz-menu-reboot-001-loopback` before invoking Supabase; it refuses an existing network with any other host binding. Unit tests cover both safe creation and fail-closed refusal. The reset itself remains unverified because the Supabase stack could not start under current memory availability.

The earlier published heads exposed transitional mobile contrast, local HTTP protocol findings (rule S5332), ambient `PATH` resolution (rule S4036), and the `.find(exists)` predicate. Later commits addressed contrast, Docker path resolution, and predicate clarity. The former forged-`SystemDrive` issue is closed by querying fixed-drive types before touching candidate paths; the reparse-point issue is closed by checking raw `FILE_ATTRIBUTE_REPARSE_POINT` attributes before `realpath`. A real Windows junction regression test confirms the attribute and rejection path. Independent review reports no HIGH/CRITICAL issues. `SystemRoot`/`WINDIR` integrity and concurrent same-user path changes remain explicit trust-boundary limits. Local-only HTTP findings remain visible and need formal SonarCloud disposition; no source suppressions were added. App-foundation run `40396937840` passed for code head `2d65738`. At the recorded PR snapshot `78b013b`, app run `40398881229` also passed; both Socket checks passed, while SonarCloud failed Security `B` (required `A`).

The final Security review also identified that direct `pnpm exec supabase ...` invocations bypass the wrappers. `docs/LOCAL-DEVELOPMENT.md` now defines the supported local lifecycle as the `pnpm supabase:*` wrappers only. Direct CLI invocation is outside that documented contract and is not technically blocked by this repository.

## Blockers and limits

- `docker context show` selected `desktop-linux`. The Docker Desktop CLI exists in the standard per-user install directory and the Windows fixed-drive inventory/path checks pass. Docker Desktop is running; WSL reports `docker-desktop` running, and `docker info` returns Engine `29.8.2`. The Goodz loopback network exists with `host_binding_ipv4=127.0.0.1`. `pnpm supabase:start` failed while creating the local Postgres container with `runtime: cannot allocate memory`; the Supabase CLI printed `Stopping containers...`, and a subsequent `docker ps -a` showed no Goodz containers. At that check, Windows had 22.90 GiB total physical memory and 2.76 GiB free, below the documented 8 GB available-memory prerequisite. No reset was run.
- Local checks ran with Node.js `26.4.0`; app CI pins Node.js `24`. App workflow runs `40396937840` for code head `2d65738` and `40398881229` for the recorded documentation-only PR head `78b013b` both passed.
- `pnpm supabase:start` reached the local engine, pulled Supabase images, and then failed to start Postgres because Windows could not allocate memory. `pnpm docker:up` was not attempted because the Supabase dependency did not become healthy and available RAM was below the documented prerequisite. Docker build/up/health/down and Supabase status/stop remain unverified. No reset was run.
- `.github/workflows/goodz-app-foundation.yml` runs frozen install, lint, typecheck, unit tests, build, desktop/mobile E2E, dependency audit, and scoped secret scan on PRs and `main`. Code head `2d65738` passed app-foundation run `40396937840`; the recorded evidence-only PR head `78b013b` passed run `40398881229`. SonarCloud Security Rating `B` remains below the required `A`.
- No remote Supabase, remote database, production environment, or production data was accessed. The reboot branch has not been merged; the approved checkpoint has not been changed.
- The current checkpoint remains `GMZ_IMPL_007_ADMISSION_CANDIDATE_READY_FOR_REVIEW` at `52/515`; this reboot does not claim that historical credit as new work.

**Decision:** keep the candidate `BLOCKED` for objective audit until final PR-head CI is green, SonarCloud reaches the required gate or receives its formal maintainer disposition, Docker/Supabase local acceptance is recorded, and keyboard/focus/zoom/screen-reader review is completed. Do not emit `GMZ_REBOOT_001_READY_FOR_OBJECTIVE_AUDIT` or start `GMZ-M01` yet.
