# Local validation receipt — GMZ-REBOOT-001

## Exact current PR snapshot — 2026-10-26 22:51 UTC

- PR #74 is OPEN/Draft at `3fbfacbeb12268439d2d200b4839374f2aadd52b`, based on `main@3139534697743494626f4940b78ac3f9d468ceb6`. The product-code candidate is unchanged from `662421095942a9e3b6d9e122a27147a1fc95fe0d`; commit `3fbfacb` changed only `RESULTS.md`, `TRACEABILITY.md`, and this receipt.
- App-foundation run [40415341914](https://github.com/KayzenRoot/goodz-menu/actions/runs/40415341914) passed on exact HEAD `3fbfacb`, including frozen install, lint, typecheck, unit tests, production build, desktop/mobile browser acceptance, dependency audit, scoped secret scan, and exact-candidate manifest.
- Socket Pull Request Alerts check `121896177367` and Project Report check `121896157153` passed. SonarCloud check `121896416577` failed the reported Quality Gate condition `B Security Rating on New Code` (required `A`). Its annotations include HTTP-protocol warnings at `scripts/compose-local.mjs:39` and `src/lib/env/runtime-env.ts:52`; do not infer that these two annotations alone caused the rating. The app check emitted non-blocking notices for Node.js 20 action deprecation and the `ubuntu-latest` migration.
- Independent technical/accessibility reviews of the product code at `200e2b4` found no CRITICAL/HIGH defect; HEAD `3fbfacb` has no product-code changes after that reviewed code. The connected GitHub review list is empty, so no formal PR review was submitted.
- The host reported 7.11 GiB free RAM in this turn, below the 8 GiB prerequisite. No Docker/Supabase lifecycle was attempted; the previous Supabase start had failed with `runtime: cannot allocate memory`. Actual browser zoom, screen-reader use, and human visual/accessibility sign-off remain outstanding.

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
