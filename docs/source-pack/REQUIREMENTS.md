# Goodz Menu — Requirements

Status: `DOCUMENTED_V0.1 / REVIEW_PENDING`  
Authority domain: `REQUIREMENT` after governed promotion.

Requirement IDs are stable. Splitting/refining a requirement later must preserve traceability.

## R-PLATFORM — Platform foundation

### GMZ-REQ-PLAT-001 — Multi-tenancy
The platform SHALL isolate organizations/tenants, establishments, branches, users and business data from the first production architecture.

### GMZ-REQ-PLAT-002 — Tenant-safe authorization
Authentication alone SHALL NOT authorize tenant data access. Authorization SHALL combine identity, tenant membership, role/policy and resource scope.

### GMZ-REQ-PLAT-003 — Branch awareness
The data model SHALL support multiple branches/units without requiring a destructive redesign.

### GMZ-REQ-PLAT-004 — Stable settings hierarchy
Settings SHALL resolve through Platform → Tenant → Branch → Role → User → Device/Session, with explicit locked policies.

### GMZ-REQ-PLAT-005 — Plans and entitlements
Plan/billing concepts SHALL be separated from feature entitlements so temporary grants and future enterprise contracts do not mutate global plan definitions.

## R-UX — UI/UX and interaction

### GMZ-REQ-UX-001 — Dual theme
Every applicable first-party UI SHALL support polished light and dark themes.

### GMZ-REQ-UX-002 — Design system
The product SHALL use documented design tokens/components rather than page-local styling conventions.

### GMZ-REQ-UX-003 — Glass and depth
Glassmorphism, transparency, blur, shadow and depth effects SHALL be controlled by the design system and SHALL NOT compromise readability or performance.

### GMZ-REQ-UX-004 — Motion system
Motion SHALL use reusable duration/easing/pattern tokens and respect reduced-motion preferences.

### GMZ-REQ-UX-005 — Feedback system
Success, confirmation, information, warning, error, loading, progress, undo, offline and sync states SHALL use a consistent Goodz feedback/toast system.

### GMZ-REQ-UX-006 — Error experience
Production-facing errors SHALL show human-readable guidance plus safe error/correlation identifiers and SHALL NOT expose stack traces, SQL, secrets or internal tokens.

### GMZ-REQ-UX-007 — Notification center
Users SHALL have an in-app notification center with priority, category, read/archive/snooze state, deep links and configurable delivery rules.

### GMZ-REQ-UX-008 — Responsive quality
Owner, staff and storefront experiences SHALL be usable on target mobile and desktop breakpoints.

## R-POS — POS, cash and continuity

### GMZ-REQ-POS-001 — Fast counter sale
The POS SHALL optimize the path locate product → cart → payment → completion.

### GMZ-REQ-POS-002 — Payment mix
The POS SHALL support cash, PIX, debit, credit, customer credit/fiado and split payments when configured.

### GMZ-REQ-POS-003 — Cash shift
Cash sessions SHALL support opening, expected totals, counted totals, variance, cash-in, cash-out/sangria and operator accountability.

### GMZ-REQ-POS-004 — Controlled discounts/cancellations
Discounts, cancellations and refunds SHALL record actor, reason and permission context.

### GMZ-REQ-POS-005 — Offline continuity
The counter SHALL retain a governed offline operating path for admitted actions during connectivity loss and synchronize through idempotent reconciliation when connectivity returns.

## R-CATALOG — Catalog and channel offers

### GMZ-REQ-CAT-001 — Single product identity
A sellable product SHALL have one canonical product identity independent of sales channel.

### GMZ-REQ-CAT-002 — Channel-specific offer
Price, promotion, availability, fees/cost modifiers and presentation MAY vary by channel without duplicating the canonical product.

### GMZ-REQ-CAT-003 — Rich product model
Products SHALL support categories, images, descriptions, variants, sizes/flavors, addons/complements, combos/kits, availability and historical price/cost records as applicable.

### GMZ-REQ-CAT-004 — Media abstraction
Media storage/transformation SHALL be behind a provider abstraction.

## R-RECIPE — Ingredients, recipes and costing

### GMZ-REQ-REC-001 — Ingredient units and conversion
Ingredients SHALL support purchase, stock and usage units with explicit conversions.

### GMZ-REQ-REC-002 — Recipe/BOM
Recipe-based products SHALL map ingredient quantities, packaging, yield, expected loss and optional sub-recipes.

### GMZ-REQ-REC-003 — Cost propagation
Input-cost changes SHALL be able to recalculate product cost and economic margin projections.

