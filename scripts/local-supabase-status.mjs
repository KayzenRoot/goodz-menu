import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isPublicSupabaseAnonKey } from "../src/lib/env/supabase-public-key.mjs";

export const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));
export const supabaseCliPath = path.join(repositoryRoot, "node_modules", "supabase", "dist", "supabase.js");
export const localApiUrl = "http://127.0.0.1:56321";
export const localNetworkName = "goodz-menu-reboot-001-loopback";

let cachedWindowsFixedDriveLetters;

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

export async function readLocalSupabaseStatus(expectedEndpoint) {
  const docker = await ensureLocalDocker();
  if (expectedEndpoint && docker.endpoint !== expectedEndpoint) {
    throw new Error("O contexto Docker mudou durante a operação local.");
  }

  const result = await runCaptured(process.execPath, [supabaseCliPath, "status", "--output", "json"], {
    env: dockerRuntimeEnvironment(docker.endpoint),
  });
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

  return { apiUrl: localApiUrl, anonKey, dockerEndpoint: docker.endpoint };
}

export async function ensureLocalDocker(run = runCaptured, dockerCliPath = resolveDockerCliPath()) {
  let contextResult;
  try {
    contextResult = await run(dockerCliPath, ["context", "show"]);
  } catch {
    throw new Error("Docker Desktop não está disponível.");
  }
  if (contextResult.code !== 0) throw new Error("O contexto Docker local não pôde ser consultado.");

  const contextName = contextResult.stdout.trim();
  const endpointResult = await run(dockerCliPath, ["context", "inspect", contextName, "--format", "{{json .Endpoints.docker.Host}}"]);
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

  const info = await run(dockerCliPath, dockerCommandArgs(endpoint, ["info", "--format", "{{.ServerVersion}}"]));
  if (info.code !== 0) throw new Error("Docker Engine está parado ou indisponível.");
  return { endpoint, serverVersion: info.stdout.trim() };
}

export function isLocalDockerEndpoint(endpoint) {
  return typeof endpoint === "string" &&
    /^npipe:\/{4}\.\/pipe\/(?:dockerDesktopLinuxEngine|docker_engine)$/i.test(endpoint);
}

export function dockerCommandArgs(endpoint, args) {
  if (!isLocalDockerEndpoint(endpoint)) throw new Error("A stack Goodz só pode usar uma engine Docker local.");
  return ["--host", endpoint, ...args];
}

export function resolveDockerCliPath(
  environment = process.env,
  platform = process.platform,
  exists = existsSync,
  getFixedDriveLetters = readWindowsFixedDriveLetters,
) {
  if (platform !== "win32") return "docker";

  const candidates = [
    windowsInstallPath(environment.ProgramFiles, environment.SystemDrive, "Docker", "Docker", "resources", "bin", "docker.exe"),
    windowsInstallPath(environment.LOCALAPPDATA, environment.SystemDrive, "Programs", "DockerDesktop", "resources", "bin", "docker.exe"),
  ].filter((candidate) => typeof candidate === "string");
  const installedCli = candidates.find((candidate) => exists(candidate));
  if (!installedCli) throw new Error("Docker Desktop CLI não foi encontrado em um caminho local padrão do disco do sistema.");
  const installedDrive = path.win32.parse(installedCli).root.slice(0, 2).toUpperCase();
  if (!getFixedDriveLetters().has(installedDrive)) {
    throw new Error("Docker Desktop CLI precisa estar em um volume local fixo.");
  }
  return installedCli;
}

