# Goodz Menu — Decisions Ledger

Status: `ACTIVE`

## D-0001 — Product identity
**Decision:** Product name is **Goodz Menu**.  
**Status:** APPROVED.

## D-0002 — Governance framework
**Decision:** Goodz Menu is governed by **GEF Bootstrap 1.1.1** and its Work Order / Context Lock / evidence / PR / audit / checkpoint lifecycle.  
**Status:** APPROVED.

## D-0003 — Local-first development
**Decision:** Development must support local Docker execution early so visual and operational flows can be continuously tested by the owner.  
**Status:** APPROVED.

## D-0004 — Multi-tenant from foundation
**Decision:** SaaS-ready tenant isolation is architectural foundation even while the first real consumer is one establishment.  
**Status:** APPROVED.

## D-0005 — AI is core, not decorative
**Decision:** Goodz intelligence is a product core. Deterministic Truth Layer computes official financial/operational values; AI interprets, simulates and recommends.  
**Status:** APPROVED.

## D-0006 — Human authority over money
**Decision:** Recommendations may be explicit and actionable, but Goodz does not move money or make irreversible high-risk financial/investment actions by default without explicit governed user authorization.  
**Status:** APPROVED.

## D-0007 — Single product, channel-specific offers
**Decision:** Product/catalog identity is shared, while price, availability, fees and channel economics are modeled per sales channel.  
**Status:** APPROVED.

## D-0008 — Customizable storefront
**Decision:** Goodz Online must support multiple layout/design families through a versioned theme/component schema, not only color/logo changes and not arbitrary unsafe CSS.  
**Status:** APPROVED.

## D-0009 — UI/UX quality bar
**Decision:** Full light/dark themes, a documented design system, controlled glassmorphism, polished motion, toasts, error states and notification UX are product requirements, not final polish.  
**Status:** APPROVED.

## D-0010 — Settings hierarchy
**Decision:** Settings resolve through Platform → Tenant → Branch → Role → User → Device/Session, with more-specific overrides except locked higher-level policies.  
**Status:** APPROVED.

## D-0011 — Super Admin separation
**Decision:** Platform Super Admin is a distinct authority plane from tenant Owner/Admin roles and must use least privilege, audit and additional protection for high-impact operations.  
**Status:** APPROVED.

## D-0012 — Primary data direction
**Decision:** Supabase/PostgreSQL is the initial preferred data/auth direction, subject to architecture and current-documentation validation before implementation. Media must use an abstraction layer so Cloudinary/R2 or another provider can change without rewriting domain logic.  
**Status:** APPROVED_WITH_IMPLEMENTATION_VALIDATION_REQUIRED.

## D-0013 — Offline POS continuity
**Decision:** Counter operations must be designed for resilience to internet loss through a governed local queue/sync model.  
**Status:** APPROVED.

## D-0014 — No code before Source Pack
**Decision:** Product implementation is blocked until the first implementation increment is admitted by frozen-enough Source Pack, Scope, Architecture, Security, validation and DoD contracts.  
**Status:** APPROVED.

## D-0015 — Execution authority
**Decision:** Planning/governance is prepared here; heavy implementation for new governed software follows the active GEF executor contract and must be bounded by an admitted Work Order, exact Context Lock and evidence requirements.  
**Status:** APPROVED.

## D-0016 — Investment intelligence posture
**Decision:** Investment/crypto/market modules may research current information and present scenarios with risk, liquidity, source/time and impact on business reserves. Predictions are not certainties and business liquidity/reserve constraints outrank speculative allocation.  
**Status:** APPROVED.

## D-0017 — Modular monolith baseline
**Decision:** Begin with a modular monolith and explicit domain boundaries; service extraction requires evidence.  
**ADR:** ADR-0001.  
**Status:** APPROVED.

## D-0018 — Supabase/PostgreSQL/Auth baseline
**Decision:** Supabase PostgreSQL/Auth is the preferred initial data/auth/local stack direction, with implementation-time documentation validation and provider-independent domain logic.  
**ADR:** ADR-0002.  
**Status:** APPROVED_WITH_IMPLEMENTATION_VALIDATION.

## D-0019 — Auditable ledgers and reliable events
**Decision:** Inventory/finance are ledger-oriented; external events use durable inbox/outbox/idempotency semantics.  
**ADR:** ADR-0003.  
**Status:** APPROVED.

## D-0020 — AI truth/action separation
**Decision:** Deterministic Truth Layer owns official business values; AI interpretation and recommendations are separated from policy/approval/action execution.  
**ADR:** ADR-0004.  
**Status:** APPROVED.

