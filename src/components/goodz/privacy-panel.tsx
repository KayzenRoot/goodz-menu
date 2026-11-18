"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { reauthenticateForPrivilegedAction } from "@/app/app/security/actions";
import {
  anonymizeCustomerPrivacyAction,
  exportCustomerPrivacyDataAction,
  type PrivacyActionState,
} from "@/app/app/privacy/actions";
import { PrivilegedStepUpPrompt } from "@/components/goodz/privileged-step-up-prompt";
import type { Database } from "@/lib/supabase/database.types";

type PrivacyCustomerRow = Database["public"]["Functions"]["privacy_list_customers"]["Returns"][number];
type ConsentRow = Pick<
  Database["public"]["Tables"]["customer_consents"]["Row"],
  "id" | "customer_id" | "purpose" | "granted" | "source" | "created_at"
>;

type PrivacyPanelProps = Readonly<{
  supabaseUrl: string;
  anonKey: string;
  tenants: { id: string; displayName: string }[];
  selectedOrganizationId: string;
  verifiedFactorIds: string[];
  canReadPrivacy: boolean;
  canManagePrivacy: boolean;
  loadFailed: boolean;
  customers: PrivacyCustomerRow[];
  consents: ConsentRow[];
}>;

export function PrivacyPanel(props: PrivacyPanelProps) {
  return (
    <div className="catalog-page privacy-page">
      <header className="catalog-header">
        <div>
          <span className="auth-eyebrow">GOVERNANÇA LGPD · DADOS PESSOAIS</span>
          <h1 id="privacy-title">Privacidade, retenção e direitos do titular</h1>
          <p>
            Consulte consentimentos imutáveis, prazos de retenção de 365 dias e execute exportação ou anonimização protegidas por Admin Guard sem alterar totais financeiros.
          </p>
        </div>
        <nav className="catalog-links" aria-label="Navegação operacional">
          <Link className="auth-entry-link" href="/app">Espaços</Link>
          <Link className="auth-entry-link" href="/app/orders">Pedidos</Link>
          <Link className="auth-entry-link" href="/app/storefront">Vitrine</Link>
          <Link className="auth-entry-link" href="/app/settings">Configurações</Link>
          <Link className="auth-entry-link" href="/app/security">Segurança</Link>
        </nav>
      </header>

      {props.tenants.length > 0 ? (
        <form className="catalog-scope settings-scope-bar" method="get" action="/app/privacy">
          <div className="auth-field">
            <label htmlFor="priv-org">Organização</label>
            <select id="priv-org" name="organization" defaultValue={props.selectedOrganizationId} required>
              {props.tenants.map(({ id, displayName }) => (
                <option key={id} value={id}>{displayName}</option>
              ))}
            </select>
          </div>
          <button className="auth-submit catalog-scope-submit" type="submit">Selecionar organização</button>
        </form>
      ) : null}

      {props.loadFailed ? (
        <p className="catalog-alert" role="alert">
          Não foi possível carregar o painel de privacidade desta organização.
        </p>
      ) : (
        <PrivacyPanelBody props={props} />
      )}
    </div>
  );
}

