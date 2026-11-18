import { randomUUID } from "node:crypto";
import {
  createDataApiUser,
  executeBatchSql,
  getVerifiedLocalDataApi,
  sendRestRequest,
} from "./local-supabase-cli.mjs";

const createdUserIds = new Set();
const checks = [];

const ids = {
  organizations: { a: randomUUID(), b: randomUUID() },
  establishments: { a: randomUUID(), b: randomUUID() },
  branches: { a1: randomUUID(), a2: randomUUID(), b1: randomUUID() },
  roles: { ownerA: randomUUID(), staffA: randomUUID(), ownerB: randomUUID() },
  memberships: { ownerA: randomUUID(), staffA: randomUUID(), ownerB: randomUUID() },
  assignments: { ownerA: randomUUID(), staffA: randomUUID(), ownerB: randomUUID() },
  productA: randomUUID(),
  offerA1: randomUUID(),
};

function record(label) {
  checks.push(label);
  console.log(`PASS ${label}`);
}

async function main() {
  const api = await getVerifiedLocalDataApi(record);
  try {
    const ownerA = await createDataApiUser(api, "gmz-009-orders", "owner-a", createdUserIds);
    const staffA = await createDataApiUser(api, "gmz-009-orders", "staff-a", createdUserIds);
    const ownerB = await createDataApiUser(api, "gmz-009-orders", "owner-b", createdUserIds);
    record("Synthetic local Auth identities minted");

    await executeBatchSql(`
      INSERT INTO public.organizations (id, display_name) VALUES
        ('${ids.organizations.a}', 'GMZ-009 Orders Org A'),
        ('${ids.organizations.b}', 'GMZ-009 Orders Org B');
      INSERT INTO public.establishments (id, organization_id, display_name) VALUES
        ('${ids.establishments.a}', '${ids.organizations.a}', 'GMZ-009 Est A'),
        ('${ids.establishments.b}', '${ids.organizations.b}', 'GMZ-009 Est B');
      INSERT INTO public.branches (id, organization_id, establishment_id, display_name) VALUES
        ('${ids.branches.a1}', '${ids.organizations.a}', '${ids.establishments.a}', 'GMZ-009 Branch A1'),
        ('${ids.branches.a2}', '${ids.organizations.a}', '${ids.establishments.a}', 'GMZ-009 Branch A2'),
        ('${ids.branches.b1}', '${ids.organizations.b}', '${ids.establishments.b}', 'GMZ-009 Branch B1');
      INSERT INTO public.tenant_roles (id, organization_id, role_key, display_name) VALUES
        ('${ids.roles.ownerA}', '${ids.organizations.a}', 'owner', 'Owner A'),
        ('${ids.roles.staffA}', '${ids.organizations.a}', 'staff', 'Staff A'),
        ('${ids.roles.ownerB}', '${ids.organizations.b}', 'owner', 'Owner B');
      INSERT INTO public.organization_memberships (id, organization_id, user_id, status, default_establishment_id, default_branch_id) VALUES
        ('${ids.memberships.ownerA}', '${ids.organizations.a}', '${ownerA.id}', 'active', '${ids.establishments.a}', '${ids.branches.a1}'),
        ('${ids.memberships.staffA}', '${ids.organizations.a}', '${staffA.id}', 'active', '${ids.establishments.a}', '${ids.branches.a1}'),
        ('${ids.memberships.ownerB}', '${ids.organizations.b}', '${ownerB.id}', 'active', '${ids.establishments.b}', '${ids.branches.b1}');
      INSERT INTO public.membership_roles (id, organization_id, membership_id, role_id, scope_type, establishment_id, branch_id) VALUES
        ('${ids.assignments.ownerA}', '${ids.organizations.a}', '${ids.memberships.ownerA}', '${ids.roles.ownerA}', 'organization', NULL, NULL),
        ('${ids.assignments.staffA}', '${ids.organizations.a}', '${ids.memberships.staffA}', '${ids.roles.staffA}', 'branch', '${ids.establishments.a}', '${ids.branches.a1}'),
        ('${ids.assignments.ownerB}', '${ids.organizations.b}', '${ids.memberships.ownerB}', '${ids.roles.ownerB}', 'organization', NULL, NULL);
      INSERT INTO public.products (id, organization_id, name, description, status)
        VALUES ('${ids.productA}', '${ids.organizations.a}', 'Pizza Margherita', 'Molho artesanal', 'active');
      INSERT INTO public.channel_offers (
        id, organization_id, establishment_id, branch_id, sales_channel_id,
        target_kind, product_id, base_price, currency, availability_state, is_visible, status
      ) VALUES (
        '${ids.offerA1}', '${ids.organizations.a}', '${ids.establishments.a}', '${ids.branches.a1}',
        (SELECT id FROM public.sales_channels WHERE organization_id = '${ids.organizations.a}' AND channel_key = 'goodz_online'),
        'product', '${ids.productA}', 49.90, 'BRL', 'available', true, 'active'
      );
      INSERT INTO public.setting_values (setting_key, scope_type, organization_id, establishment_id, branch_id, value_json)
        VALUES ('storefront.ordering_enabled', 'branch', '${ids.organizations.a}', '${ids.establishments.a}', '${ids.branches.a1}', to_jsonb(true));
    `);
    record("Orders fixtures and catalog offer seeded");

    const anonRead = await sendRestRequest(api, "orders?select=id");
    if (anonRead.ok) throw new Error("Anon access to orders must be denied.");
    record("Anon Data API access to orders denied");

    const directWrite = await sendRestRequest(api, "orders", {
      method: "POST",
      token: ownerA.accessToken,
      body: { organization_id: ids.organizations.a },
    });
    if (directWrite.ok) throw new Error("Direct POST to orders table must be denied.");
    record("Direct table write to orders denied");

    const idemKey = `data-api-order-${randomUUID()}`;
    const placeFirst = await sendRestRequest(api, "rpc/orders_place_staff", {
      method: "POST",
      token: staffA.accessToken,
      body: {
        p_organization_id: ids.organizations.a,
        p_establishment_id: ids.establishments.a,
        p_branch_id: ids.branches.a1,
        p_fulfillment_mode: "own_delivery",
        p_customer_name: "Carlos Entrega",
        p_customer_phone: "11977776666",
        p_delivery_address: {
          street_line: "Av. Paulista",
          number_label: "1000",
          neighborhood: "Bela Vista",
          city: "São Paulo",
          state_code: "SP",
        },
        p_delivery_fee_amount: 8.5,
        p_declared_payment_method: "cash",
        p_cash_change_for: 100,
        p_customer_notes: "Interfone 12",
        p_items: [{ channel_offer_id: ids.offerA1, quantity: 1 }],
        p_idempotency_key: idemKey,
        p_correlation_id: randomUUID(),
      },
    });
    if (!placeFirst.ok || placeFirst.payload?.idempotent_replay !== false) {
      throw new Error(`Expected initial order placement success, got HTTP ${placeFirst.status}.`);
    }
    const orderId = placeFirst.payload.order_id;
    record("Staff placed own_delivery order with exact decimal fee and cash change");

    const placeReplay = await sendRestRequest(api, "rpc/orders_place_staff", {
      method: "POST",
      token: staffA.accessToken,
      body: {
        p_organization_id: ids.organizations.a,
        p_establishment_id: ids.establishments.a,
        p_branch_id: ids.branches.a1,
        p_fulfillment_mode: "own_delivery",
        p_customer_name: "Carlos Entrega",
        p_customer_phone: "11977776666",
        p_delivery_address: {
          street_line: "Av. Paulista",
          number_label: "1000",
          neighborhood: "Bela Vista",
          city: "São Paulo",
          state_code: "SP",
        },
        p_delivery_fee_amount: 8.5,
        p_declared_payment_method: "cash",
        p_cash_change_for: 100,
        p_customer_notes: "Interfone 12",
        p_items: [{ channel_offer_id: ids.offerA1, quantity: 1 }],
        p_idempotency_key: idemKey,
        p_correlation_id: randomUUID(),
      },
    });
    if (!placeReplay.ok || placeReplay.payload?.idempotent_replay !== true || placeReplay.payload?.order_id !== orderId) {
      throw new Error("Expected idempotent replay to return identical order_id.");
    }
    record("Idempotent replay over Data API returned identical order without duplication");

    async function transitionTo(nextStatus) {
      const stepRes = await sendRestRequest(api, "rpc/orders_transition_status", {
        method: "POST",
        token: staffA.accessToken,
        body: {
          p_order_id: orderId,
          p_to_status: nextStatus,
          p_reason: "",
          p_correlation_id: randomUUID(),
        },
      });
      if (!stepRes.ok) throw new Error(`Expected transition to ${nextStatus} to succeed.`);
    }
    await transitionTo("accepted");
    await transitionTo("preparing");
    await transitionTo("ready_for_dispatch");
    await transitionTo("out_for_delivery");
    await transitionTo("completed");
    record("Own-delivery lifecycle progressed placed -> accepted -> preparing -> ready_for_dispatch -> out_for_delivery -> completed");

    const collectRes = await sendRestRequest(api, "rpc/orders_record_handoff_payment", {
      method: "POST",
      token: staffA.accessToken,
      body: {
        p_order_id: orderId,
        p_payment_method: "cash",
        p_status: "collected",
        p_reason: "",
        p_step_up_proof_id: null,
        p_correlation_id: randomUUID(),
      },
    });
    if (!collectRes.ok) throw new Error("Expected handoff collection to succeed.");
    record("Handoff payment collected by authorized staff");

    const deniedReverse = await sendRestRequest(api, "rpc/orders_record_handoff_payment", {
      method: "POST",
      token: ownerA.accessToken,
      body: {
        p_order_id: orderId,
        p_payment_method: "cash",
        p_status: "reversed",
        p_reason: "Tentativa sem step-up",
        p_step_up_proof_id: null,
        p_correlation_id: randomUUID(),
      },
    });
    if (deniedReverse.ok) throw new Error("Handoff reversal without step-up proof must fail closed.");
    record("Handoff reversal without step-up proof denied");

    const corrRev = randomUUID();
    const mintProof = await sendRestRequest(api, "rpc/append_orders_step_up_event", {
      method: "POST",
      token: api.serviceRoleKey,
      body: {
        p_actor_user_id: ownerA.id,
        p_organization_id: ids.organizations.a,
        p_establishment_id: ids.establishments.a,
        p_branch_id: ids.branches.a1,
        p_order_id: orderId,
        p_required_permissions: ["orders.handoff_payment.sensitive"],
        p_correlation_id: corrRev,
        p_outcome: "allow",
        p_reason_code: "authorized",
      },
    });
    if (!mintProof.ok || typeof mintProof.payload !== "string") {
      throw new Error("Expected step-up proof UUID.");
    }

    const okReverse = await sendRestRequest(api, "rpc/orders_record_handoff_payment", {
      method: "POST",
      token: ownerA.accessToken,
      body: {
        p_order_id: orderId,
        p_payment_method: "cash",
        p_status: "reversed",
        p_reason: "Estorno confirmado com cliente",
        p_step_up_proof_id: mintProof.payload,
        p_correlation_id: corrRev,
      },
    });
    if (!okReverse.ok) throw new Error("Expected handoff reversal with proof to succeed.");
    record("Handoff reversal succeeded with single-use Admin Guard proof");

    const crossRead = await sendRestRequest(api, `orders?organization_id=eq.${ids.organizations.a}&select=id`, {
      token: ownerB.accessToken,
    });
    if (!crossRead.ok || !Array.isArray(crossRead.payload) || crossRead.payload.length !== 0) {
      throw new Error("Cross-tenant orders query must return 0 rows.");
    }
    record("Cross-tenant Data API SELECT on orders returns zero rows");

    console.log(`ALL ${checks.length} ORDERS DATA API CHECKS PASSED.`);
  } finally {
    const orgList = `'${ids.organizations.a}', '${ids.organizations.b}'`;
    const userList = [...createdUserIds].map((id) => `'${id}'`).join(", ");
    await executeBatchSql(`
      DELETE FROM private.orders_step_up_consumptions
      WHERE guard_event_id IN (SELECT id FROM public.audit_events WHERE organization_id IN (${orgList}));
      ALTER TABLE public.audit_events DISABLE TRIGGER audit_events_immutable;
      DELETE FROM public.audit_events WHERE organization_id IN (${orgList});
      ALTER TABLE public.audit_events ENABLE TRIGGER audit_events_immutable;
      ALTER TABLE public.order_handoff_payments DISABLE TRIGGER order_handoff_payments_immutable;
      ALTER TABLE public.order_status_transitions DISABLE TRIGGER order_status_transitions_immutable;
      ALTER TABLE public.order_items DISABLE TRIGGER order_items_immutable;
      DELETE FROM public.orders WHERE organization_id IN (${orgList});
      ALTER TABLE public.order_handoff_payments ENABLE TRIGGER order_handoff_payments_immutable;
      ALTER TABLE public.order_status_transitions ENABLE TRIGGER order_status_transitions_immutable;
      ALTER TABLE public.order_items ENABLE TRIGGER order_items_immutable;
      DELETE FROM public.customers WHERE organization_id IN (${orgList});
      DELETE FROM public.channel_offers WHERE organization_id IN (${orgList});
      DELETE FROM public.products WHERE organization_id IN (${orgList});
      DELETE FROM public.setting_values WHERE organization_id IN (${orgList});
      DELETE FROM public.organization_plan_subscriptions WHERE organization_id IN (${orgList});
      DELETE FROM public.membership_roles WHERE organization_id IN (${orgList});
      DELETE FROM public.organization_memberships WHERE organization_id IN (${orgList});
      DELETE FROM public.role_permissions WHERE organization_id IN (${orgList});
      DELETE FROM public.tenant_roles WHERE organization_id IN (${orgList});
      DELETE FROM public.sales_channels WHERE organization_id IN (${orgList});
      DELETE FROM public.branches WHERE organization_id IN (${orgList});
      DELETE FROM public.establishments WHERE organization_id IN (${orgList});
      DELETE FROM public.organizations WHERE id IN (${orgList});
      ${userList ? `DELETE FROM auth.users WHERE id IN (${userList});` : ""}
    `).catch(() => undefined);
  }
}

await main();
