# GMZ-IMPL-011 — Goodz Online Storefront, Safe Theme Schema & Provider-Agnostic Media Abstraction

Status: `ADMITTED / BOUND_FOR_EXECUTION`
Issue: `#95`
Assurance: `ELEVATED`
Execution branch: `execution/gmz-impl-011-storefront-media`
Execution base: `2cf2a2cbd9126a4a73a28fdbace584d980e3a7a2`

## OBJECTIVE

Deliver the Phase 6 MVP slice (`GMZ-M11` + `GMZ-M06` media abstraction + `GMZ-M04` Storefront Shell + `GMZ-M23` + `GMZ-M26`) under `GMZ-CSD-002` and `D-0023`:
1. **Provider-Agnostic Media Abstraction (`GMZ-REQ-CAT-004`):** `public.media_assets` and `public.media_variants` with HTTPS-only URL validation, mandatory WCAG `alt_text`, explicit dimensions (preventing CLS), and product attachment (`products.primary_media_asset_id`).
2. **Safe Versioned Storefront Profile & Theme Schema (`GMZ-REQ-WEB-002/003`):** `public.storefront_profiles` supporting multiple layout families (`editorial_bistro`, `express_grid`) and versioned token presets (`accent_preset`, `card_style`) without arbitrary CSS injection, managed via Admin-Guard-protected `/app/storefront`.
3. **Public Mobile-First Goodz Online Storefront (`GMZ-REQ-WEB-001`):** `/menu/[slug]` public menu & cart (fail-closed on `storefront.ordering_enabled` and `availability_state = 'available'`), pickup or own-delivery zone checkout (`subtotal >= minimum_order_amount`, exact `BRL` zone fee, handoff payment declaration, optional marketing consent), and capability-token public order tracking `/menu/[slug]/orders/[token]` (`SHA-256` hashed token, zero IDOR, PII-minimized).
4. **Performance & Accessibility (`GMZ-REQ-QA-004/005`):** `LCP <= 2.5s`, `INP <= 200ms`, `CLS <= 0.1`, responsive `390px`/`1440px`, light/dark themes, and `0` Axe `WCAG 2.2 AA` violations.

## REQUIREMENTS

- `GMZ-REQ-CAT-004` — Media storage/transformation behind provider abstraction
- `GMZ-REQ-WEB-001` — Mobile-first online menu, cart, checkout, pickup/own-delivery, and order status
- `GMZ-REQ-WEB-002` — Multiple visual/layout families (`editorial_bistro`, `express_grid`)
- `GMZ-REQ-WEB-003` — Versioned safe theme schema without arbitrary CSS
- `GMZ-REQ-MKT-002` — Explicit separate marketing consent opt-in at checkout
- `GMZ-REQ-SEC-001..005`, `GMZ-REQ-OBS-001`, `GMZ-REQ-UX-001/002/006/008`, `GMZ-REQ-QA-001..005`

## OUT OF SCOPE

- AI-assisted theme generation (`GMZ-REQ-WEB-004`, Milestone 2), online payment gateways (deferred per `GMZ-CSD-002`), and POS counter coupling (`M05`).

## PREDECLARED CREDIT

Maximum after objective acceptance + merge + promotion:
- `GMZ-M11`: `12` (`12 / 18 — PARTIAL`)
- `GMZ-M06`: `2` (`9 / 16 — PARTIAL`)
- `GMZ-M04`: `3` (`9 / 15 — PARTIAL`)
- `GMZ-M23`: `1` (`11 / 19 — PARTIAL`)
- `GMZ-M26`: `1` (`17 / 18 — PARTIAL`)
- Increment max: `19 / 515` (`102 -> 121 / 515 = 23.50%`)

## STOP CONDITION

`GMZ_IMPL_011_READY_FOR_OBJECTIVE_AUDIT`
