import { spawn } from "node:child_process";
import {
  dockerCommandArgs,
  resolveDockerCliPath,
  dockerRuntimeEnvironment,
  ensureLocalDocker,
  readLocalSupabaseStatus,
  repositoryRoot,
} from "./local-supabase-status.mjs";

const [action] = process.argv.slice(2);
if (!["up", "down", "ps", "logs"].includes(action)) {
  console.error("Uso: pnpm docker:<up|down|ps|logs>.");
  process.exit(2);
}

try {
  const dockerCliPath = resolveDockerCliPath();
  const docker = await ensureLocalDocker(undefined, dockerCliPath);
  let dockerEndpoint = docker.endpoint;
  const extra = {};

  if (action === "up") {
    const local = await readLocalSupabaseStatus(dockerEndpoint);
    dockerEndpoint = local.dockerEndpoint;
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
      SUPABASE_API_URL: "http://kong:8000", //NOSONAR: kong is reachable only on the project-local Docker bridge.
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

  await runDocker(dockerEndpoint, dockerArgs, extra, dockerCliPath);
} catch (error) {
  console.error(error instanceof Error ? error.message : "Runtime Docker local indisponível.");
  process.exitCode = 1;
}

function runDocker(endpoint, args, extra, dockerCliPath) {
  return new Promise((resolve, reject) => {
    const child = spawn(dockerCliPath, dockerCommandArgs(endpoint, args), {
      cwd: repositoryRoot,
      env: dockerRuntimeEnvironment(endpoint, extra),
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
