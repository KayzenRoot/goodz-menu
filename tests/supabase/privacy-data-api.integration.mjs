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
const prodA = randomUUID();
const offerA = randomUUID();
const slugA = `bistro-lgpd-${randomUUID().slice(0, 8)}`;

function record(label) {
  checks.push(label);
  console.log(`PASS ${label}`);
}

async function seedPrivacyFixture(ownerAId, staffAId) {
  const roleOwner = randomUUID();
  const roleStaff = randomUUID();
  const memOwner = randomUUID();
  const memStaff = randomUUID();

  await executeBatchSql(`
    INSERT INTO public.organizations (id, display_name) VALUES ('${orgA}', 'GMZ-012 Privacy Org');
    INSERT INTO public.establishments (id, organization_id, display_name) VALUES ('${estA}', '${orgA}', 'Matriz Privacidade');
    INSERT INTO public.branches (id, organization_id, establishment_id, display_name) VALUES ('${brA1}', '${orgA}', '${estA}', 'Unidade Paulista');
    INSERT INTO public.tenant_roles (id, organization_id, role_key, display_name) VALUES
      ('${roleOwner}', '${orgA}', 'owner', 'Owner'),
      ('${roleStaff}', '${orgA}', 'staff', 'Staff');
    INSERT INTO public.organization_memberships (id, organization_id, user_id, status, default_establishment_id, default_branch_id) VALUES
      ('${memOwner}', '${orgA}', '${ownerAId}', 'active', '${estA}', '${brA1}'),
      ('${memStaff}', '${orgA}', '${staffAId}', 'active', '${estA}', '${brA1}');
    INSERT INTO public.membership_roles (id, organization_id, membership_id, role_id, scope_type, establishment_id, branch_id) VALUES
      ('${randomUUID()}', '${orgA}', '${memOwner}', '${roleOwner}', 'organization', NULL, NULL),
      ('${randomUUID()}', '${orgA}', '${memStaff}', '${roleStaff}', 'branch', '${estA}', '${brA1}');
    INSERT INTO public.products (id, organization_id, name, description, status)
      VALUES ('${prodA}', '${orgA}', 'Ravioli Artesanal', 'Manteiga e sálvia', 'active');
    INSERT INTO public.channel_offers (
      id, organization_id, establishment_id, branch_id, sales_channel_id,
      target_kind, product_id, base_price, currency, availability_state, is_visible, status
    ) VALUES (
      '${offerA}', '${orgA}', '${estA}', '${brA1}',
      (SELECT id FROM public.sales_channels WHERE organization_id = '${orgA}' AND channel_key = 'goodz_online'),
      'product', '${prodA}', 38.50, 'BRL', 'available', true, 'active'
    );
    INSERT INTO public.setting_values (setting_key, scope_type, organization_id, establishment_id, branch_id, value_json)
      VALUES ('storefront.ordering_enabled', 'branch', '${orgA}', '${estA}', '${brA1}', to_jsonb(true));
    INSERT INTO public.storefront_profiles (
      organization_id, establishment_id, branch_id, public_slug, headline, is_published
    ) VALUES ('${orgA}', '${estA}', '${brA1}', '${slugA}', 'Bistrô Paulista Online', true);
  `);
}

