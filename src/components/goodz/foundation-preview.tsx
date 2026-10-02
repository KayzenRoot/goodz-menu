"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { motion } from "motion/react";
import { useTheme } from "next-themes";
import {
  Activity, ArrowUpRight, Check, ChevronDown, CircleAlert, CircleCheck, CircleHelp,
  Clock3, Command, Database, ExternalLink, Layers3, Menu, Palette, ShieldCheck,
  SunMoon, Workflow, Zap,
} from "lucide-react";

type Health = { status: string; runtime: string; revision: string; environment: string };
type Ready = { status: string; dependencies?: { supabase?: { status: string; reason?: string } } };
type FeedbackKind = "success" | "info" | "warning" | "error";

const motionPreferenceQuery = "(prefers-reduced-motion: reduce)";

function subscribeToMotionPreference(onChange: () => void) {
  const media = window.matchMedia(motionPreferenceQuery);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function readMotionPreference() {
  return typeof window !== "undefined" && window.matchMedia(motionPreferenceQuery).matches;
}

function usePrefersReducedMotion() {
  return useSyncExternalStore(subscribeToMotionPreference, readMotionPreference, () => true);
}

const feedbackExamples: { kind: FeedbackKind; label: string; text: string }[] = [
  { kind: "success", label: "Sucesso", text: "Exemplo de feedback de sucesso." },
  { kind: "info", label: "Informação", text: "Exemplo de aviso informativo." },
  { kind: "warning", label: "Atenção", text: "Exemplo de atenção necessária." },
  { kind: "error", label: "Erro", text: "Exemplo de erro recuperável." },
];

function StateDot({ state }: { state: "ok" | "pending" | "down" }) {
  return <span className={`state-dot state-dot-${state}`} aria-hidden="true" />;
}

function ThemePicker() {
  const { theme, setTheme } = useTheme();
  return (
    <label className="theme-picker">
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

function EnvironmentBadge() {
  const [environment, setEnvironment] = useState("checking");
  useEffect(() => {
    let active = true;
    void fetch("/api/health", { cache: "no-store" })
      .then((response) => response.json() as Promise<Health>)
      .then((health) => { if (active) setEnvironment(health.environment); })
      .catch(() => { if (active) setEnvironment("unknown"); });
    return () => { active = false; };
  }, []);
  const known = ["local", "test", "staging", "production"].includes(environment);
  return <span className="local-badge"><StateDot state={known ? "ok" : "pending"} />{environment === "checking" ? "..." : environment.toUpperCase()}</span>;
}

function StatusPanel() {
  const [health, setHealth] = useState<Health | null>(null);
  const [ready, setReady] = useState<Ready | null>(null);

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      const [healthResponse, readyResponse] = await Promise.allSettled([
        fetch("/api/health", { cache: "no-store" }),
        fetch("/api/ready", { cache: "no-store" }),
      ]);

      const readJson = async <T,>(response: PromiseSettledResult<Response>): Promise<T | null> => {
        if (response.status !== "fulfilled") return null;
        try {
          return await response.value.json() as T;
        } catch {
          return null;
        }
      };

      const [nextHealth, nextReady] = await Promise.all([
        readJson<Health>(healthResponse),
        readJson<Ready>(readyResponse),
      ]);

      if (!active) return;
      setHealth(nextHealth);
      setReady(nextReady);
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 15_000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  const webUp = health?.status === "ok";
  const dbUp = ready?.dependencies?.supabase?.status === "available";
  const runtimeName = health?.runtime === "docker" ? "Docker Desktop" : health?.runtime === "native" ? "Node.js local" : "Verificando";
  const databaseLabel = dbUp
    ? "Disponível"
    : !ready
      ? "Verificando"
      : ready.dependencies?.supabase?.status === "not_configured"
        ? "Não configurado"
        : "Indisponível";
  return (
    <section className="status-grid" aria-label="Estado da fundação local">
      <article className="status-card">
        <div className="status-card-icon"><Activity size={18} /></div>
        <div className="status-card-copy"><span>Aplicação</span><strong>{webUp ? "Respondendo" : "Verificando"}</strong></div>
        <StateDot state={webUp ? "ok" : "pending"} />
      </article>
      <article className="status-card">
        <div className="status-card-icon database-icon"><Database size={18} /></div>
        <div className="status-card-copy"><span>Supabase local</span><strong>{databaseLabel}</strong></div>
        <StateDot state={dbUp ? "ok" : ready ? "down" : "pending"} />
      </article>
      <article className="status-card">
        <div className="status-card-icon runtime-icon"><Workflow size={18} /></div>
        <div className="status-card-copy"><span>Runtime</span><strong>{runtimeName}</strong></div>
        <StateDot state={health ? "ok" : "pending"} />
      </article>
    </section>
  );
}

function FeedbackLab() {
  const [message, setMessage] = useState(feedbackExamples[1]);
  const Icon = message.kind === "success" ? CircleCheck : message.kind === "warning" ? CircleAlert : message.kind === "error" ? CircleAlert : CircleHelp;
  return (
    <section className="feedback-card glass-panel" aria-labelledby="feedback-title">
      <div className="section-heading-row">
        <div><span className="eyebrow">COMPONENTES DE INTERFACE</span><h2 id="feedback-title">Feedback claro, em cada estado.</h2></div>
        <span className="mini-tag">PRÉVIA</span>
      </div>
      <p className="section-description">Padrões visuais para comunicar progresso, contexto e recuperação. Estes exemplos não executam operações.</p>
      <div className="feedback-examples" role="group" aria-label="Exemplos de feedback">
        {feedbackExamples.map((example) => (
          <button className={`feedback-button feedback-${example.kind}`} key={example.kind} aria-label={`Exibir exemplo de ${example.label}`} onClick={() => setMessage(example)}>
            <span className="feedback-button-icon">{example.kind === "success" ? <Check size={15} /> : example.kind === "info" ? <CircleHelp size={15} /> : <CircleAlert size={15} />}</span>
            {example.label}
          </button>
        ))}
      </div>
      <div className={`toast-preview toast-${message.kind}`} role="status" aria-live="polite">
        <span className="toast-icon"><Icon size={18} /></span>
        <span><strong>{message.label}</strong><small>{message.text}</small></span>
        <span className="toast-preview-label">EXEMPLO</span>
      </div>
    </section>
  );
}

export function FoundationPreview() {
  const reduceMotion = usePrefersReducedMotion();
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="app-frame" data-reduced-motion={reduceMotion ? "true" : "false"}>
      <aside className={`sidebar ${menuOpen ? "sidebar-open" : ""}`}>
        <a className="brand-lockup" href="#inicio" aria-label="Goodz Menu — início">
          <span className="brand-mark"><span>g</span><i /></span>
          <span className="brand-name">goodz<span>menu</span></span>
        </a>
        <div className="workspace-switcher">
          <div className="workspace-avatar">G</div>
          <div><strong>Ambiente local</strong><span>Foundation Preview</span></div>
          <ChevronDown size={15} aria-hidden="true" />
        </div>
        <nav className="side-navigation" aria-label="Navegação da prévia">
          <span className="nav-group-label">ESPAÇO DE TRABALHO</span>
          <a href="#inicio" className="nav-link nav-link-active" aria-current="page"><Layers3 size={17} />Visão geral</a>
          <span className="nav-group-label nav-group-spaced">EM CONSTRUÇÃO</span>
          <button className="nav-link nav-link-disabled" disabled><Zap size={17} />Operação <span>Em breve</span></button>
          <button className="nav-link nav-link-disabled" disabled><Palette size={17} />Identidade <span>Em breve</span></button>
          <button className="nav-link nav-link-disabled" disabled><ShieldCheck size={17} />Plataforma <span>Em breve</span></button>
        </nav>
        <div className="sidebar-bottom">
          <div className="build-card"><span className="build-card-icon"><Command size={15} /></span><div><strong>Fundação v0.1</strong><small>Base de desenvolvimento</small></div></div>
          <div className="profile-row"><div className="profile-avatar">C</div><div><strong>Desenvolvimento</strong><span>Somente ambiente local</span></div><ChevronDown size={14} /></div>
        </div>
      </aside>

      <main className="main-area" id="inicio">
        <header className="topbar">
          <button className="mobile-menu-button" aria-label={menuOpen ? "Fechar navegação" : "Abrir navegação"} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}><Menu size={19} /></button>
          <div className="breadcrumbs"><span>Goodz Menu</span><span className="breadcrumb-divider">/</span><strong>Fundação</strong></div>
          <div className="topbar-actions"><EnvironmentBadge /><ThemePicker /><a className="github-link" href="https://github.com/KayzenRoot/goodz-menu" target="_blank" rel="noreferrer" aria-label="Abrir repositório Goodz Menu no GitHub"><ExternalLink size={17} /></a></div>
        </header>

        <motion.div
          className="page-content"
          initial={reduceMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.32, ease: "easeOut" }}
        >
          <div className="hero-block">
            <div className="hero-copy">
              <div className="hero-kicker"><span className="kicker-line" />PRIMEIRA CAMADA · OUTUBRO 2026</div>
              <h1>Um bom começo<br /><span>para o que vem.</span></h1>
              <p>Base visual e runtime local do Goodz Menu. Uma fundação pronta para evoluir com clareza, cuidado e consistência.</p>
              <div className="hero-actions"><a className="primary-action" href="#sistema">Explorar a fundação <ArrowUpRight size={16} /></a><span className="hero-note"><Clock3 size={14} />Prévia de desenvolvimento</span></div>
            </div>
            <div className="hero-art" aria-hidden="true">
              <div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" />
              <div className="art-tile art-tile-back"><span>g</span></div>
              <div className="art-tile art-tile-front"><span className="art-spark">✳</span><strong>good<br />things.</strong><i>by goodz</i></div>
              <div className="art-chip"><span className="art-chip-dot" />feito para evoluir</div>
            </div>
          </div>

          <section className="foundation-section" aria-labelledby="runtime-title">
            <div className="section-heading-row runtime-heading"><div><span className="eyebrow">RUNTIME · SAÚDE DO AMBIENTE</span><h2 id="runtime-title">Tudo começa com uma base estável.</h2></div><span className="auto-refresh"><span className="pulse-dot" />ATUALIZAÇÃO AUTOMÁTICA</span></div>
            <StatusPanel />
          </section>

          <div className="lower-grid" id="sistema">
            <FeedbackLab />
            <aside className="principles-card" aria-label="Princípios da fundação">
              <div className="principles-top"><span className="principles-icon"><Layers3 size={18} /></span><span className="mini-tag">SISTEMA 01</span></div>
              <span className="eyebrow">FEITO COM INTENÇÃO</span>
              <h2>Clareza é parte do produto.</h2>
              <p>Uma interface confiável começa por estados honestos, hierarquia tranquila e detalhes que ajudam sem disputar atenção.</p>
              <div className="principle-list"><span><Check size={14} />Tema claro, escuro e sistema</span><span><Check size={14} />Acessível por teclado</span><span><Check size={14} />Movimento reduzido respeitado</span></div>
              <div className="principle-footer"><span>GOODZ FOUNDATION</span><span>01 — 04</span></div>
            </aside>
          </div>
          <footer className="page-footer"><span>Goodz Menu <span className="footer-dot">·</span> Fundação de desenvolvimento</span><span>Dados de negócio ainda não conectados</span></footer>
        </motion.div>
      </main>
    </div>
  );
}
