# Goodz Menu — Canonical Data Model

Status: `BASELINE_V0.1 / CORRECTION_APPLIED / REVIEW_PENDING`  
Authority domain: `ARCHITECTURE + REQUIREMENT`

This document defines the logical model only. It does **not** create SQL, migrations, indexes, RLS policies or physical column types.

## 1. Modeling principles

1. Every business record has one canonical domain owner.
2. Tenant scope is explicit.
3. Authentication identity is separate from tenant membership.
4. Financial and inventory truth is ledger-oriented and auditable.
5. Historical economics are snapshotted where later catalog/cost changes must not rewrite history.
6. Provider-specific identifiers are mapped at integration boundaries.
7. AI recommendations, actions, evidence and outcomes are separate records.
8. Platform administration is separate from tenant administration.
9. Soft deletion/archival is preferred where financial/audit history must remain explainable.
10. Physical implementation choices remain governed by future schema/migration Work Orders.

## 2. Logical identity strategy

All canonical entities require stable opaque identifiers.

Requirements:
- globally collision-resistant across offline/client/server creation paths where applicable;
- never encode tenant/business secrets;
- safe for references across ledgers/events;
- immutable after creation.

The physical identifier type is not frozen here. UUID-style identifiers are the leading implementation direction; final choice belongs to schema implementation.

External provider IDs are never canonical primary identities. They live in mapping/integration records.

## 3. Tenant hierarchy

```text
platform
  └── organization
        └── establishment
              └── branch
```

### Organization
Commercial tenant/account boundary.

Core attributes:
- identity;
- legal/display name;
- lifecycle status;
- owner relationship;
- plan/subscription relationship;
- tenant settings namespace.

### Establishment
Operating business inside an organization.

Examples: one restaurant brand/store operation.

### Branch
Physical/operational unit.

Used for:
- POS;
- stock locations;
- cash sessions;
- local pricing/availability overrides where admitted;
- staff assignment;
- reporting dimensions.

Not all records require branch scope. The smallest correct scope must be used.

## 4. Identity, membership and authorization

### UserIdentity
Reference to authenticated user identity.

Owned by Auth domain, not by business tables.

### OrganizationMembership
Links one user identity to one organization.

Fields/concepts:
- user;
- organization;
- status;
- default establishment/branch optional;
- created/accepted/revoked lifecycle.

### Role
Named role definition.

Examples:
- Owner
- Admin
- Manager
- Cashier
- Kitchen
- Inventory
- Finance
- Delivery
- Marketing
- Accountant

### Permission
Atomic capability.

### RolePermission
Maps roles to permissions.

### MembershipRole
Maps a membership to one or more roles, optionally scoped more narrowly.

### PlatformAdminMembership
Separate authority plane for Goodz platform operations.

It must not reuse tenant roles as platform authority.

## 5. Settings and entitlements

### SettingDefinition
Goodz Settings Registry entry.

Defines:
- key;
- value type;
- allowed scope;
- default;
- validation;
- sensitivity;
- audit requirement;
- lock behavior;
- version.

### SettingValue
Scoped override.

Possible scope owners:
- platform;
- organization;
- establishment;
- branch;
- role;
- user;
- device/session where appropriate.

### Plan
Commercial SaaS plan definition.

### Entitlement
Feature/capability limit definition.

### PlanEntitlement
Default entitlements for a plan.

### TenantEntitlementOverride
Explicit grant/restriction independent from the global plan.

## 6. Customer and consent

### Customer
Tenant-owned customer identity.

### CustomerAddress
Multiple addresses per customer.

### CustomerChannelIdentity
External/channel identity such as WhatsApp/contact mapping when applicable.

### CustomerConsent
Records consent/opt-out basis by communication channel/purpose.

### CustomerSegmentMembership
Materialized or derived segment membership reference.

Historical campaign targeting should preserve the audience snapshot used at send time when needed.

## 7. Suppliers and units

### Supplier
Tenant-owned supplier.

### UnitOfMeasure
Canonical measurement unit.

Examples:
- unit
- gram
- kilogram
- milliliter
- liter

### UnitConversion
Explicit conversion relation.

Conversions that depend on product/ingredient density or packaging must be entity-specific instead of globally assumed.

