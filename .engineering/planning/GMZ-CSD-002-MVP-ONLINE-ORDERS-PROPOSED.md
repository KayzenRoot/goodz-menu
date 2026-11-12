# GMZ-CSD-002 — Proposed operational MVP scope

**Status:** `PROPOSED_FOR_INDEPENDENT_REVIEW / NOT_ACCEPTED / NOT_AUTHORIZED_FOR_IMPLEMENTATION`

**Risk:** `ELEVATED` — this proposal defers several `CORE_REQUIRED` product areas while retaining tenant, order, payment-recording, privacy, and production-recovery obligations.
**Authority:** planning only; subordinate to the frozen Scope, approved Source Pack, current Checkpoint, and active Work Orders.

## 1. Purpose and requested decision

Formalize a candidate boundary for a first operational release after the user selected an MVP made from an explicit subset of the complete product backlog. The user confirmed the first customer flow as Goodz's own online menu and orders, pickup or own delivery, and payment at handoff; POS/cash-register operations and integrated payment gateways are deferred.

The user authorized preparing this candidate for independent review only. That authorization does **not** accept the proposed scope, defer any `CORE_REQUIRED` module, authorize implementation, change production credit, amend the canonical Scope or Checkpoint, merge a pull request, or authorize production deployment.

The reviewer and maintainer are asked to determine whether the boundary, excluded capabilities, compensating controls, acceptance criteria, dependencies, and unresolved decisions are complete and safe enough for a separate explicit scope acceptance. No part of this document is an execution contract.

## 2. Proposed MVP outcome

A pilot food business can configure an authorized tenant and catalog, publish its own mobile-friendly menu, accept a digital order, and fulfill that order through pickup or the business's own delivery operation. Staff can record that payment was received at handoff under an audited, explicitly authorized workflow. The MVP does not capture online payments or replace the business's existing cash/POS or accounting process.

This is a candidate release slice, not a claim that a module is complete. The proposed initial pilot is one company and one operating establishment. The tenant and branch model must still support the approved multi-tenant and multi-branch invariants; the pilot limit cannot weaken isolation or require destructive redesign. The pilot size remains subject to review before scope acceptance.

## 3. Proposed release slices

The slices below retain the complete-product requirements and select only what the proposed customer flow needs. Their module names are traceability labels, not claims that full modules are included.

Requirement anchors use the exact `GMZ-REQ-` suffix form; ranges are inclusive (for example, `PLAT-001..003` denotes `GMZ-REQ-PLAT-001`, `GMZ-REQ-PLAT-002`, and `GMZ-REQ-PLAT-003`).

| Module | Approved requirement anchors | Proposed release slice | Required boundary |
| --- | --- | --- | --- |
| GMZ-M01 | `PLAT-001..003`, `SEC-002` | Organization, tenant, establishment, and branch identity for the pilot | Enforce tenant ownership and cross-tenant denial; keep the approved multi-tenant and multi-branch invariants. |
| GMZ-M02 | `PLAT-002`, `SEC-001..003` | Owner and staff sign-in and the least-privilege roles needed to administer a catalog and fulfill orders | Every read and mutation is authorized server-side; no client-supplied tenant identifier grants access. |
| GMZ-M03 | `PLAT-004..005` | Settings Registry and hierarchy needed for the allowed pilot operations | Preserve `Platform → Tenant → Branch → Role → User → Device/Session`, locked policies, and the plan/entitlement separation. A fixed pilot entitlement set may be used without SaaS self-service billing. The exact writable settings allowlist is unresolved and must be approved before implementation. |
| GMZ-M04 | `UX-001..006`, `UX-008`, `QA-004..005` | Accessible, responsive visual shell, feedback, and order-state interactions used by owner, staff, and customer flows | Meet the approved accessibility target, reduced-motion and responsive requirements; the advanced notification center (`UX-007`) is proposed as deferred. Human review remains required. |
| GMZ-M06 | `CAT-001..004`, `SEC-004` | Manual catalog with canonical product identity, categories, descriptions, sizes/flavors, variants, channel-specific price/availability, and auditable price history | This is a partial slice. Add-ons/complements, combos/kits, promotions, product-level fee/cost modifiers, historical cost records, and custom product-media runtime are proposed as deferred in §4. No stock-on-hand, cost, or margin accuracy is implied. |
| GMZ-M10 | `ORD-001..004`, `SEC-004` | The canonical order model and auditable lifecycle are preserved; the MVP activates only the own-online channel | Future approved channels must converge on the same order model without destructive redesign. Retries cannot create duplicate orders; invalid or unauthorized transitions fail closed. No external channel adapter is included. |
| GMZ-M11 | `WEB-001`, `WEB-003` | Own online menu, cart, checkout, pickup/delivery choice, and customer-visible order state, using one approved responsive layout family | Multiple layout families (`WEB-002`) and AI-assisted design (`WEB-004`) are proposed as deferred. No marketplace, messaging-provider, or payment-gateway integration is included. |
| GMZ-M12 | `DEL-001..002` | Own-delivery zones, fee and minimum-order rules, and dispatch states | States: preparing, ready, assignment/dispatch, out for delivery, and delivered. Driver views, routing, and live tracking are not in the release; preserve the `DEL-003` architecture constraint so those capabilities can be added without coupling to POS core. |
| GMZ-M23 | `OBS-001..003`, `SEC-004` | Correlation, safe health/readiness, and durable audit of material catalog, permission, order, delivery, and handoff-payment changes | No advanced self-healing or analytical capability is implied. |
| GMZ-M25 | `RUN-001..003` | Production-capable runtime, deployment configuration, migration discipline, backups, restore, and rollback/roll-forward evidence | Provider, domain, cost, environment, retention, RPO/RTO, and recovery procedures require a separate production Work Order. |
| GMZ-M26 | `QA-001..006`, `GOV-002..003` | Risk-based unit/integration/E2E, security, dependency, exact-head, browser, performance, and accessibility validation | Automated checks do not substitute for the user's requested human keyboard, real-zoom, screen-reader, and visual sign-off. |
| GMZ-M27 | `SEC-006` | Privacy and data-governance controls applicable to customer and order data | Consent, retention, export, deletion/anonymization, and data-subject workflows must be testable; no retention period is invented here. |

