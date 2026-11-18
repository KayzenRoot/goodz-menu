import { spawn } from "node:child_process";
import path from "node:path";
import { sanitizeLocalSupabaseOutput } from "./local-auth-fixture";

const repositoryRoot = process.cwd();
const supabaseCli = path.join(repositoryRoot, "node_modules", "supabase", "dist", "supabase.js");
const requestedWorkdir = process.env.GOODZ_SUPABASE_WORKDIR?.trim();

export function runLocalDbCommand(args: string[]): Promise<string> {
  return new Promise((resolveRun, reject) => {
    const cliArgs = requestedWorkdir
      ? [supabaseCli, "--workdir", path.resolve(requestedWorkdir), ...args]
      : [supabaseCli, ...args];
    const child = spawn(process.execPath, cliArgs, {
      cwd: repositoryRoot,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8").on("data", (chunk: string) => { stdout += chunk; });
    child.stderr.setEncoding("utf8").on("data", (chunk: string) => { stderr += chunk; });
    child.once("error", reject);
    child.once("close", (code, signal) => {
      if (code === 0) {
        resolveRun(stdout);
        return;
      }
      const exitReason = signal || "exit " + String(code);
      const summary = sanitizeLocalSupabaseOutput(stderr + "\n" + stdout);
      reject(new Error("Local Supabase command failed (" + exitReason + "). " + summary));
    });
  });
}

export async function runBatchSql(sql: string): Promise<void> {
  const base = sql.trim();
  const trimmed = base.endsWith(";") ? base : `${base};`;
  await runLocalDbCommand(["db", "query", "--local", `DO $batch$ BEGIN ${trimmed} END $batch$`]);
}

export async function queryAuditEventsByCorrelation(correlationId: string): Promise<unknown[]> {
  if (!/^[0-9a-f-]{36}$/i.test(correlationId)) throw new Error("Invalid correlation UUID.");
  const sql = `SELECT action, outcome, reason_code, source, metadata FROM public.audit_events WHERE correlation_id = '${correlationId}' ORDER BY created_at ASC`;
  const output = await runLocalDbCommand(["db", "query", "--local", "--output-format", "json", sql]);
  const jsonStart = output.search(/[[{]/);
  if (jsonStart < 0) throw new Error("E2E local database returned no readable JSON evidence.");
  const result = JSON.parse(output.slice(jsonStart)) as unknown;
  const rows = Array.isArray(result) ? result : (result as { rows?: unknown[] } | null)?.rows;
  if (!Array.isArray(rows)) throw new Error("E2E local database returned an unexpected result shape.");
  return rows;
}
