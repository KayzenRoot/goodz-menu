"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { reauthenticateForPrivilegedAction } from "@/app/app/security/actions";
import {
  placeStaffOrderAction,
  recordHandoffPaymentAction,
  transitionOrderStatusAction,
  type OrdersActionState,
} from "@/app/app/orders/actions";
import { PrivilegedStepUpPrompt } from "@/components/goodz/privileged-step-up-prompt";
import {
  filterOrdersForQueue,
  formatBrlNumeric,
  getNextForwardOrderStatus,
  isSensitiveHandoffStatus,
  isTerminalOrderStatus,
  type HandoffPaymentStatus,
  type OrderFulfillmentMode,
  type OrderQueueFilterTab,
  type OrderStatus,
  type RecordedHandoffPaymentStatus,
} from "@/lib/orders/order-lifecycle";
import type { HandoffPaymentMethod } from "@/lib/settings/settings-resolver";
import type { Database } from "@/lib/supabase/database.types";

export type OrderAvailableOfferOption = Readonly<{
  id: string;
  label: string;
  basePrice: number;
}>;

export type OrderDeliveryZoneOption = Readonly<{
  id: string;
  name: string;
  neighborhoods: string[];
  deliveryFeeAmount: number;
  minimumOrderAmount: number;
  estimatedMinutes: number;
}>;

type OrderRow = Pick<
  Database["public"]["Tables"]["orders"]["Row"],
  | "id"
  | "organization_id"
  | "establishment_id"
  | "branch_id"
  | "order_number"
  | "fulfillment_mode"
  | "status"
  | "currency"
  | "subtotal_amount"
  | "delivery_fee_amount"
  | "total_amount"
  | "declared_payment_method"
  | "cash_change_for_amount"
  | "handoff_payment_status"
  | "customer_name_snapshot"
  | "customer_phone_snapshot"
  | "delivery_address_snapshot"
  | "customer_notes"
  | "cancellation_reason"
  | "placed_at"
>;

type OrderItemRow = Pick<
  Database["public"]["Tables"]["order_items"]["Row"],
  "id" | "order_id" | "line_number" | "display_name_snapshot" | "quantity" | "unit_price_snapshot" | "line_total_amount" | "notes"
>;

type OrderTransitionRow = Pick<
  Database["public"]["Tables"]["order_status_transitions"]["Row"],
  "id" | "order_id" | "from_status" | "to_status" | "actor_kind" | "reason" | "created_at"
>;

type OrderHandoffRow = Pick<
  Database["public"]["Tables"]["order_handoff_payments"]["Row"],
  "id" | "order_id" | "payment_method" | "amount" | "status" | "reason" | "created_at"
>;

type OrdersPanelProps = Readonly<{
  supabaseUrl: string;
  anonKey: string;
  tenants: { id: string; displayName: string }[];
  branches: { id: string; displayName: string; establishmentId: string }[];
  selectedOrganizationId: string;
  selectedBranchId: string;
  selectedEstablishmentId: string;
  verifiedFactorIds: string[];
  canReadOrders: boolean;
  canWriteOrders: boolean;
  canCancelOrders: boolean;
  canWriteHandoff: boolean;
  canWriteSensitiveHandoff: boolean;
  orderingEnabled: boolean;
  loadFailed: boolean;
  availableOffers: OrderAvailableOfferOption[];
  deliveryZones: OrderDeliveryZoneOption[];
  orders: OrderRow[];
  items: OrderItemRow[];
  transitions: OrderTransitionRow[];
  handoffPayments: OrderHandoffRow[];
}>;

const STATUS_LABELS: Record<OrderStatus, string> = {
  placed: "Novo na fila",
  accepted: "Aceito",
  preparing: "Em preparo",
  ready_for_pickup: "Pronto p/ retirada",
  ready_for_dispatch: "Pronto p/ despacho",
  out_for_delivery: "Saiu p/ entrega",
  completed: "Concluído",
  cancelled: "Cancelado",
};

const NEXT_ACTION_LABELS: Record<OrderStatus, string> = {
  placed: "Novo",
  accepted: "Aceitar pedido",
  preparing: "Iniciar preparo",
  ready_for_pickup: "Marcar pronto p/ retirada",
  ready_for_dispatch: "Marcar pronto p/ despacho",
  out_for_delivery: "Registrar saída p/ entrega",
  completed: "Concluir pedido",
  cancelled: "Cancelar",
};

