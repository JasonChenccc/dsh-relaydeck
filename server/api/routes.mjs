// RelayDeck — HTTP surface. Both the DSH panel (through the plugin's
// same-origin proxy) and the agent tools read this API.
import { nowIso, counts, schemaVersion } from "../db.mjs";
import { list as listCapabilities } from "../capabilities/index.mjs";
import { executeFlow, readRun, readFlow, validateSpec } from "../flow.mjs";
import { errorText } from "../log.mjs";

const JSON_HEADERS = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };

function send(res, status, payload) {
  res.writeHead(status, JSON_HEADERS);
  res.end(JSON.stringify(payload));
}

async function readJson(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 2 * 1024 * 1024) throw new Error("request body too large");
    chunks.push(chunk);
  }
  if (chunks.length === 0) return {};
  const text = Buffer.concat(chunks).toString("utf8");
  if (text.trim().length === 0) return {};
  return JSON.parse(text);
}

function match(pattern, parts) {
  if (pattern.length !== parts.length) return null;
  const params = {};
  for (let i = 0; i < pattern.length; i += 1) {
    if (pattern[i].startsWith(":")) params[pattern[i].slice(1)] = decodeURIComponent(parts[i]);
    else if (pattern[i] !== parts[i]) return null;
  }
  return params;
}

export function createRouter({ db, version, startedAt }) {
  const routes = [];
  const on = (method, pattern, handler) => routes.push({ method, parts: pattern.split("/").filter(Boolean), handler });

  on("GET", "/health", () => ({
    status: "ok",
    name: "relaydeck",
    version,
    api: 1,
    schemaVersion: schemaVersion(db),
    uptimeMs: Date.now() - startedAt,
    counts: counts(db)
  }));

  on("GET", "/api/version", () => ({ name: "relaydeck", version, api: 1 }));

  on("GET", "/api/capabilities", () => ({ items: listCapabilities() }));

  on("GET", "/api/flows", () => {
    const rows = db.prepare("SELECT * FROM flows ORDER BY id DESC").all();
    return { items: rows.map((row) => { let spec = {}; try { spec = JSON.parse(row.spec_json); } catch (e) {} return { ...row, spec, enabled: row.enabled === 1 }; }) };
  });

  on("POST", "/api/flows", async (_p, req) => {
    const body = await readJson(req);
    const spec = validateSpec(body.spec || body);
    const name = String(body.name || spec.name || "未命名流程");
    const info = db.prepare("INSERT INTO flows (name, enabled, trigger, cron, spec_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .run(name, body.enabled === false ? 0 : 1, String(body.trigger || "manual"), String(body.cron || ""), JSON.stringify(spec), nowIso(), nowIso());
    return { statusCode: 201, payload: readFlow(db, Number(info.lastInsertRowid)) };
  });

  on("PUT", "/api/flows/:id", async (params, req) => {
    const existing = readFlow(db, Number(params.id));
    if (!existing) return { statusCode: 404, payload: { error: "flow not found" } };
    const body = await readJson(req);
    const spec = body.spec ? validateSpec(body.spec) : existing.spec;
    db.prepare("UPDATE flows SET name = ?, enabled = ?, trigger = ?, cron = ?, spec_json = ?, updated_at = ? WHERE id = ?")
      .run(String(body.name || existing.name), body.enabled === undefined ? existing.enabled : (body.enabled ? 1 : 0),
           String(body.trigger || existing.trigger), String(body.cron === undefined ? existing.cron : body.cron),
           JSON.stringify(spec), nowIso(), existing.id);
    return { payload: readFlow(db, existing.id) };
  });

  on("DELETE", "/api/flows/:id", (params) => {
    const info = db.prepare("DELETE FROM flows WHERE id = ?").run(Number(params.id));
    return { payload: { deleted: info.changes > 0 } };
  });

  on("POST", "/api/flows/:id/run", async (params) => {
    const flow = readFlow(db, Number(params.id));
    if (!flow) return { statusCode: 404, payload: { error: "flow not found" } };
    const run = await executeFlow({ db, spec: flow.spec, flow, trigger: "manual" });
    return { payload: run };
  });

  on("GET", "/api/runs", (params, req) => {
    const url = new URL(req.url, "http://127.0.0.1");
    const limit = Math.min(Number(url.searchParams.get("limit") || 50), 200);
    return { items: db.prepare("SELECT * FROM runs ORDER BY id DESC LIMIT ?").all(limit) };
  });

  on("GET", "/api/runs/:id", (params) => {
    const run = readRun(db, Number(params.id));
    return run ? { payload: run } : { statusCode: 404, payload: { error: "run not found" } };
  });

  on("GET", "/api/artifacts", (params, req) => {
    const url = new URL(req.url, "http://127.0.0.1");
    const limit = Math.min(Number(url.searchParams.get("limit") || 100), 500);
    const platform = url.searchParams.get("platform");
    const rows = platform
      ? db.prepare("SELECT * FROM artifacts WHERE platform = ? ORDER BY id DESC LIMIT ?").all(platform, limit)
      : db.prepare("SELECT * FROM artifacts ORDER BY id DESC LIMIT ?").all(limit);
    return { items: rows };
  });

  on("GET", "/api/bindings", () => ({ items: db.prepare("SELECT id, platform, label, nickname, state, proxy, last_used_at, created_at FROM bindings ORDER BY id DESC").all() }));

  return async function handle(req, res) {
    const url = new URL(req.url || "/", "http://127.0.0.1");
    const parts = url.pathname.split("/").filter(Boolean);
    for (const route of routes) {
      if (route.method !== req.method) continue;
      const params = match(route.parts, parts);
      if (!params) continue;
      try {
        const result = await route.handler(params, req);
        const payload = result && result.payload !== undefined ? result.payload : result;
        if (payload && typeof payload === "object" && "statusCode" in payload) delete payload.statusCode;
        send(res, (result && result.statusCode) || 200, payload);
      } catch (error) {
        send(res, 400, { error: errorText(error) });
      }
      return;
    }
    send(res, 404, { error: "not found", path: url.pathname });
  };
}
