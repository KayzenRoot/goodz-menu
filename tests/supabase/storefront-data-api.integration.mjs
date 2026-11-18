import { randomUUID } from "node:crypto";
import {
  createDataApiUser,
  executeBatchSql,
  getVerifiedLocalDataApi,
  sendRestRequest,
} from "./local-supabase-cli.mjs";

const createdUserIds = new Set();
const checks = [];

const orgA = randomUUID();
const estA = randomUUID();
const brA1 = randomUUID();
const prodAvail = randomUUID();
const offerAvail = randomUUID();
const zoneA1 = randomUUID();
const slugA = `bistro-online-${randomUUID().slice(0, 8)}`;

function record(label) {
  checks.push(label);
  console.log(`PASS ${label}`);
}

async function seedStorefrontFixture(ownerAId) {
  const roleOwner = randomUUID();
  const memOwner = randomUUID();

  await executeBatchSql(`
    INSERT INTO public.organizations (id, display_name) VALUES ('${orgA}', 'GMZ-011 Storefront Org');
    INSERT INTO public.establishments (id, organization_id, display_name) VALUES ('${estA}', '${orgA}', 'Est Storefront');
    INSERT INTO public.branches (id, organization_id, establishment_id, display_name) VALUES ('${brA1}', '${orgA}', '${estA}', 'Unidade Pinheiros');
    INSERT INTO public.tenant_roles (id, organization_id, role_key, display_name) VALUES ('${roleOwner}', '${orgA}', 'owner', 'Owner');
    INSERT INTO public.organization_memberships (id, organization_id, user_id, status, default_establishment_id, default_branch_id)
      VALUES ('${memOwner}', '${orgA}', '${ownerAId}', 'active', '${estA}', '${brA1}');
    INSERT INTO public.membership_roles (id, organization_id, membership_id, role_id, scope_type)
      VALUES ('${randomUUID()}', '${orgA}', '${memOwner}', '${roleOwner}', 'organization');
    INSERT INTO public.products (id, organization_id, name, description, status)
      VALUES ('${prodAvail}', '${orgA}', 'Focaccia Rosmarino', 'Azeite extravirgem', 'active');
    INSERT INTO public.channel_offers (
      id, organization_id, establishment_id, branch_id, sales_channel_id,
      target_kind, product_id, base_price, currency, availability_state, is_visible, status
    ) VALUES (
      '${offerAvail}', '${orgA}', '${estA}', '${brA1}',
      (SELECT id FROM public.sales_channels WHERE organization_id = '${orgA}' AND channel_key = 'goodz_online'),
      'product', '${prodAvail}', 34.50, 'BRL', 'available', true, 'active'
    );
    INSERT INTO public.delivery_zones (
      id, organization_id, establishment_id, branch_id, name, neighborhoods, delivery_fee_amount, minimum_order_amount, estimated_delivery_minutes
    ) VALUES ('${zoneA1}', '${orgA}', '${estA}', '${brA1}', 'Raio Pinheiros', ARRAY['Pinheiros'], 6.00, 30.00, 35);
    INSERT INTO public.setting_values (setting_key, scope_type, organization_id, establishment_id, branch_id, value_json)
      VALUES ('storefront.ordering_enabled', 'branch', '${orgA}', '${estA}', '${brA1}', to_jsonb(true));
  `);
}

