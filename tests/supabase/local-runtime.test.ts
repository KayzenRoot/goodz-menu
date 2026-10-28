import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { EventEmitter } from "node:events";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  assertDockerDesktopLoopbackPortBinding,
  dockerCommandArgs,
  dockerRuntimeEnvironment,
  ensureLocalDocker,
  ensureLoopbackDockerNetwork,
  localNetworkName,
  readDockerDesktopPortBindingBehavior,
  readLocalSupabaseStatus,
  isLocalDockerEndpoint,
  readWindowsPathAttributes,
  readWindowsFixedDriveLetters,
  resolveDockerCliPath,
  sanitizeSupabaseOutput,
  verifySupabasePortBindingsLoopback,
} from "../../scripts/local-supabase-status.mjs";
import {
  ensureLocalSupabaseTlsProxy,
  readAndValidateRootCertificate,
  stopLocalSupabaseTlsProxy,
  verifyNativeTls,
} from "../../scripts/local-supabase-tls.mjs";

const repositoryRoot = fileURLToPath(new URL("../../", import.meta.url));
const read = (relativePath: string) => readFileSync(path.join(repositoryRoot, relativePath), "utf8");
const localDockerEndpoint = "npipe:////./pipe/dockerDesktopLinuxEngine";
const dockerCliPath = "C:\\Program Files\\Docker\\Docker\\resources\\bin\\docker.exe";

function createDockerHarness({
  networkId,
  driver = "bridge",
  hostBinding = "127.0.0.1",
  networkNameMissing = false,
  supabaseStatus = false,
  supabasePortHostIp = "127.0.0.1",
  supabasePortHostPort = "56322",
  supabasePortProtocol = "tcp",
  portBindingBehavior = "local-only-port-binding",
}: {
  networkId: string;
  driver?: string;
  hostBinding?: string;
  networkNameMissing?: boolean;
  supabaseStatus?: boolean;
  supabasePortHostIp?: string;
  supabasePortHostPort?: string;
  supabasePortProtocol?: string;
  portBindingBehavior?: string;
}) {
  const calls: string[][] = [];
  const run = async (_command: string, args: string[]) => {
    calls.push(args);
    if (args[0] === "context" && args[1] === "show") return { code: 0, stdout: "desktop-linux\n", stderr: "" };
    if (args[0] === "context" && args[1] === "inspect") return { code: 0, stdout: `${JSON.stringify(localDockerEndpoint)}\n`, stderr: "" };
    if (args[0] === "--host" && args[1] === localDockerEndpoint && args[2] === "info") return { code: 0, stdout: "29.0.0\n", stderr: "" };
    if (args[0] === "--host" && args[1] === localDockerEndpoint && args[2] === "network" && args[3] === "inspect") {
      if (networkNameMissing && args[4] === localNetworkName) return { code: 1, stdout: "", stderr: "network not found" };
      return {
        code: 0,
        stdout: `${JSON.stringify({
          Id: networkId,
          Driver: driver,
          Options: { "com.docker.network.bridge.host_binding_ipv4": hostBinding },
        })}\n`,
        stderr: "",
      };
    }
    if (args[0] === "--host" && args[1] === localDockerEndpoint && args[2] === "network" && args[3] === "create") {
      return { code: 0, stdout: `${networkId}\n`, stderr: "" };
    }
    if (supabaseStatus && args[0] === "--host" && args[1] === localDockerEndpoint && args[2] === "ps") {
      return {
        code: 0,
        stdout: "container-db supabase_db_goodz-menu-reboot-001\ncontainer-kong supabase_kong_goodz-menu-reboot-001\n",
        stderr: "",
      };
    }
    if (supabaseStatus && args[0] === "--host" && args[1] === localDockerEndpoint && args[2] === "inspect") {
      const inspectedIds = args.slice(3, args.indexOf("--format"));
      return {
        code: 0,
        stdout: inspectedIds.map(() => JSON.stringify({
          [`5432/${supabasePortProtocol}`]: [{ HostIp: supabasePortHostIp, HostPort: supabasePortHostPort }],
        })).join("\n"),
        stderr: "",
      };
    }
    if (supabaseStatus && args[0]?.endsWith("supabase.js") && args[1] === "status") {
      return {
        code: 0,
        stdout: JSON.stringify({ API_URL: "http://127.0.0.1:56321", ANON_KEY: "sb_publishable_synthetic" }),
        stderr: "",
      };
    }
    return { code: 1, stdout: "", stderr: "unexpected command" };
  };

  return {
    calls,
    run,
    endpoint: localDockerEndpoint,
    dockerCliPath,
    getPortBindingBehavior: () => portBindingBehavior,
  };
}

