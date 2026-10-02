# GMZ-IMPL-003-PROMOTION — Credit Sync and Closeout

Status: `READY_FOR_REVIEW`
Issue: `#50`
Parent Work Order: `GMZ-IMPL-003`

## OBJECTIVE

Synchronize evidence-backed production credit only after the accepted GMZ-IMPL-003 implementation merge is present on `main`.

## CONTEXT

- implementation PR: `#49`
- accepted candidate: `daecb0497d70ff43f4f71d7eaa960f45e8734e1f`
- implementation merge SHA: `b74be258fa6bff47c7f2ec69db79289a601a2151`
- objective audit: `APPROVED_FOR_PROMOTION`
- assurance: `HIGH_ASSURANCE`

## SCOPE

Governance/evidence synchronization only:
- checkpoint human + machine views;
- production progress ledger;
- Source Pack backlog accepted-credit ledger;
- parent Work Order closeout;
- parent Context Lock final promotion record;
- promotion Work Order / Context Lock / Evidence;
- objective-audit evidence record.

## OUT OF SCOPE

- runtime/application code;
- tests;
- dependencies/lockfile;
- schema/migrations/seed;
- `.gef/**`;
- remote Supabase;
- deployment/production infrastructure;
- business-domain implementation;
- new authentication/RBAC behavior.

## FILES / SOURCES TO READ

- `.engineering/CHECKPOINT.md`
- `.engineering/CHECKPOINT.json`
- `.engineering/PROGRESS-LEDGER.md`
- `.engineering/work-orders/GMZ-IMPL-003.md`
- `.engineering/context-locks/GMZ-IMPL-003.json`
- `.engineering/evidence/GMZ-IMPL-003-EVIDENCE.md`
- `docs/source-pack/BACKLOG.md`
- `docs/source-pack/DEFINITION-OF-DONE.md`
- `docs/source-pack/SCOPE.md`

## REQUIREMENTS

- merge SHA must equal `b74be258fa6bff47c7f2ec69db79289a601a2151`;
- accepted candidate must equal `daecb0497d70ff43f4f71d7eaa960f45e8734e1f`;
- denominator remains `515`;
- credit allocation remains exactly:
  - GMZ-M02: `10`
  - GMZ-M26: `2`
- increment earned: `12 / 515`;
- cumulative earned: `31 / 515`;
- completion: `6.02%`;
- no double counting;
- implementation authorization becomes inactive.

## ARCHITECTURE RULES

No architecture/runtime behavior changes are admitted. Promotion only records already accepted evidence and merge state.

## CONSTRAINTS

- no force-push;
- no history rewrite;
- no runtime/test/schema/dependency mutation;
- no denominator change;
- no new module-completion claim beyond the admitted slice.

## ACCEPTANCE CRITERIA

- `main` contains implementation merge SHA;
- objective audit is `APPROVED_FOR_PROMOTION`;
- checkpoint/progress/backlog synchronize to `31 / 515 = 6.02%`;
- GMZ-IMPL-003 becomes `PROMOTED_COMPLETE`;
- implementation authorization is inactive;
- parent Context Lock records final promotion;
- CRITICAL/HIGH = `0 / 0`;
- promotion diff is governance/evidence only;
- promotion PR checks are green;
- no unresolved review threads.

## TESTS

Promotion validation is deterministic repository-state validation:
- branch base == implementation merge SHA;
- changed paths are within promotion write scope;
- denominator and arithmetic verified;
- no double count;
- no runtime/test/schema/dependency/`.gef` paths changed;
- GitHub review/check gates green.

## DELIVERABLES

- updated checkpoint;
- updated progress ledger;
- updated Source Pack backlog;
- parent Work Order closeout;
- parent Context Lock final promotion;
- promotion Work Order;
- promotion Context Lock;
- objective-audit evidence;
- promotion evidence;
- promotion PR.

## REVIEW FORMAT

Report:
- base/head SHA;
- changed paths;
- credit arithmetic;
- runtime mutation = NONE;
- CRITICAL/HIGH;
- checks/review threads;
- verdict.

## STOP CONDITION

`GMZ_IMPL_003_PROMOTION_SYNC_READY_FOR_REVIEW`
