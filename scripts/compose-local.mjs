import { spawn } from "node:child_process";
import {
  ensureLocalDocker,
  readLocalSupabaseStatus,
  repositoryRoot,
  safeProcessEnvironment,
} from "./local-supabase-status.mjs";

const [action] = process.argv.slice(2);
if (!["up", "down", "ps", "logs"].includes(action)) {
  console.error("Uso: pnpm docker:<up|down|ps|logs>.");
  process.exit(2);
}

try {
  await ensureLocalDocker();
  const extra = {};

  if (action === "up") {
    const local = await readLocalSupabaseStatus();
    const webPort = process.env.GOODZ_WEB_PORT ?? "3001";
    if (!/^\d{1,5}$/.test(webPort) || Number(webPort) < 1024 || Number(webPort) > 65535) {
      throw new Error("GOODZ_WEB_PORT precisa estar entre 1024 e 65535.");
    }
    const revision = process.env.BUILD_REVISION ?? "local";
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(revision)) {
      throw new Error("BUILD_REVISION contém caracteres não permitidos.");
    }
    Object.assign(extra, {
      GOODZ_ENVIRONMENT: "local",
      GOODZ_RUNTIME: "docker",
      GOODZ_WEB_PORT: webPort,
      BUILD_REVISION: revision,
      SUPABASE_API_URL: "http://host.docker.internal:56321",
      SUPABASE_ANON_KEY: local.anonKey,
    });
    console.log("Iniciando a aplicação Docker com a chave pública local em memória.");
  }

  const dockerArgs = action === "up"
    ? ["compose", "up", "--build", "-d"]
    : action === "down"
      ? ["compose", "down"]
      : action === "ps"
        ? ["compose", "ps"]
        : ["compose", "logs", "--no-color", "--tail=100"];

  await runDocker(dockerArgs, extra);
} catch (error) {
  console.error(error instanceof Error ? error.message : "Runtime Docker local indisponível.");
  process.exitCode = 1;
}

function runDocker(args, extra) {
  return new Promise((resolve, reject) => {
    const child = spawn("docker", args, {
      cwd: repositoryRoot,
      env: safeProcessEnvironment(extra),
      stdio: "inherit",
      windowsHide: true,
    });
    child.once("error", () => reject(new Error("Docker Compose não pôde ser iniciado.")));
    child.once("exit", (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`Docker Compose terminou com ${signal ?? code}.`));
    });
  });
}