function mockWindowsPathAttributes(
  filePath: string,
  reparsePaths: string[] = [],
  missingPaths: string[] = [],
  inspectedPaths?: string[][],
) {
  const target = filePath.toLowerCase();
  const reparseTargets = new Set(reparsePaths.map((value) => value.toLowerCase()));
  const missingTargets = new Set(missingPaths.map((value) => value.toLowerCase()));
  return (components: string[]) => {
    inspectedPaths?.push(components);
    const attributes: Array<number | null> = [];
    for (const component of components) {
      const normalized = component.toLowerCase();
      if (missingTargets.has(normalized)) {
        attributes.push(null);
        break;
      }
      if (reparseTargets.has(normalized)) {
        attributes.push(0x410);
        break;
      }
      attributes.push(normalized === target ? 0x80 : 0x10);
    }
    return attributes;
  };
}

describe("Docker Desktop port binding configuration", () => {
  it("reads the port binding mode from the user settings file", () => {
    const appData = mkdtempSync(path.join(tmpdir(), "goodz-docker-settings-"));
    const dockerSettingsDirectory = path.join(appData, "Docker");
    mkdirSync(dockerSettingsDirectory, { recursive: true });
    writeFileSync(
      path.join(dockerSettingsDirectory, "settings-store.json"),
      JSON.stringify({ portBindingBehavior: "local-only-port-binding" }),
      "utf8",
    );

    expect(readDockerDesktopPortBindingBehavior(appData)).toBe("local-only-port-binding");

    rmSync(appData, { recursive: true, force: true });
  });

  it("reads Docker Desktop's serialized PascalCase setting name", () => {
    const appData = mkdtempSync(path.join(tmpdir(), "goodz-docker-settings-"));
    const dockerSettingsDirectory = path.join(appData, "Docker");
    mkdirSync(dockerSettingsDirectory, { recursive: true });
    writeFileSync(
      path.join(dockerSettingsDirectory, "settings-store.json"),
      JSON.stringify({ PortBindingBehavior: "default-local-port-binding" }),
      "utf8",
    );

    expect(readDockerDesktopPortBindingBehavior(appData)).toBe("default-local-port-binding");

    rmSync(appData, { recursive: true, force: true });
  });

  it("requires loopback-only port binding on Windows and permits non-Windows engines", () => {
    expect(() => assertDockerDesktopLoopbackPortBinding("default-local-port-binding", "win32")).not.toThrow();
    expect(() => assertDockerDesktopLoopbackPortBinding("local-only-port-binding", "win32")).not.toThrow();
    expect(() => assertDockerDesktopLoopbackPortBinding("default-port-binding", "win32")).toThrow("Localhost only");
    expect(() => assertDockerDesktopLoopbackPortBinding(undefined, "win32")).toThrow("Localhost only");
    expect(() => assertDockerDesktopLoopbackPortBinding(undefined, "linux")).not.toThrow();
  });
});

describe("Supabase CLI output sanitization", () => {
  it("redacts publishable and secret keys printed as whitespace-separated labels", () => {
    const publishable = `${["sb", "publishable"].join("_")}_localPublicTestKey`;
    const secret = `${["sb", "secret"].join("_")}_localSecretTestKey`;
    const standaloneSecret = `${["sb", "secret"].join("_")}_standaloneTestToken`;
    const output = [
      `Publishable ${publishable}`,
      `Secret ${secret}`,
      `Unlabeled ${standaloneSecret}`,
    ].join("\n");

    const sanitized = sanitizeSupabaseOutput(output);

    expect(sanitized).toContain("Publishable [redacted]");
    expect(sanitized).toContain("Secret [redacted]");
    expect(sanitized).not.toContain(publishable);
    expect(sanitized).not.toContain(secret);
    expect(sanitized).not.toContain(standaloneSecret);
  });
});

