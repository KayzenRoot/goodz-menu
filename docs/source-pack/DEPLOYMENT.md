# Goodz Menu — Deployment & Runtime Baseline

Status: `APPROVED_V0.1`  
Authority domain: `ARCHITECTURE + VALIDATION`

## 1. Purpose

Define how Goodz Menu is developed, tested, promoted and eventually deployed without turning local-development convenience into production architecture debt.

The first mandatory runtime is **local development through Docker-compatible containers**.

Production hosting vendors are intentionally abstracted until implementation evidence justifies final provider choices.

## 2. Environment model

Canonical environments:

```text
LOCAL_DEV
   ↓
CI_TEST
   ↓
PREVIEW / STAGING (when available/justified)
   ↓
PRODUCTION
```

Each environment has isolated:
- database;
- Auth/session configuration;
- secrets;
- provider credentials;
- media namespace/bucket;
- queues/jobs;
- observability identity;
- deployment version.

Production data must never be casually copied into lower environments.

## 3. Local-first development

Local development must be reproducible on a supported workstation using a Docker-compatible container runtime.

Baseline topology:

```text
Developer machine
│
├── Goodz Web/Application
├── Goodz Worker (when introduced)
├── Supabase local stack
│   ├── PostgreSQL
│   ├── Auth
│   ├── API services
│   ├── Studio/dev tooling
│   └── other admitted local services
├── Mail/testing capture where useful
├── Provider mocks/sandboxes
└── Observability/dev logs
```

The exact number of containers/processes is implementation-owned. The architecture remains a modular monolith unless later evidence approves extraction.

## 4. Supabase local-development boundary

Current official Supabase documentation was revalidated on 2026-10-01.

The Supabase local stack:
- requires a Docker-compatible runtime;
- is started/managed through the Supabase CLI;
- supports local database/Auth/services;
- is for development/testing only;
- must never be exposed to public production traffic.

Local infrastructure must bind to localhost/private developer networking by default.

If a developer machine is on an untrusted network, local services must not bind openly to all interfaces.

References:
- https://supabase.com/docs/guides/local-development
- https://supabase.com/docs/guides/local-development/cli-workflows

## 5. Repository runtime structure target

Future implementation should converge on an explicit structure similar to:

```text
/
├── app or apps/              application source
├── packages/                 shared domain/application packages if needed
├── supabase/
│   ├── config.toml
│   ├── migrations/
│   ├── seed.sql or seed assets
│   └── schemas/              only if declarative approach is admitted
├── docker/                   Goodz-specific container assets if needed
├── scripts/                  bounded developer/validation tooling
└── docs/
```

Exact naming belongs to implementation Work Order. This document freezes responsibilities, not arbitrary folder aesthetics.

## 6. Database change workflow

Database state must be reproducible from repository-controlled schema/migration history.

Rules:
1. dashboard-only schema changes are not canonical;
2. every production schema change has a reviewed migration/change artifact;
3. local reset must reconstruct expected schema;
4. migration order is deterministic;
5. destructive migrations require explicit review and recovery plan;
6. production and local migration history must be comparable;
7. RLS/policies/views/functions are version-controlled;
8. database advisors/security validation run after relevant changes;
9. generated migrations are reviewed before commit;
10. migration filenames/commands are created through the current supported Supabase CLI workflow, not guessed.

For this new project, declarative schemas are a leading candidate because current Supabase documentation recommends them for new projects, but final schema-authoring mode must be admitted by the database implementation Work Order and remain consistent thereafter.

## 7. Seed data

Development seed data must be:
- synthetic or intentionally non-sensitive;
- deterministic enough for reproducible tests;
- representative of multiple tenants/roles;
- rich enough to exercise POS, products, recipes, stock, finance and UI states;
- safe to commit.

Production customer data, credentials and real secrets must not be committed as seed data.

A local reset must be able to rebuild a known dev/test state.

## 8. Local persistence

Classify local data as:

### Persistent development state
May survive normal container restart:
- local database volume;
- approved local media fixtures;
- developer cache where safe.

### Disposable state
May be recreated:
- build cache;
- temporary exports;
- ephemeral queues if tests explicitly permit;
- generated test artifacts.

Reset commands must clearly distinguish restart from destructive reset.

## 9. Application runtime

The Goodz web/application runtime must:
- expose health/readiness behavior appropriate to its hosting model;
- fail clearly if mandatory configuration is absent;
- avoid embedding secrets in client bundles;
- identify build/deploy version;
- connect to the correct environment explicitly;
- emit correlation IDs/log metadata.

A worker process is introduced only when required for queues, integrations, long-running jobs or AI/background workflows.

## 10. Configuration

Configuration categories:

### Public client configuration
May be sent to browser:
- public application URL;
- safe public feature flags;
- publishable client keys designed for browser use.

### Server-only configuration
Never in client bundle:
- secret/service keys;
- webhook signing secrets;
- provider private credentials;
- database privileged credentials;
- AI provider secret keys;
- encryption secrets.

