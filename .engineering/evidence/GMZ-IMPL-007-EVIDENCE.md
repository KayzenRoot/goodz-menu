# GMZ-IMPL-007 — Evidence Bundle

Status: `EXECUTOR_REPORT / CORRECTION_REQUIRED_P2`

## 2026-11-12 in-scope status-semantics correction

- Following the PR's existing Sonar annotations for `typescript:S6819` on catalog status messages, commit `e39539d82809eb283726855f2a9d7b688a0fe8d1` replaces the catalog's `role="status"` paragraphs with native `<output>` elements. Shared feedback and step-up styles retain block layout. The E2E assertion now queries the implicit `status` role and checks the note class.
- Exact runtime correction tree: `c026133c4d7fd50ba36f8e1ff440b45a8cb05b73`.
- Exact-candidate checks: `git diff --check` PASS; `pnpm lint` PASS; `pnpm typecheck` PASS; `pnpm test` PASS (14 files, 71/71 tests); `pnpm build` PASS (8 routes).
- The relevant catalog E2E flow ran against the built production server and the dedicated local Supabase project, one worker per run. Desktop: `pnpm test:e2e -- --config=.playwright-gmz-prod.config.ts --project=desktop-chromium tests/e2e/catalog.spec.ts` PASS (1/1). Mobile: same command with `--project=mobile-chromium` PASS (1/1). The temporary Playwright config only overrides `webServer.command` to `node scripts/start.mjs --hostname 127.0.0.1 --port 3100`; it was removed after the run. Each flow asserts the `status` role, keyboard focus order, responsive width, light/dark screenshots, and Axe WCAG 2.2 AA with zero violations.
- The first cold desktop attempt and two development-server mobile attempts failed before catalog login completed; the browser trace showed native `/login` reloads without an Auth token request, and one mobile attempt reported a 16 MiB native allocation failure. A warmed desktop development attempt passed; final desktop and mobile production-server runs both passed. These development-server attempts are disclosed and are not counted as passes.
- The four screenshots and `MANIFEST.json` were refreshed from these production-server runs. The manifest now pins runtime commit/tree `e39539d...` / `c026133...` and the new SHA-256 hashes. Local visual inspection found no obvious clipping; it is executor observation only.
- Fresh hosted SonarCloud/Socket checks, CodeRabbit, and independent review of the new pushed exact HEAD remain pending. This local change does not claim the Sonar findings are cleared. The previous objective audit remains `CORRECTION REQUIRED — P2`; PR description reconciliation is still outstanding. Human keyboard, real zoom, screen-reader, and visual sign-off remain pending.

## Authority and exact source

