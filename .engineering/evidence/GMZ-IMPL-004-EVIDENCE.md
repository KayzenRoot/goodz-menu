# GMZ-IMPL-004 — Evidence Bundle

Status: `READY_FOR_OBJECTIVE_AUDIT`

## Candidate identity and GEF 1.1.1 preflight

- Repository: `KayzenRoot/goodz-menu` (`https://github.com/KayzenRoot/goodz-menu.git`).
- Authorized branch: `execution/gmz-impl-004-auth-session-entry`.
- Legal execution base: `e43d4b791b9bcabf806d115424218a4b0240647c`; verified ancestor of the implementation branch.
- Prior implementation L5 candidate (before CD-001): `6c4f6a378cdedba141c6772c672f8cecc5498c0f`.
- CD-001 exact-head L5 validation candidate before evidence closeout: `770d5b1aacd49cb5c515515a754babccf73c01b3`.
- PR: [#54](https://github.com/KayzenRoot/goodz-menu/pull/54), base `main`, kept open as draft. The final post-evidence publication SHA and its fresh checks are recorded in the PR description.
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
- Updated the PowerShell native-development runbook to read only loopback Supabase status and scope the public anon key to the `pnpm dev` process, then remove the environment values on exit.

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
| PowerShell local Supabase bootstrap/native Auth setup | PASS — exit code checked; IPv4/hostname/IPv6 loopback accepted; remote URL rejected; native runbook guard exercised without exposing the key |
| Supabase local Auth/Postgres | PASS — Auth health HTTP 200; Postgres accepting connections |
| runtime log scan | PASS — 9 lines, 0 severe entries or secret-pattern matches |
| `.gef` integrity | PASS — unchanged |
| CodeRabbit local | PASS — deep full diff review at `0a4a4a8`, 0 findings after correcting the native Auth startup guide; an earlier stale suggestion to return the next action to completed PR `#49` was rejected against the current checkpoint and promotion history (6 screenshots excluded as unsupported binaries) |
| SonarCloud at `6c4f6a3` | PASS — Quality Gate `OK`; 1 `MINOR` code smell retained in sequential fixture SQL; 0 security hotspots |
| Socket at `6c4f6a3` | PASS — Project Report and Pull Request Alerts |

The first default-parallel E2E attempt encountered Windows Chromium `ERR_NO_BUFFER_SPACE` while opening `/login`, before the affected scenario began. The focused revocation run passed 2/2 and the complete 20-test desktop/mobile suite passed with one worker; no application change was made for that host-resource event. At exact head `97eff37`, an initial serial full run had one transient mobile feedback-preview interaction failure (the preview remained on its initial informational item); the isolated mobile case passed and the immediate complete serial rerun passed `20 / 20`. No source change was made between the failed and passing runs.

The first SonarCloud run at the previous PR head passed its Quality Gate and reported 10 new code smells (5 `MAJOR`, 5 `MINOR`, 0 Security Hotspots). Commit `ace5ec5` corrected the nested-template, nested-conditional, status-role and mutable-props findings. One `MINOR` finding about `await` in the fixture SQL loop is intentionally retained: a read-only probe confirmed the local Supabase CLI rejects multiple SQL commands in one prepared-statement request, and fixture statements have foreign-key ordering dependencies. The sequential loop preserves that required order. Exact-head local L5 and remote SonarCloud/Socket checks passed at `6c4f6a3`. The final evidence-only commit is followed by another exact-head rerun; its published SHA and fresh remote checks are recorded in the PR description.

## UI evidence

- Login light desktop: [login-light-desktop.png](GMZ-IMPL-004/screenshots/login-light-desktop.png)
- Login dark desktop: [login-dark-desktop.png](GMZ-IMPL-004/screenshots/login-dark-desktop.png)
- Login light mobile: [login-light-mobile.png](GMZ-IMPL-004/screenshots/login-light-mobile.png)
- Login dark mobile: [login-dark-mobile.png](GMZ-IMPL-004/screenshots/login-dark-mobile.png)
- Authorized tenant entry desktop: [tenant-entry-desktop-chromium.png](GMZ-IMPL-004/screenshots/tenant-entry-desktop-chromium.png)
- Authorized tenant entry mobile: [tenant-entry-mobile-chromium.png](GMZ-IMPL-004/screenshots/tenant-entry-mobile-chromium.png)

Synthetic Auth users and tenant fixtures are local-only and use `.invalid` addresses. Passwords, session tokens, keys and service-role material are not stored in screenshots or this bundle.

## Security results and remaining boundary

- CRITICAL/HIGH defects: `0 / 0`. The CD-001 exact-head CodeRabbit review returned one stale next-action suggestion, rejected against the active checkpoint; the final published-head review disposition is recorded in PR #54.
- Open review threads requiring code changes: `0` at initial PR inspection; the draft CodeRabbit skip notice is informational, not a code finding.
- No service-role key is bundled, rendered or used in the end-user path.
- Signup/onboarding, password recovery/invitations, MFA/AAL2, Admin Guard, Platform/Super Admin, membership/role management, tenant writes, business-domain work, remote Supabase and production deployment remain deferred/forbidden by this Work Order.
- Current earned production credit remains `31 / 515 = 6.02%`. No objective approval, merge, promotion or additional credit is claimed.

## Proposed checkpoint and stop

- Checkpoint: `GMZ_IMPL_004_READY_FOR_OBJECTIVE_AUDIT`.
- Next action: separate objective audit of PR #54 and the exact final head recorded in its description.
- No merge performed.

STOP CONDITION: `GMZ_IMPL_004_READY_FOR_OBJECTIVE_AUDIT`.


## GMZ-IMPL-004-CD-001 — governance integrity correction

- Objective review of PR `#54` identified `currentOutputs.productionEarned = 19` conflicting with top-level/active credit `31` and completion `6.02%`.
- Corrected only the current `currentOutputs.productionEarned` value in `.engineering/CHECKPOINT.json` to `31`; prior historical sections remain unchanged.
- Production credit remains `31 / 515 = 6.02%`; no incremental credit is claimed.
- This is a governance-integrity correction only. Runtime/auth/session, UI, dependencies, schema, migrations, RLS/policies, `.gef`, and business scope are unchanged.
- The correction-candidate preflight and complete HIGH_ASSURANCE L5 results are recorded below; a final evidence-closeout HEAD receives another complete exact-head run before objective audit.
- CD-001 preflight at `770d5b1`: correct repository and authorized branch; legal execution base `e43d4b791b9bcabf806d115424218a4b0240647c` unchanged; Context Lock `BOUND_FOR_EXECUTION`; `16/16` stable source fingerprints `MATCH`; governance snapshot `MATCH`; worktree clean; `.gef` unchanged.
- Complete correction-candidate L5 at `770d5b1`: frozen strict-peer install, lint, typecheck, unit `13/13`, production build, full desktop/mobile E2E `20/20`, Axe `8/8` scans with `0` violations, local Supabase reset, pgTAP `125/125`, Auth/Data API `50/50`, migrations applied, DB lint `0` errors, security advisors `0` findings, production dependency audit with no known high-or-above vulnerabilities, strict peers, secret-pattern scan `0` matches across `34` changed paths (`28` text files; synthetic credential URL remains allowlisted), Docker config/build/recreate and healthy container, health `ok`, readiness `ready`, login HTTP `200`, local Auth reachable, Postgres ready, Supabase API loopback, runtime logs `18` lines with `0` severe/secret matches, and `.gef` integrity: `PASS`.
- The complete HIGH_ASSURANCE L5 is repeated on the final evidence-closeout HEAD. Its exact published SHA and fresh exact-head remote results are recorded in PR `#54` so this bundle can remain a member of that validated commit.
- CodeRabbit local deep review at `e4acd5f` returned one suggestion to redirect the evidence next action to PR `#49`. The canonical checkpoint says `activeWorkOrder=GMZ-IMPL-004`, `nextAction=OBJECTIVE_AUDIT_GMZ_IMPL_004`, and `.engineering/CHECKPOINT.md` names PR `#54`; the suggestion is stale and non-actionable, so no checkpoint or Work Order change was made. Six screenshot binaries were excluded by the reviewer.
- CodeRabbit local deep review at `0912163` also returned one stale major suggestion to change the checkpoint target, although `.engineering/CHECKPOINT.md` already says objective-audit PR `#54`, plus two duplicate minor suggestions about where the final SHA/results are recorded. The stale major request is rejected against the current checkpoint. The minor documentation inconsistency is corrected in CD-001: the Evidence Bundle records correction-candidate results, and the published SHA/fresh exact-head results are recorded in PR `#54`'s description. No valid CRITICAL/HIGH defect was found; six screenshot binaries were excluded by the reviewer.
- PR `#54` remains OPEN/DRAFT against `main`; no merge is performed.

STOP CONDITION: `GMZ_IMPL_004_CD_001_READY_FOR_OBJECTIVE_AUDIT`.


## GMZ-IMPL-004-CD-002 — bounded runtime review corrections

- Code candidate for the full matrix below: `16d841fc4e44aac4a992e53ca75f7b43ffea90cc` on `execution/gmz-impl-004-auth-session-entry`, PR `#54` (OPEN/DRAFT; no merge). Current implementation/test candidate after all review fixes: `86446e51f830036c26b26af13d622870df0b1da8`.
- Tenant hierarchy queries now request exact counts, page to exhaustion even when the API caps each response below the requested page size, retain RLS authority and do not accept a client tenant filter; ordering is `display_name`, then `id`. Null/inconsistent counts, query/page errors and incomplete data fail closed without returning partial records.
- Local Supabase status parsing now discards preamble text before the first `{` and applies the same generic error to absent or invalid JSON in both the runner and Auth fixture.
- Proxy claims verification preserves cookies for retryable/transient or unknown verification failures, clears them when the session is confirmed invalid/malformed or no claims are returned, and keeps the protected route dependent on `auth.getUser()`. Valid claims continue through the normal flow.
- Deterministic tests cover all three tenant tables beyond a page, stable order, intermediate-page failure, pure/prefixed/invalid status output, invalid/transient/valid claims and cookie behavior. Full E2E includes malformed-session protected-entry denial.
- No schema, migration, RLS/policy, authorization-semantic, dependency, service-role, business-scope, `.gef`, remote Supabase or production/deployment changes.
- Production credit stays `31 / 515 = 6.02%`.

### Code-candidate validation at `16d841f`

| Gate | Result |
|---|---|
| Frozen install / strict peers | PASS — pnpm `12.8.1`, lockfile frozen, strict peer dependency mode |
| Lint / typecheck / unit | PASS — lint; TypeScript; `32 / 32` unit tests |
| Production build | PASS — Next.js `16.3.8` |
| Full E2E desktop/mobile | PASS — `20 / 20`; Axe `8 / 8` scans, `0` violations |
| Local Supabase reset / pgTAP | PASS — `125 / 125` |
| Auth/Data API integration | PASS — `50 / 50` synthetic local checks |
| Migration status | PASS — local migrations `20261002093358`, `20261002152627` applied |
| Database lint | PASS — `public` and `auth`, 0 schema errors |
| Database advisors | PASS — no warning/error-level security findings; 6 informational findings (unused index and intentionally policy-free RLS tables), preserved without schema/policy scope change |
| Dependency audit | PASS — no known production vulnerabilities at high-or-above severity |
| Secret-pattern scan / whitespace | PASS — 0 matching files; 34 text files scanned across 40 changed paths; `git diff --check` clean |
| Docker config/build/up/health | PASS — config valid, image built for revision `16d841f`, service healthy |
| Health/readiness/Auth/Postgres | PASS — health `ok`; readiness `ready`; Supabase dependency `available`; local Auth HTTP `200`; Postgres ready; Supabase API loopback |
| Runtime log scan | PASS — 92 lines, 0 severe/error or secret-pattern matches |
| `.gef` integrity | PASS — unchanged from execution base |

The additional local CodeRabbit correction synchronizes confirmed-invalid cookie removal into the forwarded request as well as the response, including after cookie refresh replaced the response object. The focused proxy suite passed `4 / 4` at `135aa61` and the focused pagination/claims/proxy suites passed `17 / 17` at `86446e5`; typecheck also passed after removing redundant `unknown | null` unions reported by SonarCloud. The full exact-head HIGH_ASSURANCE L5 is rerun after the evidence-closeout commit, including Docker rebuild and all local database/Auth/E2E/security checks. Its published SHA, fresh SonarCloud/Socket results, and PR checks are recorded in PR `#54`; results are never carried forward from an earlier SHA.

The local deep CodeRabbit review surfaced two minor stop-token/checkpoint clarity findings and one runtime cookie-forwarding finding. The current checkpoint labels CD-002 as a correction token while retaining `GMZ_IMPL_004_READY_FOR_OBJECTIVE_AUDIT` as the canonical overall stop condition. Confirmed-invalid cleanup now clears the auth cookie from both request and response state; focused tests prove the behavior after a response refresh. The remaining SonarCloud `await` warning is retained because fixture statements have foreign-key ordering dependencies and local Supabase rejects multiple SQL statements in one prepared-statement request. The final local review and remote scans run against the final pushed SHA.

STOP CONDITION: `GMZ_IMPL_004_CD_002_READY_FOR_OBJECTIVE_AUDIT`.
