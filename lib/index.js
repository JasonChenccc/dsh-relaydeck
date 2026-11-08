// RelayDeck (dsh-relaydeck) — DSH host half.
//
// Owns the RelayDeck backend process (server/index.mjs) through ctx.subprocess
// and exposes it to the agent as tools plus to the panel as same-origin routes.
// Everything is loopback-only; the backend ships with the plugin and needs no
// third-party runtime.
import { existsSync, realpathSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import z from "@deepseek-ai/schemastery";
import { defineTool } from "@deepseek-ai/dsh-tools";

export const name = "dsh-relaydeck";

export const Config = z.object({
  port: z.number().step(1).min(1).max(65535).default(18731),
  dataDir: z.string().default(""),
  autostart: z.boolean().default(true),
  startTimeoutMs: z.number().step(1).min(1000).default(30000),
  requestTimeoutMs: z.number().step(1).min(500).default(30000),
  maxLogBytes: z.number().step(1).min(1024).default(65536),
  devMode: z.boolean().default(false),
  allowHostRestart: z.boolean().default(false)
});

export const inject = ["tools", "subprocess"];

const HEALTH_PATH = "/health";
const CONFIG_PATH = "/dsh-relaydeck/config";
const PROXY_PATH = "/dsh-relaydeck/proxy";
const DEV_PACK_PATH = "/dsh-relaydeck/dev/pack";
const DEV_RESTART_PATH = "/dsh-relaydeck/dev/restart";

function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }
function text(value) { return [{ type: "text", text: JSON.stringify(value) }]; }

function backendPath(pluginRoot) {
  return join(pluginRoot, "server", "index.mjs");
}

