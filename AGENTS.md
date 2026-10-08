# Goodz Menu — Agent Rules

## Governance
This repository follows GEF Bootstrap 1.1.1.

Before acting:
1. read `.engineering/CHECKPOINT.md`;
2. read `.engineering/SOURCE-HIERARCHY.md`;
3. read the active Work Order;
4. read its Context Lock;
5. honor WRITE_ALLOWED / WRITE_FORBIDDEN exactly.

## Planning
ChatGPT may author and refine approved planning/governance documentation and coordinate GitHub lifecycle work.

## Implementation
Heavy implementation, tests, migrations and build/CI code must follow the active GEF executor contract and an admitted implementation Work Order. No free-form coding against chat memory.

## Review
Every implementation increment requires:
- exact-head tests/evidence;
- PR;
- semantic/technical audit;
- no unresolved CRITICAL/HIGH defect;
- correction in the same Work Order when defects are within scope;
- checkpoint promotion only after approval.

## Safety
- no force push/history rewrite unless explicitly authorized;
- no secrets in repository/chat/evidence;
- no cross-tenant data shortcuts;
- no weakening RLS/security/test gates to make checks green;
- money-moving/autonomous investment actions require explicit governed authority.

## UI/UX
A feature is not done merely because it works. Applicable UI must be responsive, accessible, consistent in light/dark themes, visually reviewed and aligned with the Goodz design system.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Agent skills

### Matt Pocock skill invocation

When the `mattpocock-skills` plugin is available, automatically use a model-invoked skill whose description matches the current task; these skills do not require the user to type a slash command. Use `/ask-matt` when skill routing is unclear. User-invoked workflows remain user-led. Do not force-fit a skill or let it override the user's request, this repository's governance/security rules, or deterministic evidence.

Prefer deterministic Git, text search, AST, hashes, tests, lint, typecheck, and build checks whenever they are sufficient. Use Jev only when available and useful for bounded context relevance, triage, classification, reranking, claim verification, comparison, or explicit-gate decisions. Jev output is advisory; never send it secrets or credentials.

### Issue tracker

Issues and specs for this repository live in GitHub Issues. Use the `gh` CLI and follow `docs/agents/issue-tracker.md`.

### Triage labels

Use `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, and `wontfix` for the five canonical triage roles. Follow `docs/agents/triage-labels.md`.

### Domain docs

This repository uses a single-context domain layout. Read relevant glossary and ADR material before domain changes; follow the actual paths recorded in `docs/agents/domain.md`.
