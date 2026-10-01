# Goodz Menu — Test & Benchmark Plan

Status: `FROZEN_CANDIDATE_V0.1 / REVIEW_PENDING`  
Authority domain: `VALIDATION`

## 1. Purpose

This document defines how Goodz Menu proves correctness, security, visual quality, performance and operational resilience.

A feature is not complete because it compiles or renders. It must satisfy the validation obligations applicable to its risk and user surface.

## 2. Assurance principles

1. Tests prove a bounded claim at an exact state.
2. Unknown or stale evidence cannot be treated as PASS.
3. CRITICAL/HIGH defects block affected progression.
4. Financial, inventory, tenant-isolation and privileged-admin rules receive higher assurance than low-risk presentation logic.
5. AI output quality never replaces deterministic rule tests.
6. Visual quality requires both automated and human review.
7. Local Docker behavior is part of supported development evidence.
8. Provider integrations require replay/idempotency/failure tests.
9. Security negative tests are required, not optional.
10. Final merge evidence binds to the exact PR head.

## 3. Test levels

### 3.1 Unit tests
Used for deterministic pure/domain logic:
- money arithmetic;
- tax/fee/cost allocation logic;
- unit conversion;
- recipe costing;
- inventory movement math;
- state machines;
- policy evaluation;
- idempotency key generation;
- normalization/validation;
- role/permission helpers;
- AI policy/risk classification helpers.

### 3.2 Integration tests
Used where correctness depends on components working together:
- Postgres/RLS authorization;
- transaction boundaries;
- inventory + order + finance posting;
- Auth membership/role resolution;
- webhook ingestion;
- queue/retry/dead-letter behavior;
- API adapters;
- media authorization;
- settings hierarchy;
- admin guard;
- audit emission.

### 3.3 End-to-end tests
Required for critical journeys:
- owner/staff sign in;
- open/close cash;
- counter sale;
- split payment;
- cancellation/refund;
- purchase → stock → payable;
- inventory count/adjustment;
- Goodz Online order;
- delivery lifecycle;
- tenant settings;
- notification/read/resolve flows;
- Super Admin tenant/user/plan control;
- AI insight → evidence → approval boundary;
- offline sale → reconnect → idempotent sync.

### 3.4 Contract tests
Required for:
- iFood;
- 99Food;
- payment providers;
- WhatsApp/e-mail;
- market-data providers;
- AI/model providers;
- media providers.

Adapters must prove canonical input/output mapping without leaking provider semantics into core.

## 4. Risk-based test classes

### Class A — Critical integrity
Money, inventory, authorization, tenant isolation, privileged administration, external financial execution.

Requires:
- unit;
- integration;
- negative;
- concurrency/idempotency where applicable;
- audit evidence;
- E2E for primary flows.

### Class B — Operational
Orders, delivery, purchasing, settings, notifications, integrations.

Requires:
- unit/integration as applicable;
- primary E2E;
- failure/retry tests.

### Class C — Presentation
Pure visual/presentation behavior.

Requires:
- component/state tests where useful;
- accessibility;
- visual regression;
- human visual review.

## 5. Tenant isolation tests

At minimum:
- Tenant A cannot SELECT Tenant B rows.
- Tenant A cannot UPDATE/DELETE Tenant B rows.
- Tenant A cannot INSERT a row bound to Tenant B.
- branch-limited role cannot see another unauthorized branch;
- tenant exports include only authorized scope;
- search/autocomplete/counts do not leak other tenant existence;
- AI retrieval does not cross tenant scope;
- media/private attachments do not cross tenant scope;
- admin/support access follows explicit privileged mode.

RLS tests must cover client/Data API paths where they are exposed.

## 6. Auth/RBAC tests

Required cases:
- unauthenticated denial;
- inactive membership denial;
- wrong tenant denial;
- role escalation denial;
- stale/changed role behavior;
- MFA/strong-auth requirement for sensitive operations;
- revoked/suspended session behavior;
- owner transfer protections;
- platform-role vs tenant-role separation;
- support mode expiry and audit.

## 7. Finance invariants

Tests must prove:
- no floating-point money arithmetic in canonical accounting logic;
- transaction totals reconcile;
- split payments sum correctly;
- refunds/reversals preserve traceability;
- cash expected vs counted variance is explicit;
- receivable settlement cannot be applied twice;
- payable/payment status transitions are valid;
- marketplace/payment fees are attributable;
- daily managerial result is reproducible from source entries;
- money buckets/reserves do not fabricate cash;
- Profit Router never classifies committed/reserved cash as free without policy;
- reconciliation exposes unexplained differences instead of hiding them.

