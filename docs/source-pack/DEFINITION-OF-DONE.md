# Goodz Menu — Definition of Done

Status: `FROZEN_CANDIDATE_V0.1 / REVIEW_PENDING`  
Authority domain: `COMPLETION`

## 1. Core rule

“Works on my machine”, “UI exists”, “tests pass somewhere”, or “PR merged” is not sufficient.

A Goodz increment is DONE only when all applicable completion obligations below are satisfied and bound to exact evidence.

## 2. Universal DoD

Every implementation increment must have:

### Governance
- admitted Work Order;
- current Context Lock;
- requirement IDs;
- canonical module owner;
- exact allowed/forbidden scope;
- explicit STOP CONDITION.

### Source
- implementation based on admitted SHA/state;
- no unapproved source conflict;
- no hidden chat-only requirement used as canonical authority.

### Code quality
- bounded design consistent with Architecture;
- no provider-specific leakage into core where adapters are required;
- no unnecessary duplication;
- typed/validated boundaries where applicable;
- errors are intentional and observable;
- secrets absent.

### Tests
- all risk-class required tests pass;
- new business rule has deterministic test where applicable;
- negative/security cases included for privileged/tenant/money paths;
- no unresolved critical flaky test.

### Security
- tenant/resource authorization proven;
- least privilege preserved;
- no RLS/service-role shortcut;
- privileged actions audited;
- no new CRITICAL/HIGH security finding;
- secret/log-redaction obligations pass.

### Evidence
- exact final head SHA;
- tests/run IDs;
- changed files;
- requirement mapping;
- severity inventory;
- known limitations;
- exact-head owner audit.

### Review
- semantic/technical review completed;
- CRITICAL = 0;
- HIGH = 0;
- correction required if either is nonzero;
- final reviewed head equals merge candidate head.

### Promotion
- merge SHA recorded;
- checkpoint updated;
- backlog/progress credit updated only after accepted evidence.

## 3. UI/UX DoD

Any user-facing feature additionally requires:
- light theme;
- dark theme;
- responsive target states;
- loading state;
- empty state when applicable;
- success state;
- warning/error state;
- keyboard/focus behavior;
- reduced-motion behavior where motion exists;
- consistent Goodz tokens/components;
- polished toast/feedback where applicable;
- visual review pack;
- no major clipping/overflow;
- applicable accessibility checks.

A feature that is functionally correct but visually unfinished is not DONE.

## 4. POS DoD

POS/cash changes additionally require:
- keyboard/touch critical path;
- offline behavior classification;
- payment/cash invariants;
- idempotency;
- receipt/audit behavior where applicable;
- performance budget evidence;
- restart/reconnect behavior;
- no duplicate financial/inventory posting.

## 5. Finance DoD

Finance changes additionally require:
- deterministic decimal/money handling;
- ledger/reversal semantics;
- reconciliation proof;
- transaction atomicity as applicable;
- no silent balance mutation;
- role/approval controls;
- audit trail;
- concurrency/idempotency tests;
- reports reconcile to source transactions.

## 6. Inventory/recipe DoD

Additionally:
- ledger reconstruction;
- unit conversion tests;
- product/ingredient/inventory-item identity preserved;
- recipe/direct-stock consumption rule tested;
- correction/reversal traceability;
- tenant/location isolation;
- concurrency/idempotency.

## 7. Integration DoD

Provider adapter/change requires:
- documented provider capability;
- authentication/signature handling;
- canonical mapping;
- idempotency;
- duplicate/replay tests;
- timeout/rate-limit/retry behavior;
- dead-letter/manual recovery;
- provider error redaction;
- sandbox/mock evidence;
- live credentials absent from repository.

## 8. AI DoD

AI feature additionally requires:
- Truth Layer boundary;
- tenant scope;
- tool/data allowlist;
- prompt-injection tests;
- external-source provenance when current facts matter;
- uncertainty/insufficient-data behavior;
- model/provider recorded;
- cost/usage instrumentation;
- fallback behavior;
- Proof Engine fields for material recommendations;
- Policy Brain/action-gateway enforcement;
- human approval for applicable risk;
- evaluation suite and acceptance metrics.

Model output that merely “looks good” is not sufficient evidence.

## 9. Investment intelligence DoD

Additionally:
- reserve/liquidity gate;
- fresh market-data source/time;
- risk disclosure;
- scenario uncertainty;
- concentration/liquidity/fee considerations;
- no execution tool unless separate execution scope approved;
- read-only/recommendation mode proof.

## 10. Super Admin DoD

Additionally:
- separate platform authority plane;
- strong auth for high-risk action;
- reason/confirmation;
- target tenant/user visibility;
- support-mode controls;
- audit;
- no password/secret exposure;
- least privilege;
- destructive-action recovery/preview when applicable.

## 11. Settings/notifications DoD

Settings:
- correct scope resolution;
- locked policy behavior;
- default/inheritance/override tests;
- audit for sensitive settings.

Notifications:
- correct recipient/scope;
- no cross-tenant leakage;
- read/archive/snooze state;
- channel preferences;
- safe sensitive-content handling.

## 12. Performance DoD

Performance-sensitive changes must:
- state benchmark population;
- compare accepted baseline;
- meet budget or have governed acceptance;
- separate external-provider latency;
- avoid weakening security/correctness.

## 13. Accessibility DoD

Applicable UI targets WCAG 2.2 AA.

Critical flows require:
- automated checks;
- keyboard test;
- focus test;
- accessible names;
- contrast review;
- zoom/reflow;
- screen-reader/manual smoke as defined by Test Plan.

## 14. Docker/local DoD

Runtime-affecting changes require:
- clean local setup/restart;
- health/readiness;
- local Supabase target only;
- seed/reset path;
- no production fallback;
- Windows-compatible validation for supported owner workflow;
- documented command impact.

## 15. Database/schema DoD

When schema implementation begins:
- migration created through approved workflow;
- reviewed SQL/diff;
- local reset succeeds;
- RLS policies included/proven;
- indexes for authorization/hot paths considered;
- security advisors run;
- generated types refreshed if used;
- backward/forward compatibility considered;
- destructive change has recovery plan.

## 16. Observability DoD

Material path includes:
- correlation ID;
- structured safe errors;
- useful event/log metadata;
- secret/PII redaction;
- health/metric updates where applicable.

## 17. Documentation DoD

Update applicable:
- Source Pack if canonical behavior changed;
- operator/user docs;
- API/contract docs;
- runbook;
- ADR/decision;
- checkpoint.

Documentation cannot knowingly contradict shipped behavior.

## 18. Merge gate

Do not merge when:
- required check pending/failing/stale;
- final head differs from reviewed head;
- CRITICAL/HIGH unresolved;
- required evidence missing;
- source conflict unresolved;
- security/tenant boundary unproven;
- Work Order scope exceeded without governed delta.

## 19. Completion accounting

After merge:
- record merge SHA;
- update checkpoint;
- allocate only predeclared backlog credit;
- record remaining work;
- close issue only when its stop condition truly holds.

## 20. Production release Done

The complete Goodz product cannot claim production completion until:
- denominator-complete evidence reaches all release-required weighted points;
- Security/Test/Deployment/DoD all pass;
- migration/recovery/backups are proven;
- required operational docs/runbooks exist;
- no release-blocking CRITICAL/HIGH defect;
- final acceptance audit is complete.

STOP CONDITION: `GMZ_DEFINITION_OF_DONE_V0_1_READY_FOR_REVIEW`
