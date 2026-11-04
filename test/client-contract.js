// Phase 5/6 client-half contract test.
// Executes the browser bundle in Node with a stubbed window.__ModuleLoader__ and
// a stubbed require("react"), then calls apply() with a fake context.
// Verifies the CONTRACT (manifest shape, exports, slot contributions via
// ctx.slots.inject, static baseUrl resolution, loopback guard).
// It does NOT verify GUI rendering.
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));

const assert = (cond, msg) => { if (!cond) { console.error("ASSERT FAIL:", msg); process.exitCode = 1; } else console.log("ASSERT OK:", msg); };

console.log("=== manifest ===");
assert(pkg.dsh && pkg.dsh.client && pkg.dsh.client.platform === "web", "dsh.client.platform === web");
const clientExport = pkg.exports && pkg.exports["./client"];
const clientRel = typeof clientExport === "string" ? clientExport : (clientExport && clientExport.default);
assert(typeof clientRel === "string", "exports[\"./client\"] is a string path");
const clientPath = join(root, clientRel);
assert(existsSync(clientPath), "exports[\"./client\"] resolves to an existing file: " + clientRel);
assert(Array.isArray(pkg.files) && pkg.files.includes("client.js"), "package files include client.js");
assert(typeof pkg.icon === "string" && existsSync(join(root, pkg.icon)), "package icon exists: " + pkg.icon);

console.log("\n=== bundle registration ===");
const source = readFileSync(clientPath, "utf8");
let captured = null;
new Function("window", source)({ __ModuleLoader__: { load: (spec) => { captured = spec; } } });
assert(captured !== null, "bundle called window.__ModuleLoader__.load");
assert(captured.id === "dsh-SAmanager", "loader id === dsh-SAmanager");
assert(typeof captured.factory === "function", "loader spec has a factory function");
const fakeReact = { createElement: () => null, useState: (v) => [v, () => {}], useEffect: () => {} };
const reqLog = [];
const mod = captured.factory((name) => { reqLog.push(name); if (name === "react") return fakeReact; throw new Error("unexpected require: " + name); });
assert(reqLog.length === 1 && reqLog[0] === "react", "factory only requires react (baseline module)");
assert(typeof mod.apply === "function", "module exports apply(ctx, config)");
assert(Array.isArray(mod.inject) && mod.inject.includes("slots"), "inject declares the slots service");

console.log("\n=== slot contributions ===");
function makeCtx() {
  const injections = [];
  const registrations = [];
  return {
    injections, registrations,
    ctx: {
      slots: {
        inject: (name, cb) => { injections.push(name); cb(); return () => {}; },
        register: (def, comp) => { registrations.push({ def, comp }); return () => {}; }
      },
      effect: (fn) => { fn(); return () => {}; },
      get: () => undefined
    }
  };
}

const run1 = makeCtx();
const result1 = mod.apply(run1.ctx, { baseUrl: "http://127.0.0.1:9999" });
assert(result1 && result1.panelId === "dsh-samanager", "apply returns panelId dsh-samanager");
assert(result1.configPath === "/dsh-samanager/config", "apply exposes the config bridge path");
assert(result1.staticBaseUrl === "http://127.0.0.1:9999", "host-injected static baseUrl is picked up");
assert(JSON.stringify(run1.injections) === JSON.stringify(["sidebar.panellist", "main"]), "contributes via ctx.slots.inject into sidebar.panellist then main");
assert(run1.registrations.length === 2, "exactly two slot registrations");
const listReg = run1.registrations.find((r) => r.def.name === "sidebar.panellist");
const mainReg = run1.registrations.find((r) => r.def.name === "main");
assert(!!listReg && listReg.def.id === "dsh-samanager", "sidebar.panellist id matches panel id");
assert(!!listReg && typeof listReg.def.label === "string" && listReg.def.label.length > 0, "sidebar.panellist has a label");
assert(!!listReg && typeof listReg.def.order === "number", "sidebar.panellist has an order");
assert(!!listReg && typeof listReg.comp === "function", "sidebar.panellist carries an icon component");
assert(!!mainReg && mainReg.def.key === "dsh-samanager", "main slot key matches panel id");
assert(!!mainReg && typeof mainReg.comp === "function", "main slot carries a panel component");

console.log("\n=== static baseUrl resolution ===");
assert(mod.resolveStaticBaseUrl({}, {}) === undefined, "no config -> undefined");
assert(mod.resolveStaticBaseUrl({}, { baseUrl: "http://127.0.0.1:1" }) === "http://127.0.0.1:1", "config.baseUrl is used");
assert(mod.resolveStaticBaseUrl({ config: { baseUrl: "http://localhost:2" } }, {}) === "http://localhost:2", "ctx.config.baseUrl is used");
assert(mod.resolveStaticBaseUrl({}, { baseUrl: "http://evil.example:1" }) === undefined, "non-loopback static candidate rejected");

console.log("\n=== resolution order + loopback guard ===");
const pickBridge = mod.pickBaseUrl("http://127.0.0.1:9999", "http://localhost:1111");
assert(pickBridge.source === "host-bridge" && pickBridge.baseUrl === "http://127.0.0.1:9999", "bridge wins over static");
const pickStatic = mod.pickBaseUrl("http://evil.example:1", "http://localhost:1111");
assert(pickStatic.source === "host-config" && pickStatic.baseUrl === "http://localhost:1111", "non-loopback bridge falls back to static");
const pickDefault = mod.pickBaseUrl("http://evil.example:1", undefined);
assert(pickDefault.source === "default" && pickDefault.baseUrl === "http://127.0.0.1:8731", "both bad -> loopback default");
const pickNone = mod.pickBaseUrl(undefined, undefined);
assert(pickNone.source === "default", "no values -> loopback default");
assert(mod.isLoopback("http://localhost:1") === true && mod.isLoopback("http://127.0.0.1:1") === true, "isLoopback accepts loopback");
assert(mod.isLoopback("https://api.example.com") === false && mod.isLoopback("not a url") === false, "isLoopback rejects non-loopback");

