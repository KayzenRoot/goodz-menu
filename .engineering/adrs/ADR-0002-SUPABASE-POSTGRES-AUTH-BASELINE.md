# ADR-0002 — Supabase PostgreSQL/Auth Baseline

Status: `APPROVED_WITH_IMPLEMENTATION_VALIDATION`

## Decision
Use Supabase PostgreSQL/Auth as the preferred initial data/auth platform and local-development data stack, while preserving provider-independent domain logic.

## Current verified assumptions
As of 2026-10-01, Supabase documentation describes:
- local stack operation through container runtime;
- `supabase init` + `supabase start`;
- RLS as the primary row authorization mechanism for exposed tables;
- server-only treatment of secret/service-role credentials;
- protected view requirements including `security_invoker` where applicable.

## Goodz constraints
- RLS on exposed tenant-scoped tables;
- explicit tenant membership/ownership predicates;
- no authorization based on user-editable `user_metadata`;
- secret/service role never exposed to clients;
- RLS negative tests required;
- current docs/changelog must be rechecked before implementation;
- Supabase-specific APIs stay outside domain core where feasible.

## Not decided here
- hosted production project topology;
- exact CLI/library versions;
- exact schema;
- whether every operation uses Data API vs server connection;
- Edge Functions usage.

Those require later implementation Work Orders.
