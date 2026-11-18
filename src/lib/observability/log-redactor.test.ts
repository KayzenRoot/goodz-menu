import { describe, expect, it } from "vitest";
import { redactStringValue, redactStructuredLog } from "@/lib/observability/log-redactor";

describe("log-redactor", () => {
  it("redacts sensitive keys, JWTs, Supabase keys, Bearer headers, and capability tokens", () => {
    const jwt = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.c2lnbmF0dXJlMTIzNDU2Nzg5MA";
    const cap = "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6";
    const redacted = redactStructuredLog({
      event: "public_checkout",
      correlation_id: "11111111-1111-4111-8111-111111111111",
      customerPhone: "11999998888",
      trackingToken: cap,
      authorization: `Bearer ${jwt}`,
      detail: `Key sb_secret_1234567890abcdef and token ${cap}`,
      nested: { password: "my-secret-password", status: "ok" },
    });

    expect(redacted).toEqual({
      event: "public_checkout",
      correlation_id: "11111111-1111-4111-8111-111111111111",
      customerPhone: "[REDACTED]",
      trackingToken: "[REDACTED]",
      authorization: "[REDACTED]",
      detail: "Key [REDACTED_KEY] and token [REDACTED_TOKEN]",
      nested: { password: "[REDACTED]", status: "ok" },
    });
    expect(redactStringValue(`Bearer ${jwt}`)).toBe("Bearer [REDACTED]");
  });
});
