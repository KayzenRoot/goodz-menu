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
**Status:** PROPOSED; becomes APPROVED when this governance PR merges.

## D-0022 — First operational release boundary
**Decision:** Accept GMZ-CSD-002 as an additive first-release scope overlay for Goodz's own online menu and orders, pickup or own delivery, and payment at handoff. Accept the partial slices M01–M04, M06, M10–M12, M23, M25–M27 and the first-release deferrals recorded in `docs/source-pack/SCOPE.md` under GMZ-CSD-002. The full-product module classifications and `515`-point denominator remain unchanged; release credit remains unassigned.
**Evidence:** Maintainer acceptance of the reviewed GMZ-CSD-002 proposal at PR #75 HEAD `e7215aee8cfacaf0e1fc7e2b7318569118c0e624`; independent read-only exact-HEAD audit found no CRITICAL/HIGH scope defect and recommended maintainer decision.
**Limit:** This decision authorizes the canonical Scope update only. It does not authorize implementation, checkpoint promotion, merge, or deployment. Open operational details remain for separate governed Work Orders. The active GMZ-IMPL-007 Work Order's promotional-price scope conflicts with this release deferral and must be amended or replaced, admitted, and bound under a fresh Context Lock before executor mutation; this decision does not change that Work Order, Checkpoint, or Context Lock.
**Status:** `APPROVED_FOR_SCOPE_UPDATE`; implementation remains unauthorized.

Next decision ID: `D-0023`.
