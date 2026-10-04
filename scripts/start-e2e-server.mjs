import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const nextCli = path.join(root, "node_modules", "next", "dist", "bin", "next");
const options = { hostname: "127.0.0.1", port: "3100" };
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

const child = spawn(process.execPath, [nextCli, "dev", "--hostname", options.hostname, "--port", String(port)], {
  cwd: root,
  stdio: "inherit",
  windowsHide: true,
  env: { ...process.env, NODE_ENV: "development", GOODZ_ENVIRONMENT: "local" },
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}

child.on("error", (error) => {
  console.error(`Goodz E2E server could not start: ${error.message}`);
  process.exitCode = 1;
});

child.on("exit", (code, signal) => {
  process.exitCode = code ?? (signal ? 1 : 0);
});