const PAYMENT_METHOD_LABELS: Record<HandoffPaymentMethod, string> = {
  pix_in_person: "Pix presencial",
  debit_card_pos: "Débito (maquininha)",
  credit_card_pos: "Crédito (maquininha)",
  cash: "Dinheiro",
};

const HANDOFF_STATUS_LABELS: Record<HandoffPaymentStatus, string> = {
  pending: "Aguardando recebimento presencial",
  collected: "Recebido no handoff",
  failed: "Tentativa falhou",
  cancelled: "Cobrança cancelada",
  reversed: "Estornado (auditado)",
  disputed: "Em disputa (auditado)",
};

export function OrdersPanel(props: OrdersPanelProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<OrderQueueFilterTab>("active");
  const [searchQuery, setSearchQuery] = useState("");
  const visibleOrders = filterOrdersForQueue(props.orders, activeTab, searchQuery);

  return (
    <div className="catalog-page orders-page">
      <header className="catalog-header">
        <div>
          <span className="auth-eyebrow">OPERAÇÃO · FILA CANÔNICA DE PEDIDOS</span>
          <h1 id="orders-title">Fila de pedidos</h1>
          <p>
            Ciclo operacional auditável de pedidos próprios Goodz, retirada ou entrega própria e registro de recebimento presencial.
          </p>
        </div>
        <nav className="catalog-links" aria-label="Navegação da conta">
          <Link className="auth-entry-link" href="/app">Espaços</Link>
          <Link className="auth-entry-link" href="/app/delivery">Entregas</Link>
          <Link className="auth-entry-link" href="/app/catalog">Catálogo</Link>
          <Link className="auth-entry-link" href="/app/settings">Configurações</Link>
          <Link className="auth-entry-link" href="/app/security">Segurança</Link>
        </nav>
      </header>

      <OrdersScopeBar props={props} onRefresh={() => router.refresh()} />

      {props.loadFailed ? (
        <p className="catalog-alert" role="alert">
          Não foi possível carregar a fila de pedidos desta unidade. Atualize a página e tente novamente.
        </p>
      ) : (
        <OrdersQueueBody
          props={props}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          visibleOrders={visibleOrders}
        />
      )}
    </div>
  );
}

function OrdersScopeBar({
  props,
  onRefresh,
}: Readonly<{
  props: OrdersPanelProps;
  onRefresh: () => void;
}>) {
  return (
    <form className="catalog-scope settings-scope-bar" method="get" action="/app/orders">
      <div className="auth-field">
        <label htmlFor="orders-organization">Organização</label>
        <select id="orders-organization" name="organization" defaultValue={props.selectedOrganizationId} required>
          {props.tenants.map(({ id, displayName }) => (
            <option key={id} value={id}>{displayName}</option>
          ))}
        </select>
      </div>
      <div className="auth-field">
        <label htmlFor="orders-branch">Unidade operacional</label>
        <select id="orders-branch" name="branch" defaultValue={props.selectedBranchId}>
          {props.branches.map(({ id, displayName }) => (
            <option key={id} value={id}>{displayName}</option>
          ))}
        </select>
      </div>
      <button className="auth-submit catalog-scope-submit" type="submit">Trocar unidade</button>
      <button className="auth-logout" type="button" onClick={onRefresh}>Atualizar fila</button>
    </form>
  );
}

