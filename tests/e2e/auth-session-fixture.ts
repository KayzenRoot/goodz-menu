import { randomBytes, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import path from "node:path";
import { parseLocalSupabaseStatus } from "../../scripts/parse-local-supabase-status.mjs";

type LocalApi = { apiUrl: string; anonKey: string };
type SyntheticUser = { id: string; email: string; password: string };

export type AuthSessionFixture = {
  apiUrl: string;
  anonKey: string;
  authorizedUser: SyntheticUser;
  cancellationUser: SyntheticUser;
  noMembershipUser: SyntheticUser;
  noPermissionUser: SyntheticUser;
  suspendedUser: SyntheticUser;
  organizationId: string;
  establishmentId: string;
  branchId: string;
  siblingBranchId: string;
  organizationName: string;
  secondaryOrganizationName: string;
  foreignOrganizationName: string;
  suspendMembership(): Promise<void>;
  restoreMembership(): Promise<void>;
  suspendAuthorizedMembership(): Promise<void>;
  revokeMembership(): Promise<void>;
  removeHierarchyPermission(): Promise<void>;
  restoreHierarchyPermission(): Promise<void>;
  scopeAuthorizedRoleToBranch(): Promise<void>;
  restoreAuthorizedOrganizationScope(): Promise<void>;
  inspectAdminGuardAudit(correlationId: string): Promise<{
    event_count: number;
    event: Record<string, unknown> | null;
  } | null>;
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
      else {
        const reason = signal || `exit ${code}`;
        reject(new Error(`Local Supabase command failed (${reason}). ${sanitize(`${stderr}\n${stdout}`)}`));
      }
    });
  });
}

