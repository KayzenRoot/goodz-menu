# Goodz Menu — Project Overview

Status: `APPROVED_V0.1`  
Authority domain: `REQUIREMENT + PLANNING` until Source Pack freeze.

## 1. Product definition

Goodz Menu is an AI-native operating platform for food businesses. It combines transactional operation, financial control, inventory, commerce, delivery, customer management, SaaS administration and decision intelligence in one governed system.

The product is not defined as “a POS with AI”. Its intended identity is:

> A business operating system that understands how an establishment works, detects what changed, explains why, simulates alternatives, recommends the next action, executes only what is authorized, measures the result and learns from outcomes.

## 2. Initial customer and target market

The first real consumer is the owner's own food business. The product must nevertheless be designed from the beginning for multiple establishments and future SaaS commercialization.

Target establishment families include:
- pastelarias;
- burger shops;
- pizzerias;
- restaurants;
- snack bars;
- bakeries;
- cafés;
- food trucks;
- delivery kitchens;
- comparable small/medium food businesses.

## 3. Core business problems

Goodz Menu must reduce fragmentation across:
- counter sales;
- delivery marketplaces;
- own online ordering;
- inventory;
- ingredient/recipe costing;
- purchases and suppliers;
- cash and receivables;
- accounts payable;
- customer credit;
- operating profit;
- delivery;
- CRM;
- marketing;
- reporting;
- owner decisions.

The owner should not need to manually reconcile several disconnected tools to understand whether the business is truly profitable.

## 4. Complete-product model

Goodz Menu is a complete-product program built incrementally.

Implementation order is not equivalent to product scope. Capabilities may be:
- core requirements;
- included product capabilities;
- experimentally gated;
- provider-specific adapters;
- explicitly out of scope.

Useful approved ideas are preserved in backlog even when they do not enter the first implementation slice.

## 5. Product pillars

### 5.1 Operations
Fast POS, cash shifts, unified orders, delivery and resilient operation.

### 5.2 Commerce
Catalog, channel-specific offers, Goodz Online, WhatsApp-assisted ordering, iFood, 99Food and future channels.

### 5.3 Cost and inventory truth
Ingredient units, conversions, recipes, yields, loss, stock ledger, purchase cost and real channel economics.

### 5.4 Finance
Accounts payable/receivable, customer credit, cash flow, managerial P&L, reconciliation, cost allocation and daily closing.

### 5.5 Growth
CRM, campaigns, loyalty, menu engineering, experiments, goals and marketing attribution.

### 5.6 Intelligence
Truth Layer, Goodz Intelligence Core, agents, Business Twin, Merchant Genome, Decision Graph, forecasting, simulation, optimization and explainability.

### 5.7 SaaS operations
Multi-tenancy, settings hierarchy, plans/entitlements, Super Admin, billing, usage, support, observability and AI economics.

## 6. AI differentiation

AI is a core product plane, but official financial and inventory values come from deterministic systems.

The intelligence architecture must support:
- fact-grounded explanations;
- anomaly detection;
- forecasts;
- scenario simulation;
- recommendations;
- action preparation;
- policy-aware automation;
- evidence/proof for recommendations;
- measurement of recommendation outcomes;
- model routing and cost control;
- bounded memory;
- user feedback/learning.

The intended loop is:

```text
DETECT
→ EXPLAIN
→ SIMULATE
→ RECOMMEND
→ PREPARE ACTION
→ APPROVAL/POLICY
→ EXECUTE
→ MEASURE
→ LEARN
```

## 7. Financial intelligence

Goodz Menu must answer practical owner questions such as:
- How much did I really earn today?
- How much is already committed?
- What must remain reserved for stock, structure, taxes and working capital?
- What can be withdrawn or reinvested?
- Which expenses grew?
- Why did margin change?
- Which channels/products generate the best economic result?
- Which bills require attention first?

The system must distinguish revenue, accounting/managerial result and actually available cash.

## 8. Treasury and investment intelligence

After operational obligations and configured reserves are respected, the platform may research and compare capital-allocation scenarios, including:
- reinvestment in the business;
- liquidity/reserve products;
- local/international market exposure;
- equities/ETFs;
- FX exposure;
- crypto assets;
- later Web3/DeFi analytics.

This is decision support, not guaranteed-return automation. Risk, liquidity, source freshness, concentration and business cash needs must remain visible.

## 9. Goodz Online

Each tenant can operate a customizable online storefront.

Customization goes beyond logo/colors. The platform must support controlled layout families, typography, density, product cards, headers, navigation, hero areas, banners and checkout presentation through a versioned theme/component system.

## 10. User experience quality

UI/UX is a first-class engineering requirement:
- light and dark themes;
- responsive/mobile-friendly layouts;
- professional visual hierarchy;
- controlled glassmorphism;
- polished microinteractions and motion;
- elegant success/error/loading states;
- robust notification center;
- accessible reduced-motion behavior;
- visual review before feature completion.

## 11. Settings and personalization

Configuration is hierarchical:
`Platform → Tenant → Branch → Role → User → Device/Session`.

Users may personalize their own experience while locked platform/tenant policies retain authority.

## 12. Super Admin

The platform owner requires a separate administration plane for:
- tenants;
- users;
- plans and entitlements;
- subscriptions/billing;
- usage;
- active-user metrics;
- AI consumption/cost;
- health/errors/integrations;
- security/audit;
- feature flags;
- controlled support access.

Platform Super Admin is not equivalent to tenant Owner/Admin.

## 13. Runtime and development posture

Development is local-first through Docker so the owner can continuously inspect behavior and design.

Cloud deployment architecture will be frozen later. Supabase/PostgreSQL is the preferred initial data/auth direction subject to implementation-time validation. Media remains provider-abstracted.

## 14. Safety principles

- tenant isolation is mandatory;
- least privilege applies to users and administrators;
- high-impact actions are audited;
- secrets never appear in user-facing errors;
- AI never becomes financial truth source by itself;
- autonomous money movement is not admitted by default;
- unknown/conflicting evidence fails closed;
- a HIGH/CRITICAL defect blocks affected progression.

## 15. Governance

The repository follows GEF Bootstrap 1.1.1.

No product code is admitted until sufficient Source Pack contracts are frozen and an implementation Work Order is created with exact Context Lock, proof obligations and stop condition.

STOP CONDITION: `GMZ_PROJECT_OVERVIEW_DOCUMENTED_FOR_REVIEW`
