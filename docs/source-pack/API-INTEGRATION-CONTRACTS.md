# Goodz Menu — API & Integration Contracts

Status: `BASELINE_V0.1 / REVIEW_PENDING`  
Authority domain: `ARCHITECTURE + INTEGRATION`

## 1. Purpose

Define stable Goodz application/integration boundaries while keeping provider schemas, authentication mechanics and version churn outside the canonical domain.

This document defines contracts, not executable endpoints.

## 2. Contract hierarchy

```text
Experience
  ↓
Application Contracts
  ↓
Domain Contracts
  ↓
Integration Port
  ↓
Provider Adapter
  ↓
External Provider API
```

Rules:
1. UI never depends directly on provider payloads.
2. Domain entities never require provider field names.
3. Provider adapters translate both directions.
4. External IDs are mapping data.
5. Provider failure degrades its channel, not canonical Goodz truth.

## 3. Internal application contract shape

Commands represent requested changes.

Queries represent read models.

Events represent facts that already occurred.

Each material command requires:
- actor/context;
- tenant scope;
- request/correlation ID;
- authorization context;
- idempotency key where retriable;
- input version/schema;
- deterministic validation result;
- resulting event/audit reference.

## 4. Error contract

Goodz internal/API errors must separate:
- safe user-facing code;
- machine category;
- correlation ID;
- retryability;
- validation details safe to expose;
- internal diagnostic reference.

Example categories:
- VALIDATION
- AUTHENTICATION
- AUTHORIZATION
- CONFLICT
- IDEMPOTENCY_CONFLICT
- PROVIDER_UNAVAILABLE
- RATE_LIMITED
- TIMEOUT
- DEPENDENCY_FAILURE
- INTERNAL_ERROR

Provider raw errors may be retained in protected diagnostics but never exposed verbatim when they contain secrets/PII/internal data.

## 5. Idempotency contract

Required for:
- external order ingestion;
- payment callbacks;
- webhook processing;
- offline POS synchronization;
- outbound order/catalog mutations;
- retryable financial side effects.

A successful idempotency record binds:
- tenant;
- operation type;
- idempotency key;
- canonical request fingerprint;
- result reference;
- final state.

Same key + different semantic request must fail closed.

## 6. Event inbox contract

Every external event enters a durable inbox before business processing.

Inbox states:
- RECEIVED
- VALIDATED
- PROCESSING
- PROCESSED
- RETRY_WAIT
- DEAD_LETTER
- REJECTED

Required metadata:
- provider;
- provider event ID;
- tenant/integration connection;
- receive timestamp;
- correlation ID;
- idempotency/fingerprint;
- safe payload reference;
- retry count;
- last error category.

Acknowledgement policy is provider-specific but must not silently discard unprocessed canonical work.

## 7. Outbox contract

Canonical business transaction may enqueue outbound intent atomically with local state.

Outbox states:
- PENDING
- DISPATCHING
- DELIVERED
- RETRY_WAIT
- DEAD_LETTER
- CANCELLED

External network calls must not be part of the same database transaction that establishes canonical Goodz truth.

## 8. Retry contract

Retry only if:
- operation is idempotent or idempotency-protected;
- provider response/error class allows retry;
- policy budget remains;
- retry will not duplicate financial/order side effects.

Backoff/jitter details are implementation-owned later.

## 9. Dead-letter contract

A dead-letter item must preserve:
- canonical operation/event reference;
- provider;
- last safe error;
- attempt count;
- next legal operator action;
- correlation ID.

Dead-letter is not “ignored failure”. It is visible operational debt.

## 10. Integration connection contract

Each provider connection records:
- tenant;
- provider;
- external merchant/store identity;
- granted scopes/capabilities;
- status;
- token/credential reference, never raw secret in business data;
- expiration/refresh metadata;
- last health check;
- webhook/polling capability;
- provider environment.

## 11. Universal channel capability model

A provider adapter advertises capabilities rather than the core assuming all channels are equal.

Capability examples:
- ORDER_INGEST
- ORDER_ACCEPT
- ORDER_REJECT
- ORDER_STATUS
- CATALOG_READ
- CATALOG_WRITE
- PRICE_WRITE
- AVAILABILITY_WRITE
- FINANCIAL_READ
- ANALYTICS_READ
- SHIPPING_QUOTE
- SHIPPING_REQUEST
- DELIVERY_TRACK
- WEBHOOK_EVENTS
- POLLING_EVENTS

Missing capability becomes explicit, not emulated unsafely.

## 12. Universal order normalization

External order payloads map to:
- canonical order;
- canonical customer/address where legally/contractually allowed;
- order item snapshots;
- modifier snapshots;
- payment/settlement metadata;
- fulfillment data;
- external mappings.

Provider-specific optional data belongs in adapter metadata/reference, not required core columns.

## 13. Catalog synchronization contract

Canonical Goodz product remains authoritative for Goodz-owned catalog data.

ChannelOffer controls channel representation.

Sync operations may be:
- PUSH_FULL
- PUSH_DELTA
- PULL_COMPARE
- RECONCILE

Every sync run records:
- source version/fingerprint;
- target provider/store;
- requested changes;
- accepted/rejected changes;
- provider batch/task ID;
- final reconciliation status.

