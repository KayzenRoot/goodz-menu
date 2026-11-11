import { describe, expect, it } from "vitest";
import { resolveCorrelationId } from "@/lib/observability/correlation";

describe("resolveCorrelationId", () => {
  it("keeps a valid caller correlation id", () => {
    expect(resolveCorrelationId(new Headers({ "x-correlation-id": "req-01:abc" }))).toBe("req-01:abc");
  });

  it("falls back to a generated id when the caller value is unsafe", () => {
    const id = resolveCorrelationId(new Headers({ "x-request-id": "bad/header" }));
    expect(id).toMatch(/^[0-9a-f-]{36}$/i);
  });

  it("uses the request id when no correlation id was supplied", () => {
    expect(resolveCorrelationId(new Headers({ "x-request-id": "request_2026.10" }))).toBe("request_2026.10");
  });
});
