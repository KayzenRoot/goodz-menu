import "server-only";

import { cookies } from "next/headers";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { ServerSupabaseClient } from "@/lib/supabase/auth-session";
import type { Database } from "@/lib/supabase/database.types";
import { readSupabaseAuthConfig } from "@/lib/env/runtime-env";
import { hasFreshTotpProof, type VerifiedAuthClaims } from "@/lib/supabase/admin-guard-policy";
import {
  PRIVILEGED_REAUTH_COOKIE,
  hasFreshPasswordReauthentication,
} from "@/lib/supabase/reauthentication-policy";

// Privileged commercial catalog mutations.
//
// Price, promotional price, availability and material visibility are money actions, so they require
// the same stronger authentication the Admin Guard already demands for a synthetic privileged proof:
// a verified identity, aal2, a verified authenticator factor, a recent two-step proof and a recent
// password reauthentication.
//
// What this slice adds on top of the existing guard is that the returned proof token is then used as
// the bearer credential for the catalog contract call itself. The database therefore re-derives the
// strong authentication facts from a signature it verified itself, instead of trusting an unsigned
// application assertion. The application layer checks the reauthentication cookie; the database
// checks the session. Neither layer can be satisfied by the other alone.

export type CatalogStepUpReason =
  | "unauthenticated"
  | "identity_unverified"
  | "aal2_required"
  | "factor_unverified"
  | "step_up_required"
  | "reauthentication_required";

export type CatalogStepUpDecision =
  | { allowed: true; accessToken: string }
  | { allowed: false; reason: CatalogStepUpReason };

export type StepUpClient = SupabaseClient<Database>;

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

export async function authorizePrivilegedCatalogCommand(
  client: ServerSupabaseClient,
): Promise<CatalogStepUpDecision> {
  const runtime = readSupabaseAuthConfig();
  if (!runtime.ok) return { allowed: false, reason: "unauthenticated" };

  let identityId: string | null = null;
  try {
    const { data, error } = await client.auth.getUser();
    if (error || !data.user?.id) return { allowed: false, reason: "unauthenticated" };
    identityId = data.user.id;
  } catch {
    return { allowed: false, reason: "unauthenticated" };
  }

  let claims: VerifiedAuthClaims | null = null;
  try {
    const { data, error } = await client.auth.getClaims();
    if (error || !data?.claims || typeof data.claims !== "object") {
      return { allowed: false, reason: "identity_unverified" };
    }
    claims = data.claims as VerifiedAuthClaims;
  } catch {
    return { allowed: false, reason: "identity_unverified" };
  }
  if (claims.sub !== identityId) return { allowed: false, reason: "identity_unverified" };
  if (claims.aal !== "aal2") return { allowed: false, reason: "aal2_required" };

  try {
    const { data, error } = await client.auth.mfa.listFactors();
    if (error || !data) return { allowed: false, reason: "factor_unverified" };
    if (!data.totp.some(({ status }) => status === "verified")) {
      return { allowed: false, reason: "factor_unverified" };
    }
  } catch {
    return { allowed: false, reason: "factor_unverified" };
  }

  if (!hasFreshTotpProof(claims.amr, nowSeconds())) {
    return { allowed: false, reason: "step_up_required" };
  }

  let proofToken: string | undefined;
  try {
    proofToken = (await cookies()).get(PRIVILEGED_REAUTH_COOKIE)?.value;
    if (!proofToken || proofToken.length > 8192) {
      return { allowed: false, reason: "reauthentication_required" };
    }
    const { data, error } = await client.auth.getClaims(proofToken);
    if (error || !data?.claims) return { allowed: false, reason: "reauthentication_required" };
    if (!hasFreshPasswordReauthentication(data.claims, identityId, nowSeconds())) {
      return { allowed: false, reason: "reauthentication_required" };
    }
  } catch {
    return { allowed: false, reason: "reauthentication_required" };
  }

  return { allowed: true, accessToken: proofToken };
}

/**
 * Issues a Data API client whose bearer credential is the freshly reauthenticated session token, so
 * the catalog contract evaluates the caller's aal2 and fresh authentication methods in the database.
 */
export function createStepUpClient(accessToken: string): StepUpClient | null {
  const runtime = readSupabaseAuthConfig();
  if (!runtime.ok) return null;

  return createClient<Database>(runtime.config.supabaseApiUrl.toString(), runtime.config.anonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
}