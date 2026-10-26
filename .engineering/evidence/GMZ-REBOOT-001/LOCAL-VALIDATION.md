# Local validation receipt — GMZ-REBOOT-001

This receipt records command output observed for the source tree committed as `c26fac282010e71f029168a4dff960f4adae4064`, based on `main@3139534697743494626f4940b78ac3f9d468ceb6`. The evidence-document commits are not application-code changes.

## Environment

- Node.js: `v26.4.0`
- pnpm: `12.8.1`
- Docker context: `desktop-linux`; the local Docker Desktop Linux engine was unavailable.
- CI pins Node.js `24`; local validation under that version remains pending CI.

## Commands and observed results

| Command | Exit | Observed output or result |
| --- | ---: | --- |
| `pnpm install --frozen-lockfile` | 0 | Lockfile policy passed; lockfile was up to date. |
| `pnpm lint` | 0 | ESLint completed without diagnostics. |
| `pnpm typecheck` | 0 | `tsc --noEmit` completed without diagnostics. |
| `pnpm test` | 0 | `Test Files 5 passed (5)`; `Tests 41 passed (41)`. |
| `pnpm build` | 0 | Next.js 16.4.3 build completed; `/api/health` and `/api/ready` were dynamic routes. |
| `pnpm test:e2e` | 0 | Desktop Chromium and mobile Chromium both passed; `2 passed`. |
| `pnpm security:deps` | 0 | `No known vulnerabilities found`. |
| `pnpm security:secrets` | 0 | `Runtime secret scan passed across 37 tracked-scope file(s).` |
| Standalone start with a synthetic service-role-shaped JWT | expected refusal | `node scripts/start.mjs` exited 1 with a generic refusal; the wrapper assertion exited 0 and confirmed the synthetic value was not printed. |
| Local web smoke: `GET /api/health`, `GET /api/ready` without Supabase | 0 | `PASS health=200 readiness=503 reason=supabase_anon_key_required`. |
| Workflow YAML/action check | 0 | YAML parsed; all 4 action references use full 40-character commit SHAs. |
| `supabase db reset --network-id goodz-menu-reboot-001-loopback --help` | 0 | Pinned CLI exposes the global `--network-id` flag. Unit tests verify safe loopback-only network creation and refusal of an existing network bound to `0.0.0.0`; the database reset was not run. |
| `GOODZ_ALLOW_LOCAL_DB_RESET=0 pnpm supabase:reset` | 2 (expected refusal) | Reset printed the confirmation requirement and exited before engine access; the wrapper assertion exited 0. |
| `docker info` | 1 | Server connection failed because `npipe:////./pipe/dockerDesktopLinuxEngine` was absent. |

The E2E suite uses a synthetic loopback health fixture, not a Supabase stack. The local app smoke validates readiness failure with missing configuration; Supabase success through Docker and the reset lifecycle still require a working local Docker engine.