- Work Order: `GMZ-IMPL-007`, issue `#67`; only `GMZ-M06` catalog and `GMZ-M26` validation were executed.
- Execution branch: `execution/gmz-impl-007-catalog-core-bound-20a63ab`.
- Exact authorized base: `20a63ab8baa6f0776224c104656e20d05be5d6b0`.
- Bind commit: `94dd542c8ef9039661884c00882d8f86a9eafd84`; its parent is the exact base above.
- Latest implementation commit: `0521de1ced13aa32a083bf9627a7aad7ab21b139`.
- Latest implementation tree: `e107499e1e8327752c05868d5789d475a6f199f2`.
- The independent audit snapshot before this evidence correction was PR #80 HEAD `8259dd403761b4ba44f5ee780c90092c84e36c37`, tree `1566bea302ee39c5784891b535f45311b620048f`, based on `20a63ab8baa6f0776224c104656e20d05be5d6b0`. That exact-head audit returned `CORRECTION REQUIRED — P2` for the stale evidence status and the historical status note in `docs/source-pack/SCOPE.md:106`; it found no known CRITICAL/HIGH code defect. The audit did not independently execute the reported local test suites.
- The accepted Scope table at `docs/source-pack/SCOPE.md:98` defers promotions. The merged GMZ-IMPL-007 amendment in PR #77 (`985151f62be6cb26a67bc1c70fac4b7eaf831bd5`) now explicitly excludes them from this Work Order (`.engineering/work-orders/GMZ-IMPL-007.md:43,77,82,122,237`). Scope line 106 still records the pre-amendment conflict as current. Scope is a locked Context Lock source in this execution; it was not edited. A separate governed source-maintenance action and fresh lock/review are required to remove that stale status note.
- The PR description still points to the earlier `dad0e90e55850967ba8b440b5b5594dfc792c5dd` snapshot. The connected GitHub PR-description update was denied with HTTP 403 `Resource not accessible by integration`; it was not bypassed. A maintainer must update the PR description through an authorized path.
- This evidence-only correction does not change implementation code. The hosted checks and independent audit must be refreshed on its pushed PR HEAD before any new exact-head disposition.
- The bound Context Lock reports `16/16` locked-source fingerprints matching the exact base. Its Checkpoint snapshot matches the bound branch (`279d6974b9a30c7393e2de568aa37941df783ced`); the pre-bind Checkpoint at the base intentionally differs. `.gef` is unchanged between base and bind commit.
- The original implementation commit contains 29 source/test/config files (`4,845` insertions, `183` deletions). Commit `13ca0e309cd046bc8a67f05a3ded92325fa2567d` changes 12 in-scope code/test files (`224` insertions, `164` deletions): it returns durable audit-event IDs from catalog commands, validates and exposes those references in success feedback, adds matching SQL/Data API/E2E assertions, shares local Auth fixture helpers, fixes deterministic permission sorting, and raises only the MFA E2E timeout from 120s to 180s. Commit `0521de1ced13aa32a083bf9627a7aad7ab21b139` changes the command migration to centralize the identical category/product/variant/channel audit receipt logic in a private helper. Neither correction modifies Scope, Checkpoint, Context Lock, or `.gef`.
- Current product credit remains `52/515` (`10.10%`). No credit or completion is claimed.

## Implementation summary

- Added tenant-aware ProductCategory, Product, ProductVariant, SalesChannel, ChannelOffer, and versioned base-price history with exact numeric storage, constraints, indexes, tenant-aware RLS, and no ordinary-client catalog mutation.
- Added authenticated server commands using current user/membership authority, RBAC and the existing Admin Guard for privileged price/availability changes, plus durable audit/correlation with fail-closed behavior.
- Added a minimal responsive catalog-management surface and generated Supabase types.
- Catalog mutation RPCs return a JSON receipt containing the entity ID and persisted audit-event IDs; server actions validate UUIDs before reporting success, and the UI displays the audit references (or identifies a no-op as having no material change).
- Category, product, variant, and sales-channel commands now use one private helper for audit insertion, reason-code mapping, changed-field metadata, and audit-ID collection. The helper is revoked from API roles; the public command transaction still fails closed if audit insertion fails.
- Shared the sanitized local Supabase Auth fixture helpers between the Auth and catalog E2E fixtures; catalog cleanup removes synthetic memberships before their referenced roles and tenant rows.
- Added migration, pgTAP, authenticated Data API, unit, fixture-cleanup, and desktop/mobile E2E coverage.
- Updated Next.js, its ESLint plugin, Zod, Vitest and the pinned Vite peer override. The ESLint-braces guard now checks the installed plugin against the configured Next.js version.
- No promotional prices, discounts, schedules, modifiers, combos, media runtime, recipes, inventory, POS, orders, finance, provider sync, remote Supabase, or production deployment were introduced.

## Validation evidence

The implementation tree above was validated locally against the dedicated isolated Supabase workdir `D:\Projects\goodz-menu-gmz-impl-007-local-20261111` with project ID `goodz-menu-gmz-impl-007-local`. No remote Supabase project was used.

