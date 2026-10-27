# Maintainer risk disposition — GMZ-REBOOT-001

**Decision:** `ACCEPTED_LOCAL_DEV_TEST_ONLY`, not a false-positive claim.

## Findings in scope

This disposition covers the two SonarCloud S5332 issues first seen on PR #74 at check head `a811c7d389125bcda934fcfec59159dd5f9c2177` (code candidate `3e90030573031acd8764eb45fd40cf063d1dcbd3`) and reconfirmed on the current exact PR head `95689e03daee224c8998a6bf646b4f234df91a8c` by SonarCloud check `121982262316`:

- `AaF5USd7m7ISM68fKi-0` — `scripts/compose-local.mjs:39` at the original check and `scripts/compose-local.mjs:40` on the current head, `http://kong:8000`.
- `AaF5USeFm7ISM68fKi-4` — `src/lib/env/runtime-env.ts:52`, `http://127.0.0.1:56321`.

## Rationale and boundary

The active Work Order limits this runtime to local/test development and excludes remote Supabase and production. The native endpoint uses loopback; the Docker endpoint uses the `kong` service on the dedicated local bridge; the wrappers constrain local Docker use and host binding; readiness uses GET with the public anon key. These controls bound exposure but do not encrypt the hop. A process or container with access to local host or bridge traffic could observe it.

Acceptance applies only while runtime remains local/test, Supabase remains local, host exposure remains loopback-only, and the dedicated bridge controls remain enforced. Remote Supabase, non-loopback binding, shared/public networks, privileged secrets over these requests, or production use reopen the findings and require a separate security decision.

## Evidence and limits

- The authenticated maintainer account was verified as `KayzenRoot`, with repository permission `admin`.
- The decision was recorded in [PR #74 comment #6431020903](https://github.com/KayzenRoot/goodz-menu/pull/74#issuecomment-6431020903) and read back successfully.
- The current exact-head SonarCloud check remains `B Security Rating on New Code` (required `A`). The same two S5332 issue IDs remain open. No Sonar issue state was changed; this record does not override or claim a passing Quality Gate.
- The live Windows Docker/Supabase lifecycle was not verified because available physical memory was 4.73 GiB, below the documented 8 GiB prerequisite. This disposition relies on repository configuration and automated evidence, not live-stack proof.
- The user explicitly asked to keep the required human accessibility review pending. Seed/reset applicability, the PR/head reconciliation, and the final objective audit also remain pending.

This is a scoped risk acceptance for the Work Order audit only. It does not authorize TLS changes, objective-audit approval, merge, deployment, or checkpoint promotion.

## Current Windows binding observation — 2026-10-27 18:39 UTC

The previous live local Supabase run published the DB and Kong ports on 0.0.0.0 and ::. No external access was observed. The stack was stopped, Docker Desktop and WSL were shut down, and the current recheck found no listeners on ports 56321/56322. The current %APPDATA%/Docker/settings-store.json has no portBindingBehavior value; pnpm supabase:status reports the Docker Engine stopped/unavailable. Docker Desktop had automatically restarted the prior stack on startup, so it remains stopped until localhost-only port binding is configured.

This observation means the current Windows host does not satisfy the disposition's loopback-only boundary. The disposition above remains a local/test-only maintainer acceptance for the two S5332 findings, not a false-positive claim; it does not apply to non-loopback exposure. SonarCloud on exact code head 7b9cc0f2e8b1c3f41b783dea47b190f80dc9c96a remains failed at Security B (required A), check 122388140664; the GitHub app and Socket checks do not change that result. No Sonar issue state was modified and no Quality Gate pass is claimed.

The code-head guard in 7b9cc0f blocks Windows start/reset unless the configured host binding is localhost-only and verifies actual published bindings. Current hosted app CI and Socket checks pass as recorded in LOCAL-VALIDATION.md. Runtime start/reset, human visual review, keyboard, actual zoom, screen-reader sign-off, and objective audit remain pending. No TLS scope was added.
