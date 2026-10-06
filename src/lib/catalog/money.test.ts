import { describe, expect, it } from "vitest";
import {
  compareMoney,
  formatMoney,
  isPromotionalPriceAdmissible,
  parseMoney,
  type ParsedMoney,
} from "@/lib/catalog/money";

function money(value: string): ParsedMoney {
  const parsed = parseMoney(value);
  if (!parsed.ok) throw new Error(`expected ${value} to parse`);
  return parsed.money;
}

describe("parseMoney", () => {
  it("admits a canonical decimal and scales it exactly", () => {
    expect(money("10.0000")).toEqual({ decimal: "10.0000", scaled: BigInt(100000) });
    expect(money("0.0001").scaled).toBe(BigInt(1));
    expect(money("0").scaled).toBe(BigInt(0));
    expect(money("1234.5678").scaled).toBe(BigInt(12345678));
  });

  it("trims surrounding whitespace but keeps the admitted spelling", () => {
    expect(money(" 7.50 ").decimal).toBe("7.50");
    expect(money(" 7.50 ").scaled).toBe(BigInt(75000));
  });

  it("rejects every spelling that is not one canonical decimal", () => {
    const rejected = [
      "-1.00",
      "+1.00",
      "007.50",
      "1.",
      ".50",
      "1,50",
      "1 000.00",
      "1e3",
      "0x10",
      "NaN",
      "Infinity",
      "10.00001",
      "10.123456",
    ];
    for (const value of rejected) {
      expect(parseMoney(value), value).toEqual({ ok: false, reason: "invalid_money" });
    }
  });

  it("rejects anything that is not a string, including numbers", () => {
    for (const value of [10, 10.5, null, undefined, {}, [], BigInt(1), true]) {
      expect(parseMoney(value)).toEqual({ ok: false, reason: "invalid_money" });
    }
  });

  it("rejects a magnitude the numeric column cannot hold", () => {
    expect(parseMoney("999999999999999")).toEqual({ ok: true, money: { decimal: "999999999999999", scaled: BigInt("9999999999999990000") } });
    expect(parseMoney("1000000000000000")).toEqual({ ok: false, reason: "invalid_money" });
  });
});

describe("compareMoney", () => {
  it("treats two spellings of the same amount as equal", () => {
    expect(compareMoney(money("10.0000"), money("10"))).toBe(0);
    expect(compareMoney(money("0.5000"), money("0.5"))).toBe(0);
  });

  it("orders amounts that differ below the display scale", () => {
    expect(compareMoney(money("10.0001"), money("10.0000"))).toBe(1);
    expect(compareMoney(money("10.0000"), money("10.0001"))).toBe(-1);
  });

  it("orders across the units boundary", () => {
    expect(compareMoney(money("1000.0000"), money("999.9999"))).toBe(1);
    expect(compareMoney(money("999.9999"), money("1000"))).toBe(-1);
  });

  it("distinguishes amounts a binary float would round together", () => {
    // In IEEE-754 the float sum of 0.1 and 0.2 is not the float 0.3; the exact comparison must not
    // inherit that, and must still separate two amounts four places apart.
    expect(0.1 + 0.2 === 0.3).toBe(false);
    expect(Number("0.3000") === 0.1 + 0.2).toBe(false);
    expect(compareMoney(money("0.1000"), money("0.2000"))).toBe(-1);
    expect(compareMoney(money("0.3000"), money("0.3001"))).toBe(-1);
  });
});

describe("isPromotionalPriceAdmissible", () => {
  it("admits an absent promotional price", () => {
    expect(isPromotionalPriceAdmissible(money("10.0000"), null)).toBe(true);
  });

  it("admits a strict reduction", () => {
    expect(isPromotionalPriceAdmissible(money("10.0000"), money("9.9999"))).toBe(true);
    expect(isPromotionalPriceAdmissible(money("10.0000"), money("0.0000"))).toBe(true);
  });

  it("rejects a promotional price that is not a reduction", () => {
    expect(isPromotionalPriceAdmissible(money("10.0000"), money("10.0000"))).toBe(false);
    expect(isPromotionalPriceAdmissible(money("10.0000"), money("10.0001"))).toBe(false);
  });

  it("rejects a free promotional price when the base price is already zero", () => {
    expect(isPromotionalPriceAdmissible(money("0.0000"), money("0.0000"))).toBe(false);
  });
});

describe("formatMoney", () => {
  it("formats with the Brazilian decimal convention and four exact places", () => {
    expect(formatMoney(money("10.0000"))).toBe("10,0000");
    expect(formatMoney(money("1234.5"))).toBe("1.234,5000");
    expect(formatMoney(money("0.0001"))).toBe("0,0001");
    expect(formatMoney(money("0"))).toBe("0,0000");
  });
});