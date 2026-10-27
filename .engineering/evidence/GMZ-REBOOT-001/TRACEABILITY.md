# Canonical requirement traceability — GMZ-REBOOT-001

This matrix binds the rebuilt foundation to the IDs listed in the historical `GMZ-IMPL-001` contract and checks them against the current approved requirements. It records only this foundation candidate; it does not claim completion of the later owner, staff, storefront, POS, or tenant journeys.

- Current requirement source: `docs/source-pack/REQUIREMENTS.md`
- Source status: `APPROVED_V0.1`
- Source SHA-1 at this review: `2e179c00446980a481e56dd02fe71865a7237f59`
- Test target: `docs/source-pack/TEST-BENCHMARK-PLAN.md` — WCAG 2.2 AA, automated tests plus required manual review.
- Latest implementation code candidate: `5f3dd43dac86d115339696b039a89329a5335ab2`, based on pinned `main@3139534697743494626f4940b78ac3f9d468ceb6`. It verifies actual Windows TCP listeners for implicit bindings, validates host ports/protocols, and refuses implicit UDP/SCTP. Local tests (65), lint, typecheck, and Supabase start/status/health/reset/stop passed on this code candidate; the reset used process-scoped confirmation with 2.66 GiB free RAM. The code-head app workflow `40578086527` and both Socket checks passed; Sonar failed Security B (required A). Its manifest (artifact `12768651321`) binds the pinned base to this code candidate with 103 paths and binary diff SHA-256 `4cbba55c840536b3d9c95c31660c411769937c4af0b198bcf195694c9510c2d1`. The two local/test S5332 risks retain their scoped maintainer acceptance in `SONAR-RISK-DISPOSITION.md` and PR comment `#6431020903`; scanner state and the failed check remain unchanged. Exact PR-head checks and manifest are recorded in the PR description.
- Historical review snapshot: implementation commit `7eb87ceaa55949395456b0ae93d507927ae13a80`; app-foundation CI emitted an exact-head manifest for published PR head `4ca68ba72ae45df6aaade7ca5ccab5bdd824c67a`, whose app checks passed and SonarCloud failed Security `B` (Reliability `C` cleared). The annotated `.find` predicate was wrapped in a later correction. The then-open mapped-drive/reparse review concern was subsequently addressed in `2d65738`; it is not a current unresolved finding. Standards review passed for that historical snapshot. Manifest: base `3139534697743494626f4940b78ac3f9d468ceb6`, 99 changed paths, binary diff SHA-256 `fc40ebff11c823023453d2d47a8363174c3c826dc14264097a9eb9e94fbf33d1`. Local command output excerpts are recorded in `LOCAL-VALIDATION.md`.

## Historical module mapping

The old `GMZ-IMPL-001` allocated historical credits to these modules. The mapping below records the rebuilt foundation's scope only; the historical credits are not transferred to this candidate.

| Module ID | Foundation mapping | Candidate status |
| --- | --- | --- |
| GMZ-M25 Runtime, Docker & Deployment | GMZ-REQ-RUN-001 and GMZ-REQ-RUN-002; local runtime wrappers and environment boundaries. | **PARTIAL** — local Docker/Supabase lifecycle and web integration passed; production deployment remains out of scope. |
| `GMZ-M04` Design System shell | `GMZ-REQ-UX-001` through `GMZ-REQ-UX-008`, limited to applicable foundation shell requirements. | **PARTIAL** — foundation UI exists; product component library and user journeys remain future work. |
| `GMZ-M26` Validation & Quality Engineering | `GMZ-REQ-QA-003` through `GMZ-REQ-QA-006`, scoped to foundation checks. | **PARTIAL** — automated checks exist; final PR CI and required manual reviews remain outstanding. |
| `GMZ-M23` Observability/correlation bootstrap | `GMZ-REQ-OBS-001` on health/readiness routes and runtime logs. | **PASS for foundation endpoints** — critical business operations are not part of this candidate. |

