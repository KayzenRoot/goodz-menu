"use client";

import { useActionState, useState, type Dispatch, type SetStateAction } from "react";
import Link from "next/link";
import {
  reauthenticateForPrivilegedAction,
  type ReauthenticationActionState,
} from "@/app/app/security/actions";
import {
  saveSettingValueAction,
  type SettingsActionState,
} from "@/app/app/settings/actions";
import { PrivilegedStepUpPrompt } from "@/components/goodz/privileged-step-up-prompt";
import {
  HANDOFF_PAYMENT_METHODS,
  isTargetScopeBlockedByHigherLock,
  type HandoffPaymentMethod,
  type PersistedSettingScope,
  type UiDensityMode,
} from "@/lib/settings/settings-resolver";
import type { Database, Json } from "@/lib/supabase/database.types";

type DefinitionRow = Pick<
  Database["public"]["Tables"]["setting_definitions"]["Row"],
  | "key"
  | "display_name"
  | "description"
  | "value_type"
  | "allowed_scopes"
  | "default_value"
  | "validation_rules"
  | "sensitivity"
  | "audit_required"
  | "lockable_scopes"
  | "schema_version"
>;

type ScopedValueRow = Pick<
  Database["public"]["Tables"]["setting_values"]["Row"],
  | "id"
  | "setting_key"
  | "scope_type"
  | "organization_id"
  | "establishment_id"
  | "branch_id"
  | "role_id"
  | "user_id"
  | "value_json"
  | "is_locked"
  | "version"
  | "updated_at"
>;

type EffectiveSettingRow = Database["public"]["Functions"]["resolve_effective_settings"]["Returns"][number];
type EntitlementRow = Database["public"]["Functions"]["resolve_tenant_entitlements"]["Returns"][number];
type BranchOption = {
  id: string;
  displayName: string;
  establishmentId: string;
  establishmentName: string;
};

type SettingsPanelProps = Readonly<{
  supabaseUrl: string;
  anonKey: string;
  userId: string;
  tenants: { id: string; displayName: string }[];
  branches: BranchOption[];
  selectedOrganizationId: string;
  selectedBranchId: string;
  selectedScope: "branch" | "organization";
  verifiedFactorIds: string[];
  access: "organization" | "branch" | "none";
  loadFailed: boolean;
  canWriteOrganization: boolean;
  canWriteSensitiveOrganization: boolean;
  canWriteBranch: boolean;
  canWriteSensitiveBranch: boolean;
  definitions: DefinitionRow[];
  scopedValues: ScopedValueRow[];
  effectiveSettings: EffectiveSettingRow[];
  entitlements: EntitlementRow[];
}>;

const PAYMENT_LABELS: Record<HandoffPaymentMethod, string> = {
  pix_in_person: "Pix presencial (maquininha / QR na entrega)",
  debit_card_pos: "Cartão de débito (maquininha)",
  credit_card_pos: "Cartão de crédito (maquininha)",
  cash: "Dinheiro em espécie",
};

const SCOPE_LABELS: Record<string, string> = {
  default: "Padrão Goodz",
  platform: "Plataforma Goodz",
  organization: "Organização",
  establishment: "Estabelecimento",
  branch: "Unidade",
  role: "Papel (Role)",
  user: "Preferência do usuário",
  device_session: "Sessão neste dispositivo",
};

function resolveActiveDensity(
  densityEffective: EffectiveSettingRow | undefined,
  deviceDensity: UiDensityMode | "",
): UiDensityMode {
  const lockedBy = (densityEffective?.locked_by_scope as PersistedSettingScope | null) ?? null;
  if (!lockedBy && deviceDensity) return deviceDensity;
  return densityEffective?.effective_value === "compact" ? "compact" : "comfortable";
}

function resolveTargetScope(
  selectedScope: "branch" | "organization",
  canWriteOrganization: boolean,
  selectedBranch: BranchOption | null,
): "branch" | "organization" {
  if (selectedScope === "organization" && canWriteOrganization) return "organization";
  return selectedBranch ? "branch" : "organization";
}

