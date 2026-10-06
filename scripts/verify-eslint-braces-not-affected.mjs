import { spawnSync } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import { basename, extname, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));
const rootConfigNames = [
  "eslint.config.js",
  "eslint.config.mjs",
  "eslint.config.cjs",
  "eslint.config.ts",
  "eslint.config.mts",
  "eslint.config.cts",
];
const productionTreeArgs = ["list", "--prod", "--depth", "Infinity", "--json"];

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function fail(message) {
  throw new Error(message);
}

function flattenActiveConfigs(value, configs = [], location = "eslint.config") {
  if (Array.isArray(value)) {
    for (const [index, entry] of value.entries()) {
      flattenActiveConfigs(entry, configs, `${location}[${index}]`);
    }
    return configs;
  }

  if (!isRecord(value)) {
    fail(`Unsupported active flat ESLint configuration at ${location}.`);
  }

  configs.push(value);
  if (Object.hasOwn(value, "extends")) {
    if (typeof value.extends === "string") {
      fail(`String-based ESLint extends at ${location} cannot be inspected safely.`);
    }
    if (value.extends !== undefined && value.extends !== null) {
      flattenActiveConfigs(value.extends, configs, `${location}.extends`);
    }
  }

  return configs;
}

function assertNoNextRootDir(configs) {
  if (!Array.isArray(configs) || configs.length === 0) {
    fail("The active ESLint flat configuration is empty or unreadable.");
  }

  for (const [index, config] of configs.entries()) {
    if (!isRecord(config)) {
      fail(`Unsupported active ESLint configuration entry ${index}.`);
    }

    if (!Object.hasOwn(config, "settings")) continue;
    if (!isRecord(config.settings)) {
      fail(`Unsupported ESLint settings value in active entry ${index}.`);
    }

    if (!Object.hasOwn(config.settings, "next")) continue;
    const nextSettings = config.settings.next;
    if (nextSettings === null || nextSettings === undefined) continue;
    if (!isRecord(nextSettings)) {
      fail(`Unsupported settings.next value in active ESLint entry ${index}.`);
    }
    if (Object.hasOwn(nextSettings, "rootDir")) {
      fail(`Active ESLint entry ${index} defines settings.next.rootDir.`);
    }
  }
}

function assertNoBracesInProductionTree(tree, expectedProjectName, expectedProjectVersion) {
  if (!Array.isArray(tree) || tree.length !== 1 || !isRecord(tree[0])) {
    fail("pnpm production-tree output has an unsupported shape.");
  }

  const root = tree[0];
  if (root.name !== expectedProjectName || root.version !== expectedProjectVersion) {
    fail("pnpm production-tree output does not identify this project.");
  }
  if (!isRecord(root.dependencies)) {
    fail("pnpm production-tree output omitted resolved production dependencies.");
  }
  if (Object.hasOwn(root, "devDependencies")) {
    fail("pnpm production-tree output unexpectedly includes development dependencies.");
  }

  let visitedPackages = 0;
  function visitPackage(packageNode, packageKey, chain) {
    if (!isRecord(packageNode) || typeof packageNode.version !== "string") {
      fail("pnpm production-tree output contains an unsupported package entry.");
    }

    const packageName = typeof packageNode.name === "string" ? packageNode.name : packageKey;
    if (typeof packageName !== "string" || packageName.length === 0) {
      fail("pnpm production-tree output contains a package without a name.");
    }
    if (packageName === "braces" || packageKey === "braces") {
      fail(`Affected package braces is reachable in the production dependency tree at ${chain}.`);
    }

    visitedPackages += 1;
    for (const dependencyField of ["dependencies", "optionalDependencies"]) {
      if (!Object.hasOwn(packageNode, dependencyField)) continue;
      const dependencies = packageNode[dependencyField];
      if (dependencies === null || dependencies === undefined) continue;
      if (!isRecord(dependencies)) {
        fail(`pnpm production-tree ${dependencyField} has an unsupported shape.`);
      }

      for (const [dependencyName, dependencyNode] of Object.entries(dependencies)) {
        visitPackage(dependencyNode, dependencyName, `${chain} > ${dependencyName}`);
      }
    }
  }

  for (const [dependencyName, dependencyNode] of Object.entries(root.dependencies)) {
    visitPackage(dependencyNode, dependencyName, `${expectedProjectName} > ${dependencyName}`);
  }

  if (visitedPackages === 0) {
    fail("pnpm production-tree output resolved no production packages.");
  }
  return visitedPackages;
}

