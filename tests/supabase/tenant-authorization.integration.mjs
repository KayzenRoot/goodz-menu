import { randomBytes, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = fileURLToPath(new URL("../../", import.meta.url));
const supabaseCli = resolve(repositoryRoot, "node_modules/supabase/dist/supabase.js");
const apiUrlPattern = /^https?:\/\/(127\.0\.0\.1|localhost|\[::1\])(?::\d+)?$/;
const permissionKey = "tenant.hierarchy.read";
const checks = [];
const users = {};
const createdUserIds = new Set();
const fixture = {
  organizations: { a: randomUUID(), b: randomUUID() },
  establishments: { a1: randomUUID(), a2: randomUUID(), b1: randomUUID() },
  branches: { a11: randomUUID(), a12: randomUUID(), a21: randomUUID(), b11: randomUUID() },
  roles: { organization: randomUUID(), branch: randomUUID(), empty: randomUUID(), foreign: randomUUID() },
  memberships: {
    organization: randomUUID(), branch: randomUUID(), empty: randomUUID(),
    suspended: randomUUID(), revoked: randomUUID(), foreign: randomUUID(),
  },
  membershipRoles: Array.from({ length: 7 }, () => randomUUID()),
};

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
    throw new Error("Auth integration refuses a non-local SUPABASE_URL.");
  }

  const { stdout } = await runSupabase(["status", "--output", "json"]);
  const status = JSON.parse(stdout);
  const apiUrl = configuredUrl || status.API_URL || status.api_url;
  const anonKey = process.env.SUPABASE_ANON_KEY || status.ANON_KEY || status.anon_key;
  if (!apiUrlPattern.test(apiUrl || "") || !anonKey) {
    throw new Error("Local Supabase URL or anon key is unavailable; remote endpoints are not permitted.");
  }

  const supabaseConfig = await readFile(resolve(repositoryRoot, "supabase/config.toml"), "utf8");
  const apiSection = supabaseConfig.split(/^\[api\]\s*$/m)[1]?.split(/^\[/m)[0] || "";
  const exposedSchemas = apiSection.match(/^schemas\s*=\s*\[[^\]]*\]/m)?.[0] || "";
  if (/\bprivate\b/i.test(exposedSchemas)) {
    throw new Error("Private authorization helpers must remain outside exposed Data API schemas.");
  }
  record("private authorization helper schema is not exposed through the Data API");

  return { apiUrl, anonKey };
}

