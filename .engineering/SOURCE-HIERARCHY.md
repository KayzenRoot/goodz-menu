# Goodz Menu — Source Hierarchy

Status: `ACTIVE_FOR_PLANNING`

## Core rule
Authority is domain-specific. Newer text never automatically overrides a frozen source from another authority domain.

## Authority domains
- `REPOSITORY_STATE` — exact files, commits, diffs, checks and executable repository facts.
- `PROJECT_STATE` — promoted checkpoint/current state.
- `DECISION` — Decisions Ledger and ADRs.
- `SCOPE` — admitted product boundaries/classification.
- `REQUIREMENT` — approved product obligations.
- `ARCHITECTURE` — approved components, contracts and dependency structure.
- `SECURITY` — threat model, authorization, privacy and assurance rules.
- `COMPLETION` — Definition of Done and completion/invalidation semantics.
- `EXECUTION` — active Work Order, Context Lock and execution contract.
- `VALIDATION` — tests, benchmark, evidence and assurance.
- `PLANNING` — planning workspace not yet promoted into stronger domains.
- `FUTURE_WORK` — backlog not admitted for execution.
- `INNOVATION` — Goodz proprietary technology concepts and maturity.
- `CONVERSATION` — chat discussion; never sole durable authority.

## Initial source routing
- `.gef/**` controls GEF initialization evidence.
- `.engineering/CHECKPOINT.md` + `.engineering/CHECKPOINT.json` control promoted project state.
- `.engineering/DECISIONS-LEDGER.md` + future ADRs control decisions.
- `.engineering/SCOPE.md` controls scope once frozen.
- Source Pack documents under `docs/source-pack/` will control their named domains after promotion/freeze.
- Active Work Orders and Context Locks control bounded execution/planning increments.

## Seed source
The ideation seed is **Goodz Menu Master Ideas & Vision v0.3 — IDEATION CLOSED + CSD-001**.

Until its complete semantic promotion is audited, it remains a `PLANNING` input, not a substitute for frozen Scope, Requirements, Architecture, Security or DoD.

## Conflict behavior
On ambiguity or conflict:
1. identify the authority domains;
2. inspect explicit supersession/ADR records;
3. mark stale/invalid sources rather than silently ignoring history;
4. stop the affected progression with `SOURCE_CONFLICT` if authority cannot be resolved;
5. never coerce UNKNOWN into APPROVED/DONE.

## Conversation rule
Chat may initiate work, but material state becomes durable only after promotion into repository sources.

STOP CONDITION: `GOODZ_SOURCE_HIERARCHY_ACTIVE`.
