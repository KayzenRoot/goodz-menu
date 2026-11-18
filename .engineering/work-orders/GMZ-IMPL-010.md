# GMZ-IMPL-010 — Own Delivery Zones, Exact Fee/Minimum Rules & Dispatch

Status: `ADMITTED / BOUND_FOR_EXECUTION`
Issue: `#92`
Assurance: `ELEVATED`
Execution branch: `execution/gmz-impl-010-own-delivery`
Execution base: `42439d2eecbf16215479e26cbc91f6490127fc55`

## OBJECTIVE

Deliver the Phase 5 MVP slice (`GMZ-M12` + `GMZ-M23` + `GMZ-M26`) under `GMZ-CSD-002` and `D-0023`:
1. Canonical branch-scoped **Delivery Zones** (`delivery_zones`) with exact decimal (`numeric(12,2)`) delivery fee and minimum-order rules, neighborhood/region coverage, estimated minutes, `delivery.own_fleet` entitlement enforcement, Admin Guard step-up protection, and durable audit.
2. Canonical **Delivery Fulfillment & Dispatch** (`deliveries`, immutable `delivery_status_transitions`) supporting `preparing -> ready_for_dispatch -> assigned -> out_for_delivery -> delivered | cancelled`, decoupled from POS core and preserving `GMZ-REQ-DEL-003` future driver/routing/tracking expansion.
3. Server-side integration with canonical `own_delivery` orders (enforcing active zone fee and `subtotal_amount >= minimum_order_amount` when a zone is selected or active on the branch, and synchronizing order/dispatch lifecycle states).
4. Accessible, responsive light/dark **`/app/delivery` management & dispatch console** (`WCAG 2.2 AA`) + full pgTAP, Data API, Vitest, and Playwright E2E suites.

## REQUIREMENTS

- `GMZ-REQ-DEL-001` — Configured delivery zones, exact fees, and minimum-order rules
- `GMZ-REQ-DEL-002` — Preparation, ready, assignment/dispatch, out-for-delivery, and delivered lifecycle
- `GMZ-REQ-DEL-003` — Extensible architecture for future driver views, routing, and tracking without POS coupling
- `GMZ-REQ-SEC-001/002/003/004/005`, `GMZ-REQ-OBS-001`, `GMZ-REQ-UX-001/002/006/008`, `GMZ-REQ-QA-001..005`

## OUT OF SCOPE

- Dedicated courier mobile app / live GPS map tracking / route optimization (`DEL-003` deferred by `GMZ-CSD-002`), third-party logistics marketplaces, public Storefront UI (`M11`, Phase 6), and POS counter coupling (`M05`).

## PREDECLARED CREDIT

Maximum after objective acceptance + merge + promotion:
- `GMZ-M12`: `10` (`10 / 16 — PARTIAL`)
- `GMZ-M23`: `1` (`10 / 19 — PARTIAL`)
- `GMZ-M26`: `1` (`16 / 18 — PARTIAL`)
- Increment max: `12 / 515` (`90 -> 102 / 515 = 19.81%`)

## STOP CONDITION

`GMZ_IMPL_010_READY_FOR_OBJECTIVE_AUDIT`
