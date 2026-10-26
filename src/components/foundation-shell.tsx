"use client";

import {
  Activity,
  ArrowUpRight,
  Bell,
  BookOpen,
  Check,
  CircleAlert,
  CircleCheck,
  CircleHelp,
  Clock3,
  Database,
  LayoutDashboard,
  Menu,
  PackageCheck,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { ThemeControl } from "@/components/theme-control";

type RuntimePayload = {
  environment?: string;
  runtime?: string;
  revision?: string;
};

type EndpointResult = {
  ok: boolean;
  body: RuntimePayload;
};

export function FoundationShell() {
  const [appOnline, setAppOnline] = useState<boolean | null>(null);
  const [supabaseReady, setSupabaseReady] = useState<boolean | null>(null);
  const [runtimeIdentity, setRuntimeIdentity] = useState({ environment: "local", runtime: "native", revision: "local" });
  const [refreshing, setRefreshing] = useState(false);

  const refreshStatus = useCallback(async () => {
    setRefreshing(true);
    const [health, ready] = await Promise.all([
      requestRuntimeEndpoint("/api/health"),
      requestRuntimeEndpoint("/api/ready"),
    ]);

    setAppOnline(health?.ok ?? false);
    setSupabaseReady(ready?.ok ?? false);

    if (health?.body) {
      setRuntimeIdentity({
        environment: safeIdentity(health.body.environment, ["local", "test"], "unknown"),
        runtime: safeIdentity(health.body.runtime, ["native", "docker"], "unknown"),
        revision: safeRevision(health.body.revision),
      });
    }
    setRefreshing(false);
  }, []);

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  const appState = statePresentation(appOnline, refreshing);
  const supabaseState = statePresentation(supabaseReady, refreshing);

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Pular para o conteúdo</a>

      <aside className="sidebar" aria-label="Barra lateral">
          <Link className="brand" href="/">
          <span className="brand-mark" aria-hidden="true">g</span>
          <span className="brand-copy">
            <strong>goodz</strong>
            <span>MENU PLATFORM</span>
          </span>
        </Link>

        <div className="workspace-switcher">
          <span className="workspace-avatar" aria-hidden="true">G</span>
          <span className="workspace-copy">
            <strong>Ambiente local</strong>
            <span>Fundação do produto</span>
          </span>
          <span className="workspace-chevron" aria-hidden="true">⌄</span>
        </div>

        <nav className="primary-nav" aria-label="Navegação principal">
          <p className="nav-label">PLATAFORMA</p>
          <Link className="nav-link nav-link-active" href="/" aria-current="page">
            <LayoutDashboard aria-hidden="true" size={18} />
            <span>Visão geral</span>
          </Link>
          <button className="nav-link nav-link-disabled" type="button" disabled>
            <Menu aria-hidden="true" size={18} />
            <span>Cardápio</span>
            <span className="nav-badge">Em breve</span>
          </button>
          <button className="nav-link nav-link-disabled" type="button" disabled>
            <PackageCheck aria-hidden="true" size={18} />
            <span>Pedidos</span>
            <span className="nav-badge">Em breve</span>
          </button>
          <button className="nav-link nav-link-disabled" type="button" disabled>
            <BookOpen aria-hidden="true" size={18} />
            <span>Equipe</span>
            <span className="nav-badge">Em breve</span>
          </button>
        </nav>

        <div className="sidebar-spacer" />

        <div className="local-note">
          <span className="local-note-icon"><ShieldCheck aria-hidden="true" size={17} /></span>
          <div>
            <strong>Escopo seguro</strong>
            <p>Esta base usa serviços locais. Nenhum projeto remoto é consultado.</p>
          </div>
        </div>

        <div className="profile-row">
          <span className="profile-avatar" aria-hidden="true">G</span>
          <span className="profile-copy"><strong>Goodz Menu</strong><span>Prévia de fundação</span></span>
          <button className="icon-button profile-menu" type="button" aria-label="Mais opções da conta" disabled>
            <Bell aria-hidden="true" size={16} />
          </button>
        </div>
      </aside>

      <div className="main-column">
        <header className="topbar">
          <div className="breadcrumb" aria-label="Localização atual">
            <span>Goodz Menu</span><span className="breadcrumb-divider">/</span><strong>Fundação</strong>
          </div>
          <div className="topbar-actions">
            <span className="local-indicator"><span className="local-indicator-dot" /> Somente local</span>
            <ThemeControl />
          </div>
        </header>

        <main className="page-content" id="main-content">
          <section className="welcome-panel" aria-labelledby="welcome-title">
            <div className="welcome-copy">
              <p className="eyebrow"><Sparkles aria-hidden="true" size={14} /> NÚCLEO DA PLATAFORMA <span>•</span> MÓDULO 00</p>
              <h1 id="welcome-title">Uma base clara para o que vem a seguir.</h1>
              <p className="welcome-description">
                O Goodz Menu está começando pelo runtime, pela experiência e pela validação local.
                Os módulos de negócio entram depois de cada limite ser aprovado.
              </p>
              <div className="welcome-actions">
                <button className="primary-button" type="button" onClick={() => void refreshStatus()} disabled={refreshing}>
                  <RefreshCw aria-hidden="true" size={16} className={refreshing ? "refresh-icon is-spinning" : "refresh-icon"} />
                  {refreshing ? "Verificando" : "Atualizar estado"}
                </button>
                <span className="safe-copy"><ShieldCheck aria-hidden="true" size={15} /> Sem conexão remota</span>
              </div>
            </div>

            <div className="welcome-art" aria-hidden="true">
              <div className="art-orbit art-orbit-outer" />
              <div className="art-orbit art-orbit-inner" />
              <div className="art-sun" />
              <div className="art-card art-card-back"><span className="art-card-line art-card-line-wide" /><span className="art-card-line" /><span className="art-card-dot" /></div>
              <div className="art-card art-card-front">
                <span className="art-check"><Check size={20} strokeWidth={2.4} /></span>
                <span className="art-card-line art-card-line-wide" />
                <span className="art-card-line" />
                <span className="art-card-status"><span /> pronto para validar</span>
              </div>
              <span className="art-spark art-spark-one">✳</span>
              <span className="art-spark art-spark-two">✦</span>
            </div>
          </section>

          <section className="runtime-section" aria-labelledby="runtime-title">
            <div className="section-heading">
              <div>
                <p className="eyebrow eyebrow-muted">AGORA</p>
                <h2 id="runtime-title">Estado da fundação</h2>
              </div>
              <span className="section-caption">Verificado neste navegador</span>
            </div>

            <div className="status-grid">
              <StatusCard
                title="Aplicação web"
                detail="Liveness do runtime"
                icon={<Activity aria-hidden="true" size={19} />}
                state={appState}
              />
              <StatusCard
                title="Supabase local"
                detail={supabaseReady === false ? "Inicie a stack local para continuar" : "Readiness da dependência local"}
                icon={<Database aria-hidden="true" size={19} />}
                state={supabaseState}
              />
              <article className="status-card runtime-card">
                <div className="status-card-top">
                  <span className="status-icon status-icon-neutral"><CircleHelp aria-hidden="true" size={19} /></span>
                  <span className="status-chip status-chip-neutral">IDENTIDADE</span>
                </div>
                <h3>Runtime</h3>
                <p className="status-detail">Ambiente e revisão seguros</p>
                <div className="runtime-values">
                  <span>{runtimeIdentity.environment} <i>·</i> {runtimeIdentity.runtime}</span>
                  <code title="Revisão de build">{runtimeIdentity.revision}</code>
                </div>
              </article>
            </div>
          </section>

          <section className="feedback-section" aria-labelledby="feedback-title">
            <div className="section-heading">
              <div>
                <p className="eyebrow eyebrow-muted">SISTEMA DE FEEDBACK</p>
                <h2 id="feedback-title">Estados com contexto</h2>
              </div>
              <span className="section-caption">Exemplos de interface, sem dados de negócio</span>
            </div>

            <div className="feedback-grid">
              <div className="feedback-card feedback-success" role="status">
                <span className="feedback-icon"><CircleCheck aria-hidden="true" size={18} /></span>
                <div><strong>Pronto para seguir</strong><p>Uma etapa local terminou e pode ser revisada.</p></div>
              </div>
              <div className="feedback-card feedback-info" role="status">
                <span className="feedback-icon"><Sparkles aria-hidden="true" size={18} /></span>
                <div><strong>Informação importante</strong><p>O próximo módulo só começa depois da auditoria.</p></div>
              </div>
              <div className="feedback-card feedback-warning" role="status">
                <span className="feedback-icon"><TriangleAlert aria-hidden="true" size={18} /></span>
                <div><strong>Dependência pendente</strong><p>O Supabase local precisa estar ativo para readiness.</p></div>
              </div>
              <div className="feedback-card feedback-error" role="alert">
                <span className="feedback-icon"><CircleAlert aria-hidden="true" size={18} /></span>
                <div><strong>Falha segura</strong><p>Diagnósticos internos não aparecem nesta mensagem.</p></div>
              </div>
            </div>
          </section>

          <section className="next-step-panel" aria-label="Próximo incremento planejado">
            <span className="next-step-icon"><Clock3 aria-hidden="true" size={18} /></span>
            <div className="next-step-copy">
              <span className="eyebrow eyebrow-muted">PRÓXIMO INCREMENTO PLANEJADO</span>
              <strong>M01 · Platform Core &amp; Multi-Tenancy</strong>
              <p>Organizações, estabelecimentos e filiais começam em um Work Order próprio.</p>
            </div>
            <span className="planned-pill">Ainda não iniciado</span>
            <ArrowUpRight aria-hidden="true" className="next-step-arrow" size={18} />
          </section>

          <footer className="page-footer">
            <span>Goodz Menu <i>·</i> Fundação executável</span>
            <span>Este preview não representa dados operacionais.</span>
          </footer>
        </main>
      </div>
    </div>
  );
}

