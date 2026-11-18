"use server";

import { headers } from "next/headers";
import { requestCorrelationId } from "@/lib/observability/correlation";
import type { Database, Json } from "@/lib/supabase/database.types";
import { HANDOFF_PAYMENT_METHODS, type HandoffPaymentMethod } from "@/lib/settings/settings-resolver";
import { ORDER_FULFILLMENT_MODES, type OrderFulfillmentMode } from "@/lib/orders/order-lifecycle";
import { normalizeStorefrontSlug } from "@/lib/storefront/storefront-domain";
import { createPublicAnonSupabaseClient } from "@/lib/supabase/public-anon-client.server";
import {
  parseEnumEntry,
  parsePriceEntry,
  parseTextEntry,
  parseUuidEntry,
} from "@/lib/supabase/catalog-input-policy";

export type PublicCheckoutActionState =
  | null
  | {
      kind: "placed";
      slug: string;
      orderNumber: number;
      trackingToken: string;
      correlationId: string;
    }
  | { kind: "invalid"; correlationId: string }
  | { kind: "paused"; correlationId: string }
  | { kind: "offer_unavailable"; correlationId: string }
  | { kind: "below_minimum"; correlationId: string }
  | { kind: "outside_zone"; correlationId: string }
  | { kind: "failed"; correlationId: string };

type ParsedPublicCheckout = Readonly<{
  slug: string;
  fulfillmentMode: OrderFulfillmentMode;
  customerName: string;
  customerPhone: string;
  deliveryAddress: Json;
  deliveryZoneId: string | null;
  paymentMethod: HandoffPaymentMethod;
  cashChangeFor: string | null;
  customerNotes: string;
  marketingOptIn: boolean;
  items: Json;
  idempotencyKey: string;
}>;

export async function placePublicStorefrontOrderAction(
  _prev: PublicCheckoutActionState,
  formData: FormData,
): Promise<PublicCheckoutActionState> {
  const correlationId = await createPublicCorrelationId();
  const parsed = parsePublicCheckoutForm(formData);
  if (!parsed) return { kind: "invalid", correlationId };

  const client = createPublicAnonSupabaseClient();
  if (!client) return { kind: "failed", correlationId };

  const args = {
    p_slug: parsed.slug,
    p_fulfillment_mode: parsed.fulfillmentMode,
    p_customer_name: parsed.customerName,
    p_customer_phone: parsed.customerPhone,
    p_delivery_address: parsed.deliveryAddress,
    p_delivery_zone_id: parsed.deliveryZoneId,
    p_declared_payment_method: parsed.paymentMethod,
    p_cash_change_for: parsed.cashChangeFor,
    p_customer_notes: parsed.customerNotes,
    p_marketing_opt_in: parsed.marketingOptIn,
    p_items: parsed.items,
    p_idempotency_key: parsed.idempotencyKey,
    p_correlation_id: correlationId,
  } as unknown as Database["public"]["Functions"]["storefront_place_public_order"]["Args"];

  try {
    const { data, error } = await client.rpc("storefront_place_public_order", args);
    return mapPublicCheckoutResponse(parsed.slug, correlationId, data, error);
  } catch {
    return { kind: "failed", correlationId };
  }
}

function parsePublicCheckoutForm(formData: FormData): ParsedPublicCheckout | null {
  const rawSlug = formData.get("slug");
  const slug = typeof rawSlug === "string" ? normalizeStorefrontSlug(rawSlug) : null;
  const mode = parseEnumEntry(formData.get("fulfillmentMode"), ORDER_FULFILLMENT_MODES);
  const customerName = parseTextEntry(formData.get("customerName"), 120, true);
  const customerPhone = parseTextEntry(formData.get("customerPhone"), 40, true);
  const paymentMethod = parseEnumEntry(formData.get("paymentMethod"), HANDOFF_PAYMENT_METHODS);
  const cashChange = parsePriceEntry(formData.get("cashChangeFor"));
  const notes = parseTextEntry(formData.get("customerNotes"), 500, false);
  const idempotencyKey = parseTextEntry(formData.get("idempotencyKey"), 128, true);
  const items = parseCartItemsJson(formData.get("itemsJson"));

  if (
    !slug || !mode.ok || !customerName.ok || !customerName.value
    || !customerPhone.ok || !customerPhone.value || !paymentMethod.ok
    || !cashChange.ok || !notes.ok || !idempotencyKey.ok || !idempotencyKey.value
    || idempotencyKey.value.length < 8 || !items
  ) {
    return null;
  }

  const deliveryInfo = parsePublicDeliveryFields(mode.value, formData);
  if (!deliveryInfo.ok) return null;

  return {
    slug,
    fulfillmentMode: mode.value,
    customerName: customerName.value,
    customerPhone: customerPhone.value,
    deliveryAddress: deliveryInfo.address,
    deliveryZoneId: deliveryInfo.zoneId,
    paymentMethod: paymentMethod.value,
    cashChangeFor: paymentMethod.value === "cash" ? cashChange.value.numeric : null,
    customerNotes: notes.value ?? "",
    marketingOptIn: formData.get("marketingOptIn") === "on",
    items,
    idempotencyKey: idempotencyKey.value,
  };
}

