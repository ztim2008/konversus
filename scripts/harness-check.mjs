/**
 * Harness check: Graph intact + node paths exist.
 * ERROR ⇒ exit 1.
 */
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const graphPath = join(root, "graph", "system.graph.json");

/**
 * @typedef {{ id: string, type: string, path?: string, command?: string, selfRewrite?: boolean }} GraphNode
 * @typedef {{ from: string, to: string, type: string }} GraphEdge
 * @typedef {{ schemaVersion: number, name: string, nodes: GraphNode[], edges: GraphEdge[], taskPaths?: Record<string, string[]> }} SystemGraph
 */

function fail(msg) {
  console.error(`\nharness:check FAILED — ${msg}`);
  process.exit(1);
}

if (!existsSync(graphPath)) fail(`missing ${graphPath}`);

/** @type {SystemGraph} */
let graph;
try {
  graph = JSON.parse(readFileSync(graphPath, "utf8"));
} catch (e) {
  fail(`graph JSON invalid: ${e instanceof Error ? e.message : String(e)}`);
}

if (graph.schemaVersion !== 1) fail(`unsupported schemaVersion: ${graph.schemaVersion}`);
if (!Array.isArray(graph.nodes) || graph.nodes.length === 0) fail("graph.nodes empty");
if (!Array.isArray(graph.edges)) fail("graph.edges missing");

const ids = new Set(graph.nodes.map((n) => n.id));
for (const n of graph.nodes) {
  if (!n.id || !n.type) fail(`node missing id/type: ${JSON.stringify(n)}`);
  if (n.path) {
    const full = join(root, n.path);
    if (!existsSync(full)) fail(`node ${n.id} path missing: ${n.path}`);
  }
}

for (const e of graph.edges) {
  if (!ids.has(e.from)) fail(`edge from unknown node: ${e.from}`);
  if (!ids.has(e.to)) fail(`edge to unknown node: ${e.to}`);
  if (!e.type) fail(`edge missing type: ${JSON.stringify(e)}`);
}

if (graph.taskPaths) {
  for (const [task, path] of Object.entries(graph.taskPaths)) {
    for (const nodeId of path) {
      if (!ids.has(nodeId)) fail(`taskPaths.${task} unknown node: ${nodeId}`);
    }
  }
}

const { size } = statSync(graphPath);
const taskCount = Object.keys(graph.taskPaths ?? {}).length;
console.log(
  `graph OK — ${graph.nodes.length} nodes, ${graph.edges.length} edges, ${taskCount} tasks, ${(size / 1024).toFixed(1)} KiB`
);
console.log("harness:check OK");