### GMZ-REQ-REC-004 — Margin DNA
Goodz SHALL maintain an explainable economic composition for products/channels, including admitted direct and allocated costs.

## R-INVENTORY — Inventory

### GMZ-REQ-INV-001 — Movement ledger
Inventory SHALL be based on auditable movements rather than a mutable quantity field as sole truth.

### GMZ-REQ-INV-002 — Movement reasons
Purchases, recipe consumption, losses, adjustments, production, transfers, returns and expiry SHALL have explicit movement types/reasons.

### GMZ-REQ-INV-003 — Physical vs theoretical
The system SHALL compare theoretical and counted stock and surface unexplained variance without automatically accusing an individual.

### GMZ-REQ-INV-004 — Lot/expiry readiness
The model SHALL be capable of supporting lot/expiry handling for applicable inventory.

## R-PURCHASING — Purchasing and suppliers

### GMZ-REQ-PUR-001 — Purchase integration
Confirmed purchases SHALL update inventory/cost history and may create associated payables according to finance rules.

### GMZ-REQ-PUR-002 — Supplier history
The system SHALL preserve supplier/product pricing and purchasing history.

### GMZ-REQ-PUR-003 — Supplier intelligence
Goodz MAY compare supplier trends and future aggregated benchmarks only with privacy-preserving rules.

## R-ORDERS — Orders and channels

### GMZ-REQ-ORD-001 — Universal order model
Counter, Goodz Online, iFood, 99Food, WhatsApp-assisted and own-delivery orders SHALL converge on one canonical order domain.

### GMZ-REQ-ORD-002 — Order lifecycle
Orders SHALL expose explicit lifecycle states and auditable transitions.

### GMZ-REQ-ORD-003 — Integration idempotency
External order/event ingestion SHALL be designed for retries, duplicate delivery and idempotency.

### GMZ-REQ-ORD-004 — Provider isolation
Provider-specific behavior SHALL be isolated behind integration contracts/adapters rather than spread through core domain code.

## R-STOREFRONT — Goodz Online

### GMZ-REQ-WEB-001 — Online menu/order
Tenants SHALL be able to publish a mobile-first online menu with cart, checkout, delivery/withdrawal options and order status.

### GMZ-REQ-WEB-002 — Adaptive storefront
The storefront SHALL support multiple visual/layout families, not merely per-tenant color changes.

### GMZ-REQ-WEB-003 — Safe theme schema
Customization SHALL use versioned design tokens/layout/component variants rather than unrestricted arbitrary CSS in standard SaaS mode.

### GMZ-REQ-WEB-004 — AI-assisted design
Goodz MAY generate tenant design proposals from brand/media/style input, subject to owner approval.

## R-DELIVERY — Own delivery

### GMZ-REQ-DEL-001 — Delivery zones
Own delivery SHALL support configured zones/regions, fees and minimum-order rules.

### GMZ-REQ-DEL-002 — Dispatch lifecycle
Delivery SHALL support preparation, ready, assignment/dispatch, out-for-delivery and delivered states.

### GMZ-REQ-DEL-003 — Driver expansion
The architecture SHALL leave room for future driver views, routing and tracking without coupling them to POS core.

## R-FINANCE — Finance and closing

### GMZ-REQ-FIN-001 — Accounts payable
The platform SHALL manage payable obligations with category, due date, recurrence, supplier, status, installments and adjustments as applicable.

### GMZ-REQ-FIN-002 — Accounts receivable
The platform SHALL manage sales receivables, customer credit, marketplace/card receivables and payment application.

### GMZ-REQ-FIN-003 — Customer credit
Fiado/customer credit SHALL provide limit, balance, purchases, partial payments, due dates and statements.

### GMZ-REQ-FIN-004 — Managerial result
The system SHALL distinguish gross sales, COGS/CMV, variable fees, allocated operating costs, provisions and managerial result.

### GMZ-REQ-FIN-005 — Daily economic closing
The owner SHALL be able to see how daily revenue decomposes into costs, provisions, reserve needs and estimated result.

### GMZ-REQ-FIN-006 — Reconciliation
Goodz SHALL reconcile expected sales/fees/receivables against actual channel/payment settlements and identify unexplained differences.

### GMZ-REQ-FIN-007 — Cost centers/allocation
The finance model SHALL support cost centers and configurable allocation methods for indirect costs.

## R-TREASURY — Treasury and profit allocation

### GMZ-REQ-TRE-001 — Money buckets
The owner SHALL be able to define internal money/reserve buckets such as inventory, rent, tax, payroll, working capital, emergency and reinvestment.

### GMZ-REQ-TRE-002 — Reserve protection
Goodz SHALL calculate or recommend a configurable minimum operating reserve before classifying cash as freely allocable.

