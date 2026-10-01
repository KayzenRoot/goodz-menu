# GMZ-SP-004 — Evidence Bundle

Status: `APPROVED_FOR_PLANNING_PROMOTION`

## Binding
- Repository: `KayzenRoot/goodz-menu`
- Issue: `#10`
- Base: `main@d63bfb0e13822710b8954f3ccc5c323954bfed3a`
- Work Order: `GMZ-SP-004`
- Context Lock: `.engineering/context-locks/GMZ-SP-004.json`

## Outputs
- `docs/source-pack/DATA-MODEL.md`
- `.engineering/DATA-OWNERSHIP-MATRIX.md`
- synchronized checkpoint

## Coverage validation
Issue #10 required data families checked: `52 / 52` represented.

Coverage includes:
- tenant hierarchy / memberships / roles;
- settings / plans / entitlements;
- customers / addresses / consent;
- suppliers / units / conversions;
- products / variants / channel offers / modifiers / combos;
- ingredients / recipes / preparations;
- inventory locations / lots / movement ledger / counts;
- purchases / purchase items / receipts;
- orders / items / modifiers / external mappings;
- payments / refunds / receivables / settlements;
- cash sessions / movements;
- accounts payable / customer credit;
- cost centers / allocation;
- delivery zones / deliveries / drivers;
- integration inbox/outbox/attempt/dead-letter;
- notifications / preferences;
- audit / errors / incidents;
- goals / reports / experiments / scenarios;
- AI insights / recommendations / evidence / proposed actions / approvals / executions / outcomes / model invocations;
- investment research / risk scenarios;
- SaaS subscription / billing / usage / feature flags / support sessions;
- media references.

## Data-model invariants
- stable opaque canonical IDs;
- provider IDs are mappings, never canonical primary identity;
- tenant scope explicit;
- authentication identity separated from tenant membership;
- financial/inventory truth append/audit-oriented;
- balance summaries are projections, not sole truth;
- economic snapshots preserve historical explanation;
- correction uses reversal/supersession rather than destructive rewriting;
- AI-derived data remains separate from domain truth;
- platform administration remains separate from tenant administration.

## Physical implementation boundary
No:
- SQL;
- migrations;
- RLS policy implementation;
- indexes;
- triggers/functions;
- runtime code;
- dependencies;
- CI/build/deployment implementation.

## Audit
- required issue data families: `52 / 52`
- missing: `0`
- ownership matrix data-family rows: `42`
- CRITICAL: `0`
- HIGH: `0`
- audit independence: `NOT_INDEPENDENT / owner-operated`

## Progress truth
Overall product completion remains `NOT_YET_BASELINED`.

STOP CONDITION: `GMZ_SP_004_DATA_MODEL_READY_FOR_REVIEW`