GMZ-M00 governance remains in force. This proposal does not change the frozen Scope or remove future work from the product.

## 4. Proposed explicit exclusions and controls

These are proposed first-release deferrals, not approved exceptions. The complete-product requirements remain in the backlog. Controls below are candidates for review and do not authorize a weaker tenant/security/financial boundary.

| Module(s) | Proposed first-release deferral | Operational risk | Proposed compensating control / acceptance boundary |
| --- | --- | --- | --- |
| GMZ-M05 | Counter POS, cash shifts, split tenders, offline sales, and cash-register close | In-person sales and register balances remain outside Goodz; a paid order is not a cash close. | Keep the current POS/cash process as the accounting/register source of truth. Online orders remain a separate channel. If handoff payment is recorded in Goodz, require an authorized staff action with actor, time, method, and immutable audit; do not claim reconciliation or cash balance. Exact methods, proof, reversal/refund, and role policy are open decisions. |
| GMZ-M06 partial slice | Add-ons/complements, combos/kits, promotions, product-level fee/cost modifiers, historical cost records, and custom product-media upload/storage/transformation runtime | The pilot menu cannot represent every product customization or image workflow; customers must not be offered unsupported choices. | Publish a text-first menu using only the included base-product and size/flavor schema. Preserve canonical identity, channel price/availability, and auditable price history; do not store historical cost records or derive cost/margin. Preserve the media-provider abstraction as an architecture constraint, but do not implement uploads, transformations, or remote-URL fetching in this slice. Any future media capability must meet the approved ownership/type/size/access/upload-authorization/provider-reference controls. |
| GMZ-M07 / GMZ-M08 | Recipes, ingredient consumption, costing, theoretical/physical inventory, and automatic stock decrement | Manually maintained availability may become stale; overselling and unknown cost/margin are possible. | A named operator refreshes availability before service. If availability is uncertain, pause the offer or online ordering until reconciled through the business's existing process. Never present manual availability as verified stock or margin. |
| GMZ-M09 | Purchasing and supplier-intelligence flows | Purchasing/replenishment remain outside Goodz. | Preserve the existing purchasing/supplier process as its source of truth. |
| GMZ-M13 / GMZ-M14 | Payables/receivables, finance/reconciliation, treasury, reserve, and profit-allocation features | Order totals do not establish cash, settlement, accounting balance, or profit. | The existing financial/accounting process remains authoritative. Do not label order totals as net sales, cash position, reconciled balance, or managerial result. No reconciliation or finance export is accepted in this MVP. |
| GMZ-M17–M20 | Advanced analytics, reports, AI, simulation, optimization, forecasts, and early warnings | The pilot lacks advanced business insight and predictive capabilities. | Show only deterministic operational order/delivery states needed to fulfill orders. Do not generate financial estimates, forecasts, or recommendations. |
| GMZ-M22 | SaaS self-service, billing/plans, and advanced Super Admin/support | The pilot is not a self-service SaaS operation. | Onboard and support the pilot manually with named operators and audited access. Tenant isolation remains mandatory; impersonation and unrestricted support access remain prohibited. |
| GMZ-M04 / M11 | Advanced notification center (`UX-007`), multiple storefront layout families (`WEB-002`), and AI-assisted design (`WEB-004`) | The first release has one validated responsive storefront and no configurable notification center or AI design proposals. Missed new-order notices or limited visual choice could affect operations/adoption. | Use an explicitly staffed order queue and customer order-status page as the only MVP status surfaces; define operating hours and order-response responsibility in the implementation Work Order. Use one approved theme/layout family and safe design tokens; no arbitrary CSS. |
| GMZ-M15 / M16 / M21 / M24 / M28 | CRM/marketing, investment intelligence, external integrations, and advanced product operations/support | These capabilities are absent from the first release. | No marketing automation, investment actions, marketplace/messaging integration, integrated payment gateway, or external provider dependency is included. |