### SupplierItem
Supplier-specific purchasing reference for an InventoryItem/package.

Stores:
- supplier SKU;
- package/unit;
- current reference price;
- lead time;
- minimum order where applicable.

## 8. Catalog

### ProductCategory
Hierarchical catalog grouping.

### Product
Canonical sellable product.

It is independent from channel-specific offer/pricing.

### ProductVariant
Size/flavor/configuration variant when modeled as stable variant identity.

### ModifierGroup
Addons/complements/customization group.

### ModifierOption
Individual option.

### ProductModifierRule
Links products/variants to modifier groups and cardinality rules.

### ComboDefinition
Composite sellable offer.

### ComboItemRule
Allowed/required components within a combo.

### SalesChannel
Canonical channel identity.

Examples:
- COUNTER
- GOODZ_ONLINE
- WHATSAPP_ASSISTED
- IFOOD
- 99FOOD
- OWN_DELIVERY

### ChannelOffer
Channel-specific representation of product/variant.

May control:
- price;
- promotional price;
- availability;
- channel title/description;
- fee/economic metadata;
- visibility;
- preparation/channel options.

### ChannelFeeProfile
Versioned fee/commission profile when needed for profitability.

Fee history must be date-effective.

## 9. Media

### MediaAsset
Provider-agnostic media metadata.

Contains:
- media kind;
- canonical logical owner;
- provider reference;
- dimensions/type;
- alt/accessibility metadata;
- lifecycle state.

### MediaVariant
Generated transformation reference.

Business entities point to MediaAsset, never directly depend on provider internals.

## 10. Ingredients and recipe system

### InventoryItem
Canonical physical stock identity.

Represents any item whose physical quantity may be controlled, including:
- raw ingredient;
- packaging;
- resale merchandise;
- produced/intermediate preparation when stocked;
- operational consumable when admitted.

`InventoryItem` is not itself a sellable catalog product and is not automatically an ingredient.

### Ingredient
Culinary/recipe role linked to an `InventoryItem`.

This preserves the invariant:

```text
Product ≠ Ingredient ≠ InventoryItem
```

while still allowing:
- a recipe ingredient to consume an InventoryItem;
- a resale Product/Variant to decrement an InventoryItem directly;
- packaging to move in stock without pretending to be a food ingredient.

### IngredientUnitProfile
Purchase/stock/usage units and conversions for that ingredient.

### Recipe
Versioned technical recipe/formula attached to product/variant or intermediate preparation.

### RecipeVersion
Immutable historical recipe version after activation.

### RecipeItem
Ingredient/InventoryItem or sub-recipe quantity requirement, using an explicit consumption role.

### Preparation
Intermediate/sub-recipe item that may itself consume inventory.

### YieldProfile
Expected output, correction factor and loss assumptions.

### ProductInventoryConsumptionRule
Defines direct stock consumption for products/variants that do not use a recipe, especially resale goods.

Example:

```text
Product: Coca-Cola can 350ml
→ consumes 1 InventoryItem: Coca-Cola can 350ml
```

This prevents resale merchandise from being modeled as a fake recipe ingredient.

### ProductionRun
Optional production/batch aggregate for an intermediate Preparation that is produced into stock.

It links consumed InventoryItems/preparations to produced InventoryItem quantity through explicit inventory movements.

Sale economics and stock consumption must reference the effective recipe/consumption rule version or equivalent snapshot used at the time.

## 11. Inventory

### InventoryLocation
Stock location scoped to establishment/branch.

### InventoryLot
Lot/batch/expiry information when applicable.

### InventoryMovement
Canonical inventory ledger entry.

Required semantics:
- tenant/establishment/branch;
- location;
- InventoryItem;
- quantity delta;
- unit;
- movement type;
- reason;
- effective time;
- source/reference;
- actor/system source;
- correlation ID;
- reversal/correction link.

Movement types include:
- purchase receipt;
- sale consumption;
- production;
- transfer;
- loss/waste;
- expiry;
- manual adjustment;
- return;
- count reconciliation.

### InventoryBalanceProjection
Derived/cache balance.

Never the only source of truth.

### InventoryCount
Physical count session.

### InventoryCountItem
Counted quantity plus expected/theoretical comparison.