| Requirement ID | Foundation mapping and evidence | Candidate status |
| --- | --- | --- |
| GMZ-REQ-RUN-001 | Dockerfile, compose.yaml, supabase/config.toml, scripts/compose-local.mjs, scripts/supabase-local.mjs, and scripts/local-supabase-status.mjs. The wrappers accept only Docker Desktop local named pipes; tests reject TCP, Unix, SSH, unknown endpoints, and explicit wildcard host bindings. The web container shares the dedicated Supabase bridge through internal http://kong:8000; the database reset requires explicit process-scoped confirmation. On this authorized Windows host, the global Docker Desktop setting reads default-local-port-binding; integrated start/status/reset, web health/readiness, actual loopback listeners, stop, and volume preservation passed. Direct CLI calls bypass the wrappers and are documented as unsupported. Seed loading is disabled, sql_paths=[], and no migrations are tracked, so no project seed or migration was applied by reset. | **PASS for the local foundation runtime** — production deployment remains out of scope. |
| `GMZ-REQ-RUN-002` | `src/lib/env/runtime-env.ts`, `src/lib/env/runtime-env.test.ts`, `scripts/start.mjs`, and `scripts/check-runtime-secrets.mjs`; runtime only accepts the isolated local endpoint and publishable key shape. | **PASS for foundation boundary** — production deployment separation remains out of scope. |
| `GMZ-REQ-UX-001` | `src/components/theme-provider.tsx`, `src/components/theme-control.tsx`, `src/app/globals.css`, `tests/e2e/foundation.spec.ts`; desktop and mobile light/dark screenshots are committed. | **PASS for foundation shell** — no later product journeys exist yet. |
| `GMZ-REQ-UX-002` | Design tokens in `src/app/globals.css` and shell in `src/components/foundation-shell.tsx`, guided by `docs/source-pack/UI-UX-DESIGN-SYSTEM.md`. | **PARTIAL** — foundation tokens are used; reusable product component coverage is not complete. |
| `GMZ-REQ-UX-003` | Controlled `--surface-glass` token and shell treatment in `src/app/globals.css`; contrast checks run in the browser suite. | **PARTIAL** — shell treatment is covered; no representative storefront performance benchmark or human visual review is recorded. |
| `GMZ-REQ-UX-004` | Reduced-motion rules in `src/app/globals.css` and browser assertion in `tests/e2e/foundation.spec.ts`. | **PASS for foundation shell** — broader product motion patterns remain future work. |
| `GMZ-REQ-UX-005` | Example success, information, warning, and error states in `src/components/foundation-shell.tsx`. | **PARTIAL** — these are preview examples; a reusable toast system and confirmation, loading, progress, undo, offline, and sync states are not implemented. |
| `GMZ-REQ-UX-008` | Responsive rules in `src/app/globals.css`; desktop/mobile Playwright runs and width assertion in `tests/e2e/foundation.spec.ts`. | **PARTIAL** — shell responsiveness is verified; owner, staff, and storefront experiences are not present. |
| `GMZ-REQ-OBS-001` | Correlation ID implementation and tests in `src/lib/observability/correlation.ts` and `.test.ts`, plus health/readiness route and E2E assertions. | **PASS for foundation endpoints** — business operations do not exist in this increment. |
| `GMZ-REQ-QA-003` | Desktop/mobile foundation E2E in `tests/e2e/foundation.spec.ts`; the app CI workflow runs this suite. | **PARTIAL** — runtime/theme shell is covered; critical owner/staff/customer journeys are future work. |
| `GMZ-REQ-QA-004` | Four committed browser screenshots under `screenshots/` and automated theme/responsive checks. | **BLOCKED** — required human visual review has not been recorded; visual regression is not configured. |
| `GMZ-REQ-QA-005` | Axe Playwright checks use WCAG 2.2 AA tags; dynamic runtime status stays a polite atomic announcement, and E2E asserts static examples are not live regions. It also checks skip-link focus transfer, 3px `:focus-visible` outline on the theme selector, and reflow at a 320 CSS-pixel viewport. | **PARTIAL** — automated keyboard and narrow-viewport coverage improved; actual browser zoom, screen-reader, and human keyboard review remains outstanding. |
| `GMZ-REQ-QA-006` | `docs/source-pack/TEST-BENCHMARK-PLAN.md` contains approved POS/storefront budgets; no POS or storefront exists in this foundation. | **NOT APPLICABLE TO THIS SHELL** — no product performance result is claimed; measure the defined surfaces before their acceptance. |
| `GMZ-REQ-SEC-005` | `pnpm security:secrets` scans the 37 scoped source/config files; runtime tests reject a synthetic service-role-shaped key without printing it. | **PASS for scanned candidate scope** — the scanner does not inspect the full preserved Git history, docs, or screenshots; no screenshot CI artifact is uploaded. |
| `GMZ-REQ-GOV-001` | Admitted Work Order `.engineering/work-orders/GMZ-REBOOT-001.md`, pinned base and revalidated source fingerprints in `RESULTS.md`; implementation remains on its dedicated reboot branch. | **PASS for this admitted Work Order** — the reboot uses its own pinned snapshot, not the completed legacy `GMZ-IMPL-001` Context Lock. |
| GMZ-REQ-GOV-002 | Code candidate `5f3dd43`; exact code-head checks and manifest are in RESULTS.md and LOCAL-VALIDATION.md; scoped S5332 disposition remains recorded there and at PR comment #6431020903. | **PARTIAL** — app and Socket checks pass; Sonar fails Security B (required A); human sign-off and final objective audit remain open. |
| GMZ-REQ-GOV-003 | Exact code-head dependency/secret checks and parsed manifest, plus local Docker/Supabase lifecycle/reset evidence, are recorded in RESULTS.md and LOCAL-VALIDATION.md. | **PARTIAL** — code workflow and local reset passed; final PR-head manifest is recorded in the PR description. |
| `GMZ-REQ-GOV-004` | `.engineering/CHECKPOINT.json` remains unchanged; the conditional delta is proposed in `CHECKPOINT-DELTA-PROPOSED.md`. | **PASS for current stage** — no checkpoint promotion is claimed or performed. |

