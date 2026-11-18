import { toExactCents } from "@/lib/orders/order-lifecycle";

export const DELIVERY_DISPATCH_STATUSES = [
  "preparing",
  "ready_for_dispatch",
  "assigned",
  "out_for_delivery",
  "delivered",
  "cancelled",
] as const;

export type DeliveryDispatchStatus = typeof DELIVERY_DISPATCH_STATUSES[number];

export const DELIVERY_ZONE_STATUSES = ["active", "archived"] as const;
export type DeliveryZoneStatus = typeof DELIVERY_ZONE_STATUSES[number];

export type DeliveryDispatchFilterTab = "active" | "delivered" | "cancelled" | "all";

export type DeliveryZoneSummary = Readonly<{
  id: string;
  name: string;
  neighborhoods: readonly string[];
  delivery_fee_amount: number | string;
  minimum_order_amount: number | string;
  estimated_delivery_minutes: number;
  status: string;
}>;

export function parseNeighborhoodList(rawText: string): string[] | null {
  const tokens = rawText.split(/[,;\n\r]+/);
  const seen = new Set<string>();
  const cleaned: string[] = [];

  for (const token of tokens) {
    const trimmed = token.trim();
    if (!trimmed) continue;
    if (trimmed.length > 120) return null;
    const key = trimmed.toLocaleLowerCase("pt-BR");
    if (!seen.has(key)) {
      seen.add(key);
      cleaned.push(trimmed);
    }
  }

  return cleaned.length >= 1 && cleaned.length <= 50 ? cleaned : null;
}

export function findMatchingDeliveryZone<T extends DeliveryZoneSummary>(
  zones: readonly T[],
  neighborhood: string,
): T | null {
  const normalizedTarget = neighborhood.trim().toLocaleLowerCase("pt-BR");
  if (!normalizedTarget) return null;

  const matches = zones.filter((zone) => (
    zone.status === "active"
    && zone.neighborhoods.some((entry) => entry.trim().toLocaleLowerCase("pt-BR") === normalizedTarget)
  ));
  if (matches.length === 0) return null;

  return [...matches].sort((left, right) => {
    const leftFee = toExactCents(left.delivery_fee_amount) ?? Number.MAX_SAFE_INTEGER;
    const rightFee = toExactCents(right.delivery_fee_amount) ?? Number.MAX_SAFE_INTEGER;
    if (leftFee !== rightFee) return leftFee - rightFee;
    return left.name.localeCompare(right.name, "pt-BR");
  })[0] ?? null;
}

export function checkZoneMinimumOrder(
  subtotalAmount: number | string,
  minimumOrderAmount: number | string,
): Readonly<{ met: boolean; shortfallAmount: string }> {
  const subtotalCents = toExactCents(subtotalAmount);
  const minimumCents = toExactCents(minimumOrderAmount);
  if (subtotalCents === null || minimumCents === null) {
    return { met: false, shortfallAmount: "0.00" };
  }
  if (subtotalCents >= minimumCents) {
    return { met: true, shortfallAmount: "0.00" };
  }
  const diffCents = minimumCents - subtotalCents;
  const whole = Math.floor(diffCents / 100);
  const frac = String(diffCents % 100).padStart(2, "0");
  return {
    met: false,
    shortfallAmount: `${whole}.${frac}`,
  };
}

export function isTerminalDeliveryStatus(status: DeliveryDispatchStatus): boolean {
  return status === "delivered" || status === "cancelled";
}

export function isValidDeliveryDispatchTransition(
  fromStatus: DeliveryDispatchStatus,
  toStatus: DeliveryDispatchStatus,
): boolean {
  if (isTerminalDeliveryStatus(fromStatus)) return false;
  if (toStatus === "cancelled") return true;
  if (fromStatus === "preparing") return toStatus === "ready_for_dispatch";
  if (fromStatus === "ready_for_dispatch") {
    return toStatus === "assigned" || toStatus === "out_for_delivery";
  }
  if (fromStatus === "assigned") return toStatus === "out_for_delivery";
  if (fromStatus === "out_for_delivery") return toStatus === "delivered";
  return false;
}

export function getNextForwardDispatchStatus(
  currentStatus: DeliveryDispatchStatus,
): DeliveryDispatchStatus | null {
  if (currentStatus === "preparing") return "ready_for_dispatch";
  if (currentStatus === "ready_for_dispatch") return "assigned";
  if (currentStatus === "assigned") return "out_for_delivery";
  if (currentStatus === "out_for_delivery") return "delivered";
  return null;
}

export function requiresCourierLabelForTransition(
  toStatus: DeliveryDispatchStatus,
  existingCourierLabel: string,
): boolean {
  if (toStatus !== "assigned" && toStatus !== "out_for_delivery") return false;
  return existingCourierLabel.trim().length === 0;
}

export function filterDeliveriesForQueue<T extends Readonly<{
  status: string;
  courier_label: string;
  zone_name_snapshot: string;
  orderNumber?: number;
  customerName?: string;
}>>(
  deliveries: readonly T[],
  tab: DeliveryDispatchFilterTab,
  query: string,
): T[] {
  const normalizedQuery = query.trim().toLocaleLowerCase("pt-BR");
  return deliveries.filter((row) => {
    const status = row.status as DeliveryDispatchStatus;
    const matchesTab = tab === "all"
      || (tab === "active" && !isTerminalDeliveryStatus(status))
      || (tab === "delivered" && status === "delivered")
      || (tab === "cancelled" && status === "cancelled");
    if (!matchesTab) return false;
    if (!normalizedQuery) return true;
    const orderNumText = row.orderNumber === undefined ? "" : `#${row.orderNumber}`;
    return orderNumText.includes(normalizedQuery)
      || (row.customerName ?? "").toLocaleLowerCase("pt-BR").includes(normalizedQuery)
      || row.courier_label.toLocaleLowerCase("pt-BR").includes(normalizedQuery)
      || row.zone_name_snapshot.toLocaleLowerCase("pt-BR").includes(normalizedQuery);
  });
}
