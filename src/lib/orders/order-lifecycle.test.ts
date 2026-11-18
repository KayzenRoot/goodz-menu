import { describe, expect, it } from "vitest";
import {
  filterOrdersForQueue,
  formatBrlFromCents,
  formatBrlNumeric,
  getNextForwardOrderStatus,
  isSensitiveHandoffStatus,
  isTerminalOrderStatus,
  isValidOrderTransition,
  toExactCents,
} from "@/lib/orders/order-lifecycle";

describe("order-lifecycle", () => {
  it("enforces deterministic pickup and own-delivery forward progressions", () => {
    expect(getNextForwardOrderStatus("pickup", "placed")).toBe("accepted");
    expect(getNextForwardOrderStatus("pickup", "accepted")).toBe("preparing");
    expect(getNextForwardOrderStatus("pickup", "preparing")).toBe("ready_for_pickup");
    expect(getNextForwardOrderStatus("pickup", "ready_for_pickup")).toBe("completed");
    expect(getNextForwardOrderStatus("pickup", "completed")).toBeNull();

    expect(getNextForwardOrderStatus("own_delivery", "preparing")).toBe("ready_for_dispatch");
    expect(getNextForwardOrderStatus("own_delivery", "ready_for_dispatch")).toBe("out_for_delivery");
    expect(getNextForwardOrderStatus("own_delivery", "out_for_delivery")).toBe("completed");

    expect(isValidOrderTransition("pickup", "preparing", "ready_for_dispatch")).toBe(false);
    expect(isValidOrderTransition("own_delivery", "preparing", "ready_for_pickup")).toBe(false);
    expect(isValidOrderTransition("pickup", "preparing", "cancelled")).toBe(true);
    expect(isValidOrderTransition("pickup", "completed", "cancelled")).toBe(false);
    expect(isTerminalOrderStatus("completed")).toBe(true);
    expect(isTerminalOrderStatus("cancelled")).toBe(true);
    expect(isTerminalOrderStatus("preparing")).toBe(false);
  });

  it("computes exact decimal cents without binary floating-point drift", () => {
    const unitA = toExactCents("19.90");
    const unitB = toExactCents("7.25");
    expect(unitA).toBe(1990);
    expect(unitB).toBe(725);
    expect(formatBrlFromCents(unitA! * 2 + unitB!)).toBe("R$ 47,05");
    expect(formatBrlNumeric(34.5)).toBe("R$ 34,50");
    expect(toExactCents("invalid")).toBeNull();
  });

  it("identifies Admin-Guard-protected handoff payment statuses and filters queue tabs", () => {
    expect(isSensitiveHandoffStatus("collected")).toBe(false);
    expect(isSensitiveHandoffStatus("failed")).toBe(false);
    expect(isSensitiveHandoffStatus("reversed")).toBe(true);
    expect(isSensitiveHandoffStatus("disputed")).toBe(true);

    const sample = [
      { status: "placed", order_number: 1001, customer_name_snapshot: "Marina" },
      { status: "completed", order_number: 1002, customer_name_snapshot: "Rafael" },
      { status: "cancelled", order_number: 1003, customer_name_snapshot: "Helena" },
    ];
    expect(filterOrdersForQueue(sample, "active", "")).toHaveLength(1);
    expect(filterOrdersForQueue(sample, "completed", "")).toHaveLength(1);
    expect(filterOrdersForQueue(sample, "all", "#1003")).toEqual([sample[2]]);
  });
});
