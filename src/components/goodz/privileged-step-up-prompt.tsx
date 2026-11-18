"use client";

import type { Dispatch, SetStateAction } from "react";
import Link from "next/link";
import type { ReauthenticationActionState } from "@/app/app/security/actions";
import { TotpChallengeForm } from "@/components/goodz/totp-challenge-form";

export type StepUpGateState =
  | null
  | { kind: string; correlationId: string };

export function PrivilegedStepUpPrompt({
  idPrefix,
  state,
  verifiedFactorIds,
  totpVerified,
  setTotpVerified,
  supabaseUrl,
  anonKey,
  reauthentication,
  reauthenticationAction,
  reauthenticationPending,
  actionLabel = "configuração",
}: Readonly<{
  idPrefix: string;
  state: StepUpGateState;
  verifiedFactorIds: string[];
  totpVerified: boolean;
  setTotpVerified: Dispatch<SetStateAction<boolean>>;
  supabaseUrl: string;
  anonKey: string;
  reauthentication: ReauthenticationActionState;
  reauthenticationAction: (formData: FormData) => void;
  reauthenticationPending: boolean;
  actionLabel?: string;
}>) {
  const verifiedFactorId = verifiedFactorIds[0];
  return (
    <>
      {state?.kind === "step_up_required" ? (
        <div className="catalog-step-up" aria-labelledby={`${idPrefix}-step-up`}>
          <h4 id={`${idPrefix}-step-up`}>Confirme a verificação em duas etapas</h4>
          <TotpStepBody
            idPrefix={idPrefix}
            verifiedFactorId={verifiedFactorId}
            totpVerified={totpVerified}
            setTotpVerified={setTotpVerified}
            supabaseUrl={supabaseUrl}
            anonKey={anonKey}
            actionLabel={actionLabel}
          />
        </div>
      ) : null}

      {state?.kind === "reauthentication_required" ? (
        <div className="catalog-step-up" aria-labelledby={`${idPrefix}-reauth`}>
          <h4 id={`${idPrefix}-reauth`}>Confirme sua senha recente</h4>
          <form className="catalog-auth-form" action={reauthenticationAction}>
            <div className="auth-field">
              <label htmlFor={`${idPrefix}-password`}>Senha da conta</label>
              <input
                id={`${idPrefix}-password`}
                name="reauth-password"
                type="password"
                autoComplete="current-password"
                required
              />
            </div>
            <button className="catalog-save-button" type="submit" disabled={reauthenticationPending}>
              {reauthenticationPending ? "Confirmando…" : "Confirmar identidade"}
            </button>
          </form>
          {reauthentication?.kind === "reauthenticated" ? (
            <output className="catalog-step-up-status">
              Identidade confirmada. Envie a {actionLabel} novamente para concluir a alteração.
            </output>
          ) : null}
          {reauthentication?.kind === "denied" ? (
            <p className="catalog-form-error" role="alert">Não foi possível confirmar a identidade.</p>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

function TotpStepBody({
  idPrefix,
  verifiedFactorId,
  totpVerified,
  setTotpVerified,
  supabaseUrl,
  anonKey,
  actionLabel,
}: Readonly<{
  idPrefix: string;
  verifiedFactorId: string | undefined;
  totpVerified: boolean;
  setTotpVerified: Dispatch<SetStateAction<boolean>>;
  supabaseUrl: string;
  anonKey: string;
  actionLabel: string;
}>) {
  if (!verifiedFactorId) {
    return (
      <p>
        Configure um fator autenticador em <Link href="/app/security">Segurança</Link>.
      </p>
    );
  }
  if (totpVerified) {
    return (
      <output className="catalog-step-up-status">
        Código validado. Envie a {actionLabel} novamente para concluir a alteração.
      </output>
    );
  }
  return (
    <TotpChallengeForm
      supabaseUrl={supabaseUrl}
      anonKey={anonKey}
      factorId={verifiedFactorId}
      fieldId={`${idPrefix}-totp`}
      onVerified={() => setTotpVerified(true)}
      buttonLabel={`Validar código e enviar ${actionLabel} novamente`}
    />
  );
}
