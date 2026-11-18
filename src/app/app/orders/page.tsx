import { AuthFrame } from "@/components/goodz/auth-frame";
import { OrdersPanel, type OrderAvailableOfferOption, type OrderDeliveryZoneOption } from "@/components/goodz/orders-panel";
import type { ServerSupabaseClient } from "@/lib/supabase/auth-session";
import { resolveBranchConsoleSessionContext } from "@/lib/supabase/branch-console-context.server";
import type { Database } from "@/lib/supabase/database.types";

export const dynamic = "force-dynamic";

type PageProps = Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>;

export default async function OrdersPage({ searchParams }: PageProps) {
  const ctx = await resolveBranchConsoleSessionContext(searchParams, "/app/orders");

  if (!ctx.selectedOrganizationId || !ctx.selectedBranch) {
    return (
      <AuthFrame wide>
        <OrdersPanel
          supabaseUrl={ctx.supabaseUrl}
          anonKey={ctx.anonKey}
          tenants={ctx.tenants}
          branches={ctx.branches}
          selectedOrganizationId={ctx.selectedOrganizationId}
          selectedBranchId=""
          selectedEstablishmentId=""
          verifiedFactorIds={[]}
          canReadOrders={false}
          canWriteOrders={false}
          canCancelOrders={false}
          canWriteHandoff={false}
          canWriteSensitiveHandoff={false}
          orderingEnabled={false}
          loadFailed={!ctx.entryOk}
          availableOffers={[]}
          deliveryZones={[]}
          orders={[]}
          items={[]}
          transitions={[]}
          handoffPayments={[]}
        />
      </AuthFrame>
    );
  }

  const queueData = await loadOrdersBranchData(
    ctx.client,
    ctx.selectedOrganizationId,
    ctx.selectedBranch.establishmentId,
    ctx.selectedBranch.id,
  );

  return (
    <AuthFrame wide>
      <OrdersPanel
        supabaseUrl={ctx.supabaseUrl}
        anonKey={ctx.anonKey}
        tenants={ctx.tenants}
        branches={ctx.branches}
        selectedOrganizationId={ctx.selectedOrganizationId}
        selectedBranchId={ctx.selectedBranch.id}
        selectedEstablishmentId={ctx.selectedBranch.establishmentId}
        verifiedFactorIds={ctx.verifiedFactorIds}
        canReadOrders={queueData.canReadOrders}
        canWriteOrders={queueData.canWriteOrders}
        canCancelOrders={queueData.canCancelOrders}
        canWriteHandoff={queueData.canWriteHandoff}
        canWriteSensitiveHandoff={queueData.canWriteSensitiveHandoff}
        orderingEnabled={queueData.orderingEnabled}
        loadFailed={queueData.failed || !ctx.entryOk}
        availableOffers={queueData.availableOffers}
        deliveryZones={queueData.deliveryZones}
        orders={queueData.orders}
        items={queueData.items}
        transitions={queueData.transitions}
        handoffPayments={queueData.handoffPayments}
      />
    </AuthFrame>
  );
}

