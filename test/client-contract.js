// Phase 5 client-half contract test.
// Executes the browser bundle in Node with a stubbed window.__ModuleLoader__ and
// a stubbed require("react"), then calls apply() with a fake context.
// This verifies the CONTRACT (manifest shape, exports, slot registrations,
// loopback guard). It does NOT verify GUI rendering.
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));

const assert = (cond, msg) => { if (!cond) { console.error("ASSERT FAIL:", msg); process.exitCode = 1; } else console.log("ASSERT OK:", msg); };

// --- 1. manifest -----------------------------------------------------------
console.log("=== manifest ===");
assert(pkg.dsh && pkg.dsh.client && pkg.dsh.client.platform === "web", "dsh.client.platform === web");
const clientExport = pkg.exports && pkg.exports["./client"];
const clientRel = typeof clientExport === "string" ? clientExport : (clientExport && clientExport.default);
assert(typeof clientRel === "string", "exports[\"./client\"] is a string path");
const clientPath = join(root, clientRel);
assert(existsSync(clientPath), "exports[\"./client\"] resolves to an existing file: " + clientRel);
assert(Array.isArray(pkg.files) && pkg.files.includes("client.js"), "package files include client.js");

// --- 2. bundle executes and registers with the module loader ----------------
console.log("\n=== bundle registration ===");
const source = readFileSync(clientPath, "utf8");
let captured = null;
const fakeWindow = { __ModuleLoader__: { load: (spec) => { captured = spec; } } };
new Function("window", source)(fakeWindow);
assert(captured !== null, "bundle called window.__ModuleLoader__.load");
assert(captured.id === "creatorhub-dsh", "loader id === creatorhub-dsh");
assert(typeof captured.factory === "function", "loader spec has a factory function");

const fakeReact = { createElement: () => null, useState: (v) => [v, () => {}], useEffect: () => {} };
const reqLog = [];
const mod = captured.factory((name) => { reqLog.push(name); if (name === "react") return fakeReact; throw new Error("unexpected require: " + name); });
assert(reqLog.length === 1 && reqLog[0] === "react", "factory only requires react (baseline module)");
assert(typeof mod.apply === "function", "module exports apply(ctx, config)");
assert(Array.isArray(mod.inject), "module exports inject array");
assert(mod.inject.includes("slots"), "inject declares the slots service");

// --- 3. apply registers the sidebar panel ----------------------------------
console.log("\n=== slot registration ===");
function makeCtx() {
  const registrations = [];
  let effectFn = null;
  const ctx = {
    slots: { register: (def, comp) => { registrations.push({ def, comp }); return () => {}; } },
    effect: (fn) => { effectFn = fn; return () => {}; },
    get: () => undefined
  };
  return { ctx, registrations, getEffect: () => effectFn };
}

const run1 = makeCtx();
const result1 = mod.apply(run1.ctx, { baseUrl: "http://127.0.0.1:9999" });
assert(result1 && result1.baseUrl === "http://127.0.0.1:9999", "host-injected baseUrl is used");
assert(result1.panelId === "creatorhub", "panel id is creatorhub");
assert(run1.registrations.length === 2, "exactly two slot registrations");
const listReg = run1.registrations.find((r) => r.def.name === "sidebar.panellist");
const mainReg = run1.registrations.find((r) => r.def.name === "main");
assert(!!listReg, "registers into sidebar.panellist");
assert(listReg && listReg.def.id === "creatorhub", "sidebar.panellist entry id matches panel id");
assert(listReg && typeof listReg.def.label === "string" && listReg.def.label.length > 0, "sidebar.panellist entry has a label");
assert(listReg && typeof listReg.def.order === "number", "sidebar.panellist entry has an order");
assert(typeof listReg.comp === "function", "sidebar.panellist entry carries an icon component");
assert(!!mainReg, "registers into the layout main slot");
assert(mainReg && mainReg.def.key === "creatorhub", "main slot key matches panel id");
assert(typeof mainReg.comp === "function", "main slot carries a panel component");
assert(typeof run1.getEffect() === "function", "apply registers a cleanup effect");

// --- 4. loopback guard -----------------------------------------------------
console.log("\n=== loopback guard ===");
const run2 = makeCtx();
const result2 = mod.apply(run2.ctx, { baseUrl: "http://evil.example:1234" });
assert(result2.baseUrl === "http://127.0.0.1:8731", "non-loopback baseUrl falls back to default");
const run3 = makeCtx();
const result3 = mod.apply(run3.ctx, {});
assert(result3.baseUrl === "http://127.0.0.1:8731", "missing config falls back to loopback default");
const run4 = makeCtx();
const result4 = mod.apply(run4.ctx, { baseUrl: "http://localhost:8123" });
assert(result4.baseUrl === "http://localhost:8123", "localhost is accepted");

// --- 5. no external resources ----------------------------------------------
console.log("\n=== no external resources ===");
const urls = source.match(/https?:\/\/[^\s"\x27)]+/g) || [];
const nonLoopback = urls.filter((u) => !/^https?:\/\/(127\.0\.0\.1|localhost)([:/]|$)/.test(u));
console.log("URLs found in client.js:", JSON.stringify(urls));
assert(nonLoopback.length === 0, "client.js references no non-loopback URL");

console.log("\nCLIENT-CONTRACT " + (process.exitCode ? "FAIL" : "PASS"));