function sanitize(value: string) {
  return value
    .replace(/("(?:SERVICE_ROLE_KEY|SECRET_KEY|DB_URL|JWT_SECRET|ANON_KEY|PUBLISHABLE_KEY)"\s*:\s*")[^"]*(")/gi, "$1[redacted]$2")
    .replace(/\b(?:SERVICE_ROLE_KEY|SECRET_KEY|DB_URL|JWT_SECRET|ANON_KEY|PUBLISHABLE_KEY)=\S+/gi, "[redacted]")
    .replace(/\bBearer\s+\S+/gi, "Bearer [redacted]")
    .replace(/\b(?:password|access_token|refresh_token|totp_secret|totp_code)\s*[:=]\s*[\"']?[^\s,;\"']+/gi, "[credential redacted]")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(-3)
    .join(" ")
    .slice(0, 400);
}

async function getLocalApi(): Promise<LocalApi> {
  const status = parseLocalSupabaseStatus(await runSupabase(["status", "--output", "json"]));
  const apiUrlValue = status.API_URL ?? status.api_url;
  const anonKeyValue = status.ANON_KEY ?? status.anon_key;
  const apiUrl = typeof apiUrlValue === "string" ? apiUrlValue : "";
  const anonKey = typeof anonKeyValue === "string" ? anonKeyValue : "";
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
  // The CLI accepts one prepared statement per request; fixture mutations depend on this order.
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
    siblingBranch: randomUUID(),
    role: randomUUID(),
    secondaryRole: randomUUID(),
    authorizedMembership: randomUUID(),
    secondaryMembership: randomUUID(),
    suspendedMembership: randomUUID(),
    noPermissionMembership: randomUUID(),
    authorizedAssignment: randomUUID(),
    secondaryAssignment: randomUUID(),
    suspendedAssignment: randomUUID(),
    noPermissionAssignment: randomUUID(),
    noPermissionRole: randomUUID(),
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
DELETE FROM public.branches b
WHERE b.organization_id IN ('${ids.organization}', '${ids.secondaryOrganization}', '${ids.foreignOrganization}')
  AND NOT EXISTS (SELECT 1 FROM public.audit_events ae WHERE ae.branch_id = b.id OR ae.target_id = b.id);
DELETE FROM public.establishments e
WHERE e.organization_id IN ('${ids.organization}', '${ids.secondaryOrganization}', '${ids.foreignOrganization}')
  AND NOT EXISTS (SELECT 1 FROM public.audit_events ae WHERE ae.establishment_id = e.id)
  AND NOT EXISTS (SELECT 1 FROM public.branches b WHERE b.establishment_id = e.id);
DELETE FROM public.organizations o
WHERE o.id IN ('${ids.organization}', '${ids.secondaryOrganization}', '${ids.foreignOrganization}')
  AND NOT EXISTS (SELECT 1 FROM public.audit_events ae WHERE ae.organization_id = o.id)
  AND NOT EXISTS (SELECT 1 FROM public.establishments e WHERE e.organization_id = o.id);`);
  };

  try {
    const authorizedUser = await createUser(api, "authorized");
    users.push(authorizedUser);
    const cancellationUser = await createUser(api, "enrollment-cancel");
    users.push(cancellationUser);
    const noMembershipUser = await createUser(api, "no-membership", {
      tenant_id: ids.organization,
      organization_id: ids.organization,
      org_id: ids.organization,
      role: "owner",
      permissions: [permissionKey],
      aal: "aal2",
      privilege: "platform_admin",
      is_admin: true,
    });
    users.push(noMembershipUser);
    const noPermissionUser = await createUser(api, "no-permission");
    users.push(noPermissionUser);
    const suspendedUser = await createUser(api, "suspended");
    users.push(suspendedUser);

    await executeSql(`INSERT INTO public.organizations (id, display_name) VALUES
  ('${ids.organization}', '${organizationName}'), ('${ids.secondaryOrganization}', '${secondaryOrganizationName}'), ('${ids.foreignOrganization}', '${foreignOrganizationName}');
INSERT INTO public.establishments (id, organization_id, display_name) VALUES
  ('${ids.establishment}', '${ids.organization}', 'GMZ-IMPL-004 test establishment');
INSERT INTO public.branches (id, organization_id, establishment_id, display_name) VALUES
  ('${ids.branch}', '${ids.organization}', '${ids.establishment}', 'GMZ-IMPL-004 test branch'),
  ('${ids.siblingBranch}', '${ids.organization}', '${ids.establishment}', 'GMZ-IMPL-004 sibling branch');
INSERT INTO public.tenant_roles (id, organization_id, role_key, display_name) VALUES
  ('${ids.role}', '${ids.organization}', 'gmz004-e2e-reader', 'GMZ-IMPL-004 E2E reader'),
  ('${ids.noPermissionRole}', '${ids.organization}', 'gmz004-e2e-empty', 'GMZ-IMPL-004 E2E role without access'),
  ('${ids.secondaryRole}', '${ids.secondaryOrganization}', 'gmz004-e2e-reader', 'GMZ-IMPL-004 second E2E reader');
INSERT INTO public.role_permissions (organization_id, role_id, permission_key) VALUES
  ('${ids.organization}', '${ids.role}', '${permissionKey}'),
  ('${ids.secondaryOrganization}', '${ids.secondaryRole}', '${permissionKey}');
INSERT INTO public.organization_memberships (id, organization_id, user_id, status) VALUES
  ('${ids.authorizedMembership}', '${ids.organization}', '${authorizedUser.id}', 'active'),
  ('${ids.secondaryMembership}', '${ids.secondaryOrganization}', '${authorizedUser.id}', 'active'),
  ('${ids.suspendedMembership}', '${ids.organization}', '${suspendedUser.id}', 'active'),
  ('${ids.noPermissionMembership}', '${ids.organization}', '${noPermissionUser.id}', 'active');
INSERT INTO public.membership_roles (id, organization_id, membership_id, role_id, scope_type) VALUES
  ('${ids.authorizedAssignment}', '${ids.organization}', '${ids.authorizedMembership}', '${ids.role}', 'organization'),
  ('${ids.secondaryAssignment}', '${ids.secondaryOrganization}', '${ids.secondaryMembership}', '${ids.secondaryRole}', 'organization'),
  ('${ids.suspendedAssignment}', '${ids.organization}', '${ids.suspendedMembership}', '${ids.role}', 'organization'),
  ('${ids.noPermissionAssignment}', '${ids.organization}', '${ids.noPermissionMembership}', '${ids.noPermissionRole}', 'organization');`);

    return {
      apiUrl: api.apiUrl,
      anonKey: api.anonKey,
      authorizedUser,
      cancellationUser,
      noMembershipUser,
      noPermissionUser,
      suspendedUser,
      organizationId: ids.organization,
      establishmentId: ids.establishment,
      branchId: ids.branch,
      siblingBranchId: ids.siblingBranch,
      organizationName,
      secondaryOrganizationName,
      foreignOrganizationName,
      async suspendMembership() {
        await executeSql(`UPDATE public.organization_memberships SET status = 'suspended' WHERE id = '${ids.suspendedMembership}';`);
      },
      async suspendAuthorizedMembership() {
        await executeSql(`UPDATE public.organization_memberships SET status = 'suspended', revoked_at = NULL WHERE id = '${ids.authorizedMembership}';`);
      },
      async restoreMembership() {
        await executeSql(`UPDATE public.organization_memberships SET status = 'active', revoked_at = NULL WHERE id = '${ids.authorizedMembership}';`);
      },
      async revokeMembership() {
        await executeSql(`UPDATE public.organization_memberships SET status = 'revoked', revoked_at = now() WHERE id = '${ids.authorizedMembership}';`);
      },
      async removeHierarchyPermission() {
        await executeSql(`DELETE FROM public.role_permissions WHERE organization_id = '${ids.organization}' AND role_id = '${ids.role}' AND permission_key = '${permissionKey}';`);
      },
      async restoreHierarchyPermission() {
        await executeSql(`INSERT INTO public.role_permissions (organization_id, role_id, permission_key) VALUES ('${ids.organization}', '${ids.role}', '${permissionKey}') ON CONFLICT DO NOTHING;`);
      },
      async scopeAuthorizedRoleToBranch() {
        await executeSql(`UPDATE public.membership_roles SET scope_type = 'branch', establishment_id = '${ids.establishment}', branch_id = '${ids.branch}' WHERE id = '${ids.authorizedAssignment}';`);
      },
      async restoreAuthorizedOrganizationScope() {
        await executeSql(`UPDATE public.membership_roles SET scope_type = 'organization', establishment_id = NULL, branch_id = NULL WHERE id = '${ids.authorizedAssignment}';`);
      },
      async inspectAdminGuardAudit(correlationId) {
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(correlationId)) return null;
        const output = await runSupabase([
          "db", "query", "--local", "--output-format", "json",
          `SELECT count(*)::integer AS event_count,
  (array_agg(jsonb_build_object(
    'actor_user_id', actor_user_id,
    'organization_id', organization_id,
    'establishment_id', establishment_id,
    'branch_id', branch_id,
    'action', action,
    'target_type', target_type,
    'target_id', target_id,
    'outcome', outcome,
    'reason_code', reason_code,
    'correlation_id', correlation_id,
    'source', source,
    'metadata', metadata
  )))[1] AS event
FROM public.audit_events
WHERE correlation_id = '${correlationId}';`,
        ]);
        const jsonStart = output.search(/[[{]/);
        if (jsonStart < 0) throw new Error("A leitura local da trilha de auditoria não retornou um resultado legível.");
        let result: unknown;
        try {
          result = JSON.parse(output.slice(jsonStart));
        } catch {
          throw new Error("A leitura local da trilha de auditoria retornou um resultado malformado.");
        }
        const rows = Array.isArray(result) ? result : (result as { rows?: unknown } | null)?.rows;
        if (!Array.isArray(rows)) throw new Error("A leitura local da trilha de auditoria retornou um formato inesperado.");
        const row = rows[0] as { event_count?: unknown; event?: unknown } | undefined;
        if (typeof row?.event_count !== "number") throw new Error("A leitura local da trilha de auditoria retornou um formato inesperado.");
        return { event_count: row.event_count, event: (row.event ?? null) as Record<string, unknown> | null };
      },
      cleanup,
    };
  } catch (error) {
    await cleanup().catch(() => undefined);
    throw error;
  }
}
