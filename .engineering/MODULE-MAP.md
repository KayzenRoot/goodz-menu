# Goodz Menu — Module Map

Status: `PLANNED / NOT_FROZEN`

This map decomposes the ideation seed into durable product ownership boundaries. IDs are stable planning identifiers from this point forward unless superseded by ADR.

| ID | Module | Primary ownership |
|---|---|---|
| GMZ-M00 | Governance & Source Pack | GEF lifecycle, source hierarchy, decisions, scope, DoD, checkpoints |
| GMZ-M01 | Platform Core & Multi-Tenancy | organizations, establishments, branches, tenant isolation |
| GMZ-M02 | Identity, Auth, RBAC & Admin Guard | auth, roles, permissions, MFA, privileged actions |
| GMZ-M03 | Settings, Policy & Entitlements | platform/tenant/branch/role/user/device settings, policy brain, plan entitlements |
| GMZ-M04 | Design System, Feedback, Motion & Notifications | light/dark, glassmorphism, toasts, errors, motion, notification center |
| GMZ-M05 | POS, Cash & Continuity | counter POS, cash shifts, split payment, offline-first, sync/reconciliation |
| GMZ-M06 | Catalog, Product & Channel Offers | products, variants, addons, combos, pricing and availability per channel |
| GMZ-M07 | Ingredients, Recipes, Costing & Margin DNA | units, conversions, recipes, sub-recipes, yield, losses, economic cost |
| GMZ-M08 | Inventory & Smart Stock | movement ledger, lots, expiry, counts, theoretical vs physical stock |
| GMZ-M09 | Purchasing & Supplier Intelligence | suppliers, purchases, price history, quotations, supplier intelligence |
| GMZ-M10 | Orders & Omnichannel Hub | universal order model, channel adapters, event/idempotency contracts |
| GMZ-M11 | Goodz Online & Adaptive Storefront | online ordering, theme/layout engine, AI Designer, media layer |
| GMZ-M12 | Delivery | own delivery, zones, fees, dispatch, drivers, future tracking |
| GMZ-M13 | Finance & Reconciliation | AP, AR, fiado, cost centers, allocations, DRE, cash flow, reconciliation |
| GMZ-M14 | Treasury & Profit Allocation | closing assistant, Profit Router, Money Buckets, Reserve Guard, Capital Ladder |
| GMZ-M15 | CRM & Customer Intelligence | customer profile, segmentation, Customer Brain, loyalty/future retention |
| GMZ-M16 | Marketing & Growth | WhatsApp/e-mail, campaigns, Growth Engine, coupons, attribution |
| GMZ-M17 | Analytics, Reports & Goals | dashboards, report engine, Daily Brief, Goal Engine, KPI definitions |
| GMZ-M18 | Goodz Intelligence Core | Truth Layer, AI layer, Agent Fabric, model router, memory, explainability |
| GMZ-M19 | Simulation, Decision & Optimization | Business Twin, Decision Graph, Merchant Genome, Counterfactual, Optimizer, experiments |
| GMZ-M20 | Forecasting, Quality & Early Warning | Demand Pulse, anomaly engine, data-quality engine, early-warning system |
| GMZ-M21 | Investment Intelligence | research agent, Risk Engine, Portfolio View, Crypto/Web3 analysis |
| GMZ-M22 | SaaS & Super Admin | tenant/user admin, plans, subscriptions, billing, usage, AI economics |
| GMZ-M23 | Observability, Audit & Self-Healing | audit trail, error center, health, correlation IDs, recovery |
| GMZ-M24 | External Integrations | iFood, 99Food, payments, messaging, e-mail, market data and future adapters |
| GMZ-M25 | Runtime, Docker & Deployment | local Docker, environments, secrets, cloud deployment, migrations |
| GMZ-M26 | Validation & Quality Engineering | unit/integration/E2E, visual regression, benchmarks, accessibility |
| GMZ-M27 | Privacy, LGPD & Data Governance | consent, retention, export, deletion, privacy boundaries |
| GMZ-M28 | Product Operations & Support | onboarding, support mode, communications, feature flags, release operations |

## Cross-cutting proprietary capabilities
The following named technologies span one or more modules and must retain their identity in the Innovation Ledger:
- Goodz Adaptive Storefront™
- Goodz AI Designer™
- Goodz Media Intelligence™
- Goodz Margin DNA™
- Goodz Smart Stock™
- Goodz Intelligence Core™
- Goodz Business Twin™
- Goodz Decision Graph™
- Goodz Demand Pulse™
- Goodz Cash Guardian™
- Goodz Early Warning™
- Goodz Goal Engine™
- Goodz Growth Lab™
- Goodz Customer Brain™
- Goodz Growth Engine™
- Goodz Continuity Engine™
- Goodz Explainable AI™
- Goodz Profit Router™
- Goodz Money Buckets™
- Goodz Reserve Guard™
- Goodz Treasury Copilot™
- Goodz Capital Ladder™
- Goodz Opportunity Radar™
- Goodz Portfolio View™
- Goodz Crypto & Web3 Layer™
- Goodz Investment Research Agent™
- Goodz Risk Engine™
- Goodz Reinvestment Optimizer™
- Goodz Daily Brief™
- Goodz Closing Assistant™
- Goodz Owner Mode™
- Goodz CFO Mode™
- Goodz Autopilot Levels™
- Goodz Action Center™
- Goodz Audit Trail™
- Goodz Data Quality Engine™
- Goodz Anomaly Engine™
- Goodz Benchmark Engine™
- Goodz Learning Loop™
- Goodz Scenario Vault™
- Goodz Calendar Intelligence™
- Goodz Closed Loop™
- Goodz Reconciliation Engine™
- Goodz Capture AI™
- Goodz Merchant Genome™
- Goodz Experiment Engine™
- Goodz Supplier Intelligence Network™
- Goodz Owner Everywhere™
- Goodz Proof Engine™
- Goodz Self-Healing Ops™
- Goodz Business Optimizer™
- Goodz Agent Fabric™
- Goodz Policy Brain™
- Goodz Counterfactual Engine™
- Goodz AI Cost Governor™
- Goodz Model Router™
- Goodz AI Governance Layer™
- Goodz Recommendation Evaluation™
- Goodz Trust Score™
- Goodz Memory Tiers™
- Goodz Data Moat™
- Goodz Feedback System™
- Goodz Error Experience™
- Goodz Motion System™
- Goodz Notification Center™
- Goodz Notification Rules™
- Goodz Settings Registry™
- Goodz Super Admin Console™
- Goodz Admin Guard™

## Module-map rule
A feature may belong to several modules operationally, but exactly one module must own its canonical contract. Cross-module dependencies will be frozen in Architecture.

STOP CONDITION: `GMZ_MODULE_MAP_V0_1_DOCUMENTED`.
