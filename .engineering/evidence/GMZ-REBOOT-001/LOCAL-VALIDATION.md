# Local validation receipt — GMZ-REBOOT-001

This receipt records command output observed for the source tree committed as `7eb87ceaa55949395456b0ae93d507927ae13a80`, based on `main@3139534697743494626f4940b78ac3f9d468ceb6`. The evidence-document commits are not application-code changes.

## Environment

- Node.js: `v26.4.0`
- pnpm: `12.8.1`
- Docker context: `desktop-linux`; the Docker Desktop CLI is installed under `%LOCALAPPDATA%\Programs\DockerDesktop\resources\bin`, but the Linux engine named pipe is unavailable.
- CI pins Node.js `24`; local validation uses Node.js `26.4.0` and the new PR-head check is pending.

## Commands and observed results

| Command | Exit | Observed output or result |
| --- | ---: | --- |
| `pnpm install --frozen-lockfile` | 0 | Lockfile policy passed; lockfile was up to date. |
| `pnpm lint` | 0 | ESLint completed without diagnostics. |
| `pnpm typecheck` | 0 | `tsc --noEmit` completed without diagnostics. |
| `pnpm test` | 0 | `Test Files 5 passed (5)`; `Tests 44 passed (44)`, including rejection of Docker Desktop install roots on UNC shares and roots whose drive differs from inherited `SystemDrive`. |
| `pnpm build` | 0 | Next.js 16.4.3 build completed; `/api/health` and `/api/ready` were dynamic routes. |
| `pnpm test:e2e` | 0 | Desktop Chromium and mobile Chromium both passed; `2 passed`. |
| `pnpm security:deps` | 0 | `No known vulnerabilities found`. |
| `pnpm security:secrets` | 0 | `Runtime secret scan passed across 37 tracked-scope file(s).` |
| Standalone start with a synthetic service-role-shaped JWT | expected refusal | `node scripts/start.mjs` exited 1 with a generic refusal; the wrapper assertion exited 0 and confirmed the synthetic value was not printed. |
| Local web smoke: `GET /api/health`, `GET /api/ready` without Supabase | 0 | `PASS health=200 readiness=503 reason=supabase_anon_key_required`. |
| Workflow YAML/action check | 0 | YAML parsed; all 4 action references use full 40-character commit SHAs. |
| `supabase db reset --network-id goodz-menu-reboot-001-loopback --help` | 0 | Pinned CLI exposes the global `--network-id` flag. Unit tests verify safe loopback-only network creation and refusal of an existing network bound to `0.0.0.0`; the database reset was not run. |
| PowerShell guard: `$env:GOODZ_ALLOW_LOCAL_DB_RESET='0'; node scripts/supabase-local.mjs reset` | script exit 2 (expected refusal) | Printed the confirmation requirement and exited before engine access; a PowerShell wrapper captured the script exit code and returned 0. `pnpm supabase:reset` reports the same refusal through its lifecycle wrapper. |
| Resolved Docker CLI: `docker compose version` with the wrapper environment | 0 | Docker Desktop CLI resolved from its standard per-user install path; child `PATH` contains only the CLI directory; Compose reports `v5.6.0`. |
| `docker info` | blocked | Server connection failed because `npipe:////./pipe/dockerDesktopLinuxEngine` was absent. |

## Previously published PR-head checks

The run for the then-published head `9d8a7e4a7f62a10a29ab5ed679d81c4504579390` ([run 40371514449](https://github.com/KayzenRoot/goodz-menu/actions/runs/40371514449)) completed with a mobile Axe color-contrast failure and SonarCloud Security Rating `B`. Node 24 setup, install, lint, typecheck, unit tests, and production build passed; the dependency and secret scans were skipped after the E2E failure. Socket checks passed. The subsequent run for PR head `55a00e905cfbcbad3e8624a7a66b72957622a464` ([run 40377975323](https://github.com/KayzenRoot/goodz-menu/actions/runs/40377975323)) passed Node 24 setup, install, lint, typecheck, unit tests, production build, Chromium install, desktop/mobile E2E, dependency audit, secret scan, and exact-head manifest upload. SonarCloud failed Security `B` and Reliability `C`; its failure annotation identified the direct `.find(exists)` predicate in `scripts/local-supabase-status.mjs`. The local candidate changes it to an explicit predicate wrapper, and local unit, lint, typecheck, and diff checks pass. The candidate narrows Docker CLI lookup to standard install roots on inherited `SystemDrive`, rejecting UNC and other-drive roots when that variable matches the actual system drive. This is an accidental-configuration guard, not an OS-level volume check: a forged `SystemDrive` can still point at a mapped drive. No source-level Sonar suppressions are present. Two local-only HTTP findings remain visible and need a formal SonarCloud false-positive disposition; CI for the current local candidate is pending publication.

The E2E suite uses a synthetic loopback health fixture, not a Supabase stack. Supabase success through Docker and the reset lifecycle still require a working local Docker engine.
