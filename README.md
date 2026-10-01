# Goodz Menu

Goodz Menu is an AI-native operating platform for food businesses, combining POS, cash, catalog, recipes, inventory, purchasing, finance, delivery, omnichannel commerce, CRM, analytics, SaaS administration and decision intelligence.

## Current state

- GEF Bootstrap: `1.1.1`
- GEF init: `APPLIED / CONFIRMED`
- Product ideation: `CLOSED`
- Source Pack: `IN_CONSTRUCTION`
- Product implementation: `NOT_AUTHORIZED`
- Active planning Work Order: `GMZ-SP-001`
- Active planning Issue: `#2`

## Development model

Goodz Menu follows the GEF lifecycle:

```text
ANALYZE
→ SOURCE CHECK
→ NEXT NECESSARY INCREMENT
→ WORK ORDER
→ CONTEXT LOCK
→ PREFLIGHT
→ EXECUTOR
→ TESTS / EVIDENCE
→ PR
→ AUDIT
→ APPROVED / CORRECTION_REQUIRED / BLOCKED
→ CHECKPOINT
→ MERGE
→ NEXT
```

No application code should be introduced until the canonical Source Pack, Scope, Architecture, Security, Test Plan and Definition of Done are sufficiently frozen for the first implementation increment.

## Local-first target

The application is intended to run locally through Docker during development so the owner can continuously validate behavior, visual design and operational flows before cloud deployment.

## Canonical governance

See:
- `.engineering/SOURCE-HIERARCHY.md`
- `.engineering/PROJECT-IDENTITY.md`
- `.engineering/CHECKPOINT.md`
- `.engineering/DECISIONS-LEDGER.md`
- `.engineering/MODULE-MAP.md`
- `.engineering/work-orders/GMZ-SP-001.md`
