import { describe, expect, it } from "vitest";
import { requestCorrelationId, safeBuildRevision } from "@/lib/observability/correlation";

describe("request correlation", () => {
  it("preserves a valid UUID and replaces arbitrary header contents", () => {
    const id = "3f713b35-b405-4ad1-9b2a-20bcffb5a410";
    expect(requestCorrelationId(new Request("http://localhost", { headers: { "x-request-id": id } }))).toBe(id);
    expect(requestCorrelationId(new Request("http://localhost", { headers: { "x-request-id": "authorization: secret" } }))).toMatch(/^[0-9a-f-]{36}$/i);
  });

  it("limits revision strings to safe visible characters", () => {
    expect(safeBuildRevision("build.123-ab" as string)).toBe("build.123-ab");
    expect(safeBuildRevision("token=hidden" as string)).toBe("unknown");
  });
});
