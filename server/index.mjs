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
import "./capabilities/core.mjs";

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
const handle = createRouter({ db, version: VERSION, startedAt });

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
});

function shutdown(signal) {
  log("info", "shutting down", { signal });
  server.close(() => { try { db.close(); } catch (e) {} process.exit(0); });
  setTimeout(() => process.exit(0), 2000).unref();
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
