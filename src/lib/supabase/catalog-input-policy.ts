export type ParseResult<Value> = Readonly<{ ok: true; value: Value }> | Readonly<{ ok: false }>;

export type ParsedPrice = Readonly<{ text: string | null; numeric: string | null }>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PRICE = /^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/;

export function parseTextEntry(
  value: FormDataEntryValue | null,
  maximumLength: number,
  required: boolean,
): ParseResult<string | null> {
  if (value === null) return required ? invalid() : valid(null);
  if (typeof value !== "string") return invalid();
  const normalized = value.trim();
  if (normalized.length > maximumLength || (required && normalized.length === 0)) return invalid();
  return valid(normalized || null);
}

export function parseUuidEntry(value: FormDataEntryValue | null, required: boolean): ParseResult<string | null> {
  if (value === null) return required ? invalid() : valid(null);
  if (typeof value !== "string") return invalid();
  const normalized = value.trim();
  if (!normalized) return required ? invalid() : valid(null);
  return UUID.test(normalized) ? valid(normalized) : invalid();
}

export function parseEnumEntry<const Choice extends string>(
  value: FormDataEntryValue | null,
  choices: readonly Choice[],
): ParseResult<Choice> {
  return typeof value === "string" && (choices as readonly string[]).includes(value)
    ? valid(value as Choice)
    : invalid();
}

export function parsePriceEntry(value: FormDataEntryValue | null): ParseResult<ParsedPrice> {
  if (value === null) return valid({ text: null, numeric: null });
  if (typeof value !== "string") return invalid();
  const normalized = value.trim();
  if (!normalized) return valid({ text: null, numeric: null });
  if (!PRICE.test(normalized)) return invalid();

  const [whole, fraction = ""] = normalized.split(".");
  const decimal = `${whole}.${fraction.padEnd(2, "0")}`;
  if (decimal.length > 13) return invalid();
  return valid({ text: decimal, numeric: decimal });
}

export function asResult<Value>(value: Value): ParseResult<Value> {
  return valid(value);
}

function valid<Value>(value: Value): ParseResult<Value> {
  return { ok: true, value };
}

function invalid<Value = never>(): ParseResult<Value> {
  return { ok: false };
}
