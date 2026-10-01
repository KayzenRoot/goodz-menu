# Goodz Menu — Scope

Status: `IN_DISCUSSION / NOT_FROZEN`

## Scope model
Goodz Menu is planned as a complete platform with incremental construction. Implementation order does not redefine product inclusion.

Current GEF classifications:
- `CORE_REQUIRED`
- `PRODUCT_INCLUDED`
- `EXPERIMENTAL_GATED`
- `OPTIONAL_ADAPTER`
- `OUT_OF_SCOPE`

## Preliminary classification

### CORE_REQUIRED
GMZ-M00 through GMZ-M20, GMZ-M22, GMZ-M23, GMZ-M25, GMZ-M26 and GMZ-M27 are initially treated as core or core-enabling, with internal subfeatures still subject to requirement review.

Particularly non-negotiable foundations:
- multi-tenancy and tenant isolation;
- Auth/RBAC and privileged-action controls;
- settings hierarchy;
- notifications/feedback foundations;
- POS/cash/offline continuity;
- products/recipes/inventory/purchasing;
- finance/reconciliation;
- omnichannel order model;
- Goodz Online architecture;
- Truth Layer and AI governance;
- audit/observability;
- Docker local development;
- security/privacy.

### PRODUCT_INCLUDED
- advanced delivery experience;
- CRM/customer intelligence;
- marketing/growth automation;
- advanced SaaS analytics;
- advanced Super Admin operational tooling;
- experimentation and optimization capabilities that pass their assurance gates.

### EXPERIMENTAL_GATED
- automated causal/counterfactual recommendations;
- predictive optimization that materially changes prices/promotions;
- investment-allocation recommendation engines;
- Web3/DeFi analytics and any future execution;
- autonomy above recommendation/prepared-action level;
- aggregated benchmark/network intelligence.

These require utility, assurance, validity/stability and engineering-ROI evidence before production promotion.

### OPTIONAL_ADAPTER
Provider-specific adapters may be independently optional at runtime, but iFood and 99Food are product requirements for the owner's intended use and therefore must have supported Goodz integration contracts in the complete product plan.

### OUT_OF_SCOPE at current planning stage
- invisible impersonation of tenant users;
- exposing passwords or secrets to administrators;
- unapproved autonomous movement of money;
- direct investment execution without explicit governed authorization;
- using vector/RAG output as official financial truth;
- unsafe raw CSS injection into SaaS storefront themes;
- destructive cross-tenant data access.

## V1 implementation boundary
The first production implementation slice will be selected only after Requirements, Architecture, Data Model, Security, Test Plan and DoD are sufficiently frozen.

No schedule-based deletion of master ideas is allowed. Non-first-slice work remains in backlog with its classification.

STOP CONDITION: `GMZ_SCOPE_READY_FOR_REQUIREMENT_DECOMPOSITION`.
