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
const orgB = randomUUID();
const estA = randomUUID();
const estB = randomUUID();
const brA1 = randomUUID();
const brB1 = randomUUID();
const offerA1 = randomUUID();

function record(label) {
  checks.push(label);
  console.log(`PASS ${label}`);
}

async function seedDeliveryFixture(ownerAId, staffAId, ownerBId) {
  const prodId = randomUUID();
  const rOwnerA = randomUUID();
  const rStaffA = randomUUID();
  const rOwnerB = randomUUID();
  const mOwnerA = randomUUID();
  const mStaffA = randomUUID();
  const mOwnerB = randomUUID();

  await executeBatchSql(`
    INSERT INTO public.organizations (id, display_name)
      VALUES ('${orgA}', 'GMZ-010 Del Org A'), ('${orgB}', 'GMZ-010 Del Org B');
    INSERT INTO public.establishments (id, organization_id, display_name)
      VALUES ('${estA}', '${orgA}', 'Del Est A'), ('${estB}', '${orgB}', 'Del Est B');
    INSERT INTO public.branches (id, organization_id, establishment_id, display_name)
      VALUES ('${brA1}', '${orgA}', '${estA}', 'Del Br A1'), ('${brB1}', '${orgB}', '${estB}', 'Del Br B1');
    INSERT INTO public.tenant_roles (id, organization_id, role_key, display_name) VALUES
      ('${rOwnerA}', '${orgA}', 'owner', 'Owner'), ('${rStaffA}', '${orgA}', 'staff', 'Staff'), ('${rOwnerB}', '${orgB}', 'owner', 'Owner B');
    INSERT INTO public.organization_memberships (id, organization_id, user_id, status, default_establishment_id, default_branch_id) VALUES
      ('${mOwnerA}', '${orgA}', '${ownerAId}', 'active', '${estA}', '${brA1}'),
      ('${mStaffA}', '${orgA}', '${staffAId}', 'active', '${estA}', '${brA1}'),
      ('${mOwnerB}', '${orgB}', '${ownerBId}', 'active', '${estB}', '${brB1}');
    INSERT INTO public.membership_roles (id, organization_id, membership_id, role_id, scope_type, establishment_id, branch_id) VALUES
      ('${randomUUID()}', '${orgA}', '${mOwnerA}', '${rOwnerA}', 'organization', NULL, NULL),
      ('${randomUUID()}', '${orgA}', '${mStaffA}', '${rStaffA}', 'branch', '${estA}', '${brA1}'),
      ('${randomUUID()}', '${orgB}', '${mOwnerB}', '${rOwnerB}', 'organization', NULL, NULL);
    INSERT INTO public.products (id, organization_id, name, description, status)
      VALUES ('${prodId}', '${orgA}', 'Risoto Parmesão', 'Arroz arbóreo', 'active');
    INSERT INTO public.channel_offers (
      id, organization_id, establishment_id, branch_id, sales_channel_id,
      target_kind, product_id, base_price, currency, availability_state, is_visible, status
    ) VALUES (
      '${offerA1}', '${orgA}', '${estA}', '${brA1}',
      (SELECT id FROM public.sales_channels WHERE organization_id = '${orgA}' AND channel_key = 'goodz_online'),
      'product', '${prodId}', 25.00, 'BRL', 'available', true, 'active'
    );
    INSERT INTO public.setting_values (setting_key, scope_type, organization_id, establishment_id, branch_id, value_json)
      VALUES ('storefront.ordering_enabled', 'branch', '${orgA}', '${estA}', '${brA1}', to_jsonb(true));
  `);
}