async function cleanupStorefrontFixture() {
  const userSql = [...createdUserIds].map((id) => `'${id}'`).join(", ");
  await executeBatchSql(`
    DELETE FROM private.storefront_step_up_consumptions
      WHERE guard_event_id IN (SELECT id FROM public.audit_events WHERE organization_id = '${orgA}');
    DELETE FROM private.order_public_tracking_tokens WHERE organization_id = '${orgA}';
    ALTER TABLE public.audit_events DISABLE TRIGGER audit_events_immutable;
    DELETE FROM public.audit_events WHERE organization_id = '${orgA}';
    ALTER TABLE public.audit_events ENABLE TRIGGER audit_events_immutable;
    ALTER TABLE public.delivery_status_transitions DISABLE TRIGGER delivery_status_transitions_immutable;
    DELETE FROM public.deliveries WHERE organization_id = '${orgA}';
    ALTER TABLE public.delivery_status_transitions ENABLE TRIGGER delivery_status_transitions_immutable;
    ALTER TABLE public.order_status_transitions DISABLE TRIGGER order_status_transitions_immutable;
    ALTER TABLE public.order_items DISABLE TRIGGER order_items_immutable;
    DELETE FROM public.orders WHERE organization_id = '${orgA}';
    ALTER TABLE public.order_status_transitions ENABLE TRIGGER order_status_transitions_immutable;
    ALTER TABLE public.order_items ENABLE TRIGGER order_items_immutable;
    DELETE FROM public.storefront_profiles WHERE organization_id = '${orgA}';
    UPDATE public.products SET primary_media_asset_id = NULL WHERE organization_id = '${orgA}';
    DELETE FROM public.media_assets WHERE organization_id = '${orgA}';
    DELETE FROM public.delivery_zones WHERE organization_id = '${orgA}';
    DELETE FROM public.customers WHERE organization_id = '${orgA}';
    DELETE FROM public.channel_offers WHERE organization_id = '${orgA}';
    DELETE FROM public.products WHERE organization_id = '${orgA}';
    DELETE FROM public.setting_values WHERE organization_id = '${orgA}';
    DELETE FROM public.organization_plan_subscriptions WHERE organization_id = '${orgA}';
    DELETE FROM public.membership_roles WHERE organization_id = '${orgA}';
    DELETE FROM public.organization_memberships WHERE organization_id = '${orgA}';
    DELETE FROM public.role_permissions WHERE organization_id = '${orgA}';
    DELETE FROM public.tenant_roles WHERE organization_id = '${orgA}';
    DELETE FROM public.sales_channels WHERE organization_id = '${orgA}';
    DELETE FROM public.branches WHERE organization_id = '${orgA}';
    DELETE FROM public.establishments WHERE organization_id = '${orgA}';
    DELETE FROM public.organizations WHERE id = '${orgA}';
    ${userSql ? `DELETE FROM auth.users WHERE id IN (${userSql});` : ""}
  `).catch(() => undefined);
}

