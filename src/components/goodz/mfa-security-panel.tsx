"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { TotpChallengeForm } from "@/components/goodz/totp-challenge-form";

const genericMfaError = "Não foi possível configurar a verificação. Tente novamente.";

export type TotpFactorSummary = { id: string; status: "verified" | "unverified"; friendlyName: string | null };

type Enrollment = { factorId: string; qrCode: string; secret: string };

export function MfaSecurityPanel({
  supabaseUrl,
  anonKey,
  factors,
}: Readonly<{ supabaseUrl: string; anonKey: string; factors: TotpFactorSummary[] }>) {
  const supabase = useMemo(() => createBrowserSupabaseClient(supabaseUrl, anonKey), [supabaseUrl, anonKey]);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const verifiedFactor = factors.find(({ status }) => status === "verified");
  const unverifiedFactor = factors.find(({ status }) => status === "unverified");

  async function beginEnrollment() {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const result = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "Goodz Menu" });
      if (result.error || !result.data?.totp?.qr_code || !result.data.totp.secret) {
        setError(genericMfaError);
        setPending(false);
        return;
      }
      setEnrollment({ factorId: result.data.id, qrCode: result.data.totp.qr_code, secret: result.data.totp.secret });
      setPending(false);
    } catch {
      setError(genericMfaError);
      setPending(false);
    }
  }

  async function removeUnverifiedFactor(factorId = unverifiedFactor?.id) {
    if (!factorId || pending) return;
    setPending(true);
    setError(null);
    try {
      const result = await supabase.auth.mfa.unenroll({ factorId });
      if (result.error) {
        setError(genericMfaError);
        setPending(false);
        return;
      }
      window.location.reload();
    } catch {
      setError(genericMfaError);
      setPending(false);
    }
  }

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
        <p>O código temporário protege ações sensíveis. A configuração fica apenas nesta sessão do navegador até a confirmação.</p>
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
              setEnrollment(null);
              window.location.assign("/app/admin-guard");
            }}
          />
          <button className="auth-text-button" type="button" onClick={() => removeUnverifiedFactor(enrollment.factorId)} disabled={pending}>Descartar configuração pendente</button>
        </div>
      ) : (
        <div className="mfa-actions">
          {unverifiedFactor ? (
            <>
              <p className="mfa-pending-note">Há uma configuração não confirmada. Remova-a antes de iniciar outra.</p>
              <button className="auth-submit" type="button" onClick={() => removeUnverifiedFactor()} disabled={pending}>
                {pending ? "Removendo configuração…" : "Remover configuração pendente"}
              </button>
            </>
          ) : null}
          {!unverifiedFactor ? <button className="auth-submit" type="button" onClick={beginEnrollment} disabled={pending}>
            {pending ? "Preparando configuração…" : "Configurar aplicativo autenticador"}
          </button> : null}
        </div>
      )}

      {error ? <p className="auth-error" role="alert" aria-live="assertive">{error}</p> : null}
      <Link className="auth-secondary-link" href="/app">Voltar ao espaço de trabalho</Link>
    </section>
  );
}
