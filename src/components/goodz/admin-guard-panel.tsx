"use client";

import { useActionState } from "react";
import Link from "next/link";
import { reauthenticateForPrivilegedAction, type ReauthenticationActionState } from "@/app/app/security/actions";
import { runSyntheticPrivilegedProofAction, type AdminGuardActionState } from "@/app/app/admin-guard/actions";
import { TotpChallengeForm } from "@/components/goodz/totp-challenge-form";

type BranchOption = { id: string; displayName: string };

export function AdminGuardPanel({
  branches,
  initialBranchId,
  verifiedFactorIds,
  supabaseUrl,
  anonKey,
}: Readonly<{
  branches: BranchOption[];
  initialBranchId: string;
  verifiedFactorIds: string[];
  supabaseUrl: string;
  anonKey: string;
}>) {
  const [state, formAction, pending] = useActionState<AdminGuardActionState, FormData>(runSyntheticPrivilegedProofAction, null);
  const [reauthentication, reauthenticationAction, reauthenticationPending] = useActionState<ReauthenticationActionState, FormData>(reauthenticateForPrivilegedAction, null);
  const targetIsVisible = branches.some(({ id }) => id === initialBranchId);

  return (
    <section className="mfa-panel admin-guard-panel" aria-labelledby="admin-guard-title">
      <div className="mfa-panel-heading">
        <span className="auth-eyebrow">PROTEÇÃO DE AÇÕES SENSÍVEIS</span>
        <h1 id="admin-guard-title">Goodz Admin Guard</h1>
        <p>Esta ação sintética valida a identidade, a permissão atual do espaço e uma verificação recente em duas etapas. Nenhum dado de negócio é alterado.</p>
      </div>

      <form className="auth-form" action={formAction}>
        {branches.length > 0 ? (
          <div className="auth-field">
            <label htmlFor="proof-branch">Unidade autorizada</label>
            <select id="proof-branch" name="resourceId" defaultValue={targetIsVisible ? initialBranchId : branches[0].id} required>
              {branches.map(({ id, displayName }) => <option key={id} value={id}>{displayName}</option>)}
            </select>
          </div>
        ) : initialBranchId ? (
          <input type="hidden" name="resourceId" value={initialBranchId} />
        ) : (
          <p className="mfa-pending-note">Não há uma unidade autorizada disponível para validar esta ação.</p>
        )}

        <button className="auth-submit" type="submit" disabled={pending || (branches.length === 0 && !initialBranchId)}>
          {pending ? "Validando proteção…" : "Executar ação sintética protegida"}
        </button>
      </form>

      {state?.kind === "allowed" ? (
        <p className="mfa-status mfa-status-success" role="status" aria-live="polite">A proteção foi validada. Nenhum dado de negócio foi alterado.</p>
      ) : null}
      {state?.kind === "step_up_required" ? (
        <div className="mfa-step-up" aria-live="polite">
          <p className="mfa-status" role="status">Verificação adicional necessária para continuar.</p>
          {verifiedFactorIds.length > 0 ? (
            <>
              <form className="auth-form" action={reauthenticationAction}>
                <div className="auth-field">
                  <label htmlFor="guard-reauth-password">Senha para reautenticar</label>
                  <input id="guard-reauth-password" name="reauth-password" type="password" autoComplete="current-password" required />
                </div>
                <button className="auth-submit" type="submit" disabled={reauthenticationPending}>
                  {reauthenticationPending ? "Confirmando identidade…" : "Confirmar identidade"}
                </button>
              </form>
              {reauthentication?.kind === "reauthenticated" ? (
                <p className="mfa-status reauth-status" role="status">Identidade confirmada. Conclua a verificação em duas etapas.</p>
              ) : null}
              {reauthentication?.kind === "denied" ? (
                <p className="auth-error" role="alert">Não foi possível confirmar a identidade. Tente novamente.</p>
              ) : null}
              <TotpChallengeForm
                supabaseUrl={supabaseUrl}
                anonKey={anonKey}
                factorId={verifiedFactorIds[0]}
                buttonLabel="Confirmar etapa adicional"
                onVerified={() => window.location.reload()}
              />
            </>
          ) : (
            <Link className="auth-entry-link" href="/app/security">Configurar aplicativo autenticador</Link>
          )}
        </div>
      ) : null}
      {state?.kind === "factor_setup_required" ? (
        <div className="mfa-step-up" aria-live="polite">
          <p className="mfa-status" role="status">Configure novamente o aplicativo autenticador para continuar.</p>
          <Link className="auth-entry-link" href="/app/security">Configurar aplicativo autenticador</Link>
        </div>
      ) : null}
      {state?.kind === "denied" ? (
        <p className="auth-error" role="alert" aria-live="assertive">Esta unidade não está autorizada para a ação solicitada.</p>
      ) : null}

      <div className="mfa-panel-links">
        <Link className="auth-secondary-link" href="/app/security">Segurança da conta</Link>
        <Link className="auth-secondary-link" href="/app">Voltar ao espaço de trabalho</Link>
      </div>
    </section>
  );
}