console.log("\n=== guarded client ctx (undeclared reads throw) ===");
// The real client ctx is a Proxy that throws on any property not declared in
// the plugin inject list (rejectGuard). Before the fix, ctx.config killed the
// whole client fiber and produced "dsh-SAmanager: failed".
function makeGuardedCtx() {
  const base = makeCtx();
  const proxy = new Proxy(base.ctx, {
    get(target, prop) {
      if (prop === "config") throw new Error('dynamic ctx does not expose "config"');
      return target[prop];
    }
  });
  return { ctx: proxy, injections: base.injections, registrations: base.registrations };
}
const guarded = makeGuardedCtx();
let guardedOk = true;
let guardedErr = null;
try { mod.apply(guarded.ctx, {}); } catch (e) { guardedOk = false; guardedErr = e && e.message; }
assert(guardedOk, "apply survives a guarded ctx that throws on ctx.config" + (guardedErr ? " (" + guardedErr + ")" : ""));
assert(guarded.injections.length === 2, "guarded ctx still contributes both slots");

console.log("\n=== Phase C: event bus + host subscription lifecycle ===");
const bus = mod.createEventBus();
let busHits = 0;
const busOff = bus.on("x", () => { busHits += 1; });
bus.emit("x", 1);
assert(busHits === 1 && bus.size("x") === 1, "event bus registers and emits");
busOff();
assert(bus.size("x") === 0, "event bus off() removes the listener");
const bus2 = mod.createEventBus();
bus2.on("y", () => {});
bus2.dispose();
assert(bus2.size("y") === 0, "event bus dispose() clears listeners");

let registered = 0;
let disposed = 0;
const subscribeCtx = {
  on: () => { registered += 1; return () => { disposed += 1; }; },
  get: (name) => name === "uiSession"
    ? { sessions: { list: { subscribe: () => { registered += 1; return () => { disposed += 1; }; } } } }
    : undefined
};
const subscribeHost = mod.createHostBridge(subscribeCtx, { baseUrl: "http://127.0.0.1:8731" });
const unsubscribe = subscribeHost.subscribe(() => {});
assert(registered === 2, "host subscribe registers both host listeners");
unsubscribe();
assert(disposed === 2, "host unsubscribe disposes every listener (no residue)");

console.log("\n=== Phase C: panel mount / dispose subscription lifecycle ===");
function makeEl(tag) {
  return {
    tagName: tag, children: [], style: {}, dataset: {}, attributes: {},
    className: "", textContent: "",
    setAttribute(k, v) { this.attributes[k] = v; },
    appendChild(child) { this.children.push(child); return child; },
    removeChild(child) { this.children = this.children.filter((c) => c !== child); },
    addEventListener() {}, removeEventListener() {},
    get firstChild() { return this.children[0]; }
  };
}
const priorDocument = globalThis.document;
globalThis.document = { createElement: makeEl, createTextNode: (text) => ({ textContent: text }), head: makeEl("head"), documentElement: makeEl("html") };
let mountRegistered = 0;
let mountUnsubscribed = false;
const mountHost = {
  resolveBaseUrl: () => new Promise(() => {}),
  subscribe: () => { mountRegistered += 1; return () => { mountUnsubscribed = true; }; },
  proxyFetch: () => Promise.resolve({ ok: true }),
  openExternal: () => true
};
const mountedPanel = mod.createPanel(mountHost, { injectCss: () => {} });
assert(mountRegistered === 1, "panel mount registers exactly one host subscription");
mountedPanel.dispose();
assert(mountUnsubscribed === true, "panel dispose releases the host subscription");
assert(mountedPanel.events.size("session-context") === 0, "panel dispose clears bus listeners");
globalThis.document = priorDocument;

console.log("\n=== Phase C: proxyFetch ===");
const realFetchC = globalThis.fetch;
globalThis.fetch = async (url) => {
  const u = String(url && url.url ? url.url : url);
  if (u.indexOf("/dsh-samanager/config") >= 0) return { ok: false, status: 404, json: async () => null, text: async () => "" };
  return { ok: true, status: 200, text: async () => JSON.stringify({ ok: 1 }) };
};
const proxyHost = mod.createHostBridge({ get: () => undefined }, { baseUrl: "http://127.0.0.1:8731" });
assert(typeof proxyHost.proxyFetch === "function", "proxyFetch exists");
const proxied = await proxyHost.proxyFetch("/api/overview/summary");
assert(proxied.ok === true && proxied.data && proxied.data.ok === 1, "proxyFetch returns parsed JSON");
const forbiddenPath = await proxyHost.proxyFetch("/not-api");
assert(forbiddenPath.ok === false && forbiddenPath.error === "forbidden", "proxyFetch rejects non-/api paths");
globalThis.fetch = realFetchC;

console.log("\n=== no external resources ===");
const urls = source.match(/https?:\/\/[^\s"\x27)]+/g) || [];
const nonLoopback = urls.filter((u) => !/^https?:\/\/(127\.0\.0\.1|localhost)([:/]|$)/.test(u));
console.log("URLs found in client.js:", JSON.stringify(urls));
assert(nonLoopback.length === 0, "client.js references no non-loopback URL");

console.log("\nCLIENT-CONTRACT " + (process.exitCode ? "FAIL" : "PASS"));
