import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { parseLocalSupabaseStatus } from "./parse-local-supabase-status.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const supabaseCli = path.join(root, "node_modules", "supabase", "dist", "supabase.js");
const playwrightCli = path.join(root, "node_modules", "@playwright", "test", "cli.js");
const status = await run(process.execPath, [supabaseCli, "status", "--output", "json"], { capture: true });
const localStatus = parseLocalSupabaseStatus(status.stdout);

const apiUrl = localStatus.API_URL ?? localStatus.api_url;
const anonKey = localStatus.ANON_KEY ?? localStatus.anon_key;
if (typeof apiUrl !== "string" || !/^http:\/\/(127\.0\.0\.1|localhost|\[::1\])(?::\d+)?$/.test(apiUrl) || typeof anonKey !== "string" || !anonKey) {
  throw new Error("Local Supabase must be healthy and provide a public anon key before E2E.");
}

process.env.GOODZ_ENVIRONMENT = "local";
process.env.SUPABASE_API_URL = apiUrl;
process.env.SUPABASE_ANON_KEY = anonKey;
await run(process.execPath, [playwrightCli, "test", ...process.argv.slice(2)], { cwd: root });

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd ?? root,
      env: process.env,
      stdio: options.capture ? ["ignore", "pipe", "pipe"] : "inherit",
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    if (options.capture) {
      child.stdout.setEncoding("utf8").on("data", (chunk) => { stdout += chunk; });
      child.stderr.setEncoding("utf8").on("data", (chunk) => { stderr += chunk; });
    }
    child.once("error", reject);
    child.once("close", (code, signal) => {
      if (code === 0) resolve({ stdout, stderr });
      else {
        const details = options.capture ? sanitize(stderr || stdout) : "";
        const detailSuffix = details ? ` ${details}` : "";
        reject(new Error(`${path.basename(command)} exited ${signal || code}.${detailSuffix}`));
      }
    });
  });
}

function sanitize(value) {
  return value
    .replace(/("(?:SERVICE_ROLE_KEY|SECRET_KEY|DB_URL|JWT_SECRET|ANON_KEY|PUBLISHABLE_KEY)"\s*:\s*")[^"]*(")/gi, "$1[redacted]$2")
    .replace(/\b(?:SERVICE_ROLE_KEY|SECRET_KEY|DB_URL|JWT_SECRET|ANON_KEY|PUBLISHABLE_KEY)=\S+/gi, "[redacted]")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(-4)
    .join(" ")
    .slice(0, 500);
}
