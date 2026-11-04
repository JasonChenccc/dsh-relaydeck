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
    description: "Call a read-or-write CreatorHub /api/* endpoint on the loopback base URL. path must start with /api/. Returns status and an 8 KiB-truncated body.",
    parameters: {
      method: { type: "string", required: true, enum: ["GET", "POST", "PUT", "DELETE"] },
      path: { type: "string", required: true },
      body: { type: "json" }
    },
    output: {
      schema: {
        type: "object", additionalProperties: false,
        properties: {
          status: { type: "integer", required: true },
          body: { type: "string" },
          truncated: { type: "boolean" },
          bodyBytes: { type: "integer" },
          contentType: { type: "string" }
        }
      },
      render: renderText
    },
    async execute(args) {
      const method = args.method;
      const reqPath = args.path;
      if (!reqPath.startsWith("/api/")) {
        throw new Error("creatorhub_request: path must start with /api/ (got " + JSON.stringify(reqPath) + ")");
      }
      const init = { method, signal: AbortSignal.timeout(requestTimeoutMs), headers: {} };
      if (args.body !== undefined) {
        init.headers["content-type"] = "application/json";
        init.body = JSON.stringify(args.body);
      }
      const res = await fetch(baseUrl + reqPath, init);
      const text = await res.text();
      const bytes = Buffer.byteLength(text, "utf8");
      let out = text;
      let truncated = false;
      if (bytes > MAX_BODY_BYTES) { out = text.slice(0, MAX_BODY_BYTES); truncated = true; }
      return { status: res.status, body: out, truncated, bodyBytes: bytes, contentType: res.headers.get("content-type") || "" };
    }
  }));

  // autostart is deliberately deferred: apply() itself never spawns. When true,
  // the start runs on the next event-loop tick after apply returns.
  if (config.autostart) {
    void Promise.resolve().then(() => startManagedChild().catch((e) => {
      if (ctx.logger && typeof ctx.logger.warn === "function") ctx.logger.warn("creatorhub-dsh autostart failed: " + e.message);
    }));
  }
}
