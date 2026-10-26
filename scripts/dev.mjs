import { spawn } from "node:child_process";
import path from "node:path";
import { readLocalSupabaseStatus, repositoryRoot, safeProcessEnvironment } from "./local-supabase-status.mjs";

const nextCliPath = path.join(repositoryRoot, "node_modules", "next", "dist", "bin", "next");
const options = { hostname: "127.0.0.1", port: "3000" };
const args = process.argv.slice(2);
for (let index = 0; index < args.length; index += 1) {
  if (args[index] === "--hostname" && args[index + 1]) options.hostname = args[++index];
  else if (args[index] === "--port" && args[index + 1]) options.port = args[++index];
  else {
    console.error("Opção de desenvolvimento local não suportada.");
    process.exit(2);
  }
}

const port = Number(options.port);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error("A porta local precisa ser um número entre 1 e 65535.");
  process.exit(2);
}

let supabase = {};
try {
  const status = await readLocalSupabaseStatus();
  supabase = { SUPABASE_API_URL: status.apiUrl, SUPABASE_ANON_KEY: status.anonKey };
  console.log("Readiness usará somente a chave pública do Supabase local.");
} catch {
  console.log("Supabase local não detectado; o app inicia e readiness responderá 503 até a dependência ficar disponível.");
}

const child = spawn(process.execPath, [nextCliPath, "dev", "--hostname", options.hostname, "--port", String(port)], {
  cwd: repositoryRoot,
  stdio: "inherit",
  windowsHide: true,
  env: safeProcessEnvironment({
    NODE_ENV: "development",
    GOODZ_ENVIRONMENT: "local",
    GOODZ_RUNTIME: "native",
    HOSTNAME: options.hostname,
    PORT: String(port),
    ...supabase,
  }),
});

for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
child.once("error", () => {
  console.error("O servidor Next.js local não pôde ser iniciado.");
  process.exitCode = 1;
});
child.once("exit", (code, signal) => {
  process.exitCode = code ?? (signal ? 1 : 0);
});
