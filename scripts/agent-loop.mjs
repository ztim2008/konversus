/**
 * Agent loop gate: print Graph task path → harness:check.
 * Does not edit code.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const graphPath = join(root, "graph", "system.graph.json");

function argValue(name) {
  const pref = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(pref));
  if (hit) return hit.slice(pref.length);
  const idx = process.argv.indexOf(`--${name}`);
  if (idx >= 0 && process.argv[idx + 1] && !process.argv[idx + 1].startsWith("--")) {
    return process.argv[idx + 1];
  }
  return undefined;
}

const task = argValue("task");

function fail(msg) {
  console.error(`\nagent:loop FAILED — ${msg}`);
  process.exit(1);
}

if (!task) {
  console.log(`Usage: npm run agent:loop -- --task <name>

Tasks from graph/system.graph.json → taskPaths
Docs: docs/guides/LOOP.md · docs/guides/HARNESS.md · docs/guides/GRAPH.md
`);
  if (existsSync(graphPath)) {
    const g = JSON.parse(readFileSync(graphPath, "utf8"));
    const keys = Object.keys(g.taskPaths ?? {});
    console.log(`Available: ${keys.join(", ") || "(none)"}`);
  }
  process.exit(0);
}

if (!existsSync(graphPath)) fail("missing graph/system.graph.json");
const graph = JSON.parse(readFileSync(graphPath, "utf8"));
const path = graph.taskPaths?.[task];
if (!path?.length) fail(`unknown task "${task}" — add to graph.taskPaths`);

const byId = new Map(graph.nodes.map((n) => [n.id, n]));

console.log(`\n=== agent:loop · task=${task} ===\n`);
console.log("Path (follow in order; edit only these nodes):\n");
path.forEach((id, i) => {
  const n = byId.get(id);
  if (!n) fail(`path node missing from graph.nodes: ${id}`);
  const loc = n.path ? n.path : n.command ? `cmd: ${n.command}` : "";
  console.log(`  ${i + 1}. [${n.type}] ${id}${loc ? ` → ${loc}` : ""}`);
});

console.log("\n--- harness:check ---\n");
const r = spawnSync("node", [join(root, "scripts/harness-check.mjs")], {
  cwd: root,
  stdio: "inherit",
});
if (r.status !== 0) fail("harness:check red — fix before continuing");

console.log(`
=== next (human / agent) ===
1. Edit along the path above (no scope creep).
2. Re-run: npm run agent:loop -- --task ${task}
3. Sync graph if new entities appeared (schema change = owner permission).
4. Journal: docs/devlog/YYYY-MM.md
5. Update stage emoji in docs/LEAD-RADAR-AUTO-TZ.md when DoD met.
6. Commit only if owner asked.

agent:loop OK
`);
