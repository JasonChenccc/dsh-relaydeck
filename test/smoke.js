// Phase 1 smoke: load the plugin in the host runtime and assert the
// creatorhub_ping stub payload. Run with electron-as-node from this directory.
import { registerHooks } from "node:module";

const ASAR = "file:///D:/dsh/resources/app.asar/dsh/node_modules/@deepseek-ai";
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "@deepseek-ai/schemastery") return { url: ASAR + "/schemastery/lib/index.mjs", shortCircuit: true };
    if (specifier === "@deepseek-ai/dsh-tools") return { url: ASAR + "/dsh-tools/lib/index.js", shortCircuit: true };
    return nextResolve(specifier, context);
  }
});

const plugin = await import("../lib/index.js");

const tools = new Map();
const ctx = {
  tools: { register: (def) => { tools.set(def.name, def); return () => {}; } },
  logger: { warn() {}, error() {}, info() {}, debug() {} },
  effect: () => () => {},
  inject: () => {},
  get: () => undefined,
};

const cfg = plugin.Config["~standard"].validate({}).value;
plugin.apply(ctx, cfg);

const ping = tools.get("creatorhub_ping");
if (!ping) throw new Error("creatorhub_ping was not registered");
const result = await ping.execute({}, {});

console.log("registered tools:", [...tools.keys()].join(", "));
console.log("creatorhub_ping =>", JSON.stringify(result));

const assert = (cond, msg) => { if (!cond) { console.error("ASSERT FAIL:", msg); process.exitCode = 1; } else console.log("ASSERT OK:", msg); };
assert(result.ok === true, "ok is true");
assert(result.plugin === "dsh-SAmanager", "plugin name");
assert(result.phase === 1, "phase is 1");
assert(result.baseUrl === "http://127.0.0.1:8731", "baseUrl default is loopback 8731");
assert(result.autostart === true, "autostart default is true (backend starts with the plugin)");
console.log("SMOKE PASS");
