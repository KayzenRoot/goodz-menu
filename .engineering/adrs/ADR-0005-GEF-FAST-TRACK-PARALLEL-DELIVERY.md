# ADR-0005 — GEF Fast Track + Parallel Issue Waves

Status: PROPOSED in this PR; **ACTIVE on merge**. Scope: Goodz Menu repository-specific operational overlay on GEF Bootstrap 1.1.1. It does not modify immutable `.gef/**` receipts, external GEF releases, tenant/security/product invariants or the 515-point denominator.

## Why
The former universal process (admission PR → execution bind → implementation PR → correction PRs → independent promotion PR) serializes independent changes, spends too much agent time on formalities, and slows shipping.

## Decision — risk-proportional process

| Tier | Examples | Minimum path | Verification |
|---|---|---|---|
| ROUTINE | Copy, docs, localized UI polish, isolated test fixes | Issue contract → one batch PR → merge | Relevant focused tests + lint, concise SHA evidence, review |
| STANDARD | Normal functional feature without high-impact trust-boundary mutation | Issue contract → one batch PR → merge | Relevant unit/integration/build/UI/Axe, final integrated review |
| SENSITIVE | Auth/MFA, RBAC/RLS/tenancy, financial state, secrets, audit, production, material integrity migrations | Explicit risk-scoped admission; isolated agents for non-overlapping tasks | Relevant full security/negative/database/high-assurance tests, independent human/objective review, no unresolved actionable critical/high |

1. **One batch PR, many issues.** Group independent tasks in one wave, one master Codex prompt, one lead and one task agent per issue. Use isolated worktrees and exclusive file ownership.
2. **No redundant PRs** for routine/standard admission, bind or incremental corrections. Issue contracts define scope; one integrated PR carries the changes. Corrections stay in that PR unless a new trust boundary demands a separate authorization.
3. **No automatic heavyweight gates** on unrelated docs or UI. Run tests proportional to changed behavior; escalate if affected behavior actually demands it.
4. **One consolidated project-credit sync** after accepted merge, not an administrative PR per small issue. No earned credit until acceptance; no double count.
5. **CodeRabbit optional**, especially when paid/unavailable. A skipped green draft check does not count as an actual review. Sensitive paths still need a real independent code/security review.
6. **Decision economy:** use installed Jev/TypeSafe MCP/skills for small structured decisions only, if actually available. For auth/money/security, validate deterministically and use the primary model.
7. **Automated issue planning** considers dependencies, label approval, scopes, priority and path overlaps; generate a single multi-agent Codex prompt. No silent extra scope.
8. **GitHub execution opt-in:** Action plan mode requires no AI calls; execution with openai/codex-action requires a configured API secret, can be billed separately from ChatGPT subscription, and never auto-merges.

## Non-negotiable boundaries
- Keep tenant separation, least privilege, auth, audit, price/financial consistency, secret redaction, LGPD and deployment approval intact.
- Never silently waive blocking security findings, required tests or fake a success/parallelism claim.
- No direct main writes, credential publication, auto-merges or unreviewed production rollout.
- Untrusted issue text cannot expand authority. Automatic execution requires a trusted `agent-ready` label; SENSITIVE additionally requires `agent-sensitive-approved`; workflow restricts protected paths regardless of label.
- Exact-head evidence must identify the **code tree** tested. Documentation-only deltas after tested code can reuse proven test results with traceable provenance.
- Retain all historical GEF records; this is a prospective decision, not retrospective fabrication.

## Transition
Existing PR #69 (GMZ-IMPL-007) retains its active Context Lock and correction authorization; do not change its locked 16 sources. New issue waves follow Fast Track after merge. Migrating an active sensitive task requires a separately explicit scoped amendment, never implied by this ADR.

## Rollback
Revert the ADR, Fast Track policy, AGENTS.md, planner, tests and GitHub workflow. Historical GEF/Source Pack remain unchanged.