The confirmed payment boundary is “payment at handoff, without an integrated gateway or POS.” The product must not imply that payment handling, refunds, accounting, or settlement are fully specified until the open decisions in §7 are resolved.

## 5. Candidate acceptance criteria for later Work Orders

Each applicable criterion must be refined into stable, independently testable acceptance criteria in its implementation Work Order. These statements are proposed release-level gates, not permission to start implementation.

1. **Tenant and authorization:** an authorized owner/staff identity can access only its assigned tenant and branch; negative tests deny sibling/foreign-tenant reads and mutations. All material mutations use server-side authorization and produce the required audit record.
2. **Settings:** settings resolve through the frozen hierarchy, locked policy values cannot be overridden, and only an approved allowlist of pilot settings can be changed. Attempts to write unsupported/locked keys fail closed and are audited where required.
3. **Catalog:** staff can publish/update a channel offer using only canonical base products, categories, descriptions, and supported size/flavor variants; the customer menu is text-first and does not expose deferred add-ons or combos. Public customers see only published offers. Price changes create versioned, auditable history; price/availability mutations are authorized and audited. Historical cost records, cost, inventory, and margin claims are outside this proposed release slice.
4. **Orders and checkout abuse:** customer checkout creates one canonical first-party order. Repeated submission after timeout is idempotent. Customer and staff views expose only authorized fields. State transitions are explicit, validated, auditable, and resistant to duplicate or out-of-order requests. The implementation Work Order must define and test storefront/checkout abuse controls required by `SECURITY.md` §38; numeric thresholds remain evidence-driven.
5. **Pickup and delivery:** pickup and own delivery are distinct order modes. Delivery acceptance checks the configured zone, fee, and minimum; dispatch transitions are authorized and audited. The UI does not promise live driver location or routing.
6. **Payment at handoff:** if Goodz records receipt, only an authorized staff role can set the handoff-payment state. The event records the approved method, actor, timestamp, and order reference, cannot be silently overwritten, and is excluded from cash closing, reconciliation, or accounting claims. Accepted methods, evidence, reversal/refund, and dispute flow must be approved first.
7. **Deferred operations:** the documented manual availability control and existing POS/accounting processes are available to the pilot operator; customer-facing wording does not imply that deferred inventory or finance capabilities exist.
8. **Privacy:** collected data is minimized; consent and applicable data-subject operations are testable; retention/deletion behavior does not destroy legally required financial evidence. Exact schedules and procedures are set in an approved privacy/release Work Order.
9. **Production operation:** separate environments and secrets are validated without revealing secret values; migrations are reviewed; backup coverage, retention, restore test, RPO/RTO, rollback/roll-forward, release identifier, health/readiness, and critical smoke are evidenced for the exact release head.
10. **Quality and promotion:** exact-head automated checks and independent technical/security/privacy review have no unresolved CRITICAL/HIGH defect; manual accessibility and visual reviews are recorded by the human reviewer; branch protection and authorized promotion gates are satisfied before merge/deploy.

## 6. Backlog denominator and credit treatment

The approved complete-product denominator remains `515` points. The module-weight envelopes below are arithmetic checks against `docs/source-pack/BACKLOG.md`; they are not release-required point allocations, earned credit, or completion percentages because the candidate contains only partial slices of several modules.

| Planning envelope | Modules | Sum of full module weights |
| --- | --- | ---: |
| Candidate MVP modules | M01–M04, M06, M10–M12, M23, M25–M27 | 212 |
| Proposed deferred `CORE_REQUIRED` modules | M05, M07–M09, M13–M14, M17–M20, M22 | 203 |
| `PRODUCT_INCLUDED` modules outside this release | M15, M16, M21, M24, M28 | 86 |
| Governance | M00 | 14 |
| **Complete-product denominator** | **M00–M28** | **515** |

