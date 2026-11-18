export const ORDER_FULFILLMENT_MODES = ["pickup", "own_delivery"] as const;
export type OrderFulfillmentMode = typeof ORDER_FULFILLMENT_MODES[number];

export const ORDER_STATUSES = [
  "placed",
  "accepted",
  "preparing",
  "ready_for_pickup",
  "ready_for_dispatch",
  "out_for_delivery",
  "completed",
  "cancelled",
] as const;

export type OrderStatus = typeof ORDER_STATUSES[number];

export const HANDOFF_PAYMENT_STATUSES = [
  "pending",
  "collected",
  "failed",
  "cancelled",
  "reversed",
  "disputed",
] as const;

export type HandoffPaymentStatus = typeof HANDOFF_PAYMENT_STATUSES[number];
export type RecordedHandoffPaymentStatus = Exclude<HandoffPaymentStatus, "pending">;

export const SENSITIVE_HANDOFF_STATUSES: readonly RecordedHandoffPaymentStatus[] = [
  "reversed",
  "disputed",
];

export type OrderQueueFilterTab = "active" | "completed" | "cancelled" | "all";

export function isTerminalOrderStatus(status: OrderStatus): boolean {
  return status === "completed" || status === "cancelled";
}

export function isSensitiveHandoffStatus(status: RecordedHandoffPaymentStatus): boolean {
  return SENSITIVE_HANDOFF_STATUSES.includes(status);
}

export function getNextForwardOrderStatus(
  fulfillmentMode: OrderFulfillmentMode,
  currentStatus: OrderStatus,
): OrderStatus | null {
  if (currentStatus === "placed") return "accepted";
  if (currentStatus === "accepted") return "preparing";
  if (currentStatus === "preparing") {
    return fulfillmentMode === "pickup" ? "ready_for_pickup" : "ready_for_dispatch";
  }
  if (currentStatus === "ready_for_dispatch" && fulfillmentMode === "own_delivery") {
    return "out_for_delivery";
  }
  if (currentStatus === "ready_for_pickup" && fulfillmentMode === "pickup") {
    return "completed";
  }
  if (currentStatus === "out_for_delivery" && fulfillmentMode === "own_delivery") {
    return "completed";
  }
  return null;
}

export function isValidOrderTransition(
  fulfillmentMode: OrderFulfillmentMode,
  fromStatus: OrderStatus,
  toStatus: OrderStatus,
): boolean {
  if (isTerminalOrderStatus(fromStatus)) return false;
  if (toStatus === "cancelled") return true;
  return getNextForwardOrderStatus(fulfillmentMode, fromStatus) === toStatus;
}

export function toExactCents(amount: number | string): number | null {
  const normalized = typeof amount === "number" ? amount.toFixed(2) : amount.trim();
  if (!/^\d{1,10}(?:\.\d{1,2})?$/.test(normalized)) return null;
  const [wholePart, fractionPart = ""] = normalized.split(".");
  const whole = Number.parseInt(wholePart!, 10);
  const cents = Number.parseInt(fractionPart.padEnd(2, "0"), 10);
  const totalCents = whole * 100 + cents;
  return Number.isSafeInteger(totalCents) ? totalCents : null;
}

export function formatBrlFromCents(cents: number): string {
  const safe = Math.max(0, Math.trunc(cents));
  const whole = Math.floor(safe / 100);
  const remainder = String(safe % 100).padStart(2, "0");
  return `R$ ${whole},${remainder}`;
}

export function formatBrlNumeric(amount: number): string {
  const cents = toExactCents(amount);
  return cents === null ? "R$ 0,00" : formatBrlFromCents(cents);
}

export function filterOrdersForQueue<T extends Readonly<{
  status: string;
  order_number: number;
  customer_name_snapshot: string;
}>>(
  orders: readonly T[],
  tab: OrderQueueFilterTab,
  searchQuery: string,
): T[] {
  const normalizedSearch = searchQuery.trim().toLocaleLowerCase("pt-BR");
  return orders.filter((order) => {
    if (!matchesTab(order.status as OrderStatus, tab)) return false;
    if (!normalizedSearch) return true;
    const numberText = `#${order.order_number}`;
    const customerText = order.customer_name_snapshot.toLocaleLowerCase("pt-BR");
    return numberText.includes(normalizedSearch) || customerText.includes(normalizedSearch);
  });
}

function matchesTab(status: OrderStatus, tab: OrderQueueFilterTab): boolean {
  if (tab === "all") return true;
  if (tab === "completed") return status === "completed";
  if (tab === "cancelled") return status === "cancelled";
  return !isTerminalOrderStatus(status);
}
