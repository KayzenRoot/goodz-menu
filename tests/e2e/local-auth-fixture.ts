import { randomBytes, randomUUID } from "node:crypto";
import { parseLocalSupabaseStatus } from "../../scripts/parse-local-supabase-status.mjs";

export type LocalApi = { apiUrl: string; anonKey: string };
export type SyntheticUser = { id: string; email: string; password: string };

const loopbackUrl = /^http:\/\/(127\.0\.0\.1|localhost|\[::1\])(?::\d+)?$/;

export function sanitizeLocalSupabaseOutput(value: string) {
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

export function getLocalSupabaseApi(statusOutput: string, errorMessage: string): LocalApi {
  const status = parseLocalSupabaseStatus(statusOutput);
  const apiUrlValue = status.API_URL ?? status.api_url;
  const anonKeyValue = status.ANON_KEY ?? status.anon_key;
  const apiUrl = typeof apiUrlValue === "string" ? apiUrlValue : "";
  const anonKey = typeof anonKeyValue === "string" ? anonKeyValue : "";
  if (!loopbackUrl.test(apiUrl) || !anonKey) throw new Error(errorMessage);
  return { apiUrl, anonKey };
}

export async function createSyntheticUser(
  api: LocalApi,
  label: string,
  emailPrefix: string,
  data?: Record<string, unknown>,
): Promise<SyntheticUser> {
  const email = `${emailPrefix}-${label}-${randomUUID()}@example.invalid`;
  const password = `T-${randomBytes(24).toString("base64url")}a9!`;
  const response = await fetch(`${api.apiUrl}/auth/v1/signup`, {
    method: "POST",
    headers: { apikey: api.anonKey, authorization: `Bearer ${api.anonKey}`, "content-type": "application/json" },
    body: JSON.stringify({ email, password, ...(data ? { data } : {}) }),
  });
  const body = await response.json().catch(() => ({})) as { user?: { id?: string }; id?: string };
  if (!response.ok) throw new Error(`Local synthetic Auth signup failed with HTTP ${response.status}.`);
  const id = body.user?.id ?? body.id;
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) throw new Error("Local Auth returned an invalid synthetic identity.");
  return { id, email, password };
}
