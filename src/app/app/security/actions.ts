"use server";

import { getCurrentAuthContext } from "@/lib/supabase/auth-session";
import {
  clearPrivilegedReauthenticationProof,
  reauthenticateCurrentUser,
  reauthenticateCurrentUserWithClient,
} from "@/lib/supabase/reauthentication.server";

export type TotpEnrollmentActionResult =
  | { ok: false }
  | { ok: true; factorId: string; qrCode: string; secret: string };
export type TotpEnrollmentActionState = null | TotpEnrollmentActionResult;
export type TotpRemovalActionState = null | { ok: boolean };

export type ReauthenticationActionState = null | { kind: "reauthenticated" } | { kind: "denied" };

export async function beginTotpEnrollmentAction(
  _previousState: TotpEnrollmentActionState,
  formData: FormData,
): Promise<TotpEnrollmentActionResult> {
  try {
    const password = formData.get("reauth-password");
    if (typeof password !== "string" || password.length === 0) {
      await clearPrivilegedReauthenticationProof();
      return { ok: false };
    }

    const auth = await getCurrentAuthContext();
    if (!auth) {
      await clearPrivilegedReauthenticationProof();
      return { ok: false };
    }

    const reauthentication = await reauthenticateCurrentUserWithClient(password);
    if (!reauthentication || reauthentication.identityId !== auth.user.id) {
      await clearPrivilegedReauthenticationProof();
      return { ok: false };
    }

    const { data, error } = await reauthentication.client.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "Goodz Menu",
    });
    if (error || !data?.id || !data.totp?.qr_code || !data.totp.secret) {
      await clearPrivilegedReauthenticationProof();
      return { ok: false };
    }

    return { ok: true, factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret };
  } catch {
    await clearPrivilegedReauthenticationProof();
    return { ok: false };
  }
}

export async function removeUnverifiedTotpAction(
  _previousState: TotpRemovalActionState,
  formData: FormData,
): Promise<{ ok: boolean }> {
  const password = formData.get("reauth-password");
  const factorId = formData.get("factor-id");
  if (
    typeof password !== "string"
    || password.length === 0
    || typeof factorId !== "string"
    || !/^[0-9a-f-]{36}$/i.test(factorId)
  ) {
    await clearPrivilegedReauthenticationProof();
    return { ok: false };
  }

  try {
    const auth = await getCurrentAuthContext();
    if (!auth) {
      await clearPrivilegedReauthenticationProof();
      return { ok: false };
    }

    const reauthentication = await reauthenticateCurrentUserWithClient(password);
    if (!reauthentication || reauthentication.identityId !== auth.user.id) {
      await clearPrivilegedReauthenticationProof();
      return { ok: false };
    }

    const { data, error } = await reauthentication.client.auth.mfa.listFactors();
    const factor = data?.all.find(({ id, factor_type, status }) => id === factorId && factor_type === "totp" && status === "unverified");
    if (error || !factor) {
      await clearPrivilegedReauthenticationProof();
      return { ok: false };
    }

    const { error: removalError } = await reauthentication.client.auth.mfa.unenroll({ factorId });
    if (removalError) {
      await clearPrivilegedReauthenticationProof();
      return { ok: false };
    }
    await clearPrivilegedReauthenticationProof();
    return { ok: true };
  } catch {
    await clearPrivilegedReauthenticationProof();
    return { ok: false };
  }
}

export async function reauthenticateForPrivilegedAction(
  _previousState: ReauthenticationActionState,
  formData: FormData,
): Promise<ReauthenticationActionState> {
  const password = formData.get("reauth-password");
  return await reauthenticateCurrentUser(password)
    ? { kind: "reauthenticated" }
    : { kind: "denied" };
}
