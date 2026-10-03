# GMZ-IMPL-004 — Evidence Bundle

Status: `READY_FOR_OBJECTIVE_AUDIT`

## Candidate identity and GEF 1.1.1 preflight

- Repository: `KayzenRoot/goodz-menu` (`https://github.com/KayzenRoot/goodz-menu.git`).
- Authorized branch: `execution/gmz-impl-004-auth-session-entry`.
- Legal execution base: `e43d4b791b9bcabf806d115424218a4b0240647c`; verified ancestor of the implementation branch.
- Exact-head L5 validation candidate: `c652cc41aa222e2c92e2d4323c2b7dbd87b1d664` (full suite rerun after the Sonar code corrections).
- PR: [#54](https://github.com/KayzenRoot/goodz-menu/pull/54), base `main`, kept open as draft. The final published HEAD and fresh post-push checks are recorded in the PR description; these values are verified after publication.
- Context Lock: `BOUND_FOR_EXECUTION`.
- Stable source fingerprints: `16 / 16 MATCH`.
- Governance snapshot: expected checkpoint blob `0e599f77ca5967a7ecd7d325fcc62fa6b6397f04` matches `.engineering/CHECKPOINT.json` at bind commit `fc0d77b4aeba4631c4907012c5329b9009d1ad36`.
- `.gef`: unchanged from the authorized execution base and unmodified in the worktree.
- No schema, migration, seed, RLS/policy, remote Supabase, production-deployment or business-domain changes.

## Implementation summary

- Added pinned `@supabase/ssr` `0.12.7` and `@supabase/supabase-js` `2.117.2`; raised declared Node minimum to `22.0.0` because the pinned Supabase SDK requires it. Docker uses Node 24.
- Added public-key-only browser/server Supabase clients and a Next.js 16 request proxy for cookie refresh. Protected server entry validates identity through `auth.getUser()` on each request; errors and invalid/malformed sessions fail closed.
- Added accessible email/password login with generic credential errors and a fixed `/app` post-login path, local sign-out, and an authenticated tenant-entry shell.
- Tenant context is derived from unfiltered organization/establishment/branch SELECTs under the existing anon-key + RLS policy boundary. Client-provided tenant context, `user_metadata`, custom JWT roles and service-role credentials do not grant authority.
- Updated local Docker setup so it receives only the local public anon key for the Compose invocation. Added an E2E runner that reads status only from loopback Supabase and redacts captured configuration output.

## Verification results

| Gate | Result |
|---|---|
| `pnpm install --frozen-lockfile --strict-peer-dependencies` | PASS |
| lint | PASS |
| typecheck | PASS |
| unit | PASS — 13 tests in 4 files |
| production build | PASS — protected `/app` rendered dynamically |
| full E2E desktop/mobile | PASS — 20/20 with one worker |
| focused real Auth revocation regression | PASS — 2/2 desktop/mobile |
| Axe accessibility | PASS — 8 scans, 0 violations |
| Supabase local reset + complete pgTAP | PASS — 125/125 |
| local Auth/Data API authorization regression | PASS — 50/50 |
| local migration status | PASS — both local migrations applied |
| database lint | PASS — 0 schema errors |
| local security advisors | PASS — 0 findings |
| production dependency audit | PASS — no known vulnerabilities at high severity or above |
| strict peer dependency check | PASS |
| secret-pattern scan | PASS — 0 matches across 34 changed paths; the single synthetic credential URL used by a rejection test was allowlisted for the URL-credential heuristic |
| Docker Compose config/build/up | PASS |
| Docker health/readiness | PASS — `ok` / `ready`, local Supabase available |
| PowerShell local Supabase bootstrap | PASS — exit code checked; IPv4/hostname/IPv6 loopback accepted; remote URL rejected |
| Supabase local Auth/Postgres | PASS — Auth health HTTP 200; Postgres accepting connections |
| runtime log scan | PASS — 11 lines, 0 severe entries or secret-pattern matches |
| `.gef` integrity | PASS — unchanged |
| CodeRabbit local | PASS — deep full-diff review at the exact-head candidate above, 0 findings (6 evidence screenshots excluded as unsupported binary files) |
| SonarCloud / Socket PR checks | Pending fresh checks for the final published PR head; prior-SHA results are not carried forward |

The first default-parallel E2E attempt encountered Windows Chromium `ERR_NO_BUFFER_SPACE` while opening `/login`, before the affected scenario began. The focused revocation run passed 2/2 and the complete 20-test desktop/mobile suite passed with one worker; no application change was made for that host-resource event.

The first SonarCloud run at the previous PR head passed its Quality Gate and reported 10 new code smells (5 `MAJOR`, 5 `MINOR`, 0 Security Hotspots). Commit `ace5ec5` corrected the nested-template, nested-conditional, status-role and mutable-props findings. One `MINOR` finding about `await` in the fixture SQL loop is intentionally retained: a read-only probe confirmed the local Supabase CLI rejects multiple SQL commands in one prepared-statement request, and fixture statements have foreign-key ordering dependencies. The sequential loop preserves that required order. The final exact-head L5 run at `c652cc4` passed locally; fresh SonarCloud and Socket results are required for the final published PR head.

## UI evidence

- Login light desktop: [login-light-desktop.png](GMZ-IMPL-004/screenshots/login-light-desktop.png)
- Login dark desktop: [login-dark-desktop.png](GMZ-IMPL-004/screenshots/login-dark-desktop.png)
- Login light mobile: [login-light-mobile.png](GMZ-IMPL-004/screenshots/login-light-mobile.png)
- Login dark mobile: [login-dark-mobile.png](GMZ-IMPL-004/screenshots/login-dark-mobile.png)
- Authorized tenant entry desktop: [tenant-entry-desktop-chromium.png](GMZ-IMPL-004/screenshots/tenant-entry-desktop-chromium.png)
- Authorized tenant entry mobile: [tenant-entry-mobile-chromium.png](GMZ-IMPL-004/screenshots/tenant-entry-mobile-chromium.png)

Synthetic Auth users and tenant fixtures are local-only and use `.invalid` addresses. Passwords, session tokens, keys and service-role material are not stored in screenshots or this bundle.

## Security results and remaining boundary

- CRITICAL/HIGH findings: `0 / 0` in the final local CodeRabbit review. Fresh exact-head SonarCloud and Socket check state must also be confirmed at PR #54 before objective audit.
- Open review threads requiring code changes: `0` at initial PR inspection; the draft CodeRabbit skip notice is informational, not a code finding.
- No service-role key is bundled, rendered or used in the end-user path.
- Signup/onboarding, password recovery/invitations, MFA/AAL2, Admin Guard, Platform/Super Admin, membership/role management, tenant writes, business-domain work, remote Supabase and production deployment remain deferred/forbidden by this Work Order.
- Current earned production credit remains `31 / 515 = 6.02%`. No objective approval, merge, promotion or additional credit is claimed.

## Proposed checkpoint and stop

- Checkpoint: `GMZ_IMPL_004_READY_FOR_OBJECTIVE_AUDIT`.
- Next action: separate objective audit of PR #54 and the exact final head recorded in its description.
- No merge performed.

STOP CONDITION: `GMZ_IMPL_004_READY_FOR_OBJECTIVE_AUDIT`.
