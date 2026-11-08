// RelayDeck — flow scheduler.
//
// Two trigger kinds, both evaluated on a fixed tick: "interval" (cron column holds
// seconds) and "cron" (cron column holds a five-field expression). A flow is due
// when its schedule matches the current minute and it has not already run inside
// that minute, so a slow run never stacks up.
import { nowIso } from "./db.mjs";
import { log, errorText } from "./log.mjs";
import { scanDueMonitors, scanDueCommentWatches } from "./monitors.mjs";

let timer = null;
let running = false;
let stats = { ticks: 0, triggered: 0, skipped: 0, lastTickAt: null, lastError: "" };

/** Parse a five-field cron expression into a predicate over a Date (local time). */
export function cronMatcher(expression) {
  const parts = String(expression || "").trim().split(/\s+/);
  if (parts.length !== 5) return null;
  const fields = [
    { value: parts[0], min: 0, max: 59 },
    { value: parts[1], min: 0, max: 23 },
    { value: parts[2], min: 1, max: 31 },
    { value: parts[3], min: 1, max: 12 },
    { value: parts[4], min: 0, max: 6 }
  ];
  const compiled = [];
  for (const field of fields) {
    const allowed = new Set();
    for (const chunk of String(field.value).split(",")) {
      const step = chunk.includes("/") ? Number(chunk.split("/")[1]) : 1;
      const range = chunk.split("/")[0];
      if (!Number.isFinite(step) || step < 1) return null;
      let from = field.min;
      let to = field.max;
      if (range !== "*") {
        const bounds = range.split("-");
        from = Number(bounds[0]);
        to = bounds.length > 1 ? Number(bounds[1]) : Number(bounds[0]);
        if (!Number.isFinite(from) || !Number.isFinite(to)) return null;
      }
      for (let value = from; value <= to; value += step) {
        if (value >= field.min && value <= field.max) allowed.add(value);
      }
    }
    if (allowed.size === 0) return null;
    compiled.push(allowed);
  }
  return (date) => {
    const values = [date.getMinutes(), date.getHours(), date.getDate(), date.getMonth() + 1, date.getDay()];
    return compiled.every((allowed, index) => allowed.has(values[index]));
  };
}

/** When should this flow run next? Returns a Date or undefined. */
export function nextRunAt(flow, from) {
  const base = from ? new Date(from) : new Date();
  if (flow.trigger === "interval") {
    const seconds = Number(flow.cron);
    if (!Number.isFinite(seconds) || seconds < 30) return undefined;
    const last = flow.last_run_at ? new Date(flow.last_run_at).getTime() : 0;
    const due = Math.max(base.getTime(), last + seconds * 1000);
    return new Date(due);
  }
  if (flow.trigger === "cron") {
    const match = cronMatcher(flow.cron);
    if (!match) return undefined;
    const cursor = new Date(base.getTime());
    cursor.setSeconds(0, 0);
    cursor.setMinutes(cursor.getMinutes() + 1);
    for (let step = 0; step < 60 * 24 * 366; step += 1) {
      if (match(cursor)) return new Date(cursor.getTime());
      cursor.setMinutes(cursor.getMinutes() + 1);
    }
  }
  return undefined;
}

function dueNow(flow, now) {
  if (flow.trigger === "interval") {
    const seconds = Number(flow.cron);
    if (!Number.isFinite(seconds) || seconds < 30) return false;
    const last = flow.last_run_at ? new Date(flow.last_run_at).getTime() : 0;
    return now.getTime() - last >= seconds * 1000;
  }
  if (flow.trigger === "cron") {
    const match = cronMatcher(flow.cron);
    if (!match || !match(now)) return false;
    const last = flow.last_run_at ? new Date(flow.last_run_at) : null;
    if (!last) return true;
    // Once per matching minute.
    return last.getFullYear() !== now.getFullYear() || last.getMonth() !== now.getMonth() ||
      last.getDate() !== now.getDate() || last.getHours() !== now.getHours() || last.getMinutes() !== now.getMinutes();
  }
  return false;
}

/** One scheduling pass. Exported so tests can drive it without waiting. */
export async function tick({ db, runFlow, now, dataDir }) {
  const at = now ? new Date(now) : new Date();
  stats.ticks += 1;
  stats.lastTickAt = at.toISOString();
  let triggered = 0;
  const rows = db.prepare("SELECT id, name, trigger, cron, enabled, last_run_at FROM flows WHERE enabled = 1 AND trigger != 'manual'").all();
  // 监控扫描与流程调度共用同一个 tick
  try {
    const scanned = await scanDueMonitors(db, dataDir, at);
    await scanDueCommentWatches(db, dataDir, at);
    for (const item of scanned) {
      if (item.state === "ok") stats.triggered += 1;
    }
  } catch (error) { stats.lastError = errorText(error); }

  for (const flow of rows) {
    if (!dueNow(flow, at)) { stats.skipped += 1; continue; }
    triggered += 1;
    stats.triggered += 1;
    try {
      await runFlow(flow, "schedule");
    } catch (error) {
      stats.lastError = errorText(error);
      log("warn", "scheduled run failed", { flow: flow.id, error: stats.lastError });
    }
  }
  return triggered;
}

export function startScheduler({ db, runFlow, tickMs, dataDir }) {
  if (timer !== null) return schedulerState();
  const interval = Math.max(5000, Number(tickMs) || 30000);
  timer = setInterval(() => {
    if (running) return;
    running = true;
    tick({ db, runFlow, dataDir }).catch((error) => { stats.lastError = errorText(error); }).finally(() => { running = false; });
  }, interval);
  timer.unref();
  log("info", "scheduler started", { tickMs: interval });
  return schedulerState();
}

export function stopScheduler() {
  if (timer !== null) { clearInterval(timer); timer = null; log("info", "scheduler stopped", {}); }
  return schedulerState();
}

export function schedulerState() {
  return { running: timer !== null, ...stats };
}

export { dueNow, nowIso };