export function SettingsPanel(props: SettingsPanelProps) {
  const [deviceDensity, setDeviceDensity] = useState<UiDensityMode | "">("");
  const densityEffective = props.effectiveSettings.find((row) => row.setting_key === "ui.density_mode");
  const activeDensity = resolveActiveDensity(densityEffective, deviceDensity);
  const selectedBranch = props.branches.find(({ id }) => id === props.selectedBranchId) ?? null;
  const targetScope = resolveTargetScope(props.selectedScope, props.canWriteOrganization, selectedBranch);

  return (
    <div className="catalog-page settings-page" data-density={activeDensity}>
      <header className="catalog-header">
        <div>
          <span className="auth-eyebrow">POLÍTICAS · CONFIGURAÇÕES &amp; PLANO</span>
          <h1 id="settings-title">Configurações e políticas</h1>
          <p>
            Hierarquia determinística da plataforma até a unidade e o operador, com travas de política e trilha auditável.
          </p>
        </div>
        <nav className="catalog-links" aria-label="Navegação da conta">
          <Link className="auth-entry-link" href="/app">Espaços</Link>
          <Link className="auth-entry-link" href="/app/orders">Pedidos</Link>
          <Link className="auth-entry-link" href="/app/catalog">Catálogo</Link>
          <Link className="auth-entry-link" href="/app/security">Segurança</Link>
          <Link className="auth-entry-link" href="/app/admin-guard">Ação protegida</Link>
        </nav>
      </header>

      <SettingsScopeSelector props={props} targetScope={targetScope} />

      {props.loadFailed ? (
        <p className="catalog-alert" role="alert">
          Não foi possível carregar todas as políticas deste espaço. Atualize a página e tente novamente.
        </p>
      ) : (
        <SettingsPanelContent
          props={props}
          selectedBranch={selectedBranch}
          targetScope={targetScope}
          densityEffective={densityEffective ?? null}
          deviceDensity={deviceDensity}
          setDeviceDensity={setDeviceDensity}
          activeDensity={activeDensity}
        />
      )}
    </div>
  );
}

function SettingsPanelContent({
  props,
  selectedBranch,
  targetScope,
  densityEffective,
  deviceDensity,
  setDeviceDensity,
  activeDensity,
}: Readonly<{
  props: SettingsPanelProps;
  selectedBranch: BranchOption | null;
  targetScope: "branch" | "organization";
  densityEffective: EffectiveSettingRow | null;
  deviceDensity: UiDensityMode | "";
  setDeviceDensity: Dispatch<SetStateAction<UiDensityMode | "">>;
  activeDensity: UiDensityMode;
}>) {
  if (props.access === "none") {
    return (
      <section className="catalog-empty" aria-labelledby="settings-no-access-title">
        <h2 id="settings-no-access-title">Permissão de configurações necessária</h2>
        <p>
          {props.selectedOrganizationId
            ? "Sua sessão atual não possui permissão de leitura de configurações neste escopo."
            : "Não há uma organização ativa disponível para consultar políticas."}
        </p>
      </section>
    );
  }

  const canWriteStandard = targetScope === "organization"
    ? props.canWriteOrganization
    : Boolean(selectedBranch && props.canWriteBranch);
  const canWriteSensitive = targetScope === "organization"
    ? props.canWriteSensitiveOrganization
    : Boolean(selectedBranch && props.canWriteSensitiveBranch);
  const scopeTitle = targetScope === "organization" ? "Padrão da organização" : "Unidade selecionada";

  const sensitiveDefinitions = props.definitions.filter(
    (def) => def.sensitivity === "sensitive" && def.allowed_scopes.includes(targetScope),
  );
  const standardDefinitions = props.definitions.filter(
    (def) => def.sensitivity === "standard" && def.key !== "ui.density_mode" && def.allowed_scopes.includes(targetScope),
  );
  const densityDefinition = props.definitions.find((def) => def.key === "ui.density_mode") ?? null;

  return (
    <>
      <EntitlementsSection entitlements={props.entitlements} />

      <SettingsDefinitionGroupSection
        index="02"
        headingId="settings-sensitive-heading"
        headingText={`Chaves operacionais críticas (${scopeTitle})`}
        note="Alterações críticas e travas de política exigem papel Proprietário/Admin, confirmação de segurança (Admin Guard) e auditoria imutável."
        definitions={sensitiveDefinitions}
        targetScope={targetScope}
        selectedBranch={selectedBranch}
        props={props}
        canWriteStandard={canWriteStandard}
        canWriteSensitive={canWriteSensitive}
      />

      <SettingsDefinitionGroupSection
        index="03"
        headingId="settings-standard-heading"
        headingText={`Parâmetros da vitrine, retirada e entrega (${scopeTitle})`}
        note={null}
        definitions={standardDefinitions}
        targetScope={targetScope}
        selectedBranch={selectedBranch}
        props={props}
        canWriteStandard={canWriteStandard}
        canWriteSensitive={canWriteSensitive}
      />

      {densityDefinition ? (
        <UserDensitySection
          definition={densityDefinition}
          organizationId={props.selectedOrganizationId}
          userId={props.userId}
          scopedValues={props.scopedValues}
          effectiveRow={densityEffective}
          deviceDensity={deviceDensity}
          setDeviceDensity={setDeviceDensity}
          activeDensity={activeDensity}
        />
      ) : null}
    </>
  );
}

