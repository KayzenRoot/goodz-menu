import { randomBytes, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = fileURLToPath(new URL("../../", import.meta.url));
const supabaseCli = resolve(repositoryRoot, "node_modules/supabase/dist/supabase.js");
const apiUrlPattern = /^https?:\/\/(127\.0\.0\.1|localhost|\[::1\])(?::\d+)?$/;
// Every path this run assembles is written here as a literal, so the pattern is an allowlist rather
// than a filter: nothing that reaches fetch is allowed to walk out of the two endpoints below.
const adminPathPattern = /^\/admin\/users(?:\/[0-9a-f-]{36})?(?:\?[a-z0-9_=&]*)?$/;
const relationPathPattern = /^[a-z][a-z0-9_]*$/;
const controlCharacters = /[\s\u0000-\u001f\u007f]+/g;

// Anything a refusal message or an assertion name carries is echoed to the console, so control
// characters are folded away before printing: a server-supplied message must not be able to forge
// extra log lines.
function sanitizeForLog(text) {
  return String(text).replace(controlCharacters, " ").slice(0, 300);
}

// The fixture is a stable two-tenant skeleton. Catalog rows are archival by design and the schema
// refuses to hard delete them, so the skeleton is reused idempotently across runs rather than being
// torn down and rebuilt. Only the synthetic identities are removed at the end.
const tenant = {
  organizations: { a: "87000000-0000-4000-8000-000000000010", b: "87000000-0000-4000-8000-000000000011" },
  establishments: { a1: "87000000-0000-4000-8000-000000000012", b1: "87000000-0000-4000-8000-000000000014" },
  branches: { a11: "87000000-0000-4000-8000-000000000015" },
  roles: {
    aManager: "87000000-0000-4000-8000-000000000020",
    aReader: "87000000-0000-4000-8000-000000000021",
    aWithout: "87000000-0000-4000-8000-000000000022",
    bManager: "87000000-0000-4000-8000-000000000023",
  },
  memberships: {
    aManager: "87000000-0000-4000-8000-000000000030",
    aReader: "87000000-0000-4000-8000-000000000031",
    aWithout: "87000000-0000-4000-8000-000000000032",
    bManager: "87000000-0000-4000-8000-000000000033",
  },
  membershipRoles: {
    aManager: "87000000-0000-4000-8000-000000000040",
    aReader: "87000000-0000-4000-8000-000000000041",
    aWithout: "87000000-0000-4000-8000-000000000042",
    bManager: "87000000-0000-4000-8000-000000000043",
  },
  categories: { a: "87000000-0000-4000-8000-000000000050", b: "87000000-0000-4000-8000-000000000051" },
  products: { a: "87000000-0000-4000-8000-000000000060", b: "87000000-0000-4000-8000-000000000061" },
  variants: { a: "87000000-0000-4000-8000-000000000070" },
  channels: { a: "87000000-0000-4000-8000-000000000080", b: "87000000-0000-4000-8000-000000000081" },
  offers: { a: "87000000-0000-4000-8000-000000000090" },
};

const checks = [];
const runTag = randomUUID().slice(0, 8);
const users = {};

function runSupabase(args) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(process.execPath, [supabaseCli, ...args], {
      cwd: repositoryRoot,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8").on("data", (chunk) => { stdout += chunk; });
    child.stderr.setEncoding("utf8").on("data", (chunk) => { stderr += chunk; });
    child.once("error", rejectRun);
    child.once("close", (code, signal) => {
      if (code === 0) resolveRun({ stdout, stderr });
      else rejectRun(new Error("Supabase CLI failed (" + (signal || "exit " + code) + "). " + sanitizeCliError(stdout, stderr)));
    });
  });
}

