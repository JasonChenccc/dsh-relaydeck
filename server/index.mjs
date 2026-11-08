// RelayDeck backend entry point.
//
// Started by the DSH plugin through ctx.subprocess; loopback only.
//   node server/index.mjs --port=18731 --data=<data dir>
import { createServer } from "node:http";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { openDatabase, nowIso } from "./db.mjs";
import { log, errorText } from "./log.mjs";
import { createRouter } from "./api/routes.mjs";
import { executeFlow, readFlow } from "./flow.mjs";
import { startScheduler, stopScheduler } from "./scheduler.mjs";
import "./capabilities/core.mjs";
import "./actions/download.mjs";
import "./capabilities/websearch.mjs";
import "./capabilities/publish.mjs";
import { closeAllLogins } from "./browser/login.mjs";

const VERSION = "0.1.0";
const here = dirname(fileURLToPath(import.meta.url));

function arg(name, fallback) {
  const hit = process.argv.find((a) => a.startsWith("--" + name + "="));
  return hit ? hit.slice(name.length + 3) : fallback;
}

const port = Number(arg("port", "18731"));
const dataDir = arg("data", join(here, "..", "data"));
const host = "127.0.0.1";
const startedAt = Date.now();

const db = openDatabase(join(dataDir, "relaydeck.db"));
/** Run a flow row by id — shared by the scheduler and the retry route. */
async function runFlowById(flowRow, trigger) {
  const flow = readFlow(db, flowRow.id);
  if (!flow) return null;
  return executeFlow({ db, spec: flow.spec, flow, trigger: trigger || "schedule", dataDir });
}

/**
 * First run on a fresh database: plant one runnable flow so the product shows a
 * real result immediately, without a platform login. It stays a normal flow —
 * editable, deletable, and a template for real ones.
 */
function seedDemoFlow() {
  const existing = db.prepare("SELECT COUNT(*) AS n FROM flows").get();
  if (existing && Number(existing.n) > 0) return false;
  const spec = {
    source: { capability: "core.demoFeed", params: { count: 6, platform: "douyin" } },
    filters: [
      { capability: "core.stat", params: { field: "like_count", op: ">=", value: 1000 } },
      { capability: "core.dedupe", params: {} }
    ],
    actions: [
      { capability: "core.store", params: {} },
      { capability: "core.download", params: { limit: 1 } },
      { capability: "core.publishPlan", params: { target: "xhs", tags: "露营,户外", titleTemplate: "{title}" } }
    ]
  };
  db.prepare("INSERT INTO flows (name, enabled, trigger, cron, spec_json, created_at, updated_at) VALUES (?, 1, 'manual', '', ?, ?, ?)")
    .run("演示：采集 → 筛选 → 落库 → 下载 → 发布计划", JSON.stringify(spec), nowIso(), nowIso());
  log("info", "seeded demo flow", {});
  return true;
}

const schedulerTickMs = Number(arg("tick", "30000"));
const handle = createRouter({ db, version: VERSION, startedAt, dataDir, runFlowById, schedulerTickMs });

const server = createServer((req, res) => {
  handle(req, res).catch((error) => {
    try {
      res.writeHead(500, { "content-type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ error: errorText(error) }));
    } catch (e) { /* response already gone */ }
  });
});

server.listen(port, host, () => {
  log("info", "relaydeck backend ready", { url: "http://" + host + ":" + port, dataDir, version: VERSION, at: nowIso() });
  seedDemoFlow();
  if (arg("schedule", "1") !== "0") {
    startScheduler({ db, runFlow: runFlowById, tickMs: schedulerTickMs });
  }
});

function shutdown(signal) {
  log("info", "shutting down", { signal });
  stopScheduler();
  void closeAllLogins().catch(() => {});
  server.close(() => { try { db.close(); } catch (e) {} process.exit(0); });
  setTimeout(() => process.exit(0), 2000).unref();
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
