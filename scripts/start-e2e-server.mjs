import { spawn } from "node:child_process";
import { createServer } from "node:http";
import path from "node:path";
import { repositoryRoot, safeProcessEnvironment } from "./local-supabase-status.mjs";

const root = repositoryRoot;
const nextCli = path.join(root, "node_modules", "next", "dist", "bin", "next");
const options = { hostname: "127.0.0.1", port: "3100" };
const fixturePort = 56388;
const args = process.argv.slice(2);

for (let index = 0; index < args.length; index += 1) {
  if (args[index] === "--hostname" && args[index + 1]) options.hostname = args[++index];
  else if (args[index] === "--port" && args[index + 1]) options.port = args[++index];
  else {
    console.error(`Unsupported Goodz E2E server option: ${args[index]}`);
    process.exit(1);
  }
}

const port = Number(options.port);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error("Goodz E2E server port must be an integer between 1 and 65535.");
  process.exit(1);
}

const fixture = createServer((request, response) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "127.0.0.1"}`);
  response.setHeader("cache-control", "no-store");
  if (url.pathname !== "/auth/v1/health") {
    response.writeHead(404).end();
    return;
  }
  if (request.headers.apikey !== "goodz-e2e-public-key") {
    response.writeHead(401, { "content-type": "application/json" }).end('{"message":"unauthorized"}');
    return;
  }
  response.writeHead(200, { "content-type": "application/json" }).end('{"status":"ok"}');
});

try {
  await new Promise((resolve, reject) => {
    fixture.once("error", () => reject(new Error("E2E health fixture port is unavailable.")));
    fixture.listen(fixturePort, "127.0.0.1", resolve);
  });
} catch (error) {
  console.error(error instanceof Error ? error.message : "E2E health fixture could not start.");
  process.exit(1);
}

const child = spawn(process.execPath, [nextCli, "dev", "--hostname", options.hostname, "--port", String(port)], {
  cwd: root,
  stdio: "inherit",
  windowsHide: true,
  env: safeProcessEnvironment({
    NODE_ENV: "development",
    GOODZ_ENVIRONMENT: "test",
    GOODZ_RUNTIME: "native",
    BUILD_REVISION: "e2e",
    SUPABASE_API_URL: `http://127.0.0.1:${fixturePort}`,
    SUPABASE_ANON_KEY: "goodz-e2e-public-key",
    HOSTNAME: options.hostname,
    PORT: String(port),
  }),
});

for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
child.once("error", () => {
  console.error("Goodz E2E app server could not start.");
  process.exitCode = 1;
  fixture.close();
});
child.once("exit", (code, signal) => {
  process.exitCode = code ?? (signal ? 1 : 0);
  fixture.close();
});