### Business settings
Stored in Goodz Settings Registry/data model, not environment variables:
- tenant preferences;
- prices;
- notification rules;
- policies;
- UI themes.

Environment variables are infrastructure/configuration, not tenant business data.

## 11. Secrets

Requirements:
- never committed;
- environment/provider secret stores preferred;
- rotation supported;
- environment-specific;
- least privilege;
- redacted from logs/errors;
- no production secrets in local development;
- local example env files contain names/placeholders only.

## 12. Provider mocks and sandboxes

Development must not require destructive/live provider calls.

Adapters should support:
- local fake/mock behavior for deterministic tests;
- provider sandbox when offered;
- explicit live-development mode only when safely configured.

Mocks must model:
- success;
- timeout;
- malformed input;
- retry;
- duplicate event;
- provider error;
- rate limit.

## 13. Goodz Online local testing

Local development must support:
- tenant storefront routing;
- multiple sample tenants/themes;
- checkout flow;
- delivery/pickup variants;
- image/media fixtures;
- mobile/desktop visual review.

Custom production domains are not required for local smoke.

## 14. Offline POS local testing

The local environment must support controllable:
- network loss;
- provider loss;
- reconnect;
- local queue persistence;
- stale catalog/config;
- conflict/replay scenarios.

Offline tests must be reproducible without physically disconnecting the developer machine.

## 15. Observability by environment

Every environment identifies:
- environment name;
- application version/SHA;
- service/process;
- request/correlation ID;
- provider/integration;
- tenant context where safe.

LOCAL_DEV may use developer-friendly logs.

PRODUCTION logs:
- structured;
- redacted;
- access-controlled;
- retention-governed.

## 16. Health and readiness

Health signals distinguish:
- process alive;
- app ready to accept requests;
- database connectivity;
- mandatory dependencies;
- optional provider degradation.

Optional provider outage must not make the whole platform appear dead if core Goodz can operate safely.

## 17. Production deployment posture

Initial preferred direction:
- managed web/application hosting suited to the selected web stack;
- managed Supabase/PostgreSQL/Auth data plane;
- external media provider abstraction;
- external AI providers through Model Router;
- provider adapters for marketplaces/messaging/market data.

Vercel is a leading web-hosting candidate for a Next.js implementation, but the canonical domain architecture must not require Vercel-specific business logic.

Provider selection/pricing is revalidated at implementation/deployment time.

## 18. Staging / preview

When economically available and useful:
- schema changes should be validated against isolated preview/staging data;
- production data is not automatically copied;
- migrations apply from repository source;
- environment-specific integration credentials are separate.

Supabase preview branching may be used when plan/cost/need justify it; it is not required for local development correctness.

## 19. Deployment promotion

A production deployment requires:
- accepted exact-head application evidence;
- migration evidence;
- security gates;
- critical E2E smoke;
- environment configuration validation;
- rollback/recovery path;
- release identifier;
- no unresolved CRITICAL/HIGH blocker.

Merge-to-main and deploy are separate semantic events even when automation connects them.

## 20. Rollback and recovery

Rollback strategy depends on change class.

### Application-only
Prefer redeploying last accepted artifact/version.

### Database
Never assume arbitrary down-migrations are safe.
Require:
- forward-fix vs rollback decision;
- backup/restore awareness;
- data-loss risk review;
- explicit recovery steps for destructive changes.

### Integration configuration
Support disabling/degrading one provider without taking down core Goodz.

## 21. Backups

Production planning must define:
- database backup coverage;
- retention;
- restore process;
- restore testing;
- RPO/RTO targets;
- who can restore;
- backup access controls.

Local development volumes are not production backups.

## 22. Zero/low-downtime posture

Early releases may not promise zero downtime.

However:
- migrations should avoid unnecessary long locks;
- breaking API/schema changes use compatible transition strategy where feasible;
- provider changes degrade gracefully;
- deployment health must be observable.

Any future zero-downtime SLA requires explicit evidence.

## 23. Production data safety

Forbidden by default:
- using production DB for local dev;
- copying full production PII into local seed;
- exposing local Supabase publicly;
- testing destructive commands on production;
- running unreviewed migrations manually;
- storing service-role credentials in browser-visible env vars.

## 24. Deployment evidence

A deployment-capable Work Order must capture:
- exact application SHA;
- migration set;
- environment;
- configuration validation;
- secret presence checks without revealing values;
- health results;
- smoke results;
- rollback/recovery note;
- deploy identifier/URL where applicable.

## 25. First implementation expectation

The first executable increment should establish only the minimal runtime skeleton necessary for:
- app boots locally;
- local Supabase stack is reproducible;
- health smoke passes;
- light/dark design shell can be inspected;
- no business module is falsely claimed complete.

Docker/local foundation should arrive early so every later module is visually and operationally testable.

STOP CONDITION: `GMZ_DEPLOYMENT_BASELINE_V0_1_READY_FOR_REVIEW`
