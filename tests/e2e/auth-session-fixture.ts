import { randomBytes, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import path from "node:path";

type LocalApi = { apiUrl: string; anonKey: string };
type SyntheticUser = { id: string; email: string; password: string };

export type AuthSessionFixture = {
  apiUrl: string;
  anonKey: string;
  authorizedUser: SyntheticUser;
  noMembershipUser: SyntheticUser;
  suspendedUser: SyntheticUser;
  organizationName: string;
  secondaryOrganizationName: string;
  foreignOrganizationName: string;
  suspendMembership(): Promise<void>;
  cleanup(): Promise<void>;
};

const root = process.cwd();
const supabaseCli = path.join(root, "node_modules", "supabase", "dist", "supabase.js");
const localUrl = /^http:\/\/(127\.0\.0\.1|localhost|\[::1\])(?::\d+)?$/;
const permissionKey = "tenant.hierarchy.read";

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
      else reject(new Error(`Local Supabase command failed (${signal || `exit ${code}`}). ${sanitize(stderr || stdout)}`));
    });
  });
}

function sanitize(value: string) {
  return value
    .replace(/("(?:SERVICE_ROLE_KEY|SECRET_KEY|DB_URL|JWT_SECRET|ANON_KEY|PUBLISHABLE_KEY)"\s*:\s*")[^"]*(")/gi, "$1[redacted]$2")
    .replace(/\b(?:SERVICE_ROLE_KEY|SECRET_KEY|DB_URL|JWT_SECRET|ANON_KEY|PUBLISHABLE_KEY)=\S+/gi, "[redacted]")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(-3)
    .join(" ")
    .slice(0, 400);
}

async function getLocalApi(): Promise<LocalApi> {
  const status = JSON.parse(await runSupabase(["status", "--output", "json"])) as Record<string, string>;
  const apiUrl = status.API_URL ?? status.api_url ?? "";
  const anonKey = status.ANON_KEY ?? status.anon_key ?? "";
  if (!localUrl.test(apiUrl) || !anonKey) throw new Error("Local Supabase Auth fixtures require a loopback API and public anon key.");
  return { apiUrl, anonKey };
}

async function createUser(api: LocalApi, label: string, data: Record<string, unknown> = {}): Promise<SyntheticUser> {
  const email = `gmz-impl-004-${label}-${randomUUID()}@example.invalid`;
  const password = `T-${randomBytes(24).toString("base64url")}a9!`;
  const response = await fetch(`${api.apiUrl}/auth/v1/signup`, {
    method: "POST",
    headers: { apikey: api.anonKey, authorization: `Bearer ${api.anonKey}`, "content-type": "application/json" },
    body: JSON.stringify({ email, password, data }),
  });
  const body = await response.json().catch(() => ({})) as { user?: { id?: string }; id?: string };
  if (!response.ok) throw new Error(`Local synthetic Auth signup failed with HTTP ${response.status}.`);
  const id = body.user?.id ?? body.id;
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) throw new Error("Local Auth did not return a valid synthetic identity.");
  return { id, email, password };
}

async function executeSql(sql: string) {
  for (const statement of sql.split(";").map((part) => part.trim()).filter(Boolean)) {
    await runSupabase(["db", "query", "--local", statement]);
  }
}

export async function createAuthSessionFixture(): Promise<AuthSessionFixture> {
  const api = await getLocalApi();
  const ids = {
    organization: randomUUID(),
    secondaryOrganization: randomUUID(),
    foreignOrganization: randomUUID(),
    establishment: randomUUID(),
    branch: randomUUID(),
    role: randomUUID(),
    secondaryRole: randomUUID(),
    authorizedMembership: randomUUID(),
    secondaryMembership: randomUUID(),
    suspendedMembership: randomUUID(),
    authorizedAssignment: randomUUID(),
    secondaryAssignment: randomUUID(),
    suspendedAssignment: randomUUID(),
  };
  const organizationName = `GMZ-IMPL-004 tenant ${randomUUID()}`;
  const secondaryOrganizationName = `GMZ-IMPL-004 second tenant ${randomUUID()}`;
  const foreignOrganizationName = `GMZ-IMPL-004 foreign ${randomUUID()}`;
  const users: SyntheticUser[] = [];

  const cleanup = async () => {
    const userIds = users.map(({ id }) => `'${id}'`).join(", ") || "NULL";
    await executeSql(`DELETE FROM auth.users WHERE id IN (${userIds});
DELETE FROM public.tenant_roles WHERE organization_id IN ('${ids.organization}', '${ids.foreignOrganization}');
DELETE FROM public.tenant_roles WHERE organization_id = '${ids.secondaryOrganization}';
DELETE FROM public.branches WHERE organization_id IN ('${ids.organization}', '${ids.secondaryOrganization}', '${ids.foreignOrganization}');
DELETE FROM public.establishments WHERE organization_id IN ('${ids.organization}', '${ids.secondaryOrganization}', '${ids.foreignOrganization}');
DELETE FROM public.organizations WHERE id IN ('${ids.organization}', '${ids.secondaryOrganization}', '${ids.foreignOrganization}');`);
  };

  try {
    const authorizedUser = await createUser(api, "authorized");
    users.push(authorizedUser);
    const noMembershipUser = await createUser(api, "no-membership", {
      organization_id: ids.organization,
      role: "owner",
      permissions: [permissionKey],
    });
    users.push(noMembershipUser);
    const suspendedUser = await createUser(api, "suspended");
    users.push(suspendedUser);

    await executeSql(`INSERT INTO public.organizations (id, display_name) VALUES
  ('${ids.organization}', '${organizationName}'), ('${ids.secondaryOrganization}', '${secondaryOrganizationName}'), ('${ids.foreignOrganization}', '${foreignOrganizationName}');
INSERT INTO public.establishments (id, organization_id, display_name) VALUES
  ('${ids.establishment}', '${ids.organization}', 'GMZ-IMPL-004 test establishment');
INSERT INTO public.branches (id, organization_id, establishment_id, display_name) VALUES
  ('${ids.branch}', '${ids.organization}', '${ids.establishment}', 'GMZ-IMPL-004 test branch');
INSERT INTO public.tenant_roles (id, organization_id, role_key, display_name) VALUES
  ('${ids.role}', '${ids.organization}', 'gmz004-e2e-reader', 'GMZ-IMPL-004 E2E reader'),
  ('${ids.secondaryRole}', '${ids.secondaryOrganization}', 'gmz004-e2e-reader', 'GMZ-IMPL-004 second E2E reader');
INSERT INTO public.role_permissions (organization_id, role_id, permission_key) VALUES
  ('${ids.organization}', '${ids.role}', '${permissionKey}'),
  ('${ids.secondaryOrganization}', '${ids.secondaryRole}', '${permissionKey}');
INSERT INTO public.organization_memberships (id, organization_id, user_id, status) VALUES
  ('${ids.authorizedMembership}', '${ids.organization}', '${authorizedUser.id}', 'active'),
  ('${ids.secondaryMembership}', '${ids.secondaryOrganization}', '${authorizedUser.id}', 'active'),
  ('${ids.suspendedMembership}', '${ids.organization}', '${suspendedUser.id}', 'active');
INSERT INTO public.membership_roles (id, organization_id, membership_id, role_id, scope_type) VALUES
  ('${ids.authorizedAssignment}', '${ids.organization}', '${ids.authorizedMembership}', '${ids.role}', 'organization'),
  ('${ids.secondaryAssignment}', '${ids.secondaryOrganization}', '${ids.secondaryMembership}', '${ids.secondaryRole}', 'organization'),
  ('${ids.suspendedAssignment}', '${ids.organization}', '${ids.suspendedMembership}', '${ids.role}', 'organization');`);

    return {
      apiUrl: api.apiUrl,
      anonKey: api.anonKey,
      authorizedUser,
      noMembershipUser,
      suspendedUser,
      organizationName,
      secondaryOrganizationName,
      foreignOrganizationName,
      async suspendMembership() {
        await executeSql(`UPDATE public.organization_memberships SET status = 'suspended' WHERE id = '${ids.suspendedMembership}';`);
      },
      cleanup,
    };
  } catch (error) {
    await cleanup().catch(() => undefined);
    throw error;
  }
}
