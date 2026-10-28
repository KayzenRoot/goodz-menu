import { X509Certificate } from "node:crypto";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import tls from "node:tls";
import {
  assertWindowsLoopbackHostListeners,
  dockerCommandArgs,
  dockerRuntimeEnvironment,
  ensureLocalDocker,
  localProjectId,
  readWindowsHostListeners,
  repositoryRoot,
  resolveDockerCliPath,
  runCaptured,
} from "./local-supabase-status.mjs";

export const nativeSupabaseTlsApiUrl = "https://localhost:56443";
export const dockerSupabaseTlsApiUrl = "https://supabase-tls:8443";
export const supabaseTlsCaPath = path.join(repositoryRoot, ".local-tls", "supabase-root-ca.crt");

const caddyContainerPort = "8443/tcp";
const caddyHostPort = "56443";
const caddyImageService = "supabase-tls";
const caddyCaPath = "/data/caddy/pki/authorities/local/root.crt";
const containerIdPattern = /^[a-f0-9]{12,64}$/i;

export async function ensureLocalSupabaseTlsProxy(
  dockerEndpoint,
  dockerNetworkId,
  {
    run = runCaptured,
    dockerCliPath = resolveDockerCliPath(),
    caPath = supabaseTlsCaPath,
    platform = process.platform,
    getHostListeners = readWindowsHostListeners,
    verifyTls = verifyNativeTls,
    readCa = readAndValidateRootCertificate,
    wait = delay,
    attempts = 20,
    retryDelayMs = 400,
  } = {},
) {
  if (typeof dockerNetworkId !== "string" || !/^[a-f0-9]{64}$/i.test(dockerNetworkId)) {
    throw new Error("A rede local do proxy TLS não pôde ser validada.");
  }

  const docker = await ensureLocalDocker(run, dockerCliPath);
  if (docker.endpoint !== dockerEndpoint) {
    throw new Error("O contexto Docker mudou durante a operação local.");
  }

  const environment = dockerRuntimeEnvironment(
    dockerEndpoint,
    { GOODZ_SUPABASE_NETWORK_ID: dockerNetworkId },
    dockerCliPath,
  );
  const runDocker = async (args) => run(dockerCliPath, dockerCommandArgs(dockerEndpoint, args), {
    cwd: repositoryRoot,
    env: environment,
  });

  try {
    const started = await runDocker(["compose", "up", "-d", "--no-deps", caddyImageService]);
    if (started.code !== 0) throw new Error("O proxy TLS local não pôde ser iniciado.");

    const listed = await runDocker(["compose", "ps", "-q", caddyImageService]);
    const containerIds = listed.code === 0
      ? listed.stdout.split(/\r?\n/).map((value) => value.trim()).filter(Boolean)
      : [];
    if (containerIds.length !== 1 || !containerIdPattern.test(containerIds[0])) {
      throw new Error("O container do proxy TLS local não pôde ser identificado.");
    }
    const containerId = containerIds[0];

    await verifyLoopbackProxyBinding(containerId, runDocker);
    mkdirSync(path.dirname(caPath), { recursive: true });

    let certificate;
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      const copied = await runDocker(["cp", `${containerId}:${caddyCaPath}`, path.resolve(caPath)]);
      if (copied.code === 0 && existsSync(caPath)) {
        try {
          certificate = readCa(caPath);
          break;
        } catch {
          certificate = undefined;
        }
      }
      if (attempt + 1 < attempts) await wait(retryDelayMs);
    }
    if (!certificate) throw new Error("A CA pública do proxy TLS local não pôde ser exportada.");

    let verified = false;
    let tlsFailureCode = "UNKNOWN";
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      try {
        await verifyTls({ host: "localhost", port: Number(caddyHostPort), ca: certificate });
        verified = true;
        break;
      } catch (error) {
        const code = typeof error?.code === "string" ? error.code : "UNKNOWN";
        if (/^[A-Z0-9_]{2,64}$/i.test(code)) tlsFailureCode = code;
        if (attempt + 1 < attempts) await wait(retryDelayMs);
      }
    }
    if (!verified) throw new Error(`O certificado ou hostname do proxy TLS local não foi validado (${tlsFailureCode}).`);

    if (platform === "win32") {
      let listeners;
      try {
        listeners = await getHostListeners([Number(caddyHostPort)]);
        assertWindowsLoopbackHostListeners(new Set([Number(caddyHostPort)]), listeners);
      } catch {
        throw new Error("O listener TLS local não pôde ser confirmado somente no loopback.");
      }
    }

    return {
      nativeApiUrl: nativeSupabaseTlsApiUrl,
      dockerApiUrl: dockerSupabaseTlsApiUrl,
      caPath: path.resolve(caPath),
      containerId,
    };
  } catch (error) {
    let stopped = false;
    try {
      const stopResult = await runDocker(["compose", "stop", caddyImageService]);
      if (stopResult.code === 0) {
        stopped = (await listRunningTlsProxyContainers(runDocker)).length === 0;
      }
    } catch {
      stopped = false;
    }
    if (!stopped) {
      const cleanupError = new Error(
        "O proxy TLS falhou na validação e não foi possível confirmar que foi parado.",
        { cause: error },
      );
      Object.assign(cleanupError, { code: "LOCAL_TLS_PROXY_STOP_FAILED" });
      throw cleanupError;
    }
    throw error;
  }
}