export function readWindowsFixedDriveLetters(runQuery = runWindowsDriveQuery) {
  if (runQuery === runWindowsDriveQuery && cachedWindowsFixedDriveLetters) {
    return new Set(cachedWindowsFixedDriveLetters);
  }

  let output;
  try {
    output = runQuery();
  } catch {
    throw new Error("O tipo dos volumes locais não pôde ser verificado.");
  }

  let volumes;
  try {
    const parsed = JSON.parse(output.trim());
    volumes = Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    throw new Error("O inventário de volumes locais não pôde ser lido.");
  }

  const fixedDrives = new Set(
    volumes
      .filter((volume) => volume && Number(volume.DriveType) === 3 && /^[A-Za-z]:$/.test(volume.DeviceID))
      .map((volume) => volume.DeviceID.toUpperCase()),
  );
  if (runQuery === runWindowsDriveQuery) cachedWindowsFixedDriveLetters = new Set(fixedDrives);
  return fixedDrives;
}

function runWindowsDriveQuery() {
  const windowsRoot = process.env.SystemRoot ?? process.env.WINDIR;
  if (!windowsRoot) throw new Error("Windows system directory is unavailable.");

  const powershellPath = path.win32.join(windowsRoot, "System32", "WindowsPowerShell", "v1.0", "powershell.exe");
  const query = "$ErrorActionPreference='Stop'; Get-CimInstance -ClassName Win32_LogicalDisk | Select-Object DeviceID, DriveType | ConvertTo-Json -Compress";
  const result = spawnSync(powershellPath, ["-NoLogo", "-NoProfile", "-NonInteractive", "-Command", query], {
    encoding: "utf8",
    timeout: 5000,
    windowsHide: true,
  });
  if (result.error || result.status !== 0) throw new Error("Windows volume query failed.");
  return result.stdout;
}

function windowsInstallPath(root, systemDrive, ...segments) {
  const rootDrive = typeof root === "string" ? /^([A-Za-z]):[\\/]/.exec(root)?.[1] : undefined;
  const systemDriveLetter = typeof systemDrive === "string" ? /^([A-Za-z]):?$/.exec(systemDrive)?.[1] : undefined;
  if (!rootDrive || !systemDriveLetter || rootDrive.toLowerCase() !== systemDriveLetter.toLowerCase()) return undefined;
  return path.win32.join(root, ...segments);
}

export function dockerRuntimeEnvironment(endpoint, extra = {}, dockerCliPath) {
  if (!isLocalDockerEndpoint(endpoint)) throw new Error("A stack Goodz só pode usar uma engine Docker local.");
  const environment = safeProcessEnvironment(extra);
  delete environment.PATH;
  delete environment.Path;
  const resolvedDockerCliPath = dockerCliPath ?? resolveDockerCliPath();
  if (path.isAbsolute(resolvedDockerCliPath)) environment.PATH = path.dirname(resolvedDockerCliPath);
  delete environment.DOCKER_CONTEXT;
  delete environment.DOCKER_TLS_VERIFY;
  delete environment.DOCKER_CERT_PATH;
  environment.DOCKER_HOST = endpoint;
  return environment;
}

export async function ensureLoopbackDockerNetwork(run = runCaptured, dockerCliPath = resolveDockerCliPath()) {
  const { endpoint } = await ensureLocalDocker(run, dockerCliPath);
  const inspect = await run(dockerCliPath, dockerCommandArgs(endpoint, ["network", "inspect", localNetworkName, "--format", "{{json .Options}}"]));
  if (inspect.code === 0) {
    let options;
    try { options = JSON.parse(inspect.stdout.trim()); } catch { options = null; }
    if (options?.["com.docker.network.bridge.host_binding_ipv4"] !== "127.0.0.1") {
      throw new Error("A rede Docker existente não está limitada ao loopback; ela foi preservada.");
    }
    return endpoint;
  }

  const created = await run(dockerCliPath, dockerCommandArgs(endpoint, [
    "network", "create", "--driver", "bridge", "--opt",
    "com.docker.network.bridge.host_binding_ipv4=127.0.0.1", localNetworkName,
  ]));
  if (created.code !== 0) throw new Error("A rede Docker local isolada não pôde ser criada.");
  return endpoint;
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
