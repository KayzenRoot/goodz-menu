import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  dockerCommandArgs,
  dockerRuntimeEnvironment,
  ensureLocalDocker,
  isLocalDockerEndpoint,
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
    expect(read("scripts/supabase-local.mjs")).toContain(
      'runSupabase(["db", "reset", "--network-id", "goodz-menu-reboot-001-loopback"]',
    );
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
    });
    expect(environment).toMatchObject({ DOCKER_HOST: endpoint, GOODZ_ENVIRONMENT: "local" });
    expect(environment).not.toHaveProperty("DOCKER_CONTEXT");
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