function getPnpmInvocation() {
  const packageManagerPath = process.env.npm_execpath;
  if (!packageManagerPath || !basename(packageManagerPath).toLowerCase().startsWith("pnpm")) {
    fail("Run this guard through the pinned pnpm package script.");
  }

  const extension = extname(packageManagerPath).toLowerCase();
  if (extension === ".exe") {
    return { command: packageManagerPath, args: productionTreeArgs };
  }
  if ([".js", ".cjs", ".mjs"].includes(extension)) {
    return { command: process.execPath, args: [packageManagerPath, ...productionTreeArgs] };
  }
  if (process.platform !== "win32" && extension === "") {
    return { command: packageManagerPath, args: productionTreeArgs };
  }
  fail("The active pnpm executable format is unsupported by the production-tree guard.");
}

function runPnpmProductionTree() {
  const { command, args } = getPnpmInvocation();
  const result = spawnSync(command, args, {
    cwd: repositoryRoot,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
    timeout: 60_000,
    windowsHide: true,
  });

  if (result.error || result.status !== 0 || typeof result.stdout !== "string") {
    fail("Unable to inspect the resolved pnpm production dependency tree.");
  }

  try {
    return JSON.parse(result.stdout);
  } catch {
    fail("pnpm production-tree output is not valid JSON.");
  }
}

function severity(ruleValue) {
  const value = Array.isArray(ruleValue) ? ruleValue[0] : ruleValue;
  if (value === 0 || value === "off") return 0;
  if (value === 1 || value === "warn") return 1;
  if (value === 2 || value === "error") return 2;
  return undefined;
}

async function activeEslintConfig() {
  const { ESLint } = await import("eslint");
  const eslint = new ESLint({ cwd: repositoryRoot });
  const activeConfigPath = await eslint.findConfigFile(resolve(repositoryRoot, "src/proxy.ts"));
  if (!activeConfigPath) fail("ESLint did not resolve an active flat configuration.");

  const activeConfig = resolve(activeConfigPath);
  const candidates = [];
  for (const name of rootConfigNames) {
    const candidate = resolve(repositoryRoot, name);
    try {
      await access(candidate);
      candidates.push(candidate);
    } catch {
      // Absent config candidates are expected.
    }
  }
  if (candidates.length !== 1 || candidates[0] !== activeConfig) {
    fail("The active ESLint config is ambiguous or changed from the guarded root flat config.");
  }

  const loadedModule = await import(pathToFileURL(activeConfig).href);
  const configs = flattenActiveConfigs(loadedModule.default);
  assertNoNextRootDir(configs);

  const nextPluginModule = await import("@next/eslint-plugin-next");
  const nextPlugin = nextPluginModule.default ?? nextPluginModule;
  const projectManifest = JSON.parse(await readFile(resolve(repositoryRoot, "package.json"), "utf8"));
  const pluginManifest = JSON.parse(
    await readFile(
      resolve(repositoryRoot, "node_modules/@next/eslint-plugin-next/package.json"),
      "utf8",
    ),
  );
  if (
    projectManifest.devDependencies?.["@next/eslint-plugin-next"] !== "16.3.8" ||
    pluginManifest.version !== "16.3.8"
  ) {
    fail("The pinned Next ESLint plugin version changed; reassess the guarded call path.");
  }

  const recommendedRules = nextPlugin.configs?.recommended?.rules;
  if (!isRecord(recommendedRules) || Object.keys(recommendedRules).length === 0) {
    fail("The pinned Next ESLint recommended rules could not be inspected.");
  }
  const nextPluginIsActive = configs.some(
    (config) => isRecord(config.plugins) && config.plugins["@next/next"] === nextPlugin,
  );
  if (!nextPluginIsActive) {
    fail("The Next ESLint plugin is not explicitly registered in the active flat config.");
  }

  const effectiveConfig = await eslint.calculateConfigForFile("src/proxy.ts");
  if (!isRecord(effectiveConfig) || !isRecord(effectiveConfig.rules)) {
    fail("ESLint could not calculate the effective configuration for the representative source file.");
  }
  if (isRecord(effectiveConfig.settings?.next) && Object.hasOwn(effectiveConfig.settings.next, "rootDir")) {
    fail("The effective ESLint configuration defines settings.next.rootDir.");
  }

  for (const ruleId of Object.keys(recommendedRules)) {
    if (severity(effectiveConfig.rules[ruleId]) === undefined || severity(effectiveConfig.rules[ruleId]) === 0) {
      fail(`A recommended Next ESLint rule is missing or disabled: ${ruleId}.`);
    }
  }

  return { activeConfigPath: relative(repositoryRoot, activeConfig), recommendedRuleCount: Object.keys(recommendedRules).length };
}