function OrdersQueueBody({
  props,
  activeTab,
  setActiveTab,
  searchQuery,
  setSearchQuery,
  visibleOrders,
}: Readonly<{
  props: OrdersPanelProps;
  activeTab: OrderQueueFilterTab;
  setActiveTab: (tab: OrderQueueFilterTab) => void;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  visibleOrders: OrderRow[];
}>) {
  if (!props.canReadOrders) {
    return (
      <section className="catalog-empty" aria-labelledby="orders-no-access-title">
        <h2 id="orders-no-access-title">Permissão de pedidos necessária</h2>
        <p>Sua sessão atual não possui permissão de leitura da fila de pedidos nesta unidade.</p>
      </section>
    );
  }

  const activeCount = props.orders.filter((o) => !isTerminalOrderStatus(o.status as OrderStatus)).length;
  const completedCount = props.orders.filter((o) => o.status === "completed").length;

  return (
    <>
      <section className="orders-status-banner" aria-label="Estado da vitrine">
        <div>
          <strong>Recebimento online na unidade:</strong>{" "}
          <span>{props.orderingEnabled ? "ATIVO (monitoramento de fila obrigatório)" : "PAUSADO (fail-closed)"}</span>
        </div>
        <div className="orders-kpi-strip">
          <span className="settings-plan-pill">Ativos na fila: {activeCount}</span>
          <span className="settings-plan-pill">Concluídos: {completedCount}</span>
        </div>
      </section>

      {props.canWriteOrders ? (
        <StaffOrderIntakeSection props={props} />
      ) : null}

      <section className="catalog-section" aria-labelledby="orders-queue-heading">
        <div className="catalog-section-heading">
          <div>
            <span className="catalog-index">02</span>
            <h2 id="orders-queue-heading">Pedidos da unidade</h2>
          </div>
          <span className="catalog-section-count">{visibleOrders.length}</span>
        </div>

        <div className="orders-filter-bar">
          <div className="orders-tabs" role="tablist" aria-label="Filtro de status da fila">
            {([
              ["active", "Ativos na fila"],
              ["completed", "Concluídos"],
              ["cancelled", "Cancelados"],
              ["all", "Todos"],
            ] as const).map(([tabKey, label]) => (
              <button
                key={tabKey}
                role="tab"
                type="button"
                aria-selected={activeTab === tabKey}
                className={`orders-tab-btn ${activeTab === tabKey ? "orders-tab-btn-active" : ""}`}
                onClick={() => setActiveTab(tabKey)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="auth-field catalog-search">
            <label htmlFor="orders-search">Buscar pedido ou cliente</label>
            <input
              id="orders-search"
              type="search"
              placeholder="#1001 ou nome do cliente"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </div>
        </div>

        {visibleOrders.length === 0 ? (
          <p className="catalog-empty-note">Nenhum pedido encontrado neste filtro.</p>
        ) : (
          <div className="catalog-card-grid">
            {visibleOrders.map((order) => (
              <OrderQueueCard
                key={order.id}
                order={order}
                items={props.items.filter((item) => item.order_id === order.id)}
                transitions={props.transitions.filter((tr) => tr.order_id === order.id)}
                handoffPayments={props.handoffPayments.filter((hp) => hp.order_id === order.id)}
                canWriteOrders={props.canWriteOrders}
                canCancelOrders={props.canCancelOrders}
                canWriteHandoff={props.canWriteHandoff}
                canWriteSensitiveHandoff={props.canWriteSensitiveHandoff}
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

function createClientIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `staff-order-${crypto.randomUUID()}`;
  }
  return `staff-order-${Date.now()}-fallback`;
}

function StaffOrderIntakeSection({ props }: Readonly<{ props: OrdersPanelProps }>) {
  const [state, action, pending] = useActionState(placeStaffOrderAction, null);
  const [mode, setMode] = useState<OrderFulfillmentMode>("pickup");
  const [paymentMethod, setPaymentMethod] = useState<HandoffPaymentMethod>("pix_in_person");
  const [idempotencyKey, setIdempotencyKey] = useState<string>(createClientIdempotencyKey);

  return (
    <section className="catalog-section" aria-labelledby="orders-intake-heading">
      <div className="catalog-section-heading">
        <div>
          <span className="catalog-index">01</span>
          <h2 id="orders-intake-heading">Registrar pedido assistido (canal Goodz Online)</h2>
        </div>
        <button
          className="auth-logout"
          type="button"
          onClick={() => setIdempotencyKey(createClientIdempotencyKey())}
        >
          Nova chave de pedido
        </button>
      </div>

      <StaffOrderIntakeBody
        props={props}
        action={action}
        state={state}
        pending={pending}
        mode={mode}
        setMode={setMode}
        paymentMethod={paymentMethod}
        setPaymentMethod={setPaymentMethod}
        idempotencyKey={idempotencyKey}
      />
    </section>
  );
}

function StaffOrderIntakeBody({
  props,
  action,
  state,
  pending,
  mode,
  setMode,
  paymentMethod,
  setPaymentMethod,
  idempotencyKey,
}: Readonly<{
  props: OrdersPanelProps;
  action: (payload: FormData) => void;
  state: OrdersActionState;
  pending: boolean;
  mode: OrderFulfillmentMode;
  setMode: (mode: OrderFulfillmentMode) => void;
  paymentMethod: HandoffPaymentMethod;
  setPaymentMethod: (method: HandoffPaymentMethod) => void;
  idempotencyKey: string;
}>) {
  if (!props.orderingEnabled) {
    return (
      <p className="catalog-form-note">
        Ative <strong>Pedidos online ativos</strong> em <Link href="/app/settings">Configurações</Link> antes de registrar novos pedidos nesta unidade.
      </p>
    );
  }
  if (props.availableOffers.length === 0) {
    return (
      <p className="catalog-form-note">
        Publique ao menos uma oferta visível e disponível no canal <strong>Goodz Online</strong> em <Link href="/app/catalog">Catálogo</Link>.
      </p>
    );
  }
  return (
    <form className="catalog-offer-form" action={action}>
      <input type="hidden" name="organizationId" value={props.selectedOrganizationId} />
      <input type="hidden" name="establishmentId" value={props.selectedEstablishmentId} />
      <input type="hidden" name="branchId" value={props.selectedBranchId} />
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />

      <div className="catalog-create-grid">
        <div className="auth-field">
          <label htmlFor="intake-customer-name">Nome do cliente</label>
          <input id="intake-customer-name" name="customerName" maxLength={120} required />
        </div>
        <div className="auth-field">
          <label htmlFor="intake-customer-phone">Telefone / WhatsApp</label>
          <input id="intake-customer-phone" name="customerPhone" placeholder="11999990000" maxLength={40} required />
        </div>
        <div className="auth-field">
          <label htmlFor="intake-offer">Oferta disponível (Goodz Online)</label>
          <select id="intake-offer" name="channelOfferId" required>
            {props.availableOffers.map((offer) => (
              <option key={offer.id} value={offer.id}>
                {offer.label} ({formatBrlNumeric(offer.basePrice)})
              </option>
            ))}
          </select>
        </div>
        <div className="auth-field">
          <label htmlFor="intake-qty">Quantidade</label>
          <input id="intake-qty" name="quantity" type="number" min={1} max={99} defaultValue="1" required />
        </div>
        <div className="auth-field">
          <label htmlFor="intake-mode">Modalidade de atendimento</label>
          <select
            id="intake-mode"
            name="fulfillmentMode"
            value={mode}
            onChange={(event) => setMode(event.target.value as OrderFulfillmentMode)}
          >
            <option value="pickup">Retirada no local</option>
            <option value="own_delivery">Entrega própria</option>
          </select>
        </div>
        <div className="auth-field">
          <label htmlFor="intake-payment">Pagamento presencial declarado</label>
          <select
            id="intake-payment"
            name="paymentMethod"
            value={paymentMethod}
            onChange={(event) => setPaymentMethod(event.target.value as HandoffPaymentMethod)}
          >
            <option value="pix_in_person">Pix presencial</option>
            <option value="debit_card_pos">Cartão de débito (maquininha)</option>
            <option value="credit_card_pos">Cartão de crédito (maquininha)</option>
            <option value="cash">Dinheiro</option>
          </select>
        </div>
      </div>

      {mode === "own_delivery" ? <DeliveryAddressFields zones={props.deliveryZones} /> : null}

      {paymentMethod === "cash" ? (
        <div className="auth-field">
          <label htmlFor="intake-cash-change">Troco para (BRL, opcional)</label>
          <input id="intake-cash-change" name="cashChangeFor" placeholder="50.00" />
        </div>
      ) : null}

      <div className="auth-field">
        <label htmlFor="intake-notes">Observações do pedido (opcional)</label>
        <input id="intake-notes" name="customerNotes" maxLength={500} />
      </div>

      <button className="catalog-save-button" type="submit" disabled={pending}>
        {pending ? "Registrando pedido…" : "Registrar pedido na fila"}
      </button>
      <OrdersActionFeedback state={state} />
    </form>
  );
}

function DeliveryAddressFields({ zones }: Readonly<{ zones: OrderDeliveryZoneOption[] }>) {
  const [selectedZoneId, setSelectedZoneId] = useState<string>(zones[0]?.id ?? "");
  const activeZone = zones.find((zone) => zone.id === selectedZoneId) ?? null;

  return (
    <div className="catalog-create-grid">
      {zones.length > 0 ? (
        <div className="auth-field">
          <label htmlFor="intake-zone">Zona de entrega própria</label>
          <select
            id="intake-zone"
            name="deliveryZoneId"
            value={selectedZoneId}
            onChange={(event) => setSelectedZoneId(event.target.value)}
          >
            {zones.map((zone) => (
              <option key={zone.id} value={zone.id}>
                {zone.name} · Taxa {formatBrlNumeric(zone.deliveryFeeAmount)} · Mín. {formatBrlNumeric(zone.minimumOrderAmount)}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      <div className="auth-field">
        <label htmlFor="intake-street">Logradouro</label>
        <input id="intake-street" name="streetLine" maxLength={200} required />
      </div>
      <div className="auth-field">
        <label htmlFor="intake-number">Número</label>
        <input id="intake-number" name="numberLabel" defaultValue="100" maxLength={40} />
      </div>
      <div className="auth-field">
        <label htmlFor="intake-neighborhood">Bairro</label>
        <input
          id="intake-neighborhood"
          name="neighborhood"
          defaultValue={activeZone?.neighborhoods[0] ?? ""}
          placeholder={activeZone ? activeZone.neighborhoods.join(", ") : "Ex.: Pinheiros"}
          maxLength={120}
          required
        />
      </div>
      <div className="auth-field">
        <label htmlFor="intake-city">Cidade</label>
        <input id="intake-city" name="city" defaultValue="São Paulo" maxLength={120} required />
      </div>
      {zones.length === 0 ? (
        <div className="auth-field">
          <label htmlFor="intake-delivery-fee">Taxa de entrega própria (BRL)</label>
          <input id="intake-delivery-fee" name="deliveryFee" defaultValue="6.00" required />
        </div>
      ) : (
        <input type="hidden" name="deliveryFee" value={activeZone ? activeZone.deliveryFeeAmount.toFixed(2) : "0.00"} />
      )}
    </div>
  );
}

function OrderQueueCard({
  order,
  items,
  transitions,
  handoffPayments,
  canWriteOrders,
  canCancelOrders,
  canWriteHandoff,
  canWriteSensitiveHandoff,
  verifiedFactorIds,
  supabaseUrl,
  anonKey,
}: Readonly<{
  order: OrderRow;
  items: OrderItemRow[];
  transitions: OrderTransitionRow[];
  handoffPayments: OrderHandoffRow[];
  canWriteOrders: boolean;
  canCancelOrders: boolean;
  canWriteHandoff: boolean;
  canWriteSensitiveHandoff: boolean;
  verifiedFactorIds: string[];
  supabaseUrl: string;
  anonKey: string;
}>) {
  const status = order.status as OrderStatus;
  const mode = order.fulfillment_mode as OrderFulfillmentMode;
  const nextStatus = getNextForwardOrderStatus(mode, status);
  const terminal = isTerminalOrderStatus(status);

  return (
    <article className="catalog-card catalog-offer-card orders-card">
      <div className="settings-card-top">
        <span className="catalog-card-kicker">
          PEDIDO #{order.order_number} · {mode === "pickup" ? "RETIRADA" : "ENTREGA PRÓPRIA"}
        </span>
        <span className="settings-plan-pill">{STATUS_LABELS[status]}</span>
      </div>

      <h3>{order.customer_name_snapshot}</h3>
      <p className="catalog-help">Contato: {order.customer_phone_snapshot}</p>

      <ul className="catalog-readonly-list" aria-label={`Itens do pedido ${order.order_number}`}>
        {items.map((item) => (
          <li key={item.id}>
            <strong>{item.quantity}x {item.display_name_snapshot}</strong> — {formatBrlNumeric(item.line_total_amount)}
          </li>
        ))}
      </ul>

      <dl className="catalog-readonly-details">
        <div>
          <dt>Subtotal</dt>
          <dd>{formatBrlNumeric(order.subtotal_amount)}</dd>
        </div>
        {mode === "own_delivery" ? (
          <div>
            <dt>Taxa de entrega</dt>
            <dd>{formatBrlNumeric(order.delivery_fee_amount)}</dd>
          </div>
        ) : null}
        <div>
          <dt>Total exato</dt>
          <dd>{formatBrlNumeric(order.total_amount)}</dd>
        </div>
        <div>
          <dt>Pagamento presencial</dt>
          <dd>{PAYMENT_METHOD_LABELS[order.declared_payment_method as HandoffPaymentMethod] ?? order.declared_payment_method}</dd>
        </div>
        <div>
          <dt>Status no handoff</dt>
          <dd>{HANDOFF_STATUS_LABELS[order.handoff_payment_status as HandoffPaymentStatus] ?? order.handoff_payment_status}</dd>
        </div>
      </dl>

      {order.cancellation_reason ? (
        <p className="catalog-form-error">
          <strong>Cancelado:</strong> {order.cancellation_reason}
        </p>
      ) : null}

      {!terminal && canWriteOrders && nextStatus ? (
        <ForwardTransitionForm orderId={order.id} nextStatus={nextStatus} />
      ) : null}

      {!terminal && canCancelOrders ? (
        <CancelOrderForm orderId={order.id} orderNumber={order.order_number} />
      ) : null}

      {canWriteHandoff || canWriteSensitiveHandoff ? (
        <HandoffPaymentForm
          order={order}
          canWriteSensitiveHandoff={canWriteSensitiveHandoff}
          verifiedFactorIds={verifiedFactorIds}
          supabaseUrl={supabaseUrl}
          anonKey={anonKey}
        />
      ) : null}

      {transitions.length > 0 || handoffPayments.length > 0 ? (
        <p className="catalog-field-note">
          Histórico imutável: {transitions.length} transições · {handoffPayments.length} registros de handoff (não substitui fechamento contábil/caixa).
        </p>
      ) : null}
    </article>
  );
}

function ForwardTransitionForm({
  orderId,
  nextStatus,
}: Readonly<{
  orderId: string;
  nextStatus: OrderStatus;
}>) {
  const [state, action, pending] = useActionState(transitionOrderStatusAction, null);
  return (
    <form className="catalog-offer-form" action={action}>
      <input type="hidden" name="orderId" value={orderId} />
      <input type="hidden" name="toStatus" value={nextStatus} />
      <button className="catalog-save-button" type="submit" disabled={pending}>
        {pending ? "Atualizando…" : NEXT_ACTION_LABELS[nextStatus]}
      </button>
      <OrdersActionFeedback state={state} />
    </form>
  );
}

function CancelOrderForm({
  orderId,
  orderNumber,
}: Readonly<{
  orderId: string;
  orderNumber: number;
}>) {
  const [state, action, pending] = useActionState(transitionOrderStatusAction, null);
  const reasonId = `cancel-reason-${orderId}`;
  return (
    <details className="orders-details-box">
      <summary>Cancelar pedido #{orderNumber}</summary>
      <form className="catalog-offer-form" action={action}>
        <input type="hidden" name="orderId" value={orderId} />
        <input type="hidden" name="toStatus" value="cancelled" />
        <div className="auth-field">
          <label htmlFor={reasonId}>Motivo obrigatório do cancelamento</label>
          <input id={reasonId} name="reason" minLength={3} maxLength={500} required />
        </div>
        <button className="auth-logout" type="submit" disabled={pending}>
          {pending ? "Cancelando…" : "Confirmar cancelamento"}
        </button>
        <OrdersActionFeedback state={state} />
      </form>
    </details>
  );
}

function HandoffPaymentForm({
  order,
  canWriteSensitiveHandoff,
  verifiedFactorIds,
  supabaseUrl,
  anonKey,
}: Readonly<{
  order: OrderRow;
  canWriteSensitiveHandoff: boolean;
  verifiedFactorIds: string[];
  supabaseUrl: string;
  anonKey: string;
}>) {
  const [state, action, pending] = useActionState(recordHandoffPaymentAction, null);
  const [reauthState, reauthAction, reauthPending] = useActionState(reauthenticateForPrivilegedAction, null);
  const [totpVerified, setTotpVerified] = useState(false);
  const [statusChoice, setStatusChoice] = useState<RecordedHandoffPaymentStatus>("collected");

  const needsReason = statusChoice !== "collected";
  const prefix = `handoff-${order.id}`;

  return (
    <details className="orders-details-box">
      <summary>Registrar recebimento presencial (Handoff)</summary>
      <form className="catalog-offer-form" action={action}>
        <input type="hidden" name="organizationId" value={order.organization_id} />
        <input type="hidden" name="establishmentId" value={order.establishment_id} />
        <input type="hidden" name="branchId" value={order.branch_id} />
        <input type="hidden" name="orderId" value={order.id} />

        <div className="auth-field">
          <label htmlFor={`${prefix}-method`}>Meio utilizado no handoff</label>
          <select id={`${prefix}-method`} name="paymentMethod" defaultValue={order.declared_payment_method}>
            <option value="pix_in_person">Pix presencial</option>
            <option value="debit_card_pos">Débito (maquininha)</option>
            <option value="credit_card_pos">Crédito (maquininha)</option>
            <option value="cash">Dinheiro</option>
          </select>
        </div>

        <div className="auth-field">
          <label htmlFor={`${prefix}-status`}>Resultado do recebimento</label>
          <select
            id={`${prefix}-status`}
            name="handoffStatus"
            value={statusChoice}
            onChange={(event) => setStatusChoice(event.target.value as RecordedHandoffPaymentStatus)}
          >
            <option value="collected">Recebido presencialmente</option>
            <option value="failed">Falha no recebimento</option>
            <option value="cancelled">Cobrança cancelada</option>
            {canWriteSensitiveHandoff ? <option value="reversed">Estornado (Admin Guard)</option> : null}
            {canWriteSensitiveHandoff ? <option value="disputed">Em disputa (Admin Guard)</option> : null}
          </select>
        </div>

        {needsReason ? (
          <div className="auth-field">
            <label htmlFor={`${prefix}-reason`}>Justificativa obrigatória</label>
            <input id={`${prefix}-reason`} name="reason" minLength={3} maxLength={500} required />
          </div>
        ) : null}

        <button className="catalog-save-button" type="submit" disabled={pending}>
          {resolveHandoffSubmitLabel(pending, statusChoice)}
        </button>

        <OrdersActionFeedback state={state} />
        <PrivilegedStepUpPrompt
          idPrefix={prefix}
          state={state}
          verifiedFactorIds={verifiedFactorIds}
          totpVerified={totpVerified}
          setTotpVerified={setTotpVerified}
          supabaseUrl={supabaseUrl}
          anonKey={anonKey}
          reauthentication={reauthState}
          reauthenticationAction={reauthAction}
          reauthenticationPending={reauthPending}
          actionLabel="operação de handoff"
        />
      </form>
    </details>
  );
}

function resolveHandoffSubmitLabel(pending: boolean, statusChoice: RecordedHandoffPaymentStatus): string {
  if (pending) return "Salvando…";
  return isSensitiveHandoffStatus(statusChoice) ? "Registrar com Admin Guard" : "Registrar recebimento";
}

function OrdersActionFeedback({ state }: Readonly<{ state: OrdersActionState }>) {
  if (!state) return null;
  if (state.kind === "saved") {
    const orderTag = state.orderNumber ? `Pedido #${state.orderNumber}. ` : "";
    const replayTag = state.idempotentReplay ? "(Reenvio idempotente ignorado sem duplicação). " : "";
    const auditLabel = state.auditEventIds.length ? state.auditEventIds.join(", ") : "idempotente";
    return (
      <output className="catalog-form-success">
        {orderTag}{replayTag}Registrado. Código: {state.correlationId}. Auditoria: {auditLabel}.
      </output>
    );
  }
  if (state.kind === "step_up_required") {
    return (
      <output className="catalog-form-note">
        Verificação em duas etapas necessária para estorno/disputa. Código: {state.correlationId}
      </output>
    );
  }
  if (state.kind === "reauthentication_required") {
    return (
      <output className="catalog-form-note">
        Confirmação recente da senha necessária. Código: {state.correlationId}
      </output>
    );
  }
  if (state.kind === "factor_setup_required") {
    return (
      <p className="catalog-form-error" role="alert">
        Configure um fator autenticador em <Link href="/app/security">Segurança</Link> antes de continuar. Código:{" "}
        {state.correlationId}
      </p>
    );
  }
  const messages: Record<
    | "invalid"
    | "denied"
    | "storefront_paused"
    | "offer_unavailable"
    | "below_minimum"
    | "outside_zone"
    | "invalid_transition"
    | "failed",
    string
  > = {
    invalid: "Revise os campos obrigatórios informados.",
    denied: "Operação não autorizada para o seu papel nesta unidade.",
    storefront_paused: "Pedidos online estão pausados ou a modalidade escolhida está desativada.",
    offer_unavailable: "A oferta selecionada não está disponível para venda no momento.",
    below_minimum: "O subtotal dos itens não atingiu o pedido mínimo da zona de entrega.",
    outside_zone: "O bairro informado está fora das zonas de entrega ativas desta unidade.",
    invalid_transition: "Transição de estado inválida para o ciclo atual do pedido.",
    failed: "Não foi possível concluir a operação.",
  };
  return (
    <p className="catalog-form-error" role="alert">
      {messages[state.kind]} Código: {state.correlationId}
    </p>
  );
}
