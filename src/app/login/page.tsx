import type { Metadata } from "next";
import { AuthFrame } from "@/components/goodz/auth-frame";
import { LoginForm } from "@/components/goodz/login-form";
import { readSupabaseAuthConfig, safePostLoginPath } from "@/lib/env/runtime-env";

export const metadata: Metadata = {
  title: "Entrar · Goodz Menu",
  description: "Acesse com segurança o seu espaço de trabalho Goodz Menu.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const requestedPath = Array.isArray(params.next) ? params.next[0] : params.next;
  const returnTo = safePostLoginPath(requestedPath) ?? "/app";
  const config = readSupabaseAuthConfig();

  return (
    <AuthFrame>
      {config.ok ? (
        <LoginForm
          supabaseUrl={config.config.supabaseApiUrl.toString()}
          anonKey={config.config.anonKey}
          returnTo={returnTo}
        />
      ) : (
        <div className="auth-unavailable">
          <span className="auth-eyebrow">ACESSO À CONTA</span>
          <h1>Acesse seu espaço de trabalho</h1>
          <p className="auth-error" role="alert">O acesso local não está configurado neste ambiente.</p>
        </div>
      )}
    </AuthFrame>
  );
}