## Remaining acceptance gates

1. At this recorded snapshot, PR #74 is OPEN/Draft at evidence HEAD `9c051b95d99643411fc31013ec0f3818a2a5ba0b`, with implementation code candidate `5f3dd43`. Exact-head app workflow `40579690892` and both Socket checks passed; Sonar failed Security B (required A). Manifest artifact `12768368696` was parsed and binds the pinned base to the exact evidence HEAD with 103 paths. Any later evidence-only HEAD and its exact run/manifest are recorded in the PR description.
2. Docker/Supabase local lifecycle, isolated reset, integrated web health/readiness, loopback listeners, teardown, and DB volume preservation **PASS**. Reset was run on code candidate `5f3dd43` with process-scoped confirmation and 2.66 GiB free RAM. The authorized global Docker setting affects other projects on this machine. `db.seed.enabled=false`, `sql_paths=[]`, and no migrations are tracked, so reset applied no project seed/migration.
3. The user's human visual review plus manual keyboard, actual browser zoom, and screen-reader review remain pending; automated checks and agent spot checks do not replace this sign-off.
4. Independent security and scope reviews of code candidate `5f3dd43` found no remaining code finding. The objective audit remains **BLOCKED** by Sonar Security B and the user's pending human accessibility sign-off; do not start GMZ-M01.

## Maintainer disposition addendum — 2026-10-27

