# GMZ-IMPL-009 — Canonical Orders, Handoff Payments & Staff Order Queue

Status: `ADMITTED / BOUND_FOR_EXECUTION`
Issue: `#89`
Assurance: `ELEVATED`
Execution branch: `execution/gmz-impl-009-orders-staff-queue`
Execution base: `620af6d44478947b2e5c56d82924d8daf756e6a4`

## OBJECTIVE

Deliver the Phase 4 MVP slice (`GMZ-M10` + `GMZ-M04` + `GMZ-M23` + `GMZ-M26`) under `GMZ-CSD-002` and `D-0023`:
1. Canonical tenant- and branch-isolated order domain (`customers`, `customer_addresses`, `orders`, immutable `order_items`, immutable `order_status_transitions`, immutable `order_handoff_payments`) with exact decimal (`numeric(12,2)`) totals and DB-enforced idempotency (`idempotency_key`).
2. Deterministic `D-0023` lifecycle state machine (`placed -> accepted -> preparing -> (ready_for_pickup | ready_for_dispatch -> out_for_delivery) -> completed`, plus reasoned `cancelled`), fail-closed against `storefront.ordering_enabled`, fulfillment settings, and `channel_offers` availability.
3. Authorized & audited in-person handoff payment recording (`collected`, `failed`, `cancelled`, plus Admin-Guard-protected `reversed`/`disputed`), without claiming POS cash close or accounting settlement (`M05`/`M13` deferred).
4. Responsive, accessible light/dark `/app/orders` Operations Shell queue console (`WCAG 2.2 AA`) with status filters, staff-assisted order intake, lifecycle transitions, cancellation with reason, and handoff payment recording.

## REQUIREMENTS

- `GMZ-REQ-ORD-001/002/003/004` — Canonical order model, auditable lifecycle, idempotency, channel isolation
- `GMZ-REQ-CRM-001` — Tenant-scoped customer & address records (minimal checkout PII per `D-0023`)
- `GMZ-REQ-SEC-001/002/003/004/005` — Least privilege, cross-tenant/branch isolation, Admin Guard on reversals/disputes, durable audit
- `GMZ-REQ-OBS-001` — Safe correlation IDs
- `GMZ-REQ-UX-001/002/006/008` & `GMZ-REQ-QA-001..005` — Dual theme, Operations Shell UX, WCAG 2.2 AA, unit/pgTAP/Data API/E2E suites

## OUT OF SCOPE

- Delivery zone fee rules (`M12`, Phase 5), public unauthenticated Storefront UI (`M11`, Phase 6), POS/cash sessions (`M05`), accounting/receivables reconciliation (`M13`), online payment gateways, marketplaces (`iFood`/`99Food`), and remote deployment.

## PREDECLARED CREDIT

Maximum after objective acceptance + merge + promotion:
- `GMZ-M10`: `10` (`10 / 20 — PARTIAL`)
- `GMZ-M04`: `5` (`6 / 15 — PARTIAL`)
- `GMZ-M23`: `2` (`9 / 19 — PARTIAL`)
- `GMZ-M26`: `1` (`15 / 18 — PARTIAL`)
- Increment max: `18 / 515` (`72 -> 90 / 515 = 17.48%`)

## STOP CONDITION

`GMZ_IMPL_009_READY_FOR_OBJECTIVE_AUDIT`
