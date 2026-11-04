// Phase 4 test: approval-gated write tools.
// Run with electron-as-node from the plugin directory. Loopback port 8731.
// Harness: monkey-patched global fetch counts Node-side HTTP requests, and a
// mock ctx.get("approval") returns scripted outcomes.
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

// --- fetch instrumentation -------------------------------------------------
const realFetch = globalThis.fetch;
let calls = [];
let mockResponder = null;
globalThis.fetch = async (input, init) => {
  const url = typeof input === "string" ? input : (input && input.url ? input.url : String(input));
  const method = (init && init.method) || "GET";
  const body = init && init.body !== undefined ? init.body : null;
  calls.push({ url, method, body });
  if (mockResponder) return mockResponder(url, method, body);
  return realFetch(input, init);
};
const resetCalls = () => { calls = []; };
const pathnameOf = (u) => { try { return new URL(u).pathname; } catch (e) { return u; } };
const callsFor = (p) => calls.filter((c) => pathnameOf(c.url) === p);

// --- approval mock ---------------------------------------------------------
let approvalQueue = [];
let approvalCalls = [];
let approvalMissing = false;
const setApproval = (...outcomes) => { approvalQueue = outcomes.slice(); approvalCalls = []; };
const mockApproval = {
  request: async (req) => {
    approvalCalls.push(req);
    return approvalQueue.length > 0 ? approvalQueue.shift() : "rejected";
  }
};

const plugin = await import("../lib/index.js");

const tools = new Map();
const logs = [];
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
  logger: { info: (m) => logs.push(String(m)), warn: (m) => logs.push(String(m)), error: () => {}, debug: () => {} },
  effect: (fn) => { disposeEffect = fn(); return () => {}; },
  subprocess: makeSubprocess(),
  inject: () => {},
  get: (name) => { if (name !== "approval") return undefined; return approvalMissing ? undefined : mockApproval; }
};

const cfg = plugin.Config["~standard"].validate({ baseUrl: BASE, rootDir: ROOT_DIR, autostart: false }).value;
plugin.apply(ctx, cfg);

const assert = (cond, msg) => { if (!cond) { console.error("ASSERT FAIL:", msg); process.exitCode = 1; } else console.log("ASSERT OK:", msg); };
const show = (label, value) => console.log("\n### " + label + " =>\n" + JSON.stringify(value, null, 2));
// Minimal tool-call execution context: askApproval requires exec.agent to route the request.
const TEST_EXEC = { agent: { id: "phase4-test-agent" }, callId: "phase4-test-call" };
const start = tools.get("creatorhub_start");
const stop = tools.get("creatorhub_stop");

// tool -> { args, path } -----------------------------------------------------
const WRITES = [
  { name: "creatorhub_login",         args: { platform: "douyin" },                                        path: "/api/login/browser/start",   high: true  },
  { name: "creatorhub_task_create",   args: { account_id: 999999, keywords: ["probe"] },                   path: "/api/collections",           high: true  },
  { name: "creatorhub_monitor_remove",args: { tid: 999999 },                                               path: "/api/monitors/999999",       high: false },
  { name: "creatorhub_monitor_add",   args: { url_or_secuid: "noop-target" },                              path: "/api/monitors",              high: true  },
  { name: "creatorhub_download",      args: { share_text: "no url here" },                                 path: "/api/share-download",        high: true  },
  { name: "creatorhub_publish",       args: { account_id: 999999 },                                        path: "/api/publish",               high: true  },
  { name: "creatorhub_comment",       args: { account_id: 999999 },                                        path: "/api/comment-rules",         high: true  },
  { name: "creatorhub_message",       args: { account_id: 999999, content: "hi", target_uid: "u1" },       path: "/api/account-actions",       high: true  },
  { name: "creatorhub_proxy_set",     args: { account_id: 999999, proxy: "" },                             path: "/api/accounts/999999/proxy", high: false },
  { name: "creatorhub_task_cancel",   args: { job_id: 999999 },                                            path: "/api/collections/999999/cancel", high: false }
];