### InventoryReconciliation
Approved adjustment/correction resulting from count variance.

## 12. Purchasing

### Purchase
Supplier purchase header.

### PurchaseItem
Purchased ingredient/product line.

### GoodsReceipt
Physical receipt event, separate when partial receipt is needed.

### SupplierPriceObservation
Historical normalized price observation.

### PurchasePaymentLink
Association to payable/payment records.

Purchase confirmation/receipt may create:
- inventory movements;
- cost observations;
- payable obligations;
- audit events.

## 13. Orders

### Order
Canonical internal order.

Attributes include:
- tenant scope;
- channel;
- customer optional;
- fulfillment mode;
- lifecycle state;
- totals;
- notes;
- timestamps;
- external mapping references.

### OrderItem
Purchased product/variant snapshot.

Must preserve:
- product/variant reference;
- display name snapshot;
- quantity;
- unit price;
- discount/surcharge;
- cost estimate/snapshot if admitted;
- effective recipe/economic reference.

### OrderItemModifier
Selected customization snapshot.

### OrderStatusTransition
Auditable lifecycle transition.

### ExternalOrderMapping
Maps canonical order to provider-specific IDs.

One provider event must never create duplicate canonical orders when idempotency has already succeeded.

## 14. Payments, refunds and receivables

### Payment
Payment intent/record tied to order, receivable or cash session.

### PaymentAllocation
Applies one payment to one or multiple obligations when needed.

### Refund
Refund record.

### RefundAllocation
Links refund value to original payments/order lines as applicable.

### Receivable
Expected incoming amount.

Sources:
- card;
- marketplace;
- customer credit;
- other deferred payment.

### Settlement
Actual provider/bank settlement event.

### ReconciliationMatch
Links expected receivable/payment to settlement(s).

### ReconciliationException
Unexplained difference requiring attention.

## 15. Cash register

### CashSession
Operator/branch cash shift.

### CashMovement
Append-only money movement inside cash session.

Types:
- opening float;
- cash sale;
- cash in/suprimento;
- cash out/sangria;
- refund;
- adjustment.

### CashCount
Closing count by denomination/total where implemented.

### CashVariance
Expected vs counted difference with reason/approval.

## 16. Accounts payable

### Payable
Obligation to pay.

Core fields/concepts:
- supplier/payee;
- category;
- due date;
- competence/effective period;
- amount;
- recurrence;
- installments;
- status;
- cost center;
- branch/establishment scope;
- criticality.

### PayablePayment
Actual payment event.

### PayableAdjustment
Interest, discount, correction or reversal.

Historical obligation amount and payment history must remain auditable.

## 17. Customer credit / accounts receivable

### CustomerCreditAccount
Tenant-customer credit profile.

### CustomerCreditEntry
Append-oriented customer-credit ledger.

Types:
- charge;
- payment;
- adjustment;
- reversal.

### CustomerCreditLimitHistory
Preserves limit changes if needed for audit.

## 18. Cost centers and allocations

### CostCenter
Tenant-defined accounting/managerial center.

### CostAllocationRule
Defines how indirect costs are allocated.

Methods may include:
- revenue share;
- order count;
- manual percentage;
- time;
- area;
- estimated consumption.

### CostAllocationRun
One calculation execution for a period.

### CostAllocationResult
Result per target product/channel/branch/cost center.

The model must preserve the rule/version used.

## 19. Economic snapshots

### ProductCostSnapshot
Point-in-time product/variant cost decomposition.

### ChannelEconomicsSnapshot
Point-in-time channel profitability assumptions:
- sell price;
- platform/payment fees;
- packaging;
- cost;
- contribution margin.

### DailyEconomicClose
One managerial close for a business date.

Contains:
- revenue;
- direct costs;
- allocated costs;
- provisions;
- estimated operational result;
- reserve/reinvestment decision references.

It is a snapshot/reporting artifact, not a replacement for underlying ledgers.

## 20. Treasury and Money Buckets

### MoneyBucket
Configured internal allocation bucket.

Examples:
- inventory;
- taxes;
- payroll;
- rent;
- working capital;
- emergency reserve;
- reinvestment;
- owner distribution;
- external investment allocation.

### BucketAllocation
Internal allocation entry.

