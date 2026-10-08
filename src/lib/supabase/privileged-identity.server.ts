import "server-only";

import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { readSupabaseAuthConfig } from "@/lib/env/runtime-env";
import { getCurrentAuthContext } from "@/lib/supabase/auth-session";
import type { Database } from "@/lib/supabase/database.types";
import {
  hasFreshTotpProof,
  type VerifiedAuthClaims,
} from "@/lib/supabase/admin-guard-policy";
import {
  PRIVILEGED_REAUTH_COOKIE,
  PRIVILEGED_REAUTH_WINDOW_SECONDS,
  hasFreshPasswordAuthentication,
  matchesPasswordGrantIdentity,
} from "@/lib/supabase/reauthentication-policy";

// The single token that carries every fact a privileged money command needs.
//
// The database derives its own verdict from the bearer it is handed: it wants aal2, a recent
// authenticator entry and a recent password entry, all inside one verified token. A password grant
// alone produces the second of those and no aal2. A challenge on the ordinary browser session produces
// the first and keeps whatever password entry that session was created with, which is as old as the
// login. Neither token is sufficient, so this module produces the one that is: it signs in with the
// password on an ephemeral client and verifies the authenticator challenge on that same session, and
// the resulting session carries both entries fresh.
//
// The session is then adopted as the caller's own session, so the application layer and the database
// are reading the same proof rather than two proofs that each satisfy half the requirement.

export type PrivilegedIdentityOutcome = { ok: true } | { ok: false; message: string };

function ephemeralClient(apiUrl: string, anonKey: string) {
  return createClient<Database>(apiUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
}

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

export async function confirmPrivilegedIdentity(
  password: unknown,
  code: unknown,
): Promise<PrivilegedIdentityOutcome> {
  if (typeof password !== "string" || password.length === 0 || password.length > 1024) {
    return { ok: false, message: "Informe a senha para confirmar a identidade." };
  }
  if (typeof code !== "string" || !/^\d{6}$/.test(code)) {
    return { ok: false, message: "Informe o código de seis dígitos do aplicativo autenticador." };
  }

  let granted: Awaited<ReturnType<typeof getCurrentAuthContext>> = null;
  try {
    granted = await getCurrentAuthContext();
  } catch {
    granted = null;
  }
  if (!granted?.user.id || (!granted.user.email && !granted.user.phone)) {
    return { ok: false, message: "Sessão expirada. Entre novamente para continuar." };
  }

  const identityId = granted.user.id;
  const runtime = readSupabaseAuthConfig();
  if (!runtime.ok) {
    return { ok: false, message: "Não foi possível confirmar a identidade agora. Tente novamente." };
  }

  const verifier = ephemeralClient(runtime.config.supabaseApiUrl.toString(), runtime.config.anonKey);
  try {
    const credentials = granted.user.email
      ? { email: granted.user.email, password }
      : { phone: granted.user.phone!, password };
    const { data: passwordSession, error: passwordError } = await verifier.auth.signInWithPassword(credentials);
    const grantToken = passwordSession.session?.access_token;
    if (
      passwordError
      || !grantToken
      || !passwordSession.session?.refresh_token
      || !matchesPasswordGrantIdentity(identityId, passwordSession.user?.id, passwordSession.session.user.id)
    ) {
      return { ok: false, message: "Senha ou identidade não conferem." };
    }

    const { data: factors, error: factorsError } = await verifier.auth.mfa.listFactors();
    const factorId = factors?.totp.find(({ status }) => status === "verified")?.id;
    if (factorsError || !factorId) {
      return { ok: false, message: "Configure um aplicativo autenticador para habilitar esta alteração." };
    }

    const { data: verified, error: verifyError } = await verifier.auth.mfa.challengeAndVerify({
      factorId,
      code,
    });
    const proofToken = verified?.access_token;
    const refreshToken = verified?.refresh_token;
    if (verifyError || !proofToken || !refreshToken) {
      return { ok: false, message: "O código do aplicativo autenticador não foi aceito." };
    }

    // The proof is only worth storing if it says what it must say, read from the token itself rather
    // than from the calls that produced it.
    const { data: claimsPayload, error: claimsError } = await verifier.auth.getClaims(proofToken);
    const claims = claimsPayload?.claims as VerifiedAuthClaims | undefined;
    const at = nowSeconds();
    if (
      claimsError
      || claims?.sub !== identityId
      || claims?.aal !== "aal2"
      || !hasFreshTotpProof(claims?.amr, at)
      || !hasFreshPasswordAuthentication(claims, at)
    ) {
      return { ok: false, message: "A confirmação não foi reconhecida como recente. Tente novamente." };
    }

    const cookieStore = await cookies();
    cookieStore.set(PRIVILEGED_REAUTH_COOKIE, proofToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/app",
      maxAge: PRIVILEGED_REAUTH_WINDOW_SECONDS,
    });

    // Adopting the session is what raises the caller's own session to aal2, so the application layer
    // stops reading a session that could never satisfy the check it applies to every privileged call.
    const { error: adoptError } = await granted.client.auth.setSession({
      access_token: proofToken,
      refresh_token: refreshToken,
    });
    if (adoptError) {
      await clearPrivilegedProofCookie();
      return { ok: false, message: "Não foi possível confirmar a identidade agora. Tente novamente." };
    }

    return { ok: true };
  } catch {
    await clearPrivilegedProofCookie();
    return { ok: false, message: "Não foi possível confirmar a identidade agora. Tente novamente." };
  }
}

async function clearPrivilegedProofCookie(): Promise<void> {
  try {
    (await cookies()).set(PRIVILEGED_REAUTH_COOKIE, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/app",
      maxAge: 0,
    });
  } catch {
    // Failure to clear grants nothing: every use revalidates the provider-issued token.
  }
}