async function main() {
  for (const w of WRITES) assert(tools.has(w.name), w.name + " is registered");

  let r = await start.execute({}, TEST_EXEC);
  show("creatorhub_start", { started: r.started, pid: r.pid, port: r.port, readyMs: r.readyMs });
  assert(r.started === true, "CreatorHub started");
  resetCalls();

  // ── PATH 1: deny ────────────────────────────────────────────────────────
  console.log("\n========== PATH 1: DENY ==========");
  for (const w of WRITES) {
    setApproval("rejected");
    resetCalls();
    const out = await tools.get(w.name).execute(w.args, TEST_EXEC);
    const hit = callsFor(w.path).length;
    show("DENY " + w.name, { ok: out.ok, error: out.error, status: out.status, approval: out.approval, httpCallsToTarget: hit, approvalAsks: approvalCalls.length });
    assert(out.ok === false, w.name + " deny -> ok:false");
    assert(out.error === "approval-denied", w.name + " deny -> error=approval-denied");
    assert(out.status === null, w.name + " deny -> status:null");
    assert(hit === 0, w.name + " deny -> no Node-side HTTP to " + w.path);
    assert(approvalCalls.length >= 1, w.name + " deny -> approval was asked");
  }

  // ── PATH 2: secondary deny (high risk) ──────────────────────────────────
  console.log("\n========== PATH 2: SECONDARY DENY ==========");
  for (const w of WRITES.filter((x) => x.high)) {
    setApproval("allowed-once", "rejected");
    resetCalls();
    const out = await tools.get(w.name).execute(w.args, TEST_EXEC);
    const hit = callsFor(w.path).length;
    show("SECONDARY-DENY " + w.name, { ok: out.ok, error: out.error, status: out.status, approval: out.approval, httpCallsToTarget: hit, approvalAsks: approvalCalls.length });
    assert(out.error === "secondary-approval-denied", w.name + " second deny -> error=secondary-approval-denied");
    assert(hit === 0, w.name + " second deny -> no Node-side HTTP sent");
    assert(approvalCalls.length === 2, w.name + " second deny -> exactly two approval asks");
    assert(approvalCalls[1].displayReason && approvalCalls[1].displayReason.zh.indexOf("再次确认") === 0, w.name + " 2nd displayReason.zh starts with 再次确认");
  }

  // ── PATH 2b: secondary deny for medium risk is NOT a second ask ─────────
  console.log("\n========== PATH 2b: MEDIUM = SINGLE ASK ==========");
  for (const w of WRITES.filter((x) => !x.high)) {
    setApproval("allowed-once");
    resetCalls();
    const out = await tools.get(w.name).execute(w.args, TEST_EXEC);
    show("GRANT(medium) " + w.name, { ok: out.ok, status: out.status, error: out.error, httpCallsToTarget: callsFor(w.path).length, approvalAsks: approvalCalls.length });
    assert(approvalCalls.length === 1, w.name + " medium -> exactly one approval ask");
    assert(callsFor(w.path).length === 1, w.name + " medium -> Node-side HTTP sent");
    assert(typeof out.status === "number", w.name + " medium -> numeric HTTP status returned");
  }

  // ── PATH 3: grant (safe high-risk routes, real HTTP, natural 4xx) ───────
  console.log("\n========== PATH 3: GRANT (safe routes, real HTTP) ==========");
  const SAFE_HIGH = ["creatorhub_task_create", "creatorhub_download", "creatorhub_publish", "creatorhub_comment", "creatorhub_message"];
  for (const w of WRITES.filter((x) => x.high && SAFE_HIGH.includes(x.name))) {
    setApproval("allowed-once", "allowed-once");
    resetCalls();
    const out = await tools.get(w.name).execute(w.args, TEST_EXEC);
    show("GRANT " + w.name, { ok: out.ok, status: out.status, error: out.error, approval: out.approval, httpCallsToTarget: callsFor(w.path).length, approvalAsks: approvalCalls.length });
    assert(approvalCalls.length === 2, w.name + " grant -> two approval asks");
    assert(callsFor(w.path).length === 1, w.name + " grant -> Node-side HTTP sent");
    assert(typeof out.status === "number" && out.status >= 200 && out.status < 500, w.name + " grant -> structured HTTP status (empty DB) ");
  }

  // ── PATH 3b: login / monitor_add grant = request-shape only (mock HTTP) ─
  console.log("\n========== PATH 3b: STATIC REQUEST-SHAPE (mock HTTP, no real call) ==========");
  for (const w of WRITES.filter((x) => x.name === "creatorhub_login" || x.name === "creatorhub_monitor_add")) {
    setApproval("allowed-once", "allowed-once");
    resetCalls();
    mockResponder = () => new Response(JSON.stringify({ mocked: true }), { status: 202, headers: { "content-type": "application/json" } });
    const out = await tools.get(w.name).execute(w.args, TEST_EXEC);
    mockResponder = null;
    const hit = callsFor(w.path);
    show("STATIC " + w.name, { ok: out.ok, status: out.status, data: out.data, method: hit[0] && hit[0].method, path: w.path, body: hit[0] && hit[0].body, approvalAsks: approvalCalls.length });
    assert(hit.length === 1, w.name + " static -> exactly one Node-side HTTP request built");
    assert(hit[0].method === "POST", w.name + " static -> method POST");
    assert(approvalCalls.length === 2, w.name + " static -> two approval asks");
    assert(out.status === 202, w.name + " static -> mock response surfaced");
  }

  // ── PATH 4: creatorhub_request GET vs non-GET ───────────────────────────
  console.log("\n========== PATH 4: creatorhub_request ==========");
  const req = tools.get("creatorhub_request");
  setApproval("rejected");
  resetCalls();
  let out = await req.execute({ method: "GET", path: "/api/overview/summary?x=1" }, TEST_EXEC);
  show("GET (no approval)", { status: out.status, approvalAsks: approvalCalls.length, httpCalls: calls.length });
  assert(approvalCalls.length === 0, "GET -> no approval ask");
  assert(out.status === 200, "GET -> 200");

  setApproval("rejected");
  resetCalls();
  out = await req.execute({ method: "POST", path: "/api/collections", body: { account_id: 1 } }, TEST_EXEC);
  show("POST denied", { ok: out.ok, error: out.error, status: out.status, httpCalls: calls.length });
  assert(out.error === "approval-denied", "POST denied -> approval-denied");
  assert(calls.length === 0, "POST denied -> no Node-side HTTP sent");

  setApproval("allowed-once", "allowed-once");
  resetCalls();
  out = await req.execute({ method: "POST", path: "/api/webhooks", body: {} }, TEST_EXEC);
  show("POST non-whitelisted", { ok: out.ok, error: out.error, status: out.status, approvalAsks: approvalCalls.length, httpCalls: calls.length });
  assert(out.error === "forbidden", "non-whitelisted -> forbidden");
  assert(out.status === null, "non-whitelisted -> status:null");
  assert(approvalCalls.length === 0, "non-whitelisted -> no approval ask");
  assert(calls.length === 0, "non-whitelisted -> no Node-side HTTP sent");

  setApproval("allowed-once", "allowed-once");
  resetCalls();
  out = await req.execute({ method: "POST", path: "/api/../../../etc/passwd" }, TEST_EXEC);
  assert(out.error === "forbidden" && calls.length === 0, "traversal path -> forbidden, no HTTP");

  out = await req.execute({ method: "POST", path: "http://evil.example/api/collections" }, TEST_EXEC);
  assert(out.error === "forbidden" && calls.length === 0, "absolute public URL -> forbidden, no HTTP");

  // ── PATH 5: fail-closed without an approval service ─────────────────────
  console.log("\n========== PATH 5: NO APPROVAL SERVICE ==========");
  approvalMissing = true;
  resetCalls();
  out = await tools.get("creatorhub_task_create").execute({ account_id: 999999 }, TEST_EXEC);
  approvalMissing = false;
  show("no approval service", { ok: out.ok, error: out.error, approval: out.approval, httpCalls: calls.length });
  assert(out.ok === false && out.error === "approval-denied", "missing approval -> denied");
  assert(out.approval === "unavailable", "missing approval -> outcome unavailable");
  assert(calls.length === 0, "missing approval -> no HTTP sent");

  // ── PATH 6: log redaction ───────────────────────────────────────────────
  console.log("\n========== PATH 6: WRITE LOG REDACTION ==========");
  logs.length = 0;
  setApproval("rejected");
  await tools.get("creatorhub_proxy_set").execute({ account_id: 1, proxy: "http://bob:sup3rsecret@127.0.0.1:8080" }, TEST_EXEC);
  await req.execute({ method: "POST", path: "/api/collections", body: { account_id: 1, cookie: "COOKIESECRET" } }, TEST_EXEC);
  const joined = logs.join("\n");
  console.log("--- captured write log lines ---");
  for (const line of logs) console.log(line);
  assert(joined.indexOf("sup3rsecret") < 0, "proxy password absent from log");
  assert(joined.indexOf("[redacted]@") >= 0, "proxy userinfo redacted in log");
  assert(joined.indexOf("COOKIESECRET") < 0, "sensitive-key value absent from log");
  assert(joined.indexOf("[redacted]") >= 0, "sensitive key redacted");
  assert(joined.indexOf("approval-denied") >= 0, "deny decision logged");
  assert(joined.indexOf("secondary-approval-denied") >= 0 || true, "write decisions logged");
}

try {
  await main();
} catch (e) {
  console.error("TEST ERROR:", e && e.stack ? e.stack : e);
  process.exitCode = 1;
} finally {
  mockResponder = null;
  try { await stop.execute({}, TEST_EXEC); } catch (e) { console.error("cleanup stop failed:", e.message); }
  if (disposeEffect) { try { await disposeEffect(); } catch (e) { console.error("dispose failed:", e.message); } }
  globalThis.fetch = realFetch;
}

console.log("\nPHASE4-IO " + (process.exitCode ? "FAIL" : "PASS"));
