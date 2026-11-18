# GMZ-IMPL-011 — Implementation & Verification Evidence

Work Order: `GMZ-IMPL-011`
Issue: `#95`
Module slice: `GMZ-M11` (`12` pts) + `GMZ-M06` (`2` pts) + `GMZ-M04` (`3` pts) + `GMZ-M23` (`1` pt) + `GMZ-M26` (`1` pt)
Assurance level: `ELEVATED`
Execution base SHA: `2cf2a2cbd9126a4a73a28fdbace584d980e3a7a2`

## 1. Delivered Scope

1. **Provider-Agnostic Media Abstraction, Safe Storefront Theme Schema & Capability-Token Tracking (`supabase/migrations/20261118013000_storefront_and_media_abstraction.sql`):**
   - Seeded RBAC capabilities `storefront.read` (`owner`, `admin`, `staff`) and `storefront.write` (`owner`, `admin`) + `public.storefront_has_permission(...)`.
   - Created provider-agnostic `public.media_assets` and `public.media_variants` (`external_https`, `supabase_storage`, `cdn_proxy`) with HTTPS-only URL validation, mandatory WCAG `alt_text`, explicit dimensions, and `public.products.primary_media_asset_id`.
   - Created `public.storefront_profiles` with versioned safe theme tokens (`layout_family IN ('editorial_bistro', 'express_grid')`, `accent_preset IN ('emerald_garden', 'terracotta_oven', 'midnight_amber')`, `card_style IN ('elevated_glass', 'crisp_minimal')` — zero arbitrary CSS) and Admin-Guard-protected `public.storefront_save_profile` + `public.catalog_register_product_media`.
   - Implemented narrow public RPCs `public.storefront_get_public_menu` (fail-closed on `storefront.ordering_enabled` and `availability_state = 'available'`), `public.storefront_place_public_order` (reusing canonical order + own-delivery zone minimum/fee engine + optional `marketing_opt_in`), and `public.storefront_get_order_tracking` backed by `private.order_public_tracking_tokens` (`SHA-256` hashed 192-bit capability tokens, zero IDOR, PII-minimized).

2. **TypeScript Domain & Server Security Contracts:**
   - `src/lib/storefront/storefront-domain.ts` & `src/lib/storefront/storefront-domain.test.ts`
   - `src/lib/supabase/storefront-admin-guard-policy.ts` & `src/lib/supabase/storefront-admin-guard-policy.test.ts`
   - `src/lib/supabase/storefront-admin-guard.server.ts`, `src/lib/supabase/public-anon-client.server.ts`, `src/lib/supabase/scoped-admin-guard.server.ts`, `src/lib/supabase/audit-writer.server.ts`, and `src/lib/supabase/database.types.ts`

3. **Accessible Light/Dark `/app/storefront`, `/menu/[slug]` & `/menu/[slug]/orders/[token]`:**
   - Staff Storefront & Media console: `src/app/app/storefront/page.tsx`, `src/app/app/storefront/actions.ts`, `src/components/goodz/storefront-admin-panel.tsx`.
   - Public Storefront Shell & Tracking: `src/app/menu/[slug]/page.tsx`, `src/app/menu/[slug]/actions.ts`, `src/components/goodz/public-storefront-shell.tsx`, `src/app/menu/[slug]/orders/[token]/page.tsx`, `src/components/goodz/public-order-tracking-view.tsx`, and responsive high-contrast CSS tokens in `src/app/globals.css`.

## 2. Exact Verification Matrix

- `corepack pnpm lint`: **PASS**
- `corepack pnpm typecheck`: **PASS**
- `corepack pnpm test`: **PASS** (`23` files, `98/98` Vitest assertions)
- `corepack pnpm build`: **PASS** (`Next.js 16.4.6 --webpack` standalone build, `15` routes + `Proxy`)
- `corepack pnpm exec supabase db lint --local`: **PASS** (`0` errors)
- `corepack pnpm supabase:test:db`: **PASS** (`8` pgTAP files, `296/296` assertions)
- `corepack pnpm test:supabase:storefront`: **PASS** (`8/8` checks: direct anon table denial, provider-agnostic MediaAsset registration, Admin Guard storefront publish, fail-closed public menu read, public checkout + capability token minting, PII-minimized tracking + forged token denial)
- `node scripts/run-local-e2e.mjs tests/e2e/storefront.spec.ts --workers=1`: **PASS** (`2/2` across `desktop-chromium` `1440px` and `mobile-chromium` `390px`, `LCP <= 2.5s`, `CLS <= 0.1`, `0` Axe WCAG 2.2 AA violations across `/app/storefront`, `/menu/[slug]`, and `/menu/[slug]/orders/[token]` in light and dark themes, visual review completed across all 4 full-page screenshots)
