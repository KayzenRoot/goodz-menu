import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { generateTypesFile } from "../../../scripts/generate-supabase-types.mjs";

const temporaryDirectories: string[] = [];

async function makeTarget(initialContents: string) {
  const directory = await mkdtemp(join(tmpdir(), "goodz-supabase-types-"));
  temporaryDirectories.push(directory);
  const targetPath = join(directory, "database.types.ts");
  await writeFile(targetPath, initialContents, "utf8");
  return { directory, targetPath };
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe("Supabase type generation file replacement", () => {
  it("replaces the tracked target only after a successful generation", async () => {
    const { directory, targetPath } = await makeTarget("old generated types\n");

    await generateTypesFile({
      targetPath,
      command: process.execPath,
      args: ["-e", 'process.stdout.write("new generated types\\n")'],
    });

    await expect(readFile(targetPath, "utf8")).resolves.toBe("new generated types\n");
    await expect(readdir(directory)).resolves.toEqual(["database.types.ts"]);
  });

  it("preserves the existing target and removes temporary output after generation fails", async () => {
    const { directory, targetPath } = await makeTarget("known-good generated types\n");

    await expect(generateTypesFile({
      targetPath,
      command: process.execPath,
      args: ["-e", 'process.stdout.write("partial output\\n"); process.exitCode = 17'],
    })).rejects.toThrow(/17/);

    await expect(readFile(targetPath, "utf8")).resolves.toBe("known-good generated types\n");
    await expect(readdir(directory)).resolves.toEqual(["database.types.ts"]);
  });
});
