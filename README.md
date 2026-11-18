# Goodz Menu

Goodz Menu is an AI-native operating platform for food businesses, combining POS, cash, catalog, recipes, inventory, purchasing, finance, delivery, omnichannel commerce, CRM, analytics, SaaS administration and decision intelligence.

## Current state

- GEF Bootstrap: `1.1.1` (`APPLIED / CONFIRMED`)
- Product ideation: `CLOSED` (`GMZ-SRC-001` archived byte-exact)
- Source Pack & Complete-Product Scope: `FROZEN_V0.1`
- First operational release boundary: `GMZ-CSD-002 + D-0023 APPROVED` (own online menu & orders, pickup or own delivery, payment at handoff)
- Delivery governance overlay: `GEF Fast Track v1` (`ADR-0005` active)
- Promoted production credit: `90 / 515 = 17.48%` (`GMZ-IMPL-001` through `GMZ-IMPL-009`)
- Next MVP foundation target: `GMZ-M12` (Own Delivery Zones, Fee/Minimum Rules & Dispatch)

## Development model

Goodz Menu follows GEF Bootstrap `1.1.1` with the `ADR-0005` Fast Track risk-tiered overlay:
- **ROUTINE / STANDARD** increments use issue-bound contracts and integrated validation/evidence PRs;
- **SENSITIVE / ELEVATED** auth, tenant/RLS, schema, security and financial increments retain explicit admission, negative proofs and independent audit before promotion.

## Local-first development

Run locally with Node.js 24 (`corepack pnpm@12.8.1`), Docker Desktop and the local Supabase CLI stack as documented in `docs/LOCAL-DEVELOPMENT.md`.

## Canonical governance

See:
- `.engineering/SOURCE-HIERARCHY.md`
- `.engineering/PROJECT-IDENTITY.md`
- `.engineering/CHECKPOINT.md` & `.engineering/CHECKPOINT.json`
- `.engineering/PROGRESS-LEDGER.md`
- `.engineering/DECISIONS-LEDGER.md`
- `.engineering/GEF-FAST-TRACK.md`
- `.engineering/MODULE-MAP.md`
- `docs/source-pack/SCOPE.md`
- `docs/LOCAL-DEVELOPMENT.md`
