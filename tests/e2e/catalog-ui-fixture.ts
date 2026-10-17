import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import path from "node:path";
import { expect, test, type Browser } from "@playwright/test";
import { parseLocalSupabaseStatus } from "../../scripts/parse-local-supabase-status.mjs";
import { totp } from "./totp";

// Local E2E fixture for the catalog management surface.
//
// Two properties shape this fixture and both differ from the GMZ-IMPL-004 one.
//
// First, catalog truth is archival. A catalog row, a command receipt and a durable audit event all
// refuse hard deletion, and a receipt pins the identity that produced it. An identity that ran a
// catalog contract therefore cannot be removed afterwards, so per-run random identities would leak
// on every run. The identities here are stable and reused, their password is rotated each run, and
// the tenant rows are reconciled with ON CONFLICT instead of being torn down. `supabase db reset --local`
// is the reset path, exactly as it is for the rest of the local stack.
//
// Second, the two Playwright projects run at the same time against the same local database, and this
// fixture reuses identities across runs. Each project therefore gets its own tag, and with it its own
// identities and its own tenant: two projects sharing one tenant would rebind each other's memberships
// and rotate each other's passwords mid-run.
//
// Third, the catalog capabilities are not the Admin Guard's. The fixture grants only catalog.*, so a
// run that reached the catalog through the Admin Guard's own permission would prove nothing about the
// catalog boundary. Reaching the money controls must come from the catalog page alone.

export type CatalogOfferState = {
  base_price: string;
  promotional_price: string | null;
  availability: string;
  visibility: string;
  price_revision: number;
  timeline_rows: number;
  open_revisions: number;
  audit_rows: number;
};

export type CatalogTimelineInstant = { effective_from: string; effective_to: string | null };

function offerStateSql(offerId: string) {
  return `SELECT
  (SELECT base_price_amount::text FROM public.channel_offers WHERE id = '${offerId}') AS base_price,
  (SELECT promotional_price_amount::text FROM public.channel_offers WHERE id = '${offerId}') AS promotional_price,
  (SELECT availability FROM public.channel_offers WHERE id = '${offerId}') AS availability,
  (SELECT visibility FROM public.channel_offers WHERE id = '${offerId}') AS visibility,
  (SELECT price_revision FROM public.channel_offers WHERE id = '${offerId}') AS price_revision,
  (SELECT count(*)::integer FROM public.channel_offer_price_timeline WHERE channel_offer_id = '${offerId}') AS timeline_rows,
  (SELECT count(*)::integer FROM public.channel_offer_price_timeline WHERE channel_offer_id = '${offerId}' AND effective_to IS NULL) AS open_revisions,
  (SELECT count(*)::integer FROM public.audit_events WHERE target_id = '${offerId}') AS audit_rows;`;
}

type LocalApi = { apiUrl: string; anonKey: string; serviceRoleKey: string };
type SyntheticUser = { id: string; email: string; password: string };

export type CatalogUiFixture = {
  manager: SyntheticUser;
  reader: SyntheticUser;
  foreignManager: SyntheticUser;
  organizationId: string;
  foreignOrganizationId: string;
  categoryId: string;
  productId: string;
  variantId: string;
  channelId: string;
  offerId: string;
  seededCategoryName: string;
  seededProductName: string;
  seededVariantName: string;
  seededChannelName: string;
  seededOfferTitle: string;
  foreignCategoryName: string;
  /** Exact persisted commercial state of an offer, read straight from the local database. */
  readOfferState(offerId?: string): Promise<CatalogOfferState>;
  /** Latest timeline instants, read straight from the local database for deterministic timezone proof. */
  readLatestTimelineInstants(offerId?: string): Promise<CatalogTimelineInstant[]>;
};

const root = process.cwd();
const supabaseCli = path.join(root, "node_modules", "supabase", "dist", "supabase.js");
const localUrl = /^http:\/\/(127\.0\.0\.1|localhost|\[::1\])(?::\d+)?$/;


