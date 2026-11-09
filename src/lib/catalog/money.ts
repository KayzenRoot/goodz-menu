// Exact decimal money handling for the catalog slice.
//
// Prices never pass through a JavaScript number on the way to the database: an IEEE-754 double
// cannot represent every four-decimal monetary value exactly, and a persisted price that has been
// rounded by a float round-trip is no longer the price the operator admitted. Money therefore
// travels as a decimal string, is validated against a fixed scale, and is compared with BigInt.

const MONEY_PATTERN = /^(?:0|[1-9]\d{0,14})(?:\.\d{1,4})?$/;
const MONEY_SCALE = 4;
const ZERO = BigInt(0);
const MONEY_UNITS_PER_SCALE = BigInt(10) ** BigInt(MONEY_SCALE);

export type ParsedMoney = {
  /** Canonical decimal string accepted by the database numeric contract. */
  decimal: string;
  /** Exact value scaled by 10^4, for exact comparison without binary floating point. */
  scaled: bigint;
};

export type MoneyParseResult =
  | { ok: true; money: ParsedMoney }
  | { ok: false; reason: "invalid_money" };

function scaleDecimal(value: string): bigint {
  const [integerPart = "0", fractionPart = ""] = value.split(".");
  const paddedFraction = fractionPart.padEnd(MONEY_SCALE, "0");
  return BigInt(integerPart) * MONEY_UNITS_PER_SCALE + BigInt(paddedFraction || "0");
}

/**
 * Parses an exact decimal amount. Leading zeros, signs, exponents, thousands separators and more
 * than four decimal places are rejected so that a single canonical spelling reaches the database.
 */
export function parseMoney(input: unknown): MoneyParseResult {
  if (typeof input !== "string") return { ok: false, reason: "invalid_money" };
  const candidate = input.trim();
  if (!MONEY_PATTERN.test(candidate)) return { ok: false, reason: "invalid_money" };

  return {
    ok: true,
    money: {
      decimal: candidate,
      scaled: scaleDecimal(candidate),
    },
  };
}

/** Compares two already parsed amounts without any floating point conversion. */
export function compareMoney(left: ParsedMoney, right: ParsedMoney): -1 | 0 | 1 {
  if (left.scaled < right.scaled) return -1;
  if (left.scaled > right.scaled) return 1;
  return 0;
}

/**
 * A promotional price is only a valid commercial state when it is present, non negative and a strict
 * reduction of the base price. Anything else is an impossible commercial state and must be rejected
 * before the command reaches the database.
 */
export function isPromotionalPriceAdmissible(
  basePrice: ParsedMoney,
  promotionalPrice: ParsedMoney | null,
): boolean {
  if (promotionalPrice === null) return true;
  if (promotionalPrice.scaled < ZERO) return false;
  return promotionalPrice.scaled < basePrice.scaled;
}

/** Formats an exact amount for display without ever converting it to a binary float. */
export function formatMoney(money: ParsedMoney): string {
  const negative = money.scaled < ZERO;
  const absolute = negative ? -money.scaled : money.scaled;
  const integerPart = absolute / MONEY_UNITS_PER_SCALE;
  const fractionPart = String(absolute % MONEY_UNITS_PER_SCALE).padStart(MONEY_SCALE, "0");
  const grouped = integerPart.toString().replace(/\B(?=(?:\d{3})+(?!\d))/g, ".");
  return `${negative ? "-" : ""}${grouped},${fractionPart}`;
}