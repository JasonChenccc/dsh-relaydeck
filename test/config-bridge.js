// Phase 6 config-bridge test.
// Host half: the plugin must register a loopback-only, read-only exact route
// ({ kind: "exact", path: "/dsh-samanager/config" }) gated by the connection
// fence, plus the read-only creatorhub_config_get tool.
// Client half: the bridge fetch never throws and non-loopback values fall back.
// This exercises the handler in-process; it does NOT open a socket.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const ASAR = "file:///D:/dsh/resources/app.asar/dsh/node_modules/@deepseek-ai";
const { registerHooks } = await import("node:module");
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "@deepseek-ai/schemastery") return { url: ASAR + "/schemastery/lib/index.mjs", shortCircuit: true };
    if (specifier === "@deepseek-ai/dsh-tools") return { url: ASAR + "/dsh-tools/lib/index.js", shortCircuit: true };
    return nextResolve(specifier, context);
  }
});

const assert = (cond, msg) => { if (!cond) { console.error("ASSERT FAIL:", msg); process.exitCode = 1; } else console.log("ASSERT OK:", msg); };

// ---------- host half -------------------------------------------------------
const plugin = await import("../lib/index.js");

const tools = new Map();
const routes = [];
const effectLabels = [];
let fenceResult;

function makeHostCtx() {
  return {
    tools: { register: (def) => { tools.set(def.name, def); return () => {}; } },
    logger: { info() {}, warn() {}, error() {}, debug() {} },
    effect: (fn, label) => { effectLabels.push(label); fn(); return () => {}; },
    inject: (names, cb) => {
      if (names.indexOf("webServer") >= 0) {
        cb({
          effect: (fn) => { fn(); return () => {}; },
          webServer: { register: (route) => { routes.push(route); return () => {}; } }
        });
      }
      return () => {};
    },
    get: (name) => (name === "connection" ? { requestRejection: () => fenceResult } : undefined)
  };
}

const cfg = plugin.Config["~standard"].validate({ baseUrl: "http://127.0.0.1:8731" }).value;
plugin.apply(makeHostCtx(), cfg);

console.log("=== host route registration ===");
const route = routes.find((r) => r.path === "/dsh-samanager/config");
assert(!!route, "registers /dsh-samanager/config");
assert(route.kind === "exact", "route kind is exact");
assert(typeof route.handler === "function", "route has a handler");

function makeRes() {
  return {
    statusCode: 0, headers: {}, body: "", headersSet: 0, ended: false,
    setHeader(k, v) { this.headers[k] = v; this.headersSet += 1; },
    end(chunk) { if (chunk !== undefined) this.body += chunk; this.ended = true; }
  };
}
const getReq = { method: "GET", url: "/dsh-samanager/config", headers: { host: "127.0.0.1", origin: "http://127.0.0.1" } };

console.log("\n=== handler: trusted GET ===");
fenceResult = undefined;
let res = makeRes();
await route.handler(getReq, res);
assert(res.statusCode === 200, "trusted GET -> 200");
const payload = JSON.parse(res.body);
console.log("payload:", JSON.stringify(payload));
assert(payload.baseUrl === "http://127.0.0.1:8731", "payload.baseUrl is the loopback base URL");
assert(typeof payload.rootDir === "string" && payload.rootDir.length > 0, "payload.rootDir present");
assert(typeof payload.healthTimeoutMs === "number", "payload.healthTimeoutMs present");
assert(typeof payload.requestTimeoutMs === "number", "payload.requestTimeoutMs present");
assert(res.headers["cache-control"] === "no-store", "response is no-store");

console.log("\n=== handler: untrusted request (fence) ===");
fenceResult = 403;
res = makeRes();
await route.handler(getReq, res);
assert(res.statusCode === 403, "fenced request -> 403");
assert(res.body === "", "fenced request writes no body");

console.log("\n=== handler: non-GET ===");
fenceResult = undefined;
res = makeRes();
await route.handler({ ...getReq, method: "POST" }, res);
assert(res.statusCode === 405, "POST -> 405");
assert(res.headers["allow"] === "GET", "405 advertises allow: GET");

console.log("\n=== host tool creatorhub_config_get ===");
const tool = tools.get("creatorhub_config_get");
assert(!!tool, "creatorhub_config_get is registered");
const toolOut = await tool.execute({}, {});
console.log("tool output:", JSON.stringify(toolOut));
assert(toolOut.baseUrl === payload.baseUrl && toolOut.rootDir === payload.rootDir, "tool and route return the same config");

// ---------- client half -----------------------------------------------------
console.log("\n=== client bridge fetch ===");
const source = readFileSync(join(root, "client.js"), "utf8");
let captured = null;
new Function("window", source)({ __ModuleLoader__: { load: (spec) => { captured = spec; } } });
const mod = captured.factory(() => ({ createElement: () => null, useState: (v) => [v, () => {}], useEffect: () => {} }));

const okFetch = () => Promise.resolve({ ok: true, json: () => Promise.resolve({ baseUrl: "http://127.0.0.1:9999" }) });
assert(await mod.fetchBridgeBaseUrl(okFetch) === "http://127.0.0.1:9999", "bridge hit -> baseUrl");
const badStatus = () => Promise.resolve({ ok: false, json: () => Promise.resolve({}) });
assert(await mod.fetchBridgeBaseUrl(badStatus) === undefined, "non-2xx -> undefined");
const timeout = () => Promise.reject(new Error("timeout"));
assert(await mod.fetchBridgeBaseUrl(timeout) === undefined, "timeout/reject -> undefined (no throw)");
const badJson = () => Promise.resolve({ ok: true, json: () => Promise.reject(new Error("bad json")) });
assert(await mod.fetchBridgeBaseUrl(badJson) === undefined, "malformed json -> undefined");
const noBase = () => Promise.resolve({ ok: true, json: () => Promise.resolve({ rootDir: "x" }) });
assert(await mod.fetchBridgeBaseUrl(noBase) === undefined, "missing baseUrl -> undefined");

console.log("\n=== client resolution with bridge ===");
let picked = mod.pickBaseUrl(await mod.fetchBridgeBaseUrl(okFetch), undefined);
assert(picked.source === "host-bridge" && picked.baseUrl === "http://127.0.0.1:9999", "bridge value wins");
const evilBridge = () => Promise.resolve({ ok: true, json: () => Promise.resolve({ baseUrl: "http://evil.example:1" }) });
picked = mod.pickBaseUrl(await mod.fetchBridgeBaseUrl(evilBridge), undefined);
assert(picked.source === "default" && picked.baseUrl === "http://127.0.0.1:8731", "non-loopback bridge value falls back to default");
picked = mod.pickBaseUrl(await mod.fetchBridgeBaseUrl(timeout), undefined);
assert(picked.source === "default", "bridge timeout falls back to default");
picked = mod.pickBaseUrl(await mod.fetchBridgeBaseUrl(timeout), "http://localhost:1234");
assert(picked.source === "host-config" && picked.baseUrl === "http://localhost:1234", "bridge timeout falls back to static config");

console.log("\nCONFIG-BRIDGE " + (process.exitCode ? "FAIL" : "PASS"));
