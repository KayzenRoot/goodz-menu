import "server-only";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database } from "@/lib/supabase/database.types";
import { readSupabaseAuthConfig } from "@/lib/env/runtime-env";
import { getCurrentAuthContext, type ServerSupabaseClient } from "@/lib/supabase/auth-session";
import {
  hasFreshPasswordReauthentication,
  matchesPasswordGrantIdentity,
  PRIVILEGED_REAUTH_COOKIE,
  PRIVILEGED_REAUTH_WINDOW_SECONDS,
} from "@/lib/supabase/reauthentication-policy";

function createEphemeralAuthClient(apiUrl: string, anonKey: string) {
  return createClient<Database>(apiUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
}

export async function reauthenticateCurrentUser(password: unknown): Promise<boolean> {
  return (await reauthenticateCurrentUserWithClient(password)) !== null;
}

export type FreshPasswordGrant = {
  client: ReturnType<typeof createEphemeralAuthClient>;
  identityId: string;
};

export async function reauthenticateCurrentUserWithClient(password: unknown): Promise<FreshPasswordGrant | null> {
  if (typeof password !== "string" || password.length === 0 || password.length > 1024) {
    await clearPrivilegedReauthenticationProof();
    return null;
  }

  try {
    const auth = await getCurrentAuthContext();
    if (!auth?.user.id || (!auth.user.email && !auth.user.phone)) {
      await clearPrivilegedReauthenticationProof();
      return null;
    }

    const runtime = readSupabaseAuthConfig();
    if (!runtime.ok) {
      await clearPrivilegedReauthenticationProof();
      return null;
    }

    const verifier = createEphemeralAuthClient(
      runtime.config.supabaseApiUrl.toString(),
      runtime.config.anonKey,
    );
    const credentials = auth.user.email
      ? { email: auth.user.email, password }
      : { phone: auth.user.phone!, password };
    const { data, error } = await verifier.auth.signInWithPassword(credentials);
    const proofToken = data.session?.access_token;
    if (
      error
      || !proofToken
      || !matchesPasswordGrantIdentity(auth.user.id, data.user?.id, data.session?.user.id)
    ) {
      await clearPrivilegedReauthenticationProof();
      return null;
    }

    const { data: verified, error: claimsError } = await verifier.auth.getClaims(proofToken);
    const claims = verified?.claims;
    if (
      claimsError
      || !claims
      || !hasFreshPasswordReauthentication(claims, auth.user.id, Math.floor(Date.now() / 1000))
    ) {
      await clearPrivilegedReauthenticationProof();
      return null;
    }

    const cookieStore = await cookies();
    cookieStore.set(PRIVILEGED_REAUTH_COOKIE, proofToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/app",
      maxAge: PRIVILEGED_REAUTH_WINDOW_SECONDS,
    });
    return { client: verifier, identityId: auth.user.id };
  } catch {
    await clearPrivilegedReauthenticationProof();
    return null;
  }
}

export async function hasFreshReauthenticationProof(
  client: Pick<ServerSupabaseClient, "auth">,
  identityId: string,
): Promise<boolean | null> {
  try {
    const token = (await cookies()).get(PRIVILEGED_REAUTH_COOKIE)?.value;
    if (!token || token.length > 8192) return false;

    const { data, error } = await client.auth.getClaims(token);
    if (error || !data?.claims) return null;
    return hasFreshPasswordReauthentication(
      data.claims,
      identityId,
      Math.floor(Date.now() / 1000),
    );
  } catch {
    return null;
  }
}

export async function clearPrivilegedReauthenticationProof(): Promise<void> {
  try {
    (await cookies()).set(PRIVILEGED_REAUTH_COOKIE, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/app",
      maxAge: 0,
    });
  } catch {
    // Failure to clear does not grant authority; every use revalidates the provider-issued JWT.
  }
}
