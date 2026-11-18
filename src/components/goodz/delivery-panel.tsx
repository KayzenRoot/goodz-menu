"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { reauthenticateForPrivilegedAction } from "@/app/app/security/actions";
import {
  advanceDeliveryDispatchAction,
  saveDeliveryZoneAction,
  type DeliveryActionState,
} from "@/app/app/delivery/actions";
import { PrivilegedStepUpPrompt } from "@/components/goodz/privileged-step-up-prompt";
import {
  filterDeliveriesForQueue,
  getNextForwardDispatchStatus,
  isTerminalDeliveryStatus,
  requiresCourierLabelForTransition,
  type DeliveryDispatchFilterTab,
  type DeliveryDispatchStatus,
} from "@/lib/delivery/delivery-rules";
import { formatBrlNumeric } from "@/lib/orders/order-lifecycle";
import type { Database, Json } from "@/lib/supabase/database.types";

type DeliveryZoneRow = Pick<
  Database["public"]["Tables"]["delivery_zones"]["Row"],
  | "id"
  | "organization_id"
  | "establishment_id"
  | "branch_id"
  | "name"
  | "neighborhoods"
  | "delivery_fee_amount"
  | "minimum_order_amount"
  | "estimated_delivery_minutes"
  | "status"
  | "version"
>;

type DeliveryRow = Pick<
  Database["public"]["Tables"]["deliveries"]["Row"],
  | "id"
  | "organization_id"
  | "establishment_id"
  | "branch_id"
  | "order_id"
  | "delivery_zone_id"
  | "zone_name_snapshot"
  | "status"
  | "courier_label"
  | "delivery_fee_snapshot"
  | "minimum_order_snapshot"
  | "estimated_delivery_minutes"
  | "cancellation_reason"
  | "created_at"
>;

type LinkedOrderSummary = Pick<
  Database["public"]["Tables"]["orders"]["Row"],
  | "id"
  | "order_number"
  | "status"
  | "total_amount"
  | "declared_payment_method"
  | "handoff_payment_status"
  | "customer_name_snapshot"
  | "customer_phone_snapshot"
  | "delivery_address_snapshot"
>;

type DeliveryTransitionRow = Pick<
  Database["public"]["Tables"]["delivery_status_transitions"]["Row"],
  "id" | "delivery_id" | "from_status" | "to_status" | "courier_label" | "reason" | "created_at"
>;

type DeliveryPanelProps = Readonly<{
  supabaseUrl: string;
  anonKey: string;
  tenants: { id: string; displayName: string }[];
  branches: { id: string; displayName: string; establishmentId: string }[];
  selectedOrganizationId: string;
  selectedBranchId: string;
  selectedEstablishmentId: string;
  verifiedFactorIds: string[];
  canReadDelivery: boolean;
  canWriteDelivery: boolean;
  canWriteZones: boolean;
  canCancelOrders: boolean;
  loadFailed: boolean;
  zones: DeliveryZoneRow[];
  deliveries: DeliveryRow[];
  orders: LinkedOrderSummary[];
  transitions: DeliveryTransitionRow[];
}>;

const DISPATCH_STATUS_LABELS: Record<DeliveryDispatchStatus, string> = {
  preparing: "Em preparo",
  ready_for_dispatch: "Pronto p/ despacho",
  assigned: "Entregador atribuído",
  out_for_delivery: "Saiu p/ entrega",
  delivered: "Entregue",
  cancelled: "Entrega cancelada",
};

const DISPATCH_NEXT_LABELS: Record<DeliveryDispatchStatus, string> = {
  preparing: "Em preparo",
  ready_for_dispatch: "Marcar pronto p/ despacho",
  assigned: "Atribuir entregador",
  out_for_delivery: "Registrar saída p/ entrega",
  delivered: "Confirmar entrega concluída",
  cancelled: "Cancelar entrega",
};

