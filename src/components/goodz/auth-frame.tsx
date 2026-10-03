import type { ReactNode } from "react";
import Link from "next/link";

export function AuthFrame({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <main className="auth-page">
      <div className="auth-frame">
        <aside className="auth-visual" aria-label="Goodz Menu">
          <Link className="auth-brand" href="/" aria-label="Goodz Menu — início">
            <span className="auth-brand-mark"><span>g</span><i /></span>
            <span className="auth-brand-name">goodz<span>menu</span></span>
          </Link>
          <div className="auth-orbit auth-orbit-one" aria-hidden="true" />
          <div className="auth-orbit auth-orbit-two" aria-hidden="true" />
          <div className="auth-visual-copy">
            <span className="auth-kicker">BOM TER VOCÊ POR AQUI</span>
            <h2>Clareza para cuidar do que importa.</h2>
            <p>Uma sessão segura para entrar no seu espaço de trabalho.</p>
          </div>
          <span className="auth-visual-footer">GOODZ MENU <i /> FUNDAÇÃO DE DESENVOLVIMENTO</span>
        </aside>
        <section className="auth-content">{children}</section>
      </div>
    </main>
  );
}
