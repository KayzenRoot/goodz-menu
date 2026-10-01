# Goodz Menu — Test Coverage Matrix

Status: `FROZEN_CANDIDATE_V0.1 / REVIEW_PENDING`

| Area | Unit | Integration | E2E | Negative/Security | Visual/A11y | Performance |
|---|---|---|---|---|---|---|
| Platform/Tenancy | C | R | C | R | N/A | C |
| Auth/RBAC | C | R | C | R | C | C |
| Settings/Entitlements | R | R | C | R | C | C |
| Design/Feedback/Notifications | C | C | C | C | R | R |
| POS/Cash | R | R | R | R | R | R |
| Catalog/Offers | R | R | R | C | R | R |
| Recipes/Costing | R | R | C | C | C | R |
| Inventory | R | R | R | R | C | R |
| Purchasing | R | R | R | C | C | C |
| Orders/Omnichannel | R | R | R | R | C | R |
| Goodz Online | C | R | R | R | R | R |
| Delivery | R | R | R | C | R | C |
| Finance/Reconciliation | R | R | R | R | C | R |
| Treasury/Profit Router | R | R | R | R | C | C |
| CRM/Marketing | R | R | R | R | R | C |
| Analytics/Reports | R | R | R | C | R | R |
| Intelligence Core | R | R | R | R | C | R |
| Simulation/Optimizer | R | R | C | R | C | R |
| Forecasting/Data Quality | R | R | C | R | C | R |
| Investment Intelligence | R | R | C | R | C | C |
| SaaS/Super Admin | R | R | R | R | R | R |
| Observability/Audit | R | R | C | R | C | R |
| External Integrations | R | R | R | R | N/A | R |
| Runtime/Docker | C | R | R | C | N/A | R |
| Privacy/LGPD | C | R | C | R | C | C |

Legend:
- `R` required for applicable implementation;
- `C` conditional by implementation/risk;
- `N/A` not a primary test type.

## Critical mandatory suites

### TENANT-ISO
Cross-tenant/branch denial and leakage prevention.

### FIN-LEDGER
Financial posting/reversal/reconciliation invariants.

### INV-LEDGER
Inventory reconstruction/idempotency/concurrency.

### OFFLINE-SYNC
Offline queue, replay, stale authority and reconnect.

### PROVIDER-EVENTS
Webhook authentication/replay/order/idempotency.

### AI-BOUNDARY
Truth Layer, policy, prompt injection, tool permissions, tenant scope.

### ADMIN-GUARD
Privileged action policy, reauth, reason, audit, support mode.

### UI-QUALITY
Light/dark, responsive, states, toasts, notification center, visual regression.

### A11Y-AA
WCAG 2.2 AA critical-path validation.

### DOCKER-SMOKE
Local supported environment health and critical smoke.

STOP CONDITION: `GMZ_TEST_COVERAGE_MATRIX_V0_1_READY_FOR_REVIEW`
