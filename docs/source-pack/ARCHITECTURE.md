# Goodz Menu — Architecture

Status: `APPROVED_BASELINE_V0.1`  
Authority domain: `ARCHITECTURE`

## 1. Architecture objective
Provide a production-capable architecture for a local-first, multi-tenant, AI-native food-business operating platform without prematurely paying the coordination cost of distributed microservices.

## 2. Top-level decision
Goodz Menu starts as a **modular monolith with explicit domain boundaries**, plus external managed/local infrastructure and independently isolated adapters/workers where necessary.

Service extraction is evidence-driven, not a default style choice.

## 3. Logical planes

```text
┌────────────────────────────────────────────────────────────┐
│ EXPERIENCE PLANE                                           │
│ POS │ Owner App/PWA │ Goodz Online │ Super Admin          │
├────────────────────────────────────────────────────────────┤
│ APPLICATION PLANE                                          │
│ Commands │ Queries │ Policies │ Workflows │ Notifications  │
├────────────────────────────────────────────────────────────┤
│ DOMAIN PLANE                                               │
│ Tenant │ Catalog │ Recipe │ Inventory │ Orders │ Finance   │
│ Delivery │ CRM │ Analytics │ Treasury │ SaaS              │
├────────────────────────────────────────────────────────────┤
│ INTELLIGENCE PLANE                                         │
│ Truth Layer │ Agent Fabric │ Twin │ Graph │ Forecasting    │
│ Simulation │ Risk │ Proof │ Policy │ Learning             │
├────────────────────────────────────────────────────────────┤
│ INTEGRATION PLANE                                          │
│ iFood │ 99Food │ Payments │ WhatsApp │ Email │ Market Data │
├────────────────────────────────────────────────────────────┤
│ DATA / PLATFORM PLANE                                      │
│ PostgreSQL │ Auth │ RLS │ Queue/Outbox │ Cache │ Media     │
│ Audit │ Observability │ Docker/Runtime                     │
└────────────────────────────────────────────────────────────┘
```

## 4. Canonical domain boundaries
Canonical ownership follows GMZ-M00..M28. Cross-module calls must use explicit application/domain contracts rather than directly reaching across persistence internals.

## 5. Data architecture baseline

### 5.1 Primary transactional store
PostgreSQL is the canonical transactional database baseline.

Supabase PostgreSQL/Auth is the preferred initial implementation direction, subject to implementation-time version/documentation verification.

### 5.2 Multi-tenant identity
Canonical hierarchy:

```text
Organization/Tenant
  → Establishment
    → Branch
      → scoped operational data
```

Users join tenants through explicit membership/role relationships. Authentication identity does not itself imply tenant authorization.

### 5.3 Tenant keys
Tenant-scoped business tables must carry the smallest unambiguous ownership key set required by the domain, typically `organization_id` / `establishment_id` / `branch_id` where applicable.

### 5.4 RLS baseline
For tables exposed through Supabase Data API, RLS is mandatory and policies must combine authenticated identity with ownership/membership/resource predicates.

`TO authenticated` alone is never treated as tenant authorization.

User-editable metadata is not an authorization source.

UPDATE policy design must account for both row visibility and allowed new row state.

Views over protected data must preserve intended RLS semantics, using `security_invoker` where applicable or equivalent protected placement/grants.

Secret/service-role credentials are server-only.

### 5.5 Ledgers
Inventory and finance use append/audit-oriented transaction/movement records.

Mutable summary balances may exist as projections/cache, never as the only reconstructable truth.

Required ledger properties:
- actor/source;
- tenant scope;
- event/reason type;
- effective timestamp;
- amount/quantity;
- reference entity;
- reversal/correction semantics;
- audit correlation.

### 5.6 Transaction snapshots
Orders/sales preserve economic snapshots needed to explain historical results:
- sold price;
- discount/surcharge;
- channel;
- fee profile/version where relevant;
- cost estimate/snapshot;
- tax/provision metadata when admitted.

Historical sale economics must not silently change because today's recipe or fee changed.

## 6. Order and integration architecture

### 6.1 Universal order domain
External channels map into one canonical internal order model.

### 6.2 Adapter boundary
Provider-specific payloads stay inside adapters/mappers.

Core domain never depends on iFood/99Food field names.

### 6.3 Inbox/outbox pattern
External event ingestion and outbound synchronization use durable inbox/outbox concepts with:
- idempotency key;
- provider event ID;
- received/processed timestamps;
- retry state;
- dead-letter/manual attention state;
- correlation ID.

### 6.4 Provider failure
A provider outage may degrade its channel but must not corrupt canonical orders, finance or inventory state.

## 7. Application transaction boundaries
High-value business transitions must be atomic where they share one transactional boundary.

Example order completion intent:

```text
validate order
→ persist sale/order transition
→ persist payment/receivable effect
→ persist inventory movements
→ persist audit/outbox events
→ commit
```

External calls occur outside the canonical database transaction through reliable outbox/retry flows where appropriate.

## 8. Offline POS / Continuity Engine
The POS requires a local offline-capable boundary for admitted counter operations.

Baseline concepts:
- locally cached catalog/pricing subset;
- local pending-operation queue;
- client-generated stable operation IDs/idempotency keys;
- explicit sync states;
- conflict/rejection handling;
- reconciliation evidence.

Offline mode must not silently grant permissions or use stale rules for operations whose risk policy forbids offline execution.

## 9. Settings architecture
Settings resolve deterministically:

