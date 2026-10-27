# Maintainer risk disposition — GMZ-REBOOT-001

**Decision:** `ACCEPTED_LOCAL_DEV_TEST_ONLY`, not a false-positive claim.

## Reconciled evidence snapshot — PR HEAD `d0aeae62fe5f38132448ea831a1dbe4e6c13f9e3`

- The decision is recorded and read back in [PR #74 comment #6431020903](https://github.com/KayzenRoot/goodz-menu/pull/74#issuecomment-6431020903). The authenticated maintainer account was verified as `KayzenRoot` with repository permission `admin`.
- At this snapshot, PR #74 is OPEN/Draft against `main@3139534697743494626f4940b78ac3f9d468ceb6`. The exact-head SonarCloud check `122463445900` failed `B Security Rating on New Code` (required `A`; 23 annotations). App workflow `40581883518` and both Socket checks passed. The disposition does not change Sonar issue state or override the failed Quality Gate.
- Local Docker/Supabase start, status, health, isolated reset, and stop passed on code candidate `5f3dd43` with reset confirmation scoped to one PowerShell process and 2.66 GiB free RAM. Health returned HTTP 200; published listeners were only `127.0.0.1` and `::1` on ports 56321/56322. Reset applied no project migrations or seed because seed loading is disabled and no migrations are tracked. Stop preserved the local project volume and left no project containers or listeners. Detailed receipts are in `LOCAL-VALIDATION.md` and `RESULTS.md`.
- The user-authorized global Docker Desktop preference `default-local-port-binding` was active for that local runtime and affects every Docker project on this machine. Chrome remained open during low-memory validation; no disk cleanup or move was needed.
- The user's human keyboard, actual zoom, screen-reader, and visual sign-off remains pending. The objective audit remains blocked by the failed Sonar gate and pending human sign-off. No TLS changes, merge, deploy, checkpoint promotion, or GMZ-M01 work is authorized by this disposition.

## Findings in scope

This disposition covers two SonarCloud S5332 findings first observed on PR #74 at check head `a811c7d389125bcda934fcfec59159dd5f9c2177` (code candidate `3e90030573031acd8764eb45fd40cf063d1dcbd3`) and reconfirmed in the historical snapshot at `95689e03daee224c8998a6bf646b4f234df91a8c` (check `121982262316`):

- `AaF5USd7m7ISM68fKi-0` — `scripts/compose-local.mjs` (`http://kong:8000`); reported at line 39 in the first snapshot and line 40 in the later historical snapshot.
- `AaF5USeFm7ISM68fKi-4` — `src/lib/env/runtime-env.ts:52` in the historical snapshot (`http://127.0.0.1:56321`).

## Rationale and boundary

The active Work Order limits this runtime to local/test development and excludes remote Supabase and production. The native endpoint uses loopback; the Docker endpoint uses the `kong` service on the dedicated local bridge; the wrappers constrain local Docker use and host binding; readiness uses GET with the public anon key. These controls bound exposure but do not encrypt the hop. A process or container with access to local host or bridge traffic could observe it.

Acceptance applies only while runtime remains local/test, Supabase remains local, host exposure remains loopback-only, and the dedicated bridge controls remain enforced. Remote Supabase, non-loopback binding, shared/public networks, privileged secrets over these requests, or production use reopen the findings and require a separate security decision.

## Historical Windows binding observation — 2026-10-27 18:39 UTC

At that snapshot, the previous local Supabase run published DB and Kong ports on `0.0.0.0` and `::`; no external access was observed. The stack was stopped, Docker Desktop and WSL were shut down, and the global Docker settings file had no port-binding preference. The local runtime was not ready then. This was superseded by the user-authorized localhost-by-default preference and the loopback-only start/status/reset/stop receipt above.

The Sonar check on code head `7b9cc0f2e8b1c3f41b783dea47b190f80dc9c96a` failed Security B (required A), check `122388140664`. No Sonar issue state was modified and no Quality Gate pass was claimed. At that historical snapshot, runtime start/reset and the user's human visual, keyboard, actual zoom, and screen-reader review were still pending. No TLS scope was added.
