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
assert(captured.id === "creatorhub-dsh", "loader id === creatorhub-dsh");
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
assert(result1 && result1.panelId === "creatorhub", "apply returns panelId creatorhub");
assert(result1.configPath === "/creatorhub-dsh/config", "apply exposes the config bridge path");
assert(result1.staticBaseUrl === "http://127.0.0.1:9999", "host-injected static baseUrl is picked up");
assert(JSON.stringify(run1.injections) === JSON.stringify(["sidebar.panellist", "main"]), "contributes via ctx.slots.inject into sidebar.panellist then main");
assert(run1.registrations.length === 2, "exactly two slot registrations");
const listReg = run1.registrations.find((r) => r.def.name === "sidebar.panellist");
const mainReg = run1.registrations.find((r) => r.def.name === "main");
assert(!!listReg && listReg.def.id === "creatorhub", "sidebar.panellist id matches panel id");
assert(!!listReg && typeof listReg.def.label === "string" && listReg.def.label.length > 0, "sidebar.panellist has a label");
assert(!!listReg && typeof listReg.def.order === "number", "sidebar.panellist has an order");
assert(!!listReg && typeof listReg.comp === "function", "sidebar.panellist carries an icon component");
assert(!!mainReg && mainReg.def.key === "creatorhub", "main slot key matches panel id");
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

console.log("\n=== no external resources ===");
const urls = source.match(/https?:\/\/[^\s"\x27)]+/g) || [];
const nonLoopback = urls.filter((u) => !/^https?:\/\/(127\.0\.0\.1|localhost)([:/]|$)/.test(u));
console.log("URLs found in client.js:", JSON.stringify(urls));
assert(nonLoopback.length === 0, "client.js references no non-loopback URL");

console.log("\nCLIENT-CONTRACT " + (process.exitCode ? "FAIL" : "PASS"));
