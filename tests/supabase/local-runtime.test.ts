import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repositoryRoot = fileURLToPath(new URL("../../", import.meta.url));
const read = (relativePath: string) => readFileSync(path.join(repositoryRoot, relativePath), "utf8");

describe("isolated local Supabase configuration", () => {
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