async function cleanupPrivacyFixture() {
  const userSql = [...createdUserIds].map((id) => `'${id}'`).join(", ");
  await executeBatchSql(`
    DELETE FROM private.privacy_step_up_consumptions
      WHERE guard_event_id IN (SELECT id FROM public.audit_events WHERE organization_id = '${orgA}');
    DELETE FROM private.order_public_tracking_tokens WHERE organization_id = '${orgA}';
    ALTER TABLE public.audit_events DISABLE TRIGGER audit_events_immutable;
    DELETE FROM public.audit_events WHERE organization_id = '${orgA}';
    ALTER TABLE public.audit_events ENABLE TRIGGER audit_events_immutable;
    ALTER TABLE public.order_handoff_payments DISABLE TRIGGER order_handoff_payments_immutable;
    ALTER TABLE public.order_status_transitions DISABLE TRIGGER order_status_transitions_immutable;
    ALTER TABLE public.order_items DISABLE TRIGGER order_items_immutable;
    DELETE FROM public.orders WHERE organization_id = '${orgA}';
    ALTER TABLE public.order_handoff_payments ENABLE TRIGGER order_handoff_payments_immutable;
    ALTER TABLE public.order_status_transitions ENABLE TRIGGER order_status_transitions_immutable;
    ALTER TABLE public.order_items ENABLE TRIGGER order_items_immutable;
    DELETE FROM public.storefront_profiles WHERE organization_id = '${orgA}';
    ALTER TABLE public.customer_consents DISABLE TRIGGER customer_consents_immutable;
    DELETE FROM public.customers WHERE organization_id = '${orgA}';
    ALTER TABLE public.customer_consents ENABLE TRIGGER customer_consents_immutable;
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

async function advanceOrderStep(api, token, orderId, toStatus) {
  const res = await sendRestRequest(api, "rpc/orders_transition_status", {
    method: "POST",
    token,
    body: {
      p_order_id: orderId,
      p_to_status: toStatus,
      p_reason: "",
      p_correlation_id: randomUUID(),
    },
  });
  if (!res.ok) throw new Error(`Failed advancing order to ${toStatus}: HTTP ${res.status}`);
}

async function main() {
  const api = await getVerifiedLocalDataApi(record);
  try {
    const ownerA = await createDataApiUser(api, "gmz-012-priv", "owner-a", createdUserIds);
    const staffA = await createDataApiUser(api, "gmz-012-priv", "staff-a", createdUserIds);
    await seedPrivacyFixture(ownerA.id, staffA.id);
    record("Privacy LGPD fixtures seeded");

    const checkoutRes = await sendRestRequest(api, "rpc/storefront_place_public_order", {
      method: "POST",
      body: {
        p_slug: slugA,
        p_fulfillment_mode: "pickup",
        p_customer_name: "Fernanda Costa",
        p_customer_phone: "11977776666",
        p_delivery_address: null,
        p_delivery_zone_id: null,
        p_declared_payment_method: "pix_in_person",
        p_cash_change_for: null,
        p_customer_notes: "",
        p_marketing_opt_in: true,
        p_items: [{ channel_offer_id: offerA, quantity: 2 }],
        p_idempotency_key: `priv-idem-${randomUUID()}`,
        p_correlation_id: randomUUID(),
      },
    });
    if (!checkoutRes.ok || !checkoutRes.payload?.order_id) {
      throw new Error(`Public checkout failed: HTTP ${checkoutRes.status}`);
    }
    const orderId = checkoutRes.payload.order_id;
    record("Public checkout with marketing opt-in succeeded");

    const staffList = await sendRestRequest(api, "rpc/privacy_list_customers", {
      method: "POST",
      token: staffA.accessToken,
      body: { p_organization_id: orgA, p_retention_days: 365 },
    });
    if (staffList.ok) throw new Error("Branch staff must be denied on privacy_list_customers.");
    record("Branch staff denied on privacy_list_customers");

    const ownerList = await sendRestRequest(api, "rpc/privacy_list_customers", {
      method: "POST",
      token: ownerA.accessToken,
      body: { p_organization_id: orgA, p_retention_days: 365 },
    });
    if (!ownerList.ok || !Array.isArray(ownerList.payload) || ownerList.payload.length !== 1) {
      throw new Error(`Owner privacy_list_customers failed: HTTP ${ownerList.status}`);
    }
    const customerId = ownerList.payload[0].customer_id;
    record("Owner listed organization customer retention status");

    const exportProofRes = await sendRestRequest(api, "rpc/append_privacy_step_up_event", {
      method: "POST",
      token: api.serviceRoleKey,
      body: {
        p_actor_user_id: ownerA.id,
        p_organization_id: orgA,
        p_customer_id: customerId,
        p_required_permissions: ["privacy.manage"],
        p_correlation_id: randomUUID(),
        p_outcome: "allow",
        p_reason_code: "authorized",
      },
    });
    const exportRes = await sendRestRequest(api, "rpc/privacy_export_customer_data", {
      method: "POST",
      token: ownerA.accessToken,
      body: {
        p_organization_id: orgA,
        p_customer_id: customerId,
        p_step_up_proof_id: exportProofRes.payload,
        p_correlation_id: randomUUID(),
      },
    });
    if (!exportRes.ok || exportRes.payload?.subject?.display_name !== "Fernanda Costa") {
      throw new Error(`privacy_export_customer_data failed: HTTP ${exportRes.status}`);
    }
    record("Owner exported LGPD customer package via single-use Admin Guard proof");

    await advanceOrderStep(api, staffA.accessToken, orderId, "accepted");
    await advanceOrderStep(api, staffA.accessToken, orderId, "preparing");
    await advanceOrderStep(api, staffA.accessToken, orderId, "ready_for_pickup");
    await advanceOrderStep(api, staffA.accessToken, orderId, "completed");

    const payRes = await sendRestRequest(api, "rpc/orders_record_handoff_payment", {
      method: "POST",
      token: staffA.accessToken,
      body: {
        p_order_id: orderId,
        p_payment_method: "pix_in_person",
        p_status: "collected",
        p_reason: "Pix presencial",
        p_step_up_proof_id: null,
        p_correlation_id: randomUUID(),
      },
    });
    if (!payRes.ok) throw new Error(`Failed recording handoff payment: HTTP ${payRes.status}`);

    const anonProofRes = await sendRestRequest(api, "rpc/append_privacy_step_up_event", {
      method: "POST",
      token: api.serviceRoleKey,
      body: {
        p_actor_user_id: ownerA.id,
        p_organization_id: orgA,
        p_customer_id: customerId,
        p_required_permissions: ["privacy.manage"],
        p_correlation_id: randomUUID(),
        p_outcome: "allow",
        p_reason_code: "authorized",
      },
    });
    const anonRes = await sendRestRequest(api, "rpc/privacy_anonymize_customer", {
      method: "POST",
      token: ownerA.accessToken,
      body: {
        p_organization_id: orgA,
        p_customer_id: customerId,
        p_reason: "Solicitação do titular Art. 18 LGPD",
        p_step_up_proof_id: anonProofRes.payload,
        p_correlation_id: randomUUID(),
      },
    });
    if (!anonRes.ok || anonRes.payload?.anonymized !== true) {
      throw new Error(`privacy_anonymize_customer failed: HTTP ${anonRes.status}`);
    }

    const orderVerify = await sendRestRequest(api, `orders?id=eq.${orderId}&select=total_amount,customer_name_snapshot`, {
      token: ownerA.accessToken,
    });
    const orderRow = orderVerify.payload?.[0];
    if (
      !orderVerify.ok
      || Number(orderRow?.total_amount).toFixed(2) !== "77.00"
      || orderRow?.customer_name_snapshot !== "Titular Anonimizado (LGPD)"
    ) {
      throw new Error(`Order financial preservation check failed: HTTP ${orderVerify.status}`);
    }
    record("LGPD anonymization scrubbed PII while preserving exact 77.00 BRL order total");

    console.log(`PRIVACY DATA API INTEGRATION PASSED: ${checks.length}/${checks.length}`);
  } finally {
    await cleanupPrivacyFixture();
  }
}

await main();
