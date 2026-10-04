"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import {
  beginTotpEnrollmentAction,
  removeUnverifiedTotpAction,
  type TotpEnrollmentActionState,
  type TotpRemovalActionState,
} from "@/app/app/security/actions";
import { TotpChallengeForm } from "@/components/goodz/totp-challenge-form";

const genericMfaError = "Não foi possível configurar a verificação. Tente novamente.";

export type TotpFactorSummary = { id: string; status: "verified" | "unverified"; friendlyName: string | null };

type Enrollment = { factorId: string; qrCode: string; secret: string };

export function MfaSecurityPanel({
  supabaseUrl,
  anonKey,
  factors,
}: Readonly<{ supabaseUrl: string; anonKey: string; factors: TotpFactorSummary[] }>) {
  const [enrollmentResult, enrollmentAction, enrollmentPending] = useActionState<TotpEnrollmentActionState, FormData>(
    beginTotpEnrollmentAction,
    null,
  );
  const [removalResult, removalAction, removalPending] = useActionState<TotpRemovalActionState, FormData>(
    removeUnverifiedTotpAction,
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const enrollment: Enrollment | null = enrollmentResult?.ok
    ? { factorId: enrollmentResult.factorId, qrCode: enrollmentResult.qrCode, secret: enrollmentResult.secret }
    : null;
  const pending = enrollmentPending || removalPending;
  const verifiedFactor = factors.find(({ status }) => status === "verified");
  const unverifiedFactor = factors.find(({ status }) => status === "unverified");

  useEffect(() => {
    if (enrollmentResult && !enrollmentResult.ok) setError(genericMfaError);
    else if (enrollmentResult?.ok) setError(null);
  }, [enrollmentResult]);

  useEffect(() => {
    if (removalResult?.ok) window.location.reload();
    else if (removalResult && !removalResult.ok) setError(genericMfaError);
  }, [removalResult]);

  if (verifiedFactor && !enrollment) {
    return (
      <section className="mfa-panel" aria-labelledby="mfa-panel-title">
        <div className="mfa-panel-heading">
          <span className="auth-eyebrow">SEGURANÇA DA CONTA</span>
          <h1 id="mfa-panel-title">Verificação em duas etapas ativa</h1>
          <p>Use seu aplicativo autenticador para confirmar uma ação protegida.</p>
        </div>
        <TotpChallengeForm
          supabaseUrl={supabaseUrl}
          anonKey={anonKey}
          factorId={verifiedFactor.id}
          buttonLabel="Confirmar e continuar"
          onVerified={() => window.location.assign("/app/admin-guard")}
        />
        <Link className="auth-secondary-link" href="/app">Voltar ao espaço de trabalho</Link>
      </section>
    );
  }

  return (
    <section className="mfa-panel" aria-labelledby="mfa-panel-title">
      <div className="mfa-panel-heading">
        <span className="auth-eyebrow">SEGURANÇA DA CONTA</span>
        <h1 id="mfa-panel-title">Configure o aplicativo autenticador</h1>
        <p>Antes de criar ou remover um fator, confirme sua identidade com a senha da conta. A configuração TOTP fica apenas nesta sessão até a confirmação.</p>
      </div>

      {enrollment ? (
        <div className="mfa-enrollment" aria-labelledby="mfa-enrollment-title">
          <h2 id="mfa-enrollment-title">Conecte seu aplicativo</h2>
          <p>Escaneie o QR code ou informe manualmente a chave no aplicativo autenticador.</p>
          {/* The Auth API returns a per-user data URI. It is rendered only in this local enrollment flow. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="mfa-qr-code" src={enrollment.qrCode} alt="QR code para configurar o aplicativo autenticador" />
          <p className="mfa-secret-label">Chave de configuração manual</p>
          <code className="mfa-manual-secret" data-testid="mfa-manual-secret">{enrollment.secret}</code>
          <p className="mfa-secret-note">Mantenha esta chave privada. Ela não é salva no histórico da conta nem nos registros da aplicação.</p>
          <TotpChallengeForm
            supabaseUrl={supabaseUrl}
            anonKey={anonKey}
            factorId={enrollment.factorId}
            buttonLabel="Confirmar configuração"
            onVerified={() => {
              window.location.assign("/app/admin-guard");
            }}
          />
          <form className="auth-form" action={removalAction}>
            <input type="hidden" name="factor-id" value={enrollment.factorId} />
            <div className="auth-field">
              <label htmlFor="discard-reauth-password">Senha para descartar a configuração</label>
              <input id="discard-reauth-password" name="reauth-password" type="password" autoComplete="current-password" required />
            </div>
            <button className="auth-text-button" type="submit" disabled={pending}>Descartar configuração pendente</button>
          </form>
        </div>
      ) : (
        <div className="mfa-actions">
          {unverifiedFactor ? (
            <>
              <p className="mfa-pending-note">Há uma configuração não confirmada. Remova-a antes de iniciar outra.</p>
              <form className="auth-form" action={removalAction}>
                <input type="hidden" name="factor-id" value={unverifiedFactor.id} />
                <div className="auth-field">
                  <label htmlFor="remove-reauth-password">Senha para reautenticar</label>
                  <input id="remove-reauth-password" name="reauth-password" type="password" autoComplete="current-password" required />
                </div>
                <button className="auth-submit" type="submit" disabled={pending}>
                  {pending ? "Removendo configuração…" : "Confirmar identidade e remover"}
                </button>
              </form>
            </>
          ) : (
            <form className="auth-form" action={enrollmentAction}>
              <div className="auth-field">
                <label htmlFor="enroll-reauth-password">Senha para reautenticar</label>
                <input id="enroll-reauth-password" name="reauth-password" type="password" autoComplete="current-password" required />
              </div>
              <button className="auth-submit" type="submit" disabled={pending}>
                {pending ? "Confirmando identidade…" : "Confirmar identidade e configurar"}
              </button>
            </form>
          )}
        </div>
      )}

      {error ? <p className="auth-error" role="alert" aria-live="assertive">{error}</p> : null}
      <Link className="auth-secondary-link" href="/app">Voltar ao espaço de trabalho</Link>
    </section>
  );
}
