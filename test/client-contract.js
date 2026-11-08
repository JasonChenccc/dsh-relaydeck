// Client bundle contract: loader id, slot registration, host bridge, lifecycle.
import { readFileSync } from "node:fs";
import { assert, heading } from "./harness.mjs";

const source = readFileSync(new URL("../client.js", import.meta.url), "utf8");

heading("bundle loads");
let captured = null;
const React = { createElement: () => ({}), useRef: () => ({ current: null }), useEffect: () => {} };
const fakeWindow = {
  __ModuleLoader__: { load: (def) => { captured = def; } },
  addEventListener() {}, removeEventListener() {}
};
new Function("window", "require", source)(fakeWindow, (id) => {
  if (id === "react") return React;
  throw new Error("unexpected require: " + id);
});
assert(captured !== null, "bundle calls window.__ModuleLoader__.load");
assert(captured.id === "dsh-relaydeck", "loader id is dsh-relaydeck");

const mod = captured.factory((id) => {
  if (id === "react") return React;
  throw new Error("unexpected require: " + id);
});
assert(typeof mod.apply === "function", "exports apply");
assert(Array.isArray(mod.inject) && mod.inject.includes("slots"), "injects slots");
assert(mod.inject.includes("remote"), "injects remote (for the dev panel)");
assert(mod.CONFIG_PATH === "/dsh-relaydeck/config", "config path");
assert(mod.PROXY_PATH === "/dsh-relaydeck/proxy", "proxy path");
assert(mod.PANEL_ID === "dsh-relaydeck", "panel id");

heading("slot registration");
const registrations = [];
const slotsCtx = {
  slots: {
    inject: (name, factory) => { registrations.push({ name, def: factory() }); return () => {}; },
    register: (def) => def
  },
  get: () => undefined,
  on: () => () => {}
};
const result = mod.apply(slotsCtx, {});
assert(registrations.length === 2, "registers exactly two slots");
const panellist = registrations.find((r) => r.name === "sidebar.panellist");
const mainSlot = registrations.find((r) => r.name === "main");
assert(!!panellist && panellist.def.id === "dsh-relaydeck", "sidebar.panellist id");
assert(panellist.def.label === "RelayDeck", "sidebar label is RelayDeck");
assert(!!mainSlot && mainSlot.def.key === "dsh-relaydeck", "main slot key matches the panel id");
assert(result.panelId === "dsh-relaydeck", "apply returns the panel id");

heading("host bridge proxy");
const realFetch = globalThis.fetch;
let seenUrl = null;
globalThis.fetch = async (url) => {
  seenUrl = String(url);
  if (String(url).includes("/dsh-relaydeck/config")) return { ok: true, status: 200, json: async () => ({ port: 18731, devMode: true }) };
  return { ok: true, status: 200, text: async () => JSON.stringify({ status: "ok" }) };
};
const bridge = mod.createHostBridge({ get: () => undefined }, {});
const cfg = await bridge.resolveConfig();
assert(cfg.port === 18731, "resolveConfig reads the host route");
const proxied = await bridge.proxyFetch("/health", { timeoutMs: 2000 });
assert(proxied.ok === true && proxied.data.status === "ok", "proxyFetch returns parsed JSON");
assert(seenUrl.includes("/dsh-relaydeck/proxy?path="), "proxyFetch calls the same-origin proxy route");
const forbidden = await bridge.proxyFetch("/etc/passwd");
assert(forbidden.ok === false && forbidden.error === "forbidden", "proxyFetch rejects non-/api paths");
globalThis.fetch = realFetch;

heading("event bus + panel lifecycle");
const bus = mod.createEventBus();
let hits = 0;
const off = bus.on("x", () => { hits += 1; });
bus.emit("x", 1);
assert(hits === 1 && bus.size("x") === 1, "event bus registers and emits");
off();
assert(bus.size("x") === 0, "event bus off() removes the listener");

function makeEl(tag) {
  return {
    tagName: tag, children: [], style: {}, dataset: {}, attributes: {}, className: "", textContent: "", value: "",
    setAttribute(k, v) { this.attributes[k] = v; },
    appendChild(c) { this.children.push(c); return c; },
    removeChild(c) { this.children = this.children.filter((x) => x !== c); },
    addEventListener() {}, removeEventListener() {},
    get firstChild() { return this.children[0]; }
  };
}
const priorDocument = globalThis.document;
globalThis.document = { createElement: makeEl, createTextNode: (t) => ({ textContent: t }), head: makeEl("head"), documentElement: makeEl("html") };
let mountRegistered = 0;
let unsubscribed = false;
const mountHost = {
  resolveConfig: () => new Promise(() => {}),
  subscribe: () => { mountRegistered += 1; return () => { unsubscribed = true; }; },
  proxyFetch: () => Promise.resolve({ ok: true, status: 200, data: {} }),
  openExternal: () => true
};
const panel = mod.createPanel(mountHost, { injectCss: () => {} });
assert(mountRegistered === 1, "panel mount registers exactly one host subscription");
panel.dispose();
assert(unsubscribed === true, "panel dispose releases the host subscription");
globalThis.document = priorDocument;

heading("no direct-fetch fallback");
assert(!source.includes("direct(path, timeoutMs)"), "bundle has no direct fetch fallback");
assert(source.includes("宿主代理不可用"), "bundle surfaces the missing-proxy error");

console.log("\nCLIENT-CONTRACT " + (process.exitCode ? "FAIL" : "PASS"));