function sanitizeCliError(stdout, stderr) {
  return `${stderr}\n${stdout}`
    .replace(/("(?:SERVICE_ROLE_KEY|SECRET_KEY|DB_URL|JWT_SECRET|ANON_KEY|PUBLISHABLE_KEY)"\s*:\s*")[^"]*(")/gi, "$1[redacted]$2")
    .replace(/\b(?:SERVICE_ROLE_KEY|SECRET_KEY|DB_URL|JWT_SECRET|ANON_KEY|PUBLISHABLE_KEY)=\S+/gi, "[redacted]")
    .replace(/(postgres(?:ql)?:\/\/[^:/\s]+:)[^@/\s]+(@)/gi, "$1[redacted]$2")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(-4)
    .join(" ")
    .slice(0, 500);
}

async function getLocalApi() {
  const configuredUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
  if (configuredUrl && !apiUrlPattern.test(configuredUrl)) {
    throw new Error("Catalog integration refuses a non-local SUPABASE_URL.");
  }

  const { stdout } = await runSupabase(["status", "--output", "json"]);
  const status = JSON.parse(stdout);
  const apiUrl = configuredUrl || status.API_URL || status.api_url;
  const anonKey = process.env.SUPABASE_ANON_KEY || status.ANON_KEY || status.anon_key;
  if (!apiUrlPattern.test(apiUrl || "") || !anonKey) {
    throw new Error("Local Supabase URL or anon key is unavailable; remote endpoints are not permitted.");
  }

  // Every catalog read and every catalog command below travels on the anonymous client key or on a
  // user session token. The service role is consulted for exactly one thing: provisioning the
  // synthetic identities, because GoTrue filters auth.users by instance_id and a directly inserted
  // row is invisible to Auth. If the client key were ever the service role, the run stops here
  // rather than quietly authorizing around RLS.
  const serviceRoleKey = status.SERVICE_ROLE_KEY || status.service_role_key || "";
  if (serviceRoleKey && anonKey === serviceRoleKey) {
    throw new Error("The catalog integration refuses to run with the service role key as its client key.");
  }
  if (!serviceRoleKey) {
    throw new Error("The local service role key is unavailable; synthetic identities cannot be provisioned.");
  }
  record("catalog reads and commands never travel on the service role key");

  const supabaseConfig = await readFile(resolve(repositoryRoot, "supabase/config.toml"), "utf8");
  const apiSection = supabaseConfig.split(/^\[api\]\s*$/m)[1]?.split(/^\[/m)[0] || "";
  const exposedSchemas = apiSection.match(/^schemas\s*=\s*\[[^\]]*\]/m)?.[0] || "";
  if (/\bprivate\b/i.test(exposedSchemas)) {
    throw new Error("Private authorization helpers must remain outside exposed Data API schemas.");
  }
  record("private authorization helper schema is not exposed through the Data API");

  return { apiUrl, anonKey, serviceRoleKey };
}

// A catalog command receipt pins its actor with ON DELETE RESTRICT, and a durable audit event
// pins it as well, so an identity that has ever run a contract can never be removed. The fixture
// therefore reuses one stable synthetic identity per role and rotates its password on every run,
// which is what keeps repeated runs idempotent instead of accumulating pinned actors. The password
// is generated per run and never written to disk or to evidence.
const FIXTURE_PASSWORD = `T-${randomBytes(24).toString("base64url")}a9!`;
const fixtureEmail = (label) => `gmz-impl-007-api-${label}@goodz.test`;

// The allowlist patterns above are checked here rather than trusted: a path that does not match
// never reaches the network, so neither API traversal nor a request that leaves the local origin is
// possible from this harness.
function localEndpoint(api, prefix, path, pattern) {
  if (!pattern.test(path)) {
    throw new TypeError(`Refusing a request to an undeclared local path: ${sanitizeForLog(path)}`);
  }
  const endpoint = new URL(`${api.apiUrl}${prefix}${path}`);
  if (endpoint.origin !== new URL(api.apiUrl).origin) {
    throw new TypeError("Refusing a catalog request that left the local Supabase origin.");
  }
  return endpoint;
}

async function adminRequest(api, path, method, body) {
  return fetch(localEndpoint(api, "/auth/v1", path, adminPathPattern), {
    method,
    headers: {
      apikey: api.serviceRoleKey,
      authorization: `Bearer ${api.serviceRoleKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

async function ensureAuthenticatedUser(api, label) {
  const email = fixtureEmail(label);
  const listResponse = await adminRequest(api, "/admin/users?page=1&per_page=200", "GET", undefined);
  const listBody = await listResponse.json().catch(() => ({}));
  if (!listResponse.ok) {
    throw new Error(`Local identity listing failed with HTTP ${listResponse.status}.`);
  }
  const existing = (listBody.users || []).find((candidate) => candidate.email === email);

  if (existing) {
    const resetResponse = await adminRequest(api, `/admin/users/${existing.id}`, "PUT", {
      password: FIXTURE_PASSWORD,
      email_confirm: true,
    });
    if (!resetResponse.ok) {
      throw new Error(`Local identity password rotation failed with HTTP ${resetResponse.status}.`);
    }
    record(`synthetic identity ${label} was reused and rotated`);
  } else {
    const createResponse = await adminRequest(api, "/admin/users", "POST", {
      email,
      password: FIXTURE_PASSWORD,
      email_confirm: true,
    });
    const createBody = await createResponse.json().catch(() => ({}));
    if (!createResponse.ok || !createBody.id) {
      throw new Error(`Local identity provisioning failed with HTTP ${createResponse.status}.`);
    }
    record(`synthetic identity ${label} was provisioned through the admin API`);
  }

  const tokenResponse = await fetch(`${api.apiUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: api.anonKey, authorization: `Bearer ${api.anonKey}`, "content-type": "application/json" },
    body: JSON.stringify({ email, password: FIXTURE_PASSWORD }),
  });
  const tokenBody = await tokenResponse.json().catch(() => ({}));
  if (!tokenResponse.ok || !tokenBody.access_token) {
    throw new Error(`Local password-token flow failed with HTTP ${tokenResponse.status}.`);
  }
  const subject = typeof tokenBody.user === "object" ? tokenBody.user.id : undefined;
  if (!subject || !/^[0-9a-f-]{36}$/i.test(subject)) {
    throw new Error("The password grant did not return a usable subject.");
  }
  if (existing && existing.id !== subject) {
    throw new Error("The password grant resolved to a different identity than the one provisioned.");
  }
  record("password-grant token subject matches the provisioned identity");

  // An ordinary browser session is a single factor. That fact is the whole reason the privileged
  // commercial contracts have to reject it below.
  if ((tokenBody.aal || "aal1") !== "aal1") {
    throw new Error("A password-only session must not carry a second-factor claim.");
  }
  record("a password-only session is issued as aal1");

  return { id: subject, accessToken: tokenBody.access_token };
}

function executeFixtureSql(sql) {
  const statements = sql.split(";").map((statement) => statement.trim()).filter(Boolean);
  return statements.reduce(
    (pending, statement) => pending.then(() => runSupabase(["db", "query", "--local", statement])),
    Promise.resolve(),
  );
}

function fixtureSql() {
  const user = Object.entries(users).map(([key, value]) => ({ key, id: value.id }));
  const byLabel = Object.fromEntries(user.map((entry) => [entry.key, entry.id]));
  const org = tenant.organizations;
  const est = tenant.establishments;
  const branch = tenant.branches;
  const role = tenant.roles;
  const membership = tenant.memberships;
  const membershipRole = tenant.membershipRoles;

  return `
INSERT INTO public.organizations (id, display_name) VALUES
  ('${org.a}', 'GMZ-IMPL-007 Data API tenant A'),
  ('${org.b}', 'GMZ-IMPL-007 Data API tenant B') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.establishments (id, organization_id, display_name) VALUES
  ('${est.a1}', '${org.a}', 'Data API establishment A1'),
  ('${est.b1}', '${org.b}', 'Data API establishment B1') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.branches (id, organization_id, establishment_id, display_name) VALUES
  ('${branch.a11}', '${org.a}', '${est.a1}', 'Data API branch A1-1') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.tenant_roles (id, organization_id, role_key, display_name) VALUES
  ('${role.aManager}', '${org.a}', 'gmz007-api-manager', 'Data API catalog manager'),
  ('${role.aReader}', '${org.a}', 'gmz007-api-reader', 'Data API catalog reader'),
  ('${role.aWithout}', '${org.a}', 'gmz007-api-without', 'Data API role without capability'),
  ('${role.bManager}', '${org.b}', 'gmz007-api-foreign', 'Data API foreign catalog manager') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.role_permissions (organization_id, role_id, permission_key) VALUES
  ('${org.a}', '${role.aManager}', 'catalog.read'),
  ('${org.a}', '${role.aManager}', 'catalog.write'),
  ('${org.a}', '${role.aManager}', 'catalog.price.manage'),
  ('${org.a}', '${role.aManager}', 'catalog.availability.manage'),
  ('${org.a}', '${role.aReader}', 'catalog.read'),
  ('${org.b}', '${role.bManager}', 'catalog.read'),
  ('${org.b}', '${role.bManager}', 'catalog.write'),
  ('${org.b}', '${role.bManager}', 'catalog.price.manage') ON CONFLICT DO NOTHING;
INSERT INTO public.organization_memberships (id, organization_id, user_id, status) VALUES
  ('${membership.aManager}', '${org.a}', '${byLabel.aManager}', 'active'),
  ('${membership.aReader}', '${org.a}', '${byLabel.aReader}', 'active'),
  ('${membership.aWithout}', '${org.a}', '${byLabel.aWithout}', 'active'),
  ('${membership.bManager}', '${org.b}', '${byLabel.bManager}', 'active')
  -- Rebind rather than skip: a membership whose user_id still names a removed identity would
  -- otherwise survive forever and silently deny the very tenant it belongs to.
  ON CONFLICT (id) DO UPDATE SET user_id = EXCLUDED.user_id, status = EXCLUDED.status;
INSERT INTO public.membership_roles (id, organization_id, membership_id, role_id, scope_type, establishment_id, branch_id) VALUES
  ('${membershipRole.aManager}', '${org.a}', '${membership.aManager}', '${role.aManager}', 'organization', NULL, NULL),
  ('${membershipRole.aReader}', '${org.a}', '${membership.aReader}', '${role.aReader}', 'organization', NULL, NULL),
  ('${membershipRole.aWithout}', '${org.a}', '${membership.aWithout}', '${role.aWithout}', 'organization', NULL, NULL),
  ('${membershipRole.bManager}', '${org.b}', '${membership.bManager}', '${role.bManager}', 'organization', NULL, NULL)
  ON CONFLICT (id) DO UPDATE SET role_id = EXCLUDED.role_id, scope_type = EXCLUDED.scope_type;
INSERT INTO public.product_categories (id, organization_id, name, display_order) VALUES
  ('${tenant.categories.a}', '${org.a}', 'Data API bebidas', 10),
  ('${tenant.categories.b}', '${org.b}', 'Data API bebidas estrangeiras', 10) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.products (id, organization_id, category_id, name) VALUES
  ('${tenant.products.a}', '${org.a}', '${tenant.categories.a}', 'Data API café expresso'),
  ('${tenant.products.b}', '${org.b}', '${tenant.categories.b}', 'Data API café estrangeiro') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.product_variants (id, organization_id, product_id, name) VALUES
  ('${tenant.variants.a}', '${org.a}', '${tenant.products.a}', 'Data API copo 90 ml') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.sales_channels (id, organization_id, channel_key, display_name) VALUES
  ('${tenant.channels.a}', '${org.a}', 'goodz-online', 'Goodz Online'),
  ('${tenant.channels.b}', '${org.b}', 'goodz-online', 'Canal estrangeiro') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.channel_offers (id, organization_id, sales_channel_id, product_id, base_price_amount, base_price_currency, promotional_price_amount) VALUES
  ('${tenant.offers.a}', '${org.a}', '${tenant.channels.a}', '${tenant.products.a}', 12345.6789, 'BRL', 9999.9999)
  ON CONFLICT (id) DO UPDATE SET base_price_amount = EXCLUDED.base_price_amount, promotional_price_amount = EXCLUDED.promotional_price_amount;`.trim();
}

function record(name) {
  checks.push(name);
  console.log(`PASS ${sanitizeForLog(name)}`);
}

function requestHeaders(api, accessToken) {
  const headers = { apikey: api.anonKey, accept: "application/json" };
  if (accessToken) headers.authorization = `Bearer ${accessToken}`;
  return headers;
}

async function selectRows(api, path, accessToken, search = {}) {
  const url = localEndpoint(api, "/rest/v1/", path, relationPathPattern);
  for (const [key, value] of Object.entries(search)) url.searchParams.set(key, value);
  const response = await fetch(url, { headers: requestHeaders(api, accessToken) });
  const body = await response.json().catch(() => null);
  return { response, body };
}

async function expectRows(api, name, path, accessToken, expected, search = {}) {
  const result = await selectRows(api, path, accessToken, search);
  if (!result.response.ok || !Array.isArray(result.body)) {
    throw new Error(`${name} expected ${expected} rows, received HTTP ${result.response.status}.`);
  }
  const rows = result.body.filter((row) => !("error" in row));
  if (rows.length !== expected) {
    throw new Error(`${name} expected ${expected} rows, received ${rows.length}.`);
  }
  record(name);
  return rows;
}

async function expectDeniedRead(api, name, path, accessToken) {
  const result = await selectRows(api, path, accessToken, { select: "id", limit: "1" });
  const deniedByGrant = result.response.status === 401 || result.response.status === 403;
  const deniedByPolicy = result.response.ok && Array.isArray(result.body) && result.body.length === 0;
  if (!deniedByGrant && !deniedByPolicy) {
    throw new Error(`${name} expected denial, received HTTP ${result.response.status}.`);
  }
  record(name);
}

async function expectDeniedWrite(api, name, path, method, filters, body, accessToken) {
  const url = localEndpoint(api, "/rest/v1/", path, relationPathPattern);
  for (const [key, value] of Object.entries(filters)) url.searchParams.set(key, value);
  const response = await fetch(url, {
    method,
    headers: { ...requestHeaders(api, accessToken), "content-type": "application/json", prefer: "return=minimal" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  if (response.status !== 401 && response.status !== 403) {
    throw new Error(`${name} expected grant denial, received HTTP ${response.status}.`);
  }
  record(name);
}

// PostgREST resolves an RPC by its exact parameter list, so every call names the full signature.
// Optional parameters are sent as explicit nulls rather than omitted.
const CONTRACT_PARAMETERS = {
  catalog_admitted_scopes: ["p_permission_key"],
  catalog_create_category: [
    "p_organization_id", "p_establishment_id", "p_branch_id", "p_parent_category_id",
    "p_name", "p_description", "p_display_order", "p_correlation_id", "p_idempotency_key",
  ],
  catalog_update_category: ["p_category_id", "p_name", "p_description", "p_display_order", "p_correlation_id", "p_idempotency_key"],
  catalog_update_variant: ["p_variant_id", "p_name", "p_archived", "p_correlation_id", "p_idempotency_key"],
  catalog_create_channel_offer: [
    "p_organization_id", "p_establishment_id", "p_branch_id", "p_sales_channel_id",
    "p_product_id", "p_product_variant_id", "p_title", "p_description",
    "p_base_price_amount", "p_base_price_currency", "p_promotional_price_amount",
    "p_correlation_id", "p_idempotency_key",
  ],
  catalog_update_channel_offer_price: ["p_offer_id", "p_base_price_amount", "p_promotional_price_amount", "p_correlation_id", "p_idempotency_key"],
  catalog_update_channel_offer_availability: ["p_offer_id", "p_availability", "p_correlation_id", "p_idempotency_key"],
  catalog_update_channel_offer_visibility: ["p_offer_id", "p_visibility", "p_correlation_id", "p_idempotency_key"],
};

function withFullSignature(fn, payload) {
  const parameters = CONTRACT_PARAMETERS[fn];
  if (!parameters) throw new Error(`No declared signature for catalog contract ${fn}.`);
  const complete = Object.fromEntries(parameters.map((name) => [name, null]));
  return { ...complete, ...payload };
}

async function callContract(api, name, fn, payload, accessToken) {
  const response = await fetch(localEndpoint(api, "/rest/v1/rpc/", fn, relationPathPattern), {
    method: "POST",
    headers: { ...requestHeaders(api, accessToken), "content-type": "application/json" },
    body: JSON.stringify(withFullSignature(fn, payload)),
  });
  const body = await response.json().catch(() => null);
  return { response, body };
}

async function expectContractAllowed(api, name, fn, payload, accessToken) {
  const result = await callContract(api, name, fn, payload, accessToken);
  if (!result.response.ok) {
    throw new Error(`${name} expected admission, received HTTP ${result.response.status} with ${JSON.stringify(result.body)}`);
  }
  record(name);
  return result.body;
}

async function expectContractRefused(api, name, fn, payload, accessToken, expectedFragment) {
  const result = await callContract(api, name, fn, payload, accessToken);
  const detail = typeof result.body === "object" && result.body !== null ? JSON.stringify(result.body) : String(result.body);
  if (result.response.ok) {
    throw new Error(`${name} expected refusal, received admission with ${detail}`);
  }
  if (!detail.includes(expectedFragment)) {
    throw new Error(`${name} expected a refusal mentioning "${expectedFragment}", received ${detail}`);
  }
  record(name);
}

async function assertAnonymousHoldsNothing(api) {
  // -------------------------------------------------------------------------
  // The anonymous client holds nothing
  // -------------------------------------------------------------------------
  await expectDeniedRead(api, "anon cannot read the canonical product table", "products", undefined);
  await expectDeniedRead(api, "anon cannot read the product category table", "product_categories", undefined);
  await expectDeniedRead(api, "anon cannot read the product variant table", "product_variants", undefined);
  await expectDeniedRead(api, "anon cannot read the sales channel table", "sales_channels", undefined);
  await expectDeniedRead(api, "anon cannot read the channel offer table", "channel_offers", undefined);
  await expectDeniedRead(api, "anon cannot read the price history table", "channel_offer_price_history", undefined);
  await expectDeniedRead(api, "anon cannot read the command receipt table", "catalog_command_receipts", undefined);
  await expectDeniedRead(api, "anon cannot read the pricing projection", "channel_offer_pricing", undefined);
  await expectDeniedRead(api, "anon cannot read the price timeline", "channel_offer_price_timeline", undefined);
  await expectContractRefused(
    api, "anon cannot invoke the admitted scope read contract", "catalog_admitted_scopes",
    { p_permission_key: "catalog.write" }, undefined, "permission denied"
  );
  await expectContractRefused(
    api, "anon cannot invoke a catalog creation contract", "catalog_create_category",
    {
      p_organization_id: tenant.organizations.a, p_name: "Unauthorized",
      p_correlation_id: randomUUID(), p_idempotency_key: randomUUID(),
    }, undefined, "permission denied"
  );
}

async function assertTenantBoundaryIsEnforced(api) {
  // -------------------------------------------------------------------------
  // Own tenant allow, foreign tenant deny, no enumeration
  // -------------------------------------------------------------------------
  // Catalog rows are archival and this fixture is reused across runs, so the assertions are scoped
  // to the fixture identifiers instead of total row counts: a growing catalog must not make the
  // tenant boundary assertions fail.
  await expectRows(api, "a tenant manager reads its own category", "product_categories", users.aManager.accessToken, 1, { select: "id", id: `eq.${tenant.categories.a}` });
  await expectRows(api, "a tenant manager reads its own product", "products", users.aManager.accessToken, 1, { select: "id", id: `eq.${tenant.products.a}` });
  await expectRows(api, "a tenant manager reads its own channel", "sales_channels", users.aManager.accessToken, 1, { select: "id", id: `eq.${tenant.channels.a}` });
  await expectRows(
    api, "a tenant manager cannot read a foreign category by substituting its identifier",
    "product_categories", users.aManager.accessToken, 0, { select: "id", id: `eq.${tenant.categories.b}` }
  );
  await expectRows(
    api, "a tenant manager cannot read a foreign product by substituting its identifier",
    "products", users.aManager.accessToken, 0, { select: "id", id: `eq.${tenant.products.b}` }
  );
  await expectRows(
    api, "a tenant manager cannot enumerate a foreign tenant filter",
    "products", users.aManager.accessToken, 0, { select: "id", organization_id: `eq.${tenant.organizations.b}` }
  );
  await expectRows(
    api, "a tenant manager never reaches the other tenant through the price timeline",
    "channel_offer_price_timeline", users.aManager.accessToken, 0, { select: "channel_offer_id", organization_id: `eq.${tenant.organizations.b}` }
  );
  await expectRows(api, "a foreign tenant manager reads its own category", "product_categories", users.bManager.accessToken, 1, { select: "id", id: `eq.${tenant.categories.b}` });
  await expectRows(
    api, "a foreign tenant manager cannot enumerate the other tenant",
    "products", users.bManager.accessToken, 0, { select: "id", organization_id: `eq.${tenant.organizations.a}` }
  );
  await expectRows(api, "a catalog reader reads the catalog it is granted", "products", users.aReader.accessToken, 1, { select: "id", id: `eq.${tenant.products.a}` });
  await expectRows(api, "a member without catalog.read sees no catalog row", "products", users.aWithout.accessToken, 0, { select: "id", id: `eq.${tenant.products.a}` });
}

async function assertMoneyCrossesTheWireAsText(api) {
  // -------------------------------------------------------------------------
  // Exact money crosses the Data API as decimal text
  // -------------------------------------------------------------------------
  // PostgREST serialises a bare numeric column as a JSON number, which a browser reads back through
  // an IEEE-754 double. The projection publishes text instead, so the admitted digits survive the
  // wire. Both halves are asserted: the raw table shows the hazard, the projection removes it.
  const raw = await selectRows(api, "channel_offers", users.aManager.accessToken, {
    select: "id,base_price_amount,promotional_price_amount,price_revision", id: `eq.${tenant.offers.a}`,
  });
  if (!raw.response.ok || !Array.isArray(raw.body) || raw.body.length !== 1) {
    throw new Error(`The raw offer row was not readable: ${JSON.stringify(raw.body)}.`);
  }
  if (typeof raw.body[0].base_price_amount !== "number") {
    throw new TypeError(`Expected the raw numeric column to arrive as a JSON number, received ${typeof raw.body[0].base_price_amount}.`);
  }
  record("the raw offer table serialises money as a JSON number, which is the hazard the projection removes");

  const pricing = await selectRows(api, "channel_offer_pricing", users.aManager.accessToken, {
    select: "id,base_price_amount,promotional_price_amount,price_revision", id: `eq.${tenant.offers.a}`,
  });
  if (!pricing.response.ok || !Array.isArray(pricing.body) || pricing.body.length !== 1) {
    throw new Error(`The pricing projection did not return the seeded offer: ${JSON.stringify(pricing.body)}.`);
  }
  const priced = pricing.body[0];
  if (typeof priced.base_price_amount !== "string" || priced.base_price_amount !== "12345.6789") {
    throw new Error(`Expected the base price as exact decimal text, received ${JSON.stringify(priced.base_price_amount)}.`);
  }
  if (typeof priced.promotional_price_amount !== "string" || priced.promotional_price_amount !== "9999.9999") {
    throw new Error(`Expected the promotional price as exact decimal text, received ${JSON.stringify(priced.promotional_price_amount)}.`);
  }
  record("the Data API returns the base price as exact decimal text, not a JSON number");
  record("the Data API returns the promotional price as exact decimal text, not a JSON number");
  record(`the seeded offer is at price revision ${priced.price_revision}`);

  const timeline = await selectRows(api, "channel_offer_price_timeline", users.aManager.accessToken, {
    select: "channel_offer_id,base_price_amount", limit: "5",
  });
  if (!timeline.response.ok || !Array.isArray(timeline.body)) {
    throw new Error(`The price timeline was not readable: ${JSON.stringify(timeline.body)}.`);
  }
  for (const row of timeline.body) {
    if (typeof row.base_price_amount !== "string") {
      throw new TypeError("The price timeline projected money as a JSON number.");
    }
  }
  record("the price timeline projects money as exact decimal text for every revision it returns");
}

async function assertDirectClientMutationIsDenied(api) {
  // -------------------------------------------------------------------------
  // Direct client mutation is denied across the whole catalog surface
  // -------------------------------------------------------------------------
  await expectDeniedWrite(api, "authenticated cannot insert a category", "product_categories", "POST", {}, { organization_id: tenant.organizations.a, name: "Unauthorized" }, users.aManager.accessToken);
  await expectDeniedWrite(api, "authenticated cannot update a category", "product_categories", "PATCH", { id: `eq.${tenant.categories.a}` }, { name: "Unauthorized" }, users.aManager.accessToken);
  await expectDeniedWrite(api, "authenticated cannot delete a category", "product_categories", "DELETE", { id: `eq.${tenant.categories.a}` }, undefined, users.aManager.accessToken);
  await expectDeniedWrite(api, "authenticated cannot insert a product", "products", "POST", {}, { organization_id: tenant.organizations.a, name: "Unauthorized" }, users.aManager.accessToken);
  await expectDeniedWrite(api, "authenticated cannot update a product", "products", "PATCH", { id: `eq.${tenant.products.a}` }, { name: "Unauthorized" }, users.aManager.accessToken);
  await expectDeniedWrite(api, "authenticated cannot delete a product", "products", "DELETE", { id: `eq.${tenant.products.a}` }, undefined, users.aManager.accessToken);
  await expectDeniedWrite(api, "authenticated cannot insert a variant", "product_variants", "POST", {}, { organization_id: tenant.organizations.a, product_id: tenant.products.a, name: "Unauthorized" }, users.aManager.accessToken);
  await expectDeniedWrite(api, "authenticated cannot insert a sales channel", "sales_channels", "POST", {}, { organization_id: tenant.organizations.a, channel_key: "unauthorized", display_name: "Unauthorized" }, users.aManager.accessToken);
  await expectDeniedWrite(api, "authenticated cannot insert a channel offer", "channel_offers", "POST", {}, { organization_id: tenant.organizations.a, sales_channel_id: tenant.channels.a, product_id: tenant.products.a, base_price_amount: "1.0000", base_price_currency: "BRL" }, users.aManager.accessToken);
  await expectDeniedWrite(api, "authenticated cannot rewrite a price", "channel_offers", "PATCH", { id: `eq.${tenant.offers.a}` }, { base_price_amount: "1.0000" }, users.aManager.accessToken);
  await expectDeniedWrite(api, "authenticated cannot delete a channel offer", "channel_offers", "DELETE", { id: `eq.${tenant.offers.a}` }, undefined, users.aManager.accessToken);
  await expectDeniedWrite(api, "authenticated cannot forge a price history row", "channel_offer_price_history", "POST", {}, { organization_id: tenant.organizations.a, channel_offer_id: tenant.offers.a, price_revision: 99, base_price_amount: "1.0000", base_price_currency: "BRL", availability: "available", visibility: "visible", effective_from: new Date().toISOString(), recorded_by_user_id: users.aManager.id, correlation_id: randomUUID(), audit_event_id: randomUUID() }, users.aManager.accessToken);
  await expectDeniedWrite(api, "authenticated cannot rewrite a price history row", "channel_offer_price_history", "PATCH", { id: `eq.${tenant.offers.a}` }, { base_price_amount: "1.0000" }, users.aManager.accessToken);
  await expectDeniedWrite(api, "authenticated cannot delete a price history row", "channel_offer_price_history", "DELETE", { id: `eq.${tenant.offers.a}` }, undefined, users.aManager.accessToken);
  await expectDeniedWrite(api, "authenticated cannot forge a command receipt", "catalog_command_receipts", "POST", {}, { organization_id: tenant.organizations.a, idempotency_key: randomUUID(), actor_user_id: users.aManager.id, correlation_id: randomUUID(), audit_event_id: randomUUID(), action: "catalog.product.created", target_type: "product", target_id: randomUUID() }, users.aManager.accessToken);
}

async function assertCommandCapabilityAndTenant(api) {
  // -------------------------------------------------------------------------
  // Commands enforce capability and tenant, and the Data API is the only path
  // -------------------------------------------------------------------------
  await expectContractAllowed(
    api, "a tenant manager holding catalog.write creates a category through the Data API", "catalog_create_category",
    {
      p_organization_id: tenant.organizations.a, p_name: `Categoria criada pela API ${runTag}`,
      p_display_order: 20, p_correlation_id: randomUUID(), p_idempotency_key: randomUUID(),
    }, users.aManager.accessToken
  );
  await expectContractRefused(
    api, "a tenant manager cannot create a category in a foreign tenant", "catalog_create_category",
    {
      p_organization_id: tenant.organizations.b, p_name: "Unauthorized",
      p_correlation_id: randomUUID(), p_idempotency_key: randomUUID(),
    }, users.aManager.accessToken, "not authorized for this catalog operation"
  );
  await expectContractRefused(
    api, "a foreign tenant manager cannot reach a category of another tenant", "catalog_update_category",
    {
      p_category_id: tenant.categories.a, p_name: "Unauthorized",
      p_correlation_id: randomUUID(), p_idempotency_key: randomUUID(),
    }, users.bManager.accessToken, "not authorized for this catalog operation"
  );
  await expectContractRefused(
    api, "a catalog reader cannot create a category", "catalog_create_category",
    {
      p_organization_id: tenant.organizations.a, p_name: "Unauthorized",
      p_correlation_id: randomUUID(), p_idempotency_key: randomUUID(),
    }, users.aReader.accessToken, "not authorized for this catalog operation"
  );
  await expectContractRefused(
    api, "a member without any catalog capability cannot create a category", "catalog_create_category",
    {
      p_organization_id: tenant.organizations.a, p_name: "Unauthorized",
      p_correlation_id: randomUUID(), p_idempotency_key: randomUUID(),
    }, users.aWithout.accessToken, "not authorized for this catalog operation"
  );
  await expectContractRefused(
    api, "a catalog reader cannot update a variant", "catalog_update_variant",
    {
      p_variant_id: tenant.variants.a, p_name: "Unauthorized variant name", p_archived: false,
      p_correlation_id: randomUUID(), p_idempotency_key: randomUUID(),
    }, users.aReader.accessToken, "not authorized for this catalog operation"
  );
  const variantResult = await expectContractAllowed(
    api, "a tenant manager holding catalog.write updates its tenant variant", "catalog_update_variant",
    {
      p_variant_id: tenant.variants.a, p_name: `Data API variant ${runTag}`, p_archived: false,
      p_correlation_id: randomUUID(), p_idempotency_key: randomUUID(),
    }, users.aManager.accessToken
  );
  if (variantResult?.action !== "catalog.variant.updated" || variantResult?.target_id !== tenant.variants.a) {
    throw new Error("The admitted variant command returned an unexpected durable result.");
  }
  record("the admitted variant command reports its action and target");
  const updatedVariant = await selectRows(api, "product_variants", users.aManager.accessToken, {
    select: "id,name,status", id: `eq.${tenant.variants.a}`,
  });
  if (
    updatedVariant.body?.length !== 1
    || updatedVariant.body[0].name !== `Data API variant ${runTag}`
    || updatedVariant.body[0].status !== "active"
  ) {
    throw new Error("The admitted variant command did not persist its tenant-scoped state.");
  }
  record("the admitted variant command persists only the requested tenant variant");
  await expectContractRefused(
    api, "a single-factor Data API session cannot reprice an offer", "catalog_update_channel_offer_price",
    {
      p_offer_id: tenant.offers.a, p_base_price_amount: "1.0000",
      p_correlation_id: randomUUID(), p_idempotency_key: randomUUID(),
    }, users.aManager.accessToken, "second authentication factor"
  );
  await expectContractRefused(
    api, "a single-factor Data API session cannot change availability", "catalog_update_channel_offer_availability",
    { p_offer_id: tenant.offers.a, p_availability: "unavailable", p_correlation_id: randomUUID(), p_idempotency_key: randomUUID() },
    users.aManager.accessToken, "second authentication factor"
  );
  await expectContractRefused(
    api, "a single-factor Data API session cannot change visibility", "catalog_update_channel_offer_visibility",
    { p_offer_id: tenant.offers.a, p_visibility: "hidden", p_correlation_id: randomUUID(), p_idempotency_key: randomUUID() },
    users.aManager.accessToken, "second authentication factor"
  );
  await expectContractRefused(
    api, "an offer naming both a product and a variant is refused before the factor is even considered",
    "catalog_create_channel_offer",
    {
      p_organization_id: tenant.organizations.a, p_sales_channel_id: tenant.channels.a,
      p_product_id: tenant.products.a, p_product_variant_id: tenant.variants.a,
      p_base_price_amount: "1.0000", p_base_price_currency: "BRL",
      p_correlation_id: randomUUID(), p_idempotency_key: randomUUID(),
    }, users.aManager.accessToken, "Invalid catalog input for target"
  );

  const unchanged = await selectRows(api, "channel_offer_pricing", users.aManager.accessToken, {
    select: "base_price_amount,price_revision", id: `eq.${tenant.offers.a}`,
  });
  if (unchanged.body?.[0]?.base_price_amount !== "12345.6789" || unchanged.body?.[0]?.price_revision !== 1) {
    throw new Error(`A refused privileged mutation changed the offer: ${JSON.stringify(unchanged.body)}.`);
  }
  record("no refused privileged mutation changed the persisted price or the revision");
}

async function assertAdmittedScopesAreTenantBound(api) {
  // -------------------------------------------------------------------------
  // The admitted scope read contract is tenant bound
  // -------------------------------------------------------------------------
  const managerScopes = await expectContractAllowed(
    api, "a tenant manager reads its own admitted write scopes", "catalog_admitted_scopes",
    { p_permission_key: "catalog.write" }, users.aManager.accessToken
  );
  if (!Array.isArray(managerScopes) || managerScopes.length !== 1 || managerScopes[0].organization_id !== tenant.organizations.a) {
    throw new Error(`Unexpected admitted scopes for a tenant manager: ${JSON.stringify(managerScopes)}.`);
  }
  if (typeof managerScopes[0].organization_name !== "string" || managerScopes[0].organization_name.length === 0) {
    throw new Error("The admitted scope carries no organization name to show the operator.");
  }
  record("the admitted scope is the calling tenant, and it carries a display name");

  const readerWriteScopes = await callContract(
    api, "read scopes", "catalog_admitted_scopes", { p_permission_key: "catalog.write" }, users.aReader.accessToken
  );
  if (!readerWriteScopes.response.ok || (readerWriteScopes.body?.length ?? 0) !== 0) {
    throw new Error("A catalog reader must not be admitted any write scope.");
  }
  record("catalog.read alone admits no write scope");

  const withoutScopes = await callContract(
    api, "no capability scopes", "catalog_admitted_scopes", { p_permission_key: "catalog.read" }, users.aWithout.accessToken
  );
  if (!withoutScopes.response.ok || (withoutScopes.body?.length ?? 0) !== 0) {
    throw new Error("A member without a catalog capability must not be admitted any scope.");
  }
  record("an active membership without a catalog capability admits no scope");

  const foreignScopes = await callContract(
    api, "foreign scopes", "catalog_admitted_scopes", { p_permission_key: "catalog.write" }, users.bManager.accessToken
  );
  if (!foreignScopes.response.ok || foreignScopes.body?.[0]?.organization_id !== tenant.organizations.b) {
    throw new Error(`A foreign manager must only ever see its own scopes: ${JSON.stringify(foreignScopes.body)}.`);
  }
  record("a foreign manager sees only its own admitted scopes");
}

async function assertReplayIsRecognised(api) {
  // -------------------------------------------------------------------------
  // Replay is recognised over the wire
  // -------------------------------------------------------------------------
  const replayKey = randomUUID();
  const replayPayload = {
    p_organization_id: tenant.organizations.a, p_name: `Categoria idempotente ${runTag}`,
    p_display_order: 30, p_correlation_id: randomUUID(), p_idempotency_key: replayKey,
  };
  await expectContractAllowed(api, "a keyed category command is applied once", "catalog_create_category", replayPayload, users.aManager.accessToken);
  const replayed = await expectContractAllowed(api, "the same keyed command is recognised as a replay", "catalog_create_category", replayPayload, users.aManager.accessToken);
  if (replayed?.replayed !== true) {
    throw new Error(`A repeated keyed command was not reported as a replay: ${JSON.stringify(replayed)}.`);
  }
  // Key ownership is only meaningful between two sessions that both hold the capability, so the
  // peer here is a second manager rather than a reader.
  await expectContractRefused(
    api, "a repeated key submitted without the capability is refused", "catalog_create_category",
    { ...replayPayload, p_correlation_id: randomUUID() }, users.aReader.accessToken,
    "not authorized for this catalog operation"
  );
}

async function run() {
  const api = await getLocalApi();

  users.aManager = await ensureAuthenticatedUser(api, "tenant-a-manager");
  users.aReader = await ensureAuthenticatedUser(api, "tenant-a-reader");
  users.aWithout = await ensureAuthenticatedUser(api, "tenant-a-without-capability");
  users.bManager = await ensureAuthenticatedUser(api, "tenant-b-manager");

  await executeFixtureSql(fixtureSql());

  await assertAnonymousHoldsNothing(api);
  await assertTenantBoundaryIsEnforced(api);
  await assertMoneyCrossesTheWireAsText(api);
  await assertDirectClientMutationIsDenied(api);
  await assertCommandCapabilityAndTenant(api);
  await assertAdmittedScopesAreTenantBound(api);
  await assertReplayIsRecognised(api);

  console.log(`Catalog Auth/Data API integration passed ${checks.length} checks using synthetic local users.`);
}

// No teardown is attempted, by design. Catalog rows, command receipts and durable audit events
// refuse hard deletion by construction, and an identity that ran a contract is pinned by its
// receipt. A local `supabase db reset` returns the stack to a clean state.
let failure;
try {
  await run();
} catch (error) {
  failure = error;
}

if (failure) {
  console.error(sanitizeForLog(failure instanceof Error ? failure.message : "Catalog Auth/Data API integration failed."));
  process.exitCode = 1;
}