export function DeliveryPanel(props: DeliveryPanelProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<DeliveryDispatchFilterTab>("active");
  const [searchQuery, setSearchQuery] = useState("");

  const orderById = new Map(props.orders.map((ord) => [ord.id, ord]));
  const enrichedDeliveries = props.deliveries.map((del) => {
    const linked = orderById.get(del.order_id);
    return {
      ...del,
      orderNumber: linked?.order_number,
      customerName: linked?.customer_name_snapshot,
      linkedOrder: linked ?? null,
    };
  });
  const visibleDeliveries = filterDeliveriesForQueue(enrichedDeliveries, activeTab, searchQuery);

  return (
    <div className="catalog-page delivery-page">
      <header className="catalog-header">
        <div>
          <span className="auth-eyebrow">LOGÍSTICA PRÓPRIA · ZONAS E DESPACHO</span>
          <h1 id="delivery-title">Entrega própria e despacho</h1>
          <p>
            Zonas por unidade com taxa e pedido mínimo exatos em BRL e ciclo auditável de preparo, atribuição, saída e entrega.
          </p>
        </div>
        <nav className="catalog-links" aria-label="Navegação operacional">
          <Link className="auth-entry-link" href="/app">Espaços</Link>
          <Link className="auth-entry-link" href="/app/orders">Pedidos</Link>
          <Link className="auth-entry-link" href="/app/catalog">Catálogo</Link>
          <Link className="auth-entry-link" href="/app/settings">Configurações</Link>
          <Link className="auth-entry-link" href="/app/security">Segurança</Link>
        </nav>
      </header>

      <form className="catalog-scope settings-scope-bar" method="get" action="/app/delivery">
        <div className="auth-field">
          <label htmlFor="delivery-organization">Organização</label>
          <select id="delivery-organization" name="organization" defaultValue={props.selectedOrganizationId} required>
            {props.tenants.map(({ id, displayName }) => (
              <option key={id} value={id}>{displayName}</option>
            ))}
          </select>
        </div>
        <div className="auth-field">
          <label htmlFor="delivery-branch">Unidade de despacho</label>
          <select id="delivery-branch" name="branch" defaultValue={props.selectedBranchId}>
            {props.branches.map(({ id, displayName }) => (
              <option key={id} value={id}>{displayName}</option>
            ))}
          </select>
        </div>
        <button className="auth-submit catalog-scope-submit" type="submit">Selecionar unidade</button>
        <button className="auth-logout" type="button" onClick={() => router.refresh()}>Atualizar despacho</button>
      </form>

      {props.loadFailed ? (
        <p className="catalog-alert" role="alert">
          Não foi possível carregar as zonas e entregas desta unidade. Atualize a página e tente novamente.
        </p>
      ) : (
        <DeliveryConsoleContent
          props={props}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          visibleDeliveries={visibleDeliveries}
        />
      )}
    </div>
  );
}

type EnrichedDelivery = DeliveryRow & Readonly<{
  orderNumber: number | undefined;
  customerName: string | undefined;
  linkedOrder: LinkedOrderSummary | null;
}>;

