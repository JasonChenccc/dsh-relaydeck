// RelayDeck — 监控扫描。
//
// 每个监控条目按自己的间隔被扫描：创作者 → 读主页作品；关键词 → 搜索。
// 新条目写入素材库，监控行记录本次结果。能力未实现的平台如实记为 unsupported。
import { get as getCapability } from "./capabilities/index.mjs";
import { nowIso } from "./db.mjs";
import { log, errorText } from "./log.mjs";

/** 一个监控条目该用什么能力去扫。 */
export function planFor(monitor) {
  const ref = String(monitor.ref || "").trim();
  if (monitor.platform === "douyin" && monitor.kind === "creator") {
    return { capability: "douyin.profile", params: { url: ref || undefined, limit: 50, scrolls: 3 } };
  }
  if (monitor.platform === "douyin" && monitor.kind === "keyword") {
    if (!ref) return null;
    return { capability: "douyin.search", params: { query: ref, limit: 50, scrolls: 2 } };
  }
  return null;
}

function markScan(db, id, state, error, added) {
  db.prepare("UPDATE monitors SET last_scan_at = ?, last_state = ?, last_error = ?, items = items + ? WHERE id = ?")
    .run(nowIso(), state, error || "", added || 0, id);
}

/** 扫描一个监控条目，返回本次结果。 */
export async function scanMonitor(db, monitor, dataDir) {
  const plan = planFor(monitor);
  if (!plan) {
    markScan(db, monitor.id, "unsupported", "该平台/类型的采集能力尚未接入", 0);
    return { id: monitor.id, state: "unsupported", added: 0 };
  }
  const capability = getCapability(plan.capability);
  if (!capability) {
    markScan(db, monitor.id, "unsupported", "缺少能力 " + plan.capability, 0);
    return { id: monitor.id, state: "unsupported", added: 0 };
  }
  try {
    const items = await capability.run({ db, params: plan.params, items: [], run: { id: null, flow_id: null }, dataDir });
    let added = 0;
    for (const item of items) {
      const exists = db.prepare("SELECT id FROM artifacts WHERE platform = ? AND item_id = ?").get(item.platform, item.item_id);
      if (exists) continue;
      db.prepare(
        "INSERT INTO artifacts (platform, item_id, title, author, cover_url, media_json, stats_json, collected_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
      ).run(item.platform, item.item_id, item.title || "", item.author || "", item.cover_url || "",
            JSON.stringify(item.media || []), JSON.stringify(item.stats || {}), nowIso());
      added += 1;
    }
    markScan(db, monitor.id, "ok", "", added);
    log("info", "monitor scanned", { id: monitor.id, name: monitor.name, found: items.length, added: added });
    return { id: monitor.id, state: "ok", found: items.length, added: added };
  } catch (error) {
    markScan(db, monitor.id, "failed", errorText(error), 0);
    log("warn", "monitor scan failed", { id: monitor.id, error: errorText(error) });
    return { id: monitor.id, state: "failed", added: 0, error: errorText(error) };
  }
}

/** 扫描所有到期的监控条目。 */
/** 评论 / 弹幕监控：采集结果进 records 表。 */
async function scanRecordWatch(db, table, watch, dataDir) {
  const capabilityId = table === "comment_watches" ? "douyin.comments" : "douyin.danmaku";
  const kind = table === "comment_watches" ? "comment" : "danmaku";
  const capability = getCapability(capabilityId);
  if (watch.platform !== "douyin" || !capability) {
    db.prepare("UPDATE " + table + " SET last_scan_at = ?, last_state = 'unsupported', last_error = ? WHERE id = ?")
      .run(nowIso(), "该平台的评论/弹幕采集能力尚未接入", watch.id);
    return { id: watch.id, state: "unsupported", added: 0 };
  }
  try {
    const items = await capability.run({ db, params: { url: watch.ref, limit: 200 }, items: [], run: { id: null, flow_id: null }, dataDir });
    let added = 0;
    for (const item of items) {
      const info = db.prepare(
        "INSERT INTO records (kind, platform, watch_id, ref, text, author, metrics_json, raw_json, created_at) " +
        "VALUES (?, ?, ?, ?, ?, ?, '{}', '{}', ?) ON CONFLICT(kind, platform, ref) DO NOTHING"
      ).run(kind, item.platform, watch.id, item.item_id, item.title || "", item.author || "", nowIso());
      if (info.changes > 0) added += 1;
    }
    db.prepare("UPDATE " + table + " SET last_scan_at = ?, last_state = 'ok', last_error = '', items = items + ? WHERE id = ?")
      .run(nowIso(), added, watch.id);
    return { id: watch.id, state: "ok", found: items.length, added: added };
  } catch (error) {
    db.prepare("UPDATE " + table + " SET last_scan_at = ?, last_state = 'failed', last_error = ? WHERE id = ?")
      .run(nowIso(), errorText(error), watch.id);
    return { id: watch.id, state: "failed", added: 0, error: errorText(error) };
  }
}

export async function scanDueCommentWatches(db, dataDir, now) {
  const at = now ? new Date(now) : new Date();
  const out = [];
  for (const table of ["comment_watches", "danmaku_watches"]) {
    for (const watch of db.prepare("SELECT * FROM " + table + " WHERE enabled = 1").all()) {
      const interval = Number(watch.interval_seconds) || 1800;
      const last = watch.last_scan_at ? new Date(watch.last_scan_at).getTime() : 0;
      if (last !== 0 && at.getTime() - last < interval * 1000) continue;
      out.push(await scanRecordWatch(db, table, watch, dataDir));
    }
  }
  return out;
}

export { scanRecordWatch };

export async function scanDueMonitors(db, dataDir, now) {
  const at = now ? new Date(now) : new Date();
  const rows = db.prepare("SELECT * FROM monitors WHERE enabled = 1").all();
  const results = [];
  for (const monitor of rows) {
    const interval = Number(monitor.interval_seconds) || 3600;
    const last = monitor.last_scan_at ? new Date(monitor.last_scan_at).getTime() : 0;
    if (last !== 0 && at.getTime() - last < interval * 1000) continue;
    results.push(await scanMonitor(db, monitor, dataDir));
  }
  return results;
}