function PrivacyPanelBody({ props }: Readonly<{ props: PrivacyPanelProps }>) {
  if (!props.canReadPrivacy) {
    return (
      <section className="catalog-empty" aria-labelledby="priv-denied-title">
        <h2 id="priv-denied-title">Permissão de privacidade necessária</h2>
        <p>Apenas proprietários ou administradores da organização podem acessar registros LGPD e anonimização de titulares.</p>
      </section>
    );
  }

  const activeCount = props.customers.filter((c) => c.anonymized_at === null).length;
  const expiredCount = props.customers.filter((c) => c.is_retention_expired).length;
  const anonymizedCount = props.customers.filter((c) => c.anonymized_at !== null).length;

  return (
    <>
      <section className="orders-status-banner" aria-label="Resumo da política de retenção LGPD">
        <div>
          <strong>Política de retenção ativa (D-0023):</strong> 365 dias após o último pedido concluído.
        </div>
        <div className="orders-kpi-strip">
          <span className="settings-plan-pill">Ativos: {activeCount}</span>
          <span className="settings-plan-pill">Retenção expirada (&gt;365d): {expiredCount}</span>
          <span className="settings-plan-pill">Anonimizados: {anonymizedCount}</span>
        </div>
      </section>

      <section className="catalog-section" aria-labelledby="priv-subjects-heading">
        <div className="catalog-section-heading">
          <h2 id="priv-subjects-heading">Titulares registrados ({props.customers.length})</h2>
        </div>

        {props.customers.length === 0 ? (
          <p className="catalog-empty-note">Nenhum titular registrado em pedidos desta organização até o momento.</p>
        ) : (
          <div className="catalog-grid">
            {props.customers.map((customer) => (
              <CustomerPrivacyCard
                key={customer.customer_id}
                customer={customer}
                consents={props.consents.filter((entry) => entry.customer_id === customer.customer_id)}
                organizationId={props.selectedOrganizationId}
                canManagePrivacy={props.canManagePrivacy}
                verifiedFactorIds={props.verifiedFactorIds}
                supabaseUrl={props.supabaseUrl}
                anonKey={props.anonKey}
              />
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function CustomerPrivacyCard({
  customer,
  consents,
  organizationId,
  canManagePrivacy,
  verifiedFactorIds,
  supabaseUrl,
  anonKey,
}: Readonly<{
  customer: PrivacyCustomerRow;
  consents: ConsentRow[];
  organizationId: string;
  canManagePrivacy: boolean;
  verifiedFactorIds: string[];
  supabaseUrl: string;
  anonKey: string;
}>) {
  const isAnonymized = customer.anonymized_at !== null;
  const retentionLabel = resolveRetentionBadge(isAnonymized, customer.is_retention_expired);

  return (
    <article className="catalog-card" aria-label={`Titular ${customer.display_name}`}>
      <div className="catalog-card-top">
        <div>
          <h3>{customer.display_name}</h3>
          <p className="catalog-meta">Telefone: {customer.phone}</p>
        </div>
        <span className="catalog-badge">{retentionLabel}</span>
      </div>

      <p className="catalog-meta">
        Marketing:{" "}
        <strong>{customer.marketing_opt_in ? "Opt-in ativo" : "Sem opt-in ativo"}</strong>
        {customer.last_order_at ? ` · Último pedido em ${formatShortDate(customer.last_order_at)}` : ""}
      </p>

      {consents.length > 0 ? (
        <div className="orders-history-box">
          <strong>Trilha imutável de consentimento ({consents.length})</strong>
          <ul className="orders-history-list">
            {consents.slice(0, 4).map((consent) => (
              <li key={consent.id}>
                {consent.granted ? "Concedido" : "Revogado"} ({consent.purpose}) via {consent.source}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {canManagePrivacy ? (
        <CustomerPrivacyActions
          customerId={customer.customer_id}
          organizationId={organizationId}
          isAnonymized={isAnonymized}
          verifiedFactorIds={verifiedFactorIds}
          supabaseUrl={supabaseUrl}
          anonKey={anonKey}
        />
      ) : null}
    </article>
  );
}

function CustomerPrivacyActions({
  customerId,
  organizationId,
  isAnonymized,
  verifiedFactorIds,
  supabaseUrl,
  anonKey,
}: Readonly<{
  customerId: string;
  organizationId: string;
  isAnonymized: boolean;
  verifiedFactorIds: string[];
  supabaseUrl: string;
  anonKey: string;
}>) {
  const [exportState, exportAction, exportPending] = useActionState(exportCustomerPrivacyDataAction, null);
  const [anonState, anonAction, anonPending] = useActionState(anonymizeCustomerPrivacyAction, null);
  const [reauthentication, reauthAction, reauthPending] = useActionState(reauthenticateForPrivilegedAction, null);
  const [totpVerified, setTotpVerified] = useState(false);

  const activeGateState = resolveActiveGateState(exportState, anonState);
  const idPrefix = `priv-${customerId.slice(0, 8)}`;

  return (
    <div className="catalog-offer-form">
      <form action={exportAction}>
        <input type="hidden" name="organizationId" value={organizationId} />
        <input type="hidden" name="customerId" value={customerId} />
        <button className="catalog-save-button" type="submit" disabled={exportPending}>
          {exportPending ? "Exportando…" : "Exportar pacote LGPD (JSON)"}
        </button>
      </form>

      {exportState?.kind === "exported" ? (
        <div className="orders-history-box">
          <output className="catalog-form-success">
            Pacote do titular exportado com auditoria registrada.
          </output>
          <pre className="privacy-export-pre">{exportState.payloadJson}</pre>
        </div>
      ) : null}

      {!isAnonymized ? (
        <form className="catalog-offer-form" action={anonAction}>
          <input type="hidden" name="organizationId" value={organizationId} />
          <input type="hidden" name="customerId" value={customerId} />
          <div className="auth-field">
            <label htmlFor={`${idPrefix}-reason`}>Motivo da anonimização LGPD</label>
            <input
              id={`${idPrefix}-reason`}
              name="reason"
              defaultValue="Solicitação do titular (Art. 18 LGPD)"
              minLength={3}
              maxLength={500}
              required
            />
          </div>
          <button className="catalog-save-button" type="submit" disabled={anonPending}>
            {anonPending ? "Anonimizando…" : "Anonimizar dados pessoais"}
          </button>
        </form>
      ) : null}

      <PrivilegedStepUpPrompt
        idPrefix={idPrefix}
        state={activeGateState}
        verifiedFactorIds={verifiedFactorIds}
        totpVerified={totpVerified}
        setTotpVerified={setTotpVerified}
        supabaseUrl={supabaseUrl}
        anonKey={anonKey}
        reauthentication={reauthentication}
        reauthenticationAction={reauthAction}
        reauthenticationPending={reauthPending}
        actionLabel="solicitação LGPD"
      />

      <PrivacyActionFeedback state={anonState ?? exportState} />
    </div>
  );
}

function PrivacyActionFeedback({ state }: Readonly<{ state: PrivacyActionState }>) {
  if (!state || state.kind === "exported") return null;
  if (state.kind === "anonymized") {
    return (
      <output className="catalog-form-success">
        Dados pessoais anonimizados com sucesso. Os totais financeiros concluídos foram preservados.
      </output>
    );
  }
  const errorMessages: Record<string, string> = {
    active_orders: "Não é permitido anonimizar um titular com pedido em andamento. Conclua ou cancele o pedido primeiro.",
    invalid: "Verifique o motivo informado (mínimo de 3 caracteres).",
    denied: "Sua sessão não possui permissão para executar esta operação de privacidade.",
    factor_setup_required: "Ative o segundo fator autenticador (MFA) em Segurança antes de prosseguir.",
    failed: "Não foi possível concluir a operação LGPD agora.",
  };
  const message = errorMessages[state.kind];
  if (!message) return null;
  return (
    <p className="catalog-form-error" role="alert">
      {message}
    </p>
  );
}

function resolveRetentionBadge(isAnonymized: boolean, isExpired: boolean): string {
  if (isAnonymized) return "Anonimizado LGPD";
  if (isExpired) return "Retenção >365d expirada";
  return "Retenção vigente";
}

function resolveActiveGateState(
  exportState: PrivacyActionState,
  anonState: PrivacyActionState,
): PrivacyActionState {
  if (
    anonState?.kind === "step_up_required"
    || anonState?.kind === "reauthentication_required"
  ) {
    return anonState;
  }
  if (
    exportState?.kind === "step_up_required"
    || exportState?.kind === "reauthentication_required"
  ) {
    return exportState;
  }
  return null;
}

function formatShortDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}
