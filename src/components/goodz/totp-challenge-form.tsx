"use client";

import { useMemo, useState, type FormEvent } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

const genericMfaError = "Não foi possível confirmar a verificação. Confira o código e tente novamente.";

type TotpChallengeFormProps = Readonly<{
  supabaseUrl: string;
  anonKey: string;
  factorId: string;
  onVerified: () => void;
  buttonLabel?: string;
}>;

export function TotpChallengeForm({ supabaseUrl, anonKey, factorId, onVerified, buttonLabel = "Confirmar código" }: TotpChallengeFormProps) {
  const supabase = useMemo(() => createBrowserSupabaseClient(supabaseUrl, anonKey), [supabaseUrl, anonKey]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const code = form.get("totp-code");
    if (typeof code !== "string" || !/^\d{6,8}$/.test(code)) {
      setError(genericMfaError);
      return;
    }

    setPending(true);
    setError(null);
    try {
      const challenge = await supabase.auth.mfa.challenge({ factorId });
      if (challenge.error || !challenge.data?.id) {
        setError(genericMfaError);
        setPending(false);
        return;
      }

      const verification = await supabase.auth.mfa.verify({ factorId, challengeId: challenge.data.id, code });
      if (verification.error) {
        setError(genericMfaError);
        setPending(false);
        return;
      }

      formElement.reset();
      onVerified();
    } catch {
      setError(genericMfaError);
      setPending(false);
    }
  }

  return (
    <form className="mfa-code-form" method="post" onSubmit={handleSubmit} noValidate>
      <div className="auth-field">
        <label htmlFor="totp-code">Código do aplicativo autenticador</label>
        <input
          id="totp-code"
          name="totp-code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6,8}"
          minLength={6}
          maxLength={8}
          required
          aria-describedby={error ? "totp-code-error" : undefined}
        />
      </div>
      {error ? <p className="auth-error" id="totp-code-error" role="alert" aria-live="assertive">{error}</p> : null}
      <button className="auth-submit" type="submit" disabled={pending}>
        {pending ? "Verificando…" : buttonLabel}
      </button>
    </form>
  );
}
