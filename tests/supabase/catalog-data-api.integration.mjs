import { randomBytes, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { assertPasswordGrantIdentity } from "./password-grant-identity.mjs";

const repositoryRoot = fileURLToPath(new URL("../../", import.meta.url));
const supabaseCli = resolve(repositoryRoot, "node_modules/supabase/dist/supabase.js");
const apiUrlPattern = /^https?:\/\/(127\.0\.0\.1|localhost|\[::1\])(?::\d+)?$/;
const workdir = process.env.GOODZ_SUPABASE_WORKDIR?.trim();
const createdUserIds = new Set();
const checks = [];
const ids = {
  organizations: { a: randomUUID(), b: randomUUID() },
  establishments: { a: randomUUID(), b: randomUUID() },
  branches: { a1: randomUUID(), a2: randomUUID(), b1: randomUUID() },
  roles: { ownerA: randomUUID(), staffA: randomUUID(), branchA: randomUUID(), ownerB: randomUUID() },
  memberships: { ownerA: randomUUID(), staffA: randomUUID(), branchA: randomUUID(), ownerB: randomUUID() },
  assignments: { ownerA: randomUUID(), staffA: randomUUID(), branchA: randomUUID(), ownerB: randomUUID() },
};

function record(label) {
  checks.push(label);
  console.log(`PASS ${label}`);
}

function sanitizeCliOutput(stdout, stderr) {
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

function runSupabase(args) {
  return new Promise((resolveRun, rejectRun) => {
    const scopedArgs = ["--workdir", resolve(workdir), ...args];
    const child = spawn(process.execPath, [supabaseCli, ...scopedArgs], {
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
      else rejectRun(new Error(`Local Supabase CLI failed (${signal || `exit ${code}`}). ${sanitizeCliOutput(stdout, stderr)}`));
    });
  });
}

async function getLocalApi() {
  if (!workdir || !basename(resolve(workdir)).toLowerCase().startsWith("goodz-menu-gmz-impl-007-local-")) {
    throw new Error("Catalog integration requires the dedicated disposable GMZ-IMPL-007 local Supabase workdir.");
  }
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
  const config = await readFile(resolve(repositoryRoot, "supabase/config.toml"), "utf8");
  const apiSection = config.split(/^\[api\]\s*$/m)[1]?.split(/^\[/m)[0] || "";
  const exposedSchemas = apiSection.match(/^schemas\s*=\s*\[[^\]]*\]/m)?.[0] || "";
  if (/\bprivate\b/i.test(exposedSchemas)) {
    throw new Error("Private catalog helpers must remain outside exposed Data API schemas.");
  }
  record("Data API exposes no private authorization schema");
  return { apiUrl, anonKey };
}

function assertUuid(value, label) {
  if (typeof value !== "string" || !/^[0-9a-f-]{36}$/i.test(value)) {
    throw new Error(`${label} did not return an opaque UUID.`);
  }
  return value;
}

async function createUser(api, label) {
  const email = `gmz-impl-007-catalog-${label}-${randomUUID()}@example.invalid`;
  const password = `T-${randomBytes(24).toString("base64url")}a9!`;
  const headers = { apikey: api.anonKey, authorization: `Bearer ${api.anonKey}`, "content-type": "application/json" };
  const signup = await fetch(`${api.apiUrl}/auth/v1/signup`, {
    method: "POST", headers, body: JSON.stringify({ email, password }),
  });
  const signupBody = await signup.json().catch(() => ({}));
  if (!signup.ok) throw new Error(`Synthetic local Auth signup failed with HTTP ${signup.status}.`);
  const identity = signupBody.user || signupBody;
  const id = assertUuid(identity.id, "Local Auth signup");
  createdUserIds.add(id);
  const tokenResponse = await fetch(`${api.apiUrl}/auth/v1/token?grant_type=password`, {
    method: "POST", headers, body: JSON.stringify({ email, password }),
  });
  const tokenBody = await tokenResponse.json().catch(() => ({}));
  if (!tokenResponse.ok || !tokenBody.access_token) {
    throw new Error(`Synthetic local Auth password-token flow failed with HTTP ${tokenResponse.status}.`);
  }
  assertPasswordGrantIdentity(tokenBody, identity);
  record(`${label} password-grant subject matches signup identity`);
  return { id, accessToken: tokenBody.access_token };
}

function fixtureSql(users) {
  const o = ids.organizations;
  const e = ids.establishments;
  const b = ids.branches;
  const r = ids.roles;
  const m = ids.memberships;
  const a = ids.assignments;
  return [
    `INSERT INTO public.organizations (id, display_name) VALUES ('${o.a}', 'GMZ-IMPL-007 catalog integration A'), ('${o.b}', 'GMZ-IMPL-007 catalog integration B')`,
    `INSERT INTO public.establishments (id, organization_id, display_name) VALUES ('${e.a}', '${o.a}', 'Catalog integration establishment A'), ('${e.b}', '${o.b}', 'Catalog integration establishment B')`,
    `INSERT INTO public.branches (id, organization_id, establishment_id, display_name) VALUES ('${b.a1}', '${o.a}', '${e.a}', 'Catalog integration branch A1'), ('${b.a2}', '${o.a}', '${e.a}', 'Catalog integration branch A2'), ('${b.b1}', '${o.b}', '${e.b}', 'Catalog integration branch B1')`,
    `INSERT INTO public.tenant_roles (id, organization_id, role_key, display_name) VALUES ('${r.ownerA}', '${o.a}', 'owner', 'Catalog integration owner A'), ('${r.staffA}', '${o.a}', 'staff', 'Catalog integration staff A'), ('${r.branchA}', '${o.a}', 'catalog-branch-${r.branchA.slice(0, 8)}', 'Catalog integration branch A'), ('${r.ownerB}', '${o.b}', 'owner', 'Catalog integration owner B')`,
    `INSERT INTO public.role_permissions (organization_id, role_id, permission_key) VALUES ('${o.a}', '${r.branchA}', 'catalog.read'), ('${o.a}', '${r.branchA}', 'catalog.write')`,
    `INSERT INTO public.organization_memberships (id, organization_id, user_id, status, default_establishment_id, default_branch_id) VALUES ('${m.ownerA}', '${o.a}', '${users.ownerA.id}', 'active', NULL, NULL), ('${m.staffA}', '${o.a}', '${users.staffA.id}', 'active', NULL, NULL), ('${m.branchA}', '${o.a}', '${users.branchA.id}', 'active', '${e.a}', '${b.a1}'), ('${m.ownerB}', '${o.b}', '${users.ownerB.id}', 'active', NULL, NULL)`,
    `INSERT INTO public.membership_roles (id, organization_id, membership_id, role_id, scope_type, establishment_id, branch_id) VALUES ('${a.ownerA}', '${o.a}', '${m.ownerA}', '${r.ownerA}', 'organization', NULL, NULL), ('${a.staffA}', '${o.a}', '${m.staffA}', '${r.staffA}', 'organization', NULL, NULL), ('${a.branchA}', '${o.a}', '${m.branchA}', '${r.branchA}', 'branch', '${e.a}', '${b.a1}'), ('${a.ownerB}', '${o.b}', '${m.ownerB}', '${r.ownerB}', 'organization', NULL, NULL)`,
  ];
}

async function runSql(statements) {
  for (const statement of statements) await runSupabase(["db", "query", "--local", statement]);
}

async function queryRows(api, table, select, filters, accessToken) {
  const url = new URL(`${api.apiUrl}/rest/v1/${table}`);
  url.searchParams.set("select", select);
  for (const [column, filter] of Object.entries(filters)) url.searchParams.set(column, filter);
  const response = await fetch(url, {
    headers: {
      apikey: api.anonKey,
      authorization: `Bearer ${accessToken || api.anonKey}`,
      accept: "application/json",
    },
  });
  const body = await response.json().catch(() => null);
  return { response, rows: Array.isArray(body) ? body : null };
}

async function rpc(api, name, args, accessToken) {
  const response = await fetch(`${api.apiUrl}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: {
      apikey: api.anonKey,
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify(args),
  });
  const value = await response.json().catch(() => null);
  return { response, value };
}

async function expectRpcId(api, name, args, user, label) {
  const result = await rpc(api, name, args, user.accessToken);
  if (!result.response.ok) throw new Error(`${label} failed with HTTP ${result.response.status}.`);
  record(label);
  return assertUuid(result.value, label);
}

async function expectRpcDenied(api, name, args, user, label) {
  const result = await rpc(api, name, args, user.accessToken);
  if (result.response.ok || result.response.status < 400) {
    throw new Error(`${label} was unexpectedly accepted.`);
  }
  record(label);
}

function correlationId() { return randomUUID(); }

async function run() {
  const api = await getLocalApi();
  const users = {
    ownerA: await createUser(api, "owner-a"),
    staffA: await createUser(api, "staff-a"),
    branchA: await createUser(api, "branch-a"),
    ownerB: await createUser(api, "owner-b"),
  };
  for (const id of [...Object.values(ids.organizations), ...Object.values(ids.establishments), ...Object.values(ids.branches), ...Object.values(ids.roles), ...Object.values(ids.memberships), ...Object.values(ids.assignments), ...Object.values(users).map(({ id: userId }) => userId)]) {
    assertUuid(id, "Generated fixture");
  }
  await runSql(fixtureSql(users));
  record("synthetic tenant and scoped membership fixtures created in the disposable local database");

  const orgA = ids.organizations.a;
  const orgB = ids.organizations.b;
  const channelResult = await queryRows(api, "sales_channels", "id,channel_key", {
    organization_id: `eq.${orgA}`, channel_key: "eq.goodz_online", status: "eq.active",
  }, users.ownerA.accessToken);
  if (!channelResult.response.ok || channelResult.rows?.length !== 1) {
    throw new Error("Owner could not resolve the organization's active default channel.");
  }
  const channelId = assertUuid(channelResult.rows[0].id, "Default channel lookup");
  record("owner reads only the tenant's active default channel");

  const categoryCorrelation = correlationId();
  const categoryId = await expectRpcId(api, "catalog_save_category", {
    p_id: null, p_organization_id: orgA, p_parent_id: null,
    p_name: "Catalog API integration", p_description: "Synthetic category fixture",
    p_status: "active", p_correlation_id: categoryCorrelation,
  }, users.ownerA, "authenticated owner creates a catalog category through the RPC contract");
  const categoryResult = await queryRows(api, "product_categories", "id,name,description", {
    id: `eq.${categoryId}`, organization_id: `eq.${orgA}`,
  }, users.ownerA.accessToken);
  if (!categoryResult.response.ok || categoryResult.rows?.length !== 1 || categoryResult.rows[0].name !== "Catalog API integration") {
    throw new Error("Created category did not round-trip through its tenant Data API read.");
  }
  record("owner reads the category created by the authenticated command");

  const foreignCategoryId = await expectRpcId(api, "catalog_save_category", {
    p_id: null, p_organization_id: orgB, p_parent_id: null,
    p_name: "Foreign tenant category", p_description: "Synthetic foreign tenant fixture",
    p_status: "active", p_correlation_id: correlationId(),
  }, users.ownerB, "foreign owner creates a separate tenant category");
  const foreignCategoryRead = await queryRows(api, "product_categories", "id", {
    id: `eq.${foreignCategoryId}`, organization_id: `eq.${orgB}`,
  }, users.ownerA.accessToken);
  if (!foreignCategoryRead.response.ok || foreignCategoryRead.rows?.length !== 0) {
    throw new Error("Owner A read a foreign category by ID substitution.");
  }
  record("organization owner cannot read a foreign category by ID substitution");
  await expectRpcDenied(api, "catalog_save_category", {
    p_id: null, p_organization_id: orgA, p_parent_id: foreignCategoryId,
    p_name: "Invalid foreign child", p_description: "Cross-tenant parent must fail closed",
    p_status: "active", p_correlation_id: correlationId(),
  }, users.ownerA, "catalog command rejects a foreign-tenant category parent");

  const staffCategoryId = await expectRpcId(api, "catalog_save_category", {
    p_id: null, p_organization_id: orgA, p_parent_id: categoryId,
    p_name: "Staff metadata category", p_description: "Staff may manage ordinary catalog metadata",
    p_status: "active", p_correlation_id: correlationId(),
  }, users.staffA, "staff creates a child category with ordinary catalog.write permission");

  const productCorrelation = correlationId();
  const productId = await expectRpcId(api, "catalog_save_product", {
    p_id: null, p_organization_id: orgA, p_category_id: staffCategoryId,
    p_name: "Canonical product name", p_description: "Canonical text-first product description",
    p_status: "active", p_correlation_id: productCorrelation,
  }, users.ownerA, "owner creates a canonical product independent of channel presentation");
  const editedDescription = "Updated canonical description remains product-owned";
  await expectRpcId(api, "catalog_save_product", {
    p_id: productId, p_organization_id: orgA, p_category_id: staffCategoryId,
    p_name: "Canonical product name", p_description: editedDescription,
    p_status: "active", p_correlation_id: correlationId(),
  }, users.staffA, "staff updates canonical product text without privileged commercial permissions");

  const variantId = await expectRpcId(api, "catalog_save_variant", {
    p_id: null, p_organization_id: orgA, p_product_id: productId,
    p_name: "Large", p_size_label: "Large", p_flavor_label: "Vanilla",
    p_status: "active", p_correlation_id: correlationId(),
  }, users.staffA, "staff creates a text-only product variant through the RPC contract");

  const offerArgs = (branchId, title) => ({
    p_id: null, p_organization_id: orgA, p_establishment_id: ids.establishments.a,
    p_branch_id: branchId, p_sales_channel_id: channelId, p_target_kind: "product",
    p_product_id: productId, p_variant_id: null, p_title_override: title,
    p_description_override: "Channel presentation must not replace canonical text",
    p_base_price: null, p_currency: "BRL", p_availability_state: "unknown",
    p_is_visible: false, p_status: "active", p_step_up_proof_id: null,
    p_correlation_id: correlationId(),
  });
  const offerA1Id = await expectRpcId(api, "catalog_save_offer", offerArgs(ids.branches.a1, "Branch A1 presentation"), users.ownerA, "owner creates an unavailable branch offer draft");
  const variantOfferArgs = {
    ...offerArgs(ids.branches.a2, "Branch A2 variant presentation"),
    p_target_kind: "variant", p_product_id: null, p_variant_id: variantId,
  };
  const offerA2Id = await expectRpcId(api, "catalog_save_offer", variantOfferArgs, users.ownerA, "owner creates a sibling-branch offer for the text-only variant");

  const productRead = await queryRows(api, "products", "id,name,description", {
    id: `eq.${productId}`, organization_id: `eq.${orgA}`,
  }, users.ownerA.accessToken);
  const offerRead = await queryRows(api, "channel_offers", "id,branch_id,title_override,description_override,base_price,availability_state,is_visible", {
    id: `eq.${offerA1Id}`, organization_id: `eq.${orgA}`,
  }, users.ownerA.accessToken);
  if (!productRead.response.ok || productRead.rows?.length !== 1
    || productRead.rows[0].name !== "Canonical product name"
    || productRead.rows[0].description !== editedDescription
    || !offerRead.response.ok || offerRead.rows?.length !== 1
    || offerRead.rows[0].description_override === productRead.rows[0].description
    || offerRead.rows[0].base_price !== null
    || offerRead.rows[0].availability_state !== "unknown"
    || offerRead.rows[0].is_visible !== false) {
    throw new Error("Canonical product and channel-offer presentation/commercial state did not remain independent.");
  }
  record("canonical product text round-trips independently from its offer presentation and unavailable draft state");

  const branchRows = await queryRows(api, "channel_offers", "id,branch_id", {
    organization_id: `eq.${orgA}`, product_id: `eq.${productId}`,
  }, users.branchA.accessToken);
  if (!branchRows.response.ok || branchRows.rows?.length !== 1 || branchRows.rows[0].id !== offerA1Id || branchRows.rows[0].branch_id !== ids.branches.a1) {
    throw new Error("Branch-scoped membership could not read exactly its assigned branch offer.");
  }
  record("branch-scoped catalog.read returns the assigned branch offer only");

  const siblingRead = await queryRows(api, "channel_offers", "id", {
    id: `eq.${offerA2Id}`, organization_id: `eq.${orgA}`,
  }, users.branchA.accessToken);
  if (!siblingRead.response.ok || siblingRead.rows?.length !== 0) {
    throw new Error("Branch-scoped member read a sibling branch offer.");
  }
  record("branch-scoped member cannot read a sibling branch offer by ID");

  const foreignRead = await queryRows(api, "channel_offers", "id", {
    id: `eq.${offerA1Id}`, organization_id: `eq.${orgA}`,
  }, users.ownerB.accessToken);
  if (!foreignRead.response.ok || foreignRead.rows?.length !== 0) {
    throw new Error("Foreign tenant read another organization's offer by ID substitution.");
  }
  record("foreign organization cannot read an offer by ID substitution");

  const forgedOfferResponse = await fetch(`${api.apiUrl}/rest/v1/channel_offers`, {
    method: "POST",
    headers: {
      apikey: api.anonKey, authorization: `Bearer ${users.ownerA.accessToken}`,
      "content-type": "application/json", prefer: "return=representation",
    },
    body: JSON.stringify({
      organization_id: orgA, sales_channel_id: channelId, target_kind: "product",
      product_id: productId, availability_state: "unknown", is_visible: false,
    }),
  });
  if (forgedOfferResponse.ok) throw new Error("Direct ordinary-client INSERT into channel_offers unexpectedly succeeded.");
  record("direct authenticated Data API INSERT cannot bypass catalog command authorization");

  const staffPriceAttempt = await rpc(api, "catalog_save_offer", {
    p_id: offerA1Id, p_organization_id: orgA, p_establishment_id: ids.establishments.a,
    p_branch_id: ids.branches.a1, p_sales_channel_id: channelId, p_target_kind: "product",
    p_product_id: productId, p_variant_id: null, p_title_override: "Branch A1 presentation",
    p_description_override: "Channel presentation must not replace canonical text",
    p_base_price: 15.5, p_currency: "BRL", p_availability_state: "available",
    p_is_visible: false, p_status: "active", p_step_up_proof_id: null,
    p_correlation_id: correlationId(),
  }, users.branchA.accessToken);
  if (staffPriceAttempt.response.ok) throw new Error("Branch staff without price permission changed commercial offer fields.");
  record("branch staff without price.write cannot change offer price");

  const ownerWithoutStepUp = await rpc(api, "catalog_save_offer", {
    p_id: offerA1Id, p_organization_id: orgA, p_establishment_id: ids.establishments.a,
    p_branch_id: ids.branches.a1, p_sales_channel_id: channelId, p_target_kind: "product",
    p_product_id: productId, p_variant_id: null, p_title_override: "Branch A1 presentation",
    p_description_override: "Channel presentation must not replace canonical text",
    p_base_price: 15.5, p_currency: "BRL", p_availability_state: "available",
    p_is_visible: false, p_status: "active", p_step_up_proof_id: null,
    p_correlation_id: correlationId(),
  }, users.ownerA.accessToken);
  if (ownerWithoutStepUp.response.ok) throw new Error("Organization owner changed commercial fields without a fresh step-up proof.");
  record("owner with commercial permission still requires an Admin Guard step-up proof");

  const unchanged = await queryRows(api, "channel_offers", "base_price,availability_state,is_visible", {
    id: `eq.${offerA1Id}`, organization_id: `eq.${orgA}`,
  }, users.ownerA.accessToken);
  if (!unchanged.response.ok || unchanged.rows?.length !== 1
    || unchanged.rows[0].base_price !== null
    || unchanged.rows[0].availability_state !== "unknown"
    || unchanged.rows[0].is_visible !== false) {
    throw new Error("Rejected privileged mutations changed offer commercial state.");
  }
  record("denied privileged mutation leaves price, availability and visibility unchanged");

  const auditQuery = await runSupabase(["db", "query", "--local", "--output", "json",
    `select count(*)::integer as n from public.audit_events where organization_id='${orgA}' and correlation_id='${categoryCorrelation}' and actor_user_id='${users.ownerA.id}' and action='catalog.category.created' and target_id='${categoryId}'`]);
  const jsonStart = auditQuery.stdout.indexOf("{");
  const jsonEnd = auditQuery.stdout.lastIndexOf("}");
  const auditJson = jsonStart >= 0 && jsonEnd >= jsonStart ? JSON.parse(auditQuery.stdout.slice(jsonStart, jsonEnd + 1)) : null;
  if (auditJson?.rows?.[0]?.n !== 1) throw new Error("Catalog command did not persist exactly attributable audit evidence.");
  record("catalog command persists one durable event with actor, target and correlation");
}

let failure;
try {
  await run();
} catch (error) {
  failure = error;
} finally {
  if (createdUserIds.size > 0) {
    try {
      await runSupabase(["db", "reset", "--local"]);
      record("dedicated local Supabase database reset removes synthetic auth, tenant and immutable audit fixtures");
    } catch {
      if (!failure) failure = new Error("Disposable local Supabase reset after catalog integration failed; do not reuse its fixtures until reset succeeds.");
      else console.error("Disposable local Supabase reset after catalog integration failed; do not reuse its fixtures until reset succeeds.");
    }
  }
}

if (failure) {
  console.error(failure instanceof Error ? failure.message : "Catalog Data API integration failed.");
  process.exitCode = 1;
} else {
  console.log(`Catalog Data API integration passed ${checks.length} checks with synthetic local identities.`);
}
