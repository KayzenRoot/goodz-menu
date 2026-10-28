# Local validation receipt — GMZ-REBOOT-001

## Published receipt-head snapshot — 2026-10-27 02:02 UTC

- PR #74 is OPEN/Draft at `6c6e074f5774ccf354c9e32331339da117c31b58`, based on `main@3139534697743494626f4940b78ac3f9d468ceb6`. This is an evidence-only receipt commit; the latest source-code candidate remains `747ab7c`.
- Exact-head app workflow [40435393491](https://github.com/KayzenRoot/goodz-menu/actions/runs/40435393491), job/check `121962724530`, passed all steps, including Node 24, frozen install, lint, typecheck, unit tests, build, desktop/mobile E2E, dependency audit, secret scan, manifest generation, and artifact upload. Socket checks `121962763708` and `121962747559` passed. Sonar `121962859455` failed Security `B` (required `A`), with 18 annotations; the scoped S5332 acceptance does not change the check.
- Manifest artifact `goodz-foundation-head-manifest-40435393491` (ID `12704251288`) was downloaded and parsed. It records the pinned base, exact HEAD `6c6e074f5774ccf354c9e32331339da117c31b58`, 103 paths, and binary diff SHA-256 `7c069769b7967349a381caa34c15681527082deb415a7adaec290493ff037d57`.
- At 02:02 UTC, free RAM was 5.57 GiB, below the documented 8 GiB local Supabase prerequisite. Docker/Supabase runtime and reset remain unverified; seed/reset acceptance and final objective audit are open. Human visual, keyboard, actual zoom, and screen-reader sign-off stays pending at the user's request.
- For the commit containing this receipt, its own exact-head app run, check conclusions, and manifest artifact are the evidence for that same SHA. Verify them directly and do not make another documentation-only commit just to repeat those results.

## Published workflow/evidence-head snapshot — 2026-10-27 01:50 UTC

- PR #74 is OPEN/Draft at `d4df03b2409571c3c5623c03f52a3483154c709e`, based on `main@3139534697743494626f4940b78ac3f9d468ceb6`. This commit changes only receipts and workflow pins; source-code validation after the SQL-suite removal is recorded for its ancestor `747ab7c` above.
- The exact-head app workflow [40434185977](https://github.com/KayzenRoot/goodz-menu/actions/runs/40434185977), job/check `121958813727`, passed all workflow steps: Node 24 setup, frozen install, lint, typecheck, unit tests, production build, desktop/mobile browser checks, dependency audit, runtime secret scan, manifest generation, and artifact upload.
- Socket PR Alerts `121958828498` and Project Report `121958814216` passed. Sonar `121958954668` failed Security `B` (required `A`), with 18 annotations. The narrow S5332 acceptance at PR comment [#6431020903](https://github.com/KayzenRoot/goodz-menu/pull/74#issuecomment-6431020903) did not alter Sonar issue state or result.
- Downloaded and parsed `goodz-foundation-head-manifest-40434185977` (artifact ID `12703367292`): base `3139534697743494626f4940b78ac3f9d468ceb6`, head `d4df03b2409571c3c5623c03f52a3483154c709e`, 103 paths, binary diff SHA-256 `ae92de9e3c404648279f9ddf093cf0f15d157fe79fa5226f053de9d1216876f4`.
- The 01:50 UTC resource reading was 5.06 GiB free RAM, below the 8 GiB local stack prerequisite; C: had 8.40 GiB free and D: had 161.30 GiB free. No Docker/Supabase lifecycle or database reset ran; no disk cleanup was needed.
- The human visual, keyboard, actual zoom, and screen-reader review remains pending at the user's request. Seed/reset acceptance and objective audit remain open. At the time of this snapshot, the receipt closeout was still local; its publication triggers a fresh exact-head CI run.

## Latest published exact-head snapshot — 2026-10-27 01:37 UTC

- PR #74 is OPEN/Draft at `747ab7cfcdb7dfa7a5e57836528dd804ef1eb8ec`, based on `main@3139534697743494626f4940b78ac3f9d468ceb6`. The deletion increment removes three historical SQL suites; the application source in this candidate includes the earlier UI correction at `3e90030`.
- The following checks passed after the SQL-suite removal, on the application source tree committed at this HEAD:

| Command | Result |
| --- | --- |
| `pnpm lint` | PASS |
| `pnpm typecheck` | PASS |
| `pnpm test` | PASS — 5 files, 50 tests |
| `pnpm build` | PASS — Next.js 16.4.3 production build |
| `pnpm test:e2e -- --workers=1` | PASS — 8 desktop/mobile Chromium checks |
| `git diff --check` | PASS |

- Hosted exact-HEAD checks: app workflow [40431916608](https://github.com/KayzenRoot/goodz-menu/actions/runs/40431916608), check `121951394256`, PASS; Socket PR Alerts `121951407295` and Project Report `121951391468`, PASS; Sonar `121951545010`, FAIL, Security `B` (required `A`), 18 annotations.
- The scoped maintainer acceptance for the two `S5332` local/test findings is recorded at PR comment [#6431020903](https://github.com/KayzenRoot/goodz-menu/pull/74#issuecomment-6431020903). It does not change Sonar issue state or check outcome.
- Current resource check at 01:37 UTC: 5.20 GiB free physical RAM, below the 8 GiB local Docker/Supabase prerequisite; C: 8.42 GiB free; D: 161.30 GiB free. No Docker/Supabase lifecycle or database reset was attempted, and no disk cleanup was needed.
- Human visual, keyboard, actual zoom, and screen-reader review remains pending at the user's request. Seed/reset applicability and final objective audit remain unresolved.
- At the time of this 01:37 UTC snapshot, the local workflow maintenance delta had not yet been exercised; run `40434185977` later validated it on exact HEAD `d4df03b` as recorded above.

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

## Previous exact code-head snapshot — 2026-10-27 18:39 UTC

- Local branch, origin/rebuild/gmz-reboot-001-module-01, and PR #74 all point to exact code candidate 7b9cc0f2e8b1c3f41b783dea47b190f80dc9c96a; base remains main@3139534697743494626f4940b78ac3f9d468ceb6. PR #74 is OPEN/Draft and unmerged.
- The code commit adds a Windows Docker Desktop port-binding preflight and validates actual published bindings before local Supabase start/reset. It fails closed when the configured default is not localhost-only.
- Local checks recorded on this source commit: pnpm test PASS (5 files, 58 tests); pnpm lint PASS; pnpm typecheck PASS; pnpm security:secrets PASS (34 scoped files); git diff --check PASS. These checks were not rerun for this evidence-only receipt.
- Exact-head workflow [40560458468](https://github.com/KayzenRoot/goodz-menu/actions/runs/40560458468), check/job 122387762215: PASS. Its steps include frozen install, lint, typecheck, unit tests, production build, desktop/mobile browser checks, dependency audit, secret scan, manifest capture and artifact upload. Socket PR Alerts 122387797697 and Project Report 122387768812: PASS.
- SonarCloud check 122388140664: FAIL, B Security Rating on New Code (required A), with 20 annotations. The two S5332 warnings remain covered only by the local/test maintainer disposition and PR comment #6431020903; this does not change Sonar issue state or pass its Quality Gate.
- GitHub artifact metadata identifies goodz-foundation-head-manifest-40560458468, artifact ID 12760167000, archive SHA-256 85ef9b0358a1a49965b2f7683c2b04ec28a4d64c60002877932a42571ddbb36a, workflow run 40560458468, and head_sha equal to this code candidate. The archive payload was not decoded in this receipt; do not claim its internal manifest fields were independently parsed.
- Current Windows host reading: 7.48 GiB free RAM; C: 6.05 GiB and D: 161.18 GiB free. Chrome remained open. No disk cleanup was needed.
- %APPDATA%/Docker/settings-store.json has no portBindingBehavior value. pnpm supabase:status exited 1 because Docker Engine is stopped/unavailable; no listeners were present on ports 56321/56322. No start/reset or remote Supabase access occurred in this snapshot.
- In the earlier live run, Supabase DB/Kong ports were published on 0.0.0.0 and ::; no evidence of external access was observed. Docker Desktop startup had restarted that stack automatically. Docker remains stopped because restarting it before localhost-only binding is configured could repeat the unsafe publication. The user asked to keep Chrome open and continue with lower RAM; RAM is not the current blocker.
- Seed loading is disabled and this foundation has no tracked migrations or seed file. Seed/reset acceptance, the local runtime lifecycle, manual keyboard/actual zoom/screen-reader review, human visual sign-off, and final objective audit were open at this snapshot.

## Supabase start/reset/stop acceptance — 2026-10-27 19:33 UTC

Source code commit: `28184f9bea8b4edfa6982311a6331ee8aceafc32` (parent `55a3043091261e95bdde7f2090cfaa3d4d7437a7`). Exact-head app workflow `40570145844` was in progress when this receipt was drafted; refresh its conclusion and manifest after completion.

The approved global Docker Desktop preference is `default-local-port-binding`. Docker Desktop writes it as PascalCase `PortBindingBehavior`; the runtime reader now accepts both that serialization and the earlier camelCase key. Docker inspect reported implicit port bindings as an empty `HostIp`. On Windows the verifier accepts that value only when the global Docker Desktop setting is one of the loopback modes, and continues to reject explicit wildcard bindings. A regression test covers both cases and non-Windows behavior.

| Command or observation | Result |
| --- | --- |
| `pnpm test` | PASS — 5 files, 60 tests |
| `pnpm lint` | PASS |
| `pnpm typecheck` | PASS |
| `git diff --check` | PASS |
| `pnpm supabase:start` | PASS — four project containers reached ready status |
| `pnpm supabase:status` | PASS — isolated endpoint `http://127.0.0.1:56321` |
| `GET http://127.0.0.1:56321/auth/v1/health` | PASS — HTTP 200 |
| Actual published listeners | PASS — only `127.0.0.1` and `::1` on project ports 56321 and 56322; no listener on the remaining configured range 56320–56329 |
| `GOODZ_ALLOW_LOCAL_DB_RESET=1 pnpm supabase:reset` | PASS — confirmation variable was process-session scoped; the wrapper checked status before and after reset |
| `pnpm supabase:stop` | PASS — Supabase containers stopped and local volume preserved |
| Post-stop inspection | PASS — no Supabase containers/listeners; `goodz-menu-reboot-001-web-1` remained healthy on `127.0.0.1:3001`; DB volume preserved |

The Supabase CLI printed its generic warning that services bind to `0.0.0.0`; Docker's published-port view and Windows `Get-NetTCPConnection` instead showed loopback-only listeners for the configured project ports. The observed evidence is limited to this local Docker Desktop host and this runtime.

`supabase/config.toml` keeps seed loading disabled (`sql_paths=[]`); no migrations are tracked, so the accepted reset did not apply project seeds/migrations. Docker Desktop `4.95.0` / Engine `29.8.2` remained running after Supabase stop. Host resources after stop were 5.84 GiB free RAM of 22.90 GiB, C: 5.96 GiB free, D: 160.45 GiB free. No disk cleanup or move was needed; Chrome remained open. The global Docker preference affects other projects on this machine and was changed with the user's authorization.

The user's human review of keyboard use, actual zoom, screen reader, and visual appearance remains pending. Sonar Security `B` (required `A`) remains a separate gate; the scoped local/test S5332 disposition does not change that result.

## Integrated Docker web and final teardown — 2026-10-27 19:44 UTC

Code tree: 28184f9bea8b4edfa6982311a6331ee8aceafc32. Docker Desktop 4.95.0, Engine 29.8.2; the user-authorized global port-binding preference read back as default-local-port-binding.

| Command or observation | Result |
| --- | --- |
| pnpm docker:up | PASS — exit 0; production web image built and container started |
| pnpm docker:ps | PASS — web container healthy; host publication 127.0.0.1:3001->3000/tcp |
| GET http://127.0.0.1:3001/api/health | PASS — HTTP 200 |
| GET http://127.0.0.1:3001/api/ready | PASS — HTTP 200 while local Supabase was running |
| Windows listener inspection during integrated runtime | PASS — port 3001 on 127.0.0.1; Supabase ports 56321 and 56322 on 127.0.0.1 and ::1; no wildcard listener on project range 56320–56329 |
| pnpm docker:down | PASS — exit 0; web container removed |
| pnpm supabase:stop | PASS — exit 0; Supabase containers stopped; database volume preserved |
| Final Docker/listener inspection | PASS — no project containers or listeners on port 3001 or ports 56320–56329; volume supabase_db_goodz-menu-reboot-001 remains present |

After teardown, host free RAM was 6.33 GiB of 22.90 GiB, C: had 5.92 GiB free, and D: had 160.76 GiB free. Chrome remained open; no cleanup or move was needed. The global Docker setting affects other projects on this machine and was changed under the user's authorization.

The exact code-head workflow 40570145844 (https://github.com/KayzenRoot/goodz-menu/actions/runs/40570145844) passed app checks and uploaded artifact goodz-foundation-head-manifest-40570145844 (ID 12763688509; GitHub SHA-256 e6d1b9efeed0291eb72ba160110d156e690e5599edab6c45a85016198215bc11). Parsed manifest: base 3139534697743494626f4940b78ac3f9d468ceb6, head 28184f9bea8b4edfa6982311a6331ee8aceafc32, 103 changed paths, binary diff SHA-256 f8f6e3edfe940383eb86cfb74f577933ebb27c4e407bbc1b4d6e5a7ef911d040. The app job and both Socket checks passed; Sonar failed Security B (required A).

The user-requested human review of keyboard use, actual browser zoom, screen-reader behavior, and visual appearance remains pending. The failed Sonar gate and scoped S5332 disposition are separate: no Sonar issue status was changed and no gate pass is claimed.

## Implicit port-binding correction validation — 2026-10-27 20:32 UTC

Code tree: `5f3dd43dac86d115339696b039a89329a5335ab2`; base `3139534697743494626f4940b78ac3f9d468ceb6`. This correction addresses two independent-review findings: a current Docker Desktop preference does not prove how a pre-existing container is bound, and a TCP listener alone cannot validate an implicit UDP/SCTP binding.

| Command or observation | Result |
| --- | --- |
| `pnpm exec vitest run --testTimeout=15000` | PASS — 5 files, 65 tests; covers actual loopback listener, stale wildcard listener, missing/query-failed/malformed/unrelated listeners, invalid host port, and implicit UDP rejection |
| `pnpm lint` | PASS |
| `pnpm typecheck` | PASS |
| `git diff --check` | PASS |
| `pnpm supabase:start` | PASS — repeated at 5f3dd43 with 2.66 GiB free RAM |
| `pnpm supabase:status` | PASS — code path queried actual Windows TCP listeners; only `127.0.0.1` and `::1` were found on 56321 and 56322 |
| `GET http://127.0.0.1:56321/auth/v1/health` | PASS — HTTP 200 |
| `GOODZ_ALLOW_LOCAL_DB_RESET=1 pnpm supabase:reset` | PASS — confirmation variable scoped to one PowerShell process; reset applied no project seed or migration |
| `pnpm supabase:stop` | PASS — local containers stopped; volume `supabase_db_goodz-menu-reboot-001` preserved |
| Post-stop Docker/listener inspection | PASS — no project containers or listeners on 56320–56329; database volume remained present |
The standard five-second test timeout expired once on the real Windows junction test while the host had low free memory; the full suite then passed with `--testTimeout=15000`. No application or browser process was intentionally closed. During the final reset cycle, host RAM was 2.66 GiB free before startup and 5.37 GiB after teardown; C: had 3.28 GiB free and D: 160.66 GiB. No disk cleanup or move was needed.

Exact-code-head workflow `40578086527` / check `122449796837` passed. Socket Project Report and PR Alerts passed. Sonar check failed `B Security Rating on New Code` (required `A`). Manifest metadata and digest are recorded in `RESULTS.md`; Sonar's scoped S5332 disposition remains unchanged. Independent standards/security and scope reviews of `5f3dd43` found no further findings. The user's human keyboard, real zoom, screen-reader, and visual sign-off remains pending.


## Local TLS proxy acceptance — 2026-10-28

Source tree: exact implementation commit `8a33a0653a0c25f008c5ec87d5008fb6cc5bc6a0`, parent `9bd91ea4d83c9ffcf83554eda25a0c5122a0fd5d`. Tests and runtime acceptance below ran on the same source tree before its commit. Docker lifecycle was performed only through the approved `pnpm supabase:*` and `pnpm docker:*` wrappers; no remote Supabase was used.

| Command or observation | Result |
| --- | --- |
| `pnpm test` | PASS — 5 files, 74/74 tests |
| `pnpm lint` | PASS |
| `pnpm typecheck` | PASS |
| `node --check scripts/local-supabase-tls.mjs` | PASS |
| `git diff --check` | PASS |
| `pnpm supabase:start` | PASS — local Supabase and the local Caddy TLS proxy started |
| `pnpm supabase:status` | PASS — reports native endpoint `https://localhost:56443` |
| `GOODZ_ALLOW_LOCAL_DB_RESET=1 pnpm supabase:reset` | PASS — confirmation was scoped to this PowerShell process; CLI reported reset finished |
| Native runtime: `pnpm dev -- --port 3010`; `GET http://127.0.0.1:3010/api/ready` | PASS — HTTP 200; response reported local Supabase available; native process was stopped afterward |
| Node TLS trust probe with exported public CA and `localhost` | PASS — chain and hostname accepted |
| Node TLS probe with no trusted local CA | PASS — rejected with `UNABLE_TO_GET_ISSUER_CERT_LOCALLY` |
| Node TLS probe with unrecognized SNI `wrong.local` | PASS — handshake rejected by Caddy with `ERR_SSL_TLSV1_ALERT_INTERNAL_ERROR`; no successful TLS connection |
| `pnpm docker:up` | PASS — production image built with the local CA available to the app as a read-only public certificate |
| Docker runtime `GET http://127.0.0.1:3001/api/ready` | PASS — HTTP 200; runtime reported Docker and local Supabase available |
| Docker inspection during runtime | PASS — proxy running with only `127.0.0.1:56443` and `::1:56443`; web published only at `127.0.0.1:3001`; app CA mount was read-only, no private key was present in the app container, and Caddy private data was not mounted there |
| `pnpm docker:ps` | PASS — web and TLS proxy running with the expected loopback bindings |
| `pnpm docker:down` and `pnpm supabase:stop` | PASS — project containers stopped; local Supabase volume preserved |
| Post-stop container/listener inspection | PASS — no Goodz project containers or listeners remained; local Supabase data volumes remained present |

The app-to-proxy hop is encrypted and verifies both the local CA chain and hostname. The Caddy-to-Kong hop remains HTTP on the isolated local Docker bridge; this is not end-to-end TLS. The generated private CA key remains in the Docker-managed Caddy volume and was not found in Git, the web build context, or the app container. The user-authorized Docker Desktop `default-local-port-binding` preference remains active and affects other Docker projects on this host. The documented one-Goodz-worktree-per-Docker-engine constraint is operational and is not programmatically enforced.

At the beginning of this authorized lifecycle, Windows reported 3.45 GiB free physical RAM. The user explicitly authorized continuing below the former 8 GiB threshold while keeping Chrome open. The local TLS checks used Node TLS directly; `curl.exe --cacert` did not provide an additional Windows certificate result because Schannel reported an unknown revocation status. No disk cleanup or move was needed during this lifecycle.

These results cover only the local/test runtime. No production or remote Supabase claim is made. The user's manual keyboard, actual zoom, screen-reader, and visual sign-off remains pending.

## Retry-limit review correction — published code candidate `2a23b6a`

The standards review of `8a33a0653a0c25f008c5ec87d5008fb6cc5bc6a0` identified that `attempts: 0` caused one initial retry-helper call. Commit `2a23b6a4895c232428847b59258b3f7534d9eec8` now rejects non-positive, fractional, or unsafe-integer `attempts` values before creating the Docker runner. Its regression test injects the runner and proves the zero-attempt case makes no Docker invocation.

| Command | Result on current source content |
| --- | --- |
| `pnpm exec vitest run tests/supabase/local-runtime.test.ts` | PASS — 1 file, 49/49 tests |
| `pnpm test` | PASS — 5 files, 75/75 tests |
| `pnpm lint` | PASS |
| `pnpm typecheck` | PASS |
| `node --check scripts/local-supabase-tls.mjs` | PASS |
| `git diff --check` and `git diff --cached --check` | PASS |

No Docker lifecycle was repeated for this input-validation-only change. The previous local native/Docker/TLS/reset evidence remains tied to the source content that became `8a33a06`; this correction does not change the valid default (`attempts: 20`) or proxy runtime behavior. Human accessibility sign-off remains pending.

Exact-code-head publication checks for `2a23b6a` passed: GitHub workflow `40681114052` / job `122791740129` (locked install, lint, typecheck, unit tests, production build, desktop/mobile browser checks, dependency audit, runtime secret scan, and manifest capture); Socket Project Report `122791750706`; Socket PR Alerts `122791779657`; SonarCloud check `122791995349` concluded `SUCCESS`. Sonar annotations remain in the report; this evidence does not claim the user's prohibited “Quality Gate B passed” conclusion or change any issue disposition. Artifact `goodz-foundation-head-manifest-40681114052` (ID `12812593380`, digest `sha256:69cded11e7928112e3ab4f8cf6026b9cbe8a67e896ed347525ec4cf93c830f6e`, 1,629 bytes) was downloaded and parsed. Its `HEAD-EVIDENCE.json` SHA-256 is `fb4f497d65da9e37ae6bee5af3b62203f486d0c5c9b85e80f4751608195d7a02`; it binds base `3139534697743494626f4940b78ac3f9d468ceb6` to `2a23b6a4895c232428847b59258b3f7534d9eec8`, 108 changed paths, and binary diff SHA-256 `92580f87259d4ae845b88f637da10091d838787ee55b3e2d2b1fdc1a1491461d`.
