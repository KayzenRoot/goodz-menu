# Goodz Menu — Local Docker Contract

Status: `FROZEN_CANDIDATE_V0.1 / REVIEW_PENDING`

## Goal

A new developer/owner clone must be able to reach a known local Goodz state through a documented bounded procedure, without cloud production access.

## Required capabilities

Future local implementation must provide:
1. prerequisite check for Docker-compatible runtime;
2. reproducible Supabase local startup;
3. Goodz application startup;
4. optional worker startup when introduced;
5. deterministic database reset/seed;
6. health/readiness check;
7. representative login/tenant seed path;
8. teardown;
9. restart without unintended data loss;
10. explicit destructive reset.

## Network safety

By default:
- bind developer services to localhost/private developer networking;
- do not publish local database/Auth/Studio to external networks;
- never treat local default credentials as production-safe;
- local stack is not an internet-facing demo server.

## Expected local service classes

```text
goodz-web
supabase-local
goodz-worker        optional until required
provider-mocks      optional/per integration
mail-capture        optional but recommended for auth/email flows
```

Supabase itself may run multiple containers internally; Goodz does not need to wrap each Supabase service in duplicate custom containers.

## Persistence contract

Normal stop/start:
- preserves declared development DB state.

Destructive reset:
- drops/recreates local DB from repository migrations/schema + seed.

The two actions must be clearly different.

## Developer commands

Exact commands are implementation-owned, but project-level ergonomics should converge toward memorable actions such as:
- setup;
- dev/up;
- status;
- logs;
- test;
- reset;
- down.

A command name is not frozen here.

## Health smoke

Local acceptance must prove:
- application responds;
- local data plane responds;
- Auth path can be exercised;
- expected seeded tenant exists;
- no unexpected production endpoint is configured.

## Local secrets

Local-only secrets/keys:
- use ignored environment files or local secret mechanism;
- must not be real production credentials;
- example env documents variable names only.

## Windows target

Because the owner develops on Windows, local runtime must be validated on Windows with Docker Desktop or another compatible Docker API runtime.

Path handling, bind mounts and shell scripts must not assume Unix-only behavior without a Windows-compatible path.

## Visual-development requirement

Local runtime must make it easy to review:
- light/dark theme;
- responsive breakpoints;
- glass/motion;
- toast/error states;
- POS shell;
- owner dashboard;
- storefront;
- Super Admin shell.

This is a development requirement, not decoration.

## Failure behavior

If a mandatory service is unavailable:
- fail with actionable diagnostics;
- identify the failed service;
- avoid silent fallback to production;
- never automatically connect to remote production.

STOP CONDITION: `GMZ_LOCAL_DOCKER_CONTRACT_V0_1_READY_FOR_REVIEW`
