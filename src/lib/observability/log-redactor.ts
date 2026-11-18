const SENSITIVE_KEY_SUBSTRINGS = [
  "password",
  "secret",
  "token",
  "authorization",
  "cookie",
  "apikey",
  "service_role",
  "phone",
  "email",
  "street",
  "address",
] as const;

const JWT_TOKEN_REGEX = /\beyJ[A-Za-z0-9_-]{8,100}\.[A-Za-z0-9_-]{8,200}\.[A-Za-z0-9_-]{8,200}\b/g;
const SUPABASE_KEY_REGEX = /\bsb_(?:secret|publishable)_[A-Za-z0-9_-]{8,120}\b/g;
const BEARER_REGEX = /\bBearer\s+[A-Za-z0-9._~+/=-]{8,250}/gi;
const CAPABILITY_HEX_REGEX = /\b[0-9a-f]{48,64}\b/gi;

export function redactStringValue(input: string): string {
  return input
    .replace(BEARER_REGEX, "Bearer [REDACTED]")
    .replace(JWT_TOKEN_REGEX, "[REDACTED_JWT]")
    .replace(SUPABASE_KEY_REGEX, "[REDACTED_KEY]")
    .replace(CAPABILITY_HEX_REGEX, "[REDACTED_TOKEN]");
}

export function redactStructuredLog(payload: Readonly<Record<string, unknown>>): Record<string, unknown> {
  return redactValue("", payload, 0) as Record<string, unknown>;
}

export function emitStructuredInfoLog(payload: Readonly<Record<string, unknown>>): void {
  console.info(JSON.stringify(redactStructuredLog(payload)));
}

function isSensitiveFieldName(key: string): boolean {
  const lower = key.toLowerCase();
  return SENSITIVE_KEY_SUBSTRINGS.some((fragment) => lower.includes(fragment));
}

function redactValue(key: string, value: unknown, depth: number): unknown {
  if (depth > 6) return "[TRUNCATED]";
  if (key && isSensitiveFieldName(key)) {
    return "[REDACTED]";
  }
  if (typeof value === "string") {
    return redactStringValue(value);
  }
  if (typeof value === "number" || typeof value === "boolean" || value === null) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.slice(0, 25).map((entry) => redactValue("", entry, depth + 1));
  }
  if (typeof value === "object" && value !== null) {
    const out: Record<string, unknown> = {};
    for (const [entryKey, entryVal] of Object.entries(value)) {
      out[entryKey] = redactValue(entryKey, entryVal, depth + 1);
    }
    return out;
  }
  return String(value);
}