| Command or check | Result |
| --- | --- |
| `pnpm install --frozen-lockfile --strict-peer-dependencies` | PASS |
| `pnpm lint` | PASS |
| `pnpm typecheck` | PASS |
| `pnpm test` | PASS — 14 files, 71/71 tests |
| `pnpm build` | PASS — 8 routes |
| `pnpm security:braces-disposition` | PASS — production dependency guard; 211 resolved production packages, no braces, no `settings.next.rootDir`, all 22 Next recommended rules enabled |
| `pnpm test:supabase:authz` | PASS — 59 authenticated authorization checks |
| `pnpm test:supabase:catalog` | PASS — 28 authenticated catalog checks; local reset ran on completion |
| `supabase db reset --local` followed by `supabase test db --local` | PASS — all 5 migrations applied; 4 SQL test files, 229/229 assertions |
| `supabase migration list --local` | PASS — all 5 migrations applied, including `20261111090000` and `20261111090100` |
| `supabase db lint --local` | PASS — no schema errors |
| `supabase db advisors --local` | PASS — no issues reported |
| `pnpm test:e2e -- --project=desktop-chromium` | PASS — 13/13 |
| `pnpm test:e2e -- --project=mobile-chromium` | PASS — 13/13 |
| Generated types comparison | PASS — temporary local type output exactly matched `src/lib/supabase/database.types.ts` (26,528 bytes) |
| `pnpm audit --prod` and high-severity threshold check | PASS — no production/high-or-critical finding |
| `pnpm audit` | DISCLOSED — exits 1 for one MODERATE `minimatch` advisory in the ESLint development dependency tree; no HIGH/CRITICAL advisory was reported |
| `docker compose config --quiet` | PASS |
| Docker image build and production container smoke | PASS — dedicated Compose project; app bound only to `127.0.0.1:39881`, healthy, HTTP health/readiness both 200 |
| Dedicated local Auth/REST/Postgres smoke | PASS — Auth 200, REST 200, Postgres accepting connections, `SELECT 1 = 1` |
| Runtime log review | PASS — no error/fatal/exception/panic/unhandled markers; no service-role variable name or value |
| Secret-pattern scan | PASS — 250 source/engineering text files, 10 patterns, exact local credentials, 0 hits |
| `.next/static` client-bundle scan | PASS — 19 JS files; no service-role names/values or server-only audit-writer/catalog-admin-guard references |
| `git diff --check` | PASS before the implementation commit |

