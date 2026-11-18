import { describe, expect, it } from "vitest";
import {
  checkZoneMinimumOrder,
  filterDeliveriesForQueue,
  findMatchingDeliveryZone,
  getNextForwardDispatchStatus,
  isValidDeliveryDispatchTransition,
  parseNeighborhoodList,
  requiresCourierLabelForTransition,
  type DeliveryZoneSummary,
} from "@/lib/delivery/delivery-rules";

const ZONES: DeliveryZoneSummary[] = [
  {
    id: "zone-central",
    name: "Zona Central",
    neighborhoods: ["Pinheiros", "Jardim Paulista"],
    delivery_fee_amount: "6.50",
    minimum_order_amount: "25.00",
    estimated_delivery_minutes: 35,
    status: "active",
  },
  {
    id: "zone-expansao",
    name: "Zona Expansão",
    neighborhoods: ["Pinheiros", "Butantã"],
    delivery_fee_amount: "9.90",
    minimum_order_amount: "40.00",
    estimated_delivery_minutes: 50,
    status: "active",
  },
  {
    id: "zone-archived",
    name: "Zona Arquivada",
    neighborhoods: ["Moema"],
    delivery_fee_amount: "4.00",
    minimum_order_amount: "15.00",
    estimated_delivery_minutes: 30,
    status: "archived",
  },
];

describe("delivery-rules domain", () => {
  it("normalizes and deduplicates neighborhood coverage lists", () => {
    expect(parseNeighborhoodList(" Pinheiros, Vila Madalena ; pinheiros \n Itaim Bibi ")).toEqual([
      "Pinheiros",
      "Vila Madalena",
      "Itaim Bibi",
    ]);
    expect(parseNeighborhoodList(" , ; \n ")).toBeNull();
    expect(parseNeighborhoodList("x".repeat(121))).toBeNull();
  });

  it("matches active delivery zones case-insensitively and prefers lowest fee", () => {
    expect(findMatchingDeliveryZone(ZONES, "  pinheiros ")?.id).toBe("zone-central");
    expect(findMatchingDeliveryZone(ZONES, "BUTANTÃ")?.id).toBe("zone-expansao");
    expect(findMatchingDeliveryZone(ZONES, "Moema")).toBeNull();
    expect(findMatchingDeliveryZone(ZONES, "Santana")).toBeNull();
  });

  it("computes exact-cents minimum order eligibility and shortfall", () => {
    expect(checkZoneMinimumOrder("25.00", "25.00")).toEqual({ met: true, shortfallAmount: "0.00" });
    expect(checkZoneMinimumOrder("18.10", "25.00")).toEqual({ met: false, shortfallAmount: "6.90" });
    expect(checkZoneMinimumOrder("invalid", "25.00")).toEqual({ met: false, shortfallAmount: "0.00" });
  });

  it("validates dispatch transitions and courier assignment requirements", () => {
    expect(getNextForwardDispatchStatus("preparing")).toBe("ready_for_dispatch");
    expect(getNextForwardDispatchStatus("ready_for_dispatch")).toBe("assigned");
    expect(getNextForwardDispatchStatus("assigned")).toBe("out_for_delivery");
    expect(getNextForwardDispatchStatus("out_for_delivery")).toBe("delivered");
    expect(getNextForwardDispatchStatus("delivered")).toBeNull();

    expect(isValidDeliveryDispatchTransition("preparing", "ready_for_dispatch")).toBe(true);
    expect(isValidDeliveryDispatchTransition("ready_for_dispatch", "out_for_delivery")).toBe(true);
    expect(isValidDeliveryDispatchTransition("preparing", "delivered")).toBe(false);
    expect(isValidDeliveryDispatchTransition("delivered", "cancelled")).toBe(false);

    expect(requiresCourierLabelForTransition("assigned", "")).toBe(true);
    expect(requiresCourierLabelForTransition("out_for_delivery", "Moto 01")).toBe(false);
    expect(requiresCourierLabelForTransition("ready_for_dispatch", "")).toBe(false);
  });

  it("filters dispatch queue rows by status tab and search query", () => {
    const sample = [
      { status: "preparing", courier_label: "", zone_name_snapshot: "Central", orderNumber: 1001, customerName: "Ana" },
      { status: "delivered", courier_label: "Moto 02", zone_name_snapshot: "Sul", orderNumber: 1002, customerName: "Bruno" },
    ];
    expect(filterDeliveriesForQueue(sample, "active", "")).toHaveLength(1);
    expect(filterDeliveriesForQueue(sample, "all", "#1002")).toHaveLength(1);
    expect(filterDeliveriesForQueue(sample, "delivered", "moto 02")).toHaveLength(1);
  });
});
