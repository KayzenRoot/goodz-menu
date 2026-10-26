# Evidence Bundle — GMZ-REBOOT-001

**Review status: `BLOCKED`** — the code gates pass, but the Work Order's local Docker/Supabase and app CI evidence is incomplete. The objective-audit stop condition has not been met.

## Identity and scope

- Work Order: `.engineering/work-orders/GMZ-REBOOT-001.md`
- Requirement traceability: [`TRACEABILITY.md`](TRACEABILITY.md), checked against the current `APPROVED_V0.1` requirements file.
- Issue: [#73](https://github.com/KayzenRoot/goodz-menu/issues/73)
- Draft PR: [#74](https://github.com/KayzenRoot/goodz-menu/pull/74)
- Branch: `rebuild/gmz-reboot-001-module-01`
- Base: `main@3139534697743494626f4940b78ac3f9d468ceb6`
- Foundation code candidate: `540609c49db34303113708e3284672ef396f8c48`
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
| `pnpm test:e2e` | PASS — desktop Chromium and mobile Chromium; light/dark themes, Axe WCAG tags, dynamic status announcements, reduced motion, health/readiness and responsive width |
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

## Initial independent review corrections

The initial Standards and Spec reviews examined `87145b01940c42bab515f45bad1e41d029b07260` and requested three corrections: canonical requirement traceability, an app-foundation CI workflow, and live announcements for dynamic runtime states. This candidate adds `TRACEABILITY.md`, `.github/workflows/goodz-app-foundation.yml`, and an atomic polite status region with an E2E assertion. The local Docker/Supabase limitation remains. Fresh independent reviews are required on the final PR head.

## Blockers and limits

- `docker context show` selected `desktop-linux`, whose endpoint is the local Docker Desktop named pipe. `docker info` failed because that pipe does not exist; candidate Docker Desktop executable paths were absent. No engine or volume inventory was available.
- `pnpm supabase:start` and `pnpm docker:up` stopped at the local-engine preflight before invoking Supabase or Compose. Docker build/up/health/down and Supabase start/status/stop therefore remain unverified. No reset was run.
- `.github/workflows/goodz-app-foundation.yml` now runs frozen install, lint, typecheck, unit tests, build, desktop/mobile E2E, dependency audit, and scoped secret scan on PRs and `main`; the PR-head CI result remains pending verification after publication.
- No remote Supabase, remote database, production environment, or production data was accessed. The reboot branch has not been merged; the approved checkpoint has not been changed.
- The current checkpoint remains `GMZ_IMPL_007_ADMISSION_CANDIDATE_READY_FOR_REVIEW` at `52/515`; this reboot does not claim that historical credit as new work.

**Decision:** keep the candidate `BLOCKED` for objective audit until Docker/Supabase local acceptance, final PR-head CI, and the required human visual/manual accessibility reviews are recorded. Do not emit `GMZ_REBOOT_001_READY_FOR_OBJECTIVE_AUDIT` or start `GMZ-M01` yet.
