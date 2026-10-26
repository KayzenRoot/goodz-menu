# Local validation receipt — GMZ-REBOOT-001

## Published evidence-head follow-up — 2026-10-26 23:42 UTC

- Before this evidence update, PR #74 was OPEN/Draft at exact HEAD `a811c7d389125bcda934fcfec59159dd5f9c2177`, based on `main@3139534697743494626f4940b78ac3f9d468ceb6`. Its latest code candidate is ancestor `3e90030573031acd8764eb45fd40cf063d1dcbd3`; the commits above it contain evidence only.
- Exact-head app check `121911612089` (workflow run [40419952689](https://github.com/KayzenRoot/goodz-menu/actions/runs/40419952689)) passed. Socket checks `121911617340` and `121911600080` passed. Sonar check `121911765032` failed `B Security Rating on New Code` (required `A`).
- Read-only Sonar API query `GET https://sonarcloud.io/api/issues/search?componentKeys=KayzenRoot_goodz-menu&pullRequest=74&statuses=OPEN%2CCONFIRMED&sinceLeakPeriod=true&ps=100` on that exact HEAD returned 18 issues: two `VULNERABILITY` / `MINOR` / `LOW` `S5332` issues, plus 16 code smells. The two security issue keys are `AaF5USd7m7ISM68fKi-0` (`scripts/compose-local.mjs:39`) and `AaF5USeFm7ISM68fKi-4` (`src/lib/env/runtime-env.ts:52`); together they explain the reported Security `B`.
- The HTTP paths are constrained to local/test runtime: host loopback or `kong` on the dedicated Docker network. The readiness request is GET-only and carries the public anon key. The source still uses cleartext transport. Current [Supabase CLI documentation](https://supabase.com/docs/guides/local-development/cli-workflows) says the local stack has no TLS and must not be exposed externally. The repository does not suppress or mark these findings safe; a transport redesign needs runtime validation.
- At the latest host reading, C: had approximately 7.98 GiB free, D: approximately 161.32 GiB free, and 6.28 GiB RAM was available (below the 8 GiB prerequisite). The active checkout is on D:, so no disk cleanup was needed. No Docker/Supabase lifecycle was run.
- No source code changed in this follow-up. The code-tree checks recorded below remain the checks for code candidate `3e90030`; hosted checks must be queried again after this documentation-only commit creates a new PR HEAD.

## Exact code-candidate snapshot — 2026-10-26 23:22 UTC

- PR #74 is OPEN/Draft at exact HEAD `3e90030573031acd8764eb45fd40cf063d1dcbd3`, based on `main@3139534697743494626f4940b78ac3f9d468ceb6`. The increment changes only `src/components/foundation-shell.tsx`, `src/app/globals.css`, `tests/e2e/foundation.spec.ts`, and four regenerated desktop/mobile light/dark screenshots.
- Local environment: Node `v26.4.0`, pnpm `12.8.1`, Docker Desktop Engine `29.8.2`; D: is a fixed local drive. Checks on the exact source tree:

| Command | Result |
| --- | --- |
| `pnpm lint` | PASS |
| `pnpm typecheck` | PASS |
| `pnpm test` | PASS — 5 files, 50 tests |
| `pnpm build` | PASS — Next.js `16.4.3` production build |
| `pnpm test:e2e -- --workers=1` | PASS — 8 desktop/mobile Chromium tests; 51.3 seconds |
| `pnpm security:secrets` | PASS — 37 scoped files |
| `pnpm security:deps` | PASS — no known vulnerabilities |
| `git diff --check` | PASS — no whitespace errors |

- App-foundation run [40419116186](https://github.com/KayzenRoot/goodz-menu/actions/runs/40419116186), check `121908787769`, passed on exact HEAD `3e90030`. Socket Pull Request Alerts `121908809271` and Project Report `121908783936` passed. SonarCloud `121908985988` failed `B Security Rating on New Code` (required `A`); its root cause was confirmed later at evidence HEAD `a811c7d` and is recorded in the published evidence-head follow-up above.
- Independent standards and spec reviews of the code increment found no findings. No formal GitHub review submission is present. The regenerated screenshots were visually inspected in this turn; that does not replace the required human sign-off.
- The host reported 4.77 GiB free RAM, below the 8 GiB prerequisite. Docker/Supabase lifecycle and reset were not attempted. C: had 7.99 GiB free; D: had 161.32 GiB free. No disk cleanup was needed.
- `supabase/config.toml` has `[db.seed].enabled = false`, `sql_paths = []`, and there is no `seed.sql`; this foundation admits no schema or business data. The local reset/seed path remains unexecuted and the Test Plan's seed/dev-data acceptance is not claimed as passed.
- Actual browser zoom, human keyboard review, screen-reader use, and signed human visual/accessibility review remain outstanding. This evidence-only update will create a new PR HEAD; verify hosted checks for that HEAD after it is pushed.

## Narrow navigation accessibility and badge restoration — 2026-10-26

Independent review of published HEAD `597c64650c567c5271170bc36ae7bbc47f8d472b` found that the mobile horizontal scroller hid disabled, informational menu labels from keyboard traversal and that the tablet breakpoint removed badge padding/border. Commit `662421095942a9e3b6d9e122a27147a1fc95fe0d` wraps mobile navigation items into visible rows, restores the badge pill styling, checks every navigation item's horizontal bounds, and checks that the focused skip link remains inside the viewport.

The following checks ran on the exact source tree later committed as `6624210`; the commit adds no source changes beyond that tested tree:

| Command | Exit | Observed result |
| --- | ---: | --- |
| `pnpm test:e2e` | 0 | 8 desktop/mobile Chromium checks passed, including the 320 CSS-pixel viewport bounds, wrapped navigation, badge styling, skip-link viewport bounds/focus transfer, and Axe WCAG tags. |
| `pnpm lint` | 0 | ESLint completed without diagnostics. |
| `pnpm typecheck` | 0 | `tsc --noEmit` completed without diagnostics. |
| `pnpm test` | 0 | 5 test files and 50 tests passed. |
| `pnpm build` | 0 | Next.js 16.4.3 production build passed. |

The mobile screenshots were regenerated and visually inspected; they show all navigation items in two rows and retain the badge pills in both themes. This agent inspection is not the required human visual/accessibility sign-off. Manual keyboard review, actual browser zoom, and screen-reader review remain outstanding.

Code candidate `6624210` was first published in PR HEAD `200e2b4d4433513d2a8f1766442efe4b92abd09b`. At the 2026-10-26 22:28 UTC receipt snapshot, exact-head app run [40412179185](https://github.com/KayzenRoot/goodz-menu/actions/runs/40412179185) passed, both Socket checks passed, and SonarCloud failed the required Security `A` gate with Rating `B`. Follow-up technical, accessibility, and standards reviews of `200e2b4` found no CRITICAL/HIGH defect or further mobile-navigation correction. The same host snapshot showed 5.26 GiB free of 22.90 GiB, below the 8 GiB Docker/Supabase prerequisite; no retry was made. The later evidence-only HEAD and its exact hosted checks are recorded above.

## Earlier mobile overflow fix and keyboard-test snapshot — 2026-10-26

App-foundation run `40409015904` on published PR head `3d51c6c995ba4664d9fab4cd8a5b3a1a688c32a2` failed the 320 CSS-pixel reflow test. Its diagnostic output identified `.nav-badge` as an absolutely positioned 1 px element with its right edge at x=338; the document scroll width was 338 px.

Commit `882bf7fac38d375b558b2630fbefd0591a3af18b` resets `.nav-link > .nav-badge` to normal-flow sizing inside the mobile breakpoint, asserts `position: static`, and regenerates the mobile light/dark screenshots. On the exact `882bf7f` source tree, `pnpm lint`, `pnpm typecheck`, `pnpm test` (50/50), `pnpm build`, and `pnpm test:e2e` (8 desktop/mobile Chromium checks) all exited 0. The E2E run confirmed no document-level overflow at 320 CSS pixels and passed Axe checks. At that intermediate revision, the badges were still styled as plain text and the mobile navigation still scrolled horizontally; both were corrected later in `6624210`.

Commit `4d78d5d444bfe8f01a87f587f51e52c8cbb0cee5` changes only E2E assertions: it waits for the theme selector to be enabled before tab traversal and asserts that the focused skip link is visible. On this exact tree, `pnpm lint` exited 0 and `pnpm test:e2e` exited 0 with 8/8 checks passing. At that earlier receipt refresh, hosted CI and fresh independent review were pending publication and the remote PR head was `3d51c6c`.

The updated screenshots were inspected for layout and badge legibility. A local Chromium spot check also confirmed the skip-link focus transfer. These agent checks do not substitute for the required human visual/accessibility sign-off. Actual browser zoom and screen-reader behavior remain unverified.

## Accessibility correction — 2026-10-26

The following commands ran on the exact source tree later committed as `6a5b095fd84a6eb90f1944c38682c0487f886b79` (the commit adds no source changes beyond the tested tree). The checks passed locally; this does not replace CI on the published PR head.

| Command | Exit | Observed result |
| --- | ---: | --- |
| `pnpm lint` | 0 | ESLint completed without diagnostics. |
| `pnpm typecheck` | 0 | `tsc --noEmit` completed without diagnostics. |
| `pnpm test` | 0 | 5 test files and 50 tests passed. |
| `pnpm build` | 0 | Next.js 16.4.3 production build passed. |
| `pnpm test:e2e` | 0 | 8 desktop/mobile Chromium checks passed, including skip-link focus transfer, visible 3px focus on the theme selector, 320 CSS-pixel reflow, and Axe WCAG tags. |

At the resource check on this date, Windows reported 22.90 GiB total and 5.76 GiB free physical memory, below the local guide's 8 GiB prerequisite. The earlier `pnpm supabase:start` attempt had failed with `runtime: cannot allocate memory`; Supabase and Docker lifecycle commands were not retried, and no database reset ran. Local manual zoom, screen-reader, and human visual review remain unverified.

This receipt records the latest local path-check, lint, typecheck, and unit-test output for code head `2d65738c9a79e0315171bb7798aee1de5b1a431c`, based on `main@3139534697743494626f4940b78ac3f9d468ceb6`. Full build, E2E, dependency, and secret-scan results below are carried forward from code head `7eb87ceaa55949395456b0ae93d507927ae13a80`; they were not rerun locally for `2d65738`. The app workflow for code head `2d65738` passed as run `40396937840`. At the recorded documentation-only PR head `78b013b95afc8a3e9de66a2e6f83ab51b94120fd`, app workflow run `40398881229` also passed, including browser acceptance, dependency audit, and secret scan. This receipt does not claim those full checks were rerun locally.

## Environment

- Node.js: `v26.4.0`
- pnpm: `12.8.1`
- Docker context: `desktop-linux`; the Docker Desktop CLI is installed under `%LOCALAPPDATA%\Programs\DockerDesktop\resources\bin`. Docker Desktop is running, WSL reports `docker-desktop` running, and Docker Engine `29.8.2` responds. The Goodz loopback network has `host_binding_ipv4=127.0.0.1`, IPv4 enabled, IPv6 disabled. An earlier resource reading at Supabase startup showed 2.76 GiB free; a later reading showed 5.76 GiB free of 22.90 GiB total. Both are below the guide's 8 GiB prerequisite. The startup attempt hit `runtime: cannot allocate memory`; it was not retried.
- CI pins Node.js `24`; local validation uses Node.js `26.4.0`. App-foundation run `40396937840` passed for code head `2d65738`; run `40398881229` passed for the recorded evidence-only PR head `78b013b`.

## Commands and observed results

| Command | Exit | Observed output or result |
| --- | ---: | --- |
| `pnpm install --frozen-lockfile` | 0 | Prior receipt (`7eb87ce`): lockfile policy passed; lockfile was up to date. |
| `pnpm lint` | 0 | ESLint completed without diagnostics. |
| `pnpm typecheck` | 0 | `tsc --noEmit` completed without diagnostics. |
| `pnpm test` | 0 | `Test Files 5 passed (5)`; `Tests 50 passed (50)`, including zero candidate-path inspection for a mapped Z: drive, raw reparse-attribute rejection, and a real Windows junction check. |
| `pnpm build` | 0 | Prior receipt (`7eb87ce`): Next.js 16.4.3 build completed; `/api/health` and `/api/ready` were dynamic routes. |
| `pnpm test:e2e` | 0 | Prior receipt (`7eb87ce`): desktop Chromium and mobile Chromium both passed; `2 passed`. |
| `pnpm security:deps` | 0 | Prior receipt (`7eb87ce`): `No known vulnerabilities found`. |
| `pnpm security:secrets` | 0 | Prior receipt (`7eb87ce`): `Runtime secret scan passed across 37 tracked-scope file(s).` |
| Standalone start with a synthetic service-role-shaped JWT | expected refusal | Prior receipt (`7eb87ce`): `node scripts/start.mjs` exited 1 with a generic refusal; the wrapper assertion exited 0 and confirmed the synthetic value was not printed. |
| Local web smoke: `GET /api/health`, `GET /api/ready` without Supabase | 0 | Prior receipt (`7eb87ce`): `PASS health=200 readiness=503 reason=supabase_anon_key_required`. |
| Workflow YAML/action check | 0 | Prior receipt (`7eb87ce`): YAML parsed; all 4 action references use full 40-character commit SHAs. |
| `supabase db reset --network-id goodz-menu-reboot-001-loopback --help` | 0 | Prior receipt (`7eb87ce`): pinned CLI exposes the global `--network-id` flag. Unit tests verify safe loopback-only network creation and refusal of an existing network bound to `0.0.0.0`; the database reset was not run. |
| PowerShell reset guard with `GOODZ_ALLOW_LOCAL_DB_RESET=0` | script exit 2 (expected refusal) | Prior receipt (`7eb87ce`): printed the confirmation requirement and exited before engine access; a PowerShell wrapper captured the script exit code and returned 0. `pnpm supabase:reset` reports the same refusal through its lifecycle wrapper. |
| Windows Docker CLI path resolver | 0 | For `2d65738`: resolved `C:\Users\csn19\AppData\Local\Programs\DockerDesktop\resources\bin\docker.exe`; the raw `FILE_ATTRIBUTE_REPARSE_POINT` query found the real junction in the Windows regression test and rejected it before `realpath`. The earlier Compose CLI version check reported `v5.6.0`. |
| `docker info` | 0 | Docker Engine `29.8.2` responded on `desktop-linux`. |
| `docker network inspect goodz-menu-reboot-001-loopback` | 0 | `host_binding_ipv4=127.0.0.1`, IPv4 enabled, IPv6 disabled. |
| `pnpm supabase:start` | 1 | Pulled local Supabase images and attempted to create `supabase_db_goodz-menu-reboot-001`; Docker failed with `runtime: cannot allocate memory`. The CLI then printed `Stopping containers...`; a subsequent `docker ps -a` showed no Goodz containers. No database reset ran. |
| `pnpm docker:up` | not run | Supabase did not reach healthy status and free host memory was below the documented prerequisite, so the dependent web container was not started. |

## Previously published PR-head checks

The run for the then-published head `9d8a7e4a7f62a10a29ab5ed679d81c4504579390` ([run 40371514449](https://github.com/KayzenRoot/goodz-menu/actions/runs/40371514449)) completed with a mobile Axe color-contrast failure and SonarCloud Security Rating `B`. Node 24 setup, install, lint, typecheck, unit tests, and production build passed; the dependency and secret scans were skipped after the E2E failure. Socket checks passed. The next run for PR head `55a00e905cfbcbad3e8624a7a66b72957622a464` ([run 40377975323](https://github.com/KayzenRoot/goodz-menu/actions/runs/40377975323)) passed app-foundation checks, E2E, dependency audit, secret scan, and exact-head manifest upload. SonarCloud failed Security `B` and Reliability `C`; its failure annotation identified the direct `.find(exists)` predicate. The follow-up commit wraps that predicate explicitly. The subsequent run for PR head `47237b9be4c48ec36ac49f35c2605a8c1a6805de` ([run 40381300443](https://github.com/KayzenRoot/goodz-menu/actions/runs/40381300443)) passed all app-foundation checks; SonarCloud no longer reported Reliability `C`, while Security remained `B`. The latest prior run for PR head `4ca68ba72ae45df6aaade7ca5ccab5bdd824c67a` ([run 40382109797](https://github.com/KayzenRoot/goodz-menu/actions/runs/40382109797)) passed all app-foundation checks, including desktop/mobile E2E, dependency audit, secret scan, and exact-head manifest upload. SonarCloud failed Security `B`. Its manifest confirms base `3139534697743494626f4940b78ac3f9d468ceb6`, 99 changed paths, and binary diff SHA-256 `fc40ebff11c823023453d2d47a8363174c3c826dc14264097a9eb9e94fbf33d1`. The then-current Docker path check still depended on `SystemDrive`, so a forged variable could point at a mapped drive.

The `2d65738c9a79e0315171bb7798aee1de5b1a431c` correction queries fixed-drive types before touching candidate paths and reads raw Windows file attributes, failing closed on any reparse point. The local Windows junction test verifies the `0x400` attribute and confirms the resolver does not call `realpath`. Independent Security review on this exact code head reports the previous mapped-drive/reparse P2 closed, with no HIGH/CRITICAL findings; `SystemRoot`/`WINDIR` integrity and concurrent same-user path changes remain documented limits. At recorded PR head `78b013b`, app-foundation run [40398881229](https://github.com/KayzenRoot/goodz-menu/actions/runs/40398881229) passed and both Socket checks passed; SonarCloud failed Security `B` against required `A`.

The E2E suite uses a synthetic loopback health fixture, not a Supabase stack. Supabase success through Docker and the reset lifecycle still require enough available memory to start the full local stack; the engine responds, but the current Supabase start failed before health checks.
