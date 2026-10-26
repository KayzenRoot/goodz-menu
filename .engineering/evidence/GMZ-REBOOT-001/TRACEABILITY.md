# Canonical requirement traceability — GMZ-REBOOT-001

This matrix binds the rebuilt foundation to the IDs listed in the historical `GMZ-IMPL-001` contract and checks them against the current approved requirements. It records only this foundation candidate; it does not claim completion of the later owner, staff, storefront, POS, or tenant journeys.

- Current requirement source: `docs/source-pack/REQUIREMENTS.md`
- Source status: `APPROVED_V0.1`
- Source SHA-1 at this review: `2e179c00446980a481e56dd02fe71865a7237f59`
- Test target: `docs/source-pack/TEST-BENCHMARK-PLAN.md` — WCAG 2.2 AA, automated tests plus required manual review.
- Review snapshot: local code commit `c26fac282010e71f029168a4dff960f4adae4064` before publication; app-foundation CI will emit the exact PR head, base SHA, complete changed-path list, and binary diff SHA-256 in a JSON run artifact. At this pre-push snapshot, remote PR #74 still points to `b42fbc516800ac3c78d232af622d4e4400a61ae0`; its compare will represent the local candidate after publication. Local command output excerpts are recorded in `LOCAL-VALIDATION.md`.

## Historical module mapping

The old `GMZ-IMPL-001` allocated historical credits to these modules. The mapping below records the rebuilt foundation's scope only; the historical credits are not transferred to this candidate.

| Module ID | Foundation mapping | Candidate status |
| --- | --- | --- |
| `GMZ-M25` Runtime, Docker & Deployment | `GMZ-REQ-RUN-001` and `GMZ-REQ-RUN-002`; local runtime wrappers and environment boundaries. | **PARTIAL** — local Docker/Supabase lifecycle has not run. |
| `GMZ-M04` Design System shell | `GMZ-REQ-UX-001` through `GMZ-REQ-UX-008`, limited to applicable foundation shell requirements. | **PARTIAL** — foundation UI exists; product component library and user journeys remain future work. |
| `GMZ-M26` Validation & Quality Engineering | `GMZ-REQ-QA-003` through `GMZ-REQ-QA-006`, scoped to foundation checks. | **PARTIAL** — automated checks exist; final PR CI and required manual reviews remain outstanding. |
| `GMZ-M23` Observability/correlation bootstrap | `GMZ-REQ-OBS-001` on health/readiness routes and runtime logs. | **PASS for foundation endpoints** — critical business operations are not part of this candidate. |

| Requirement ID | Foundation mapping and evidence | Candidate status |
| --- | --- | --- |
| `GMZ-REQ-RUN-001` | `Dockerfile`, `compose.yaml`, `supabase/config.toml`, `scripts/compose-local.mjs`, `scripts/supabase-local.mjs`, and `scripts/local-supabase-status.mjs`. The guard accepts only the Docker Desktop local named pipes and tests reject TCP, Unix, SSH, and unknown endpoints. The web container shares the loopback-restricted Supabase bridge and uses the internal `http://kong:8000` gateway; after explicit confirmation, reset creates or validates the same loopback-only network before CLI invocation. Local engine preflight was attempted; Docker Desktop's pipe was unavailable, so no stack lifecycle ran. | **BLOCKED** — implementation exists; local Docker/Supabase acceptance is unverified. |
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
| `GMZ-REQ-QA-005` | Axe Playwright checks use WCAG 2.2 AA tags; dynamic runtime state is exposed as a polite atomic status announcement. | **PARTIAL** — automated coverage is present; manual keyboard, zoom/reflow, and screen-reader review remains outstanding. |
| `GMZ-REQ-QA-006` | `docs/source-pack/TEST-BENCHMARK-PLAN.md` contains approved POS/storefront budgets; no POS or storefront exists in this foundation. | **NOT APPLICABLE TO THIS SHELL** — no product performance result is claimed; measure the defined surfaces before their acceptance. |
| `GMZ-REQ-SEC-005` | `pnpm security:secrets` scans the 37 scoped source/config files; runtime tests reject a synthetic service-role-shaped key without printing it. | **PASS for scanned candidate scope** — the scanner does not inspect the full preserved Git history, docs, or screenshots; no screenshot CI artifact is uploaded. |
| `GMZ-REQ-GOV-001` | Admitted Work Order `.engineering/work-orders/GMZ-REBOOT-001.md`, pinned base and revalidated source fingerprints in `RESULTS.md`; implementation remains on its dedicated reboot branch. | **PASS for this admitted Work Order** — the reboot uses its own pinned snapshot, not the completed legacy `GMZ-IMPL-001` Context Lock. |
| `GMZ-REQ-GOV-002` | Candidate code SHA and exact base-to-head evidence in `RESULTS.md`; earlier standards/spec/security reviews bind to older commits. | **PARTIAL** — request fresh independent review and CI on the published PR head. |
| `GMZ-REQ-GOV-003` | Dependency audit and scoped secret scan results are recorded in `RESULTS.md`; Docker/Supabase and app CI gaps remain explicit. | **PARTIAL** — no HIGH/CRITICAL dependency findings were reported by the recorded audit; unrun runtime gates remain unresolved. |
| `GMZ-REQ-GOV-004` | `.engineering/CHECKPOINT.json` remains unchanged; the conditional delta is proposed in `CHECKPOINT-DELTA-PROPOSED.md`. | **PASS for current stage** — no checkpoint promotion is claimed or performed. |

## Remaining acceptance gates

1. Run the new app foundation workflow on the published PR head and retain its check result.
2. Capture Docker and Supabase local lifecycle evidence when a local engine is available.
3. Record human visual and manual accessibility review for the shell.
4. Re-run independent review against the final PR head; keep the objective-audit status blocked until all required gates pass.
