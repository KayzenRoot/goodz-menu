import { spawn } from "node:child_process";
import path from "node:path";
import { readLocalSupabaseStatus, repositoryRoot, safeProcessEnvironment } from "./local-supabase-status.mjs";
import { ensureLocalSupabaseTlsProxy } from "./local-supabase-tls.mjs";

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
  const tlsProxy = await ensureLocalSupabaseTlsProxy(status.dockerEndpoint, status.dockerNetworkId);
  supabase = {
    SUPABASE_API_URL: tlsProxy.nativeApiUrl,
    SUPABASE_ANON_KEY: status.anonKey,
    NODE_EXTRA_CA_CERTS: tlsProxy.caPath,
  };
  console.log("Readiness usará somente a chave pública do Supabase local.");
} catch (error) {
  if (error && typeof error === "object" && error.code === "LOCAL_TLS_PROXY_STOP_FAILED") {
    console.error("O proxy TLS local não pôde ser validado e parado; o servidor de desenvolvimento foi cancelado.");
    process.exit(1);
  }
  console.log("Supabase local não detectado; o app inicia sem sua configuração. Inicie o Supabase e reinicie pnpm dev para carregar a chave pública local.");
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