async function loadOrdersBranchData(
  client: ServerSupabaseClient,
  organizationId: string,
  establishmentId: string,
  branchId: string,
) {
  const [readPerm, writePerm, cancelPerm, handoffPerm, sensitivePerm] = await Promise.all([
    checkOrdersPermission(client, organizationId, establishmentId, branchId, "orders.read"),
    checkOrdersPermission(client, organizationId, establishmentId, branchId, "orders.write"),
    checkOrdersPermission(client, organizationId, establishmentId, branchId, "orders.cancel"),
    checkOrdersPermission(client, organizationId, establishmentId, branchId, "orders.handoff_payment.write"),
    checkOrdersPermission(client, organizationId, establishmentId, branchId, "orders.handoff_payment.sensitive"),
  ]);

  if (!readPerm.allowed) {
    return {
      canReadOrders: false,
      canWriteOrders: false,
      canCancelOrders: false,
      canWriteHandoff: false,
      canWriteSensitiveHandoff: false,
      orderingEnabled: false,
      failed: [readPerm, writePerm, cancelPerm, handoffPerm, sensitivePerm].some(({ failed }) => failed),
      availableOffers: [],
      deliveryZones: [],
      orders: [],
      items: [],
      transitions: [],
      handoffPayments: [],
    };
  }

  const [ordersRes, settingsRes, offersList, zonesRes] = await Promise.all([
    client.from("orders")
      .select("id,organization_id,establishment_id,branch_id,order_number,fulfillment_mode,status,currency,subtotal_amount,delivery_fee_amount,total_amount,declared_payment_method,cash_change_for_amount,handoff_payment_status,customer_name_snapshot,customer_phone_snapshot,delivery_address_snapshot,customer_notes,cancellation_reason,placed_at")
      .eq("organization_id", organizationId)
      .eq("branch_id", branchId)
      .order("placed_at", { ascending: false })
      .limit(100),
    client.rpc("resolve_effective_settings", {
      p_organization_id: organizationId,
      p_establishment_id: establishmentId,
      p_branch_id: branchId,
    }),
    loadAvailableGoodzOnlineOffers(client, organizationId, establishmentId, branchId),
    client.from("delivery_zones")
      .select("id,name,neighborhoods,delivery_fee_amount,minimum_order_amount,estimated_delivery_minutes")
      .eq("organization_id", organizationId)
      .eq("branch_id", branchId)
      .eq("status", "active")
      .order("name", { ascending: true }),
  ]);

  const orders = ordersRes.data ?? [];
  const orderIds = orders.map(({ id }) => id);
  const [itemsRes, transitionsRes, handoffRes] = orderIds.length > 0
    ? await Promise.all([
        client.from("order_items")
          .select("id,order_id,line_number,display_name_snapshot,quantity,unit_price_snapshot,line_total_amount,notes")
          .eq("organization_id", organizationId)
          .in("order_id", orderIds)
          .order("line_number", { ascending: true }),
        client.from("order_status_transitions")
          .select("id,order_id,from_status,to_status,actor_kind,reason,created_at")
          .eq("organization_id", organizationId)
          .in("order_id", orderIds)
          .order("created_at", { ascending: true }),
        client.from("order_handoff_payments")
          .select("id,order_id,payment_method,amount,status,reason,created_at")
          .eq("organization_id", organizationId)
          .in("order_id", orderIds)
          .order("created_at", { ascending: false }),
      ])
    : [{ data: [], error: null }, { data: [], error: null }, { data: [], error: null }];

  const orderingSetting = (settingsRes.data ?? []).find((row) => row.setting_key === "storefront.ordering_enabled");
  const queriesFailed = Boolean(
    ordersRes.error || settingsRes.error || zonesRes.error || itemsRes.error || transitionsRes.error || handoffRes.error,
  );
  const deliveryZones: OrderDeliveryZoneOption[] = (zonesRes.data ?? []).map((zone) => ({
    id: zone.id,
    name: zone.name,
    neighborhoods: zone.neighborhoods,
    deliveryFeeAmount: zone.delivery_fee_amount,
    minimumOrderAmount: zone.minimum_order_amount,
    estimatedMinutes: zone.estimated_delivery_minutes,
  }));

  return {
    canReadOrders: true,
    canWriteOrders: writePerm.allowed,
    canCancelOrders: cancelPerm.allowed,
    canWriteHandoff: handoffPerm.allowed,
    canWriteSensitiveHandoff: sensitivePerm.allowed,
    orderingEnabled: orderingSetting?.effective_value === true,
    failed: queriesFailed || [readPerm, writePerm, cancelPerm, handoffPerm, sensitivePerm].some(({ failed }) => failed),
    availableOffers: offersList,
    deliveryZones,
    orders,
    items: itemsRes.data ?? [],
    transitions: transitionsRes.data ?? [],
    handoffPayments: handoffRes.data ?? [],
  };
}

async function loadAvailableGoodzOnlineOffers(
  client: ServerSupabaseClient,
  organizationId: string,
  establishmentId: string,
  branchId: string,
): Promise<OrderAvailableOfferOption[]> {
  const { data, error } = await client.rpc("orders_list_available_offers", {
    p_organization_id: organizationId,
    p_establishment_id: establishmentId,
    p_branch_id: branchId,
  });
  if (error || !data) return [];
  return data.map((row) => ({
    id: row.offer_id,
    label: row.display_label,
    basePrice: row.base_price,
  }));
}

type OrdersPermissionKey =
  | "orders.read"
  | "orders.write"
  | "orders.cancel"
  | "orders.handoff_payment.write"
  | "orders.handoff_payment.sensitive";

async function checkOrdersPermission(
  client: ServerSupabaseClient,
  organizationId: string,
  establishmentId: string,
  branchId: string,
  permission: OrdersPermissionKey,
): Promise<Readonly<{ allowed: boolean; failed: boolean }>> {
  const args = {
    p_organization_id: organizationId,
    p_establishment_id: establishmentId,
    p_branch_id: branchId,
    p_permission_key: permission,
  } as unknown as Database["public"]["Functions"]["orders_has_permission"]["Args"];
  try {
    const { data, error } = await client.rpc("orders_has_permission", args);
    return { allowed: !error && data === true, failed: !!error };
  } catch {
    return { allowed: false, failed: true };
  }
}
