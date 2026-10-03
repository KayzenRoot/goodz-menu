"use client";

import { useMemo, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

export function LogoutButton({ supabaseUrl, anonKey }: Readonly<{ supabaseUrl: string; anonKey: string }>) {
  const supabase = useMemo(() => createBrowserSupabaseClient(supabaseUrl, anonKey), [supabaseUrl, anonKey]);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  async function signOut() {
    if (pending) return;
    setPending(true);
    setFailed(false);
    try {
      const { error } = await supabase.auth.signOut({ scope: "local" });
      if (error) {
        setFailed(true);
        setPending(false);
        return;
      }
      window.location.replace("/login");
    } catch {
      setFailed(true);
      setPending(false);
    }
  }

  return (
    <div className="auth-logout-wrap">
      {failed ? <span className="auth-logout-error" role="alert">Não foi possível encerrar a sessão. Tente novamente.</span> : null}
      <button className="auth-logout" type="button" onClick={() => void signOut()} disabled={pending}>
        {pending ? "Saindo…" : "Sair"}
      </button>
    </div>
  );
}
