// Shared test harness for the RelayDeck plugin.
//
// The plugin now owns a Node backend (server/index.mjs) through ctx.subprocess.
// These tests run the REAL backend and the REAL plugin code; only the Cordis
// context is faked, plus a subprocess stub that mirrors
// @deepseek-ai/dsh-subprocess ({ done, collected, terminate, waitForExit }).
import { registerHooks } from "node:module";
import { spawn } from "node:child_process";

const ASAR = "file:///D:/dsh/resources/app.asar/dsh/node_modules/@deepseek-ai";
registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "@deepseek-ai/schemastery") return { url: ASAR + "/schemastery/lib/index.mjs", shortCircuit: true };
    if (specifier === "@deepseek-ai/dsh-tools") return { url: ASAR + "/dsh-tools/lib/index.js", shortCircuit: true };
    return next(specifier, context);
  }
});

export { spawn };

export function makeSubprocess() {
  return {
    spawn(spec) {
      const child = spawn(spec.argv[0], spec.argv.slice(1), { cwd: spec.cwd, stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, ...(spec.env || {}) } });
      let out = "";
      let err = "";
      child.stdout.on("data", (d) => { out += d.toString(); });
      child.stderr.on("data", (d) => { err += d.toString(); });
      const done = new Promise((resolve) => child.on("exit", (code, signal) => resolve({ exitCode: code, signal })));
      done.catch(() => {});
      return {
        pid: child.pid,
        done,
        collected: {
          stdout: { readFrom: (offset) => ({ text: out.slice(offset || 0), nextOffset: out.length }) },
          stderr: { readFrom: (offset) => ({ text: err.slice(offset || 0), nextOffset: err.length }) }
        },
        terminate: () => new Promise((resolve) => {
          const killer = spawn("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore" });
          killer.on("close", resolve);
          killer.on("error", resolve);
        }),
        waitForExit: () => done
      };
    }
  };
}

export function makeContext(options = {}) {
  const tools = new Map();
  const routes = new Map();
  const logs = [];
  let disposeEffect = null;
  const webCtx = {
    webServer: { register: (def) => { routes.set(def.path, def); return () => {}; } },
    effect: (fn) => { fn(); return () => {}; }
  };
  const ctx = {
    tools: { register: (def) => { tools.set(def.name, def); return () => {}; } },
    logger: { info: (m) => logs.push(String(m)), warn: (m) => logs.push("WARN " + String(m)), error: (m) => logs.push("ERR " + String(m)), debug() {} },
    effect: (fn) => { disposeEffect = fn(); return () => {}; },
    inject: (names, cb) => { if (names.includes("webServer")) cb(webCtx); return () => {}; },
    get: (name) => (name === "approval" ? options.approval : undefined),
    subprocess: makeSubprocess()
  };
  return { ctx, tools, routes, logs, dispose: async () => { if (disposeEffect) await disposeEffect(); } };
}

export function assert(condition, message) {
  if (condition) { console.log("ASSERT OK:", message); return; }
  console.error("ASSERT FAIL:", message);
  process.exitCode = 1;
}

export function heading(title) {
  console.log("\n### " + title + " =>");
}

export async function loadPlugin() {
  return await import("../lib/index.js");
}