async function cleanupDeliveryFixture() {
  const userList = [...createdUserIds].map((id) => `'${id}'`).join(", ");
  await executeBatchSql(`
    DELETE FROM private.delivery_step_up_consumptions
      WHERE guard_event_id IN (SELECT id FROM public.audit_events WHERE organization_id IN ('${orgA}', '${orgB}'));
    ALTER TABLE public.audit_events DISABLE TRIGGER audit_events_immutable;
    DELETE FROM public.audit_events WHERE organization_id IN ('${orgA}', '${orgB}');
    ALTER TABLE public.audit_events ENABLE TRIGGER audit_events_immutable;
    ALTER TABLE public.delivery_status_transitions DISABLE TRIGGER delivery_status_transitions_immutable;
    DELETE FROM public.deliveries WHERE organization_id IN ('${orgA}', '${orgB}');
    ALTER TABLE public.delivery_status_transitions ENABLE TRIGGER delivery_status_transitions_immutable;
    ALTER TABLE public.order_status_transitions DISABLE TRIGGER order_status_transitions_immutable;
    ALTER TABLE public.order_items DISABLE TRIGGER order_items_immutable;
    DELETE FROM public.orders WHERE organization_id IN ('${orgA}', '${orgB}');
    ALTER TABLE public.order_status_transitions ENABLE TRIGGER order_status_transitions_immutable;
    ALTER TABLE public.order_items ENABLE TRIGGER order_items_immutable;
    DELETE FROM public.delivery_zones WHERE organization_id IN ('${orgA}', '${orgB}');
    DELETE FROM public.customers WHERE organization_id IN ('${orgA}', '${orgB}');
    DELETE FROM public.channel_offers WHERE organization_id IN ('${orgA}', '${orgB}');
    DELETE FROM public.products WHERE organization_id IN ('${orgA}', '${orgB}');
    DELETE FROM public.setting_values WHERE organization_id IN ('${orgA}', '${orgB}');
    DELETE FROM public.organization_plan_subscriptions WHERE organization_id IN ('${orgA}', '${orgB}');
    DELETE FROM public.membership_roles WHERE organization_id IN ('${orgA}', '${orgB}');
    DELETE FROM public.organization_memberships WHERE organization_id IN ('${orgA}', '${orgB}');
    DELETE FROM public.role_permissions WHERE organization_id IN ('${orgA}', '${orgB}');
    DELETE FROM public.tenant_roles WHERE organization_id IN ('${orgA}', '${orgB}');
    DELETE FROM public.sales_channels WHERE organization_id IN ('${orgA}', '${orgB}');
    DELETE FROM public.branches WHERE organization_id IN ('${orgA}', '${orgB}');
    DELETE FROM public.establishments WHERE organization_id IN ('${orgA}', '${orgB}');
    DELETE FROM public.organizations WHERE id IN ('${orgA}', '${orgB}');
    ${userList ? `DELETE FROM auth.users WHERE id IN (${userList});` : ""}
  `).catch(() => undefined);
}