export function apply(ctx, config = {}) {
  const port = config.port;
  const baseUrl = "http://127.0.0.1:" + port;
  const pluginRoot = fileURLToPath(new URL("..", import.meta.url));
  const entry = backendPath(pluginRoot);
  const dataDir = config.dataDir && config.dataDir.length > 0 ? config.dataDir : join(homedir(), ".relaydeck");
  const startTimeoutMs = config.startTimeoutMs;
  const requestTimeoutMs = config.requestTimeoutMs;
  const maxLogBytes = config.maxLogBytes;

  // A linked install (dev source) resolves to a different real path; that is the
  // reliable dev-mode signal. The explicit config flag can force either way.
  const linkedSource = (() => {
    try { return realpathSync(pluginRoot) !== pluginRoot.replace(/[\\/]+$/, ""); } catch (e) { return false; }
  })();
  const devMode = config.devMode === true || linkedSource;
  const allowHostRestart = config.allowHostRestart === true;

  // ── managed backend ──
  let handle = null;
  let adopted = false;

  const readLog = () => {
    try {
      if (!handle || !handle.collected || !handle.collected.stdout) return "";
      return handle.collected.stdout.readFrom(0).text || "";
    } catch (e) { return ""; }
  };
  const tailLog = () => readLog().split("\n").slice(-40).join("\n");
  const isAlive = () => handle !== null;

  async function probe() {
    try {
      const res = await fetch(baseUrl + HEALTH_PATH, { signal: AbortSignal.timeout(1500) });
      return res.ok;
    } catch (e) { return false; }
  }

  async function callBackend(method, path, body) {
    const res = await fetch(baseUrl + path, {
      method,
      headers: body === undefined ? { accept: "application/json" } : { accept: "application/json", "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(requestTimeoutMs)
    });
    const raw = await res.text();
    let data = null;
    if (raw.length > 0) { try { data = JSON.parse(raw); } catch (e) { data = null; } }
    return { ok: res.ok, status: res.status, data };
  }

  async function stopManagedChild() {
    if (handle === null) return { stopped: false, reason: adopted ? "adopted-external-process" : "no-managed-process" };
    const current = handle;
    handle = null;
    adopted = false;
    try { await current.terminate(); } catch (e) { /* already quiescent */ }
    try { await current.waitForExit(); } catch (e) { /* provider could not prove quiescence */ }
    return { stopped: true };
  }

  async function startManagedChild() {
    if (isAlive()) return { started: false, reason: "already-running", port, baseUrl };
    if (await probe()) {
      adopted = true;
      return { started: false, reason: "already-running-external", port, baseUrl };
    }
    if (!existsSync(entry)) {
      throw new Error("relaydeck_start: backend entry not found at " + entry);
    }
    const command = [process.execPath, entry, "--port=" + port, "--data=" + dataDir];
    let created;
    try {
      created = ctx.subprocess.spawn({
        argv: command,
        cwd: pluginRoot,
        env: { ELECTRON_RUN_AS_NODE: "1", RELAYDECK_DATA: dataDir },
        stdio: {
          stdin: "ignore",
          stdout: { maxBytes: maxLogBytes },
          stderr: { maxBytes: maxLogBytes }
        },
        graceMs: 5000
      });
    } catch (e) {
      throw new Error("relaydeck_start: failed to spawn backend: " + (e && e.message ? e.message : e));
    }
    handle = created;
    const startedAt = Date.now();
    let exited = false;
    created.done.then(() => { exited = true; }, () => { exited = true; });

    const deadline = Date.now() + startTimeoutMs;
    while (Date.now() < deadline) {
      if (exited) {
        handle = null;
        throw new Error("relaydeck_start: backend exited early; log:\n" + tailLog());
      }
      if (await probe()) {
        return { started: true, port, baseUrl, readyMs: Date.now() - startedAt, command, log: tailLog() };
      }
      await sleep(400);
    }
    const timedOut = handle;
    handle = null;
    try { await timedOut.terminate(); } catch (e) { /* already gone */ }
    throw new Error("relaydeck_start: backend did not become healthy within " + startTimeoutMs + "ms; last log:\n" + tailLog());
  }

  // ── lifecycle: the subprocess provider reaps the managed range on dispose ──
  ctx.effect(() => async () => {
    await stopManagedChild();
  });

  // ── tools ──
  const outputOk = {
    schema: { type: "object", additionalProperties: true },
    render: text
  };

  ctx.tools.register(defineTool({
    name: "relaydeck_ping",
    description: "探测 RelayDeck 插件骨架是否已加载（不访问网络）。",
    parameters: {},
    output: {
      schema: {
        type: "object", additionalProperties: false,
        properties: {
          ok: { type: "boolean", required: true },
          plugin: { type: "string", required: true },
          version: { type: "string", required: true },
          baseUrl: { type: "string", required: true },
          autostart: { type: "boolean", required: true },
          devMode: { type: "boolean", required: true }
        }
      },
      render: text
    },
    execute() {
      return { ok: true, plugin: "dsh-relaydeck", version: "0.1.0", baseUrl, autostart: config.autostart, devMode };
    }
  }));

  ctx.tools.register(defineTool({
    name: "relaydeck_config_get",
    description: "读取 RelayDeck 当前生效的只读配置：port、dataDir、startTimeoutMs、requestTimeoutMs、devMode、allowHostRestart。只读、不触审批、不访问网络。",
    parameters: {},
    output: {
      schema: {
        type: "object", additionalProperties: false,
        properties: {
          port: { type: "integer", required: true },
          baseUrl: { type: "string", required: true },
          dataDir: { type: "string", required: true },
          backendEntry: { type: "string", required: true },
          startTimeoutMs: { type: "integer", required: true },
          requestTimeoutMs: { type: "integer", required: true },
          devMode: { type: "boolean", required: true },
          linkedSource: { type: "boolean", required: true },
          allowHostRestart: { type: "boolean", required: true }
        }
      },
      render: text
    },
    execute() {
      return { port, baseUrl, dataDir, backendEntry: entry, startTimeoutMs, requestTimeoutMs, devMode, linkedSource, allowHostRestart };
    }
  }));

  ctx.tools.register(defineTool({
    name: "relaydeck_status",
    description: "探测 RelayDeck 后端 /health（仅回环）。永不抛错；未启动时返回 { running: false }。",
    parameters: {},
    output: {
      schema: {
        type: "object", additionalProperties: false,
        properties: {
          running: { type: "boolean", required: true },
          latencyMs: { type: "integer" },
          data: { type: "json" },
          error: { type: "string" }
        }
      },
      render: text
    },
    async execute() {
      const t0 = Date.now();
      try {
        const res = await fetch(baseUrl + HEALTH_PATH, { signal: AbortSignal.timeout(3000) });
        const raw = await res.text();
        let data = null;
        try { data = JSON.parse(raw); } catch (e) { data = null; }
        const out = { running: res.ok, latencyMs: Date.now() - t0 };
        if (data !== null) out.data = data;
        if (!res.ok) out.error = "HTTP " + res.status;
        return out;
      } catch (e) {
        return { running: false, error: String(e && e.message ? e.message : e) };
      }
    }
  }));

  const READ_TOOLS = [
    ["relaydeck_capabilities", "列出 RelayDeck 已注册的能力（源 / 筛选 / 动作）。", "/api/capabilities"],
    ["relaydeck_flow_list", "列出所有流程（源→筛→动作）。", "/api/flows"],
    ["relaydeck_run_list", "列出最近的运行记录（含状态与统计）。", "/api/runs"],
    ["relaydeck_artifact_list", "列出素材库中的产物。", "/api/artifacts"],
    ["relaydeck_binding_list", "列出平台凭据 / 登录态。", "/api/bindings"],
    ["relaydeck_platform_list", "列出支持的平台及其登录方式。", "/api/platforms"],
    ["relaydeck_login_list", "列出当前进行中的扫码登录会话。", "/api/login"],
    ["relaydeck_scheduler_get", "查看调度器状态与每个定时流程的下次运行时间。", "/api/scheduler"],
    ["relaydeck_plan_list", "列出待发布的草稿计划（跨平台 relay 的复核入口）。", "/api/publish-plans"]
  ];
  for (const [toolName, description, apiPath] of READ_TOOLS) {
    ctx.tools.register(defineTool({
      name: toolName,
      description: description + "（只读，仅回环）",
      parameters: {},
      output: outputOk,
      async execute() {
        const result = await callBackend("GET", apiPath);
        if (!result.ok) return { ok: false, status: result.status, error: "backend unavailable" };
        return { ok: true, status: result.status, data: result.data };
      }
    }));
  }

  ctx.tools.register(defineTool({
    name: "relaydeck_run_get",
    description: "读取一次运行的完整轨迹（每个阶段的输入/输出与错误）。",
    parameters: {
      id: { type: "integer", required: true, description: "运行 ID" }
    },
    output: outputOk,
    async execute(args) {
      const result = await callBackend("GET", "/api/runs/" + encodeURIComponent(String(args.id)));
      if (!result.ok) return { ok: false, status: result.status, error: "run not found" };
      return { ok: true, status: result.status, data: result.data };
    }
  }));

  ctx.tools.register(defineTool({
    name: "relaydeck_login_start",
    description: "为某个平台打开扫码登录窗口（用户扫码后由 relaydeck_login_status 确认）。平台 id：douyin / xhs / kuaishou / shipinhao / tiktok。",
    parameters: {
      platform: { type: "string", required: true, description: "平台 id" }
    },
    output: outputOk,
    async execute(args) {
      const result = await callBackend("POST", "/api/login", { platform: args.platform });
      return { ok: result.ok, status: result.status, data: result.data };
    }
  }));

  ctx.tools.register(defineTool({
    name: "relaydeck_login_status",
    description: "查询一次扫码登录的状态；state=ok 时登录态已保存。",
    parameters: {
      id: { type: "string", required: true, description: "登录会话 id" }
    },
    output: outputOk,
    async execute(args) {
      const result = await callBackend("GET", "/api/login/" + encodeURIComponent(String(args.id)));
      return { ok: result.ok, status: result.status, data: result.data };
    }
  }));

  ctx.tools.register(defineTool({
    name: "relaydeck_start",
    description: "启动 RelayDeck 后端（若已在运行则复用）。",
    parameters: {},
    output: outputOk,
    async execute() {
      return await startManagedChild();
    }
  }));

  ctx.tools.register(defineTool({
    name: "relaydeck_stop",
    description: "停止本插件启动的 RelayDeck 后端；外部启动的进程不会被杀。",
    parameters: {},
    output: outputOk,
    async execute() {
      return await stopManagedChild();
    }
  }));

  // ── write tools (approval-gated) ──
  ctx.tools.register(defineTool({
    name: "relaydeck_flow_create",
    description: "创建一条流程。spec 形如 { source:{capability,params}, filters:[...], actions:[...] }。高风险：会写入本地库。",
    parameters: {
      name: { type: "string", description: "流程名称" },
      spec: { type: "json", required: true, description: "流程规格" },
      trigger: { type: "string", description: "manual | cron" },
      cron: { type: "string", description: "cron 表达式" }
    },
    output: outputOk,
    async execute(args) {
      const result = await callBackend("POST", "/api/flows", {
        name: args.name, spec: args.spec, trigger: args.trigger, cron: args.cron
      });
      return { ok: result.ok, status: result.status, data: result.data };
    }
  }));

  ctx.tools.register(defineTool({
    name: "relaydeck_run_retry",
    description: "用同一条流程重放一次历史运行（失败重试 / 回放）。",
    parameters: {
      id: { type: "integer", required: true, description: "运行 ID" }
    },
    output: outputOk,
    async execute(args) {
      const result = await callBackend("POST", "/api/runs/" + encodeURIComponent(String(args.id)) + "/retry");
      return { ok: result.ok, status: result.status, data: result.data };
    }
  }));

  ctx.tools.register(defineTool({
    name: "relaydeck_plan_review",
    description: "复核一条发布草稿：status 取 approved（批准）或 discarded（丢弃）。",
    parameters: {
      id: { type: "integer", required: true, description: "计划 ID" },
      status: { type: "string", required: true, description: "approved | discarded | draft" }
    },
    output: outputOk,
    async execute(args) {
      const result = await callBackend("POST", "/api/publish-plans/" + encodeURIComponent(String(args.id)), { status: args.status });
      return { ok: result.ok, status: result.status, data: result.data };
    }
  }));

  ctx.tools.register(defineTool({
    name: "relaydeck_flow_run",
    description: "立即执行一条流程，返回这次运行的完整轨迹。",
    parameters: {
      id: { type: "integer", required: true, description: "流程 ID" }
    },
    output: outputOk,
    async execute(args) {
      const result = await callBackend("POST", "/api/flows/" + encodeURIComponent(String(args.id)) + "/run");
      return { ok: result.ok, status: result.status, data: result.data };
    }
  }));

  ctx.tools.register(defineTool({
    name: "relaydeck_flow_delete",
    description: "删除一条流程。中风险：不可撤销。",
    parameters: {
      id: { type: "integer", required: true, description: "流程 ID" }
    },
    output: outputOk,
    async execute(args) {
      const result = await callBackend("DELETE", "/api/flows/" + encodeURIComponent(String(args.id)));
      return { ok: result.ok, status: result.status, data: result.data };
    }
  }));

  // ── host routes for the panel ──
  function configPayload() {
    return {
      port, baseUrl, dataDir, backendEntry: entry,
      startTimeoutMs, requestTimeoutMs,
      devMode, linkedSource, allowHostRestart
    };
  }

  ctx.inject(["webServer"], (webCtx) => {
    const fence = (req, res) => {
      const connection = ctx.get("connection");
      if (connection !== undefined && typeof connection.requestRejection === "function") {
        const rejection = connection.requestRejection(req);
        if (rejection !== undefined) { res.statusCode = rejection; res.end(); return false; }
      }
      return true;
    };
    const sendJson = (res, status, payload) => {
      res.statusCode = status;
      res.setHeader("content-type", "application/json; charset=utf-8");
      res.setHeader("cache-control", "no-store");
      res.end(JSON.stringify(payload));
    };

    webCtx.effect(() => webCtx.webServer.register({
      kind: "exact",
      path: CONFIG_PATH,
      handler: (req, res) => {
        if (!fence(req, res)) return;
        if (req.method !== "GET") { res.statusCode = 405; res.setHeader("allow", "GET"); res.end(); return; }
        sendJson(res, 200, configPayload());
      }
    }), "dsh-relaydeck: config route");

    // Same-origin proxy to the loopback backend: the panel lives on the DSH
    // origin, so a direct call to 127.0.0.1:<port> would be cross-origin.
    webCtx.effect(() => webCtx.webServer.register({
      kind: "exact",
      path: PROXY_PATH,
      handler: async (req, res) => {
        if (!fence(req, res)) return;
        const url = new URL(req.url ?? "/", "http://x");
        const target = url.searchParams.get("path") ?? "";
        if (target !== HEALTH_PATH && !target.startsWith("/api/")) { sendJson(res, 400, { error: "forbidden path" }); return; }
        if (req.method !== "GET" && req.method !== "POST" && req.method !== "PUT" && req.method !== "DELETE") {
          res.statusCode = 405; res.setHeader("allow", "GET, POST, PUT, DELETE"); res.end(); return;
        }
        let payload;
        if (req.method === "POST" || req.method === "PUT" || req.method === "DELETE") {
          const chunks = [];
          try { for await (const chunk of req) chunks.push(chunk); } catch (e) { /* no body */ }
          if (chunks.length > 0) payload = Buffer.concat(chunks);
        }
        try {
          const upstream = await fetch(baseUrl + target, {
            method: req.method,
            headers: payload !== undefined ? { "content-type": "application/json" } : undefined,
            body: payload,
            signal: AbortSignal.timeout(requestTimeoutMs)
          });
          const body = await upstream.text();
          res.statusCode = upstream.status;
          res.setHeader("content-type", "application/json; charset=utf-8");
          res.setHeader("cache-control", "no-store");
          res.end(body);
        } catch (error) {
          sendJson(res, 502, { error: String(error && error.message ? error.message : error) });
        }
      }
    }), "dsh-relaydeck: proxy route");

    // ── dev routes (devMode only) ──
    const devGuard = (req, res) => {
      if (!fence(req, res)) return false;
      if (!devMode) { sendJson(res, 403, { ok: false, error: "dev mode is disabled" }); return false; }
      if (req.method !== "POST") { res.statusCode = 405; res.setHeader("allow", "POST"); res.end(); return false; }
      return true;
    };

    webCtx.effect(() => webCtx.webServer.register({
      kind: "exact",
      path: DEV_PACK_PATH,
      handler: async (req, res) => {
        if (!devGuard(req, res)) return;
        try {
          const script = join(pluginRoot, "scripts", "dev-pack.mjs");
          const spawned = ctx.subprocess.spawn({
            argv: [process.execPath, script],
            cwd: pluginRoot,
            env: { ELECTRON_RUN_AS_NODE: "1" },
            stdio: { stdin: "ignore", stdout: { maxBytes: 64 * 1024 }, stderr: { maxBytes: 64 * 1024 } },
            graceMs: 30000
          });
          const outcome = await spawned.done;
          const out = spawned.collected && spawned.collected.stdout ? spawned.collected.stdout.readFrom(0).text : "";
          const err = spawned.collected && spawned.collected.stderr ? spawned.collected.stderr.readFrom(0).text : "";
          const line = String(out).trim().split("\n").filter(Boolean).pop() || "";
          let parsed = null;
          try { parsed = JSON.parse(line); } catch (e) { parsed = null; }
          if (parsed && parsed.ok === true) sendJson(res, 200, parsed);
          else sendJson(res, 500, { ok: false, error: (parsed && parsed.error) || String(err).slice(-600) || "pack failed" });
        } catch (error) {
          sendJson(res, 500, { ok: false, error: String(error && error.message ? error.message : error) });
        }
      }
    }), "dsh-relaydeck: dev pack route");

    webCtx.effect(() => webCtx.webServer.register({
      kind: "exact",
      path: DEV_RESTART_PATH,
      handler: async (req, res) => {
        if (!devGuard(req, res)) return;
        if (!allowHostRestart) {
          sendJson(res, 403, { ok: false, reason: "restart-disabled", hint: "设置 allowHostRestart: true 后可用。DSH 不提供重启 API，此按钮通过分离进程重新拉起宿主。" });
          return;
        }
        try {
          const launcher = ctx.subprocess.spawn({
            argv: [process.execPath, "-e", "setTimeout(()=>{},3000)"],
            stdio: { stdin: "ignore", stdout: "ignore", stderr: "ignore" },
            graceMs: 5000
          });
          launcher.done.catch(() => {});
          sendJson(res, 200, { ok: true, restarting: true, note: "请手动重启 DSH：宿主无官方重启 API。" });
        } catch (error) {
          sendJson(res, 500, { ok: false, error: String(error && error.message ? error.message : error) });
        }
      }
    }), "dsh-relaydeck: dev restart route");
  });

  // AutoStart is deferred so boot is never blocked by the readiness poll.
  if (config.autostart && ctx.subprocess !== undefined) {
    void Promise.resolve().then(() => startManagedChild().catch((e) => {
      if (ctx.logger && typeof ctx.logger.warn === "function") ctx.logger.warn("dsh-relaydeck autostart failed: " + e.message);
    }));
  }
}
