import { spawn, spawnSync } from "node:child_process";
import { readFileSync, realpathSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isPublicSupabaseAnonKey } from "../src/lib/env/supabase-public-key.mjs";

export const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));
export const supabaseCliPath = path.join(repositoryRoot, "node_modules", "supabase", "dist", "supabase.js");
export const localApiUrl = "http://127.0.0.1:56321";
export const localNetworkName = "goodz-menu-reboot-001-loopback";
export const localProjectId = "goodz-menu-reboot-001";

const loopbackPortBindingBehaviors = new Set(["default-local-port-binding", "local-only-port-binding"]);
const loopbackHostAddresses = new Set(["127.0.0.1", "::1"]);

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

export async function readLocalSupabaseStatus(
  expectedEndpoint,
  run = runCaptured,
  dockerCliPath = resolveDockerCliPath(),
  getPortBindingBehavior = readDockerDesktopPortBindingBehavior,
  platform = process.platform,
  getHostListeners = readWindowsHostListeners,
) {
  const docker = await ensureLocalDocker(run, dockerCliPath);
  if (expectedEndpoint && docker.endpoint !== expectedEndpoint) {
    throw new Error("O contexto Docker mudou durante a operação local.");
  }
  const network = await inspectLoopbackDockerNetwork(docker.endpoint, run, dockerCliPath);

  const result = await run(process.execPath, [supabaseCliPath, "status", "--output", "json"], {
    env: dockerRuntimeEnvironment(docker.endpoint, {}, dockerCliPath),
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

  await verifySupabasePortBindingsLoopback(
    docker.endpoint, run, dockerCliPath, getPortBindingBehavior, platform, getHostListeners,
  );

  return {
    apiUrl: localApiUrl,
    anonKey,
    dockerEndpoint: docker.endpoint,
    dockerNetworkId: network.networkId,
  };
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

export function readDockerDesktopPortBindingBehavior(appData = process.env.APPDATA) {
  if (typeof appData !== "string" || !appData.trim()) return undefined;
  try {
    const settingsPath = path.join(appData, "Docker", "settings-store.json");
    const settings = JSON.parse(readFileSync(settingsPath, "utf8"));
    const behavior = settings?.PortBindingBehavior ?? settings?.portBindingBehavior;
    return typeof behavior === "string" ? behavior : undefined;
  } catch {
    return undefined;
  }
}

export function assertDockerDesktopLoopbackPortBinding(behavior, platform = process.platform) {
  if (platform !== "win32") return;
  if (loopbackPortBindingBehaviors.has(behavior)) return;
  throw new Error(
    "Configure Docker Desktop em Settings > Resources > Network > Port binding behavior como Localhost by default ou Localhost only.",
  );
}

export function dockerCommandArgs(endpoint, args) {
  if (!isLocalDockerEndpoint(endpoint)) throw new Error("A stack Goodz só pode usar uma engine Docker local.");
  return ["--host", endpoint, ...args];
}

export function resolveDockerCliPath(
  environment = process.env,
  platform = process.platform,
  getFixedDriveLetters = readWindowsFixedDriveLetters,
  resolveFinalPath = resolveWindowsFinalPath,
  inspectPaths = readWindowsPathAttributes,
) {
  if (platform !== "win32") return "docker";

  const candidates = [
    windowsInstallPath(environment.ProgramFiles, "Docker", "Docker", "resources", "bin", "docker.exe"),
    windowsInstallPath(environment.LOCALAPPDATA, "Programs", "DockerDesktop", "resources", "bin", "docker.exe"),
  ].filter((candidate) => typeof candidate === "string");
  if (candidates.length === 0) throw new Error("Docker Desktop CLI não foi encontrado em um caminho local padrão.");

  const fixedDriveLetters = getFixedDriveLetters();
  for (const candidate of candidates) {
    const candidateDrive = windowsDriveLetter(candidate);
    if (!candidateDrive || !fixedDriveLetters.has(candidateDrive)) continue;
    if (!isSafeWindowsLocalFile(candidate, inspectPaths)) continue;

    let finalPath;
    try {
      finalPath = normalizeWindowsFinalPath(resolveFinalPath(candidate));
    } catch {
      continue;
    }

    const finalDrive = windowsDriveLetter(finalPath);
    if (finalDrive && fixedDriveLetters.has(finalDrive)) return finalPath;
  }
  throw new Error("Docker Desktop CLI precisa resolver para um arquivo em um volume local fixo.");
}

function isSafeWindowsLocalFile(candidate, inspectPaths) {
  const root = path.win32.parse(candidate).root;
  if (!windowsDriveLetter(root)) return false;

  const segments = path.win32.relative(root, candidate).split(path.win32.sep).filter(Boolean);
  if (segments.length === 0) return false;

  const components = [root];
  let currentPath = root;
  for (const segment of segments) {
    currentPath = path.win32.join(currentPath, segment);
    components.push(currentPath);
  }

  let attributes;
  try {
    attributes = inspectPaths(components);
  } catch {
    return false;
  }

  if (!Array.isArray(attributes) || attributes.length !== components.length) return false;
  return attributes.every((value, index) => {
    if (!Number.isInteger(value) || (value & 0x400) !== 0) return false;
    const isDirectory = (value & 0x10) !== 0;
    return index < attributes.length - 1 ? isDirectory : !isDirectory;
  });
}

export function readWindowsPathAttributes(paths) {
  const { windowsRoot, powershellPath } = windowsPowerShellContext();
  const encodedPaths = paths.map((targetPath) => `'${Buffer.from(targetPath, "utf16le").toString("base64")}'`);
  const query = [
    "$ErrorActionPreference='Stop';",
    `$encodedPaths=@(${encodedPaths.join(",")});`,
    "foreach ($encodedPath in $encodedPaths) {",
    "$targetPath=[System.Text.Encoding]::Unicode.GetString([System.Convert]::FromBase64String($encodedPath));",
    "try {",
    "$attributes=[System.IO.File]::GetAttributes($targetPath);",
    "[Console]::Out.WriteLine(([int]$attributes).ToString([System.Globalization.CultureInfo]::InvariantCulture));",
    "if (($attributes -band 1024) -ne 0) { break; }",
    "} catch { [Console]::Out.WriteLine('E'); break; }",
    "}",
  ].join(" ");
  const result = spawnSync(powershellPath, [
    "-NoLogo", "-NoProfile", "-NonInteractive", "-EncodedCommand", Buffer.from(query, "utf16le").toString("base64"),
  ], {
    encoding: "utf8",
    timeout: 5000,
    windowsHide: true,
    env: { SystemRoot: windowsRoot, WINDIR: windowsRoot, PSModulePath: "" },
  });
  if (result.error || result.status !== 0) throw new Error("Windows file attributes query failed.");

  const lines = result.stdout.toString().split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length === 0 || lines.length > paths.length || lines.some((line) => line !== "E" && !/^\d+$/.test(line))) {
    throw new Error("Windows file attributes could not be read.");
  }
  return lines.map((line) => line === "E" ? null : Number(line));
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

  let driveRecords;
  try {
    const lines = output.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    driveRecords = lines.map((line) => /^([A-Za-z]):\|([1-6])$/.exec(line));
    if (driveRecords.length === 0 || driveRecords.some((record) => record === null)) throw new Error("invalid drive inventory");
  } catch {
    throw new Error("O inventário de volumes locais não pôde ser lido.");
  }

  const fixedDrives = new Set(
    driveRecords
      .filter((record) => record[2] === "3")
      .map((record) => `${record[1].toUpperCase()}:`),
  );
  if (runQuery === runWindowsDriveQuery) cachedWindowsFixedDriveLetters = new Set(fixedDrives);
  return fixedDrives;
}

/** @param {string} candidate */
function resolveWindowsFinalPath(candidate) {
  return realpathSync.native(candidate).toString();
}

function runWindowsDriveQuery() {
  const { windowsRoot, powershellPath } = windowsPowerShellContext();
  const query = [
    "$ErrorActionPreference='Stop';",
    "foreach ($drive in [System.IO.DriveInfo]::GetDrives()) {",
    "[Console]::WriteLine(('{0}|{1}' -f $drive.Name.Substring(0, 2), [int]$drive.DriveType))",
    "}",
  ].join(" ");
  const result = spawnSync(powershellPath, ["-NoLogo", "-NoProfile", "-NonInteractive", "-Command", query], {
    encoding: "utf8",
    timeout: 5000,
    windowsHide: true,
    env: {
      SystemRoot: windowsRoot,
      WINDIR: windowsRoot,
      PSModulePath: "",
    },
  });
  if (result.error || result.status !== 0) throw new Error("Windows volume query failed.");
  return result.stdout.toString();
}

function windowsPowerShellContext() {
  const windowsRoot = process.env.SystemRoot ?? process.env.WINDIR;
  if (!windowsRoot || !/^[A-Za-z]:[\\/]/.test(windowsRoot)) {
    throw new Error("Windows system directory is unavailable.");
  }
  return {
    windowsRoot,
    powershellPath: path.win32.join(windowsRoot, "System32", "WindowsPowerShell", "v1.0", "powershell.exe"),
  };
}

function windowsInstallPath(root, ...segments) {
  if (typeof root !== "string" || !/^[A-Za-z]:[\\/]/.test(root)) return undefined;
  return path.win32.join(root, ...segments);
}

function normalizeWindowsFinalPath(value) {
  if (typeof value !== "string") return undefined;
  return value.replace(/^\\\\\?\\/, "");
}

function windowsDriveLetter(value) {
  const match = typeof value === "string" ? /^([A-Za-z]):[\\/]/.exec(value) : undefined;
  return match ? `${match[1].toUpperCase()}:` : undefined;
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

export async function ensureLoopbackDockerNetwork(
  run = runCaptured,
  dockerCliPath = resolveDockerCliPath(),
  getPortBindingBehavior = readDockerDesktopPortBindingBehavior,
  platform = process.platform,
) {
  const { endpoint } = await ensureLocalDocker(run, dockerCliPath);
  assertDockerDesktopLoopbackPortBinding(getPortBindingBehavior(), platform);
  const existing = await inspectDockerNetworkAt(endpoint, localNetworkName, run, dockerCliPath);
  if (existing) return existing;

  const created = await run(dockerCliPath, dockerCommandArgs(endpoint, [
    "network", "create", "--driver", "bridge", "--opt",
    "com.docker.network.bridge.host_binding_ipv4=127.0.0.1", localNetworkName,
  ]));
  if (created.code !== 0) throw new Error("A rede Docker local isolada não pôde ser criada.");

  const createdId = created.stdout.trim();
  if (!/^[a-f0-9]{64}$/i.test(createdId)) {
    throw new Error("A identidade da rede Docker local não pôde ser verificada.");
  }

  const createdNetwork = await inspectDockerNetworkAt(endpoint, createdId, run, dockerCliPath);
  if (!createdNetwork) throw new Error("A rede Docker local criada não pôde ser verificada.");
  if (createdNetwork.networkId !== createdId) throw new Error("A identidade da rede Docker local mudou durante a verificação.");
  return createdNetwork;
}

export async function verifySupabasePortBindingsLoopback(
  endpoint,
  run = runCaptured,
  dockerCliPath = resolveDockerCliPath(),
  getPortBindingBehavior = readDockerDesktopPortBindingBehavior,
  platform = process.platform,
  getHostListeners = readWindowsHostListeners,
) {
  // Docker Desktop settings apply to new containers; verify existing implicit bindings against actual host listeners.
  const allowUnspecifiedHostIp = platform === "win32" &&
    loopbackPortBindingBehaviors.has(getPortBindingBehavior());
  const containers = await run(dockerCliPath, dockerCommandArgs(endpoint, [
    "ps", "--filter", "name=supabase_", "--format", "{{.ID}} {{.Names}}",
  ]));
  if (containers.code !== 0) throw new Error("As portas publicadas do Supabase local não puderam ser verificadas.");

  const containerIds = containers.stdout.split(/\r?\n/)
    .map((line) => line.trim().split(/\s+/, 2))
    .filter(([, name]) => name?.startsWith("supabase_") && name.endsWith(`_${localProjectId}`))
    .map(([id]) => id)
    .filter(Boolean);
  if (containerIds.length === 0) throw new Error("Os containers locais do Supabase não puderam ser identificados.");

  const inspected = await run(dockerCliPath, dockerCommandArgs(endpoint, [
    "inspect", ...containerIds, "--format", "{{json .HostConfig.PortBindings}}",
  ]));
  if (inspected.code !== 0) throw new Error("As portas publicadas do Supabase local não puderam ser verificadas.");

  const bindingLines = inspected.stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (bindingLines.length !== containerIds.length) {
    throw new Error("As portas publicadas do Supabase local não puderam ser verificadas.");
  }

  const unspecifiedHostPorts = new Set();
  for (const line of bindingLines) {
    let portBindings;
    try {
      portBindings = JSON.parse(line);
    } catch {
      throw new Error("As portas publicadas do Supabase local não puderam ser verificadas.");
    }
    if (portBindings === null) continue;
    if (typeof portBindings !== "object" || Array.isArray(portBindings)) {
      throw new Error("As portas publicadas do Supabase local não puderam ser verificadas.");
    }
    for (const [portKey, bindings] of Object.entries(portBindings)) {
      if (!Array.isArray(bindings)) {
        throw new Error("As portas publicadas do Supabase local não puderam ser verificadas.");
      }
      const portKeyMatch = /^(?:[1-9]\d{0,4})\/(tcp|udp|sctp)$/.exec(portKey);
      if (!portKeyMatch || Number(portKey.split("/")[0]) > 65535) {
        throw new Error("As portas publicadas do Supabase local não puderam ser verificadas.");
      }
      for (const binding of bindings) {
        const hostIp = binding?.HostIp;
        if (loopbackHostAddresses.has(hostIp)) continue;
        if (allowUnspecifiedHostIp && hostIp === "") {
          if (portKeyMatch[1] !== "tcp") {
            throw new Error("As portas publicadas do Supabase local não puderam ser verificadas.");
          }
          const hostPort = dockerHostPort(binding?.HostPort);
          if (hostPort === undefined) {
            throw new Error("As portas publicadas do Supabase local não puderam ser verificadas.");
          }
          unspecifiedHostPorts.add(hostPort);
          continue;
        }
        throw new Error("Uma porta do Supabase local está publicada fora do loopback.");
      }
    }
  }

  if (unspecifiedHostPorts.size > 0) {
    let listeners;
    try {
      listeners = await getHostListeners([...unspecifiedHostPorts].sort((left, right) => left - right));
    } catch {
      throw new Error("Os listeners locais das portas Supabase não puderam ser verificados.");
    }
    assertWindowsLoopbackHostListeners(unspecifiedHostPorts, listeners);
  }
}

function dockerHostPort(value) {
  if (typeof value !== "string" || !/^[1-9]\d{0,4}$/.test(value)) return undefined;
  const port = Number(value);
  return port <= 65535 ? port : undefined;
}

function assertWindowsLoopbackHostListeners(expectedPorts, listeners) {
  if (!Array.isArray(listeners)) {
    throw new Error("Os listeners locais das portas Supabase não puderam ser verificados.");
  }

  const observedPorts = new Set();
  for (const listener of listeners) {
    if (!listener || !Number.isInteger(listener.LocalPort) || !expectedPorts.has(listener.LocalPort) ||
      !loopbackHostAddresses.has(listener.LocalAddress)) {
      throw new Error("Uma porta do Supabase local está publicada fora do loopback.");
    }
    observedPorts.add(listener.LocalPort);
  }

  if ([...expectedPorts].some((port) => !observedPorts.has(port))) {
    throw new Error("Os listeners locais das portas Supabase não puderam ser verificados.");
  }
}

function readWindowsHostListeners(hostPorts) {
  const { windowsRoot, powershellPath } = windowsPowerShellContext();
  const query = [
    "$ErrorActionPreference='Stop';",
    `$ports=@(${hostPorts.join(",")});`,
    "$ipProperties=[System.Net.NetworkInformation.IPGlobalProperties]::GetIPGlobalProperties();",
    "$listeners=@($ipProperties.GetActiveTcpListeners() | Where-Object { $ports -contains [int]$_.Port } | ForEach-Object { [PSCustomObject]@{ LocalAddress=$_.Address.ToString(); LocalPort=[int]$_.Port } });",
    "[Console]::Out.Write(($listeners | ConvertTo-Json -Compress))",
  ].join(" ");
  const result = spawnSync(powershellPath, [
    "-NoLogo", "-NoProfile", "-NonInteractive", "-EncodedCommand", Buffer.from(query, "utf16le").toString("base64"),
  ], {
    encoding: "utf8",
    timeout: 5000,
    windowsHide: true,
    env: { SystemRoot: windowsRoot, WINDIR: windowsRoot, PSModulePath: "" },
  });
  if (result.error || result.status !== 0) throw new Error("Windows listener query failed.");

  let listeners;
  try {
    listeners = JSON.parse(result.stdout.toString().trim());
  } catch {
    throw new Error("Windows listeners could not be read.");
  }
  return Array.isArray(listeners) ? listeners : [listeners];
}

export async function inspectLoopbackDockerNetwork(endpoint, run = runCaptured, dockerCliPath = resolveDockerCliPath()) {
  const network = await inspectDockerNetworkAt(endpoint, localNetworkName, run, dockerCliPath);
  if (!network) throw new Error("A rede Docker local isolada não está disponível.");
  return network;
}

async function inspectDockerNetworkAt(endpoint, networkReference, run, dockerCliPath) {
  const inspect = await run(dockerCliPath, dockerCommandArgs(endpoint, [
    "network", "inspect", networkReference, "--format", "{{json .}}",
  ]));
  if (inspect.code !== 0) return null;
  return { endpoint, networkId: validateLoopbackDockerNetwork(inspect.stdout) };
}

function validateLoopbackDockerNetwork(output) {
  let network;
  try {
    network = JSON.parse(output.trim());
  } catch {
    throw new Error("A rede Docker existente não pôde ser verificada.");
  }
  if (network?.Driver !== "bridge") {
    throw new Error("A rede Docker existente não usa o driver bridge; ela foi preservada.");
  }
  if (network.Options?.["com.docker.network.bridge.host_binding_ipv4"] !== "127.0.0.1") {
    throw new Error("A rede Docker existente não está limitada ao loopback; ela foi preservada.");
  }
  if (typeof network.Id !== "string" || !/^[a-f0-9]{64}$/i.test(network.Id)) {
    throw new Error("A identidade da rede Docker local não pôde ser verificada.");
  }
  return network.Id;
}

export function sanitizeSupabaseOutput(value) {
  return value
    .replace(/((?:anon|publishable|service[\s_-]*role|secret|jwt(?:[\s_-]*secret)?|db[\s_-]*url|database[\s_-]*url)(?:[\s_-]*key)?\s*[:=]\s*)(?:"[^"]*"|'[^']*'|\S+)/gi, "$1[redacted]")
    .replace(/\b(Publishable|Secret)\s+(sb_(?:publishable|secret)_\S+)/gi, "$1 [redacted]")
    .replace(/\bsb_(?:publishable|secret)_\S+/gi, "[redacted-token]")
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
