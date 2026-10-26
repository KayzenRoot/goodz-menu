import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isPublicSupabaseAnonKey } from "../src/lib/env/supabase-public-key.mjs";

export const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));
export const supabaseCliPath = path.join(repositoryRoot, "node_modules", "supabase", "dist", "supabase.js");
export const localApiUrl = "http://127.0.0.1:56321";
export const localNetworkName = "goodz-menu-reboot-001-loopback";

const inheritedEnvironmentKeys = [
  "PATH", "Path", "SystemRoot", "WINDIR", "COMSPEC", "TEMP", "TMP", "USERPROFILE", "HOME", "LOCALAPPDATA", "APPDATA",
];

export function safeProcessEnvironment(extra = {}) {
  const environment = {};
  for (const key of inheritedEnvironmentKeys) {
    const value = process.env[key];
    if (value) environment[key] = value;
  }
  return { ...environment, ...extra };
}

export function runCaptured(command, args, { cwd = repositoryRoot, env = safeProcessEnvironment() } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, env, stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8").on("data", (chunk) => { stdout += chunk; });
    child.stderr.setEncoding("utf8").on("data", (chunk) => { stderr += chunk; });
    child.once("error", reject);
    child.once("close", (code, signal) => resolve({ code: code ?? 1, signal, stdout, stderr }));
  });
}

export async function readLocalSupabaseStatus() {
  await ensureLocalDocker();
  const result = await runCaptured(process.execPath, [supabaseCliPath, "status", "--output", "json"]);
  if (result.code !== 0) throw new Error("Supabase local não está disponível.");

  let status;
  try {
    const jsonStart = result.stdout.indexOf("{");
    if (jsonStart < 0) throw new Error("missing JSON");
    status = JSON.parse(result.stdout.slice(jsonStart));
  } catch {
    throw new Error("O status local do Supabase não pôde ser lido.");
  }

  const apiUrl = firstString(status, ["API_URL", "api_url"]);
  const anonKey = firstString(status, ["ANON_KEY", "anon_key", "PUBLISHABLE_KEY", "publishable_key"]);
  if (!apiUrl || !anonKey || !isPublicSupabaseAnonKey(anonKey) || !isIsolatedLocalApi(apiUrl)) {
    throw new Error("O Supabase local não corresponde à configuração isolada do reboot.");
  }

  return { apiUrl: localApiUrl, anonKey };
}

export async function ensureLocalDocker() {
  let contextResult;
  try {
    contextResult = await runCaptured("docker", ["context", "show"]);
  } catch {
    throw new Error("Docker Desktop não está disponível.");
  }
  if (contextResult.code !== 0) throw new Error("O contexto Docker local não pôde ser consultado.");

  const contextName = contextResult.stdout.trim();
  const endpointResult = await runCaptured("docker", ["context", "inspect", contextName, "--format", "{{json .Endpoints.docker.Host}}"]);
  if (endpointResult.code !== 0) throw new Error("O endpoint do contexto Docker não pôde ser verificado.");

  let endpoint;
  try {
    endpoint = JSON.parse(endpointResult.stdout.trim());
  } catch {
    throw new Error("O endpoint do contexto Docker não pôde ser validado.");
  }
  if (!isLocalDockerEndpoint(endpoint)) {
    throw new Error("A stack Goodz só pode usar uma engine Docker local.");
  }

  const info = await runCaptured("docker", ["info", "--format", "{{.ServerVersion}}"]);
  if (info.code !== 0) throw new Error("Docker Engine está parado ou indisponível.");
  return info.stdout.trim();
}

export function isLocalDockerEndpoint(endpoint) {
  return typeof endpoint === "string" &&
    /^npipe:\/{4}\.\/pipe\/(?:dockerDesktopLinuxEngine|docker_engine)$/i.test(endpoint);
}

export async function ensureLoopbackDockerNetwork() {
  await ensureLocalDocker();
  const inspect = await runCaptured("docker", ["network", "inspect", localNetworkName, "--format", "{{json .Options}}"]);
  if (inspect.code === 0) {
    let options;
    try { options = JSON.parse(inspect.stdout.trim()); } catch { options = null; }
    if (options?.["com.docker.network.bridge.host_binding_ipv4"] !== "127.0.0.1") {
      throw new Error("A rede Docker existente não está limitada ao loopback; ela foi preservada.");
    }
    return;
  }

  const created = await runCaptured("docker", [
    "network", "create", "--driver", "bridge", "--opt",
    "com.docker.network.bridge.host_binding_ipv4=127.0.0.1", localNetworkName,
  ]);
  if (created.code !== 0) throw new Error("A rede Docker local isolada não pôde ser criada.");
}

export function sanitizeSupabaseOutput(value) {
  return value
    .replace(/((?:anon|publishable|service[\s_-]*role|secret|jwt(?:[\s_-]*secret)?|db[\s_-]*url|database[\s_-]*url)(?:[\s_-]*key)?\s*[:=]\s*)(?:"[^"]*"|'[^']*'|\S+)/gi, "$1[redacted]")
    .replace(/\bpostgres(?:ql)?:\/\/[^\s@]+@[^\s]+/gi, "postgres://[redacted]")
    .replace(/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, "[redacted-token]");
}

function firstString(value, names) {
  for (const name of names) {
    if (typeof value?.[name] === "string" && value[name].trim()) return value[name].trim();
  }
  return undefined;
}

function isIsolatedLocalApi(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" && ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname.toLowerCase()) &&
      url.port === "56321" && url.pathname === "/" && !url.username && !url.password && !url.search && !url.hash;
  } catch {
    return false;
  }
}
