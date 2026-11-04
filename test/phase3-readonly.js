// Phase 3 read-only tools test: start CreatorHub, call each typed tool, stop.
// Run with electron-as-node from the plugin directory. Loopback port 8731.
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
const stop = tools.get("creatorhub_stop");

const NEW_TOOLS = [
  { name: "creatorhub_overview",     args: {},                          expect: "object" },
  { name: "creatorhub_accounts",     args: {},                          expect: "array"  },
  { name: "creatorhub_task_queue",   args: {},                          expect: "object" },
  { name: "creatorhub_monitors",     args: {},                          expect: "array"  },
  { name: "creatorhub_collections",  args: {},                          expect: "array"  },
];

async function main() {
  for (const spec of [...NEW_TOOLS, { name: "creatorhub_account_stats" }]) {
    assert(tools.has(spec.name), spec.name + " is registered");
  }

  let r = await start.execute({}, {});
  show("creatorhub_start", { started: r.started, pid: r.pid, port: r.port, readyMs: r.readyMs });
  assert(r.started === true, "CreatorHub started");

  for (const spec of NEW_TOOLS) {
    const tool = tools.get(spec.name);
    r = await tool.execute(spec.args, {});
    show(spec.name, r);
    assert(r.ok === true, spec.name + " returns ok:true");
    if (spec.expect === "array") assert(Array.isArray(r.data), spec.name + " data is array");
    else assert(r.data !== null && typeof r.data === "object" && !Array.isArray(r.data), spec.name + " data is object");
    assert(typeof r.truncated === "boolean", spec.name + " truncated is boolean");
  }

  // account_stats needs a real account id; a fresh DB has none.
  const accountsRes = await tools.get("creatorhub_accounts").execute({}, {});
  const stats = tools.get("creatorhub_account_stats");
  if (Array.isArray(accountsRes.data) && accountsRes.data.length > 0) {
    r = await stats.execute({ account_id: accountsRes.data[0].id, days: 7 }, {});
    show("creatorhub_account_stats (existing account)", r);
    assert(r.ok === true, "account_stats ok for existing account");
    assert(r.data !== null && typeof r.data === "object", "account_stats data is object");
  } else {
    r = await stats.execute({ account_id: 1, days: 7 }, {});
    show("creatorhub_account_stats (no accounts in DB)", r);
    console.log("NOTE: this CreatorHub DB has 0 accounts, so the real route returns 404.");
    assert(r.ok === false && r.status === 404, "account_stats returns structured 404 (no throw) for unknown id");
  }
  assert(typeof r.truncated === "boolean", "account_stats truncated is boolean");
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

console.log("\nPHASE3-READONLY " + (process.exitCode ? "FAIL" : "PASS"));
