# GMZ-IMPL-008 — Implementation & Verification Evidence

Work Order: `GMZ-IMPL-008`
Issue: `#86`
Module slice: `GMZ-M03` (`10` pts) + `GMZ-M26` (`1` pt)
Assurance level: `ELEVATED`
Execution base SHA: `2618f12df4c4d2c37b7234f7f7b0b081eda1a287`

## 1. Delivered Scope

1. **Database Schema, RLS & Atomic Commands (`supabase/migrations/20261117220000_settings_and_entitlements.sql`):**
   - Seeded RBAC capabilities `settings.read` (`owner`, `admin`, `staff`), `settings.write` (`owner`, `admin`), and `settings.sensitive.write` (`owner`, `admin`) with automatic role seeding trigger and scoped helpers (`settings_has_permission`, `settings_can_read_organization`, `settings_can_read_establishment`).
   - Created `public.setting_definitions` and `public.setting_values` with strict composite tenant foreign keys, scope-shape `CHECK` constraints (`platform`, `organization`, `establishment`, `branch`, `role`, `user`), typed JSONB validation (`private.is_valid_setting_value`), and RLS (`SELECT` only for authorized `authenticated` scopes; zero direct client `INSERT`/`UPDATE`/`DELETE`).
   - Seeded the 10 `D-0023` pilot keys (`storefront.ordering_enabled` fail-closed `false`, `storefront.pickup_enabled`, `storefront.delivery_enabled`, `storefront.operating_hours`, `storefront.estimated_prep_minutes`, `storefront.estimated_delivery_minutes`, `storefront.support_whatsapp`, `storefront.public_notice`, `handoff.accepted_payment_methods`, `handoff.cash_change_enabled`) plus `ui.density_mode` (`comfortable` / `compact`).
   - Created `public.plans`, `public.entitlements`, `public.plan_entitlements`, `public.organization_plan_subscriptions` (auto-seeded to `pilot_mvp` on organization creation + backfilled), and `public.tenant_entitlement_overrides`, plus `public.resolve_tenant_entitlements(uuid)` separating commercial plan grants from tenant-level overrides (`GMZ-REQ-PLAT-005`).
   - Extended `public.audit_events` `CHECK` constraints for `settings.privileged.step_up` (`admin_guard`) and `settings.value.upserted` (`settings_command`) with bounded allowlisted metadata (`<= 1024` bytes).
   - Implemented `public.append_settings_step_up_event` (`service_role` execute only), single-use 5-minute consumption table `private.settings_step_up_consumptions`, `public.settings_save_value` (`authenticated` execute only, enforcing RBAC, higher-scope policy locks `is_locked`, `storefront.online_orders` entitlement check, Admin Guard proof consumption, version increment, and atomic durable audit), and `public.resolve_effective_settings` (`Platform -> Organization -> Establishment -> Branch -> Role -> User -> Device/Session`).

2. **TypeScript Domain & Server Security Contracts:**
   - `src/lib/settings/settings-resolver.ts` & `src/lib/settings/settings-resolver.test.ts`
   - `src/lib/supabase/settings-admin-guard-policy.ts` & `src/lib/supabase/settings-admin-guard-policy.test.ts`
   - `src/lib/supabase/settings-admin-guard.server.ts` & `src/lib/supabase/audit-writer.server.ts` (`persistSettingsAdminGuardEvent`)
   - Regenerated `src/lib/supabase/database.types.ts`

3. **Accessible Light/Dark `/app/settings` Console:**
   - `src/app/app/settings/page.tsx`, `src/app/app/settings/actions.ts`, `src/components/goodz/settings-panel.tsx`, navigation links in `src/app/app/page.tsx` and `src/components/goodz/catalog-panel.tsx`, and WCAG 2.2 AA contrast & responsive styles in `src/app/globals.css`.

## 2. Exact Verification Matrix

- `corepack pnpm lint`: **PASS** (`0` warnings/errors)
- `corepack pnpm typecheck`: **PASS** (`tsc --noEmit` exit `0`)
- `corepack pnpm test`: **PASS** (`17` files, `83/83` Vitest assertions)
- `corepack pnpm build`: **PASS** (`Next.js 16.4.6 --webpack` standalone build, `10` routes + `Proxy`)
- `corepack pnpm security:braces-disposition`: **PASS**
- `corepack pnpm exec supabase db lint --local`: **PASS** (`0` schema/PLpgSQL errors across `extensions`, `private`, `public`)
- `corepack pnpm supabase:test:db`: **PASS** (`5` pgTAP files, `254/254` assertions)
- `corepack pnpm test:supabase:authz`: **PASS** (`59/59` checks)
- `corepack pnpm test:supabase:settings`: **PASS** (`13/13` checks: anon denial, direct write denial, entitlement self-grant denial, step-up enforcement & replay rejection, cross-tenant & sibling-branch isolation)
- `corepack pnpm test:e2e tests/e2e/settings.spec.ts --workers=1`: **PASS** (`4/4` across `desktop-chromium` `1440px` and `mobile-chromium` `390px`, `0` Axe WCAG 2.2 AA violations in light and dark themes, visual review completed across all 4 full-page screenshots)