type StatusCardProps = {
  title: string;
  detail: string;
  icon: ReactNode;
  state: { label: string; className: string };
};

function StatusCard({ title, detail, icon, state }: StatusCardProps) {
  return (
    <article className="status-card">
      <div className="status-card-top">
        <span className="status-icon">{icon}</span>
        <span className={`status-chip ${state.className}`} role="status" aria-live="polite" aria-atomic="true">
          <span className="sr-only">{title}: </span>
          <span aria-hidden="true" />
          {state.label}
        </span>
      </div>
      <h3>{title}</h3>
      <p className="status-detail">{detail}</p>
      <div className="status-card-bottom">
        <span aria-hidden="true"><span className={`status-dot ${state.className}`} /> {state.label}</span>
        <span className="status-card-mark" aria-hidden="true"><Check size={14} /></span>
      </div>
    </article>
  );
}

async function requestRuntimeEndpoint(path: string): Promise<EndpointResult | null> {
  try {
    const response = await fetch(path, {
      cache: "no-store",
      headers: { accept: "application/json" },
    });
    const body: unknown = await response.json().catch(() => null);
    return { ok: response.ok, body: isRecord(body) ? body : {} };
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function safeIdentity(value: unknown, allowed: readonly string[], fallback: string): string {
  return typeof value === "string" && allowed.includes(value) ? value : fallback;
}

function safeRevision(value: unknown): string {
  return typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(value) ? value : "unknown";
}

function statePresentation(available: boolean | null, refreshing: boolean) {
  if (available === true) return { label: "Operacional", className: "status-ready" };
  if (available === false) return { label: "Indisponível", className: "status-down" };
  return { label: refreshing ? "Verificando" : "Aguardando", className: "status-pending" };
}