export async function stopLocalSupabaseTlsProxy(
  dockerEndpoint,
  dockerNetworkId,
  { run = runCaptured, dockerCliPath = resolveDockerCliPath() } = {},
) {
  if (
    dockerNetworkId !== undefined &&
    (typeof dockerNetworkId !== "string" || !/^[a-f0-9]{64}$/i.test(dockerNetworkId))
  ) {
    throw new Error("A rede local do proxy TLS não pôde ser validada.");
  }

  const docker = await ensureLocalDocker(run, dockerCliPath);
  if (docker.endpoint !== dockerEndpoint) {
    throw new Error("O contexto Docker mudou durante a operação local.");
  }
  const environment = dockerRuntimeEnvironment(
    dockerEndpoint,
    dockerNetworkId ? { GOODZ_SUPABASE_NETWORK_ID: dockerNetworkId } : {},
    dockerCliPath,
  );
  const runDocker = (args) => run(dockerCliPath, dockerCommandArgs(dockerEndpoint, args), {
    cwd: repositoryRoot,
    env: environment,
  });
  if (dockerNetworkId) {
    const stopped = await runDocker(["compose", "stop", caddyImageService]);
    if (stopped.code !== 0) throw new Error("O proxy TLS local não pôde ser parado.");
  } else {
    const running = await listRunningTlsProxyContainers(runDocker);
    if (running.length > 0) {
      const stopped = await runDocker(["stop", ...running]);
      if (stopped.code !== 0) throw new Error("O proxy TLS local não pôde ser parado.");
    }
  }
  const remaining = await listRunningTlsProxyContainers(runDocker);
  if (remaining.length > 0) throw new Error("O proxy TLS local ainda está em execução.");
}

export function readAndValidateRootCertificate(caPath = supabaseTlsCaPath) {
  const pem = readFileSync(caPath, "utf8");
  if (
    pem.length > 65536 ||
    !/^-----BEGIN CERTIFICATE-----[\s\S]+-----END CERTIFICATE-----\s*$/.test(pem) ||
    /-----BEGIN (?:RSA |EC |PRIVATE )?PRIVATE KEY-----/.test(pem)
  ) {
    throw new Error("A CA do proxy TLS não contém somente um certificado público.");
  }
  const certificate = new X509Certificate(pem);
  if (!certificate.ca) throw new Error("O certificado exportado não é uma autoridade certificadora.");
  return Buffer.from(pem, "utf8");
}

export function verifyNativeTls(
  { host, port, ca, servername = host },
  { connect = tls.connect } = {},
) {
  return new Promise((resolve, reject) => {
    const socket = connect({ host, port, servername, ca, rejectUnauthorized: true });
    let settled = false;
    const fail = (code = "UNKNOWN") => {
      if (settled) return;
      settled = true;
      socket.destroy();
      const error = new Error("TLS local não validado.");
      if (/^[A-Z0-9_]{2,64}$/i.test(code)) Object.assign(error, { code });
      reject(error);
    };

    socket.setTimeout(5000, () => fail("ETIMEDOUT"));
    socket.once("error", (error) => fail(error.code ?? "UNKNOWN"));
    socket.once("secureConnect", () => {
      if (!socket.authorized) return fail();
      settled = true;
      socket.end();
      resolve();
    });
  });
}

async function verifyLoopbackProxyBinding(containerId, runDocker) {
  const inspected = await runDocker([
    "inspect", containerId, "--format", "{{json .HostConfig.PortBindings}}",
  ]);
  if (inspected.code !== 0) throw new Error("O bind do proxy TLS local não pôde ser verificado.");

  let bindings;
  try {
    bindings = JSON.parse(inspected.stdout.trim());
  } catch {
    throw new Error("O bind do proxy TLS local não pôde ser verificado.");
  }
  const published = bindings?.[caddyContainerPort];
  const normalizedBindings = Array.isArray(published)
    ? published.map((binding) => `${binding?.HostIp}:${binding?.HostPort}`).sort()
    : [];
  const expectedBindings = ["127.0.0.1:56443", "::1:56443"].sort();
  if (
    !Array.isArray(published) ||
    normalizedBindings.length !== expectedBindings.length ||
    normalizedBindings.some((binding, index) => binding !== expectedBindings[index]) ||
    Object.keys(bindings).some((key) => key !== caddyContainerPort)
  ) {
    throw new Error("O proxy TLS local está publicado fora do loopback esperado.");
  }
}

async function listRunningTlsProxyContainers(runDocker) {
  const listed = await runDocker([
    "ps", "-q",
    "--filter", `label=com.docker.compose.project=${localProjectId}`,
    "--filter", `label=com.docker.compose.service=${caddyImageService}`,
  ]);
  if (listed.code !== 0) throw new Error("O estado do proxy TLS local não pôde ser verificado.");
  const containerIds = listed.stdout.split(/\r?\n/).map((value) => value.trim()).filter(Boolean);
  if (containerIds.some((containerId) => !containerIdPattern.test(containerId))) {
    throw new Error("A identidade do proxy TLS local não pôde ser verificada.");
  }
  return containerIds;
}

function delay(durationMs) {
  return new Promise((resolve) => setTimeout(resolve, durationMs));
}