describe("isolated local Supabase configuration", () => {
  it("connects the Docker web app through the Supabase-only local bridge", () => {
    const compose = read("compose.yaml");
    const script = read("scripts/compose-local.mjs");
    expect(compose).toContain("SUPABASE_API_URL: https://supabase-tls:8443");
    expect(compose).toContain('"127.0.0.1:56443:8443"');
    expect(compose).toContain('"[::1]:56443:8443"');
    expect(compose).toContain("NODE_EXTRA_CA_CERTS: /run/goodz/supabase-root-ca.crt");
    expect(compose).toContain("create_host_path: false");
    expect(compose).toContain("supabase_tls_data");
    expect(compose).toContain("caddy:2.11.7-alpine@sha256:");
    expect(read("supabase/Caddyfile")).toContain("tls internal");
    expect(read("supabase/Caddyfile")).toContain("reverse_proxy kong:8000");
    expect(read(".dockerignore")).toContain(".local-tls");
    expect(read(".gitignore")).toContain("/.local-tls/");
    expect(compose).toContain('name: "${GOODZ_SUPABASE_NETWORK_ID:?Run pnpm docker:up to verify the local Supabase network}"');
    expect(script).toContain("GOODZ_SUPABASE_NETWORK_ID: localNetworkName");
    expect(script).toContain("GOODZ_SUPABASE_NETWORK_ID: local.dockerNetworkId");
    expect(compose).toContain("external: true");
    expect(compose).not.toContain("host.docker.internal");
  });

  it("starts the TLS proxy on the validated local network and exports only its public root CA", async () => {
    const networkId = "7".repeat(64);
    const harness = createDockerHarness({ networkId });
    const temporaryRoot = mkdtempSync(path.join(tmpdir(), "goodz-tls-ca-"));
    const caPath = path.join(temporaryRoot, "supabase-root-ca.crt");
    const calls: string[][] = [];
    const containerId = "abcdef012345";
    const run = async (command: string, args: string[]) => {
      calls.push(args);
      if (args[0] === "--host" && args[2] === "compose" && args[3] === "up") {
        return { code: 0, stdout: "", stderr: "" };
      }
      if (args[0] === "--host" && args[2] === "compose" && args[3] === "ps") {
        return { code: 0, stdout: `${containerId}\n`, stderr: "" };
      }
      if (args[0] === "--host" && args[2] === "inspect" && args[3] === containerId) {
        return {
          code: 0,
        stdout: `${JSON.stringify({ "8443/tcp": [
          { HostIp: "127.0.0.1", HostPort: "56443" },
          { HostIp: "::1", HostPort: "56443" },
        ] })}\n`,
          stderr: "",
        };
      }
      if (args[0] === "--host" && args[2] === "cp") {
        writeFileSync(args.at(-1) as string, "mocked-public-root-ca", "utf8");
        return { code: 0, stdout: "", stderr: "" };
      }
      return harness.run(command, args);
    };

    try {
      await expect(ensureLocalSupabaseTlsProxy(harness.endpoint, networkId, {
        run,
        dockerCliPath: harness.dockerCliPath,
        caPath,
        platform: "linux",
        readCa: () => Buffer.from("public-root-ca"),
        verifyTls: async ({ host, port }) => {
          expect(host).toBe("localhost");
          expect(port).toBe(56443);
        },
        wait: async () => undefined,
      })).resolves.toMatchObject({
        nativeApiUrl: "https://localhost:56443",
        dockerApiUrl: "https://supabase-tls:8443",
        caPath,
        containerId,
      });
      expect(calls).toContainEqual([
        "--host", harness.endpoint, "compose", "up", "-d", "--no-deps", "supabase-tls",
      ]);
      expect(calls).toContainEqual([
        "--host", harness.endpoint, "cp",
        `${containerId}:/data/caddy/pki/authorities/local/root.crt`, path.resolve(caPath),
      ]);
    } finally {
      rmSync(temporaryRoot, { recursive: true, force: true });
    }
  });

  it("sends the expected hostname as SNI and requires trusted certificate validation", async () => {
    const socket = Object.assign(new EventEmitter(), {
      authorized: true,
      setTimeout: () => undefined,
      destroy: () => undefined,
      end: () => undefined,
    });
    let connectionOptions: Record<string, unknown> | undefined;
    const connect = (options: Record<string, unknown>) => {
      connectionOptions = options;
      queueMicrotask(() => socket.emit("secureConnect"));
      return socket;
    };
    const ca = Buffer.from("public-root-ca");
    const fakeConnect = connect as unknown as typeof import("node:tls").connect;

    await expect(verifyNativeTls({ host: "localhost", port: 56443, ca }, { connect: fakeConnect })).resolves.toBeUndefined();
    expect(connectionOptions).toEqual({
      host: "localhost",
      port: 56443,
      servername: "localhost",
      ca,
      rejectUnauthorized: true,
    });
  });

  it("stops a proxy published beyond explicit IPv4 loopback", async () => {
    const harness = createDockerHarness({ networkId: "8".repeat(64) });
    const calls: string[][] = [];
    let running = true;
    const run = async (command: string, args: string[]) => {
      calls.push(args);
      if (args[0] === "--host" && args[2] === "compose" && args[3] === "up") {
        return { code: 0, stdout: "", stderr: "" };
      }
      if (args[0] === "--host" && args[2] === "compose" && args[3] === "ps") {
        return { code: 0, stdout: "abcdef012345\n", stderr: "" };
      }
      if (args[0] === "--host" && args[2] === "compose" && args[3] === "stop") {
        running = false;
        return { code: 0, stdout: "", stderr: "" };
      }
      if (args[0] === "--host" && args[2] === "ps" && args.includes("--filter")) {
        return { code: 0, stdout: running ? "abcdef012345\n" : "", stderr: "" };
      }
      if (args[0] === "--host" && args[2] === "inspect") {
        return {
          code: 0,
          stdout: `${JSON.stringify({ "8443/tcp": [{ HostIp: "0.0.0.0", HostPort: "56443" }] })}\n`,
          stderr: "",
        };
      }
      return harness.run(command, args);
    };

    await expect(ensureLocalSupabaseTlsProxy(harness.endpoint, "8".repeat(64), {
      run,
      dockerCliPath: harness.dockerCliPath,
      caPath: path.join(tmpdir(), "unused-goodz-ca.crt"),
      platform: "linux",
    })).rejects.toThrow("fora do loopback esperado");
    expect(calls).toContainEqual([
      "--host", harness.endpoint, "compose", "stop", "supabase-tls",
    ]);
  });

  it("fails closed when the proxy cannot be confirmed stopped after validation fails", async () => {
    const harness = createDockerHarness({ networkId: "9".repeat(64) });
    const running = true;
    const run = async (command: string, args: string[]) => {
      if (args[0] === "--host" && args[2] === "compose" && args[3] === "up") {
        return { code: 0, stdout: "", stderr: "" };
      }
      if (args[0] === "--host" && args[2] === "compose" && args[3] === "ps") {
        return { code: 0, stdout: "abcdef012345\n", stderr: "" };
      }
      if (args[0] === "--host" && args[2] === "compose" && args[3] === "stop") {
        return { code: 0, stdout: "", stderr: "" };
      }
      if (args[0] === "--host" && args[2] === "ps" && args.includes("--filter")) {
        return { code: 0, stdout: running ? "abcdef012345\n" : "", stderr: "" };
      }
      if (args[0] === "--host" && args[2] === "inspect") {
        return {
          code: 0,
          stdout: `${JSON.stringify({ "8443/tcp": [{ HostIp: "0.0.0.0", HostPort: "56443" }] })}\n`,
          stderr: "",
        };
      }
      return harness.run(command, args);
    };

    await expect(ensureLocalSupabaseTlsProxy(harness.endpoint, "9".repeat(64), {
      run,
      dockerCliPath: harness.dockerCliPath,
      caPath: path.join(tmpdir(), "unused-goodz-ca.crt"),
      platform: "linux",
    })).rejects.toMatchObject({ code: "LOCAL_TLS_PROXY_STOP_FAILED" });
    expect(running).toBe(true);
    expect(read("scripts/dev.mjs")).toContain('error.code === "LOCAL_TLS_PROXY_STOP_FAILED"');
  });

  it("stops and verifies its proxy by Compose labels when the local network cannot be inspected", async () => {
    const harness = createDockerHarness({ networkId: "a".repeat(64) });
    const calls: string[][] = [];
    let running = true;
    const run = async (command: string, args: string[]) => {
      calls.push(args);
      if (args[0] === "--host" && args[2] === "ps" && args.includes("--filter")) {
        return { code: 0, stdout: running ? "abcdef012345\n" : "", stderr: "" };
      }
      if (args[0] === "--host" && args[2] === "stop") {
        running = false;
        return { code: 0, stdout: "abcdef012345\n", stderr: "" };
      }
      return harness.run(command, args);
    };

    await expect(stopLocalSupabaseTlsProxy(harness.endpoint, undefined, {
      run,
      dockerCliPath: harness.dockerCliPath,
    })).resolves.toBeUndefined();
    expect(running).toBe(false);
    expect(calls).toContainEqual([
      "--host", harness.endpoint, "stop", "abcdef012345",
    ]);
    expect(calls.at(-1)).toEqual([
      "--host", harness.endpoint, "ps", "-q",
      "--filter", "label=com.docker.compose.project=goodz-menu-reboot-001",
      "--filter", "label=com.docker.compose.service=supabase-tls",
    ]);
  });

  it("rejects a private key in the app's CA trust file", () => {
    const temporaryRoot = mkdtempSync(path.join(tmpdir(), "goodz-tls-private-key-"));
    const caPath = path.join(temporaryRoot, "root.crt");
    writeFileSync(caPath, "-----BEGIN PRIVATE KEY-----\nsynthetic\n-----END PRIVATE KEY-----\n", "utf8");
    try {
      expect(() => readAndValidateRootCertificate(caPath)).toThrow("somente um certificado público");
    } finally {
      rmSync(temporaryRoot, { recursive: true, force: true });
    }
  });

  it("keeps database reset on the isolated Supabase network", () => {
    const script = read("scripts/supabase-local.mjs");
    const confirmation = script.indexOf('if (process.env.GOODZ_ALLOW_LOCAL_DB_RESET !== "1")');
    const ensureNetwork = script.indexOf("const network = await ensureLoopbackDockerNetwork();", confirmation);
    const verifyRuntime = script.indexOf("await readLocalSupabaseStatus(dockerEndpoint);", ensureNetwork);
    const reset = script.indexOf('runSupabase(["db", "reset", "--network-id", network.networkId]', confirmation);
    expect(confirmation).toBeGreaterThanOrEqual(0);
    expect(ensureNetwork).toBeGreaterThan(confirmation);
    expect(verifyRuntime).toBeGreaterThan(ensureNetwork);
    expect(reset).toBeGreaterThan(verifyRuntime);
  });

  it("pins Supabase start and reset to the validated Docker network identity", () => {
    const script = read("scripts/supabase-local.mjs");
    expect(script).toContain('runSupabase(["start", "--network-id", network.networkId], dockerEndpoint)');
    expect(script).toContain('runSupabase(["db", "reset", "--network-id", network.networkId], dockerEndpoint)');
    expect(script).not.toContain('"--network-id", "goodz-menu-reboot-001-loopback"');
  });

  it("creates the local bridge with loopback-only port binding", async () => {
    const networkId = "a".repeat(64);
    const harness = createDockerHarness({ networkId, networkNameMissing: true });
    await expect(ensureLoopbackDockerNetwork(
      harness.run, harness.dockerCliPath, harness.getPortBindingBehavior, "win32",
    )).resolves.toEqual({
      endpoint: harness.endpoint,
      networkId,
    });
    expect(harness.calls.find((args) => args[2] === "network" && args[3] === "create")).toEqual([
      "--host", harness.endpoint, "network", "create", "--driver", "bridge", "--opt",
      "com.docker.network.bridge.host_binding_ipv4=127.0.0.1", "goodz-menu-reboot-001-loopback",
    ]);
    expect(harness.calls.at(-1)).toEqual([
      "--host", harness.endpoint, "network", "inspect", networkId, "--format", "{{json .}}",
    ]);
  });

  it("refuses an existing local bridge without loopback-only port binding", async () => {
    const harness = createDockerHarness({ networkId: "b".repeat(64), hostBinding: "0.0.0.0" });
    await expect(ensureLoopbackDockerNetwork(
      harness.run, harness.dockerCliPath, harness.getPortBindingBehavior, "win32",
    )).rejects.toThrow("não está limitada ao loopback");
    expect(harness.calls.some((args) => args[2] === "network" && args[3] === "create")).toBe(false);
  });

  it("refuses a same-named network whose driver cannot enforce bridge host binding", async () => {
    const harness = createDockerHarness({ networkId: "c".repeat(64), driver: "macvlan" });
    await expect(ensureLoopbackDockerNetwork(
      harness.run, harness.dockerCliPath, harness.getPortBindingBehavior, "win32",
    )).rejects.toThrow("driver bridge");
    expect(harness.calls.some((args) => args[2] === "network" && args[3] === "create")).toBe(false);
  });

  it("reports Supabase as isolated only after verifying the bridge network identity", async () => {
    const networkId = "d".repeat(64);
    const harness = createDockerHarness({ networkId, supabaseStatus: true });
    await expect(readLocalSupabaseStatus(harness.endpoint, harness.run, harness.dockerCliPath)).resolves.toMatchObject({
      apiUrl: "https://localhost:56443",
      dockerEndpoint: harness.endpoint,
      dockerNetworkId: networkId,
    });
    expect(harness.calls.some((args) => args[2] === "network" && args[3] === "inspect")).toBe(true);
  });

  it("refuses to report Supabase available when a published port is bound to all interfaces", async () => {
    const harness = createDockerHarness({
      networkId: "e".repeat(64),
      supabaseStatus: true,
      supabasePortHostIp: "0.0.0.0",
    });
    await expect(readLocalSupabaseStatus(harness.endpoint, harness.run, harness.dockerCliPath))
      .rejects.toThrow("publicada fora do loopback");
  });

  it("accepts unspecified published host IP only with Docker Desktop localhost binding", async () => {
    const harness = createDockerHarness({
      networkId: "1".repeat(64),
      supabaseStatus: true,
      supabasePortHostIp: "",
    });
    await expect(readLocalSupabaseStatus(
      harness.endpoint, harness.run, harness.dockerCliPath, () => "default-local-port-binding", "win32",
      () => [{ LocalAddress: "127.0.0.1", LocalPort: 56322 }],
    )).resolves.toMatchObject({ dockerNetworkId: "1".repeat(64) });
    await expect(readLocalSupabaseStatus(
      harness.endpoint, harness.run, harness.dockerCliPath, () => "default-port-binding", "win32",
    )).rejects.toThrow("publicada fora do loopback");
    await expect(verifySupabasePortBindingsLoopback(
      harness.endpoint, harness.run, harness.dockerCliPath, () => "default-local-port-binding", "linux",
    )).rejects.toThrow("publicada fora do loopback");
  });

  it("rejects a stale implicit binding when its actual Windows listener is wildcard", async () => {
    const harness = createDockerHarness({
      networkId: "2".repeat(64),
      supabaseStatus: true,
      supabasePortHostIp: "",
    });
    await expect(readLocalSupabaseStatus(
      harness.endpoint, harness.run, harness.dockerCliPath, () => "default-local-port-binding", "win32",
      () => [{ LocalAddress: "0.0.0.0", LocalPort: 56322 }],
    )).rejects.toThrow("publicada fora do loopback");
  });

  it("fails closed when an implicit binding has no verifiable host listener", async () => {
    const harness = createDockerHarness({
      networkId: "3".repeat(64),
      supabaseStatus: true,
      supabasePortHostIp: "",
    });
    await expect(readLocalSupabaseStatus(
      harness.endpoint, harness.run, harness.dockerCliPath, () => "local-only-port-binding", "win32",
      () => [],
    )).rejects.toThrow("listeners locais");
    await expect(readLocalSupabaseStatus(
      harness.endpoint, harness.run, harness.dockerCliPath, () => "local-only-port-binding", "win32",
      () => { throw new Error("query failed"); },
    )).rejects.toThrow("listeners locais");
  });

  it("rejects malformed or unrelated listener records for implicit bindings", async () => {
    const harness = createDockerHarness({
      networkId: "4".repeat(64),
      supabaseStatus: true,
      supabasePortHostIp: "",
    });
    await expect(readLocalSupabaseStatus(
      harness.endpoint, harness.run, harness.dockerCliPath, () => "default-local-port-binding", "win32",
      () => [{ LocalAddress: "127.0.0.1", LocalPort: "56322" }],
    )).rejects.toThrow("publicada fora do loopback");
    await expect(readLocalSupabaseStatus(
      harness.endpoint, harness.run, harness.dockerCliPath, () => "default-local-port-binding", "win32",
      () => [{ LocalAddress: "127.0.0.1", LocalPort: 56323 }],
    )).rejects.toThrow("publicada fora do loopback");
  });

  it("refuses an implicit binding whose Docker host port is invalid", async () => {
    const harness = createDockerHarness({
      networkId: "5".repeat(64),
      supabaseStatus: true,
      supabasePortHostIp: "",
      supabasePortHostPort: "65536",
    });
    await expect(readLocalSupabaseStatus(
      harness.endpoint, harness.run, harness.dockerCliPath, () => "default-local-port-binding", "win32",
      () => [{ LocalAddress: "127.0.0.1", LocalPort: 56322 }],
    )).rejects.toThrow("não puderam ser verificadas");
  });

  it("refuses implicit non-TCP bindings that the listener check cannot verify", async () => {
    const harness = createDockerHarness({
      networkId: "6".repeat(64),
      supabaseStatus: true,
      supabasePortHostIp: "",
      supabasePortProtocol: "udp",
    });
    await expect(readLocalSupabaseStatus(
      harness.endpoint, harness.run, harness.dockerCliPath, () => "default-local-port-binding", "win32",
      () => [{ LocalAddress: "127.0.0.1", LocalPort: 56322 }],
    )).rejects.toThrow("não puderam ser verificadas");
  });

  it("blocks Windows stack creation when Docker Desktop keeps the global port binding", async () => {
    const harness = createDockerHarness({
      networkId: "f".repeat(64),
      portBindingBehavior: "default-port-binding",
    });
    await expect(ensureLoopbackDockerNetwork(
      harness.run, harness.dockerCliPath, harness.getPortBindingBehavior, "win32",
    )).rejects.toThrow("Localhost by default ou Localhost only");
    expect(harness.calls.some((args) => args[2] === "network")).toBe(false);
  });

  it("uses a dedicated project id and non-default ports", () => {
    const config = read("supabase/config.toml");
    expect(config).toContain('project_id = "goodz-menu-reboot-001"');
    for (const port of [56320, 56321, 56322, 56323, 56324, 56327, 56329]) {
      expect(config).toMatch(new RegExp(`port\\s*=\\s*${port}(?:\\s|$)`));
    }
    expect(config).not.toMatch(/^port\s*=\s*5432\d/m);
  });

  it("does not seed or retain old business migrations", () => {
    const config = read("supabase/config.toml");
    expect(config).toMatch(/\[db\.seed\][\s\S]*?enabled\s*=\s*false/);
    expect(config).toMatch(/sql_paths\s*=\s*\[\]/);
    const migrationsDirectory = path.join(repositoryRoot, "supabase", "migrations");
    const migrations = existsSync(migrationsDirectory) ? readdirSync(migrationsDirectory) : [];
    expect(migrations.filter((file) => file.endsWith(".sql"))).toEqual([]);
  });

  it("keeps runtime configuration free of service-role variables and remote endpoints", () => {
    const protectedRuntime = [
      read(".env.example"),
      read("compose.yaml"),
      read("supabase/Caddyfile"),
      read("Dockerfile"),
      read("src/app/api/ready/route.ts"),
      read("src/lib/runtime/readiness.ts"),
    ].join("\n");
    const serviceRoleName = ["SUPABASE", "SERVICE", "ROLE", "KEY"].join("_");
    expect(protectedRuntime).not.toContain(serviceRoleName);
    expect(protectedRuntime).not.toMatch(/https:\/\/[^\s"']+\.supabase\.co/i);
    expect(existsSync(path.join(repositoryRoot, "supabase", ".temp", "project-ref"))).toBe(false);
  });
});

describe("local Docker endpoint policy", () => {
  it("resolves Docker Desktop from known install locations instead of ambient PATH", () => {
    const environment = {
      ...process.env,
      SystemDrive: "C:",
      ProgramFiles: "C:\\Program Files",
      LOCALAPPDATA: "C:\\Users\\developer\\AppData\\Local",
      PATH: "C:\\untrusted\\bin",
    };
    const userInstall = "C:\\Users\\developer\\AppData\\Local\\Programs\\DockerDesktop\\resources\\bin\\docker.exe";

    expect(resolveDockerCliPath(
      environment,
      "win32",
      () => new Set(["C:"]),
      (candidate) => candidate,
      mockWindowsPathAttributes(userInstall) as never,
    )).toBe(userInstall);
  });

  it("refuses Docker Desktop install roots on UNC network shares", () => {
    const environment = {
      ...process.env,
      SystemDrive: "C:",
      ProgramFiles: "\\\\example\\share",
      LOCALAPPDATA: "\\\\example\\users\\developer\\AppData\\Local",
    };

    expect(() => resolveDockerCliPath(environment, "win32")).toThrow("caminho local padrão");
  });

  it("accepts a standard Docker Desktop installation on a fixed drive outside SystemDrive", () => {
    const environment = {
      ...process.env,
      SystemDrive: "C:",
      ProgramFiles: "D:\\Program Files",
      LOCALAPPDATA: "D:\\Users\\developer\\AppData\\Local",
    };
    const systemInstall = "D:\\Program Files\\Docker\\Docker\\resources\\bin\\docker.exe";

    expect(resolveDockerCliPath(
      environment,
      "win32",
      () => new Set(["D:"]),
      (candidate) => candidate,
      mockWindowsPathAttributes(systemInstall) as never,
    )).toBe(systemInstall);
  });

  it("refuses a mapped drive even when SystemDrive is spoofed to match it", () => {
    const environment = {
      ...process.env,
      SystemDrive: "Z:",
      ProgramFiles: "Z:\\mapped-root\\Program Files",
      LOCALAPPDATA: "Z:\\mapped-root\\Users\\developer\\AppData\\Local",
    };
    const inspectedPaths: string[][] = [];

    expect(() => resolveDockerCliPath(
      environment,
      "win32",
      () => new Set(["C:"]),
      (candidate) => candidate,
      ((components: string[]) => {
        inspectedPaths.push(components);
        return components.map(() => 0x80);
      }) as never,
    )).toThrow("volume local fixo");
    expect(inspectedPaths).toEqual([]);
  });

  it("rejects a Docker executable whose final path resolves to a UNC share", () => {
    const environment = {
      ...process.env,
      SystemDrive: "C:",
      ProgramFiles: "C:\\Program Files",
      LOCALAPPDATA: "C:\\Users\\developer\\AppData\\Local",
    };
    const systemInstall = "C:\\Program Files\\Docker\\Docker\\resources\\bin\\docker.exe";

    expect(() => resolveDockerCliPath(
      environment,
      "win32",
      () => new Set(["C:"]),
      () => "\\\\?\\UNC\\example\\share\\docker.exe",
      mockWindowsPathAttributes(systemInstall) as never,
    )).toThrow("volume local fixo");
  });

  it("refuses any reparse-point attribute before resolving the final path", () => {
    const environment = {
      ...process.env,
      ProgramFiles: "C:\\missing",
      LOCALAPPDATA: "C:\\Users\\developer\\AppData\\Local",
    };
    const reparseComponent = "C:\\Users\\developer\\AppData";
    const userInstall = "C:\\Users\\developer\\AppData\\Local\\Programs\\DockerDesktop\\resources\\bin\\docker.exe";
    const inspectedPaths: string[][] = [];
    const resolvedPaths: string[] = [];
    expect(() => resolveDockerCliPath(
      environment,
      "win32",
      () => new Set(["C:"]),
      (candidate) => {
        resolvedPaths.push(candidate);
        return candidate;
      },
      mockWindowsPathAttributes(userInstall, [reparseComponent], ["C:\\missing"], inspectedPaths) as never,
    )).toThrow("volume local fixo");
    expect(inspectedPaths[1]).toContain(reparseComponent);
    expect(resolvedPaths).toEqual([]);
  });

  it.skipIf(process.platform !== "win32")("reads a real Windows junction's raw reparse attribute", () => {
    const temporaryParent = path.resolve(tmpdir());
    const temporaryRoot = mkdtempSync(path.join(temporaryParent, "goodz-reparse-"));
    const resolvedRoot = path.resolve(temporaryRoot);
    const isInsideTemporaryParent = resolvedRoot.toLowerCase().startsWith(`${temporaryParent.toLowerCase()}\\`);
    const target = path.join(resolvedRoot, "target");
    const junction = path.join(resolvedRoot, "docker-install");
    const finalPaths: string[] = [];

    try {
      expect(isInsideTemporaryParent).toBe(true);
      mkdirSync(target);
      symlinkSync(target, junction, "junction");
      const driveRoot = path.win32.parse(resolvedRoot).root;
      const drive = driveRoot.slice(0, 2).toUpperCase();
      const components = [driveRoot];
      let currentPath = driveRoot;
      for (const segment of path.win32.relative(driveRoot, junction).split(path.win32.sep).filter(Boolean)) {
        currentPath = path.win32.join(currentPath, segment);
        components.push(currentPath);
      }
      const attributes = readWindowsPathAttributes(components);
      const junctionIndex = components.findIndex((component) => component.toLowerCase() === junction.toLowerCase());
      expect(attributes).toHaveLength(junctionIndex + 1);
      expect((attributes[junctionIndex] ?? 0) & 0x400).not.toBe(0);

      expect(() => resolveDockerCliPath(
        { ...process.env, ProgramFiles: junction, LOCALAPPDATA: undefined },
        "win32",
        () => new Set([drive]),
        (candidate) => {
          finalPaths.push(candidate);
          return candidate;
        },
      )).toThrow("volume local fixo");
      expect(finalPaths).toEqual([]);
    } finally {
      if (isInsideTemporaryParent) rmSync(resolvedRoot, { recursive: true, force: true });
    }
  });

  it("classifies only fixed logical drives from the Windows volume inventory", () => {
    const inventory = "C:|3\r\nZ:|4\r\nE:|2";

    expect(readWindowsFixedDriveLetters(() => inventory)).toEqual(new Set(["C:"]));
  });

  it("fails closed when the Windows volume inventory cannot be read", () => {
    expect(() => readWindowsFixedDriveLetters(() => { throw new Error("query failed"); }))
      .toThrow("tipo dos volumes locais não pôde ser verificado");
    expect(() => readWindowsFixedDriveLetters(() => "not-json"))
      .toThrow("inventário de volumes locais não pôde ser lido");
  });

  it.each([
    ["npipe:////./pipe/dockerDesktopLinuxEngine", true],
    ["npipe:////./pipe/docker_engine", true],
    ["tcp://127.0.0.1:2375", false],
    ["tcp://localhost:2376", false],
    ["ssh://docker.example.com", false],
    ["unix:///var/run/docker.sock", false],
    ["unix://docker.example.com/run/docker.sock", false],
    ["npipe:////./pipe/remoteEngine", false],
    ["npipe:////remote/pipe/dockerDesktopLinuxEngine", false],
  ])("checks endpoint locality for %s", (endpoint, isLocal) => {
    expect(isLocalDockerEndpoint(endpoint)).toBe(isLocal);
  });

  it("pins Docker CLI and Supabase processes to the inspected local pipe", () => {
    const endpoint = "npipe:////./pipe/dockerDesktopLinuxEngine";
    expect(dockerCommandArgs(endpoint, ["compose", "down"])).toEqual([
      "--host", endpoint, "compose", "down",
    ]);

    const dockerCliPath = process.platform === "win32"
      ? "C:\\Program Files\\Docker\\Docker\\resources\\bin\\docker.exe"
      : "docker";
    const environment = dockerRuntimeEnvironment(endpoint, {
      DOCKER_CONTEXT: "remote",
      DOCKER_HOST: "tcp://127.0.0.1:2375",
      GOODZ_ENVIRONMENT: "local",
    }, dockerCliPath) as Record<string, string | undefined>;
    expect(environment).toMatchObject({ DOCKER_HOST: endpoint, GOODZ_ENVIRONMENT: "local" });
    expect(environment).not.toHaveProperty("DOCKER_CONTEXT");
    if (path.win32.isAbsolute(dockerCliPath)) {
      expect(environment.PATH).toBe(path.win32.dirname(dockerCliPath));
    } else {
      expect(environment).not.toHaveProperty("PATH");
    }
    expect(environment).not.toHaveProperty("Path");
  });

  it("keeps the inspected endpoint if the selected context changes before the daemon probe", async () => {
    const endpoint = "npipe:////./pipe/dockerDesktopLinuxEngine";
    let activeContext = "desktop-linux";
    const calls: string[][] = [];
    const run = async (_command: string, args: string[]) => {
      calls.push(args);
      if (args[0] === "context" && args[1] === "show") {
        return { code: 0, stdout: `${activeContext}\n`, stderr: "" };
      }
      if (args[0] === "context" && args[1] === "inspect") {
        activeContext = "remote";
        return { code: 0, stdout: `${JSON.stringify(endpoint)}\n`, stderr: "" };
      }
      if (args[0] === "--host" && args[1] === endpoint) {
        return { code: 0, stdout: "28.0.0\n", stderr: "" };
      }
      return { code: 1, stdout: "", stderr: "un-pinned endpoint" };
    };

    const dockerCliPath = "C:\\Program Files\\Docker\\Docker\\resources\\bin\\docker.exe";
    await expect(ensureLocalDocker(run, dockerCliPath)).resolves.toEqual({ endpoint, serverVersion: "28.0.0" });
    expect(calls[2]).toEqual(["--host", endpoint, "info", "--format", "{{.ServerVersion}}"]);
  });
});
