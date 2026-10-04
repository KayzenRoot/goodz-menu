import { describe, expect, it } from "vitest";
import {
  hasFreshPasswordReauthentication,
  matchesPasswordGrantIdentity,
  PRIVILEGED_REAUTH_WINDOW_SECONDS,
} from "@/lib/supabase/reauthentication-policy";

const userId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const claims = { sub: userId, aal: "aal1", amr: [{ method: "password", timestamp: 1_700_000_000 }] };

describe("Supabase password reauthentication proof", () => {
  it("requires matching Auth response and session identities", () => {
    expect(matchesPasswordGrantIdentity(userId, userId, userId)).toBe(true);
    expect(matchesPasswordGrantIdentity(userId, "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", userId)).toBe(false);
    expect(matchesPasswordGrantIdentity(userId, userId, "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb")).toBe(false);
    expect(matchesPasswordGrantIdentity(userId, undefined, userId)).toBe(false);
  });

  it("accepts only a recent provider-signed password proof for the current identity", () => {
    expect(hasFreshPasswordReauthentication(claims, userId, 1_700_000_000)).toBe(true);
    expect(hasFreshPasswordReauthentication(claims, userId, 1_700_000_000 + PRIVILEGED_REAUTH_WINDOW_SECONDS)).toBe(true);
    expect(hasFreshPasswordReauthentication(claims, userId, 1_700_000_001 + PRIVILEGED_REAUTH_WINDOW_SECONDS)).toBe(false);
    expect(hasFreshPasswordReauthentication({ ...claims, sub: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" }, userId, 1_700_000_000)).toBe(false);
    expect(hasFreshPasswordReauthentication({ ...claims, aal: "aal2" }, userId, 1_700_000_000)).toBe(false);
    expect(hasFreshPasswordReauthentication({ ...claims, amr: [{ method: "totp", timestamp: 1_700_000_000 }] }, userId, 1_700_000_000)).toBe(false);
    expect(hasFreshPasswordReauthentication({ ...claims, amr: [{ method: "password", timestamp: "1700000000" }] }, userId, 1_700_000_000)).toBe(false);
  });
});