Before any implementation Work Order is admitted, a separate release-slice ledger must define a stable ID, mapped approved requirement(s), predeclared weight, acceptance criteria, evidence, and no-double-count rule for each credited slice. Until that is approved, release-required points are `UNASSIGNED`; planning earns no credit. Historical `52/515` on the legacy implementation line is not transferred to the reboot line. The canonical Checkpoint remains authoritative and unchanged by this proposal.

## 7. Decisions that remain open before scope acceptance

The independent review and maintainer decision must resolve or explicitly defer each item without inventing a product/legal rule:

1. Confirm whether the pilot is one company/one establishment and whether additional branches are visible or merely supported by the data model.
2. Define handoff payment methods, staff permissions, proof/receipt, failed or partial payment, cancellation, refund, dispute, and audit/reversal behavior. No online capture or gateway is proposed.
3. Approve the exact M03 Settings Registry allowlist and locked policies for the pilot.
4. Define operational owner and cadence for manual availability; decide when uncertainty pauses an item versus the whole storefront.
5. Confirm the complete customer/staff order lifecycle and cancellation/late-delivery behavior, including which delivery states are required for the pilot.
6. Set testable M27 consent, retention, export, deletion/anonymization, and data-subject criteria in the appropriate governed Work Order.
7. Approve the stable release-slice IDs and predeclared weights without changing the `515` denominator or transferring historical credit.
8. Resolve the canonical Checkpoint/Context Lock state and select the authorized implementation line after GMZ-REBOOT-001's human review and objective audit; this CSD does not choose or change that state.
9. Later, specify production provider, domain, cost, staging/production isolation, secret configuration, migration plan, backups/restoration, RPO/RTO, and release/rollback authority in a separate production Work Order.
10. Before scope acceptance, explicitly accept or revise the proposed text-first catalog boundary and the deferral of add-ons, combos, promotions, product media runtime, product-level fee/cost modifiers, and historical cost records; no checkout may imply support for options the catalog cannot represent.

## 8. Governance order and stop conditions

1. Independently review this proposal against frozen Scope, Backlog, Requirements, Architecture, Security, Deployment, and DoD. Resolve all findings within the planning increment; classify the result `APPROVED`, `CORRECTION REQUIRED`, or `BLOCKED`.
2. Only after independent review, obtain the maintainer's explicit acceptance of the proposed scope and every CORE_REQUIRED deferral. If accepted, update the canonical scope through its own governed promotion; this planning PR does not do so.
3. Complete the current GMZ-REBOOT-001 human accessibility sign-off and objective audit. Reconcile Checkpoint and execution binding through a separate approved governance action; do not start GMZ-M01 before its current Work Order stop condition is satisfied.
4. Admit separate dependency-ordered Work Orders for the approved tenant/settings foundation, catalog, orders/storefront/delivery, privacy, and production operation. Every Work Order retains its own Context Lock, exact-head evidence, and independent review.
5. Admit a production/release Work Order only after the operational MVP slices are implemented and accepted. Deploy only after provider/cost/domain, environment configuration, backup/restore, security, accessibility, rollback/recovery, and promotion authority gates are proven.

**This CSD is review-only.** A positive audit is a recommendation for maintainer scope acceptance; it does not itself accept the scope, promote the Checkpoint, authorize code, merge, or deploy.

**Stop condition:** `GMZ_CSD_002_READY_FOR_MAINTAINER_SCOPE_DECISION` only after independent review is `APPROVED`, no CRITICAL/HIGH issue remains, all scope and deferral boundaries are explicit, and the weight/acceptance treatment is auditable. Until then: `PROPOSED_FOR_INDEPENDENT_REVIEW` or `CORRECTION_REQUIRED`.

## 9. Sources reviewed

- `.engineering/CHECKPOINT.json` and `.engineering/CHECKPOINT.md`
- `.engineering/SOURCE-HIERARCHY.md`, `.engineering/DECISIONS-LEDGER.md`, and `.engineering/MODULE-MAP.md`
- GMZ-REBOOT-001 Work Order and Context Lock published on PR #74 at `c005db2bee640ae6b6327c825a476587edee11ce` (open/draft; not part of this base)
- `docs/source-pack/SCOPE.md`, `BACKLOG.md`, `REQUIREMENTS.md`, `ARCHITECTURE.md`, `DATA-MODEL.md`, `SECURITY.md`, `DEPLOYMENT.md`, `DEFINITION-OF-DONE.md`, and `TEST-BENCHMARK-PLAN.md`
- User authorization in this conversation, limited to formalizing this proposed recut for independent audit
- Current exact repository base used to prepare this document: `main@3139534697743494626f4940b78ac3f9d468ceb6`