async function main() {
  const api = await getVerifiedLocalDataApi(record);
  try {
    const ownerA = await createDataApiUser(api, "gmz-011-sf", "owner-a", createdUserIds);
    await seedStorefrontFixture(ownerA.id);
    record("Storefront fixtures seeded");

    const anonTableRead = await sendRestRequest(api, "storefront_profiles?select=id");
    const anonMediaRead = await sendRestRequest(api, "media_assets?select=id");
    if (anonTableRead.ok || anonMediaRead.ok) {
      throw new Error("Direct anon table access on storefront_profiles/media_assets must be denied.");
    }
    record("Anon direct table access on storefront_profiles and media_assets denied");

    const mediaRes = await sendRestRequest(api, "rpc/catalog_register_product_media", {
      method: "POST",
      token: ownerA.accessToken,
      body: {
        p_organization_id: orgA,
        p_establishment_id: estA,
        p_branch_id: brA1,
        p_product_id: prodAvail,
        p_provider_key: "external_https",
        p_storage_key: "catalog/focaccia.webp",
        p_canonical_url: "https://cdn.example.invalid/catalog/focaccia.webp",
        p_mime_type: "image/webp",
        p_alt_text: "Focaccia artesanal dourada com alecrim",
        p_width_px: 800,
        p_height_px: 600,
        p_correlation_id: randomUUID(),
      },
    });
    if (!mediaRes.ok || !mediaRes.payload?.media_asset_id) {
      throw new Error(`Expected media registration success, got HTTP ${mediaRes.status}`);
    }
    record("Provider-agnostic MediaAsset registered and linked to canonical product");

    const corrProf = randomUUID();
    const stepUpRes = await sendRestRequest(api, "rpc/append_storefront_step_up_event", {
      method: "POST",
      token: api.serviceRoleKey,
      body: {
        p_actor_user_id: ownerA.id,
        p_organization_id: orgA,
        p_establishment_id: estA,
        p_branch_id: brA1,
        p_target_id: brA1,
        p_required_permissions: ["storefront.write"],
        p_correlation_id: corrProf,
        p_outcome: "allow",
        p_reason_code: "authorized",
      },
    });
    if (!stepUpRes.ok || typeof stepUpRes.payload !== "string") {
      throw new Error("Failed to mint storefront step-up proof.");
    }

    const profRes = await sendRestRequest(api, "rpc/storefront_save_profile", {
      method: "POST",
      token: ownerA.accessToken,
      body: {
        p_organization_id: orgA,
        p_establishment_id: estA,
        p_branch_id: brA1,
        p_public_slug: slugA,
        p_headline: "Forno Artesanal Pinheiros",
        p_subheadline: "Fermentação natural todos os dias",
        p_layout_family: "editorial_bistro",
        p_accent_preset: "terracotta_oven",
        p_card_style: "elevated_glass",
        p_hero_media_asset_id: mediaRes.payload.media_asset_id,
        p_is_published: true,
        p_step_up_proof_id: stepUpRes.payload,
        p_correlation_id: corrProf,
      },
    });
    if (!profRes.ok || profRes.payload?.public_slug !== slugA) {
      throw new Error(`Expected storefront profile publish, got HTTP ${profRes.status}`);
    }
    record("Storefront profile published with safe theme schema and Admin Guard proof");

    const menuRes = await sendRestRequest(api, "rpc/storefront_get_public_menu", {
      method: "POST",
      body: { p_slug: slugA },
    });
    if (!menuRes.ok || menuRes.payload?.offers?.length !== 1 || !menuRes.payload.offers[0].media?.url) {
      throw new Error("Expected public anon menu bundle with 1 available offer and media metadata.");
    }
    record("Public anon menu RPC returned available offers, media variant, and delivery zones");

    const checkoutRes = await sendRestRequest(api, "rpc/storefront_place_public_order", {
      method: "POST",
      body: {
        p_slug: slugA,
        p_fulfillment_mode: "own_delivery",
        p_customer_name: "Camila Ferreira",
        p_customer_phone: "11955554444",
        p_delivery_address: { street_line: "Rua dos Pinheiros", number_label: "300", neighborhood: "Pinheiros", city: "São Paulo" },
        p_delivery_zone_id: zoneA1,
        p_declared_payment_method: "cash",
        p_cash_change_for: "50.00",
        p_customer_notes: "",
        p_marketing_opt_in: true,
        p_items: [{ channel_offer_id: offerAvail, quantity: 1 }],
        p_idempotency_key: `pub-api-${randomUUID()}`,
        p_correlation_id: randomUUID(),
      },
    });
    if (!checkoutRes.ok || typeof checkoutRes.payload?.tracking_token !== "string") {
      throw new Error(`Expected public order checkout success, got HTTP ${checkoutRes.status}`);
    }
    const trackingToken = checkoutRes.payload.tracking_token;
    record("Public anon checkout created canonical order + delivery and returned capability token");

    const trackValid = await sendRestRequest(api, "rpc/storefront_get_order_tracking", {
      method: "POST",
      body: { p_slug: slugA, p_tracking_token: trackingToken },
    });
    const trackedTotal = Number(trackValid.payload?.total_amount).toFixed(2);
    if (!trackValid.ok || trackValid.payload?.customer_first_name !== "Camila" || trackedTotal !== "40.50") {
      throw new Error("Expected valid capability token tracking payload with total 40.50.");
    }

    const trackInvalid = await sendRestRequest(api, "rpc/storefront_get_order_tracking", {
      method: "POST",
      body: { p_slug: slugA, p_tracking_token: "1".repeat(48) },
    });
    if (trackInvalid.payload !== null) {
      throw new Error("Invalid tracking token must return null.");
    }
    record("Capability-token order tracking verified (PII minimized, forged token denied)");

    console.log(`STOREFRONT DATA API INTEGRATION PASSED: ${checks.length}/${checks.length}`);
  } finally {
    await cleanupStorefrontFixture();
  }
}

await main();