### GMZ-REQ-TRE-003 — Profit Router
Goodz SHALL be able to propose a destination plan for available result/cash across reserves, working capital, owner withdrawal, business reinvestment and external-investment capital.

### GMZ-REQ-TRE-004 — Human approval
Treasury recommendations SHALL NOT become external transfers or investments by default without explicit authorization and policy compliance.

## R-CRM — Customer and marketing

### GMZ-REQ-CRM-001 — Customer profile
The system SHALL maintain customer contact, purchase and preference history subject to privacy rules.

### GMZ-REQ-CRM-002 — Segmentation
CRM SHALL support segmentation such as recency, frequency, spend, channel and behavior.

### GMZ-REQ-MKT-001 — Marketing channels
Architecture SHALL support future WhatsApp, e-mail, push and coupon campaigns.

### GMZ-REQ-MKT-002 — Consent
Marketing delivery SHALL respect consent, opt-out, provider rules and privacy requirements.

### GMZ-REQ-MKT-003 — Economic attribution
Campaign analytics SHOULD prioritize revenue/margin/ROI attribution rather than message-count vanity metrics.

## R-ANALYTICS — Dashboard and reports

### GMZ-REQ-ANA-001 — Owner dashboard
The owner SHALL have current-state views for sales, estimated result, cash, orders, channel mix, stock risk and near-term obligations.

### GMZ-REQ-ANA-002 — Report engine
Reports SHALL support reusable dimensions such as period, product, category, channel, customer, supplier, operator, payment method, branch and time.

### GMZ-REQ-ANA-003 — Exports
Applicable reports SHALL support export formats such as PDF, XLSX and CSV.

### GMZ-REQ-ANA-004 — Goal tracking
Goodz SHALL support configured business goals and explain meaningful deviations.

## R-AI — Intelligence core

### GMZ-REQ-AI-001 — Truth Layer
Official financial, inventory and deterministic KPI values SHALL come from deterministic business logic/data, not free-form LLM calculation.

### GMZ-REQ-AI-002 — Agent Fabric
AI responsibilities SHOULD be decomposable into specialized agents/services with explicit tool/data permissions and an orchestrator.

### GMZ-REQ-AI-003 — Explainability
Material recommendations SHALL expose rationale, data used, timeframe, estimated impact, confidence/uncertainty and risks.

### GMZ-REQ-AI-004 — Closed Loop
Goodz SHOULD support detect → explain → simulate → recommend → prepare action → approve/policy → execute → measure → learn.

### GMZ-REQ-AI-005 — Business Twin
The platform SHOULD maintain a simulation model of the establishment for scenario analysis.

### GMZ-REQ-AI-006 — Merchant Genome
Goodz SHOULD learn establishment-specific operating patterns without replacing canonical business truth.

### GMZ-REQ-AI-007 — Decision Graph
Goodz SHOULD represent explainable causal/relational chains used to reason about business changes.

### GMZ-REQ-AI-008 — Forecasting
Goodz SHOULD forecast demand, cash and operational needs using history plus admitted contextual signals.

### GMZ-REQ-AI-009 — Data quality
The intelligence layer SHALL detect missing/inconsistent data that would invalidate recommendations.

### GMZ-REQ-AI-010 — Cost governor
AI usage SHALL be measurable by model/provider/tenant/feature and routable to control SaaS economics.

### GMZ-REQ-AI-011 — Governance
Model/version, prompt/template, tools, sources, latency/cost and material recommendation outcome SHALL be auditable at an appropriate level.

### GMZ-REQ-AI-012 — Memory tiers
AI memory SHALL distinguish current operational context, historical structured facts and semantic/document knowledge, preserving canonical source boundaries.

## R-INVEST — Investment intelligence

### GMZ-REQ-INVEST-001 — Excess-capital prerequisite
External-investment recommendations SHALL be gated by operational obligations, configured reserves and liquidity needs.

### GMZ-REQ-INVEST-002 — Current market data
Any recommendation dependent on current market conditions SHALL use fresh external data and record source/time.

### GMZ-REQ-INVEST-003 — Multi-asset comparison
The research layer MAY compare business reinvestment, liquid reserves, local/international securities, FX and crypto/Web3 opportunities within configured scope.

### GMZ-REQ-INVEST-004 — Risk disclosure
Recommendations SHALL include relevant risk, liquidity, concentration, fees and downside considerations.

### GMZ-REQ-INVEST-005 — No certainty claims
Forecasts/prospects SHALL be represented as uncertain scenarios rather than guaranteed outcomes.

