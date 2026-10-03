import { describe, expect, it } from "vitest";
import { parseLocalSupabaseStatus } from "../../../scripts/parse-local-supabase-status.mjs";

describe("local Supabase status output parsing", () => {
  it("parses JSON-only CLI output", () => {
    expect(parseLocalSupabaseStatus('{"API_URL":"http://127.0.0.1:54321","ANON_KEY":"local-public-key"}')).toEqual({
      API_URL: "http://127.0.0.1:54321",
      ANON_KEY: "local-public-key",
    });
  });

  it("discards CLI preamble before the first JSON object", () => {
    expect(parseLocalSupabaseStatus('Stopped services: [studio]\n{"API_URL":"http://127.0.0.1:54321"}')).toEqual({
      API_URL: "http://127.0.0.1:54321",
    });
  });

  it("uses the generic status error for output without valid JSON", () => {
    expect(() => parseLocalSupabaseStatus("Stopped services: [studio]\n{invalid"))
      .toThrow("Could not read local Supabase status; E2E refuses non-local Auth configuration.");
    expect(() => parseLocalSupabaseStatus("Stopped services: [studio]"))
      .toThrow("Could not read local Supabase status; E2E refuses non-local Auth configuration.");
  });
});