function parsePublicDeliveryFields(
  mode: OrderFulfillmentMode,
  formData: FormData,
): Readonly<{ ok: true; address: Json; zoneId: string | null } | { ok: false }> {
  if (mode === "pickup") {
    return { ok: true, address: null, zoneId: null };
  }
  const zoneId = parseUuidEntry(formData.get("deliveryZoneId"), true);
  const street = parseTextEntry(formData.get("streetLine"), 200, true);
  const numberLabel = parseTextEntry(formData.get("numberLabel"), 40, false);
  const neighborhood = parseTextEntry(formData.get("neighborhood"), 120, true);
  const city = parseTextEntry(formData.get("city"), 120, true);

  if (
    !zoneId.ok || !zoneId.value || !street.ok || !street.value || !numberLabel.ok
    || !neighborhood.ok || !neighborhood.value || !city.ok || !city.value
  ) {
    return { ok: false };
  }

  return {
    ok: true,
    zoneId: zoneId.value,
    address: {
      street_line: street.value,
      number_label: numberLabel.value ?? "S/N",
      neighborhood: neighborhood.value,
      city: city.value,
      state_code: "SP",
    },
  };
}

function parseCartItemsJson(raw: FormDataEntryValue | null): Json | null {
  if (typeof raw !== "string" || raw.length > 8_192) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length < 1 || parsed.length > 50) return null;
    const valid = parsed.every((item) => (
      typeof item === "object"
      && item !== null
      && !Array.isArray(item)
      && typeof (item as Record<string, unknown>).channel_offer_id === "string"
      && typeof (item as Record<string, unknown>).quantity === "number"
      && Number.isInteger((item as Record<string, unknown>).quantity)
      && ((item as Record<string, unknown>).quantity as number) >= 1
      && ((item as Record<string, unknown>).quantity as number) <= 99
    ));
    return valid ? (parsed as Json) : null;
  } catch {
    return null;
  }
}

const PUBLIC_ERR_MAP: readonly Readonly<[string, Exclude<PublicCheckoutActionState, null | { kind: "placed" }>["kind"]]>[] = [
  ["paused or disabled", "paused"],
  ["offer is unavailable", "offer_unavailable"],
  ["minimum order amount", "below_minimum"],
  ["outside configured delivery zones", "outside_zone"],
  ["delivery zone is unavailable", "outside_zone"],
];

function mapPublicCheckoutResponse(
  slug: string,
  correlationId: string,
  data: Json | null,
  error: Readonly<{ code?: string; message?: string }> | null,
): PublicCheckoutActionState {
  if (error) {
    const msg = error.message ?? "";
    const matched = PUBLIC_ERR_MAP.find(([snippet]) => msg.includes(snippet));
    if (matched) return { kind: matched[1], correlationId };
    if (error.code === "22023") return { kind: "invalid", correlationId };
    return { kind: "failed", correlationId };
  }
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    return { kind: "failed", correlationId };
  }
  const orderNumber = data.order_number;
  const trackingToken = data.tracking_token;
  if (typeof orderNumber !== "number" || typeof trackingToken !== "string" || !/^[0-9a-f]{48}$/.test(trackingToken)) {
    return { kind: "failed", correlationId };
  }
  return {
    kind: "placed",
    slug,
    orderNumber,
    trackingToken,
    correlationId,
  };
}

async function createPublicCorrelationId(): Promise<string> {
  const requestHeaders = await headers();
  const requestId = requestHeaders.get("x-request-id");
  return requestCorrelationId(new Request("http://localhost", {
    headers: requestId ? { "x-request-id": requestId } : undefined,
  }));
}
