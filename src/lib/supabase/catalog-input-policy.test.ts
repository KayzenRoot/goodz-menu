import { describe, expect, it } from "vitest";
import {
  parseEnumEntry,
  parsePriceEntry,
  parseTextEntry,
  parseUuidEntry,
} from "@/lib/supabase/catalog-input-policy";

describe("catalog input policy", () => {
  it("trims bounded text and rejects empty required values, files, and overlong values", () => {
    expect(parseTextEntry("  Hambúrguer  ", 160, true)).toEqual({ ok: true, value: "Hambúrguer" });
    expect(parseTextEntry("   ", 160, true)).toEqual({ ok: false });
    expect(parseTextEntry("   ", 160, false)).toEqual({ ok: true, value: null });
    expect(parseTextEntry(new File(["bad"], "payload.txt"), 160, false)).toEqual({ ok: false });
    expect(parseTextEntry("x".repeat(161), 160, true)).toEqual({ ok: false });
  });

  it("accepts opaque IDs and enumerated values only", () => {
    expect(parseUuidEntry("8c000000-0000-4000-8000-000000000001", true)).toEqual({
      ok: true,
      value: "8c000000-0000-4000-8000-000000000001",
    });
    expect(parseUuidEntry("not-a-uuid", true)).toEqual({ ok: false });
    expect(parseEnumEntry("available", ["unknown", "available", "unavailable"] as const)).toEqual({
      ok: true,
      value: "available",
    });
    expect(parseEnumEntry("discounted", ["unknown", "available", "unavailable"] as const)).toEqual({ ok: false });
  });

  it("keeps BRL input as exact decimal text with no float conversion", () => {
    expect(parsePriceEntry("12.5")).toEqual({ ok: true, value: { text: "12.50", numeric: "12.50" } });
    expect(parsePriceEntry("9999999999.99")).toEqual({
      ok: true,
      value: { text: "9999999999.99", numeric: "9999999999.99" },
    });
    expect(parsePriceEntry("")).toEqual({ ok: true, value: { text: null, numeric: null } });
  });

  it.each(["-1.00", "1.001", "1e3", "1,00", "10000000000", ".25", "01.20"]) (
    "rejects invalid or out-of-range exact prices: %s",
    (value) => expect(parsePriceEntry(value)).toEqual({ ok: false }),
  );
});