### ReservePolicy
Configured minimum reserve logic/target.

### ProfitRoutingPlan
Recommended/approved distribution plan.

### ProfitRoutingItem
Destination percentage/value.

### TreasuryDecision
Owner decision accepting, modifying or rejecting a recommendation.

External money movement is a separate future integration/action and is not implied by bucket accounting.

## 21. Delivery

### DeliveryZone
Configured area/fee/minimum order.

### Delivery
Fulfillment entity tied to order.

### Driver
Tenant-owned or partner delivery identity.

### DriverAssignment
Assignment history.

### DeliveryStatusTransition
Auditable delivery state transitions.

### DeliveryRoute/Tracking
Future-capable entities, not required for first physical schema.

## 22. Integration reliability

### IntegrationConnection
Tenant/provider connection metadata, secrets referenced externally.

### ExternalEntityMapping
Maps canonical entities to provider IDs.

### IntegrationInboxEvent
Durable received provider event.

Stores:
- provider;
- event ID;
- idempotency key;
- payload reference/safe snapshot;
- received time;
- processing state;
- retry/error metadata.

### IntegrationOutboxEvent
Durable outbound work item.

### IntegrationAttempt
Attempt history for delivery/retry observability.

### IntegrationDeadLetter
Manual-attention state after policy-defined retry exhaustion.

Secrets are never stored in these event payloads/logs.

## 23. Notifications and preferences

### Notification
Canonical in-app notification.

### NotificationRecipient
Recipient/read/archive/snooze state.

### NotificationPreference
User-scoped channel/category rules.

### NotificationRule
Tenant/platform rule for mandatory or event-driven notifications.

### NotificationDelivery
Attempt/result by delivery channel.

Immediate UI toasts are presentation state and are not necessarily durable Notification records.

## 24. Audit and observability

### AuditEvent
Immutable/audit-oriented record for material changes/actions.

Fields/concepts:
- actor;
- tenant/resource scope;
- action;
- target entity;
- before/after reference or safe diff;
- reason;
- correlation ID;
- source;
- timestamp.

### ErrorOccurrence
Operational error instance with safe error code/correlation.

### Incident
Grouped operational incident.

### SystemHealthObservation
Platform/provider status observation.

Sensitive payloads must be redacted.

## 25. Analytics and goals

### BusinessGoal
Configured goal.

### GoalMeasurement
Measured/projection point.

### MetricDefinition
Canonical metric metadata/formula ownership reference.

### SavedReport
Saved report configuration.

### DashboardPreference
User dashboard layout/configuration.

Derived analytics may use projections/materialized views later, but source ledgers remain canonical.

## 26. Experiments and optimization

### Experiment
Defined hypothesis/test.

### ExperimentVariant
Treatment/control definition.

### ExperimentAssignment
Subject assignment.

### ExperimentObservation
Measured outcome.

### Scenario
Saved simulation input.

### ScenarioResult
Simulation output.

Simulated data must never be mixed with actual transactional truth.

## 27. AI intelligence records

### AIInteraction
Optional conversational interaction metadata, privacy governed.

### AIInsight
Detected informational insight.

### AIRecommendation
Recommendation record.

Contains:
- recommendation type;
- subject;
- rationale;
- confidence/uncertainty;
- data period;
- status.

### AIRecommendationEvidence
Links recommendation to:
- deterministic metrics;
- source records;
- external source references;
- assumptions.

### AIProposedAction
Action prepared by AI but not yet executed.

### AIApproval
User/policy approval/rejection.

### AIActionExecution
Execution attempt/result.

### AIOutcomeMeasurement
Observed post-action outcome.

### AIModelInvocation
Governance/economics metadata:
- provider/model/version;
- latency;
- token/cost usage;
- feature/agent;
- safe trace references.

### AIPolicyDecision
Policy Brain authorization result.

### AIMemoryReference
Reference to semantic/document memory object.

Structured business facts remain in their owning domain, not copied into AI memory as canonical truth.

## 28. Investment intelligence

### InvestmentResearchSnapshot
Timestamped externally sourced research result.

### AssetReference
Normalized identity for compared asset/instrument.

### InvestmentScenario
Allocation/research scenario.

### InvestmentRiskAssessment
Risk/liquidity/concentration assessment.

