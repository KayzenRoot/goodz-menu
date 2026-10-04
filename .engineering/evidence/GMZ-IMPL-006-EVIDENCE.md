# GMZ-IMPL-006 — Evidence Bundle

Status: `CD-001 local HIGH_ASSURANCE PASS; final hosted gate state is recorded on PR #64`

## Candidate and preflight identity

- Repository: `KayzenRoot/goodz-menu` (`https://github.com/KayzenRoot/goodz-menu.git`).
- Authorized branch: `execution/gmz-impl-006-durable-audit`; PR `#64`, base `main`, keep open/draft and unmerged.
- Execution base: `2490ed590a6fb21f53d79b7ab7c93fee854c01ee`.
- CD-001 implementation commit tested: `a62aa978ef0c7b3302c3fe86179a6411a1882e6f`; implementation tree: `dc6c49b6c7d129416bfe243790af8414ddafdaa2`.
- Context Lock: `BOUND_FOR_EXECUTION`; stable source fingerprints `16 / 16 MATCH`; governance snapshot `MATCH`; execution base is ancestral; preflight repository/branch are correct; tree was clean before correction.
- `.gef`: version `1.1.1`, `APPLIED / CONFIRMED`, unchanged from the execution base and not modified by CD-001.
- `CHECKPOINT.json` remains unchanged: `BOUND_FOR_EXECUTION`, current earned credit `44 / 515 = 8.54%`. No credit promotion.
- The published PR head after documentation closeout is the exact-head/check-run source of record in the PR description. The implementation source tested is the SHA above; the closeout commit only updates governance/evidence text.

## CD-001 change and reachability evidence

Only `package.json` and `scripts/verify-eslint-braces-not-affected.mjs` are implementation changes. The script adds the local command `pnpm run security:braces-disposition`; no dependency version, `pnpm-lock.yaml`, runtime, schema, migration, business-scope, or `.gef` change was made.

Raw package-manager truth:

- `pnpm why braces` reports `braces@3.0.3 <- micromatch@4.0.8 <- fast-glob@3.3.1 <- @next/eslint-plugin-next@16.3.8` in the development toolchain.
- `pnpm audit --prod --audit-level=high`: PASS, no known production vulnerabilities.
- `pnpm audit --audit-level=high`: remains raw exit `1`, exactly one HIGH, `GHSA-vfj7-8cjw-p6xm / CVE-2026-93687`, vulnerable `braces <=3.0.3`, patched versions `None`, path `.@next/eslint-plugin-next>fast-glob>micromatch>braces`.
- Upstream references: [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) and pinned [Next.js v16.3.8 root-dir helper](https://github.com/vercel/next.js/blob/v16.3.8/packages/eslint-plugin-next/src/utils/get-root-dirs.ts). The plugin invokes the glob helper only for string/array `settings.next.rootDir`; without that setting it uses `context.cwd`.

Mechanical proof:

- Guard self-test: PASS, `5 / 5` deterministic cases, covering normal config, string/array `rootDir`, production graph containing `braces`, and malformed/unexpected package-manager output.
- Candidate guard: PASS; scanned `211` resolved production package entries and found no `braces`; active `eslint.config.mjs` has no `settings.next.rootDir`; pinned Next plugin version is verified; all `22` pinned Next recommended rules remain enabled.
- The guard fails closed on unexpected package graph/config shapes and when either reachability condition changes. It does not suppress or rewrite audit output.
- Disposition for this one advisory, only after the proof above: `RESOLVED_NOT_AFFECTED`.
- Residual risk: the vulnerable dev-only package remains installed and the raw full audit remains nonzero because upstream lists no patched version. A future active `settings.next.rootDir` or production dependency path makes the guard fail and requires a fresh security disposition; this is not a blanket waiver.

## HIGH_ASSURANCE L5 on the CD-001 implementation candidate

| Gate | Result |
|---|---|
| GEF 1.1.1 preflight | PASS — correct repository/branch/base, base ancestry, Context Lock bound, `16 / 16 MATCH`, governance snapshot MATCH, clean pre-edit tree, `.gef` unchanged |
| Frozen install / peers | PASS — `corepack pnpm install --frozen-lockfile --strict-peer-dependencies`; no lockfile diff |
| Guard | PASS — deterministic self-tests `5 / 5`; actual reachability/config/rule assertions all pass |
| `pnpm why braces` | PASS — exact development-only chain recorded above |
| Lint / typecheck | PASS — `pnpm lint`, `pnpm typecheck` |
| Unit | PASS — `50 / 50`, 11 test files |
| Production build | PASS — Next.js `16.3.8` |
| E2E desktop/mobile | PASS — `24 / 24`; local Auth/session, MFA/Admin Guard, durable audit, revocation and metadata-spoof regressions |
| Axe/accessibility | PASS — all Axe assertions in desktop/mobile E2E passed with zero reported violations |
| Supabase local reset | PASS — applied migrations `20261002093358`, `20261002152627`, `20261004125938` |
| pgTAP | PASS — `166 / 166`, 3 SQL files |
| Auth/Data API | PASS — `59 / 59` checks using synthetic local users, after final local reset |
| Migration status | PASS — all three expected local migrations listed/applied |
| Generated DB types | PASS — regenerated; generated `database.types.ts` matches tracked output (`git diff` empty) |
| Database lint | PASS — `public,private`, no schema errors |
| Security advisors | PASS — no issues |
| Production dependency audit | PASS — no known vulnerabilities at HIGH or above |
| Full dependency audit | RAW FAIL preserved — one HIGH as described above; this advisory's evidence-backed disposition is `RESOLVED_NOT_AFFECTED`, not a raw-audit pass |
| Secret-pattern scan | PASS — 219 tracked text files; four targeted credential patterns and service-role JWT payload scan had zero matches |
| Client bundle / server-only containment | PASS — 20 files in `.next/static`; zero `SUPABASE_SERVICE_ROLE_KEY` name matches and zero local service-role-value matches |
| Docker config/build/up | PASS — Compose config valid; image built from candidate; web container `healthy` |
| Health/readiness | PASS — `http://127.0.0.1:3001/api/health` and `/api/ready`, both HTTP `200` |
| Supabase/Auth/Postgres | PASS — local Auth health HTTP `200`, REST HTTP `200`, Postgres `pg_isready` and `SELECT 1` passed |
| Runtime logs | PASS — 50 recent lines scanned; zero error/fatal/exception/panic lines and zero credential-pattern matches |
| `.gef` integrity | PASS — zero `.gef` paths changed relative to execution base |
| CodeRabbit local | Correction code review had `0 findings`. The final fresh review of the 3 closeout documents returned 1 MINOR suggestion to queue PR `#64` behind PR `#49`; rejected as stale because the canonical promotion evidence records PR `#49` merged and `APPROVED_FOR_PROMOTION`, while the current checkpoint and Context Lock bind GMZ-IMPL-006 to its exact execution base. No current CRITICAL/HIGH runtime or security finding was reported. |
| SonarCloud / Socket / hosted CodeRabbit | Final published-head statuses and run links are recorded in PR #64; no prior-head result is reused as the final-head result |

## Historical pre-CD-001 disposition

The earlier implementation candidate `1055bcf93a37858027165e4e177b9701ec4bdd0d` / tree `520c9eeaa63d3ec4a38a9145f2c8c87a38a9f0b9` was correctly marked `BLOCKED` because the raw full audit HIGH lacked a reachability disposition. CD-001 supersedes that readiness decision only after the committed guard and L5 proof above. Historical test-order observations and that pre-correction status do not describe the current candidate.

## Security disposition and checkpoint proposal

- CRITICAL unresolved: `0`.
- HIGH unresolved: `0` after the specific advisory disposition; raw scanner HIGH remains visible and is not hidden.
- `GHSA-vfj7-8cjw-p6xm`: `RESOLVED_NOT_AFFECTED` based on the production dependency tree and active lint configuration only.
- No audit viewer, Error Center, self-healing, Platform/Super Admin, POS, catalog, stock, orders, finance, other business mutation, remote Supabase, or production deployment was added. No merge, main update, force-push, or `.gef` edit occurred.
- Proposed Checkpoint Delta is appended to `.engineering/CHECKPOINT.md` and is `NOT APPLIED`: leave `CHECKPOINT.json` at `BOUND_FOR_EXECUTION` until separate objective review; retain credit `44 / 515 = 8.54%`; do not promote credit in CD-001.
- PR #64 stays open/draft. The objective auditor should verify the exact published head and hosted checks from the PR description before changing checkpoint state.

STOP CONDITION:
`GMZ_IMPL_006_CD_001_READY_FOR_OBJECTIVE_AUDIT`