function SettingsDefinitionGroupSection({
  index,
  headingId,
  headingText,
  note,
  definitions,
  targetScope,
  selectedBranch,
  props,
  canWriteStandard,
  canWriteSensitive,
}: Readonly<{
  index: string;
  headingId: string;
  headingText: string;
  note: string | null;
  definitions: DefinitionRow[];
  targetScope: "branch" | "organization";
  selectedBranch: BranchOption | null;
  props: SettingsPanelProps;
  canWriteStandard: boolean;
  canWriteSensitive: boolean;
}>) {
  return (
    <section className="catalog-section" aria-labelledby={headingId}>
      <div className="catalog-section-heading">
        <div>
          <span className="catalog-index">{index}</span>
          <h2 id={headingId}>{headingText}</h2>
        </div>
        <span className="catalog-section-count">{definitions.length}</span>
      </div>
      {note ? <p className="catalog-readonly-note">{note}</p> : null}
      <div className="catalog-card-grid">
        {definitions.map((definition) => (
          <SettingEditorCard
            key={`${targetScope}-${definition.key}`}
            definition={definition}
            targetScope={targetScope}
            organizationId={props.selectedOrganizationId}
            establishmentId={selectedBranch?.establishmentId ?? null}
            branchId={targetScope === "branch" ? (selectedBranch?.id ?? null) : null}
            scopedRow={findScopedRow(props.scopedValues, definition.key, targetScope, props.selectedOrganizationId, selectedBranch)}
            effectiveRow={props.effectiveSettings.find((row) => row.setting_key === definition.key) ?? null}
            canWriteStandard={canWriteStandard}
            canWriteSensitive={canWriteSensitive}
            verifiedFactorIds={props.verifiedFactorIds}
            supabaseUrl={props.supabaseUrl}
            anonKey={props.anonKey}
          />
        ))}
      </div>
    </section>
  );
}

function SettingsScopeSelector({
  props,
  targetScope,
}: Readonly<{
  props: SettingsPanelProps;
  targetScope: "branch" | "organization";
}>) {
  return (
    <form className="catalog-scope settings-scope-bar" method="get" action="/app/settings">
      <div className="auth-field">
        <label htmlFor="settings-organization">Organização</label>
        <select id="settings-organization" name="organization" defaultValue={props.selectedOrganizationId} required>
          {props.tenants.map(({ id, displayName }) => (
            <option key={id} value={id}>{displayName}</option>
          ))}
        </select>
      </div>
      <div className="auth-field">
        <label htmlFor="settings-branch">
          Unidade {props.branches.length === 1 ? "(seleção automática do piloto)" : ""}
        </label>
        <select id="settings-branch" name="branch" defaultValue={props.selectedBranchId}>
          {props.branches.length === 0 ? <option value="">Nenhuma unidade ativa</option> : null}
          {props.branches.map(({ id, displayName }) => (
            <option key={id} value={id}>{displayName}</option>
          ))}
        </select>
      </div>
      <div className="auth-field">
        <label htmlFor="settings-scope">Escopo de edição</label>
        <select id="settings-scope" name="scope" defaultValue={targetScope}>
          {props.branches.length > 0 ? <option value="branch">Unidade selecionada</option> : null}
          {props.canWriteOrganization ? <option value="organization">Padrão da organização</option> : null}
        </select>
      </div>
      <button className="auth-submit catalog-scope-submit" type="submit">Aplicar escopo</button>
    </form>
  );
}