// A per-project tag, two hex characters, carried into every identifier and every seeded name. The
// projects are the unit of isolation here because they are the unit of concurrency. Hexadecimal is
// not decoration: the tag is the leading pair of the last group of every identifier, and Postgres
// refuses to read a character that is not a hex digit as a uuid.
const PROJECT_TAGS: Record<string, string> = {
  "desktop-chromium": "d7",
  "mobile-chromium": "a7",
};

function resolveTag(projectName: string | undefined): string {
  const tag = projectName ? PROJECT_TAGS[projectName] : undefined;
  if (!tag) throw new Error("The catalog E2E fixture has no tag for this Playwright project.");
  return tag;
}

function buildFixtureIds(tag: string) {
  const id = (value: number) => `88000000-0000-4000-8000-${tag}${String(value).padStart(10, "0")}`;
  return {
    organization: id(1),
    establishment: id(2),
    branch: id(3),
    managerRole: id(4),
    readerRole: id(5),
    managerMembership: id(6),
    readerMembership: id(7),
    managerAssignment: id(8),
    readerAssignment: id(9),
    category: id(10),
    product: id(11),
    variant: id(12),
    channel: id(13),
    offer: id(14),
    offerSeedAudit: id(15),
    offerSeedCorrelation: id(16),
    foreignOrganization: id(21),
    foreignRole: id(22),
    foreignMembership: id(23),
    foreignAssignment: id(24),
    foreignCategory: id(31),
  };
}

function buildFixtureNames(tag: string) {
  const prefix = `GMZ-IMPL-007 E2E ${tag.toUpperCase()}`;
  return {
    organization: `${prefix} tenant`,
    establishment: `${prefix} estabelecimento`,
    branch: `${prefix} filial`,
    category: `${prefix} Bebidas`,
    product: `${prefix} Café expresso`,
    variant: `${prefix} Copo 90 ml`,
    channel: `${prefix} Goodz Online`,
    channelKey: `gmz007-e2e-${tag}-online`,
    offerTitle: `${prefix} Café expresso online`,
    foreignOrganization: `${prefix} tenant concorrente`,
    foreignCategory: `${prefix} Categoria de outro tenant`,
  };
}

function runSupabase(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [supabaseCli, ...args], {
      cwd: root,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8").on("data", (chunk: string) => { stdout += chunk; });
    child.stderr.setEncoding("utf8").on("data", (chunk: string) => { stderr += chunk; });
    child.once("error", reject);
    child.once("close", (code, signal) => {
      if (code === 0) resolve(stdout);
      else {
        const reason = signal || `exit ${code}`;
        reject(new Error(`Local Supabase command failed (${reason}). ${sanitize([stderr, stdout].join("\n"))}`));
      }
    });
  });
}

