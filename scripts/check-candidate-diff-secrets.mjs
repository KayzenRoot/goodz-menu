import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const base = process.env.BASE_SHA;
const candidate = process.env.CANDIDATE_SHA;
if (!isCommitSha(base) || !isCommitSha(candidate)) {
  console.error("Candidate diff secret scan requires exact BASE_SHA and CANDIDATE_SHA values.");
  process.exit(2);
}

const diff = execFileSync("git", ["diff", "--no-ext-diff", "--unified=0", `${base}...${candidate}`], {
  cwd: root,
  encoding: "utf8",
  maxBuffer: 50 * 1024 * 1024,
});
const credentialPatterns = [
  /-----BEGIN [A-Z0-9 ]+ PRIVATE KEY-----/i,
  /\b(?:sb_secret|sbp|gh[pousr]|github_pat|glpat|npm)_[A-Za-z0-9_-]{12,}\b/i,
  /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/i,
  /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/,
  /\bAIza[0-9A-Za-z_-]{35}\b/,
  /\b(?:sk|rk)_live_[A-Za-z0-9]{16,}\b/,
  /\bSG\.[A-Za-z0-9_-]{16}\.[A-Za-z0-9_-]{30,}\b/,
  /\beyJ[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/,
  /\b(?:postgres|postgresql|mysql|mongodb(?:\+srv)?|redis):\/\/[^\s:@/]+:[^\s@/]+@[^\s/]+/i,
];

const findings = [];
let currentFile = "unknown";
let addedLines = 0;
for (const line of diff.split(/\r?\n/)) {
  if (line.startsWith("+++ b/")) currentFile = line.slice(6);
  if (!line.startsWith("+") || line.startsWith("+++")) continue;
  addedLines += 1;
  const content = line.slice(1);
  if (credentialPatterns.some((pattern) => pattern.test(content))) {
    findings.push(`${currentFile}: added line contains a credential-like value`);
  }
}

if (findings.length > 0) {
  console.error(`Candidate diff secret scan found ${findings.length} issue(s):`);
  for (const finding of findings) console.error(`- ${finding}`);
  process.exitCode = 1;
} else {
  console.log(`Candidate diff secret scan passed across ${addedLines} added text line(s).`);
}

function isCommitSha(value) {
  return typeof value === "string" && /^[0-9a-f]{40}$/.test(value);
}