### PortfolioPositionReference
Read-only connected/imported position reference when admitted.

No entity in this baseline authorizes autonomous external execution.

## 29. SaaS / platform administration

### Subscription
Tenant subscription state.

### BillingAccount
Commercial billing identity.

### UsageRecord
Metered usage observation.

Examples:
- orders;
- storage;
- AI requests/cost;
- messages.

### FeatureFlag
Feature rollout definition.

### FeatureFlagAssignment
Global/plan/tenant/cohort/user targeting.

### SupportSession
Time-bounded privileged support context.

### PlatformAdminAction
Audited platform operation.

Platform-admin records are platform scoped, not ordinary tenant business records.

## 30. Data lifecycle rules

### Financial/inventory history
Do not hard-delete records required to reconstruct:
- money;
- stock;
- order economics;
- audit;
- reconciliation.

Corrections use:
- reversal;
- compensating entry;
- superseding version;
- explicit status transitions.

### Master/reference data
Products, ingredients, suppliers and similar entities may become inactive/archived while historical references remain valid.

### Customer privacy
Customer PII retention/deletion/anonymization rules are governed by Privacy/LGPD and must preserve required financial/legal records without retaining unnecessary identifying data.

### AI data
AI traces/recommendations have explicit retention and redaction policy. They do not silently become permanent customer/business truth.

## 30A. Stock-identity invariants

1. A Product is a commercial/sellable identity.
2. An Ingredient is a recipe/culinary role.
3. An InventoryItem is the physical stock identity.
4. A resale Product/Variant may consume InventoryItem directly without becoming an Ingredient.
5. A recipe-based Product consumes InventoryItems through Ingredient/Recipe relationships.
6. Packaging may be an InventoryItem without being a Product or Ingredient.
7. InventoryMovement always changes InventoryItem quantity, never an abstract Product price/catalog record.

## 31. Tenant-scope invariants

1. Every tenant-owned record must resolve to exactly one organization.
2. Establishment/branch scope is included only where domain semantics require it.
3. Cross-tenant foreign references are invalid except explicit platform-level aggregates designed for privacy-preserving analytics.
4. Platform-admin tables do not grant business-domain access.
5. Provider mappings inherit the tenant of the canonical entity/connection.
6. Audit events preserve the tenant/resource scope of the action.
7. AI recommendations cannot span tenants unless an explicitly anonymized aggregate feature is governed and admitted.

## 32. Ledger invariants

### Inventory
Sum of valid movement deltas, adjusted by governed correction semantics, is the reconstructable stock truth.

### Cash
Cash-session balance is derived from opening + valid cash movements.

### Customer credit
Balance is derived from ledger entries.

### Payables/receivables
Status/balance must be explainable by obligation + payment/adjustment/reversal history.

No manual overwrite may erase historical financial reasoning.

## 33. Snapshot invariants

Historical order/financial reporting must not change because:
- current product price changes;
- recipe changes;
- supplier cost changes;
- provider fee changes;
- category/name changes.

Therefore effective transaction snapshots/version references are required for economically material attributes.

## 34. Deletion and correction

Entities fall into three classes:

### Immutable/audit records
Never edited destructively after posting except allowed metadata correction with audit.

### Versioned records
New version supersedes prior version.

Examples:
- recipe;
- fee profile;
- allocation rule;
- policy.

### Mutable reference records
May change current display/config values, while historical snapshots remain untouched.

## 35. Physical schema deferrals

Not frozen in this document:
- SQL table names;
- exact Postgres data types;
- indexes;
- partitioning;
- generated columns;
- materialized views;
- RLS policy SQL;
- trigger/function implementation;
- extension choices;
- physical enum strategy.

These belong to later governed schema/migration work after Security and Test plans are frozen enough.

## 36. Data-model stop condition

This baseline is ready for review when:
- all required families in Issue #10 are represented;
- ownership and tenant scope are explicit;
- financial/inventory ledgers are reconstructable by contract;
- external integrations have idempotency/mapping records;
- AI proof/action/outcome records are separated;
- no SQL or runtime implementation is introduced.

STOP CONDITION: `GMZ_DATA_MODEL_BASELINE_V0_1_DOCUMENTED`
