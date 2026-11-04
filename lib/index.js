// CreatorHub bridge for DeepSeek Harness — Phase 2: real loopback IO.
// Tools: creatorhub_ping (stub), creatorhub_status, creatorhub_start,
// creatorhub_stop, creatorhub_request. All HTTP is loopback-only; the only
// spawned process is CreatorHub's own .venv python, managed by this plugin.
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import z from "@deepseek-ai/schemastery";
import { defineTool } from "@deepseek-ai/dsh-tools";

export const name = "creatorhub-dsh";

export const Config = z.object({
  baseUrl: z.string().default("http://127.0.0.1:8731"),
  autostart: z.boolean().default(false),
  rootDir: z.string().default("D:\\work\\work\\workstation\\creatorhub-main\\creatorhub-main"),
  healthTimeoutMs: z.number().step(1).min(1000).default(120000),
  requestTimeoutMs: z.number().step(1).min(500).default(30000),
  maxLogBytes: z.number().step(1).min(1024).default(65536)
});

export const inject = ["tools"];

const HEALTH_PATH = "/health";
const MAX_BODY_BYTES = 8 * 1024;

function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

function parseBase(baseUrl) {
  const url = new URL(baseUrl);
  if (url.hostname !== "127.0.0.1" && url.hostname !== "localhost") {
    throw new Error("creatorhub-dsh: baseUrl must be loopback (127.0.0.1 or localhost)");
  }
  return { baseUrl: url.origin, port: url.port || "8731" };
}

function resolvePython(rootDir) {
  const venvPy = process.platform === "win32"
    ? join(rootDir, ".venv", "Scripts", "python.exe")
    : join(rootDir, ".venv", "bin", "python");
  if (existsSync(venvPy)) return venvPy;
  return process.platform === "win32" ? "python" : "python3";
}

