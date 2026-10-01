# Goodz Menu — Data Ownership & Tenant Scope Matrix

Status: `BASELINE_V0.1 / REVIEW_PENDING`

Legend:
- P = platform scoped
- O = organization/tenant scoped
- E = establishment scoped
- B = branch scoped
- U = user-specific inside tenant
- X = external/provider mapping, inherits tenant from canonical owner

| Data family | Canonical module | Typical scope | Truth class |
|---|---|---:|---|
| Organization / Establishment / Branch | GMZ-M01 | O/E/B | canonical reference |
| Membership / Role / Permission | GMZ-M02 | O/E/B/U | authorization |
| Platform admin | GMZ-M02 / M22 | P | authorization/audit |
| Settings | GMZ-M03 | P/O/E/B/U | versioned config |
| Plans / Entitlements | GMZ-M03 / M22 | P/O | config/commercial |
| Customers / Addresses / Consent | GMZ-M15 / M27 | O/E | canonical + privacy |
| Suppliers | GMZ-M09 | O/E | canonical reference |
| Units / Conversions | GMZ-M07 | P or O | canonical reference |
| Products / Variants / Modifiers | GMZ-M06 | O/E | canonical reference |
| Channel Offers / Fee Profiles | GMZ-M06 | O/E/B | versioned commercial |
| Media | GMZ-M11 | O/E | provider-abstracted |
| Ingredients / Recipes / Preparations | GMZ-M07 | O/E | versioned canonical |
| Inventory Locations | GMZ-M08 | E/B | canonical reference |
| Inventory Lots | GMZ-M08 | E/B | canonical operational |
| Inventory Movements | GMZ-M08 | E/B | append ledger |
| Counts / Reconciliations | GMZ-M08 | E/B | audit/reconciliation |
| Purchases / Receipts | GMZ-M09 | O/E/B | transactional |
| Orders / Items / Modifiers | GMZ-M10 | O/E/B | transactional + snapshot |
| External order/entity mappings | GMZ-M24 | X | mapping |
| Payments / Refunds | GMZ-M13 | O/E/B | financial transaction |
| Receivables / Settlements | GMZ-M13 | O/E/B | financial ledger/recon |
| Cash Sessions / Movements | GMZ-M05 | E/B | append ledger |
| Payables / Payments | GMZ-M13 | O/E/B | financial ledger |
| Customer Credit Ledger | GMZ-M13 | O/E | append ledger |
| Cost Centers / Allocation Runs | GMZ-M13 | O/E/B | versioned calculation |
| Economic snapshots / daily close | GMZ-M13/M14 | O/E/B | immutable snapshot |
| Money Buckets / Routing Plans | GMZ-M14 | O/E | treasury control |
| Delivery | GMZ-M12 | O/E/B | operational |
| Integration Connections | GMZ-M24 | O/E | provider connection |
| Inbox / Outbox / Attempts | GMZ-M24 | O/E | reliability/event log |
| Notifications / Preferences | GMZ-M04 | O/U | notification state |
| Audit Events | GMZ-M23 | P or O/E/B | immutable audit |
| Error / Incident / Health | GMZ-M23 | P or O | observability |
| Goals / Reports | GMZ-M17 | O/E/B/U | planning/derived |
| Experiments / Scenarios | GMZ-M19 | O/E/B | experimental/simulation |
| AI Insights / Recommendations | GMZ-M18 | O/E/B | derived/proof-bound |
| AI Proposed Actions / Approval / Execution | GMZ-M18 | O/E/B | governed action trail |
| AI Model Invocations | GMZ-M18/M22 | P + tenant attribution | economics/audit |
| Investment research/scenarios | GMZ-M21 | O/E | external research |
| Subscription / Billing / Usage | GMZ-M22 | P/O | commercial |
| Feature Flags | GMZ-M22/M28 | P/O/U | rollout control |
| Support Sessions | GMZ-M28 | P + target O | privileged audit |

## Ownership invariant
Each row has one canonical module owner even when other modules consume the data.

A consumer may query through an application contract/projection; it must not silently assume ownership of another domain's persistence.

## Tenant propagation
Child records inherit tenant scope from their canonical parent and SHOULD additionally carry explicit tenant keys where needed for authorization/query safety and to prevent ambiguous cross-tenant joins.

Exact physical duplication rules are deferred to schema design.

## Cross-tenant analytics
Any future aggregated benchmark/network feature must:
- exclude direct tenant identifiers;
- use privacy-preserving aggregation rules;
- be explicitly admitted by Scope/Security;
- never become a path to reconstruct another tenant's data.

STOP CONDITION: `GMZ_DATA_OWNERSHIP_MATRIX_V0_1_DOCUMENTED`
