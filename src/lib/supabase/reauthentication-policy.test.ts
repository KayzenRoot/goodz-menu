import { describe, expect, it } from "vitest";
import {
  hasFreshPasswordAuthentication,
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

describe("Supabase privileged bearer proof", () => {
  // The bearer for a privileged catalog command has to satisfy the database, which demands an aal2
  // token, and this check, which demands a password authentication recent enough to trust. Those are
  // the same two facts read from the same token, so the level itself is not part of the question.
  const now = 1_700_000_000;
  const stepped = {
    sub: userId,
    aal: "aal2",
    amr: [{ method: "totp", timestamp: now }, { method: "password", timestamp: now - 1 }],
  };

  it("accepts a password authentication that is still recent, whatever the assurance level", () => {
    expect(hasFreshPasswordAuthentication(stepped, now)).toBe(true);
    expect(hasFreshPasswordAuthentication({ ...stepped, aal: "aal1" }, now)).toBe(true);
    expect(hasFreshPasswordAuthentication(stepped, now - 1 + PRIVILEGED_REAUTH_WINDOW_SECONDS)).toBe(true);
  });

  it("refuses a token whose password authentication is missing, stale or unreadable", () => {
    expect(hasFreshPasswordAuthentication({ ...stepped, amr: [{ method: "totp", timestamp: now }] }, now)).toBe(false);
    expect(hasFreshPasswordAuthentication({ ...stepped, amr: [] }, now)).toBe(false);
    expect(hasFreshPasswordAuthentication(undefined, now)).toBe(false);
    // A clock behind the authentication belongs to another moment, so the age would be negative.
    expect(hasFreshPasswordAuthentication(stepped, now - 5)).toBe(false);
  });

  it("reads the newest password authentication when the token carries several", () => {
    const twice = {
      ...stepped,
      amr: [{ method: "password", timestamp: now - PRIVILEGED_REAUTH_WINDOW_SECONDS - 1 }, { method: "password", timestamp: now }],
    };
    expect(hasFreshPasswordAuthentication(twice, now)).toBe(true);
  });
});