After the receipt/fixture correction, the executor reran `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `git diff --cached --check`; all passed, including 71/71 unit tests. After the private audit helper correction, the dedicated local workdir reset applied all five migrations, pgTAP passed 229/229, Catalog Data API passed 28/28, Auth Data API passed 59/59, DB lint/advisors passed, and desktop/mobile E2E each passed 13/13. The E2E suites completed against the implementation tree recorded in the screenshot manifest. TypeScript/application files did not change in the helper correction. The build result above was produced after the catalog receipt runtime changes and before this SQL-only helper refactor.

### Corrected attempts and observations

- An initial E2E call did not set `GOODZ_SUPABASE_WORKDIR` and selected the wrong local project. It was discarded; all final E2E runs explicitly used the dedicated local workdir.
- A subsequent E2E run exposed fixture cleanup failing because the catalog migration seeds tenant `sales_channels`. The fixture now deletes those synthetic rows before the organization; the final desktop and mobile runs above passed.
- The MFA E2E scenario exceeded its prior 120s timeout while waiting for a TOTP rollover under local Docker load. Its timeout is now 180s; assertions and test steps are unchanged. The full desktop suite then passed 13/13.
- At PR head `1869e12ec3180f6fb37e3effed659e28c7c8529a`, fresh SonarCloud analysis had removed the D Reliability condition but still reported 3.5% new-code duplication. The private helper correction in implementation commit `0521de1ced13aa32a083bf9627a7aad7ab21b139` addresses the confirmed duplicated audit block. Fresh hosted analysis later passed on PR HEAD `8259dd403761b4ba44f5ee780c90092c84e36c37`; a new analysis is required after this evidence-only correction advances the PR head.
- E2E output included React hydration warnings mentioning an inline `caret-color: transparent` attribute. Source search and a standalone blank-page probe did not identify its origin. The warnings did not fail the final tests; their origin is unproven and disclosed for review.
- Human keyboard, real-zoom, screen-reader, and visual sign-off remains pending. Browser screenshots and automated Axe/focus/responsive checks are evidence, not human approval.

## Visual artifacts

Automated screenshots are stored beside `MANIFEST.json`; the refreshed manifest pins SHA-256, viewport, theme, production capture runtime, and implementation commit/tree `e39539d82809eb283726855f2a9d7b688a0fe8d1` / `c026133c4d7fd50ba36f8e1ff440b45a8cb05b73`. Desktop and mobile light/dark captures were inspected; no obvious clipping or horizontal overflow was found. This executor observation does not satisfy the pending human sign-off.

## Hosted gates and review

- Implementation PR: #80, OPEN/DRAFT; latest implementation code commit: `0521de1ced13aa32a083bf9627a7aad7ab21b139`. The PR description remains stale as noted above.
- Sonar history on the PR: head `dad0e90e55850967ba8b440b5b5594dfc792c5dd` reported 3.7% duplication and D Reliability; head `1869e12ec3180f6fb37e3effed659e28c7c8529a` reported 3.5% duplication only. The SQL helper correction resolved the measured duplication gate on implementation code head `0521de1ced13aa32a083bf9627a7aad7ab21b139`.
- On PR HEAD `8259dd403761b4ba44f5ee780c90092c84e36c37`, all three hosted checks completed successfully: SonarCloud Code Analysis (`130932757328`, Quality Gate `PASS`, 2.3% new-code duplication, 0 security hotspots, 131 new issues, 0.0% new-code coverage); Socket PR Alerts (`130932598618`, no new dependency alerts); and Socket Project Report (`130932548829`). All reported this exact HEAD. The 131 Sonar issues are not declared false positives or all resolved.
- Independent exact-head objective audit at `8259dd403761b4ba44f5ee780c90092c84e36c37`: `CORRECTION REQUIRED — P2`. The audit found no known CRITICAL/HIGH code defect, confirmed the prior audit-event receipt finding is mitigated, and identified the evidence-head/status mismatch plus the stale Scope line 106 note. Local test output remains executor-reported evidence, not independent test execution.
- CodeRabbit CLI: authenticated and available; the required review on the pushed evidence-corrected exact PR HEAD remains pending.
- After this evidence-only correction is pushed, fresh exact-head hosted checks, CodeRabbit review, and independent objective audit are required. No code tests are repeated unless code or test inputs change.
- Human accessibility sign-off: PENDING.
- Therefore disposition remains `CORRECTION_REQUIRED_P2`; this bundle does not claim `READY_FOR_OBJECTIVE_AUDIT`.

## Risks and limitations

- The full development dependency audit has one disclosed MODERATE `minimatch` advisory. The production audit and high-severity threshold pass; the raw audit is not clean.
- Hydration warning origin remains unknown as described above.
- Production deployment, code merge, Checkpoint promotion, and issue closure are outside this executor's authority and were not performed.

## Proposed Checkpoint Delta

None now. The admitted maximum remains `GMZ-M06: 7` plus `GMZ-M26: 2` (`9/515`) only after objective acceptance, later authorized code merge, and checkpoint promotion. Current earned credit remains `52/515`.

## Stop condition

`GMZ_IMPL_007_READY_FOR_OBJECTIVE_AUDIT` is not yet reached. The exact-head auditor returned `CORRECTION REQUIRED — P2`; refresh the pushed evidence-only PR head's hosted checks, CodeRabbit review, and independent audit. The stale Scope note is a locked-source governance correction and remains outside this execution bind. The PR body also needs a maintainer update through an authorized GitHub path. Keep human accessibility sign-off pending. Stop without merge, Checkpoint promotion, issue closure, or deployment.
