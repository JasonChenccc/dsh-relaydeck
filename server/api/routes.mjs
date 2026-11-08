// RelayDeck — HTTP surface. Both the DSH panel (through the plugin's
// same-origin proxy) and the agent tools read this API.
import { nowIso, counts, schemaVersion } from "../db.mjs";
import { list as listCapabilities } from "../capabilities/index.mjs";
import { executeFlow, readRun, readFlow, validateSpec } from "../flow.mjs";
import { errorText } from "../log.mjs";
import { platform, platformIds } from "../platforms.mjs";
import { startLogin, pollLogin, cancelLogin, listLogins, qrImage, verifyBindings, refreshAccountStats } from "../browser/login.mjs";
import { schedulerState, startScheduler, stopScheduler, nextRunAt } from "../scheduler.mjs";
import { resolveLinks, downloadItems } from "../capabilities/link.mjs";
import { sendNotification } from "../notify.mjs";
import { scanMonitor, scanRecordWatch } from "../monitors.mjs";

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

/** One CRUD surface per product area, so every panel page reads real rows. */
const AREA_TABLES = [
  { path: "monitors", table: "monitors", fields: ["platform", "kind", "name", "ref", "binding_id", "interval_seconds"], flags: ["enabled"] },
  { path: "comment-watches", table: "comment_watches", fields: ["platform", "title", "ref", "binding_id", "interval_seconds"], flags: ["enabled"] },
  { path: "danmaku-watches", table: "danmaku_watches", fields: ["platform", "title", "ref", "binding_id", "interval_seconds"], flags: ["enabled"] },
  { path: "comment-rules", table: "comment_rules", fields: ["platform", "name", "mode", "target_ref", "templates", "daily_cap", "min_gap_seconds"], flags: ["enabled"] },
  { path: "notifications", table: "notifications", fields: ["name", "type", "config_json"], flags: ["enabled"] }
];