function formatEntitlementKicker(ent: EntitlementRow): string {
  if (ent.source === "tenant_override") return "OVERRIDE INDIVIDUAL DA ORGANIZAÇÃO";
  if (ent.source === "plan") return `PLANO · ${(ent.plan_code ?? "PILOT").toUpperCase()}`;
  return "PADRÃO DE SEGURANÇA";
}

function EntitlementsSection({ entitlements }: Readonly<{ entitlements: EntitlementRow[] }>) {
  const activePlan = entitlements.find((item) => item.plan_code)?.plan_code ?? "pilot_mvp";
  return (
    <section className="catalog-section" aria-labelledby="settings-entitlements-heading">
      <div className="catalog-section-heading">
        <div>
          <span className="catalog-index">01</span>
          <h2 id="settings-entitlements-heading">Plano comercial e capacidades (Entitlements)</h2>
        </div>
        <span className="settings-plan-pill">Plano ativo: {activePlan}</span>
      </div>
      <p className="catalog-readonly-note">
        O plano comercial define limites base; concessões ou restrições individuais por organização prevalecem sem acoplamento ao código de vitrine.
      </p>
      <div className="catalog-card-grid">
        {entitlements.map((ent) => (
          <article key={ent.entitlement_key} className="catalog-card catalog-readonly-card">
            <span className="catalog-card-kicker">{formatEntitlementKicker(ent)}</span>
            <h3>{ent.display_name}</h3>
            <p className="catalog-help">{ent.description}</p>
            <dl className="catalog-readonly-details">
              <div>
                <dt>Chave</dt>
                <dd><code>{ent.entitlement_key}</code></dd>
              </div>
              <div>
                <dt>Valor efetivo</dt>
                <dd>{formatEntitlementValue(ent.value_type, ent.effective_value)}</dd>
              </div>
            </dl>
            {ent.override_reason ? (
              <p className="catalog-readonly-copy">
                <strong>Motivo do override:</strong> {ent.override_reason}
              </p>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}

function resolveSaveButtonLabel(pending: boolean, requiresProtectedSave: boolean): string {
  if (pending) return "Salvando…";
  return requiresProtectedSave ? "Salvar política protegida" : "Salvar configuração";
}

function SettingEditorCard({
  definition,
  targetScope,
  organizationId,
  establishmentId,
  branchId,
  scopedRow,
  effectiveRow,
  canWriteStandard,
  canWriteSensitive,
  verifiedFactorIds,
  supabaseUrl,
  anonKey,
}: Readonly<{
  definition: DefinitionRow;
  targetScope: "branch" | "organization";
  organizationId: string;
  establishmentId: string | null;
  branchId: string | null;
  scopedRow: ScopedValueRow | null;
  effectiveRow: EffectiveSettingRow | null;
  canWriteStandard: boolean;
  canWriteSensitive: boolean;
  verifiedFactorIds: string[];
  supabaseUrl: string;
  anonKey: string;
}>) {
  const [state, action, pending] = useActionState(saveSettingValueAction, null);
  const [reauthState, reauthAction, reauthPending] = useActionState(reauthenticateForPrivilegedAction, null);
  const [totpVerified, setTotpVerified] = useState(false);

  const initialValue = scopedRow ? scopedRow.value_json : (effectiveRow?.effective_value ?? definition.default_value);
  const [lockedDraft, setLockedDraft] = useState<boolean>(scopedRow?.is_locked ?? false);

  const higherLock = (effectiveRow?.locked_by_scope as PersistedSettingScope | null) ?? null;
  const blockedByHigherScope = isTargetScopeBlockedByHigherLock(targetScope, higherLock);
  const isSensitiveKey = definition.sensitivity === "sensitive";
  const canLockThisScope = definition.lockable_scopes.includes(targetScope) && canWriteSensitive;
  const canEdit = !blockedByHigherScope && (isSensitiveKey ? canWriteSensitive : canWriteStandard);
  const requiresProtectedSave = isSensitiveKey || lockedDraft || (scopedRow?.is_locked ?? false);

  const formIdPrefix = `setting-${targetScope}-${definition.key.replace(/\./g, "-")}`;
  const effectiveSourceLabel = SCOPE_LABELS[effectiveRow?.effective_source ?? "default"] ?? "Padrão";

  return (
    <article className={`catalog-card ${isSensitiveKey ? "catalog-offer-card" : ""}`}>
      <div className="settings-card-top">
        <span className="catalog-card-kicker">
          {isSensitiveKey ? "SENSÍVEL · ADMIN GUARD" : "OPERACIONAL"} · {definition.key}
        </span>
        {higherLock ? (
          <span className="settings-lock-badge">
            Travado por: {SCOPE_LABELS[higherLock] ?? higherLock}
          </span>
        ) : null}
      </div>
      <h3>{definition.display_name}</h3>
      <p className="catalog-help">{definition.description}</p>

      <dl className="catalog-readonly-details">
        <div>
          <dt>Valor efetivo na unidade</dt>
          <dd>{formatSettingDisplayValue(definition.value_type, effectiveRow?.effective_value ?? definition.default_value)}</dd>
        </div>
        <div>
          <dt>Origem efetiva</dt>
          <dd>{effectiveSourceLabel}</dd>
        </div>
        <div>
          <dt>Versão no escopo ({SCOPE_LABELS[targetScope]})</dt>
          <dd>{scopedRow ? `v${scopedRow.version}` : "Herança (sem override)"}</dd>
        </div>
      </dl>

      <SettingEditorBody
        canEdit={canEdit}
        blockedByHigherScope={blockedByHigherScope}
        higherLock={higherLock}
        action={action}
        definition={definition}
        targetScope={targetScope}
        organizationId={organizationId}
        establishmentId={establishmentId}
        branchId={branchId}
        formIdPrefix={formIdPrefix}
        initialValue={initialValue}
        canLockThisScope={canLockThisScope}
        lockedDraft={lockedDraft}
        setLockedDraft={setLockedDraft}
        pending={pending}
        requiresProtectedSave={requiresProtectedSave}
        state={state}
        verifiedFactorIds={verifiedFactorIds}
        totpVerified={totpVerified}
        setTotpVerified={setTotpVerified}
        supabaseUrl={supabaseUrl}
        anonKey={anonKey}
        reauthState={reauthState}
        reauthAction={reauthAction}
        reauthPending={reauthPending}
      />
    </article>
  );
}

function SettingEditorBody({
  canEdit,
  blockedByHigherScope,
  higherLock,
  action,
  definition,
  targetScope,
  organizationId,
  establishmentId,
  branchId,
  formIdPrefix,
  initialValue,
  canLockThisScope,
  lockedDraft,
  setLockedDraft,
  pending,
  requiresProtectedSave,
  state,
  verifiedFactorIds,
  totpVerified,
  setTotpVerified,
  supabaseUrl,
  anonKey,
  reauthState,
  reauthAction,
  reauthPending,
}: Readonly<{
  canEdit: boolean;
  blockedByHigherScope: boolean;
  higherLock: PersistedSettingScope | null;
  action: (payload: FormData) => void;
  definition: DefinitionRow;
  targetScope: "branch" | "organization";
  organizationId: string;
  establishmentId: string | null;
  branchId: string | null;
  formIdPrefix: string;
  initialValue: Json;
  canLockThisScope: boolean;
  lockedDraft: boolean;
  setLockedDraft: Dispatch<SetStateAction<boolean>>;
  pending: boolean;
  requiresProtectedSave: boolean;
  state: SettingsActionState;
  verifiedFactorIds: string[];
  totpVerified: boolean;
  setTotpVerified: Dispatch<SetStateAction<boolean>>;
  supabaseUrl: string;
  anonKey: string;
  reauthState: ReauthenticationActionState;
  reauthAction: (payload: FormData) => void;
  reauthPending: boolean;
}>) {
  if (blockedByHigherScope) {
    return (
      <p className="catalog-form-note">
        Esta política foi travada em <strong>{SCOPE_LABELS[higherLock ?? "organization"]}</strong> e não pode ser sobrescrita neste escopo.
      </p>
    );
  }
  if (!canEdit) {
    return (
      <p className="catalog-readonly-copy">
        Somente leitura para o seu papel atual neste escopo.
      </p>
    );
  }

  return (
    <form className="catalog-offer-form" action={action}>
      <input type="hidden" name="settingKey" value={definition.key} />
      <input type="hidden" name="scopeType" value={targetScope} />
      <input type="hidden" name="organizationId" value={organizationId} />
      <input type="hidden" name="establishmentId" value={establishmentId ?? ""} />
      <input type="hidden" name="branchId" value={branchId ?? ""} />

      <SettingValueFieldInput
        idPrefix={formIdPrefix}
        definition={definition}
        initialValue={initialValue}
      />

      {canLockThisScope ? (
        <div className="catalog-checkbox-row">
          <input
            id={`${formIdPrefix}-lock`}
            name="isLocked"
            type="checkbox"
            checked={lockedDraft}
            onChange={(event) => setLockedDraft(event.target.checked)}
          />
          <label htmlFor={`${formIdPrefix}-lock`}>
            Travar política na organização (impede overrides em estabelecimentos e unidades)
          </label>
        </div>
      ) : null}

      <button className="catalog-save-button" type="submit" disabled={pending}>
        {resolveSaveButtonLabel(pending, requiresProtectedSave)}
      </button>

      <SettingsActionFeedback state={state} />
      <PrivilegedStepUpPrompt
        idPrefix={formIdPrefix}
        state={state}
        verifiedFactorIds={verifiedFactorIds}
        totpVerified={totpVerified}
        setTotpVerified={setTotpVerified}
        supabaseUrl={supabaseUrl}
        anonKey={anonKey}
        reauthentication={reauthState}
        reauthenticationAction={reauthAction}
        reauthenticationPending={reauthPending}
        actionLabel="configuração"
      />
    </form>
  );
}

function SettingValueFieldInput({
  idPrefix,
  definition,
  initialValue,
}: Readonly<{
  idPrefix: string;
  definition: DefinitionRow;
  initialValue: Json;
}>) {
  const rules = (definition.validation_rules ?? {}) as {
    min?: number;
    max?: number;
    maxLength?: number;
    allowEmpty?: boolean;
  };

  if (definition.value_type === "boolean") {
    return (
      <div className="catalog-checkbox-row">
        <input
          id={`${idPrefix}-bool`}
          name="booleanValue"
          type="checkbox"
          defaultChecked={initialValue === true}
        />
        <label htmlFor={`${idPrefix}-bool`}>{definition.display_name} habilitado neste escopo</label>
      </div>
    );
  }

  if (definition.value_type === "integer") {
    const num = typeof initialValue === "number" ? String(initialValue) : "";
    return (
      <div className="auth-field">
        <label htmlFor={`${idPrefix}-int`}>Valor em minutos</label>
        <input
          id={`${idPrefix}-int`}
          name="integerValue"
          type="number"
          inputMode="numeric"
          min={rules.min}
          max={rules.max}
          defaultValue={num}
          required
        />
      </div>
    );
  }

  if (definition.value_type === "string_array") {
    const selected = new Set(
      Array.isArray(initialValue)
        ? initialValue.filter((entry): entry is string => typeof entry === "string")
        : [],
    );
    return (
      <fieldset className="settings-checkbox-group">
        <legend className="catalog-field-label">Meios presenciais aceitos (selecione ao menos um)</legend>
        {HANDOFF_PAYMENT_METHODS.map((method) => (
          <div key={method} className="catalog-checkbox-row">
            <input
              id={`${idPrefix}-pm-${method}`}
              name="arrayValues"
              type="checkbox"
              value={method}
              defaultChecked={selected.has(method)}
            />
            <label htmlFor={`${idPrefix}-pm-${method}`}>{PAYMENT_LABELS[method]}</label>
          </div>
        ))}
      </fieldset>
    );
  }

  const textVal = typeof initialValue === "string" ? initialValue : "";
  if ((rules.maxLength ?? 0) > 250) {
    return (
      <div className="auth-field">
        <label htmlFor={`${idPrefix}-txt`}>{definition.display_name}</label>
        <textarea
          id={`${idPrefix}-txt`}
          name="textValue"
          rows={2}
          maxLength={rules.maxLength}
          defaultValue={textVal}
          required={rules.allowEmpty === false}
        />
      </div>
    );
  }

  return (
    <div className="auth-field">
      <label htmlFor={`${idPrefix}-txt`}>{definition.display_name}</label>
      <input
        id={`${idPrefix}-txt`}
        name="textValue"
        type="text"
        maxLength={rules.maxLength}
        defaultValue={textVal}
        required={rules.allowEmpty === false}
      />
    </div>
  );
}

function UserDensitySection({
  definition,
  organizationId,
  userId,
  scopedValues,
  effectiveRow,
  deviceDensity,
  setDeviceDensity,
  activeDensity,
}: Readonly<{
  definition: DefinitionRow;
  organizationId: string;
  userId: string;
  scopedValues: ScopedValueRow[];
  effectiveRow: EffectiveSettingRow | null;
  deviceDensity: UiDensityMode | "";
  setDeviceDensity: Dispatch<SetStateAction<UiDensityMode | "">>;
  activeDensity: UiDensityMode;
}>) {
  const [state, action, pending] = useActionState(saveSettingValueAction, null);
  const userRow = scopedValues.find(
    (row) => row.setting_key === definition.key
      && row.scope_type === "user"
      && row.organization_id === organizationId
      && row.user_id === userId,
  ) ?? null;

  const higherLock = (effectiveRow?.locked_by_scope as PersistedSettingScope | null) ?? null;
  const blocked = isTargetScopeBlockedByHigherLock("user", higherLock);
  const rawPreferred = userRow?.value_json ?? effectiveRow?.effective_value;
  const initialMode = typeof rawPreferred === "string" ? rawPreferred : "comfortable";

  return (
    <section className="catalog-section" aria-labelledby="settings-user-heading">
      <div className="catalog-section-heading">
        <div>
          <span className="catalog-index">04</span>
          <h2 id="settings-user-heading">Preferência do operador e sessão (Usuário → Dispositivo)</h2>
        </div>
        <span className="settings-plan-pill">
          Ativo: {activeDensity === "compact" ? "Compacta" : "Confortável"}
        </span>
      </div>
      <div className="catalog-card-grid">
        <article className="catalog-card">
          <span className="catalog-card-kicker">PREFERÊNCIA PERSISTIDA · ESCOPO USUÁRIO</span>
          <h3>{definition.display_name}</h3>
          <p className="catalog-help">{definition.description}</p>
          {blocked ? (
            <p className="catalog-form-note">
              Densidade travada por política superior ({SCOPE_LABELS[higherLock ?? "organization"]}).
            </p>
          ) : (
            <form className="catalog-offer-form" action={action}>
              <input type="hidden" name="settingKey" value={definition.key} />
              <input type="hidden" name="scopeType" value="user" />
              <input type="hidden" name="organizationId" value={organizationId} />
              <div className="auth-field">
                <label htmlFor="settings-user-density">Modo salvo na sua conta</label>
                <select id="settings-user-density" name="enumValue" defaultValue={initialMode}>
                  <option value="comfortable">Confortável (leitura ampla)</option>
                  <option value="compact">Compacta (operação densa)</option>
                </select>
              </div>
              <button className="catalog-save-button" type="submit" disabled={pending}>
                {pending ? "Salvando…" : "Salvar minha preferência"}
              </button>
              <SettingsActionFeedback state={state} />
            </form>
          )}
        </article>

        <article className="catalog-card catalog-readonly-card">
          <span className="catalog-card-kicker">SOBREPOSIÇÃO EFÊMERA · SESSÃO / DISPOSITIVO</span>
          <h3>Ajuste rápido somente nesta tela</h3>
          <p className="catalog-help">
            Demonstra o último nível da hierarquia (Dispositivo/Sessão) sem alterar o padrão salvo da organização ou de outros terminais.
          </p>
          <div className="auth-field">
            <label htmlFor="settings-device-density">Sobreposição local da sessão</label>
            <select
              id="settings-device-density"
              value={deviceDensity}
              disabled={blocked}
              onChange={(event) => setDeviceDensity(event.target.value as UiDensityMode | "")}
            >
              <option value="">Usar valor herdado ({effectiveRow?.effective_value === "compact" ? "Compacta" : "Confortável"})</option>
              <option value="comfortable">Forçar Confortável nesta sessão</option>
              <option value="compact">Forçar Compacta nesta sessão</option>
            </select>
          </div>
        </article>
      </div>
    </section>
  );
}

function SettingsActionFeedback({ state }: Readonly<{ state: SettingsActionState }>) {
  if (!state) return null;
  if (state.kind === "saved") {
    const auditLabel = state.auditEventIds.length ? state.auditEventIds.join(", ") : "sem alteração material";
    return (
      <output className="catalog-form-success">
        Configuração salva (v{state.version}). Código: {state.correlationId}. Auditoria: {auditLabel}.
      </output>
    );
  }
  if (state.kind === "step_up_required") {
    return (
      <output className="catalog-form-note">
        Confirmação em duas etapas necessária para política sensível. Código: {state.correlationId}
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
  const errorMessages: Record<"policy_locked" | "entitlement_denied" | "invalid" | "denied" | "failed", string> = {
    policy_locked: "Operação bloqueada: esta chave está travada por um escopo superior de política.",
    entitlement_denied: "O plano ou override de capacidades da organização não autoriza ativar esta chave.",
    invalid: "Revise o valor informado conforme os limites permitidos.",
    denied: "Alteração não autorizada para o seu papel neste escopo.",
    failed: "Não foi possível concluir a alteração.",
  };
  return (
    <p className="catalog-form-error" role="alert">
      {errorMessages[state.kind]} Código: {state.correlationId}
    </p>
  );
}

function findScopedRow(
  rows: ScopedValueRow[],
  settingKey: string,
  targetScope: "branch" | "organization",
  organizationId: string,
  selectedBranch: Readonly<{ id: string; establishmentId: string }> | null,
): ScopedValueRow | null {
  if (targetScope === "organization") {
    return rows.find(
      (row) => row.setting_key === settingKey
        && row.scope_type === "organization"
        && row.organization_id === organizationId,
    ) ?? null;
  }
  if (!selectedBranch) return null;
  return rows.find(
    (row) => row.setting_key === settingKey
      && row.scope_type === "branch"
      && row.organization_id === organizationId
      && row.establishment_id === selectedBranch.establishmentId
      && row.branch_id === selectedBranch.id,
  ) ?? null;
}

function formatSettingDisplayValue(valueType: string, value: Json): string {
  if (valueType === "boolean") return value === true ? "Ativo" : "Pausado / Desativado";
  if (valueType === "integer") return typeof value === "number" ? `${value} min` : "—";
  if (valueType === "string_array" && Array.isArray(value)) {
    const labels = value
      .filter((item): item is string => typeof item === "string")
      .map((item) => PAYMENT_LABELS[item as HandoffPaymentMethod] ?? item);
    return labels.join(", ");
  }
  const str = typeof value === "string" ? value : "";
  return str.length > 0 ? str : "Não informado";
}

function formatEntitlementValue(valueType: string, value: Json): string {
  if (valueType === "boolean") return value === true ? "Liberado" : "Indisponível no plano atual";
  return typeof value === "number" ? `${value}` : "—";
}