async function main() {
  const api = await getVerifiedLocalDataApi(record);
  try {
    const ownerA = await createDataApiUser(api, "gmz-010-del", "owner-a", createdUserIds);
    const staffA = await createDataApiUser(api, "gmz-010-del", "staff-a", createdUserIds);
    const ownerB = await createDataApiUser(api, "gmz-010-del", "owner-b", createdUserIds);
    await seedDeliveryFixture(ownerA.id, staffA.id, ownerB.id);
    record("Synthetic users and branch delivery fixtures seeded");

    const anonZones = await sendRestRequest(api, "delivery_zones?select=id");
    const anonDeliveries = await sendRestRequest(api, "deliveries?select=id");
    if (anonZones.ok || anonDeliveries.ok) throw new Error("Anon access to delivery tables must be denied.");
    record("Anon Data API access to delivery_zones and deliveries denied");

    const directPost = await sendRestRequest(api, "delivery_zones", {
      method: "POST",
      token: ownerA.accessToken,
      body: { organization_id: orgA, establishment_id: estA, branch_id: brA1, name: "Bypass" },
    });
    if (directPost.ok) throw new Error("Direct POST to delivery_zones must be denied.");
    record("Direct table write to delivery_zones denied");

    const staffZoneDenied = await sendRestRequest(api, "rpc/delivery_save_zone", {
      method: "POST",
      token: staffA.accessToken,
      body: {
        p_zone_id: null,
        p_organization_id: orgA,
        p_establishment_id: estA,
        p_branch_id: brA1,
        p_name: "Zona Staff",
        p_neighborhoods: ["Jardins"],
        p_delivery_fee_amount: "8.90",
        p_minimum_order_amount: "35.00",
        p_estimated_delivery_minutes: 40,
        p_status: "active",
        p_step_up_proof_id: randomUUID(),
        p_correlation_id: randomUUID(),
      },
    });
    if (staffZoneDenied.ok) throw new Error("Staff must not be allowed to save delivery zones.");
    record("Staff denied on delivery_save_zone RPC");

    const corrZone = randomUUID();
    const stepUpRes = await sendRestRequest(api, "rpc/append_delivery_step_up_event", {
      method: "POST",
      token: api.serviceRoleKey,
      body: {
        p_actor_user_id: ownerA.id,
        p_organization_id: orgA,
        p_establishment_id: estA,
        p_branch_id: brA1,
        p_target_id: brA1,
        p_required_permissions: ["delivery.zone.write"],
        p_correlation_id: corrZone,
        p_outcome: "allow",
        p_reason_code: "authorized",
      },
    });
    if (!stepUpRes.ok || typeof stepUpRes.payload !== "string") {
      throw new Error(`Expected delivery step-up proof UUID, got HTTP ${stepUpRes.status}.`);
    }

    const createZoneRes = await sendRestRequest(api, "rpc/delivery_save_zone", {
      method: "POST",
      token: ownerA.accessToken,
      body: {
        p_zone_id: null,
        p_organization_id: orgA,
        p_establishment_id: estA,
        p_branch_id: brA1,
        p_name: "Zona Jardins",
        p_neighborhoods: ["Jardins", "Pinheiros"],
        p_delivery_fee_amount: "8.90",
        p_minimum_order_amount: "35.00",
        p_estimated_delivery_minutes: 40,
        p_status: "active",
        p_step_up_proof_id: stepUpRes.payload,
        p_correlation_id: corrZone,
      },
    });
    if (!createZoneRes.ok || !createZoneRes.payload?.zone_id) {
      throw new Error(`Expected zone creation success, got HTTP ${createZoneRes.status}.`);
    }
    const zoneId = createZoneRes.payload.zone_id;
    record("Owner created Zona Jardins with Admin Guard single-use step-up proof");

    const tenantBRead = await sendRestRequest(api, `delivery_zones?organization_id=eq.${orgA}`, {
      token: ownerB.accessToken,
    });
    if (!tenantBRead.ok || !Array.isArray(tenantBRead.payload) || tenantBRead.payload.length !== 0) {
      throw new Error("Cross-tenant delivery_zones read must return empty set.");
    }
    record("Cross-tenant RLS isolation verified on delivery_zones");

    const belowMin = await sendRestRequest(api, "rpc/orders_place_staff", {
      method: "POST",
      token: staffA.accessToken,
      body: {
        p_organization_id: orgA,
        p_establishment_id: estA,
        p_branch_id: brA1,
        p_fulfillment_mode: "own_delivery",
        p_customer_name: "Abaixo Minimo",
        p_customer_phone: "11977770000",
        p_delivery_address: { street_line: "Alameda Lorena", number_label: "200", neighborhood: "Jardins", city: "São Paulo" },
        p_delivery_fee_amount: "8.90",
        p_declared_payment_method: "pix_in_person",
        p_cash_change_for: null,
        p_customer_notes: "",
        p_items: [{ channel_offer_id: offerA1, quantity: 1 }],
        p_idempotency_key: `below-min-${randomUUID()}`,
        p_correlation_id: randomUUID(),
        p_delivery_zone_id: zoneId,
      },
    });
    if (belowMin.ok) throw new Error("Order below minimum_order_amount must fail.");
    record("Order below zone minimum_order_amount rejected over Data API");

    const validOrder = await sendRestRequest(api, "rpc/orders_place_staff", {
      method: "POST",
      token: staffA.accessToken,
      body: {
        p_organization_id: orgA,
        p_establishment_id: estA,
        p_branch_id: brA1,
        p_fulfillment_mode: "own_delivery",
        p_customer_name: "Fernanda Jardins",
        p_customer_phone: "11977771111",
        p_delivery_address: { street_line: "Alameda Lorena", number_label: "500", neighborhood: "Jardins", city: "São Paulo" },
        p_delivery_fee_amount: "0.01",
        p_declared_payment_method: "pix_in_person",
        p_cash_change_for: null,
        p_customer_notes: "",
        p_items: [{ channel_offer_id: offerA1, quantity: 2 }],
        p_idempotency_key: `valid-del-${randomUUID()}`,
        p_correlation_id: randomUUID(),
        p_delivery_zone_id: zoneId,
      },
    });
    if (!validOrder.ok || !validOrder.payload?.order_id) {
      throw new Error(`Expected valid own_delivery order, got HTTP ${validOrder.status}.`);
    }
    const orderId = validOrder.payload.order_id;

    const delList = await sendRestRequest(api, `deliveries?order_id=eq.${orderId}&select=id,status,delivery_fee_snapshot`, {
      token: staffA.accessToken,
    });
    if (!delList.ok || delList.payload?.[0]?.status !== "preparing" || Number(delList.payload[0].delivery_fee_snapshot) !== 8.9) {
      throw new Error("Expected automatic deliveries row with authoritative 8.90 fee snapshot.");
    }
    const deliveryId = delList.payload[0].id;
    record("Authoritative zone fee (8.90) snapshotted and deliveries row created in preparing state");

    const steps = [
      ["ready_for_dispatch", ""],
      ["assigned", "Moto 07 · Rafael"],
      ["out_for_delivery", ""],
      ["delivered", ""],
    ];
    for (const [targetStatus, courier] of steps) {
      const stepRes = await sendRestRequest(api, "rpc/delivery_advance_dispatch", {
        method: "POST",
        token: staffA.accessToken,
        body: {
          p_delivery_id: deliveryId,
          p_to_status: targetStatus,
          p_courier_label: courier,
          p_reason: "",
          p_correlation_id: randomUUID(),
        },
      });
      if (!stepRes.ok || stepRes.payload?.status !== targetStatus) {
        throw new Error(`Failed dispatch transition to ${targetStatus}: HTTP ${stepRes.status}`);
      }
    }

    const finalOrder = await sendRestRequest(api, `orders?id=eq.${orderId}&select=status,total_amount`, {
      token: staffA.accessToken,
    });
    if (finalOrder.payload?.[0]?.status !== "completed" || Number(finalOrder.payload[0].total_amount) !== 58.9) {
      throw new Error("Expected parent order synchronized to completed with total 58.90.");
    }
    record("Full dispatch lifecycle synchronized parent order to completed (total BRL 58.90)");

    console.log(`DELIVERY DATA API INTEGRATION PASSED: ${checks.length}/${checks.length}`);
  } finally {
    await cleanupDeliveryFixture();
  }
}

await main();