export function createRouter({ db, version, startedAt, dataDir, runFlowById, schedulerTickMs }) {
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
    const run = await executeFlow({ db, spec: flow.spec, flow, trigger: "manual", dataDir });
    return { payload: run };
  });

  on("GET", "/api/runs", (params, req) => {
    const url = new URL(req.url, "http://127.0.0.1");
    const limit = Math.min(Number(url.searchParams.get("limit") || 50), 200);
    return { items: db.prepare("SELECT * FROM runs ORDER BY id DESC LIMIT ?").all(limit) };
  });

  // ── retry / replay ──
  on("POST", "/api/runs/:id/retry", async (params) => {
    const previous = db.prepare("SELECT * FROM runs WHERE id = ?").get(Number(params.id));
    if (!previous) return { statusCode: 404, payload: { error: "run not found" } };
    if (previous.flow_id === null || previous.flow_id === undefined) {
      return { statusCode: 400, payload: { error: "this run has no flow to replay" } };
    }
    const flow = readFlow(db, previous.flow_id);
    if (!flow) return { statusCode: 404, payload: { error: "flow no longer exists" } };
    const run = await executeFlow({ db, spec: flow.spec, flow, trigger: "retry", dataDir });
    return { payload: run };
  });

  // ── scheduler ──
  on("GET", "/api/scheduler", () => {
    const state = schedulerState();
    const flows = db.prepare("SELECT id, name, trigger, cron, enabled, last_run_at FROM flows WHERE trigger != 'manual'").all();
    return {
      ...state,
      monitored: flows.map((flow) => ({
        id: flow.id, name: flow.name, trigger: flow.trigger, cron: flow.cron,
        enabled: flow.enabled === 1,
        nextRunAt: flow.enabled === 1 && nextRunAt(flow) ? nextRunAt(flow).toISOString() : null
      }))
    };
  });

  on("POST", "/api/scheduler/start", () => startScheduler({ db, runFlow: runFlowById, tickMs: schedulerTickMs }));
  on("POST", "/api/scheduler/stop", () => stopScheduler());

  // ── publish plans ──
  on("GET", "/api/publish-plans", (params, req) => {
    const url = new URL(req.url, "http://127.0.0.1");
    const limit = Math.min(Number(url.searchParams.get("limit") || 100), 500);
    const platform = url.searchParams.get("platform");
    const rows = platform
      ? db.prepare("SELECT * FROM publish_plans WHERE platform = ? ORDER BY id DESC LIMIT ?").all(platform, limit)
      : db.prepare("SELECT * FROM publish_plans ORDER BY id DESC LIMIT ?").all(limit);
    return { items: rows.map((row) => { let files = []; try { files = JSON.parse(row.files_json); } catch (e) {} return { ...row, files }; }) };
  });

  on("POST", "/api/publish-plans/:id", async (params, req) => {
    const body = await readJson(req);
    const status = String(body.status || "");
    if (!["draft", "approved", "discarded"].includes(status)) {
      return { statusCode: 400, payload: { error: "status must be draft | approved | discarded" } };
    }
    const info = db.prepare("UPDATE publish_plans SET status = ?, updated_at = ? WHERE id = ?").run(status, nowIso(), Number(params.id));
    return { payload: { updated: info.changes > 0, status } };
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

  // ── interactive login ──
  on("GET", "/api/platforms", () => ({ items: platformIds().map((id) => { const p = platform(id); return { id: p.id, title: p.title, home: p.home, hint: p.hint }; }) }));

  on("GET", "/api/login", () => ({ items: listLogins() }));

  on("POST", "/api/login", async (_params, req) => {
    const body = await readJson(req);
    const session = await startLogin(db, String(body.platform || ""), { baseDir: dataDir });
    return { statusCode: 201, payload: session };
  });

  on("GET", "/api/login/:id", (params) => pollLogin(db, params.id));

  on("GET", "/api/login/:id/qr", (params) => qrImage(params.id));

  on("POST", "/api/login/:id/cancel", (params) => cancelLogin(params.id));

  // Clear demo/test residue so the panel starts from a clean slate.
  on("POST", "/api/purge", async (_params, req) => {
    const body = await readJson(req);
    const keepBindings = body.keepBindings !== false;
    db.exec("DELETE FROM run_steps");
    db.exec("DELETE FROM runs");
    db.exec("DELETE FROM artifacts");
    db.exec("DELETE FROM publish_plans");
    db.exec("DELETE FROM flows");
    if (!keepBindings) db.exec("DELETE FROM bindings");
    return { payload: { purged: true, keepBindings } };
  });

  for (const area of AREA_TABLES) {
    const columns = [...area.fields, ...(area.flags || [])];
    on("GET", "/api/" + area.path, () => ({
      items: db.prepare("SELECT * FROM " + area.table + " ORDER BY id DESC").all()
        .map((row) => { const out = { ...row }; for (const flag of area.flags || []) out[flag] = row[flag] === 1; return out; })
    }));

    on("POST", "/api/" + area.path, async (_params, req) => {
      const body = await readJson(req);
      const values = columns.map((key) => {
        const value = body[key];
        if ((area.flags || []).includes(key)) return value === false || value === 0 ? 0 : 1;
        if (key === "interval_seconds") return Number(value) || 3600;
        if (key === "daily_cap" || key === "min_gap_seconds") return Number(value) || 0;
        if (key === "binding_id") return value === undefined || value === null ? null : Number(value);
        return value === undefined || value === null ? "" : String(value);
      });
      const info = db.prepare(
        "INSERT INTO " + area.table + " (" + columns.join(", ") + ", created_at) VALUES (" +
        columns.map(() => "?").join(", ") + ", ?)"
      ).run(...values, nowIso());
      return { statusCode: 201, payload: db.prepare("SELECT * FROM " + area.table + " WHERE id = ?").get(Number(info.lastInsertRowid)) };
    });

    on("PUT", "/api/" + area.path + "/:id", async (params, req) => {
      const body = await readJson(req);
      const sets = [];
      const values = [];
      for (const key of columns) {
        if (body[key] === undefined) continue;
        sets.push(key + " = ?");
        if ((area.flags || []).includes(key)) values.push(body[key] ? 1 : 0);
        else if (["interval_seconds", "daily_cap", "min_gap_seconds"].includes(key)) values.push(Number(body[key]) || 0);
        else if (key === "binding_id") values.push(body[key] === null ? null : Number(body[key]));
        else values.push(String(body[key]));
      }
      if (sets.length === 0) return { payload: { updated: false } };
      values.push(Number(params.id));
      const info = db.prepare("UPDATE " + area.table + " SET " + sets.join(", ") + " WHERE id = ?").run(...values);
      return { payload: { updated: info.changes > 0 } };
    });

    on("DELETE", "/api/" + area.path + "/:id", (params) => {
      const info = db.prepare("DELETE FROM " + area.table + " WHERE id = ?").run(Number(params.id));
      return { payload: { deleted: info.changes > 0 } };
    });

    on("POST", "/api/" + area.path + "/:id/toggle", (params) => {
      const row = db.prepare("SELECT id, enabled FROM " + area.table + " WHERE id = ?").get(Number(params.id));
      if (!row) return { statusCode: 404, payload: { error: "not found" } };
      const next = row.enabled === 1 ? 0 : 1;
      db.prepare("UPDATE " + area.table + " SET enabled = ? WHERE id = ?").run(next, row.id);
      return { payload: { id: row.id, enabled: next === 1 } };
    });
  }

  // 采集到的原始记录（评论 / 弹幕）
  // 立即扫描评论 / 弹幕监控
  for (const area of [{ path: "comment-watches", table: "comment_watches" }, { path: "danmaku-watches", table: "danmaku_watches" }]) {
    on("POST", "/api/" + area.path + "/:id/scan", async (params) => {
      const watch = db.prepare("SELECT * FROM " + area.table + " WHERE id = ?").get(Number(params.id));
      if (!watch) return { statusCode: 404, payload: { error: "watch not found" } };
      return { payload: await scanRecordWatch(db, area.table, watch, dataDir) };
    });
  }

  // 立即扫描一个监控条目
  on("POST", "/api/monitors/:id/scan", async (params) => {
    const monitor = db.prepare("SELECT * FROM monitors WHERE id = ?").get(Number(params.id));
    if (!monitor) return { statusCode: 404, payload: { error: "monitor not found" } };
    return { payload: await scanMonitor(db, monitor, dataDir) };
  });

  // 通知测试：真的发一条
  on("POST", "/api/notifications/:id/send-test", async (params) => {
    const channel = db.prepare("SELECT * FROM notifications WHERE id = ?").get(Number(params.id));
    if (!channel) return { statusCode: 404, payload: { ok: false, error: "channel not found" } };
    const result = await sendNotification(channel, { event: "test", title: "RelayDeck 测试", text: "这是一条来自 RelayDeck 的测试消息。" });
    return { payload: { ok: true, result: result } };
  });

  // 粘贴链接直接下载：解析 → 下载 → 落库，一步完成
  on("POST", "/api/downloads", async (_params, req) => {
    const body = await readJson(req);
    const raw = body.urls !== undefined ? body.urls : body.url;
    try {
      const resolved = await resolveLinks(raw, dataDir, body.limit);
      const result = await downloadItems(resolved.items, dataDir, body.perItem || 1);
      for (const item of resolved.items) {
        db.prepare(
          "INSERT INTO artifacts (platform, item_id, title, author, cover_url, media_json, stats_json, local_path, download_state, collected_at) " +
          "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) " +
          "ON CONFLICT(platform, item_id) DO UPDATE SET title = excluded.title, cover_url = excluded.cover_url, " +
          "media_json = excluded.media_json, stats_json = excluded.stats_json, local_path = excluded.local_path, download_state = excluded.download_state"
        ).run(item.platform, item.item_id, item.title || "", item.author || "", item.cover_url || "",
              JSON.stringify(item.media || []), JSON.stringify(item.stats || {}),
              item.local_path || "", item.local_path ? "done" : "failed", nowIso());
      }
      return {
        payload: {
          ok: true,
          resolved: resolved.items.length,
          downloaded: result.files,
          bytes: result.bytes,
          sizeText: result.bytes > 1048576 ? (result.bytes / 1048576).toFixed(1) + " MB" : Math.round(result.bytes / 1024) + " KB",
          items: resolved.items.map((x) => ({ item_id: x.item_id, title: x.title, local_path: x.local_path || "", media: (x.media || []).length })),
          failures: resolved.failures
        }
      };
    } catch (error) {
      return { statusCode: 400, payload: { ok: false, error: errorText(error) } };
    }
  });

  // 风控汇总：账号健康 + 近期异常（全部由已有数据派生，不额外造状态）
  on("GET", "/api/risk", () => {
    const bindings = db.prepare("SELECT id, platform, nickname, state, last_used_at FROM bindings").all();
    const failedRuns = db.prepare("SELECT id, flow_name, error, started_at FROM runs WHERE state = 'failed' ORDER BY id DESC LIMIT 20").all();
    const failedMonitors = db.prepare("SELECT id, platform, name, last_error, last_scan_at FROM monitors WHERE last_state = 'failed' ORDER BY id DESC LIMIT 20").all();
    const unsupported = db.prepare("SELECT id, platform, title FROM comment_watches WHERE last_state = 'unsupported'").all()
      .concat(db.prepare("SELECT id, platform, title FROM danmaku_watches WHERE last_state = 'unsupported'").all());
    const signedOut = bindings.filter((b) => b.state !== "active");
    const issues = failedRuns.length + failedMonitors.length + signedOut.length;
    return {
      healthy: issues === 0,
      accounts: bindings,
      failedRuns,
      failedMonitors,
      unsupported,
      counts: { accounts: bindings.length, signedOut: signedOut.length, failedRuns: failedRuns.length, failedMonitors: failedMonitors.length, unsupported: unsupported.length }
    };
  });

  // 导出：任何板块都能导出 CSV
  on("GET", "/api/export", (_params, req) => {
    const url = new URL(req.url, "http://127.0.0.1");
    const table = url.searchParams.get("table") || "artifacts";
    const allowed = ["artifacts", "runs", "run_steps", "flows", "publish_plans", "monitors",
                     "comment_watches", "danmaku_watches", "comment_rules", "notifications", "records", "bindings", "account_stats"];
    if (!allowed.includes(table)) return { statusCode: 400, payload: { error: "table not exportable" } };
    const rows = db.prepare("SELECT * FROM " + table + " ORDER BY id DESC LIMIT 5000").all();
    const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
    const cell = (value) => {
      if (value === null || value === undefined) return "";
      const text = String(value).replace(/"/g, '""');
      return /[",\n]/.test(text) ? '"' + text + '"' : text;
    };
    const csv = [columns.join(",")]
      .concat(rows.map((row) => columns.map((c) => cell(row[c])).join(",")))
      .join("\n");
    return { raw: "\uFEFF" + csv, contentType: "text/csv; charset=utf-8" };
  });

  // 统一任务队列：所有板块的待处理项汇到一处
  on("GET", "/api/queue", () => {
    const runs = db.prepare("SELECT id, flow_name, state, found, kept, saved, error, started_at FROM runs ORDER BY id DESC LIMIT 60").all();
    const plans = db.prepare("SELECT id, platform, title, status, created_at FROM publish_plans WHERE status IN ('draft','approved','prepared') ORDER BY id DESC LIMIT 60").all();
    const files = db.prepare("SELECT id, platform, title, item_id, local_path, download_state, collected_at FROM artifacts WHERE local_path != '' ORDER BY id DESC LIMIT 60").all();
    const items = [
      ...runs.map((r) => ({ kind: "run", id: r.id, title: r.flow_name || ("任务 " + r.id), state: r.state, detail: "发现 " + r.found + " · 保留 " + r.kept + " · 写入 " + r.saved, error: r.error, at: r.started_at })),
      ...plans.map((x) => ({ kind: "plan", id: x.id, title: x.title || ("草稿 " + x.id), state: x.status, detail: "待发布 → " + x.platform, error: "", at: x.created_at })),
      ...files.map((x) => ({ kind: "download", id: x.id, title: x.title || x.item_id, state: x.download_state, detail: x.local_path, error: "", at: x.collected_at }))
    ].sort((a, b) => String(b.at).localeCompare(String(a.at)));
    return {
      items,
      summary: {
        runs: runs.length,
        running: runs.filter((r) => r.state === "running").length,
        failed: runs.filter((r) => r.state === "failed").length,
        pendingPlans: plans.filter((x) => x.status === "draft").length,
        downloads: files.length
      }
    };
  });

  // 工作台指标
  on("GET", "/api/metrics", () => {
    const day = (offset) => new Date(Date.now() - offset * 86400000).toISOString().slice(0, 10);
    const days = [];
    for (let i = 6; i >= 0; i -= 1) {
      const key = day(i);
      const row = db.prepare("SELECT COUNT(*) AS n, COALESCE(SUM(found),0) AS found, COALESCE(SUM(saved),0) AS saved, COALESCE(SUM(CASE WHEN state='failed' THEN 1 ELSE 0 END),0) AS bad FROM runs WHERE substr(started_at,1,10) = ?").get(key);
      days.push({ day: key, runs: row.n, found: row.found, saved: row.saved, failed: row.bad });
    }
    const today = days[days.length - 1] || { runs: 0, found: 0, saved: 0, failed: 0 };
    const total = db.prepare("SELECT COUNT(*) AS n, COALESCE(SUM(CASE WHEN state='failed' THEN 1 ELSE 0 END),0) AS bad FROM runs").get();
    const byPlatform = db.prepare("SELECT platform, COUNT(*) AS n FROM artifacts GROUP BY platform ORDER BY n DESC").all();
    const nextRuns = db.prepare("SELECT id, name, trigger, cron, last_run_at FROM flows WHERE enabled = 1 AND trigger != 'manual'").all();
    return {
      today,
      total: { runs: total.n, failed: total.bad, failureRate: total.n === 0 ? 0 : Math.round((total.bad / total.n) * 100) },
      days,
      byPlatform,
      scheduled: nextRuns.length
    };
  });

  on("GET", "/api/records", (params, req) => {
    const url = new URL(req.url, "http://127.0.0.1");
    const kind = url.searchParams.get("kind");
    const watchId = url.searchParams.get("watchId");
    const limit = Math.min(Number(url.searchParams.get("limit") || 100), 500);
    if (kind && watchId) return { items: db.prepare("SELECT * FROM records WHERE kind = ? AND watch_id = ? ORDER BY id DESC LIMIT ?").all(kind, Number(watchId), limit) };
    if (kind) return { items: db.prepare("SELECT * FROM records WHERE kind = ? ORDER BY id DESC LIMIT ?").all(kind, limit) };
    return { items: db.prepare("SELECT * FROM records ORDER BY id DESC LIMIT ?").all(limit) };
  });

  // 账号管理：账号自身的统计
  on("GET", "/api/account-stats", () => ({ items: db.prepare("SELECT * FROM account_stats ORDER BY id DESC LIMIT 200").all() }));

  on("POST", "/api/account-stats/refresh", async () => ({ payload: { results: await refreshAccountStats(db) } }));

  on("GET", "/api/bindings", () => ({ items: db.prepare("SELECT id, platform, label, nickname, platform_uid, state, proxy, last_used_at, created_at FROM bindings ORDER BY platform, id").all() }));

  // Re-read each platform and reconcile: drops unverified rows, names real ones.
  on("POST", "/api/bindings/verify", async () => ({ payload: { results: await verifyBindings(db) } }));

  return async function handle(req, res) {
    const url = new URL(req.url || "/", "http://127.0.0.1");
    const parts = url.pathname.split("/").filter(Boolean);
    for (const route of routes) {
      if (route.method !== req.method) continue;
      const params = match(route.parts, parts);
      if (!params) continue;
      try {
        const result = await route.handler(params, req);
        // 原始响应（导出 CSV 等）直接写字节，不做 JSON 包装
        if (result && typeof result.raw === "string") {
          res.writeHead(result.statusCode || 200, {
            "content-type": result.contentType || "text/plain; charset=utf-8",
            "cache-control": "no-store"
          });
          res.end(result.raw);
          return;
        }
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
