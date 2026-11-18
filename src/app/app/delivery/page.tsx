import { AuthFrame } from "@/components/goodz/auth-frame";
import { DeliveryPanel } from "@/components/goodz/delivery-panel";
import type { ServerSupabaseClient } from "@/lib/supabase/auth-session";
import { resolveBranchConsoleSessionContext } from "@/lib/supabase/branch-console-context.server";
import type { Database } from "@/lib/supabase/database.types";

export const dynamic = "force-dynamic";

type PageProps = Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>;

export default async function DeliveryPage({ searchParams }: PageProps) {
  const ctx = await resolveBranchConsoleSessionContext(searchParams, "/app/delivery");

  if (!ctx.selectedOrganizationId || !ctx.selectedBranch) {
    return (
      <AuthFrame wide>
        <DeliveryPanel
          supabaseUrl={ctx.supabaseUrl}
          anonKey={ctx.anonKey}
          tenants={ctx.tenants}
          branches={ctx.branches}
          selectedOrganizationId={ctx.selectedOrganizationId}
          selectedBranchId=""
          selectedEstablishmentId=""
          verifiedFactorIds={[]}
          canReadDelivery={false}
          canWriteDelivery={false}
          canWriteZones={false}
          canCancelOrders={false}
          loadFailed={!ctx.entryOk}
          zones={[]}
          deliveries={[]}
          orders={[]}
          transitions={[]}
        />
      </AuthFrame>
    );
  }

  const branchData = await loadDeliveryBranchData(
    ctx.client,
    ctx.selectedOrganizationId,
    ctx.selectedBranch.establishmentId,
    ctx.selectedBranch.id,
  );

  return (
    <AuthFrame wide>
      <DeliveryPanel
        supabaseUrl={ctx.supabaseUrl}
        anonKey={ctx.anonKey}
        tenants={ctx.tenants}
        branches={ctx.branches}
        selectedOrganizationId={ctx.selectedOrganizationId}
        selectedBranchId={ctx.selectedBranch.id}
        selectedEstablishmentId={ctx.selectedBranch.establishmentId}
        verifiedFactorIds={ctx.verifiedFactorIds}
        canReadDelivery={branchData.canReadDelivery}
        canWriteDelivery={branchData.canWriteDelivery}
        canWriteZones={branchData.canWriteZones}
        canCancelOrders={branchData.canCancelOrders}
        loadFailed={branchData.failed || !ctx.entryOk}
        zones={branchData.zones}
        deliveries={branchData.deliveries}
        orders={branchData.orders}
        transitions={branchData.transitions}
      />
    </AuthFrame>
  );
}

async function loadDeliveryBranchData(
  client: ServerSupabaseClient,
  organizationId: string,
  establishmentId: string,
  branchId: string,
) {
  const [readPerm, writePerm, zonePerm, cancelPerm] = await Promise.all([
    checkDeliveryPerm(client, organizationId, establishmentId, branchId, "delivery.read"),
    checkDeliveryPerm(client, organizationId, establishmentId, branchId, "delivery.write"),
    checkDeliveryPerm(client, organizationId, establishmentId, branchId, "delivery.zone.write"),
    checkOrderCancelPerm(client, organizationId, establishmentId, branchId),
  ]);

  if (!readPerm.allowed) {
    return {
      canReadDelivery: false,
      canWriteDelivery: false,
      canWriteZones: false,
      canCancelOrders: false,
      failed: [readPerm, writePerm, zonePerm, cancelPerm].some(({ failed }) => failed),
      zones: [],
      deliveries: [],
      orders: [],
      transitions: [],
    };
  }

  const [zonesRes, deliveriesRes] = await Promise.all([
    client.from("delivery_zones")
      .select("id,organization_id,establishment_id,branch_id,name,neighborhoods,delivery_fee_amount,minimum_order_amount,estimated_delivery_minutes,status,version")
      .eq("organization_id", organizationId)
      .eq("branch_id", branchId)
      .order("status", { ascending: true })
      .order("name", { ascending: true }),
    client.from("deliveries")
      .select("id,organization_id,establishment_id,branch_id,order_id,delivery_zone_id,zone_name_snapshot,status,courier_label,delivery_fee_snapshot,minimum_order_snapshot,estimated_delivery_minutes,cancellation_reason,created_at")
      .eq("organization_id", organizationId)
      .eq("branch_id", branchId)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  const deliveries = deliveriesRes.data ?? [];
  const deliveryIds = deliveries.map(({ id }) => id);
  const orderIds = deliveries.map(({ order_id }) => order_id);

  const [ordersRes, transitionsRes] = deliveryIds.length > 0
    ? await Promise.all([
        client.from("orders")
          .select("id,order_number,status,total_amount,declared_payment_method,handoff_payment_status,customer_name_snapshot,customer_phone_snapshot,delivery_address_snapshot")
          .eq("organization_id", organizationId)
          .in("id", orderIds),
        client.from("delivery_status_transitions")
          .select("id,delivery_id,from_status,to_status,courier_label,reason,created_at")
          .eq("organization_id", organizationId)
          .in("delivery_id", deliveryIds)
          .order("created_at", { ascending: true }),
      ])
    : [{ data: [], error: null }, { data: [], error: null }];

  const queriesFailed = Boolean(
    zonesRes.error || deliveriesRes.error || ordersRes.error || transitionsRes.error,
  );

  return {
    canReadDelivery: true,
    canWriteDelivery: writePerm.allowed,
    canWriteZones: zonePerm.allowed,
    canCancelOrders: cancelPerm.allowed,
    failed: queriesFailed || [readPerm, writePerm, zonePerm, cancelPerm].some(({ failed }) => failed),
    zones: zonesRes.data ?? [],
    deliveries,
    orders: ordersRes.data ?? [],
    transitions: transitionsRes.data ?? [],
  };
}

type DeliveryPermKey = "delivery.read" | "delivery.write" | "delivery.zone.write";

async function checkDeliveryPerm(
  client: ServerSupabaseClient,
  organizationId: string,
  establishmentId: string,
  branchId: string,
  permission: DeliveryPermKey,
): Promise<Readonly<{ allowed: boolean; failed: boolean }>> {
  const args = {
    p_organization_id: organizationId,
    p_establishment_id: establishmentId,
    p_branch_id: branchId,
    p_permission_key: permission,
  } as unknown as Database["public"]["Functions"]["delivery_has_permission"]["Args"];
  try {
    const { data, error } = await client.rpc("delivery_has_permission", args);
    return { allowed: !error && data === true, failed: !!error };
  } catch {
    return { allowed: false, failed: true };
  }
}

async function checkOrderCancelPerm(
  client: ServerSupabaseClient,
  organizationId: string,
  establishmentId: string,
  branchId: string,
): Promise<Readonly<{ allowed: boolean; failed: boolean }>> {
  const args = {
    p_organization_id: organizationId,
    p_establishment_id: establishmentId,
    p_branch_id: branchId,
    p_permission_key: "orders.cancel",
  } as unknown as Database["public"]["Functions"]["orders_has_permission"]["Args"];
  try {
    const { data, error } = await client.rpc("orders_has_permission", args);
    return { allowed: !error && data === true, failed: !!error };
  } catch {
    return { allowed: false, failed: true };
  }
}