async function createAuthenticatedUser(api, label, data = {}) {
  const email = `gmz-impl-003-${label}-${randomUUID()}@example.invalid`;
  const password = `T-${randomBytes(24).toString("base64url")}a9!`;
  const signupResponse = await fetch(`${api.apiUrl}/auth/v1/signup`, {
    method: "POST",
    headers: {
      apikey: api.anonKey,
      authorization: `Bearer ${api.anonKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ email, password, data }),
  });
  const signupBody = await signupResponse.json().catch(() => ({}));
  if (!signupResponse.ok) {
    throw new Error(`Local synthetic Auth signup failed with HTTP ${signupResponse.status}.`);
  }

  const identity = signupBody.user || signupBody;
  if (!identity.id || !/^[0-9a-f-]{36}$/i.test(identity.id)) {
    throw new Error("Local Auth did not return a valid synthetic identity.");
  }
  createdUserIds.add(identity.id);

  const tokenResponse = await fetch(`${api.apiUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: api.anonKey,
      authorization: `Bearer ${api.anonKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });
  const tokenBody = await tokenResponse.json().catch(() => ({}));
  if (!tokenResponse.ok || !tokenBody.access_token) {
    throw new Error(`Local synthetic Auth password-token flow failed with HTTP ${tokenResponse.status}.`);
  }

  return { id: identity.id, accessToken: tokenBody.access_token };
}

function assertLocalIds() {
  for (const value of [
    ...Object.values(fixture.organizations), ...Object.values(fixture.establishments),
    ...Object.values(fixture.branches), ...Object.values(fixture.roles),
    ...Object.values(fixture.memberships), ...fixture.membershipRoles,
    ...Object.values(users).map((user) => user.id),
  ]) {
    if (!/^[0-9a-f-]{36}$/i.test(value)) throw new Error("Generated test fixture identifier is invalid.");
  }
}

function executeFixtureSql(sql) {
  const statements = sql.split(";").map((statement) => statement.trim()).filter(Boolean);
  return statements.reduce(
    (pending, statement) => pending.then(() => runSupabase(["db", "query", "--local", statement])),
    Promise.resolve(),
  );
}

function fixtureSetupSql() {
  const org = fixture.organizations;
  const est = fixture.establishments;
  const branch = fixture.branches;
  const role = fixture.roles;
  const membership = fixture.memberships;
  const mr = fixture.membershipRoles;
  const user = Object.fromEntries(Object.entries(users).map(([key, value]) => [key, value.id]));
  return `INSERT INTO public.organizations (id, display_name) VALUES
  ('${org.a}', 'GMZ-IMPL-003 synthetic organization A'), ('${org.b}', 'GMZ-IMPL-003 synthetic organization B');
INSERT INTO public.establishments (id, organization_id, display_name) VALUES
  ('${est.a1}', '${org.a}', 'Synthetic establishment A1'), ('${est.a2}', '${org.a}', 'Synthetic establishment A2'), ('${est.b1}', '${org.b}', 'Synthetic establishment B1');
INSERT INTO public.branches (id, organization_id, establishment_id, display_name) VALUES
  ('${branch.a11}', '${org.a}', '${est.a1}', 'Synthetic branch A1-1'),
  ('${branch.a12}', '${org.a}', '${est.a1}', 'Synthetic branch A1-2'),
  ('${branch.a21}', '${org.a}', '${est.a2}', 'Synthetic branch A2-1'),
  ('${branch.b11}', '${org.b}', '${est.b1}', 'Synthetic branch B1-1');
INSERT INTO public.tenant_roles (id, organization_id, role_key, display_name) VALUES
  ('${role.organization}', '${org.a}', 'gmz003-organization-reader', 'Synthetic organization reader'),
  ('${role.branch}', '${org.a}', 'gmz003-branch-reader', 'Synthetic branch reader'),
  ('${role.empty}', '${org.a}', 'gmz003-no-permission', 'Synthetic role without permission'),
  ('${role.foreign}', '${org.b}', 'gmz003-foreign-reader', 'Synthetic foreign reader');
INSERT INTO public.role_permissions (organization_id, role_id, permission_key) VALUES
  ('${org.a}', '${role.organization}', '${permissionKey}'),
  ('${org.a}', '${role.branch}', '${permissionKey}'),
  ('${org.b}', '${role.foreign}', '${permissionKey}');
INSERT INTO public.organization_memberships (
  id, organization_id, user_id, status, default_establishment_id, default_branch_id
) VALUES
  ('${membership.organization}', '${org.a}', '${user.organization}', 'active', NULL, NULL),
  ('${membership.branch}', '${org.a}', '${user.branch}', 'active', '${est.a1}', '${branch.a11}'),
  ('${membership.empty}', '${org.a}', '${user.noPermission}', 'active', NULL, NULL),
  ('${membership.suspended}', '${org.a}', '${user.suspended}', 'active', NULL, NULL),
  ('${membership.revoked}', '${org.a}', '${user.revoked}', 'active', NULL, NULL),
  ('${membership.foreign}', '${org.b}', '${user.foreign}', 'active', NULL, NULL);
INSERT INTO public.membership_roles (
  id, organization_id, membership_id, role_id, scope_type, establishment_id, branch_id
) VALUES
  ('${mr[0]}', '${org.a}', '${membership.organization}', '${role.organization}', 'organization', NULL, NULL),
  ('${mr[1]}', '${org.a}', '${membership.branch}', '${role.branch}', 'branch', '${est.a1}', '${branch.a11}'),
  ('${mr[2]}', '${org.a}', '${membership.empty}', '${role.empty}', 'organization', NULL, NULL),
  ('${mr[3]}', '${org.a}', '${membership.suspended}', '${role.organization}', 'organization', NULL, NULL),
  ('${mr[4]}', '${org.a}', '${membership.revoked}', '${role.organization}', 'organization', NULL, NULL),
  ('${mr[5]}', '${org.b}', '${membership.foreign}', '${role.foreign}', 'organization', NULL, NULL);`;
}

function fixtureCleanupSql() {
  const userIds = [...createdUserIds].map((id) => `'${id}'`).join(", ") || "NULL";
  const orgIds = Object.values(fixture.organizations).map((id) => `'${id}'`).join(", ");
  return `DELETE FROM auth.users WHERE id IN (${userIds});
DELETE FROM public.tenant_roles WHERE organization_id IN (${orgIds});
DELETE FROM public.branches WHERE organization_id IN (${orgIds});
DELETE FROM public.establishments WHERE organization_id IN (${orgIds});
DELETE FROM public.organizations WHERE id IN (${orgIds});`;
}

function record(name) {
  checks.push(name);
  console.log(`PASS ${name}`);
}

async function rows(api, table, filters, accessToken) {
  const url = new URL(`${api.apiUrl}/rest/v1/${table}`);
  url.searchParams.set("select", "id");
  for (const [column, value] of Object.entries(filters)) url.searchParams.set(column, `eq.${value}`);
  const headers = { apikey: api.anonKey, accept: "application/json" };
  if (accessToken) headers.authorization = `Bearer ${accessToken}`;
  const response = await fetch(url, { headers });
  const body = await response.json().catch(() => null);
  return { response, body };
}

async function expectCount(api, name, table, filters, accessToken, expected) {
  const result = await rows(api, table, filters, accessToken);
  if (!result.response.ok || !Array.isArray(result.body) || result.body.length !== expected) {
    throw new Error(`${name} expected ${expected} rows, received HTTP ${result.response.status} with ${Array.isArray(result.body) ? result.body.length : "non-row response"}.`);
  }
  record(name);
}

async function expectDeniedRead(api, name, table, filters, accessToken) {
  const result = await rows(api, table, filters, accessToken);
  const deniedByGrant = result.response.status === 401 || result.response.status === 403;
  const deniedByRls = result.response.ok && Array.isArray(result.body) && result.body.length === 0;
  if (!deniedByGrant && !deniedByRls) {
    throw new Error(`${name} expected denial, received HTTP ${result.response.status}.`);
  }
  record(name);
}

async function expectDeniedWrite(api, name, table, method, filters, body, accessToken) {
  const url = new URL(`${api.apiUrl}/rest/v1/${table}`);
  for (const [column, value] of Object.entries(filters)) url.searchParams.set(column, `eq.${value}`);
  const response = await fetch(url, {
    method,
    headers: {
      apikey: api.anonKey,
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
      "content-profile": "public",
      prefer: "return=minimal",
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  if (response.status !== 401 && response.status !== 403) {
    throw new Error(`${name} expected grant denial, received HTTP ${response.status}.`);
  }
  record(name);
}

async function setMembershipStatus(api, membershipId, status) {
  const revokedAt = status === "revoked" ? "now()" : "NULL";
  await executeFixtureSql(`UPDATE public.organization_memberships SET status = '${status}', revoked_at = ${revokedAt} WHERE id = '${membershipId}';`);
}

async function run() {
  const api = await getLocalApi();
  const orgA = fixture.organizations.a;
  const orgB = fixture.organizations.b;

  users.organization = await createAuthenticatedUser(api, "organization-reader");
  users.branch = await createAuthenticatedUser(api, "branch-reader");
  users.noMembership = await createAuthenticatedUser(api, "no-membership", {
    organization_id: orgA,
    role: "owner",
    permissions: [permissionKey],
  });
  users.noPermission = await createAuthenticatedUser(api, "no-permission");
  users.suspended = await createAuthenticatedUser(api, "suspended");
  users.revoked = await createAuthenticatedUser(api, "revoked");
  users.foreign = await createAuthenticatedUser(api, "foreign-tenant");
  assertLocalIds();
  await executeFixtureSql(fixtureSetupSql());

  await expectDeniedRead(api, "anon cannot enumerate organizations", "organizations", { id: orgA });
  await expectDeniedRead(api, "anon cannot enumerate establishments", "establishments", { organization_id: orgA });
  await expectDeniedRead(api, "anon cannot enumerate branches", "branches", { organization_id: orgA });
  await expectCount(api, "organization role reads its organization", "organizations", { id: orgA }, users.organization.accessToken, 1);
  await expectDeniedRead(api, "organization role cannot read a foreign organization", "organizations", { id: orgB }, users.organization.accessToken);
  await expectCount(api, "organization role reads its establishments", "establishments", { organization_id: orgA }, users.organization.accessToken, 2);
  await expectCount(api, "organization role reads its descendant branches", "branches", { organization_id: orgA }, users.organization.accessToken, 3);
  await expectDeniedRead(api, "user metadata cannot grant organization access", "organizations", { id: orgA }, users.noMembership.accessToken);
  await expectDeniedRead(api, "active membership without permission is denied", "organizations", { id: orgA }, users.noPermission.accessToken);

  await expectCount(api, "branch role reads parent organization context", "organizations", { id: orgA }, users.branch.accessToken, 1);
  await expectCount(api, "branch role reads its containing establishment", "establishments", { id: fixture.establishments.a1 }, users.branch.accessToken, 1);
  await expectDeniedRead(api, "branch role cannot read a sibling establishment", "establishments", { id: fixture.establishments.a2 }, users.branch.accessToken);
  await expectCount(api, "branch role reads its assigned branch", "branches", { id: fixture.branches.a11 }, users.branch.accessToken, 1);
  await expectDeniedRead(api, "branch role cannot enumerate sibling branches", "branches", { id: fixture.branches.a12 }, users.branch.accessToken);
  await expectDeniedRead(api, "branch role cannot read another establishment branch", "branches", { id: fixture.branches.a21 }, users.branch.accessToken);
  await expectDeniedRead(api, "branch role cannot substitute a foreign branch", "branches", { id: fixture.branches.b11 }, users.branch.accessToken);

  await expectCount(api, "suspension control starts authorized", "organizations", { id: orgA }, users.suspended.accessToken, 1);
  await setMembershipStatus(api, fixture.memberships.suspended, "suspended");
  await expectDeniedRead(api, "suspended membership is denied on the next request", "organizations", { id: orgA }, users.suspended.accessToken);
  await expectCount(api, "revocation control starts authorized", "organizations", { id: orgA }, users.revoked.accessToken, 1);
  await setMembershipStatus(api, fixture.memberships.revoked, "revoked");
  await expectDeniedRead(api, "revoked membership is denied on the next request", "organizations", { id: orgA }, users.revoked.accessToken);

  await expectCount(api, "foreign tenant positive control reads its own organization", "organizations", { id: orgB }, users.foreign.accessToken, 1);
  await expectDeniedRead(api, "foreign tenant cannot read another organization", "organizations", { id: orgA }, users.foreign.accessToken);
  await expectDeniedRead(api, "membership table is not exposed to signed-in users", "organization_memberships", { organization_id: orgA }, users.organization.accessToken);

  await expectDeniedWrite(api, "authenticated cannot insert membership", "organization_memberships", "POST", {}, { organization_id: orgA, user_id: users.organization.id, status: "active" }, users.organization.accessToken);
  await expectDeniedWrite(api, "authenticated cannot update membership", "organization_memberships", "PATCH", { id: fixture.memberships.organization }, { status: "suspended" }, users.organization.accessToken);
  await expectDeniedWrite(api, "authenticated cannot delete membership", "organization_memberships", "DELETE", { id: fixture.memberships.organization }, undefined, users.organization.accessToken);
  await expectDeniedWrite(api, "authenticated cannot create tenant roles", "tenant_roles", "POST", {}, { organization_id: orgA, role_key: "unauthorized", display_name: "Unauthorized" }, users.organization.accessToken);
  await expectDeniedWrite(api, "authenticated cannot mutate permissions", "permissions", "PATCH", { permission_key: permissionKey }, { display_name: "Unauthorized" }, users.organization.accessToken);
  await expectDeniedWrite(api, "authenticated cannot assign role permissions", "role_permissions", "POST", {}, { organization_id: orgA, role_id: fixture.roles.empty, permission_key: permissionKey }, users.organization.accessToken);
  await expectDeniedWrite(api, "authenticated cannot self-assign a role", "membership_roles", "POST", {}, { organization_id: orgA, membership_id: fixture.memberships.empty, role_id: fixture.roles.organization, scope_type: "organization" }, users.organization.accessToken);
  await expectDeniedWrite(api, "authenticated cannot insert organizations", "organizations", "POST", {}, { display_name: "Unauthorized" }, users.organization.accessToken);
  await expectDeniedWrite(api, "authenticated cannot update establishments", "establishments", "PATCH", { id: fixture.establishments.a1 }, { display_name: "Unauthorized" }, users.organization.accessToken);
  await expectDeniedWrite(api, "authenticated cannot delete branches", "branches", "DELETE", { id: fixture.branches.a11 }, undefined, users.organization.accessToken);

  console.log(`Auth/Data API integration passed ${checks.length} checks using synthetic local users.`);
}

let failure;
try {
  await run();
} catch (error) {
  failure = error;
} finally {
  if (createdUserIds.size > 0) {
    try {
      await executeFixtureSql(fixtureCleanupSql());
    } catch (error) {
      if (!failure) failure = error;
      else console.error("Synthetic local fixture cleanup failed; reset the local database before reuse.");
    }
  }
}

if (failure) {
  console.error(failure instanceof Error ? failure.message : "Auth/Data API integration failed.");
  process.exitCode = 1;
}