## 8. Inventory and recipe invariants

Tests must prove:
- inventory ledger reconstructs stock;
- duplicate posting is prevented;
- sale consumption follows recipe/direct-stock rule;
- product, ingredient and inventory item identities remain distinct;
- unit conversions are deterministic;
- negative/invalid quantities follow explicit policy;
- loss/adjustment/reversal is auditable;
- inventory count produces a traceable reconciliation event;
- purchase receipt updates admitted cost basis once;
- lot/expiry scope does not bypass tenant/location boundaries.

## 9. Order and integration reliability

Required cases:
- duplicate webhook/event;
- late event;
- out-of-order event;
- provider timeout;
- provider 4xx/5xx;
- malformed payload;
- invalid signature/authentication;
- replayed event;
- tenant/provider mapping mismatch;
- retry exhaustion;
- dead-letter creation;
- manual replay;
- canonical order remains idempotent.

## 10. Offline and sync

Required scenarios:
- network loss before checkout;
- network loss after local commit;
- reconnect with duplicate retry;
- stale local catalog/pricing;
- revoked authorization while device was offline;
- conflicting local/server update;
- queue corruption/recovery;
- local clock skew;
- device restart;
- partial synchronization.

No offline path may silently duplicate financial/inventory effects.

## 11. AI validation

### 11.1 Truth Layer
AI must not calculate official balances independently when deterministic source exists.

Tests:
- incorrect model arithmetic cannot override Truth Layer;
- missing source data produces uncertainty/gap, not fabricated value;
- vector/RAG result cannot become financial truth.

### 11.2 Explainability / Proof
Material recommendations must include required evidence fields:
- rationale;
- data sources;
- timeframe;
- assumptions;
- uncertainty/confidence;
- risks;
- expected impact.

### 11.3 Policy and action
Tests must prove:
- prompt cannot bypass Policy Brain/Admin Guard;
- unauthorized tool unavailable;
- high-risk action requires approval;
- action target is tenant/resource-scoped;
- action execution is idempotent where applicable;
- approval expires/invalidates on material drift when required.

### 11.4 Prompt injection
Test corpora include malicious:
- web page;
- e-mail;
- order note;
- uploaded document;
- product text;
- external API payload.

Expected result:
- data is treated as untrusted content;
- no secret exfiltration;
- no tool escalation;
- no cross-tenant retrieval;
- no instruction priority inversion.

### 11.5 Model/provider failure
Test:
- timeout;
- rate limit;
- provider unavailable;
- malformed response;
- partial streaming;
- model fallback;
- cost-budget exceeded;
- stale external research.

## 12. Investment intelligence validation

By default:
- research/scenario mode only;
- no brokerage/exchange/wallet execution.

Tests must prove:
- operational reserve gate;
- current-source timestamp/provenance;
- risk/liquidity disclosure;
- no guaranteed-return wording in system-generated recommendation templates;
- stale data is flagged;
- speculative allocation cannot override critical business obligations;
- execution tools remain unavailable unless separately admitted.

## 13. UI/UX validation

Required surfaces:
- POS;
- owner dashboard;
- Goodz Online;
- settings;
- notification center;
- Super Admin.

Every applicable surface is reviewed in:
- light theme;
- dark theme;
- desktop;
- mobile;
- loading;
- empty;
- success;
- warning;
- error;
- disabled;
- offline/sync states.

## 14. Visual regression

Automated screenshot comparison should cover stable critical states.

Human review remains required for:
- hierarchy;
- spacing;
- typography;
- glass/depth quality;
- motion quality;
- toast behavior;
- responsiveness;
- content clipping/overflow;
- visual regressions not captured by pixel thresholds.

Visual baselines are versioned artifacts, not subjective memory.

## 15. Accessibility target

Goodz targets **WCAG 2.2 Level AA** for applicable web application and storefront surfaces.

Validation includes:
- keyboard navigation;
- visible focus;
- semantic labels/names;
- color contrast;
- form errors;
- modal/dialog focus;
- notification announcement behavior;
- reduced motion;
- zoom/reflow;
- touch target considerations;
- screen-reader smoke for critical journeys.

Automated tooling is necessary but not sufficient; manual accessibility review remains required for critical flows.

Reference:
- https://www.w3.org/TR/WCAG22/