`GMZ-REQ-GOV-002` has a documented, scoped maintainer acceptance for the two local/test S5332 findings: [`SONAR-RISK-DISPOSITION.md`](SONAR-RISK-DISPOSITION.md), verified at [PR #74 comment #6431020903](https://github.com/KayzenRoot/goodz-menu/pull/74#issuecomment-6431020903). The Sonar Security rating remains `B`; the disposition does not change scanner state. Objective acceptance remains blocked by this failed gate and the user-requested pending human accessibility review; no readiness token is claimed.

## Previous evidence binding — 2026-10-27 18:39 UTC

- GMZ-REQ-GOV-002: exact code candidate 7b9cc0f; app workflow 40560458468 and both Socket checks pass, while Sonar 122388140664 remains failed at Security B (required A). The two local/test S5332 findings have scoped maintainer acceptance only; see SONAR-RISK-DISPOSITION.md and PR comment #6431020903.
- GMZ-REQ-RUN-001: BLOCKED at that snapshot — `pnpm supabase:status` reported Docker Engine stopped and the local binding setting was missing. The newer lifecycle receipt below supersedes this gate.
- GMZ-REQ-QA-004/005: human visual review and keyboard, actual zoom, and screen-reader sign-off remain pending at the user's request.
- Seed/reset applicability had not been accepted at that snapshot: seed was disabled, no migrations were tracked, and runtime reset had not been performed.
- Exact-head manifest artifact metadata is recorded in LOCAL-VALIDATION.md and RESULTS.md; its ZIP contents were not parsed in this receipt.
- The objective remains BLOCKED / NOT READY FOR OBJECTIVE AUDIT. The proposed checkpoint delta remains unapplied; no merge, deployment, promotion, or GMZ-M01 work occurred.

## Previous evidence binding — 2026-10-27 19:33 UTC

- GMZ-REQ-GOV-002: local code candidate/PR head `28184f9bea8b4edfa6982311a6331ee8aceafc32`; current exact-head app run `40570145844` is in progress. Prior Sonar Security `B` remains the known result until the new exact-head analysis completes; scoped S5332 disposition is unchanged.
- GMZ-REQ-RUN-001: **PASS** — local Supabase start/status/health/reset/stop passed; the observed published API/database listeners were loopback-only, the DB volume was preserved, and no project listeners remained after stop.
- GMZ-REQ-DB-001: **PASS for the foundation's current seed/migration state** — seed is disabled, seed paths are empty, and no migrations are tracked; the accepted local reset applied no project seed/migration.
- GMZ-REQ-QA-004/005: human visual review and keyboard, actual zoom, and screen-reader sign-off remain pending at the user's request.
- The exact-head app manifest and all current hosted check results must be read back after run `40570145844` completes. The artifact from prior HEAD `55a3043` is not evidence for `28184f9`.
- The objective remains **BLOCKED / NOT READY FOR OBJECTIVE AUDIT** pending exact-head checks, fresh review of the new code delta, human accessibility review, and final audit. The proposed checkpoint delta remains unapplied; no merge, deploy, promotion, or GMZ-M01 work occurred.

## Historical evidence binding — 2026-10-27 19:44 UTC

- Code candidate/PR implementation head: 28184f9bea8b4edfa6982311a6331ee8aceafc32; PR #74 remains OPEN/Draft against pinned main@3139534697743494626f4940b78ac3f9d468ceb6.
- Exact-head run 40570145844: app checks passed (check 122421864630); Socket Project Report (122421881152) and PR Alerts (122421909429) passed; Sonar (122422173289) failed Security B (required A). Artifact goodz-foundation-head-manifest-40570145844, ID 12763688509, digest sha256:e6d1b9efeed0291eb72ba160110d156e690e5599edab6c45a85016198215bc11, binds base 3139534697743494626f4940b78ac3f9d468ceb6 to head 28184f9bea8b4edfa6982311a6331ee8aceafc32; 103 paths; binary diff SHA-256 f8f6e3edfe940383eb86cfb74f577933ebb27c4e407bbc1b4d6e5a7ef911d040.
- Local Docker/Supabase start/status/health/reset, web build/up, /api/health 200, /api/ready 200, loopback listener checks, wrapper-based teardown, and database-volume preservation passed. Final project containers/listeners are absent. The authorized global Docker Desktop setting remains default-local-port-binding.
- Seed loading remains disabled and no migrations are tracked. The reset applied no project seed or migration.
- Focused code self-review found no blocking issue; it is not independent review. Human keyboard, actual zoom, screen-reader, and visual sign-off remain pending at the user's request.
- The evidence closeout is local and uncommitted at this snapshot. Verify exact-head workflow and manifest after normal fast-forward publication. Sonar issue state remains unchanged, the local/test S5332 disposition does not clear its failed gate, and the objective remains **BLOCKED / NOT READY FOR OBJECTIVE AUDIT**. Checkpoint delta remains unapplied; no merge, deploy, promotion, remote Supabase access, or GMZ-M01 work occurred.

## Correction evidence binding — 2026-10-27 20:32 UTC

- The code candidate `5f3dd43dac86d115339696b039a89329a5335ab2` was reviewed independently on the exact source delta. Standards/security review found no remaining issue; scope review found no requirement gap.
- Local source checks passed: 65/65 tests (with the 15-second Windows test timeout), lint, typecheck, and diff check. Local Supabase start/status/health/reset/stop passed against actual TCP listeners on this code candidate; reset used process-scoped confirmation with 2.66 GiB free RAM.
- Exact code-head checks: app run `40578086527` passed; both Socket checks passed; Sonar failed Security `B`, required `A`. Artifact `12768651321` binds base `3139534697743494626f4940b78ac3f9d468ceb6` to code candidate `5f3dd43dac86d115339696b039a89329a5335ab2`, 103 changed paths, binary diff SHA-256 `4cbba55c840536b3d9c95c31660c411769937c4af0b198bcf195694c9510c2d1`.
- Human keyboard, actual zoom, screen-reader, and visual sign-off remains pending at the user's request. Sonar disposition is unchanged and does not clear the failed gate. The PR remains Draft; objective audit/checkpoint eligibility remains blocked. No merge, deploy, promotion, remote Supabase access, or GMZ-M01 work occurred.