function expectFailure(action, label) {
  try {
    action();
  } catch {
    return;
  }
  fail(`Deterministic self-test failed to reject ${label}.`);
}

function runSelfTests() {
  assertNoNextRootDir([{ plugins: {}, rules: {} }]);
  expectFailure(
    () => assertNoNextRootDir([{ settings: { next: { rootDir: "apps/*" } } }]),
    "a string settings.next.rootDir",
  );
  expectFailure(
    () => assertNoNextRootDir([{ settings: { next: { rootDir: ["apps/*"] } } }]),
    "an array settings.next.rootDir",
  );
  const fixtureTree = [{
    name: "goodz-menu",
    version: "0.1.0",
    dependencies: { next: { version: "16.3.8", dependencies: { react: { version: "19.3.0" } } } },
  }];
  if (assertNoBracesInProductionTree(fixtureTree, "goodz-menu", "0.1.0") !== 2) {
    fail("Deterministic self-test counted the wrong number of production packages.");
  }
  expectFailure(
    () => assertNoBracesInProductionTree([{
      name: "goodz-menu",
      version: "0.1.0",
      dependencies: { next: { version: "16.3.8", dependencies: { braces: { version: "3.0.3" } } } },
    }], "goodz-menu", "0.1.0"),
    "braces in the production tree",
  );
  expectFailure(
    () => assertNoBracesInProductionTree([{ name: "unexpected-project", version: "0.1.0", dependencies: {} }], "goodz-menu", "0.1.0"),
    "an unrecognized pnpm tree",
  );
  console.log("PASS: 5 deterministic guard self-tests.");
}

async function runGuard() {
  const projectManifest = JSON.parse(await readFile(resolve(repositoryRoot, "package.json"), "utf8"));
  if (projectManifest.packageManager !== "pnpm@12.8.1") {
    fail("The project package manager is not the pinned pnpm version.");
  }

  const productionTree = runPnpmProductionTree();
  const productionPackageCount = assertNoBracesInProductionTree(
    productionTree,
    projectManifest.name,
    projectManifest.version,
  );
  const eslint = await activeEslintConfig();
  console.log(`PASS: braces absent from ${productionPackageCount} resolved production packages.`);
  console.log(`PASS: ${eslint.activeConfigPath} has no settings.next.rootDir.`);
  console.log(`PASS: all ${eslint.recommendedRuleCount} pinned Next ESLint recommended rules remain enabled.`);
  console.log("Disposition: GHSA-vfj7-8cjw-p6xm RESOLVED_NOT_AFFECTED by current production reachability and lint configuration.");
  console.log("The raw full pnpm audit is not suppressed or represented by this guard.");
}

if (process.argv.includes("--self-test")) {
  runSelfTests();
} else if (process.argv.length > 2) {
  console.error("Usage: pnpm security:braces-disposition [--self-test]");
  process.exitCode = 2;
} else {
  try {
    await runGuard();
  } catch (error) {
    console.error(error instanceof Error ? `FAIL: ${error.message}` : "FAIL: guard could not verify advisory reachability.");
    process.exitCode = 1;
  }
}