No provider sync may rewrite canonical Goodz product semantics without explicit import/reconciliation policy.

## 14. Goodz Online adapter

Goodz Online is first-party but must still use application contracts.

It does not bypass:
- order validation;
- pricing rules;
- tenant scoping;
- inventory availability policy;
- payment policy;
- audit.

## 15. iFood adapter baseline

Current official iFood developer documentation was verified on 2026-10-01.

Current documented restaurant modules include:
- Merchant;
- Order;
- Catalog;
- Events;
- Review;
- Financial;
- Logistics;
- Shipping;
- Analytics.

Current docs also describe homologation/application categories, with Order intended for real-time POS integrations and Financial/Analytics having separate homologation flows.

Catalog v2.0 is the current integration direction for new catalog work; provider version/deprecation status must be checked again at implementation time.

Goodz iFood adapter responsibilities:
- authentication/token handling;
- merchant mapping;
- order/event normalization;
- catalog/channel-offer mapping;
- order action/status translation;
- financial/settlement import when scope allows;
- shipping/logistics translation when admitted;
- provider rate/error/version handling.

iFood provider objects never become canonical Goodz entities.

## 16. 99Food adapter baseline

Current official 99Food developer portal was verified on 2026-10-01.

The official platform currently advertises:
- menu/item API integration;
- order API integration;
- sandbox environment;
- developer certification/application;
- test application;
- debugging;
- test/acceptance;
- merchant authorization;
- online service assurance.

99Food is also listed by Open Delivery as supporting Order and Merchant standards, with webhook and polling event reception and a sandbox.

Goodz must not freeze undocumented endpoint details from third-party examples as canonical truth. Exact paths, auth and schemas are implementation-time provider contracts.

Goodz 99Food adapter responsibilities mirror the capability model:
- authorization/store mapping;
- order ingestion/actions;
- menu/catalog synchronization;
- webhook/polling normalization;
- reconciliation and health;
- provider-specific error/rate semantics.

## 17. WhatsApp adapter

Separate capabilities:
- transactional notifications;
- order-entry/deep-link assistance;
- future conversational commerce;
- future marketing.

Marketing and transactional policies remain distinct.

Consent/opt-out and provider template rules are owned by privacy/marketing contracts.

## 18. Email adapter

Used for:
- transactional notifications;
- reports;
- account/security communication;
- future marketing with consent.

Email delivery outcome is operational state, not proof that a person read a message.

## 19. Payment adapter

Payment providers must map to canonical:
- payment intent/record;
- provider transaction ID;
- status;
- fees when available;
- settlement;
- refund.

Webhooks require idempotency.

Provider success does not bypass Goodz reconciliation.

## 20. Media adapter

Provider-agnostic operations:
- upload;
- delete;
- transform;
- signed/private access where required;
- metadata retrieval.

Goodz stores logical asset/reference; provider URL formats are adapter details.

## 21. Market-data / investment research adapters

Read-only baseline.

Every externally sourced observation records:
- provider/source;
- instrument identity;
- retrieval timestamp;
- market timestamp if provided;
- currency;
- value;
- staleness policy;
- license/use constraints where applicable.

Research adapters never directly move money.

## 22. Authentication and secret handling

External client secrets/tokens:
- stored only in approved secret storage;
- referenced indirectly from connection metadata;
- never logged;
- never exposed in browser/client;
- rotated/revoked through provider-specific procedure;
- scoped least privilege where provider supports it.

## 23. Webhook security

Each webhook adapter must define, based on provider capability:
- signature/token validation;
- replay protection;
- timestamp/window policy;
- source/environment binding;
- body canonicalization requirements;
- idempotency key;
- safe failure response;
- audit correlation.

If provider authenticity cannot be proven by signature, compensate with the strongest supported controls and document residual risk.

## 24. Correlation

One Goodz correlation ID should link:
- inbound request/event;
- domain command;
- ledger/order effects;
- outbox events;
- provider attempts;
- audit records;
- user-visible safe error code.

## 25. Versioning

Goodz internal contracts use explicit semantic/schema versions.

Breaking provider changes are absorbed inside adapters.

Breaking internal contract changes require:
- version bump;
- migration/compatibility plan;
- tests;
- governed Work Order.

## 26. Observability

Per provider:
- request rate;
- success/failure;
- latency;
- rate limiting;
- auth expiration;
- webhook lag;
- sync lag;
- retry/dead-letter count;
- affected tenant count.

No sensitive payload logging by default.

## 27. Provider outage behavior

Provider outage may:
- pause sync;
- queue outbound work;
- mark channel degraded;
- alert operators.

It must not:
- corrupt core order/finance/stock;
- silently mark failed external delivery as complete;
- retry unsafe operations indefinitely.

## 28. External-source verification record

Revalidated 2026-10-01:
- iFood developer docs: modules, Catalog v2, homologation/application categories and order/catalog/shipping surfaces.
- 99Food official developer portal: menu + order API platform, sandbox and certification/authorization workflow.
- Open Delivery listing: 99Food Order/Merchant readiness, webhook + polling, sandbox.

Implementation must revalidate current provider docs before writing adapter code.

STOP CONDITION: `GMZ_API_INTEGRATION_CONTRACTS_V0_1_DOCUMENTED`
