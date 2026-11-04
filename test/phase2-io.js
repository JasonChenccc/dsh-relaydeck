// Phase 2 real-IO test: start -> status -> request -> stop -> status.
// Run with electron-as-node from this directory. Uses port 8731 (loopback).
import { registerHooks } from "node:module";
import { spawn } from "node:child_process";

const ASAR = "file:///D:/dsh/resources/app.asar/dsh/node_modules/@deepseek-ai";
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "@deepseek-ai/schemastery") return { url: ASAR + "/schemastery/lib/index.mjs", shortCircuit: true };
    if (specifier === "@deepseek-ai/dsh-tools") return { url: ASAR + "/dsh-tools/lib/index.js", shortCircuit: true };
    return nextResolve(specifier, context);
  }
});

const ROOT_DIR = "D:/work/work/workstation/creatorhub-main/creatorhub-main";
const BASE = "http://127.0.0.1:18731";

const plugin = await import("../lib/index.js");

const tools = new Map();
let disposeEffect = null;
// Test-only subprocess stub mirroring @deepseek-ai/dsh-subprocess: the plugin now
// delegates process ownership to the framework, so the harness supplies the same
// { done, collected, terminate, waitForExit } handle shape.
function makeSubprocess() {
  return {
    spawn(spec) {
      const child = spawn(spec.argv[0], spec.argv.slice(1), { cwd: spec.cwd, stdio: ["ignore", "pipe", "pipe"] });
      let out = "";
      let err = "";
      child.stdout.on("data", (d) => { out += d.toString(); });
      child.stderr.on("data", (d) => { err += d.toString(); });
      const done = new Promise((resolve) => child.on("exit", (code, signal) => resolve({ exitCode: code, signal })));
      done.catch(() => {});
      return {
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
const ctx = {
  tools: { register: (def) => { tools.set(def.name, def); return () => {}; } },
  logger: { warn(m){ console.log("[warn]", m); }, error(m){ console.log("[error]", m); }, info(){}, debug(){} },
  effect: (fn) => { disposeEffect = fn(); return () => {}; },
  subprocess: makeSubprocess(),
  inject: () => {},
  get: () => undefined,
};

const cfg = plugin.Config["~standard"].validate({ baseUrl: BASE, rootDir: ROOT_DIR, autostart: false }).value;
plugin.apply(ctx, cfg);

const assert = (cond, msg) => { if (!cond) { console.error("ASSERT FAIL:", msg); process.exitCode = 1; } else console.log("ASSERT OK:", msg); };
const show = (label, value) => console.log("\n### " + label + " =>\n" + JSON.stringify(value, null, 2));

const start = tools.get("creatorhub_start");
const status = tools.get("creatorhub_status");
const req = tools.get("creatorhub_request");
const stop = tools.get("creatorhub_stop");
if (!start || !status || !req || !stop) throw new Error("missing tools");

async function main() {
  // 1) start
  let r = await start.execute({}, {});
  show("creatorhub_start", r);
  assert(r.started === true, "start reports started:true");
  assert(Array.isArray(r.command) && r.command.length > 0, "start exposes spawned command");

  // 2) status
  r = await status.execute({}, {});
  show("creatorhub_status (after start)", r);
  assert(r.running === true, "status reports running:true after start");

  // 3) read-only request
  r = await req.execute({ method: "GET", path: "/api/overview/summary" }, {});
  show("creatorhub_request GET /api/overview/summary", r);
  assert(r.status === 200, "overview/summary returns HTTP 200");
  assert(typeof r.body === "string" && r.body.length > 0, "overview/summary body non-empty");

  // 4) stop
  r = await stop.execute({}, {});
  show("creatorhub_stop", r);
  assert(r.stopped === true, "stop reports stopped:true");

  // 5) status after stop
  r = await status.execute({}, {});
  show("creatorhub_status (after stop)", r);
  assert(r.running === false, "status reports running:false after stop");
}

try {
  await main();
} catch (e) {
  console.error("TEST ERROR:", e && e.stack ? e.stack : e);
  process.exitCode = 1;
} finally {
  try { await stop.execute({}, {}); } catch (e) { console.error("cleanup stop failed:", e.message); }
  if (disposeEffect) { try { await disposeEffect(); } catch (e) { console.error("dispose failed:", e.message); } }
}

console.log("\nPHASE2-IO " + (process.exitCode ? "FAIL" : "PASS"));