### GMZ-REQ-INVEST-006 — Execution gate
Automated investment execution is `EXPERIMENTAL_GATED` and not admitted by these requirements.

## R-SAAS — Super Admin and SaaS

### GMZ-REQ-SAAS-001 — Super Admin plane
Goodz SHALL provide a platform administration plane separate from tenant administration.

### GMZ-REQ-SAAS-002 — Tenant/user controls
Authorized platform operators SHALL be able to view/manage tenant/user status, suspension, plans/entitlements and operational metadata without gaining access to passwords.

### GMZ-REQ-SAAS-003 — Platform analytics
Super Admin SHALL expose tenant/user/subscription/revenue/usage/system metrics appropriate to platform operation.

### GMZ-REQ-SAAS-004 — AI economics
Super Admin SHALL expose AI usage/cost/margin signals by provider/model/tenant/feature at an appropriate aggregation level.

### GMZ-REQ-SAAS-005 — Support mode
Privileged support access SHALL be time-bounded, reasoned, auditable and visibly indicated, avoiding invisible impersonation.

### GMZ-REQ-SAAS-006 — Feature flags
The platform SHOULD support governed feature flags/rollouts by global/plan/tenant/cohort scopes.

## R-SEC — Security, privacy and audit

### GMZ-REQ-SEC-001 — Least privilege
Application and platform roles SHALL use least privilege.

### GMZ-REQ-SEC-002 — Tenant isolation proof
Security validation SHALL include tests demonstrating cross-tenant access denial.

### GMZ-REQ-SEC-003 — Sensitive admin actions
High-impact platform/tenant actions SHALL require appropriate confirmation, reason, audit and stronger authentication as defined by Security.

### GMZ-REQ-SEC-004 — Auditability
Material changes to money, price, stock, permissions, admin state and AI-authorized actions SHALL have audit trails.

### GMZ-REQ-SEC-005 — Secret hygiene
Secrets SHALL stay out of client code, logs, error toasts, screenshots and repository history.

### GMZ-REQ-SEC-006 — LGPD readiness
The data model and operations SHALL support consent, retention, export, deletion/anonymization and data-subject workflows where applicable.

## R-OBS — Observability and resilience

### GMZ-REQ-OBS-001 — Correlation
Errors and critical operations SHALL be traceable through safe request/correlation identifiers.

### GMZ-REQ-OBS-002 — Integration health
Provider/webhook/sync health SHALL be observable.

### GMZ-REQ-OBS-003 — Self-healing
Safe retry/reprocess/recovery actions MAY be automated when they cannot create duplicate or unsafe financial effects.

## R-RUNTIME — Runtime and deployment

### GMZ-REQ-RUN-001 — Docker local
A supported local Docker path SHALL exist early enough for continuous owner testing.

### GMZ-REQ-RUN-002 — Environment separation
Development/test/production configuration and secrets SHALL be separated.

### GMZ-REQ-RUN-003 — Cloud portability
Core domain logic SHALL not require a single media/AI/provider implementation where an abstraction is economically justified.

## R-QUALITY — Validation

### GMZ-REQ-QA-001 — Functional tests
Critical business rules SHALL have deterministic automated tests.

### GMZ-REQ-QA-002 — Integration tests
Tenant authorization, financial flows, inventory movements and provider boundaries SHALL have integration tests.

### GMZ-REQ-QA-003 — E2E
Critical owner/staff/customer journeys SHALL have E2E coverage appropriate to risk.

### GMZ-REQ-QA-004 — Visual quality
Light/dark, responsive layouts, toasts, critical workflows and key storefront variants SHALL be visually reviewed, with automated visual regression where practical.

### GMZ-REQ-QA-005 — Accessibility
Applicable UI SHALL meet an explicit accessibility target frozen in the Test/Benchmark Plan.

### GMZ-REQ-QA-006 — Performance
POS and storefront SHALL have explicit performance budgets frozen before implementation acceptance.

## R-GOV — Governance

### GMZ-REQ-GOV-001 — No free-form implementation
Implementation SHALL require an admitted Work Order and current Context Lock.

### GMZ-REQ-GOV-002 — Exact-head evidence
Final review/merge claims SHALL bind to the exact PR head/evidence state being accepted.

### GMZ-REQ-GOV-003 — High-severity blockers
Known CRITICAL/HIGH defects SHALL block affected progression.

### GMZ-REQ-GOV-004 — Checkpoint continuity
Material planning/implementation increments SHALL update promoted project state so a new chat can resume from repository truth.

STOP CONDITION: `GMZ_REQUIREMENTS_V0_1_DOCUMENTED_FOR_REVIEW`