`Platform → Tenant → Branch → Role → User → Device/Session`.

Each setting definition belongs to a Settings Registry containing type, default, validation, scope, sensitivity, audit and lock metadata.

Resolved values are derived state; the underlying scoped settings remain canonical.

## 10. Notifications and feedback
Domain events can create notifications through a notification application service.

Notification delivery and toast presentation are separate:
- domain event says what happened;
- notification policy says who should be notified and by which channel;
- UI feedback says how an immediate local action is presented.

This prevents business logic from importing UI toast code.

## 11. Goodz Online
Goodz Online uses the same catalog/order core but a separate storefront experience layer.

Tenant customization uses versioned theme/design schemas, component variants and content settings.

No unrestricted arbitrary CSS is required for standard SaaS customization.

## 12. AI architecture baseline

### 12.1 Truth Layer
Deterministic data, rules and metrics generate official business facts.

### 12.2 Intelligence layer
Models may:
- explain;
- summarize;
- identify patterns;
- forecast;
- simulate;
- rank scenarios;
- draft recommendations.

They do not overwrite canonical facts merely by generating text.

### 12.3 Agent Fabric
Specialized agents/tools are permission-bounded by domain and task.

Proposed domains include:
Finance, Treasury, Inventory, Purchasing, Pricing, Sales, Customer, Marketing, Delivery, Investment Research, Risk and Audit.

### 12.4 Policy Brain
Tool/action execution must pass:
- identity/role authorization;
- tenant/resource scope;
- configured policy;
- monetary/risk limit;
- approval requirement;
- idempotency;
- audit.

### 12.5 Proof Engine
Material recommendations keep provenance:
- underlying metrics/data references;
- relevant period;
- model/version;
- sources for external/current facts;
- assumptions;
- uncertainty;
- estimated impact;
- result after action when known.

### 12.6 Model Router / Cost Governor
Model provider is abstracted. Routing may optimize quality, latency, cost and feature needs while preserving policy and audit.

### 12.7 Memory
Structured financial/inventory facts remain in canonical structured stores.
Semantic/vector retrieval is only supporting context/knowledge retrieval.

## 13. Investment intelligence boundary
Investment research is isolated from business transactional truth.

Baseline is read-only research + scenario support:
- fresh external market sources;
- timestamped source provenance;
- liquidity/risk/concentration analysis;
- comparison against reinvestment and reserve needs.

External investment execution is not part of this baseline.

## 14. SaaS / Super Admin architecture
Platform administration uses a separate authorization plane.

Tenant Owner/Admin permissions never imply Platform Admin permissions.

High-impact platform actions require stronger controls defined by Security, including audit and potential reauthentication/MFA.

Support access is explicit, time-bounded and visible.

## 15. Media architecture
Application domain stores media metadata/references rather than coupling business entities to one media vendor.

Provider adapter handles upload/transformation/deletion contracts.

## 16. Observability
Cross-cutting operational metadata:
- correlation/request ID;
- tenant context where safe;
- actor;
- module;
- route/job;
- error code;
- integration/provider;
- deploy/runtime version.

Sensitive data must be redacted.

## 17. Local development / Docker
Local development must support a reproducible Docker-based environment.

Current Supabase documentation confirms that the Supabase CLI local stack runs the project services in containers and is initialized/started with `supabase init` and `supabase start`.

Architecture target:
- application web process/container;
- optional worker process/container;
- local Supabase stack for Postgres/Auth and admitted local services;
- local mail/testing service where useful;
- provider mocks/sandboxes for integrations;
- one documented developer entry path.

The Supabase local stack is development infrastructure and must not be exposed publicly as production.

## 18. Deployment posture
Deployment topology is intentionally not frozen here beyond:
- environment separation;
- reproducible migrations/config;
- secrets externalized;
- health/observability;
- rollback/recovery;
- hosted production data plane hardened separately from local dev.

Detailed deployment is owned by `DEPLOYMENT.md`.

## 19. Performance posture
Correctness never depends on cache/realtime delivery.

Caching, prefetch, optimistic UI and realtime may improve perceived performance but canonical state must remain recoverable after missed realtime events or stale cache.

POS and storefront budgets will be frozen by Test/Benchmark Plan.

## 20. Architectural invariants
1. Tenant boundary is explicit in every applicable data/action path.
2. Authentication is not authorization.
3. Financial/inventory truth is reconstructable and auditable.
4. External events are idempotent.
5. External provider schemas do not leak into domain core.
6. AI text is not authoritative business truth.
7. High-risk actions pass Policy + Approval + Audit.
8. Offline operation cannot silently expand authority.
9. Super Admin and tenant admin are separate planes.
10. UI/UX systems do not own domain correctness.
11. Cache/realtime does not become canonical truth.
12. Microservice extraction requires measured need.

## 21. Current external references consulted

Revalidated against current official Supabase documentation on 2026-10-01.
- Supabase local development / CLI: https://supabase.com/docs/guides/local-development/cli/getting-started
- Supabase local workflow: https://supabase.com/docs/guides/local-development/cli-workflows
- Supabase data security/RLS: https://supabase.com/docs/guides/database/secure-data
- Supabase Auth architecture: https://supabase.com/docs/guides/auth/architecture
- Supabase database testing/RLS: https://supabase.com/docs/guides/local-development/testing/overview

These URLs support current implementation assumptions but do not override Goodz canonical requirements.

STOP CONDITION: `GMZ_ARCHITECTURE_BASELINE_V0_1_DOCUMENTED`
