import { cpSync, existsSync, mkdirSync } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const localStandalone = path.join(root, ".next", "standalone");
const serverPath = existsSync(path.join(root, "server.js"))
  ? path.join(root, "server.js")
  : path.join(localStandalone, "server.js");

if (!existsSync(serverPath)) {
  console.error("Goodz standalone server is missing. Run the production build first.");
  process.exit(1);
}

const standaloneDirectory = path.dirname(serverPath);
if (standaloneDirectory === localStandalone) {
  const staticSource = path.join(root, ".next", "static");
  const staticTarget = path.join(localStandalone, ".next", "static");
  if (existsSync(staticSource)) {
    mkdirSync(staticTarget, { recursive: true });
    cpSync(staticSource, staticTarget, { recursive: true, force: true });
  }
  const publicSource = path.join(root, "public");
  const publicTarget = path.join(localStandalone, "public");
  if (existsSync(publicSource)) cpSync(publicSource, publicTarget, { recursive: true, force: true });
}

const options = {
  hostname: process.env.HOSTNAME || "127.0.0.1",
  port: process.env.PORT || "3000",
};
const args = process.argv.slice(2);
for (let index = 0; index < args.length; index += 1) {
  if (args[index] === "--hostname" && args[index + 1]) options.hostname = args[++index];
  else if (args[index] === "--port" && args[index + 1]) options.port = args[++index];
  else {
    console.error(`Unsupported Goodz start option: ${args[index]}`);
    process.exit(1);
  }
}

const port = Number(options.port);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error("Goodz start port must be an integer between 1 and 65535.");
  process.exit(1);
}

const child = spawn(process.execPath, [serverPath], {
  cwd: standaloneDirectory,
  stdio: "inherit",
  env: {
    ...process.env,
    GOODZ_ENVIRONMENT: process.env.GOODZ_ENVIRONMENT ?? "local",
    GOODZ_RUNTIME: process.env.GOODZ_RUNTIME ?? "native",
    HOSTNAME: options.hostname,
    PORT: String(port),
  },
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}

child.on("error", (error) => {
  console.error(`Goodz standalone server could not start: ${error.message}`);
  process.exitCode = 1;
});

child.on("exit", (code, signal) => {
  process.exitCode = code ?? (signal ? 1 : 0);
});