## D-0021 — GEF Fast Track and parallel delivery
**Decision:** Introduce a prospective repository-specific risk-tiered operating overlay: ROUTINE/STANDARD work can group independent GitHub issues into one Codex multi-agent wave and one integration PR, replacing redundant admission/bind/promotion PR sequences. SENSITIVE auth/tenant/money/security changes retain explicit trust-boundary admission, negative proofs and independent review. GitHub Actions planner detects dependencies/file conflicts and generates one master prompt; paid Codex execution is opt-in and cannot auto-merge. Existing PR #69 remains on its original Context Lock. No external GEF/Source Pack/checkpoint mutation or artificial credit.  
**ADR:** ADR-0005.  
**Status:** APPROVED (merged via PR #72 at `3139534697743494626f4940b78ac3f9d468ceb6`).

## D-0022 — First operational release boundary
**Decision:** Accept GMZ-CSD-002 as an additive first-release scope overlay for Goodz's own online menu and orders, pickup or own delivery, and payment at handoff. Accept the partial slices M01–M04, M06, M10–M12, M23, M25–M27 and the first-release deferrals recorded in `docs/source-pack/SCOPE.md` under GMZ-CSD-002. The full-product module classifications and `515`-point denominator remain unchanged; release credit remains unassigned.
**Evidence:** Maintainer acceptance of the reviewed GMZ-CSD-002 proposal at PR #75 HEAD `e7215aee8cfacaf0e1fc7e2b7318569118c0e624`; merged via PR #76 at `556a9dbbcb3250b640c40fefe1ade0d5c425d871`.
**Status:** APPROVED.

## D-0023 — Pilot operational parameters for GMZ-CSD-002
**Decision:** Resolve the seven open operational parameters required by `docs/source-pack/SCOPE.md` (§GMZ-CSD-002) prior to implementing `GMZ-M03`, `GMZ-M10`, `GMZ-M11`, `GMZ-M12`, `GMZ-M25` and `GMZ-M27`:
1. **Pilot topology (`M01`):** Launch the pilot with `1` active `Organization` and `1` active `Establishment`; preserve full multi-branch RLS/schema enforcement, auto-selecting/hiding branch pickers in customer UI when a single active branch exists.
2. **Settings Registry allowlist (`M03`):** Bound first-release writable settings to `storefront.ordering_enabled` (default `false`, fail-closed), `storefront.operating_hours`, `storefront.pickup_enabled`, `storefront.delivery_enabled`, `storefront.estimated_prep_minutes`, `storefront.estimated_delivery_minutes`, `storefront.support_whatsapp`, `storefront.public_notice`, `handoff.accepted_payment_methods` (`cash`, `pix_in_person`, `debit_card_pos`, `credit_card_pos`), and `handoff.cash_change_enabled`. Sensitive switches require `Owner`/`Admin` and durable audit; platform-locked policies cannot be overridden.
3. **Manual catalog availability (`M06`/`M11`):** Tenant `Owner`/`Admin` (or `catalog.availability.write` operator with Admin Guard) updates availability at shift open and immediately on stockout; `unknown` availability fails closed for that offer, while `storefront.ordering_enabled = false` pauses the entire branch storefront.
4. **Order & delivery lifecycle (`M04`/`M10`/`M12`):** Canonical pilot states are `placed -> accepted -> preparing -> (ready_for_pickup | ready_for_dispatch -> out_for_delivery) -> completed`, plus terminal `cancelled` (mandatory reason, actor, and durable audit). Staffed order-queue monitoring is mandatory while `storefront.ordering_enabled = true`.
5. **Handoff payment policy (`M10`/`M23`):** No online payment gateway in the MVP. Customers declare intended handoff method at checkout; authorized staff (`orders.handoff_payment.write`) record `collected`, `failed`, `cancelled`, or Admin-Guard-protected `reversed`/`disputed` with reason and audit trail. Handoff records do not establish cash-session close or accounting settlement (`M05`/`M13` deferred).
6. **Privacy & LGPD (`M27`):** Collect minimal checkout PII (name, phone, delivery address when applicable), require explicit opt-in for optional marketing (`CustomerConsent`), enforce a bounded default `365`-day post-last-order PII retention window, and provide Admin-Guard-protected export and PII anonymization that preserves immutable order/audit financial records.
7. **Production architecture, RPO/RTO & release authority (`M25`):** Maintain isolated `PREVIEW/STAGING` and `PRODUCTION` environments (managed Next.js standalone HTTPS web runtime + managed Supabase PostgreSQL/Auth, secrets in provider vault only, daily backups + verified restore procedure with `RPO <= 24h` and `RTO <= 2h`, forward-compatible migrations, immutable SHA app rollback, and explicit maintainer Go-Live sign-off). Also confirm closure of parallel `GMZ-REBOOT-001` (PR #74 / Issue #73) in favor of the promoted `main` baseline.
**Status:** APPROVED.

Next decision ID: `D-0024`.