function sanitize(value: string) {
  return value
    .replace(/("(?:SERVICE_ROLE_KEY|SECRET_KEY|DB_URL|JWT_SECRET|ANON_KEY|PUBLISHABLE_KEY)"\s*:\s*")[^"]*(")/gi, "$1[redacted]$2")
    .replace(/\b(?:SERVICE_ROLE_KEY|SECRET_KEY|DB_URL|JWT_SECRET|ANON_KEY|PUBLISHABLE_KEY)=\S+/gi, "[redacted]")
    .replace(/\bBearer\s+\S+/gi, "Bearer [redacted]")
    .replace(/\b(?:password|access_token|refresh_token|totp_secret|totp_code)\s*[:=]\s*["']?[^\s,;"']+/gi, "[credential redacted]")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(-3)
    .join(" ")
    .slice(0, 400);
}

async function executeSql(sql: string) {
  // The CLI accepts one prepared statement per request; fixture mutations depend on this order, so
  // they are chained one at a time rather than launched together.
  const statements = sql.split(";").map((part) => part.trim()).filter(Boolean);
  await statements.reduce<Promise<unknown>>(
    (previous, statement) => previous.then(() => runSupabase(["db", "query", "--local", statement])),
    Promise.resolve(),
  );
}

async function queryJsonRows<T>(sql: string): Promise<T[]> {
  const output = await runSupabase(["db", "query", "--local", "--output-format", "json", sql]);
  const jsonStart = output.search(/[[{]/);
  if (jsonStart < 0) throw new Error("A leitura local do catálogo não retornou um resultado legível.");
  const parsed = JSON.parse(output.slice(jsonStart)) as T[] | { rows?: T[] };
  const rows = Array.isArray(parsed) ? parsed : parsed.rows;
  if (!Array.isArray(rows) || rows.length === 0) throw new Error("A leitura local do catálogo não retornou nenhuma linha.");
  return rows;
}

async function queryJson<T>(sql: string): Promise<T> {
  return (await queryJsonRows<T>(sql))[0];
}

async function getLocalApi(): Promise<LocalApi> {
  const status = parseLocalSupabaseStatus(await runSupabase(["status", "--output", "json"]));
  const apiUrl = status.API_URL ?? status.api_url;
  const anonKey = status.ANON_KEY ?? status.anon_key;
  const serviceRoleKey = status.SERVICE_ROLE_KEY ?? status.service_role_key;
  if (typeof apiUrl !== "string" || !localUrl.test(apiUrl) || typeof anonKey !== "string" || !anonKey) {
    throw new Error("Local Supabase catalog fixtures require a loopback API and a public anon key.");
  }
  if (typeof serviceRoleKey !== "string" || !serviceRoleKey) {
    throw new Error("Local Supabase must provide its server-only credential so the E2E fixture can provision synthetic identities.");
  }
  return { apiUrl, anonKey, serviceRoleKey };
}

/**
 * The service role is used here for exactly one thing: provisioning the synthetic identities and
 * their authenticator factors. It never reads or writes catalog truth, never decides authority, and
 * is never in the path of a catalog command. Those travel on the operator's own session token, which
 * is the property the catalog boundary actually rests on.
 */
async function adminFetch(api: LocalApi, path: string, init: RequestInit = {}): Promise<unknown> {
  const response = await fetch(`${api.apiUrl}/auth/v1/admin${path}`, {
    ...init,
    headers: {
      apikey: api.serviceRoleKey,
      authorization: `Bearer ${api.serviceRoleKey}`,
      ...(init.body ? { "content-type": "application/json" } : {}),
      ...(init.headers as Record<string, string> | undefined),
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Auth admin call failed with HTTP ${response.status}. ${sanitize(JSON.stringify(body))}`);
  return body;
}

async function listFactors(api: LocalApi, userId: string): Promise<{ id: string }[]> {
  const body = await adminFetch(api, `/users/${userId}/factors`);
  // GoTrue has returned this collection both bare and wrapped depending on the build, and a shape
  // that silently reads as "no factors" is the one failure mode that would leave a stale factor in
  // place and make the enrollment below unreachable.
  const factors = Array.isArray(body)
    ? body as { id: string }[]
    : ((body as { factors?: { id: string }[] }).factors ?? []);
  return factors.filter(({ id }) => typeof id === "string" && id.length > 0);
}

async function listUsers(api: LocalApi): Promise<{ id: string; email?: string }[]> {
  const body = await adminFetch(api, "/users?page=1&per_page=200") as { users?: { id: string; email?: string }[] };
  return body.users ?? [];
}

/**
 * A reused identity, with its password rotated so a stale cookie from an earlier run cannot be
 * replayed into this one, and with no authenticator factor left behind by an earlier run.
 *
 * Two workers may reach this at the same moment, so a create that loses the race is resolved by
 * reading the winner back rather than by failing the run.
 */
async function ensureIdentity(
  api: LocalApi,
  tag: string,
  label: string,
): Promise<SyntheticUser> {
  const email = `gmz-impl-007-e2e-${tag}-${label}@goodz.test`;
  const password = `T-${randomBytes(24).toString("base64url")}a9!`;

  const setPassword = async (id: string) => {
    await adminFetch(api, `/users/${id}`, {
      method: "PUT",
      body: JSON.stringify({ password, email_confirm: true }),
    });
  };

  const alreadyThere = (await listUsers(api)).find((user) => user.email === email);
  let id = alreadyThere?.id ?? "";
  if (id) {
    await setPassword(id);
  } else {
    try {
      const created = await adminFetch(api, "/users", {
        method: "POST",
        body: JSON.stringify({ email, password, email_confirm: true }),
      }) as { id?: string };
      id = created.id ?? "";
    } catch (error) {
      const raced = (await listUsers(api)).find((user) => user.email === email);
      if (!raced) throw error;
      id = raced.id;
    }
    await setPassword(id);
  }
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error("Local Auth did not return a valid catalog fixture identity.");

  // Remove any factor left by an earlier run. GoTrue will not unenroll a verified factor without a
  // current AAL2 session, and no run can produce one: the secret that would satisfy the challenge
  // died with the run that enrolled it. So the stale rows are cleared in the local database instead,
  // where the fixture already provisions everything else. It is the only reset available, and it is
  // only ever available locally — no committed path reaches it.
  const factors = await listFactors(api, id);
  if (factors.length > 0) {
    await executeSql(`DELETE FROM auth.mfa_factors WHERE user_id = '${id}'`);
  }

  return { id, email, password };
}

/**
 * Enrolls and verifies an authenticator factor for a synthetic identity, through the same interface a
 * person uses.
 *
 * GoTrue in this stack exposes no admin route for factor enrollment, so the enrollment happens in the
 * application. That is not a workaround: it means the catalog proof depends on the real enrollment
 * flow rather than on a privileged shortcut the product itself does not offer.
 */
export async function enrollTotpFor(browser: Browser, user: SyntheticUser): Promise<string> {
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await page.goto("/login");
    await page.getByLabel("E-mail").fill(user.email);
    await page.getByLabel("Senha").fill(user.password);
    await page.getByRole("button", { name: "Entrar" }).click();
    await page.waitForURL(/\/app$/);

    await page.goto("/app/security");
    await page.getByLabel("Senha para reautenticar").fill(user.password);
    await page.getByRole("button", { name: "Confirmar identidade e configurar" }).click();
    await expect(page.getByRole("img", { name: "QR code para configurar o aplicativo autenticador" })).toBeVisible();

    const secret = await page.getByTestId("mfa-manual-secret").textContent();
    if (!secret) throw new Error("The local TOTP fixture is unavailable.");

    const verifyResponsePromise = page.waitForResponse((response) => {
      const request = response.request();
      return request.method() === "POST" && /\/auth\/v1\/factors\/[^/]+\/verify$/.test(new URL(response.url()).pathname);
    });
    await page.getByLabel("Código do aplicativo autenticador").fill(totp(secret));
    await page.getByRole("button", { name: "Confirmar configuração" }).click();
    const verifyResponse = await verifyResponsePromise;
    expect(verifyResponse.ok()).toBe(true);
    return secret;
  } finally {
    await context.close().catch(() => undefined);
  }
}

export async function createCatalogUiFixture(projectName?: string): Promise<CatalogUiFixture> {
  const tag = resolveTag(projectName ?? process.env.PW_PROJECT_NAME ?? test.info().project.name);
  const ids = buildFixtureIds(tag);
  const names = buildFixtureNames(tag);
  const api = await getLocalApi();

  const manager = await ensureIdentity(api, tag, "manager");
  const reader = await ensureIdentity(api, tag, "reader");
  const foreignManager = await ensureIdentity(api, tag, "foreign");

  // A membership whose user_id still names a removed identity would silently deny the very tenant it
  // belongs to, so the fixture rebinds rather than skipping on conflict.
  await executeSql(`INSERT INTO public.organizations (id, display_name) VALUES
  ('${ids.organization}', '${names.organization}'),
  ('${ids.foreignOrganization}', '${names.foreignOrganization}')
  ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name;
INSERT INTO public.establishments (id, organization_id, display_name) VALUES
  ('${ids.establishment}', '${ids.organization}', '${names.establishment}')
  ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name;
INSERT INTO public.branches (id, organization_id, establishment_id, display_name) VALUES
  ('${ids.branch}', '${ids.organization}', '${ids.establishment}', '${names.branch}')
  ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name;
INSERT INTO public.tenant_roles (id, organization_id, role_key, display_name) VALUES
  ('${ids.managerRole}', '${ids.organization}', 'gmz007-e2e-catalog-manager', 'GMZ-IMPL-007 E2E catalog manager'),
  ('${ids.readerRole}', '${ids.organization}', 'gmz007-e2e-catalog-reader', 'GMZ-IMPL-007 E2E catalog reader'),
  ('${ids.foreignRole}', '${ids.foreignOrganization}', 'gmz007-e2e-catalog-manager', 'GMZ-IMPL-007 E2E catalog manager')
  ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name;
INSERT INTO public.role_permissions (organization_id, role_id, permission_key)
  SELECT '${ids.organization}', '${ids.managerRole}', key FROM unnest(ARRAY['catalog.read','catalog.write','catalog.price.manage','catalog.availability.manage']) AS key
  ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (organization_id, role_id, permission_key) VALUES
  ('${ids.organization}', '${ids.readerRole}', 'catalog.read')
  ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (organization_id, role_id, permission_key)
  SELECT '${ids.foreignOrganization}', '${ids.foreignRole}', key FROM unnest(ARRAY['catalog.read','catalog.write','catalog.price.manage','catalog.availability.manage']) AS key
  ON CONFLICT DO NOTHING;
INSERT INTO public.organization_memberships (id, organization_id, user_id, status) VALUES
  ('${ids.managerMembership}', '${ids.organization}', '${manager.id}', 'active'),
  ('${ids.readerMembership}', '${ids.organization}', '${reader.id}', 'active'),
  ('${ids.foreignMembership}', '${ids.foreignOrganization}', '${foreignManager.id}', 'active')
  ON CONFLICT (id) DO UPDATE SET user_id = EXCLUDED.user_id, status = 'active', revoked_at = NULL;
INSERT INTO public.membership_roles (id, organization_id, membership_id, role_id, scope_type) VALUES
  ('${ids.managerAssignment}', '${ids.organization}', '${ids.managerMembership}', '${ids.managerRole}', 'organization'),
  ('${ids.readerAssignment}', '${ids.organization}', '${ids.readerMembership}', '${ids.readerRole}', 'organization'),
  ('${ids.foreignAssignment}', '${ids.foreignOrganization}', '${ids.foreignMembership}', '${ids.foreignRole}', 'organization')
  ON CONFLICT (id) DO UPDATE SET membership_id = EXCLUDED.membership_id, role_id = EXCLUDED.role_id, scope_type = 'organization', establishment_id = NULL, branch_id = NULL;

INSERT INTO public.product_categories (id, organization_id, name, description, display_order) VALUES
  ('${ids.category}', '${ids.organization}', '${names.category}', 'Fixture category for the catalog E2E', 10),
  ('${ids.foreignCategory}', '${ids.foreignOrganization}', '${names.foreignCategory}', 'Must never appear in the first tenant', 10)
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
INSERT INTO public.products (id, organization_id, category_id, name, description) VALUES
  ('${ids.product}', '${ids.organization}', '${ids.category}', '${names.product}', 'Fixture product for the catalog E2E')
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
INSERT INTO public.product_variants (id, organization_id, product_id, name) VALUES
  ('${ids.variant}', '${ids.organization}', '${ids.product}', '${names.variant}')
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
INSERT INTO public.sales_channels (id, organization_id, channel_key, display_name) VALUES
  ('${ids.channel}', '${ids.organization}', '${names.channelKey}', '${names.channel}')
  ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name;
INSERT INTO public.channel_offers (id, organization_id, sales_channel_id, product_id, title, base_price_amount, base_price_currency, promotional_price_amount, availability, visibility, status, price_revision)
  VALUES ('${ids.offer}', '${ids.organization}', '${ids.channel}', '${ids.product}', '${names.offerTitle}', 7.5000, 'BRL', 5.9000, 'available', 'visible', 'active', 1)
  ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title;
INSERT INTO public.audit_events (id, actor_user_id, organization_id, action, target_type, target_id, outcome, reason_code, correlation_id, source, metadata)
  VALUES ('${ids.offerSeedAudit}', '${manager.id}', '${ids.organization}', 'catalog.channel_offer.created', 'channel_offer', '${ids.offer}', 'allow', 'authorized', '${ids.offerSeedCorrelation}', 'catalog_contract', '{}'::jsonb)
  ON CONFLICT (id) DO NOTHING;
INSERT INTO public.channel_offer_price_history (id, organization_id, channel_offer_id, price_revision, base_price_amount, base_price_currency, promotional_price_amount, availability, visibility, effective_from, recorded_by_user_id, correlation_id, audit_event_id)
  SELECT gen_random_uuid(), '${ids.organization}', '${ids.offer}', 1, 7.5000, 'BRL', 5.9000, 'available', 'visible', now(), '${manager.id}', '${ids.offerSeedCorrelation}', '${ids.offerSeedAudit}'
  WHERE (SELECT price_revision FROM public.channel_offers WHERE id = '${ids.offer}') = 1
    AND NOT EXISTS (SELECT 1 FROM public.channel_offer_price_history WHERE channel_offer_id = '${ids.offer}')`);

  // The seeded offer carries the revision-1 history row the contract writes when it creates an offer.
  // Seeding it without one produced a state the product cannot reach, and the first admitted change in
  // a run then closed a revision no history had recorded: the prior price was not closed, it was
  // gone. The proof below passed only on a database that already carried a long timeline, which is
  // exactly the kind of truth that depends on how many times the suite had run before it.
  //
  // The audit metadata is left empty on purpose: the guard admits only a fixed set of keys, and a
  // seeded creation has nothing to say that the row itself does not already say. No SQL comment
  // appears inside the statements below, because the CLI reads a leading "--" as one of its own flags.
  //
  // The row is written only while the offer is still at revision 1. A later run must not append a
  // revision-1 row dated after the revisions that already closed it, which would reorder a history
  // that is archival by construction.
  //
  // The baseline is read rather than asserted, because catalog truth is archival: after a second run
  // the offer legitimately carries a different price, a later revision and a longer timeline. Every
  // assertion about a change is therefore relative to what this read observes.
  const seeded = await queryJson<CatalogOfferState>(offerStateSql(ids.offer));
  if (typeof seeded.price_revision !== "number" || seeded.price_revision < 1) {
    throw new Error("The catalog E2E fixture offer has no usable commercial state; reset the local database.");
  }

  async function readOfferState(offerId = ids.offer): Promise<CatalogOfferState> {
    return queryJson<CatalogOfferState>(offerStateSql(offerId));
  }

  async function readLatestTimelineInstants(offerId = ids.offer): Promise<CatalogTimelineInstant[]> {
    return queryJsonRows<CatalogTimelineInstant>(`SELECT
  to_char(effective_from AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS effective_from,
  to_char(effective_to AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS effective_to
FROM public.channel_offer_price_timeline
WHERE channel_offer_id = '${offerId}'
ORDER BY price_revision DESC
LIMIT 2;`);
  }

  return {
    manager,
    reader,
    foreignManager,
    organizationId: ids.organization,
    foreignOrganizationId: ids.foreignOrganization,
    categoryId: ids.category,
    productId: ids.product,
    variantId: ids.variant,
    channelId: ids.channel,
    offerId: ids.offer,
    seededCategoryName: names.category,
    seededProductName: names.product,
    seededVariantName: names.variant,
    seededChannelName: names.channel,
    seededOfferTitle: names.offerTitle,
    foreignCategoryName: names.foreignCategory,
    readOfferState,
    readLatestTimelineInstants,
  };
}

