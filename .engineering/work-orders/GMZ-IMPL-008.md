# GMZ-IMPL-008 — Settings Registry, Policy Hierarchy & Pilot Entitlements Foundation

Status: `ADMITTED / BOUND_FOR_EXECUTION`
Issue: `#86`
Assurance: `ELEVATED`
Execution branch: `execution/gmz-impl-008-settings-entitlements`
Execution base: `2618f12df4c4d2c37b7234f7f7b0b081eda1a287`

## OBJECTIVE

Deliver the `GMZ-M03` (Settings, Policy & Entitlements) foundation required by `GMZ-CSD-002` and `D-0023`:
1. Canonical **Settings Registry** (`setting_definitions`) and scoped overrides (`setting_values`) resolving deterministically across `Platform -> Organization -> Establishment -> Branch -> Role -> User -> Device/Session`, honoring locked higher-scope policies (`is_locked`).
2. Canonical **Plans & Entitlements** (`plans`, `entitlements`, `plan_entitlements`, `organization_plan_subscriptions`, `tenant_entitlement_overrides`), separating commercial plan definitions from effective feature grants/overrides (`GMZ-REQ-PLAT-005`).
3. Enforcement of the **D-0023 Pilot Settings Allowlist** (`storefront.ordering_enabled` fail-closed `false`, `storefront.operating_hours`, `storefront.pickup_enabled`, `storefront.delivery_enabled`, `storefront.estimated_prep_minutes`, `storefront.estimated_delivery_minutes`, `storefront.support_whatsapp`, `storefront.public_notice`, `handoff.accepted_payment_methods`, `handoff.cash_change_enabled`) plus `ui.density_mode` (user/role/device-session capable).
4. **Admin Guard + single-use 5-minute step-up proof + atomic durable audit** for sensitive operational switches (`storefront.ordering_enabled`, `handoff.accepted_payment_methods`, and policy lock toggles `is_locked`).
5. Accessible, responsive light/dark **`/app/settings` management console** (`WCAG 2.2 AA`).

## REQUIREMENTS

- `GMZ-REQ-PLAT-004` — Stable settings hierarchy (`Platform -> Tenant -> Branch -> Role -> User -> Device/Session`, with locked policies)
- `GMZ-REQ-PLAT-005` — Plans and entitlements separation
- `GMZ-REQ-PLAT-001/002/003` — Multi-tenancy, RBAC, branch awareness
- `GMZ-REQ-SEC-001/002/003/004/005` — Least privilege, cross-tenant denial, Admin Guard, durable audit, secret hygiene
- `GMZ-REQ-OBS-001` — Correlation IDs
- `GMZ-REQ-UX-001/002/006/008` & `GMZ-REQ-QA-001..005` — Dual theme, design system, safe errors, responsive WCAG 2.2 AA UI, unit/pgTAP/Data API/E2E tests

## OUT OF SCOPE

- Orders (`M10`), Delivery zones (`M12`), public Storefront (`M11`), SaaS Super Admin global billing console (`M22`), AI Policy Brain (`M18`), remote Supabase, or production deployment.

## PREDECLARED CREDIT

Maximum after objective acceptance + merge + promotion:
- `GMZ-M03`: `10` (`10 / 16 — PARTIAL`)
- `GMZ-M26`: `1` (`14 / 18 — PARTIAL`)
- Increment max: `11 / 515` (`61 -> 72 / 515 = 13.98%`)

## STOP CONDITION

`GMZ_IMPL_008_READY_FOR_OBJECTIVE_AUDIT`
