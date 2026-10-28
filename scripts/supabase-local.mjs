import { existsSync } from "node:fs";
import path from "node:path";
import {
  ensureLoopbackDockerNetwork,
  ensureLocalDocker,
  dockerRuntimeEnvironment,
  inspectLoopbackDockerNetwork,
  readLocalSupabaseStatus,
  repositoryRoot,
  runCaptured,
  sanitizeSupabaseOutput,
  supabaseCliPath,
} from "./local-supabase-status.mjs";
import { ensureLocalSupabaseTlsProxy, stopLocalSupabaseTlsProxy } from "./local-supabase-tls.mjs";

const [action, ...extraArgs] = process.argv.slice(2);
const supportedActions = new Set(["start", "status", "stop", "reset"]);
if (!supportedActions.has(action) || extraArgs.length > 0) {
  console.error("Uso: pnpm supabase:<start|status|stop|reset>.");
  process.exit(2);
}

if (existsSync(path.join(repositoryRoot, "supabase", ".temp", "project-ref"))) {
  console.error("Supabase CLI está ligado a um projeto. A stack do reboot exige execução exclusivamente local.");
  process.exit(2);
}

let dockerEndpoint;
let dockerNetworkId;
let stopAfterVerificationFailure = false;
try {
  if (action === "stop") dockerEndpoint = (await ensureLocalDocker()).endpoint;

  if (action === "status") {
    const status = await readLocalSupabaseStatus();
    await ensureLocalSupabaseTlsProxy(status.dockerEndpoint, status.dockerNetworkId);
    console.log(`Supabase local isolado: disponível por TLS em ${status.apiUrl}; chave pública carregada apenas em memória.`);
    process.exit(0);
  }

  if (action === "start") {
    dockerEndpoint = (await ensureLocalDocker()).endpoint;
    stopAfterVerificationFailure = true;
    const network = await ensureLoopbackDockerNetwork();
    if (network.endpoint !== dockerEndpoint) throw new Error("O contexto Docker mudou durante a operação local.");
    dockerNetworkId = network.networkId;
    console.log("Iniciando Supabase local na rede de loopback do Goodz Menu...");
    await runSupabase(["start", "--network-id", network.networkId], dockerEndpoint);
    const status = await readLocalSupabaseStatus(dockerEndpoint);
    await ensureLocalSupabaseTlsProxy(dockerEndpoint, status.dockerNetworkId);
    stopAfterVerificationFailure = false;
    console.log(`Supabase local disponível por TLS em ${status.apiUrl}. A chave pública não foi impressa.`);
    process.exit(0);
  }

  if (action === "stop") {
    let network;
    try {
      network = await inspectLoopbackDockerNetwork(dockerEndpoint);
    } catch {
      network = undefined;
    }
    dockerNetworkId = network?.networkId;
    await stopLocalSupabaseTlsProxy(dockerEndpoint, dockerNetworkId);
    await runSupabase(["stop"], dockerEndpoint);
    console.log("Supabase local parado; os volumes foram preservados.");
    process.exit(0);
  }

  if (process.env.GOODZ_ALLOW_LOCAL_DB_RESET !== "1") {
    console.error("Reset é destrutivo. Confirme o escopo isolado definindo GOODZ_ALLOW_LOCAL_DB_RESET=1 nesta sessão e execute novamente.");
    process.exit(2);
  }
  dockerEndpoint = (await ensureLocalDocker()).endpoint;
  stopAfterVerificationFailure = true;
  const network = await ensureLoopbackDockerNetwork();
  if (network.endpoint !== dockerEndpoint) throw new Error("O contexto Docker mudou durante a operação local.");
  dockerNetworkId = network.networkId;
  await readLocalSupabaseStatus(dockerEndpoint);
  await ensureLocalSupabaseTlsProxy(dockerEndpoint, network.networkId);
  await runSupabase(["db", "reset", "--network-id", network.networkId], dockerEndpoint);
  const status = await readLocalSupabaseStatus(dockerEndpoint);
  await ensureLocalSupabaseTlsProxy(dockerEndpoint, status.dockerNetworkId);
  stopAfterVerificationFailure = false;
} catch (error) {
  if (stopAfterVerificationFailure && dockerEndpoint) {
    if (dockerNetworkId) {
      try {
        await stopLocalSupabaseTlsProxy(dockerEndpoint, dockerNetworkId);
      } catch {
        console.error("O proxy TLS local não pôde ser parado após falha de validação.");
      }
    }
    try {
      await runSupabase(["stop"], dockerEndpoint);
      console.error("Supabase local foi parado após falha de validação; os volumes foram preservados.");
    } catch {
      console.error("Supabase local não pôde ser parado após falha de validação.");
    }
  }
  console.error(error instanceof Error ? error.message : "Falha no runtime local do Supabase.");
  process.exitCode = 1;
}

async function runSupabase(args, dockerEndpoint) {
  const result = await runCaptured(process.execPath, [supabaseCliPath, ...args], {
    env: dockerRuntimeEnvironment(dockerEndpoint, { GOODZ_ENVIRONMENT: "local" }),
  });
  const safeOutput = sanitizeSupabaseOutput(`${result.stdout}${result.stderr}`).trim();
  if (safeOutput) console.log(safeOutput);
  if (result.code !== 0) throw new Error(`Supabase local falhou (${result.signal ?? result.code}). Consulte o estado local e tente novamente.`);
}
