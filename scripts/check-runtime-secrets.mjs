import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const roots = ["src", "scripts", "tests/e2e", "tests/supabase", "supabase"];
const files = [".env.example", "compose.yaml", "Dockerfile", "package.json", "pnpm-workspace.yaml"];
const textExtensions = new Set([".ts", ".tsx", ".js", ".mjs", ".mts", ".json", ".toml", ".sql", ".yaml", ".yml", ".css", ".example"]);
const forbiddenNames = [
  ["SUPABASE", "SERVICE", "ROLE", "KEY"].join("_"),
  ["SUPABASE", "ACCESS", "TOKEN"].join("_"),
];
const credentialPatterns = [
  /-----BEGIN [A-Z0-9 ]+ PRIVATE KEY-----/i,
  /\bsb_secret_[A-Za-z0-9_-]{8,}/i,
  /\beyJ[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/,
];

for (const directory of roots) files.push(...await collect(path.join(root, directory)));

const findings = [];
for (const file of [...new Set(files)]) {
  let contents;
  try { contents = await readFile(file, "utf8"); } catch { continue; }
  const lines = contents.split(/\r?\n/);
  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("//") || trimmed.startsWith("*")) return;
    if (forbiddenNames.some((name) => trimmed.toUpperCase().includes(name))) {
      findings.push(`${path.relative(root, file)}:${index + 1} forbidden credential variable`);
    }
    if (credentialPatterns.some((pattern) => pattern.test(trimmed))) {
      findings.push(`${path.relative(root, file)}:${index + 1} credential-like value`);
    }
  });
}

if (findings.length > 0) {
  console.error(`Runtime secret scan found ${findings.length} issue(s):`);
  for (const finding of findings) console.error(`- ${finding}`);
  process.exitCode = 1;
} else {
  console.log(`Runtime secret scan passed across ${new Set(files).size} tracked-scope file(s).`);
}

async function collect(directory) {
  let entries;
  try { entries = await readdir(directory, { withFileTypes: true }); } catch { return []; }
  const collected = [];
  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) collected.push(...await collect(absolutePath));
    else if (textExtensions.has(path.extname(entry.name).toLowerCase())) collected.push(absolutePath);
  }
  return collected;
}
