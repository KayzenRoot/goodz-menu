import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));

const FORBIDDEN_CLIENT_TOKENS = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "GOODZ_E2E_TEST_SEAM_SECRET",
  "append_privacy_step_up_event",
  "append_storefront_step_up_event",
  "append_delivery_step_up_event",
  "append_orders_step_up_event",
  "append_settings_step_up_event",
  "append_catalog_step_up_event",
];

const FORBIDDEN_SECRET_KEY_REGEX = /\bsb_secret_[A-Za-z0-9_-]{8,}\b/;

function walkFiles(dirPath, extensions) {
  if (!fs.existsSync(dirPath)) return [];
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkFiles(full, extensions));
    } else if (extensions.some((ext) => entry.name.endsWith(ext))) {
      files.push(full);
    }
  }
  return files;
}

function assertServiceRoleBoundary() {
  const srcFiles = walkFiles(path.join(root, "src"), [".ts", ".tsx", ".mjs", ".js"]);
  const allowedBoundary = path.normalize(path.join(root, "src", "lib", "supabase", "audit-writer.server.ts"));

  for (const file of srcFiles) {
    const content = fs.readFileSync(file, "utf8");
    const normalized = path.normalize(file);
    if (content.includes("SUPABASE_SERVICE_ROLE_KEY") && normalized !== allowedBoundary) {
      throw new Error(`Service-role env reference leaked outside audit-writer.server.ts: ${path.relative(root, file)}`);
    }
    const isClientModule = /^\s*["']use client["'];/m.test(content);
    if (isClientModule) {
      for (const token of FORBIDDEN_CLIENT_TOKENS) {
        if (content.includes(token)) {
          throw new Error(`Forbidden privileged token "${token}" found in client module: ${path.relative(root, file)}`);
        }
      }
      if (FORBIDDEN_SECRET_KEY_REGEX.test(content)) {
        throw new Error(`Forbidden sb_secret_ credential found in client module: ${path.relative(root, file)}`);
      }
    }
  }
}

function assertNextStaticBundleClean() {
  const staticDir = path.join(root, ".next", "static");
  if (!fs.existsSync(staticDir)) {
    throw new Error("Missing .next/static directory. Run `pnpm build` before `verify:prod-readiness`.");
  }
  const bundleFiles = walkFiles(staticDir, [".js", ".mjs", ".css"]);
  if (bundleFiles.length === 0) {
    throw new Error("No client assets found under .next/static.");
  }
  for (const file of bundleFiles) {
    const content = fs.readFileSync(file, "utf8");
    for (const token of FORBIDDEN_CLIENT_TOKENS) {
      if (content.includes(token)) {
        throw new Error(`Forbidden secret/privileged marker "${token}" leaked into client bundle: ${path.relative(root, file)}`);
      }
    }
    if (FORBIDDEN_SECRET_KEY_REGEX.test(content)) {
      throw new Error(`Forbidden sb_secret_ credential leaked into client bundle: ${path.relative(root, file)}`);
    }
  }
  return bundleFiles.length;
}

function assertDockerfileHardening() {
  const dockerfilePath = path.join(root, "Dockerfile");
  const dockerfile = fs.readFileSync(dockerfilePath, "utf8");
  if (!/^USER\s+nextjs\s*$/m.test(dockerfile)) {
    throw new Error("Dockerfile must drop root privileges with `USER nextjs`.");
  }
  if (!/^ENV\s+NODE_ENV=production\s*$/m.test(dockerfile)) {
    throw new Error("Dockerfile runner stage must set `ENV NODE_ENV=production`.");
  }
}

function assertRuntimeEnvSeparation() {
  const runtimeEnvPath = path.join(root, "src", "lib", "env", "runtime-env.ts");
  const runtimeEnv = fs.readFileSync(runtimeEnvPath, "utf8");
  if (!runtimeEnv.includes('"staging"') || !runtimeEnv.includes('"production"')) {
    throw new Error("runtime-env.ts must explicitly model staging and production environments.");
  }
  if (!runtimeEnv.includes('supabaseApiUrl.protocol !== "https:"')) {
    throw new Error("runtime-env.ts must enforce HTTPS Supabase endpoints for staging and production.");
  }
}

assertServiceRoleBoundary();
const scannedBundles = assertNextStaticBundleClean();
assertDockerfileHardening();
assertRuntimeEnvSeparation();

console.info(JSON.stringify({
  event: "production_readiness_verified",
  service_role_boundary: "audit-writer.server.ts_only",
  client_bundles_scanned: scannedBundles,
  dockerfile_non_root: true,
  https_enforced_for_cloud: true,
}));
