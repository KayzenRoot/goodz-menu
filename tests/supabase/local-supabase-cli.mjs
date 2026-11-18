import { randomBytes, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { assertPasswordGrantIdentity } from "./password-grant-identity.mjs";

const repositoryRoot = fileURLToPath(new URL("../../", import.meta.url));
const supabaseCli = resolve(repositoryRoot, "node_modules/supabase/dist/supabase.js");
const apiUrlPattern = /^https?:\/\/(127\.0\.0\.1|localhost|\[::1\])(?::\d+)?$/;
const workdir = process.env.GOODZ_SUPABASE_WORKDIR?.trim();

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

export function runLocalSupabaseCli(args) {
  return new Promise((resolveRun, rejectRun) => {
    const scopedArgs = workdir ? ["--workdir", resolve(workdir), ...args] : args;
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
      if (code === 0) {
        resolveRun({ stdout, stderr });
        return;
      }
      const reason = signal || "exit " + String(code);
      rejectRun(new Error("Local Supabase CLI failed (" + reason + "). " + sanitizeCliOutput(stdout, stderr)));
    });
  });
}

export async function executeBatchSql(sql) {
  const base = sql.trim();
  const trimmed = base.endsWith(";") ? base : `${base};`;
  await runLocalSupabaseCli(["db", "query", "--local", `DO $batch$ BEGIN ${trimmed} END $batch$`]);
}

export async function getVerifiedLocalDataApi(recordFn) {
  const { stdout } = await runLocalSupabaseCli(["status", "--output", "json"]);
  const jsonStart = stdout.indexOf("{");
  const status = JSON.parse(stdout.slice(jsonStart));
  const apiUrl = (process.env.SUPABASE_URL || status.API_URL || status.api_url || "").replace(/\/$/, "");
  const anonKey = process.env.SUPABASE_ANON_KEY || status.ANON_KEY || status.anon_key;
  const serviceRoleKey = status.SERVICE_ROLE_KEY || status.service_role_key;
  if (!apiUrlPattern.test(apiUrl) || !anonKey || !serviceRoleKey) {
    throw new Error("Local Supabase URL, anon key, or service-role key is unavailable.");
  }
  const config = await readFile(resolve(repositoryRoot, "supabase/config.toml"), "utf8");
  const apiSection = config.split(/^\[api\]\s*$/m)[1]?.split(/^\[/m)[0] || "";
  const exposedSchemas = apiSection.match(/^schemas\s*=\s*\[[^\]]*\]/m)?.[0] || "";
  if (/\bprivate\b/i.test(exposedSchemas)) {
    throw new Error("Private helpers must remain outside exposed Data API schemas.");
  }
  recordFn("Data API exposes no private helper schema");
  return { apiUrl, anonKey, serviceRoleKey };
}

export async function createDataApiUser(api, prefix, label, createdUserIds) {
  const email = `${prefix}-${label}-${randomUUID()}@example.invalid`;
  const password = `T-${randomBytes(24).toString("base64url")}a9!`;
  const headers = { apikey: api.anonKey, authorization: `Bearer ${api.anonKey}`, "content-type": "application/json" };
  const signup = await fetch(`${api.apiUrl}/auth/v1/signup`, {
    method: "POST",
    headers,
    body: JSON.stringify({ email, password }),
  });
  const signupBody = await signup.json().catch(() => ({}));
  if (!signup.ok) throw new Error(`Synthetic local Auth signup failed with HTTP ${signup.status}.`);
  const identity = signupBody.user || signupBody;
  createdUserIds.add(identity.id);

  const tokenResponse = await fetch(`${api.apiUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers,
    body: JSON.stringify({ email, password }),
  });
  const tokenBody = await tokenResponse.json().catch(() => ({}));
  if (!tokenResponse.ok || !tokenBody.access_token) {
    throw new Error(`Synthetic password grant failed with HTTP ${tokenResponse.status}.`);
  }
  assertPasswordGrantIdentity(tokenBody, identity);
  return { id: identity.id, accessToken: tokenBody.access_token };
}

export async function sendRestRequest(api, path, { method = "GET", token = api.anonKey, body } = {}) {
  const response = await fetch(`${api.apiUrl}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: api.anonKey,
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const payload = await response.json().catch(() => null);
  return { status: response.status, ok: response.ok, payload };
}
