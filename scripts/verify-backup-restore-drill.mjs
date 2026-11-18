import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const supabaseCli = path.join(root, "node_modules", "supabase", "dist", "supabase.js");
const MAX_RTO_DRILL_MS = 120_000;

function runSupabase(args) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(process.execPath, [supabaseCli, ...args], {
      cwd: root,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8").on("data", (chunk) => { stdout += chunk; });
    child.stderr.setEncoding("utf8").on("data", (chunk) => { stderr += chunk; });
    child.once("error", reject);
    child.once("close", (code) => {
      if (code === 0) {
        resolveRun(stdout);
      } else {
        reject(new Error(`supabase ${args[0]} failed (exit ${code}): ${(stderr || stdout).slice(-400)}`));
      }
    });
  });
}

async function queryScalarInt(sql) {
  const output = await runSupabase(["db", "query", "--local", "--output-format", "json", sql]);
  const jsonStart = output.search(/[[{]/);
  if (jsonStart < 0) throw new Error("No JSON returned from local database query.");
  const parsed = JSON.parse(output.slice(jsonStart));
  const rows = Array.isArray(parsed) ? parsed : parsed?.rows;
  const firstVal = rows?.[0] ? Object.values(rows[0])[0] : undefined;
  const num = Number(firstVal);
  if (!Number.isFinite(num)) throw new Error("Unexpected scalar count from database query.");
  return num;
}

const startedAt = Date.now();
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "goodz-backup-drill-"));
const schemaDumpPath = path.join(tempDir, "schema.sql");
const dataDumpPath = path.join(tempDir, "data.sql");
const drillSchema = `backup_drill_${randomBytes(4).toString("hex")}`;

try {
  await runSupabase(["db", "dump", "--local", "-s", "public,private", "-f", schemaDumpPath]);
  await runSupabase(["db", "dump", "--local", "--data-only", "-s", "public", "-f", dataDumpPath]);

  const schemaSql = fs.readFileSync(schemaDumpPath, "utf8");
  const dataSql = fs.readFileSync(dataDumpPath, "utf8");

  const requiredMarkers = [
    "organizations",
    "orders",
    "order_handoff_payments",
    "deliveries",
    "storefront_profiles",
    "customer_consents",
    "audit_events",
    "ENABLE ROW LEVEL SECURITY",
  ];
  for (const marker of requiredMarkers) {
    if (!schemaSql.includes(marker)) {
      throw new Error(`Schema backup dump is missing required domain object marker: ${marker}`);
    }
  }
  if (!dataSql.includes("setting_definitions") || !dataSql.includes("permissions")) {
    throw new Error("Data backup dump is missing baseline seeded governance catalogs.");
  }

  const sourceCount = await queryScalarInt("SELECT COUNT(*)::int AS total FROM public.permissions");
  if (sourceCount < 15) {
    throw new Error(`Expected >= 15 canonical permissions before drill, observed ${sourceCount}.`);
  }

  await runSupabase([
    "db",
    "query",
    "--local",
    `DO $drill$ BEGIN
      EXECUTE 'CREATE SCHEMA ${drillSchema}';
      EXECUTE 'CREATE TABLE ${drillSchema}.permissions_backup AS SELECT * FROM public.permissions';
      EXECUTE 'TRUNCATE TABLE ${drillSchema}.permissions_backup';
      EXECUTE 'INSERT INTO ${drillSchema}.permissions_backup SELECT * FROM public.permissions';
    END $drill$;`,
  ]);

  const restoredCount = await queryScalarInt(`SELECT COUNT(*)::int AS total FROM ${drillSchema}.permissions_backup`);
  if (restoredCount !== sourceCount) {
    throw new Error(`Restore drill count mismatch: expected ${sourceCount}, got ${restoredCount}.`);
  }

  const elapsedMs = Date.now() - startedAt;
  if (elapsedMs > MAX_RTO_DRILL_MS) {
    throw new Error(`Backup/restore drill exceeded local threshold (${elapsedMs}ms > ${MAX_RTO_DRILL_MS}ms).`);
  }

  console.info(JSON.stringify({
    event: "backup_restore_drill_passed",
    schema_bytes: Buffer.byteLength(schemaSql, "utf8"),
    data_bytes: Buffer.byteLength(dataSql, "utf8"),
    verified_permissions_rows: restoredCount,
    elapsed_ms: elapsedMs,
    rto_budget_ms: 7_200_000,
  }));
} finally {
  await runSupabase(["db", "query", "--local", `DROP SCHEMA IF EXISTS ${drillSchema} CASCADE;`]).catch(() => undefined);
  fs.rmSync(tempDir, { recursive: true, force: true });
}