export function apply(ctx, config = {}) {
  const { baseUrl, port } = parseBase(config.baseUrl);
  const rootDir = config.rootDir;
  const healthTimeoutMs = config.healthTimeoutMs;
  const requestTimeoutMs = config.requestTimeoutMs;
  const maxLogBytes = config.maxLogBytes;

  // Managed child process state (module-scoped per apply invocation via closure).
  let child = null;
  let childLog = "";

  const pushLog = (chunk) => {
    childLog = (childLog + chunk).slice(-maxLogBytes);
  };
  const tailLog = () => childLog.split("\n").slice(-40).join("\n");

  const isAlive = () => !!child && child.exitCode === null && !child.killed;

  async function killTree(pid) {
    if (process.platform === "win32") {
      await new Promise((resolve) => {
        const k = spawn("taskkill", ["/PID", String(pid), "/T", "/F"], { windowsHide: true });
        k.on("close", resolve);
        k.on("error", resolve);
      });
    }
  }

  async function stopManagedChild() {
    if (!child) return { stopped: false, reason: "no-managed-process" };
    const pid = child.pid;
    const exited = new Promise((resolve) => child.once("exit", resolve));
    try { await killTree(pid); } catch (e) { try { child.kill(); } catch (e2) { /* already gone */ } }
    await Promise.race([exited, sleep(5000)]);
    child = null;
    return { stopped: true, pid };
  }

  async function startManagedChild() {
    if (isAlive()) {
      return { started: false, reason: "already-running", pid: child.pid, port: Number(port), baseUrl };
    }
    const python = resolvePython(rootDir);
    const args = ["creatorhub.py", "start", "--no-open", "--port", String(port)];
    const command = [python, ...args];
    childLog = "";
    const t0 = Date.now();
    let proc;
    try {
      proc = spawn(python, args, { cwd: rootDir, shell: false, windowsHide: true, detached: process.platform !== "win32" });
    } catch (e) {
      throw new Error("creatorhub_start: failed to spawn " + python + ": " + e.message);
    }
    child = proc;
    proc.stdout.on("data", (d) => pushLog(d.toString()));
    proc.stderr.on("data", (d) => pushLog(d.toString()));
    proc.on("exit", () => { /* recorded via exitCode */ });

    const deadline = Date.now() + healthTimeoutMs;
    while (Date.now() < deadline) {
      if (proc.exitCode !== null) {
        child = null;
        throw new Error("creatorhub_start: CreatorHub exited early (code=" + proc.exitCode + "); log:\n" + tailLog());
      }
      try {
        const res = await fetch(baseUrl + HEALTH_PATH, { signal: AbortSignal.timeout(1500) });
        if (res.ok) {
          return { started: true, pid: proc.pid, port: Number(port), baseUrl, readyMs: Date.now() - t0, command, log: tailLog() };
        }
      } catch (e) { /* not healthy yet */ }
      await sleep(500);
    }
    child = null;
    throw new Error("creatorhub_start: CreatorHub did not become healthy within " + healthTimeoutMs + "ms; last log:\n" + tailLog());
  }

  // Lifecycle: Cordis exposes no ctx.onDispose/onExit; the supported hook is
  // ctx.effect(() => disposer), whose disposer runs when the plugin fiber is
  // disposed. Stop only the child this plugin spawned.
  ctx.effect(() => async () => {
    await stopManagedChild();
  });

  const renderText = (value) => [{ type: "text", text: JSON.stringify(value) }];

  ctx.tools.register(defineTool({
    name: "creatorhub_ping",
    description: "探测 CreatorHub 插件骨架是否已加载（Phase 1 桩实现，不访问网络）",
    parameters: {},
    output: {
      schema: {
        type: "object", additionalProperties: false,
        properties: {
          ok: { type: "boolean", required: true },
          plugin: { type: "string", required: true },
          phase: { type: "integer", required: true },
          baseUrl: { type: "string", required: true },
          autostart: { type: "boolean", required: true }
        }
      },
      render: renderText
    },
    execute() {
      return { ok: true, plugin: "creatorhub-dsh", phase: 1, baseUrl, autostart: config.autostart };
    }
  }));

  ctx.tools.register(defineTool({
    name: "creatorhub_status",
    description: "Probe the local CreatorHub service at /health (loopback only). Never throws; returns { running: false } when it is not up.",
    parameters: {},
    output: {
      schema: {
        type: "object", additionalProperties: false,
        properties: {
          running: { type: "boolean", required: true },
          latencyMs: { type: "integer" },
          raw: { type: "string" },
          error: { type: "string" }
        }
      },
      render: renderText
    },
    async execute() {
      const t0 = Date.now();
      try {
        const res = await fetch(baseUrl + HEALTH_PATH, { signal: AbortSignal.timeout(2000) });
        const raw = await res.text();
        return { running: res.ok, latencyMs: Date.now() - t0, raw, error: res.ok ? undefined : "HTTP " + res.status };
      } catch (e) {
        return { running: false, error: String(e && e.message ? e.message : e) };
      }
    }
  }));

  ctx.tools.register(defineTool({
    name: "creatorhub_start",
    description: "Start the local CreatorHub backend (CreatorHub's own .venv python, cwd=rootDir) and wait for /health. Loopback only.",
    parameters: {},
    output: {
      schema: {
        type: "object", additionalProperties: false,
        properties: {
          started: { type: "boolean", required: true },
          pid: { type: "integer" },
          port: { type: "integer" },
          baseUrl: { type: "string" },
          readyMs: { type: "integer" },
          command: { type: "array", items: { type: "string" } },
          log: { type: "string" },
          reason: { type: "string" }
        }
      },
      render: renderText
    },
    execute: startManagedChild
  }));

  ctx.tools.register(defineTool({
    name: "creatorhub_stop",
    description: "Stop only the CreatorHub process this plugin started. Never kills an unknown PID.",
    parameters: {},
    output: {
      schema: {
        type: "object", additionalProperties: false,
        properties: {
          stopped: { type: "boolean", required: true },
          pid: { type: "integer" },
          reason: { type: "string" }
        }
      },
      render: renderText
    },
    execute: stopManagedChild
  }));

  ctx.tools.register(defineTool({
    name: "creatorhub_request",
    description: "Call a CreatorHub /api/* endpoint on the loopback base URL. GET is an unapproved read; any non-GET method must match the shared write whitelist and pass approval (high-risk paths need two approvals).",
    parameters: {
      method: { type: "string", required: true, enum: ["GET", "POST", "PUT", "DELETE"] },
      path: { type: "string", required: true },
      body: { type: "json" }
    },
    output: {
      schema: {
        type: "object", additionalProperties: false,
        properties: {
          status: { oneOf: [{ type: "integer" }, { type: "null" }] },
          body: { type: "string" },
          truncated: { type: "boolean" },
          bodyBytes: { type: "integer" },
          contentType: { type: "string" },
          ok: { type: "boolean" },
          data: { type: "json" },
          error: { type: "string" },
          approval: { type: "string" }
        }
      },
      render: renderText
    },
    async execute(args, exec) {
      const method = String(args.method || "").toUpperCase();
      const reqPath = args.path;
      if (method === "GET") {
        if (typeof reqPath !== "string" || !reqPath.startsWith("/api/")) {
          throw new Error("creatorhub_request: path must start with /api/ (got " + JSON.stringify(reqPath) + ")");
        }
        const init = { method, signal: AbortSignal.timeout(requestTimeoutMs), headers: {} };
        const res = await fetch(baseUrl + reqPath, init);
        const text = await res.text();
        const bytes = Buffer.byteLength(text, "utf8");
        let out = text;
        let truncated = false;
        if (bytes > MAX_BODY_BYTES) { out = text.slice(0, MAX_BODY_BYTES); truncated = true; }
        return { status: res.status, body: out, truncated, bodyBytes: bytes, contentType: res.headers.get("content-type") || "" };
      }
      return runWrite("creatorhub_request", method, reqPath, {
        body: args.body,
        summary: { path: reqPath, body: args.body },
        exec
      });
    }
  }));

  // ── Phase 3: typed read-only tools over CreatorHub's real /api/* routes ──
  // Routes verified in app/main.py: /api/overview/summary:1711, /api/accounts:1728,
  // /api/account-stats/{account_id}:3560, /api/task-queue:1880, /api/monitors:8112,
  // /api/collections:7485.
  // Shared GET helper: builds a loopback URL, parses JSON, never throws.
  // Shared HTTP executor (read + write). Loopback baseUrl only; never throws.
  async function callApi(method, reqPath, options) {
    const opts = options || {};
    const url = new URL(baseUrl + reqPath);
    if (opts.query) {
      for (const [key, value] of Object.entries(opts.query)) {
        if (value === undefined || value === null || value === "") continue;
        url.searchParams.set(key, String(value));
      }
    }
    const init = { method, signal: AbortSignal.timeout(requestTimeoutMs), headers: {} };
    if (opts.body !== undefined) {
      init.headers["content-type"] = "application/json";
      init.body = JSON.stringify(opts.body);
    }
    try {
      const res = await fetch(url, init);
      const text = await res.text();
      const bytes = Buffer.byteLength(text, "utf8");
      const truncated = bytes > MAX_BODY_BYTES;
      let data = null;
      if (text.length > 0) {
        try { data = JSON.parse(text); }
        catch (e) { return { ok: false, data: null, truncated, error: "invalid JSON response", status: res.status, bodyBytes: bytes }; }
      }
      if (!res.ok) return { ok: false, data, truncated, error: "HTTP " + res.status, status: res.status, bodyBytes: bytes };
      return { ok: true, data, truncated, status: res.status, bodyBytes: bytes };
    } catch (e) {
      return { ok: false, data: null, truncated: false, error: String(e && e.message ? e.message : e) };
    }
  }

  function getJson(reqPath, query) {
    return callApi("GET", reqPath, { query });
  }

  const READ_OUTPUT = {
    schema: {
      type: "object", additionalProperties: false,
      properties: {
        ok: { type: "boolean", required: true },
        data: { type: "json" },
        truncated: { type: "boolean" },
        error: { type: "string" },
        status: { type: "integer" },
        bodyBytes: { type: "integer" }
      }
    },
    render: renderText
  };

  const PLATFORMS = ["douyin", "xhs", "kuaishou", "shipinhao", "tiktok"];

  ctx.tools.register(defineTool({
    name: "creatorhub_overview",
    description: "读取 CreatorHub 某平台的总览计数（账号数、启用监控数、已下载作品数、评论数）。用于快速了解该平台当前规模。返回 { ok, data: { platform, accounts, monitors, downloaded, comments }, truncated }。",
    parameters: {
      platform: { type: "string", enum: PLATFORMS, default: "douyin", description: "平台；默认 douyin" }
    },
    output: READ_OUTPUT,
    execute(args) {
      return getJson("/api/overview/summary", { platform: args.platform ?? "douyin" });
    }
  }));

  ctx.tools.register(defineTool({
    name: "creatorhub_accounts",
    description: "列出 CreatorHub 已添加账号（登录态、风控、指纹、代理等字段）。可按平台过滤。返回 { ok, data: [...], truncated }。",
    parameters: {
      platform: { type: "string", enum: PLATFORMS, description: "平台过滤；省略返回全部平台" }
    },
    output: READ_OUTPUT,
    execute(args) {
      return getJson("/api/accounts", { platform: args.platform });
    }
  }));

  ctx.tools.register(defineTool({
    name: "creatorhub_account_stats",
    description: "读取单个账号近 N 天的每日快照趋势与当前作品互动明细。account_id 可先用 creatorhub_accounts 获取。返回 { ok, data: { account, fans_delta, trend, works }, truncated }。",
    parameters: {
      account_id: { type: "integer", required: true, description: "账号 ID" },
      days: { type: "integer", default: 30, description: "统计天数，1–180，默认 30" }
    },
    output: READ_OUTPUT,
    execute(args) {
      const id = Number(args.account_id);
      if (!Number.isInteger(id) || id <= 0) return { ok: false, data: null, truncated: false, error: "account_id must be a positive integer" };
      return getJson("/api/account-stats/" + id, { days: args.days ?? 30 });
    }
  }));

  ctx.tools.register(defineTool({
    name: "creatorhub_task_queue",
    description: "读取 CreatorHub 统一任务队列（采集/发布/评论/操作/下载），含分页与状态汇总。返回 { ok, data: { items, total, page, page_size, pages, summary, generated_at }, truncated }。",
    parameters: {
      platform: { type: "string", enum: PLATFORMS, description: "平台过滤" },
      queue_type: { type: "string", enum: ["collections", "publishes", "comments", "actions", "monitor_downloads", "collection_downloads"], description: "队列类型过滤" },
      state: { type: "string", enum: ["active", "pending", "running", "blocked", "failed", "completed", "all"], default: "active", description: "状态过滤，默认 active" },
      q: { type: "string", description: "关键词过滤（标题/详情/账号等）" },
      page: { type: "integer", default: 1, description: "页码，默认 1" },
      page_size: { type: "integer", default: 20, description: "每页条数，1–100，默认 20" }
    },
    output: READ_OUTPUT,
    execute(args) {
      return getJson("/api/task-queue", {
        platform: args.platform, queue_type: args.queue_type,
        state: args.state ?? "active", q: args.q,
        page: args.page ?? 1, page_size: args.page_size ?? 20
      });
    }
  }));

  ctx.tools.register(defineTool({
    name: "creatorhub_monitors",
    description: "列出 CreatorHub 监控目标（博主/关键词）及其作品数。可按平台过滤。返回 { ok, data: [...], truncated }。",
    parameters: {
      platform: { type: "string", enum: PLATFORMS, description: "平台过滤；省略返回全部" }
    },
    output: READ_OUTPUT,
    execute(args) {
      return getJson("/api/monitors", { platform: args.platform });
    }
  }));

  ctx.tools.register(defineTool({
    name: "creatorhub_collections",
    description: "列出 CreatorHub 关键词采集任务（配置、进度、状态）。可按平台过滤并按条数上限截取。返回 { ok, data: [...], truncated }。",
    parameters: {
      platform: { type: "string", enum: PLATFORMS, description: "平台过滤" },
      limit: { type: "integer", default: 100, description: "最多返回条数，1–300，默认 100" }
    },
    output: READ_OUTPUT,
    execute(args) {
      return getJson("/api/collections", { platform: args.platform, limit: args.limit ?? 100 });
    }
  }));

  // ── Phase 4: approval-gated write tools ──
  // Approval contract verified in @deepseek-ai/dsh-user-approval:
  //   ctx.get("approval").request({agent, toolName, callId?, reason?, displayReason?, signal?})
  //   -> "allowed-once" | "rejected" | "cancelled" | "unavailable"; only allowed-once grants.
  // Every approval call is wrapped in try/catch and fails closed.

  // method + path template whitelist shared by creatorhub_request and every write tool.
  const WRITE_WHITELIST = [
    { method: "POST",   pattern: "/api/login/browser/start",          tool: "creatorhub_login",         risk: "high" },
    { method: "POST",   pattern: "/api/login/creator/start",          tool: "creatorhub_login",         risk: "high" },
    { method: "POST",   pattern: "/api/login/xhs/start",              tool: "creatorhub_login",         risk: "high" },
    { method: "POST",   pattern: "/api/login/xhs-creator/start",      tool: "creatorhub_login",         risk: "high" },
    { method: "POST",   pattern: "/api/login/kuaishou/start",         tool: "creatorhub_login",         risk: "high" },
    { method: "POST",   pattern: "/api/login/kuaishou-creator/start", tool: "creatorhub_login",         risk: "high" },
    { method: "POST",   pattern: "/api/login/shipinhao/start",        tool: "creatorhub_login",         risk: "high" },
    { method: "POST",   pattern: "/api/login/tiktok/start",           tool: "creatorhub_login",         risk: "high" },
    { method: "POST",   pattern: "/api/collections",                  tool: "creatorhub_task_create",   risk: "high" },
    { method: "POST",   pattern: "/api/collections/{job_id}/cancel",  tool: "creatorhub_task_cancel",   risk: "medium" },
    { method: "POST",   pattern: "/api/monitors",                     tool: "creatorhub_monitor_add",   risk: "high" },
    { method: "DELETE", pattern: "/api/monitors/{tid}",               tool: "creatorhub_monitor_remove", risk: "medium" },
    { method: "POST",   pattern: "/api/share-download",               tool: "creatorhub_download",      risk: "high" },
    { method: "POST",   pattern: "/api/publish",                      tool: "creatorhub_publish",       risk: "high" },
    { method: "POST",   pattern: "/api/comment-rules",                tool: "creatorhub_comment",       risk: "high" },
    { method: "POST",   pattern: "/api/account-actions",              tool: "creatorhub_message",       risk: "high" },
    { method: "PUT",    pattern: "/api/accounts/{account_id}/proxy",  tool: "creatorhub_proxy_set",     risk: "medium" }
  ];

  const SENSITIVE_KEY_RE = /(cookie|token|secret|password|passwd|authorization|api[_-]?key|storage_state|session|credential)/i;
  const BACKSLASH = String.fromCharCode(92);

  // Strip scheme://user:pass@ credentials from any string before logging.
  function stripUserInfo(value) {
    const text = String(value);
    const at = text.indexOf("@");
    const scheme = text.indexOf("://");
    if (at > 0 && scheme >= 0 && at > scheme) {
      return text.slice(0, scheme + 3) + "[redacted]@" + text.slice(at + 1);
    }
    return text;
  }
  function redactString(value) {
    let out = stripUserInfo(value);
    if (out.length > 160) out = out.slice(0, 160) + "...";
    return out;
  }
  function redactValue(value, depth) {
    const d = depth || 0;
    if (d > 4) return "[depth]";
    if (value === null || value === undefined) return value;
    if (typeof value === "string") return redactString(value);
    if (typeof value === "number" || typeof value === "boolean") return value;
    if (Array.isArray(value)) return value.slice(0, 8).map((item) => redactValue(item, d + 1));
    if (typeof value === "object") {
      const out = {};
      for (const [key, val] of Object.entries(value)) {
        out[key] = SENSITIVE_KEY_RE.test(key) ? "[redacted]" : redactValue(val, d + 1);
      }
      return out;
    }
    return "[unserializable]";
  }
  // Write audit log: path + redacted parameter summary. Credentials never enter it.
  function writeLog(decision, toolName, method, reqPath, summary) {
    const line = "creatorhub-dsh write decision=" + decision + " tool=" + toolName + " " + method + " " + reqPath + " params=" + JSON.stringify(redactValue(summary));
    try {
      if (ctx.logger && typeof ctx.logger.info === "function") ctx.logger.info(line);
      if (decision !== "granted" && ctx.logger && typeof ctx.logger.warn === "function") ctx.logger.warn(line);
    } catch (e) { /* logging must never break a call */ }
  }

  // Normalize an incoming path: leading-slash relative only, drop query, reject traversal.
  function normalizeApiPath(raw) {
    if (typeof raw !== "string" || raw.length === 0) return null;
    if (raw.charAt(0) !== "/") return null;        // reject absolute/public URLs
    if (raw.indexOf("//") >= 0) return null;        // reject double slash
    if (raw.indexOf("..") >= 0) return null;        // reject traversal
    if (/%2e/i.test(raw)) return null;              // reject encoded dot
    let pathname;
    try { pathname = new URL(raw, "http://127.0.0.1").pathname; } catch (e) { return null; }
    if (pathname.indexOf("/api/") !== 0) return null;
    return pathname;
  }
  function patternToRegExp(pattern) {
    const parts = pattern.split("/").map(function (seg) {
      if (/^[{][A-Za-z0-9_]+[}]$/.test(seg)) return "[^/]+";
      return seg.replace(/[^A-Za-z0-9_.-]/g, function (ch) { return BACKSLASH + ch; });
    });
    return new RegExp("^" + parts.join("/") + "$");
  }
  for (const entry of WRITE_WHITELIST) entry.re = patternToRegExp(entry.pattern);
  function matchWhitelist(method, pathname) {
    for (const entry of WRITE_WHITELIST) {
      if (entry.method !== method) continue;
      if (entry.re.test(pathname)) return entry;
    }
    return null;
  }

  // Approval helper. Missing service, missing agent, thrown error, or any non-grant
  // outcome all fail closed.
  async function askApproval(exec, toolName, reason, displayReason) {
    const approver = ctx.get("approval");
    if (approver === undefined || approver === null || typeof approver.request !== "function") {
      return { granted: false, outcome: "unavailable", error: "approval service is not composed" };
    }
    if (exec === undefined || exec === null || exec.agent === undefined || exec.agent === null) {
      return { granted: false, outcome: "unavailable", error: "no agent to route the approval through" };
    }
    try {
      const req = { agent: exec.agent, toolName: toolName, reason: reason };
      if (exec.callId !== undefined) req.callId = exec.callId;
      if (displayReason !== undefined) req.displayReason = displayReason;
      if (exec.signal !== undefined) req.signal = exec.signal;
      const outcome = await approver.request(req);
      if (outcome === "allowed-once") return { granted: true, outcome: outcome };
      return { granted: false, outcome: outcome, error: "approval " + outcome };
    } catch (e) {
      return { granted: false, outcome: "unavailable", error: String(e && e.message ? e.message : e) };
    }
  }
  function approvalDisplay(toolName, method, reqPath, summary, secondary) {
    const detail = JSON.stringify(redactValue(summary));
    if (secondary) {
      return {
        en: "Re-confirm this possibly irreversible action: " + method + " " + reqPath + " with " + detail + ". On confirmation it is sent to the local CreatorHub service.",
        zh: "再次确认：" + method + " " + reqPath + "，参数 " + detail + "。该操作可能触发不可逆的真实平台动作，确认后将立即发往本地 CreatorHub 服务。"
      };
    }
    return {
      en: "CreatorHub tool " + toolName + " requests " + method + " " + reqPath + " with " + detail + ".",
      zh: "CreatorHub 工具 " + toolName + " 请求执行 " + method + " " + reqPath + "，参数 " + detail + "。"
    };
  }
  function writeFailure(error, outcome) {
    const result = { ok: false, data: null, truncated: false, error: error, status: null };
    if (outcome !== undefined) result.approval = outcome;
    return result;
  }

  // Safety layer: whitelist -> approval (x1 or x2 for high risk) -> log -> request.
  async function runWrite(toolName, method, rawPath, options) {
    const opts = options || {};
    const summary = opts.summary !== undefined ? opts.summary : {};
    const pathname = normalizeApiPath(rawPath);
    const entry = pathname === null ? null : matchWhitelist(method, pathname);
    if (entry === null) {
      writeLog("forbidden", toolName, method, typeof rawPath === "string" ? rawPath : String(rawPath), summary);
      return writeFailure("forbidden");
    }
    const exec = opts.exec;
    const first = await askApproval(exec, toolName, method + " " + pathname + " " + JSON.stringify(redactValue(summary)), approvalDisplay(toolName, method, pathname, summary, false));
    if (!first.granted) {
      writeLog("approval-denied", toolName, method, pathname, summary);
      return writeFailure("approval-denied", first.outcome);
    }
    if (entry.risk === "high") {
      const second = await askApproval(exec, toolName, "confirm " + method + " " + pathname, approvalDisplay(toolName, method, pathname, summary, true));
      if (!second.granted) {
        writeLog("secondary-approval-denied", toolName, method, pathname, summary);
        return writeFailure("secondary-approval-denied", second.outcome);
      }
    }
    writeLog("granted", toolName, method, pathname, summary);
    const out = await callApi(method, pathname, { query: opts.query, body: opts.body });
    return { ok: out.ok, data: out.data, truncated: out.truncated, status: out.status, bodyBytes: out.bodyBytes, error: out.error, approval: first.outcome };
  }

  const WRITE_OUTPUT = {
    schema: {
      type: "object", additionalProperties: false,
      properties: {
        ok: { type: "boolean", required: true },
        data: { type: "json" },
        truncated: { type: "boolean" },
        error: { type: "string" },
        status: { oneOf: [{ type: "integer" }, { type: "null" }] },
        bodyBytes: { type: "integer" },
        approval: { type: "string" }
      }
    },
    render: renderText
  };
  // ── Phase 4 tools: each maps to one real route and must pass approval ──

  ctx.tools.register(defineTool({
    name: "creatorhub_login",
    description: "打开 CreatorHub 交互式扫码登录（按平台/创作中心选择真实路由）。高风险：两次审批；可能拉起本机浏览器窗口。返回 { ok, data, status, truncated, error?, approval? }。",
    parameters: {
      platform: { type: "string", enum: PLATFORMS, required: true, description: "平台" },
      creator: { type: "boolean", default: false, description: "是否创作中心登录（shipinhao/tiktok 不支持）" },
      proxy: { type: "string", default: "auto", description: "代理选择，默认 auto" },
      browser_backend: { type: "string", default: "default", description: "浏览器后端，默认 default" }
    },
    output: WRITE_OUTPUT,
    execute(args, exec) {
      const platform = String(args.platform || "");
      const creator = args.creator === true;
      const proxy = args.proxy === undefined ? "auto" : args.proxy;
      const backend = args.browser_backend === undefined ? "default" : args.browser_backend;
      let slug;
      if (platform === "douyin") slug = creator ? "creator" : "browser";
      else if (platform === "xhs" || platform === "kuaishou") slug = creator ? platform + "-creator" : platform;
      else if (platform === "shipinhao" || platform === "tiktok") {
        if (creator) return writeFailure("creator login is not supported for " + platform);
        slug = platform;
      } else return writeFailure("unsupported platform " + platform);
      return runWrite("creatorhub_login", "POST", "/api/login/" + slug + "/start", {
        query: { proxy: proxy, browser_backend: backend },
        summary: { platform: platform, creator: creator, proxy: proxy, browser_backend: backend },
        exec
      });
    }
  }));

  ctx.tools.register(defineTool({
    name: "creatorhub_task_create",
    description: "创建关键词采集任务（POST /api/collections）。高风险：两次审批；会触发真实平台采集。返回 { ok, data, status, truncated, error?, approval? }。",
    parameters: {
      account_id: { type: "integer", required: true, description: "执行采集的账号 ID" },
      platform: { type: "string", enum: PLATFORMS, default: "douyin", description: "平台" },
      keywords: { type: "array", items: { type: "string" }, description: "关键词列表" },
      source_type: { type: "string", default: "keyword", description: "来源类型" },
      source_ref: { type: "string", description: "来源引用（创作者/作品）" },
      max_contents_per_keyword: { type: "integer", default: 20, description: "每个关键词最多采集条数" },
      max_comments_per_content: { type: "integer", default: 20, description: "每篇最多评论数" },
      download_media: { type: "boolean", default: false, description: "是否下载媒体" }
    },
    output: WRITE_OUTPUT,
    execute(args, exec) {
      const body = {
        account_id: args.account_id,
        platform: args.platform === undefined ? "douyin" : args.platform,
        keywords: args.keywords === undefined ? [] : args.keywords,
        source_type: args.source_type === undefined ? "keyword" : args.source_type,
        source_ref: args.source_ref === undefined ? "" : args.source_ref,
        max_contents_per_keyword: args.max_contents_per_keyword === undefined ? 20 : args.max_contents_per_keyword,
        max_comments_per_content: args.max_comments_per_content === undefined ? 20 : args.max_comments_per_content,
        download_media: args.download_media === true
      };
      return runWrite("creatorhub_task_create", "POST", "/api/collections", { body, summary: body, exec });
    }
  }));

  ctx.tools.register(defineTool({
    name: "creatorhub_task_cancel",
    description: "取消采集任务（POST /api/collections/{job_id}/cancel）。中风险：一次审批。返回 { ok, data, status, truncated, error?, approval? }。",
    parameters: {
      job_id: { type: "integer", required: true, description: "采集任务 ID" }
    },
    output: WRITE_OUTPUT,
    execute(args, exec) {
      const jobId = Number(args.job_id);
      if (!Number.isInteger(jobId) || jobId <= 0) return writeFailure("job_id must be a positive integer");
      return runWrite("creatorhub_task_cancel", "POST", "/api/collections/" + jobId + "/cancel", { summary: { job_id: jobId }, exec });
    }
  }));

  ctx.tools.register(defineTool({
    name: "creatorhub_monitor_add",
    description: "添加监控目标（POST /api/monitors）。高风险：两次审批；会触发真实平台解析与后续扫描。返回 { ok, data, status, truncated, error?, approval? }。",
    parameters: {
      url_or_secuid: { type: "string", required: true, description: "主页链接/分享文案/sec_uid（或小红书关键词）" },
      platform: { type: "string", enum: PLATFORMS, default: "douyin", description: "平台" },
      target_kind: { type: "string", default: "creator", description: "creator 或 keyword（仅小红书）" },
      account_id: { type: "integer", description: "关联账号 ID" },
      interval_seconds: { type: "integer", default: 300, description: "扫描间隔秒" },
      download_enabled: { type: "boolean", default: true, description: "是否下载新作品" }
    },
    output: WRITE_OUTPUT,
    execute(args, exec) {
      const body = {
        url_or_secuid: args.url_or_secuid,
        platform: args.platform === undefined ? "douyin" : args.platform,
        target_kind: args.target_kind === undefined ? "creator" : args.target_kind,
        interval_seconds: args.interval_seconds === undefined ? 300 : args.interval_seconds,
        download_enabled: args.download_enabled !== false
      };
      if (args.account_id !== undefined) body.account_id = args.account_id;
      return runWrite("creatorhub_monitor_add", "POST", "/api/monitors", { body, summary: body, exec });
    }
  }));

  ctx.tools.register(defineTool({
    name: "creatorhub_monitor_remove",
    description: "删除监控目标（DELETE /api/monitors/{tid}）。中风险：一次审批。返回 { ok, data, status, truncated, error?, approval? }。",
    parameters: {
      tid: { type: "integer", required: true, description: "监控目标 ID" }
    },
    output: WRITE_OUTPUT,
    execute(args, exec) {
      const tid = Number(args.tid);
      if (!Number.isInteger(tid) || tid <= 0) return writeFailure("tid must be a positive integer");
      return runWrite("creatorhub_monitor_remove", "DELETE", "/api/monitors/" + tid, { summary: { tid: tid }, exec });
    }
  }));

  ctx.tools.register(defineTool({
    name: "creatorhub_download",
    description: "解析并下载分享链接媒体（POST /api/share-download）。高风险：两次审批。返回 { ok, data, status, truncated, error?, approval? }。",
    parameters: {
      share_text: { type: "string", required: true, description: "分享链接或完整分享文案" },
      download: { type: "boolean", default: true, description: "false 仅解析不下载" },
      quality: { type: "string", default: "highest", description: "画质，默认 highest" },
      account_id: { type: "integer", description: "可选：复用该账号 Cookie/代理" }
    },
    output: WRITE_OUTPUT,
    execute(args, exec) {
      const body = {
        share_text: args.share_text,
        download: args.download !== false,
        quality: args.quality === undefined ? "highest" : args.quality
      };
      if (args.account_id !== undefined) body.account_id = args.account_id;
      return runWrite("creatorhub_download", "POST", "/api/share-download", { body, summary: body, exec });
    }
  }));

  ctx.tools.register(defineTool({
    name: "creatorhub_publish",
    description: "创建发布任务（POST /api/publish）。高风险：两次审批；会真实投稿到平台。返回 { ok, data, status, truncated, error?, approval? }。",
    parameters: {
      account_id: { type: "integer", required: true, description: "发布账号 ID" },
      media_type: { type: "string", enum: ["images", "video"], default: "images", description: "媒体类型" },
      title: { type: "string", description: "标题" },
      desc: { type: "string", description: "正文/描述" },
      topics: { type: "string", description: "话题" },
      media_paths: { type: "array", items: { type: "string" }, description: "本地媒体路径列表" },
      visibility: { type: "string", enum: ["public", "friends", "private"], default: "public", description: "可见性" },
      scheduled_at: { type: "string", description: "ISO 定时时间；空=尽快" }
    },
    output: WRITE_OUTPUT,
    execute(args, exec) {
      const body = {
        account_id: args.account_id,
        media_type: args.media_type === undefined ? "images" : args.media_type,
        title: args.title === undefined ? "" : args.title,
        desc: args.desc === undefined ? "" : args.desc,
        topics: args.topics === undefined ? "" : args.topics,
        media_paths: args.media_paths === undefined ? [] : args.media_paths,
        visibility: args.visibility === undefined ? "public" : args.visibility
      };
      if (args.scheduled_at !== undefined) body.scheduled_at = args.scheduled_at;
      return runWrite("creatorhub_publish", "POST", "/api/publish", { body, summary: body, exec });
    }
  }));

  ctx.tools.register(defineTool({
    name: "creatorhub_comment",
    description: "创建评论/自动回复规则（POST /api/comment-rules）。高风险：两次审批；启用后会在真实平台评论。返回 { ok, data, status, truncated, error?, approval? }。",
    parameters: {
      account_id: { type: "integer", required: true, description: "执行账号 ID" },
      platform: { type: "string", enum: PLATFORMS, default: "douyin", description: "平台" },
      mode: { type: "string", enum: ["auto_reply", "auto_comment"], default: "auto_reply", description: "模式" },
      target_kind: { type: "string", default: "self", description: "回复: self|work；评论: keyword|creator" },
      target: { type: "string", description: "关键词或目标链接/ID" },
      templates: { type: "array", items: { type: "string" }, description: "回复/评论文案模板" },
      daily_cap: { type: "integer", default: 20, description: "每日上限" },
      enabled: { type: "boolean", default: false, description: "是否立即启用" }
    },
    output: WRITE_OUTPUT,
    execute(args, exec) {
      const body = {
        account_id: args.account_id,
        platform: args.platform === undefined ? "douyin" : args.platform,
        mode: args.mode === undefined ? "auto_reply" : args.mode,
        target_kind: args.target_kind === undefined ? "self" : args.target_kind,
        target: args.target === undefined ? "" : args.target,
        templates: args.templates === undefined ? [] : args.templates,
        daily_cap: args.daily_cap === undefined ? 20 : args.daily_cap,
        enabled: args.enabled === true
      };
      return runWrite("creatorhub_comment", "POST", "/api/comment-rules", { body, summary: body, exec });
    }
  }));

  ctx.tools.register(defineTool({
    name: "creatorhub_message",
    description: "发送私信（POST /api/account-actions，action=send_dm）。高风险：两次审批；会向真实用户发送消息。返回 { ok, data, status, truncated, error?, approval? }。",
    parameters: {
      account_id: { type: "integer", required: true, description: "发送账号 ID" },
      content: { type: "string", required: true, description: "私信内容" },
      target_uid: { type: "string", description: "目标 uid" },
      target_sec_uid: { type: "string", description: "目标 sec_uid" },
      target_nick: { type: "string", description: "目标昵称备注" },
      conv_id: { type: "string", description: "会话 ID（可选）" },
      run_now: { type: "boolean", default: false, description: "true=立即执行，false=入队" }
    },
    output: WRITE_OUTPUT,
    execute(args, exec) {
      const body = {
        account_id: args.account_id,
        action: "send_dm",
        content: args.content,
        target_uid: args.target_uid === undefined ? "" : args.target_uid,
        target_sec_uid: args.target_sec_uid === undefined ? "" : args.target_sec_uid,
        target_nick: args.target_nick === undefined ? "" : args.target_nick,
        conv_id: args.conv_id === undefined ? "" : args.conv_id,
        run_now: args.run_now === true
      };
      return runWrite("creatorhub_message", "POST", "/api/account-actions", { body, summary: body, exec });
    }
  }));

  ctx.tools.register(defineTool({
    name: "creatorhub_proxy_set",
    description: "设置/清空账号专属代理（PUT /api/accounts/{account_id}/proxy）。中风险：一次审批。日志会剥离代理中的账号密码。返回 { ok, data, status, truncated, error?, approval? }。",
    parameters: {
      account_id: { type: "integer", required: true, description: "账号 ID" },
      proxy: { type: "string", required: true, description: "代理 URL；空字符串表示清空" }
    },
    output: WRITE_OUTPUT,
    execute(args, exec) {
      const accountId = Number(args.account_id);
      if (!Number.isInteger(accountId) || accountId <= 0) return writeFailure("account_id must be a positive integer");
      const body = { proxy: args.proxy === undefined ? "" : args.proxy };
      return runWrite("creatorhub_proxy_set", "PUT", "/api/accounts/" + accountId + "/proxy", { body, summary: body, exec });
    }
  }));
  // ── Phase 6: read-only config bridge for the browser half ──
  // The client half runs in the browser, a separate Cordis tree: it cannot read
  // this ctx and the client runner mounts it with no config
  // (dsh-cordis-client-runner/lib/client.js:564 -> loader.create({ name: moduleId })).
  // So the effective config is exposed as a host-registered, loopback-only HTTP
  // route, following @deepseek-ai/dsh-host-open-in-app/lib/index.js:1271. The route
  // is gated by the connection Host/Origin fence
  // (dsh-client-connection/lib/index.js:737 requestRejection) and is read-only.
  const CONFIG_PATH = "/creatorhub-dsh/config";

  function configPayload() {
    return {
      baseUrl: baseUrl,
      rootDir: rootDir,
      healthTimeoutMs: healthTimeoutMs,
      requestTimeoutMs: requestTimeoutMs
    };
  }

  // Read-only config tool (no approval, no network, no credentials).
  ctx.tools.register(defineTool({
    name: "creatorhub_config_get",
    description: "读取 CreatorHub 插件当前生效的只读配置：baseUrl、rootDir、healthTimeoutMs、requestTimeoutMs。只读、不触审批、不访问网络、无凭证。浏览器半身也通过 /creatorhub-dsh/config 读取同一份配置。",
    parameters: {},
    output: {
      schema: {
        type: "object", additionalProperties: false,
        properties: {
          baseUrl: { type: "string", required: true },
          rootDir: { type: "string", required: true },
          healthTimeoutMs: { type: "integer", required: true },
          requestTimeoutMs: { type: "integer", required: true }
        }
      },
      render: renderText
    },
    execute() { return configPayload(); }
  }));

  // Optional injection: the headless profile composes no webServer, so never
  // hard-inject it (that would park this plugin forever). Mirrors
  // dsh-client-modules/lib/index.js:570.
  ctx.inject(["webServer"], (webCtx) => {
    webCtx.effect(() => webCtx.webServer.register({
      kind: "exact",
      path: CONFIG_PATH,
      handler: async (req, res) => {
        const connection = ctx.get("connection");
        if (connection !== undefined && typeof connection.requestRejection === "function") {
          const rejection = connection.requestRejection(req);
          if (rejection !== undefined) { res.statusCode = rejection; res.end(); return; }
        }
        if (req.method !== "GET") {
          res.statusCode = 405;
          res.setHeader("allow", "GET");
          res.end();
          return;
        }
        res.statusCode = 200;
        res.setHeader("content-type", "application/json; charset=utf-8");
        res.setHeader("cache-control", "no-store");
        res.end(JSON.stringify(configPayload()));
      }
    }), "creatorhub-dsh: config route");
  });
  // autostart is deliberately deferred: apply() itself never spawns. When true,
  // the start runs on the next event-loop tick after apply returns.
  if (config.autostart) {
    void Promise.resolve().then(() => startManagedChild().catch((e) => {
      if (ctx.logger && typeof ctx.logger.warn === "function") ctx.logger.warn("creatorhub-dsh autostart failed: " + e.message);
    }));
  }
}