## 16. Performance strategy

Performance is evaluated by user surface, not one global number.

### Public storefront
Production telemetry target:
- LCP <= 2.5 s at p75;
- INP <= 200 ms at p75;
- CLS <= 0.1 at p75;
segmented by mobile/desktop when enough field data exists.

These align with current Core Web Vitals “good” thresholds and must be revalidated if the standard changes.

Reference:
- https://web.dev/articles/vitals

### POS
POS performance prioritizes perceived immediacy:
- local product search target: p95 <= 100 ms for representative catalog;
- add/remove cart interaction target: p95 <= 100 ms client-side feedback;
- payment-completion local UI confirmation: immediate optimistic state only where transaction semantics allow;
- initial usable POS route target in local benchmark: <= 2.0 s on defined reference hardware after warm dev assets are excluded.

### APIs
Initial planning budget:
- simple authenticated read: p95 <= 300 ms server-side under reference load;
- common transactional command excluding external provider latency: p95 <= 500 ms;
- external-provider operations measured separately and must expose provider wait time.

Exact budgets may be recalibrated only through benchmark evidence and ADR, not silently.

## 17. Reference benchmark profiles

At implementation planning, define at least:
- local development reference;
- low/mid mobile viewport/device profile;
- desktop browser profile;
- representative tenant dataset sizes: small, medium, stress;
- representative product/order/history volumes.

Benchmarks are invalid if populations differ materially without disclosure.

## 18. Load and scale tests

Before production claims appropriate to scale:
- concurrent storefront reads;
- order bursts;
- POS writes;
- webhook bursts;
- notification fan-out;
- report queries;
- AI request budget/rate behavior;
- queue backlog recovery.

Scale targets will be bound to release claims, not invented universally.

## 19. Database performance

Validation includes:
- query plans for hot paths;
- RLS performance;
- tenant/branch indexes;
- N+1 detection;
- large report bounds;
- pagination;
- lock/contention behavior for inventory/finance posting.

Security is never weakened for speed.

## 20. Reliability/recovery tests

Required families:
- process restart;
- queue restart;
- provider outage;
- database transient failure;
- duplicate retry;
- failed migration rehearsal when migrations exist;
- backup restore rehearsal when deployment supports it;
- corrupted local/offline queue recovery;
- dead-letter replay;
- partial job retry.

## 21. Docker local acceptance

A supported local environment must prove:
- documented one-command or bounded setup path;
- services become healthy;
- app loads;
- database/auth dependencies reachable;
- seed/dev data path works;
- critical smoke journey works;
- restart preserves intended persistent state;
- teardown/restart is documented.

## 22. Security validation

Security source-pack obligations are inherited.

At minimum:
- RLS/IDOR/BOLA;
- RBAC escalation;
- session/MFA;
- secrets;
- webhook replay;
- upload abuse;
- XSS/unsafe rendering;
- SSRF protections where URL fetch exists;
- rate/abuse controls;
- support-mode audit;
- AI permission/prompt-injection;
- cross-tenant retrieval;
- privileged-action denial.

## 23. Evidence contract

Each accepted implementation PR records:
- exact base SHA;
- exact final head SHA;
- changed files;
- requirement IDs;
- Work Order/Context Lock;
- tests executed;
- workflow/run IDs;
- pass/fail totals;
- security findings;
- visual artifacts when UI changes;
- benchmark results when performance-sensitive;
- known limitations;
- owner audit disposition;
- merge SHA after promotion.

Previous-head green evidence is not final-head proof.

## 24. Flaky tests

A test known to be flaky is a defect.

Rules:
- cannot silently retry until green and claim PASS;
- must be quarantined only through explicit issue/owner;
- critical-path flaky tests block critical acceptance;
- root cause and removal plan required.

## 25. Coverage metrics

Line/branch coverage is diagnostic, not a substitute for risk coverage.

No universal percentage alone proves completion.

Critical requirements must map to explicit tests regardless of global coverage.

## 26. Release gate

A release/increment may claim acceptance only when:
- all required tests for its risk class pass on exact head;
- no unresolved CRITICAL/HIGH finding;
- security negative tests pass;
- required visual/accessibility evidence passes;
- performance regression is within budget or explicitly governed;
- evidence bundle is complete;
- owner audit is bound to exact head.

STOP CONDITION: `GMZ_TEST_BENCHMARK_PLAN_V0_1_READY_FOR_REVIEW`
