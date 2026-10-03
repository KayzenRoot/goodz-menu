"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useTheme } from "next-themes";
import { ChevronDown, CircleAlert, SunMoon } from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { safePostLoginPath } from "@/lib/auth/navigation";

const genericCredentialError = "Não foi possível entrar. Confira os dados e tente novamente.";

type LoginFormProps = Readonly<{
  supabaseUrl: string;
  anonKey: string;
  returnTo: string;
}>;

function AppearancePicker() {
  const { theme, setTheme } = useTheme();
  return (
    <label className="theme-picker auth-theme-picker">
      <span className="sr-only">Tema de aparência</span>
      <SunMoon size={16} aria-hidden="true" />
      <select aria-label="Tema de aparência" value={theme ?? "system"} onChange={(event) => setTheme(event.target.value)}>
        <option value="system">Sistema</option>
        <option value="light">Claro</option>
        <option value="dark">Escuro</option>
      </select>
      <ChevronDown size={14} aria-hidden="true" />
    </label>
  );
}

export function LoginForm({ supabaseUrl, anonKey, returnTo }: LoginFormProps) {
  const supabase = useMemo(() => createBrowserSupabaseClient(supabaseUrl, anonKey), [supabaseUrl, anonKey]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const formData = new FormData(event.currentTarget);
    const emailValue = formData.get("email");
    const passwordValue = formData.get("password");
    if (typeof emailValue !== "string" || typeof passwordValue !== "string" || !emailValue.trim() || !passwordValue) {
      setErrorMessage(genericCredentialError);
      return;
    }

    setPending(true);
    setErrorMessage(null);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: emailValue.trim(), password: passwordValue });
      if (error || !data.session) {
        setErrorMessage(genericCredentialError);
        setPending(false);
        return;
      }

      window.location.assign(safePostLoginPath(returnTo) ?? "/app");
    } catch {
      setErrorMessage(genericCredentialError);
      setPending(false);
    }
  }

  return (
    <>
      <div className="auth-card-top">
        <span className="auth-step-label">ACESSO À CONTA</span>
        <AppearancePicker />
      </div>
      <div className="auth-heading">
        <span className="auth-eyebrow">BEM-VINDO DE VOLTA</span>
        <h1>Acesse seu espaço de trabalho</h1>
        <p>Entre com seu e-mail e senha para continuar.</p>
      </div>
      <form className="auth-form" onSubmit={handleSubmit} noValidate={false}>
        <div className="auth-field">
          <label htmlFor="login-email">E-mail</label>
          <input id="login-email" name="email" type="email" autoComplete="username" inputMode="email" required />
        </div>
        <div className="auth-field">
          <label htmlFor="login-password">Senha</label>
          <input id="login-password" name="password" type="password" autoComplete="current-password" required />
        </div>
        {errorMessage ? (
          <p className="auth-error" role="alert" aria-live="assertive">
            <CircleAlert size={17} aria-hidden="true" />
            <span>{errorMessage}</span>
          </p>
        ) : null}
        <button className="auth-submit" type="submit" disabled={pending}>
          {pending ? "Verificando acesso…" : "Entrar"}
        </button>
      </form>
      <p className="auth-privacy-note">Sua sessão é verificada pelo servidor. O acesso aos dados depende das permissões vigentes do seu espaço de trabalho.</p>
    </>
  );
}