function DeliveryConsoleContent({
  props,
  activeTab,
  setActiveTab,
  searchQuery,
  setSearchQuery,
  visibleDeliveries,
}: Readonly<{
  props: DeliveryPanelProps;
  activeTab: DeliveryDispatchFilterTab;
  setActiveTab: (tab: DeliveryDispatchFilterTab) => void;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  visibleDeliveries: EnrichedDelivery[];
}>) {
  if (!props.canReadDelivery) {
    return (
      <section className="catalog-empty" aria-labelledby="delivery-no-access-title">
        <h2 id="delivery-no-access-title">Permissão de entregas necessária</h2>
        <p>Sua sessão atual não possui permissão para consultar zonas ou despachos desta unidade.</p>
      </section>
    );
  }

  const activeZonesCount = props.zones.filter((zone) => zone.status === "active").length;
  const activeDispatchCount = props.deliveries.filter(
    (del) => !isTerminalDeliveryStatus(del.status as DeliveryDispatchStatus),
  ).length;

  return (
    <>
      <section className="orders-status-banner" aria-label="Resumo operacional de entrega própria">
        <div>
          <strong>Frota própria desacoplada do PDV:</strong>{" "}
          <span>Regras exatas de taxa e pedido mínimo aplicadas no servidor</span>
        </div>
        <div className="orders-kpi-strip">
          <span className="settings-plan-pill">Zonas ativas: {activeZonesCount}</span>
          <span className="settings-plan-pill">Entregas em curso: {activeDispatchCount}</span>
        </div>
      </section>

      <DeliveryZonesSection props={props} />

      <section className="catalog-section" aria-labelledby="delivery-dispatch-heading">
        <div className="catalog-section-heading">
          <div>
            <span className="catalog-index">02</span>
            <h2 id="delivery-dispatch-heading">Fila de despacho próprio</h2>
          </div>
          <span className="catalog-section-count">{visibleDeliveries.length}</span>
        </div>

        <div className="orders-filter-bar">
          <div className="orders-tabs" role="tablist" aria-label="Filtro de entregas">
            {([
              ["active", "Em andamento"],
              ["delivered", "Entregues"],
              ["cancelled", "Canceladas"],
              ["all", "Todas"],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                role="tab"
                type="button"
                aria-selected={activeTab === key}
                className={`orders-tab-btn ${activeTab === key ? "orders-tab-btn-active" : ""}`}
                onClick={() => setActiveTab(key)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="auth-field catalog-search">
            <label htmlFor="delivery-search">Buscar pedido, entregador ou zona</label>
            <input
              id="delivery-search"
              type="search"
              placeholder="#1001, entregador ou zona"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </div>
        </div>

        {visibleDeliveries.length === 0 ? (
          <p className="catalog-empty-note">Nenhuma entrega própria registrada neste filtro.</p>
        ) : (
          <div className="catalog-card-grid">
            {visibleDeliveries.map((delivery) => (
              <DeliveryDispatchCard
                key={delivery.id}
                delivery={delivery}
                transitions={props.transitions.filter((tr) => tr.delivery_id === delivery.id)}
                canWriteDelivery={props.canWriteDelivery}
                canCancelOrders={props.canCancelOrders}
              />
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function DeliveryZonesSection({ props }: Readonly<{ props: DeliveryPanelProps }>) {
  return (
    <section className="catalog-section" aria-labelledby="delivery-zones-heading">
      <div className="catalog-section-heading">
        <div>
          <span className="catalog-index">01</span>
          <h2 id="delivery-zones-heading">Zonas de cobertura, taxa e pedido mínimo</h2>
        </div>
        <span className="catalog-section-count">{props.zones.length}</span>
      </div>

      {props.canWriteZones ? (
        <CreateDeliveryZoneForm props={props} />
      ) : (
        <p className="catalog-form-note">
          Somente proprietários ou administradores com verificação em duas etapas podem alterar zonas e taxas.
        </p>
      )}

      {props.zones.length === 0 ? (
        <p className="catalog-empty-note">
          Nenhuma zona configurada nesta unidade. Cadastre ao menos uma zona ativa para aplicar taxa e pedido mínimo automáticos.
        </p>
      ) : (
        <div className="catalog-card-grid">
          {props.zones.map((zone) => (
            <DeliveryZoneCard key={zone.id} zone={zone} props={props} />
          ))}
        </div>
      )}
    </section>
  );
}

function CreateDeliveryZoneForm({ props }: Readonly<{ props: DeliveryPanelProps }>) {
  const [state, action, pending] = useActionState(saveDeliveryZoneAction, null);

  return (
    <div>
      <form className="catalog-offer-form" action={action}>
        <input type="hidden" name="organizationId" value={props.selectedOrganizationId} />
        <input type="hidden" name="establishmentId" value={props.selectedEstablishmentId} />
        <input type="hidden" name="branchId" value={props.selectedBranchId} />
        <input type="hidden" name="status" value="active" />

        <div className="catalog-create-grid">
          <div className="auth-field">
            <label htmlFor="new-zone-name">Nome da zona</label>
            <input id="new-zone-name" name="name" placeholder="Ex.: Raio Central" maxLength={120} required />
          </div>
          <div className="auth-field">
            <label htmlFor="new-zone-neighborhoods">Bairros atendidos (separados por vírgula)</label>
            <input
              id="new-zone-neighborhoods"
              name="neighborhoods"
              placeholder="Pinheiros, Vila Madalena, Jardim Paulista"
              required
            />
          </div>
          <div className="auth-field">
            <label htmlFor="new-zone-fee">Taxa de entrega (BRL)</label>
            <input id="new-zone-fee" name="deliveryFee" defaultValue="6.90" required />
          </div>
          <div className="auth-field">
            <label htmlFor="new-zone-min-order">Pedido mínimo (BRL)</label>
            <input id="new-zone-min-order" name="minimumOrder" defaultValue="25.00" required />
          </div>
          <div className="auth-field">
            <label htmlFor="new-zone-minutes">Prazo estimado (min)</label>
            <input id="new-zone-minutes" name="estimatedMinutes" type="number" min={5} max={240} defaultValue="40" required />
          </div>
        </div>

        <button className="catalog-save-button" type="submit" disabled={pending}>
          {pending ? "Salvando zona…" : "Criar zona de entrega (protegido por Admin Guard)"}
        </button>
      </form>

      <DeliveryFeedbackAndStepUp
        idPrefix="new-zone"
        state={state}
        verifiedFactorIds={props.verifiedFactorIds}
        supabaseUrl={props.supabaseUrl}
        anonKey={props.anonKey}
      />
    </div>
  );
}

function DeliveryZoneCard({
  zone,
  props,
}: Readonly<{
  zone: DeliveryZoneRow;
  props: DeliveryPanelProps;
}>) {
  const [state, action, pending] = useActionState(saveDeliveryZoneAction, null);

  return (
    <article className="catalog-card">
      <div className="catalog-card-top">
        <div>
          <span className="catalog-badge">{zone.status === "active" ? "ZONA ATIVA" : "ARQUIVADA"}</span>
          <h3>{zone.name}</h3>
        </div>
        <span className="catalog-meta">v{zone.version} · ~{zone.estimated_delivery_minutes} min</span>
      </div>

      <p className="catalog-description">
        Taxa: <strong>{formatBrlNumeric(zone.delivery_fee_amount)}</strong> · Pedido mínimo:{" "}
        <strong>{formatBrlNumeric(zone.minimum_order_amount)}</strong>
      </p>
      <p className="catalog-meta">Bairros: {zone.neighborhoods.join(", ")}</p>

      {props.canWriteZones ? (
        <>
          <form className="catalog-offer-form" action={action}>
            <input type="hidden" name="zoneId" value={zone.id} />
            <input type="hidden" name="organizationId" value={zone.organization_id} />
            <input type="hidden" name="establishmentId" value={zone.establishment_id} />
            <input type="hidden" name="branchId" value={zone.branch_id} />

            <div className="catalog-create-grid">
              <div className="auth-field">
                <label htmlFor={`zone-name-${zone.id}`}>Nome</label>
                <input id={`zone-name-${zone.id}`} name="name" defaultValue={zone.name} maxLength={120} required />
              </div>
              <div className="auth-field">
                <label htmlFor={`zone-neigh-${zone.id}`}>Bairros</label>
                <input id={`zone-neigh-${zone.id}`} name="neighborhoods" defaultValue={zone.neighborhoods.join(", ")} required />
              </div>
              <div className="auth-field">
                <label htmlFor={`zone-fee-${zone.id}`}>Taxa (BRL)</label>
                <input id={`zone-fee-${zone.id}`} name="deliveryFee" defaultValue={Number(zone.delivery_fee_amount).toFixed(2)} required />
              </div>
              <div className="auth-field">
                <label htmlFor={`zone-min-${zone.id}`}>Mínimo (BRL)</label>
                <input id={`zone-min-${zone.id}`} name="minimumOrder" defaultValue={Number(zone.minimum_order_amount).toFixed(2)} required />
              </div>
              <div className="auth-field">
                <label htmlFor={`zone-est-${zone.id}`}>Prazo (min)</label>
                <input id={`zone-est-${zone.id}`} name="estimatedMinutes" type="number" min={5} max={240} defaultValue={zone.estimated_delivery_minutes} required />
              </div>
              <div className="auth-field">
                <label htmlFor={`zone-status-${zone.id}`}>Estado</label>
                <select id={`zone-status-${zone.id}`} name="status" defaultValue={zone.status}>
                  <option value="active">Ativa</option>
                  <option value="archived">Arquivada</option>
                </select>
              </div>
            </div>

            <button className="auth-logout" type="submit" disabled={pending}>
              {pending ? "Atualizando…" : "Atualizar zona"}
            </button>
          </form>

          <DeliveryFeedbackAndStepUp
            idPrefix={`zone-${zone.id}`}
            state={state}
            verifiedFactorIds={props.verifiedFactorIds}
            supabaseUrl={props.supabaseUrl}
            anonKey={props.anonKey}
          />
        </>
      ) : null}
    </article>
  );
}

function DeliveryDispatchCard({
  delivery,
  transitions,
  canWriteDelivery,
  canCancelOrders,
}: Readonly<{
  delivery: EnrichedDelivery;
  transitions: DeliveryTransitionRow[];
  canWriteDelivery: boolean;
  canCancelOrders: boolean;
}>) {
  const [advanceState, advanceAction, advancePending] = useActionState(advanceDeliveryDispatchAction, null);
  const [cancelState, cancelAction, cancelPending] = useActionState(advanceDeliveryDispatchAction, null);
  const status = delivery.status as DeliveryDispatchStatus;
  const nextStatus = getNextForwardDispatchStatus(status);
  const isTerminal = isTerminalDeliveryStatus(status);
  const addressText = formatAddressSnapshot(delivery.linkedOrder?.delivery_address_snapshot ?? null);

  return (
    <article className="catalog-card">
      <div className="catalog-card-top">
        <div>
          <span className="catalog-badge">{DISPATCH_STATUS_LABELS[status]}</span>
          <h3>
            Pedido #{delivery.orderNumber ?? "—"} · {delivery.customerName ?? "Cliente"}
          </h3>
        </div>
        <span className="catalog-meta">
          {delivery.zone_name_snapshot || "Taxa manual"} · ~{delivery.estimated_delivery_minutes} min
        </span>
      </div>

      <p className="catalog-description">
        Endereço: <strong>{addressText}</strong>
      </p>
      <p className="catalog-meta">
        Taxa aplicada: {formatBrlNumeric(delivery.delivery_fee_snapshot)} · Mínimo da zona:{" "}
        {formatBrlNumeric(delivery.minimum_order_snapshot)}
        {delivery.linkedOrder ? ` · Total pedido: ${formatBrlNumeric(delivery.linkedOrder.total_amount)}` : ""}
      </p>
      <p className="catalog-meta">
        Entregador: <strong>{delivery.courier_label || "Aguardando atribuição"}</strong>
      </p>
      {delivery.cancellation_reason ? (
        <p className="catalog-form-error">Cancelamento: {delivery.cancellation_reason}</p>
      ) : null}

      {canWriteDelivery && nextStatus ? (
        <form className="catalog-offer-form" action={advanceAction}>
          <input type="hidden" name="deliveryId" value={delivery.id} />
          <input type="hidden" name="toStatus" value={nextStatus} />
          <div className="auth-field">
            <label htmlFor={`courier-${delivery.id}`}>
              Identificação do entregador próprio
              {requiresCourierLabelForTransition(nextStatus, delivery.courier_label) ? " (obrigatório)" : " (opcional)"}
            </label>
            <input
              id={`courier-${delivery.id}`}
              name="courierLabel"
              defaultValue={delivery.courier_label}
              placeholder="Ex.: Entregador João · Moto 01"
              maxLength={120}
              required={requiresCourierLabelForTransition(nextStatus, delivery.courier_label)}
            />
          </div>
          <button className="catalog-save-button" type="submit" disabled={advancePending}>
            {advancePending ? "Registrando…" : DISPATCH_NEXT_LABELS[nextStatus]}
          </button>
          <SimpleDeliveryMessage state={advanceState} />
        </form>
      ) : null}

      {canWriteDelivery && canCancelOrders && !isTerminal ? (
        <form className="catalog-offer-form" action={cancelAction}>
          <input type="hidden" name="deliveryId" value={delivery.id} />
          <input type="hidden" name="toStatus" value="cancelled" />
          <div className="auth-field">
            <label htmlFor={`cancel-del-${delivery.id}`}>Motivo para cancelar entrega e pedido</label>
            <input
              id={`cancel-del-${delivery.id}`}
              name="reason"
              placeholder="Ex.: Endereço inacessível confirmado com cliente"
              minLength={3}
              maxLength={500}
              required
            />
          </div>
          <button className="auth-logout" type="submit" disabled={cancelPending}>
            {cancelPending ? "Cancelando…" : "Cancelar despacho"}
          </button>
          <SimpleDeliveryMessage state={cancelState} />
        </form>
      ) : null}

      {transitions.length > 0 ? (
        <div className="orders-history-box">
          <strong>Histórico imutável de despacho ({transitions.length})</strong>
          <ul className="orders-history-list">
            {transitions.map((tr) => (
              <li key={tr.id}>
                {tr.from_status ? `${tr.from_status} → ` : ""}
                <strong>{tr.to_status}</strong>
                {tr.courier_label ? ` (${tr.courier_label})` : ""}
                {tr.reason ? ` — ${tr.reason}` : ""}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </article>
  );
}

function DeliveryFeedbackAndStepUp({
  idPrefix,
  state,
  verifiedFactorIds,
  supabaseUrl,
  anonKey,
}: Readonly<{
  idPrefix: string;
  state: DeliveryActionState;
  verifiedFactorIds: string[];
  supabaseUrl: string;
  anonKey: string;
}>) {
  const [totpVerified, setTotpVerified] = useState(false);
  const [reauthState, reauthAction, reauthPending] = useActionState(
    reauthenticateForPrivilegedAction,
    null,
  );

  if (!state) return null;
  if (state.kind === "factor_setup_required") {
    return (
      <p className="catalog-form-error" role="alert">
        Configure um fator autenticador em <Link href="/app/security">Segurança</Link> antes de salvar zonas. Código:{" "}
        {state.correlationId}
      </p>
    );
  }
  if (state.kind === "step_up_required" || state.kind === "reauthentication_required") {
    return (
      <>
        <output className="catalog-form-note">
          Confirme sua sessão recente e segundo fator antes de salvar a zona de entrega. Código: {state.correlationId}
        </output>
        <PrivilegedStepUpPrompt
          idPrefix={idPrefix}
          state={state}
          verifiedFactorIds={verifiedFactorIds}
          totpVerified={totpVerified}
          setTotpVerified={setTotpVerified}
          supabaseUrl={supabaseUrl}
          anonKey={anonKey}
          reauthentication={reauthState}
          reauthenticationAction={reauthAction}
          reauthenticationPending={reauthPending}
          actionLabel="zona de entrega"
        />
      </>
    );
  }
  return <SimpleDeliveryMessage state={state} />;
}

function SimpleDeliveryMessage({ state }: Readonly<{ state: DeliveryActionState }>) {
  if (!state) return null;
  if (state.kind === "saved") {
    const versionSuffix = state.version === undefined ? "" : ` (v${state.version})`;
    return (
      <output className="catalog-form-success">
        Operação registrada e auditada com sucesso{versionSuffix}. Código: {state.correlationId}
      </output>
    );
  }
  const errorMessages: Record<string, string> = {
    invalid: "Verifique os dados informados (valores em BRL, bairros, entregador ou motivo).",
    denied: "Sua sessão não possui permissão para esta operação de entrega.",
    entitlement_denied: "O plano atual da organização não habilita entrega própria.",
    duplicate_zone: "Já existe uma zona ativa com este nome nesta unidade.",
    invalid_transition: "Transição de despacho inválida para o estado atual.",
    failed: "Não foi possível concluir a operação agora. Tente novamente.",
  };
  return (
    <p className="catalog-form-error" role="alert">
      {errorMessages[state.kind] ?? errorMessages.failed} Código: {state.correlationId}
    </p>
  );
}

function formatAddressSnapshot(snapshot: Json | null): string {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    return "Endereço não informado";
  }
  const street = typeof snapshot.street_line === "string" ? snapshot.street_line : "";
  const numberLabel = typeof snapshot.number_label === "string" ? snapshot.number_label : "";
  const neighborhood = typeof snapshot.neighborhood === "string" ? snapshot.neighborhood : "";
  const city = typeof snapshot.city === "string" ? snapshot.city : "";
  return [street, numberLabel, neighborhood, city].filter(Boolean).join(", ");
}
