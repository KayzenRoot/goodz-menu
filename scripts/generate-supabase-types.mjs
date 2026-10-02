import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { open, rename, rm } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));
const defaultTarget = resolve(repositoryRoot, "src/lib/supabase/database.types.ts");

export async function generateTypesFile({
  targetPath = defaultTarget,
  command = "supabase",
  args = ["gen", "types", "typescript", "--local", "--schema", "public"],
} = {}) {
  const temporaryPath = resolve(
    dirname(targetPath),
    `.${basename(targetPath)}.${process.pid}.${randomUUID()}.tmp`,
  );
  let temporaryFile;

  try {
    temporaryFile = await open(temporaryPath, "wx");
    const useWindowsCommandProcessor = process.platform === "win32" && command === "supabase";
    const executable = useWindowsCommandProcessor ? process.env.ComSpec || "cmd.exe" : command;
    const executableArgs = useWindowsCommandProcessor
      ? ["/d", "/s", "/c", [command, ...args].join(" ")]
      : args;
    const child = spawn(executable, executableArgs, {
      cwd: repositoryRoot,
      stdio: ["ignore", temporaryFile.fd, "inherit"],
      shell: false,
      windowsHide: true,
    });
    const { code, signal } = await new Promise((resolveExit, rejectExit) => {
      child.once("error", rejectExit);
      child.once("close", (exitCode, exitSignal) => resolveExit({ code: exitCode, signal: exitSignal }));
    });

    if (code !== 0) {
      const reason = signal ? `signal ${signal}` : `exit code ${code}`;
      throw new Error(`Supabase type generation failed with ${reason}. The existing file was preserved.`);
    }

    await temporaryFile.sync();
    const { size } = await temporaryFile.stat();
    if (size === 0) {
      throw new Error("Supabase type generation produced an empty file. The existing file was preserved.");
    }

    await temporaryFile.close();
    temporaryFile = undefined;
    await rename(temporaryPath, targetPath);
  } catch (error) {
    if (temporaryFile) await temporaryFile.close().catch(() => {});
    await rm(temporaryPath, { force: true }).catch(() => {});
    throw error;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    await generateTypesFile();
    console.log(`Updated ${defaultTarget}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Supabase type generation failed.");
    process.exitCode = 1;
  }
}
