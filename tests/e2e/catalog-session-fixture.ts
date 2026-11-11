import { randomBytes, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import path from "node:path";
import { parseLocalSupabaseStatus } from "../../scripts/parse-local-supabase-status.mjs";

type LocalApi = { apiUrl: string; anonKey: string };
type SyntheticUser = { id: string; email: string; password: string };

export type CatalogSessionFixture = {
  apiUrl: string;
  anonKey: string;
  owner: SyntheticUser;
  branchStaff: SyntheticUser;
  organizationId: string;
  organizationName: string;
  establishmentId: string;
  branchId: string;
  siblingBranchId: string;
  inspectCommercialAudit(correlationId: string): Promise<unknown[]>;
  inspectPriceHistory(offerId: string): Promise<unknown[]>;
  cleanup(): Promise<void>;
};

const repositoryRoot = process.cwd();
const supabaseCli = path.join(repositoryRoot, "node_modules", "supabase", "dist", "supabase.js");
const loopbackUrl = /^http:\/\/(127\.0\.0\.1|localhost|\[::1\])(?::\d+)?$/;
const supabaseWorkdir = (() => {
  const requestedWorkdir = process.env.GOODZ_SUPABASE_WORKDIR?.trim();
  if (!requestedWorkdir || !path.basename(path.resolve(requestedWorkdir)).toLowerCase().startsWith("goodz-menu-gmz-impl-007-local-")) {
    throw new Error("Catalog E2E requires the dedicated disposable GMZ-IMPL-007 local Supabase workdir.");
  }
  return path.resolve(requestedWorkdir);
})();

function runSupabase(args: string[]): Promise<string> {
  return new Promise((resolveRun, reject) => {
    const child = spawn(process.execPath, [
      supabaseCli, "--workdir", supabaseWorkdir, ...args,
    ], { cwd: repositoryRoot, stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8").on("data", (chunk: string) => { stdout += chunk; });
    child.stderr.setEncoding("utf8").on("data", (chunk: string) => { stderr += chunk; });
    child.once("error", reject);
    child.once("close", (code, signal) => {
      if (code === 0) resolveRun(stdout);
      else reject(new Error(`Scoped local Supabase command failed (${signal || `exit ${code}`}). ${sanitize(`${stderr}\n${stdout}`)}`));
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
  if (!loopbackUrl.test(apiUrl) || !anonKey) {
    throw new Error("Catalog E2E requires a loopback API and public anon key from the bound local Supabase stack.");
  }
  return { apiUrl, anonKey };
}

async function createUser(api: LocalApi, label: string): Promise<SyntheticUser> {
  const email = `gmz-impl-007-catalog-e2e-${label}-${randomUUID()}@example.invalid`;
  const password = `T-${randomBytes(24).toString("base64url")}a9!`;
  const response = await fetch(`${api.apiUrl}/auth/v1/signup`, {
    method: "POST",
    headers: { apikey: api.anonKey, authorization: `Bearer ${api.anonKey}`, "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const body = await response.json().catch(() => ({})) as { user?: { id?: string }; id?: string };
  if (!response.ok) throw new Error(`Catalog E2E synthetic Auth signup failed with HTTP ${response.status}.`);
  const id = body.user?.id ?? body.id;
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) throw new Error("Catalog E2E local Auth identity is invalid.");
  return { id, email, password };
}

async function executeSql(sql: string) {
  for (const statement of sql.split(";").map((part) => part.trim()).filter(Boolean)) {
    await runSupabase(["db", "query", "--local", statement]);
  }
}

async function queryJson(sql: string): Promise<unknown[]> {
  const output = await runSupabase(["db", "query", "--local", "--output-format", "json", sql]);
  const jsonStart = output.search(/[[{]/);
  if (jsonStart < 0) throw new Error("Catalog E2E local database returned no readable JSON evidence.");
  let result: unknown;
  try {
    result = JSON.parse(output.slice(jsonStart));
  } catch {
    throw new Error("Catalog E2E local database returned malformed JSON evidence.");
  }
  const rows = Array.isArray(result) ? result : (result as { rows?: unknown[] } | null)?.rows;
  if (!Array.isArray(rows)) throw new Error("Catalog E2E local database returned an unexpected result shape.");
  return rows;
}

export async function createCatalogSessionFixture(): Promise<CatalogSessionFixture> {
  const api = await getLocalApi();
  const organizationId = randomUUID();
  const establishmentId = randomUUID();
  const branchId = randomUUID();
  const siblingBranchId = randomUUID();
  const ownerRoleId = randomUUID();
  const branchRoleId = randomUUID();
  const ownerMembershipId = randomUUID();
  const staffMembershipId = randomUUID();
  const ownerAssignmentId = randomUUID();
  const staffAssignmentId = randomUUID();
  const organizationName = `GMZ-IMPL-007 catalog E2E ${randomUUID()}`;
  let owner: SyntheticUser | null = null;
  let branchStaff: SyntheticUser | null = null;

  try {
    owner = await createUser(api, "owner");
    branchStaff = await createUser(api, "branch-staff");
    await executeSql(`INSERT INTO public.organizations (id, display_name) VALUES ('${organizationId}', '${organizationName}');
INSERT INTO public.establishments (id, organization_id, display_name) VALUES ('${establishmentId}', '${organizationId}', 'Catalog E2E establishment');
INSERT INTO public.branches (id, organization_id, establishment_id, display_name) VALUES
  ('${branchId}', '${organizationId}', '${establishmentId}', 'Catalog E2E branch'),
  ('${siblingBranchId}', '${organizationId}', '${establishmentId}', 'Catalog E2E sibling branch');
INSERT INTO public.tenant_roles (id, organization_id, role_key, display_name) VALUES
  ('${ownerRoleId}', '${organizationId}', 'owner', 'Catalog E2E owner'),
  ('${branchRoleId}', '${organizationId}', 'catalog-e2e-${branchRoleId.slice(0, 8)}', 'Catalog E2E branch staff');
INSERT INTO public.role_permissions (organization_id, role_id, permission_key) VALUES
  ('${organizationId}', '${ownerRoleId}', 'tenant.hierarchy.read'),
  ('${organizationId}', '${branchRoleId}', 'tenant.hierarchy.read'),
  ('${organizationId}', '${branchRoleId}', 'catalog.read'),
  ('${organizationId}', '${branchRoleId}', 'catalog.write');
INSERT INTO public.organization_memberships (id, organization_id, user_id, status, default_establishment_id, default_branch_id) VALUES
  ('${ownerMembershipId}', '${organizationId}', '${owner.id}', 'active', '${establishmentId}', '${branchId}'),
  ('${staffMembershipId}', '${organizationId}', '${branchStaff.id}', 'active', '${establishmentId}', '${branchId}');
INSERT INTO public.membership_roles (id, organization_id, membership_id, role_id, scope_type, establishment_id, branch_id) VALUES
  ('${ownerAssignmentId}', '${organizationId}', '${ownerMembershipId}', '${ownerRoleId}', 'organization', NULL, NULL),
  ('${staffAssignmentId}', '${organizationId}', '${staffMembershipId}', '${branchRoleId}', 'branch', '${establishmentId}', '${branchId}');`);
  } catch (error) {
    if (owner || branchStaff) {
      const userIds = [owner?.id, branchStaff?.id].filter(Boolean).map((id) => `'${id}'`).join(", ") || "NULL";
      await executeSql(`DELETE FROM auth.users WHERE id IN (${userIds})`).catch(() => undefined);
    }
    throw error;
  }

  return {
    apiUrl: api.apiUrl,
    anonKey: api.anonKey,
    owner,
    branchStaff,
    organizationId,
    organizationName,
    establishmentId,
    branchId,
    siblingBranchId,
    async inspectCommercialAudit(correlationId) {
      if (!/^[0-9a-f-]{36}$/i.test(correlationId)) return [];
      const rows = await queryJson(`SELECT coalesce(json_agg(json_build_object(
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
) ORDER BY action), '[]'::json) AS events
FROM public.audit_events
WHERE organization_id = '${organizationId}' AND correlation_id = '${correlationId}';`);
      const result = rows[0] as { events?: unknown } | undefined;
      if (Array.isArray(result?.events)) return result.events;
      if (typeof result?.events === "string") {
        try {
          const parsed: unknown = JSON.parse(result.events);
          return Array.isArray(parsed) ? parsed : [];
        } catch { return []; }
      }
      return [];
    },
    async inspectPriceHistory(offerId) {
      if (!/^[0-9a-f-]{36}$/i.test(offerId)) return [];
      const rows = await queryJson(`SELECT coalesce(json_agg(json_build_object(
  'version', version,
  'amount', amount,
  'currency', currency,
  'actor_user_id', actor_user_id,
  'correlation_id', correlation_id
) ORDER BY version), '[]'::json) AS history
FROM public.channel_offer_price_history
WHERE organization_id = '${organizationId}' AND channel_offer_id = '${offerId}';`);
      const result = rows[0] as { history?: unknown } | undefined;
      if (Array.isArray(result?.history)) return result.history;
      if (typeof result?.history === "string") {
        try {
          const parsed: unknown = JSON.parse(result.history);
          return Array.isArray(parsed) ? parsed : [];
        } catch { return []; }
      }
      return [];
    },
    async cleanup() {
      const userIds = [owner?.id, branchStaff?.id].filter(Boolean).map((id) => `'${id}'`).join(", ") || "NULL";
      await executeSql(`DELETE FROM auth.users u WHERE u.id IN (${userIds})
  AND NOT EXISTS (SELECT 1 FROM public.audit_events ae WHERE ae.actor_user_id = u.id)
  AND NOT EXISTS (SELECT 1 FROM public.channel_offer_price_history ph WHERE ph.actor_user_id = u.id);
DELETE FROM public.tenant_roles WHERE organization_id = '${organizationId}';
DELETE FROM public.sales_channels c WHERE c.organization_id = '${organizationId}'
  AND NOT EXISTS (SELECT 1 FROM public.channel_offers o
    WHERE o.organization_id = c.organization_id AND o.sales_channel_id = c.id)
  AND NOT EXISTS (SELECT 1 FROM public.audit_events ae WHERE ae.target_id = c.id);
DELETE FROM public.branches b WHERE b.organization_id = '${organizationId}'
  AND NOT EXISTS (SELECT 1 FROM public.audit_events ae WHERE ae.branch_id = b.id OR ae.target_id = b.id);
DELETE FROM public.establishments e WHERE e.id = '${establishmentId}'
  AND NOT EXISTS (SELECT 1 FROM public.audit_events ae WHERE ae.establishment_id = e.id)
  AND NOT EXISTS (SELECT 1 FROM public.branches b WHERE b.establishment_id = e.id);
DELETE FROM public.organizations o WHERE o.id = '${organizationId}'
  AND NOT EXISTS (SELECT 1 FROM public.audit_events ae WHERE ae.organization_id = o.id)
  AND NOT EXISTS (SELECT 1 FROM public.establishments e WHERE e.organization_id = o.id)
  AND NOT EXISTS (SELECT 1 FROM public.sales_channels c WHERE c.organization_id = o.id);`);
    },
  };
}
