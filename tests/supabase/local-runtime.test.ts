import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  dockerCommandArgs,
  dockerRuntimeEnvironment,
  ensureLocalDocker,
  ensureLoopbackDockerNetwork,
  isLocalDockerEndpoint,
  resolveDockerCliPath,
} from "../../scripts/local-supabase-status.mjs";

const repositoryRoot = fileURLToPath(new URL("../../", import.meta.url));
const read = (relativePath: string) => readFileSync(path.join(repositoryRoot, relativePath), "utf8");

describe("isolated local Supabase configuration", () => {
  it("connects the Docker web app through the Supabase-only local bridge", () => {
    const compose = read("compose.yaml");
    expect(compose).toContain("SUPABASE_API_URL: http://kong:8000");
    expect(compose).toContain("name: goodz-menu-reboot-001-loopback");
    expect(compose).toContain("external: true");
    expect(compose).not.toContain("host.docker.internal");
  });

  it("keeps database reset on the isolated Supabase network", () => {
    const script = read("scripts/supabase-local.mjs");
    const confirmation = script.indexOf('if (process.env.GOODZ_ALLOW_LOCAL_DB_RESET !== "1")');
    const ensureNetwork = script.indexOf("dockerEndpoint = await ensureLoopbackDockerNetwork();", confirmation);
    const reset = script.indexOf('runSupabase(["db", "reset", "--network-id", "goodz-menu-reboot-001-loopback"]', confirmation);
    expect(confirmation).toBeGreaterThanOrEqual(0);
    expect(ensureNetwork).toBeGreaterThan(confirmation);
    expect(reset).toBeGreaterThan(ensureNetwork);
  });

  it("creates the local bridge with loopback-only port binding", async () => {
    const endpoint = "npipe:////./pipe/dockerDesktopLinuxEngine";
    const calls: string[][] = [];
    const run = async (_command: string, args: string[]) => {
      calls.push(args);
      if (args[0] === "context" && args[1] === "show") return { code: 0, stdout: "desktop-linux\n", stderr: "" };
      if (args[0] === "context" && args[1] === "inspect") return { code: 0, stdout: `${JSON.stringify(endpoint)}\n`, stderr: "" };
      if (args[0] === "--host" && args[1] === endpoint && args[2] === "info") return { code: 0, stdout: "29.0.0\n", stderr: "" };
      if (args[0] === "--host" && args[1] === endpoint && args[2] === "network" && args[3] === "inspect") {
        return { code: 1, stdout: "", stderr: "network not found" };
      }
      if (args[0] === "--host" && args[1] === endpoint && args[2] === "network" && args[3] === "create") {
        return { code: 0, stdout: "network-id\n", stderr: "" };
      }
      return { code: 1, stdout: "", stderr: "unexpected command" };
    };

    await expect(ensureLoopbackDockerNetwork(run)).resolves.toBe(endpoint);
    expect(calls.at(-1)).toEqual([
      "--host", endpoint, "network", "create", "--driver", "bridge", "--opt",
      "com.docker.network.bridge.host_binding_ipv4=127.0.0.1", "goodz-menu-reboot-001-loopback",
    ]);
  });

  it("refuses an existing local bridge without loopback-only port binding", async () => {
    const endpoint = "npipe:////./pipe/dockerDesktopLinuxEngine";
    const calls: string[][] = [];
    const run = async (_command: string, args: string[]) => {
      calls.push(args);
      if (args[0] === "context" && args[1] === "show") return { code: 0, stdout: "desktop-linux\n", stderr: "" };
      if (args[0] === "context" && args[1] === "inspect") return { code: 0, stdout: `${JSON.stringify(endpoint)}\n`, stderr: "" };
      if (args[0] === "--host" && args[1] === endpoint && args[2] === "info") return { code: 0, stdout: "29.0.0\n", stderr: "" };
      if (args[0] === "--host" && args[1] === endpoint && args[2] === "network" && args[3] === "inspect") {
        return { code: 0, stdout: '{"com.docker.network.bridge.host_binding_ipv4":"0.0.0.0"}', stderr: "" };
      }
      return { code: 1, stdout: "", stderr: "unexpected command" };
    };

    await expect(ensureLoopbackDockerNetwork(run)).rejects.toThrow("não está limitada ao loopback");
    expect(calls.some((args) => args[2] === "network" && args[3] === "create")).toBe(false);
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
      ProgramFiles: "C:\\Program Files",
      LOCALAPPDATA: "C:\\Users\\developer\\AppData\\Local",
      PATH: "C:\\untrusted\\bin",
    };
    const userInstall = "C:\\Users\\developer\\AppData\\Local\\Programs\\DockerDesktop\\resources\\bin\\docker.exe";

    expect(resolveDockerCliPath(environment, "win32", (candidate) => candidate === userInstall)).toBe(userInstall);
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

    const environment = dockerRuntimeEnvironment(endpoint, {
      DOCKER_CONTEXT: "remote",
      DOCKER_HOST: "tcp://127.0.0.1:2375",
      GOODZ_ENVIRONMENT: "local",
    }) as Record<string, string | undefined>;
    expect(environment).toMatchObject({ DOCKER_HOST: endpoint, GOODZ_ENVIRONMENT: "local" });
    expect(environment).not.toHaveProperty("DOCKER_CONTEXT");
    const dockerCliPath = resolveDockerCliPath();
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

    await expect(ensureLocalDocker(run)).resolves.toEqual({ endpoint, serverVersion: "28.0.0" });
    expect(calls[2]).toEqual(["--host", endpoint, "info", "--format", "{{.ServerVersion}}"]);
  });
});
