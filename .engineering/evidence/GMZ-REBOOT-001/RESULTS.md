# Evidence Bundle — GMZ-REBOOT-001

**Review status: `BLOCKED`** — the code gates pass, but the Work Order's local Docker/Supabase and app CI evidence is incomplete. The objective-audit stop condition has not been met.

## Identity and scope

- Work Order: `.engineering/work-orders/GMZ-REBOOT-001.md`
- Issue: [#73](https://github.com/KayzenRoot/goodz-menu/issues/73)
- Draft PR: [#74](https://github.com/KayzenRoot/goodz-menu/pull/74)
- Branch: `rebuild/gmz-reboot-001-module-01`
- Base: `main@3139534697743494626f4940b78ac3f9d468ceb6`
- Implementation candidate: `6ba8495107dec2b89acd99f7900c1fb17410cc95`
- Scope: new foundation shell, isolated local runtime, liveness/readiness, correlation IDs, local Docker/Supabase wrappers, and test harness. No business module, product login, tenant model, or business data was carried forward.

Legacy product routes, auth/MFA/admin-guard/tenant/audit source and tests, business migrations, and seed were removed from this reboot branch after inventory. The checkpoint, Source Pack, ADRs, source hierarchy, issue history, and legacy PRs remain untouched. The deleted paths are visible in `git diff --name-status 3139534697743494626f4940b78ac3f9d468ceb6...6ba8495107dec2b89acd99f7900c1fb17410cc95`.

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
| `pnpm test` | PASS — 20 tests across 4 files |
| `pnpm build` | PASS — Next.js 16.4.3 production build |
| `pnpm test:e2e` | PASS — desktop Chromium and mobile Chromium; light/dark themes, Axe WCAG tags, reduced motion, health/readiness and responsive width |
| `pnpm security:deps` | PASS — no known vulnerabilities at the audit snapshot; Vite is pinned to patched `8.3.3` through `pnpm-workspace.yaml` |
| `pnpm security:secrets` | PASS — 36 scoped source/config files |
| Standalone start with a synthetic service-role-shaped key | PASS — entrypoint refused to start and did not print the value |
| `node scripts/dev.mjs --port 3200`, then GET `/api/health` and `/api/ready` | PASS — liveness `200`; readiness `503` with sanitized `supabase_anon_key_required` while Supabase is unavailable |
| `git diff --check` | PASS |

The E2E server uses a synthetic health fixture on loopback, not a Supabase stack. Unit tests cover readiness success, missing configuration, upstream failure, timeout, URL restrictions, key validation, and isolated local project configuration.

## Visual artifacts

- [Desktop — light](screenshots/foundation-desktop-chromium-light.png)
- [Desktop — dark](screenshots/foundation-desktop-chromium-dark.png)
- [Mobile — light](screenshots/foundation-mobile-chromium-light.png)
- [Mobile — dark](screenshots/foundation-mobile-chromium-dark.png)

## Blockers and limits

- `docker context show` selected `desktop-linux`, whose endpoint is the local Docker Desktop named pipe. `docker info` failed because that pipe does not exist; candidate Docker Desktop executable paths were absent. No engine or volume inventory was available.
- `pnpm supabase:start` and `pnpm docker:up` stopped at the local-engine preflight before invoking Supabase or Compose. Docker build/up/health/down and Supabase start/status/stop therefore remain unverified. No reset was run.
- The repository has only the two orchestrator workflows under `.github/workflows`; no app-foundation CI workflow is configured. App CI is `NOT_CONFIGURED`.
- No remote Supabase, remote database, production environment, or production data was accessed. The reboot branch has not been merged; the approved checkpoint has not been changed.
- The current checkpoint remains `GMZ_IMPL_007_ADMISSION_CANDIDATE_READY_FOR_REVIEW` at `52/515`; this reboot does not claim that historical credit as new work.

**Decision:** keep the candidate `BLOCKED` for objective audit until Docker/Supabase local acceptance and app CI evidence are available. Do not emit `GMZ_REBOOT_001_READY_FOR_OBJECTIVE_AUDIT` or start `GMZ-M01` yet.
