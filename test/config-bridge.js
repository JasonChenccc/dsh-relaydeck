// Host routes: the panel's same-origin config + proxy surface.
import { makeContext, assert, heading, loadPlugin, tempDataDir, removeDataDir } from "./harness.mjs";

const PORT = 18736;
const plugin = await loadPlugin();
const { ctx, tools, routes, dispose } = makeContext();
const dataDir = tempDataDir("config-bridge");
const cfg = plugin.Config["~standard"].validate({ port: PORT, autostart: false, devMode: true, dataDir }).value;
plugin.apply(ctx, cfg);

heading("registered routes");
const paths = [...routes.keys()].sort();
console.log(paths.join("\n"));
assert(paths.includes("/dsh-relaydeck/config"), "config route registered");
assert(paths.includes("/dsh-relaydeck/proxy"), "proxy route registered");
assert(paths.includes("/dsh-relaydeck/dev/pack"), "dev pack route registered");
assert(paths.includes("/dsh-relaydeck/dev/restart"), "dev restart route registered");

function call(routePath, req) {
  return new Promise((resolve) => {
    const out = { statusCode: 0, headers: {}, body: "" };
    const res = {
      set statusCode(v) { out.statusCode = v; },
      get statusCode() { return out.statusCode; },
      setHeader: (k, v) => { out.headers[k] = v; },
      end: (b) => { out.body = b === undefined ? "" : String(b); resolve(out); }
    };
    Promise.resolve(routes.get(routePath).handler(req, res)).catch((e) => { out.body = "ERR " + e.message; resolve(out); });
  });
}

heading("GET /dsh-relaydeck/config");
const conf = await call("/dsh-relaydeck/config", { method: "GET", url: "/dsh-relaydeck/config" });
console.log(conf.statusCode, conf.body);
assert(conf.statusCode === 200, "config route answers 200");
const payload = JSON.parse(conf.body);
assert(payload.port === PORT, "config reports the configured port");
assert(payload.devMode === true, "config reports devMode");
assert(typeof payload.dataDir === "string" && payload.dataDir.length > 0, "config reports a data dir");

heading("config route rejects non-GET");
const bad = await call("/dsh-relaydeck/config", { method: "POST", url: "/dsh-relaydeck/config" });
assert(bad.statusCode === 405, "config route is GET-only");

heading("proxy route before the backend exists");
const early = await call("/dsh-relaydeck/proxy", { method: "GET", url: "/dsh-relaydeck/proxy?path=%2Fhealth" });
assert(early.statusCode === 502 || early.statusCode === 200, "proxy answers without crashing (" + early.statusCode + ")");

heading("proxy path allow-list");
const forbidden = await call("/dsh-relaydeck/proxy", { method: "GET", url: "/dsh-relaydeck/proxy?path=" + encodeURIComponent("/etc/passwd") });
console.log(forbidden.statusCode, forbidden.body);
assert(forbidden.statusCode === 400, "proxy rejects paths outside /health and /api/*");

heading("proxy forwards to the real backend");
await tools.get("relaydeck_start").execute({}, {});
const live = await call("/dsh-relaydeck/proxy", { method: "GET", url: "/dsh-relaydeck/proxy?path=%2Fhealth" });
console.log(live.statusCode, live.body.slice(0, 160));
assert(live.statusCode === 200 && live.body.includes("relaydeck"), "proxy forwards /health to the backend");

const caps = await call("/dsh-relaydeck/proxy", { method: "GET", url: "/dsh-relaydeck/proxy?path=" + encodeURIComponent("/api/capabilities") });
assert(caps.statusCode === 200 && caps.body.includes("core.store"), "proxy forwards /api/capabilities");

await tools.get("relaydeck_stop").execute({}, {});
await dispose();
removeDataDir(dataDir);
console.log("\nCONFIG-BRIDGE " + (process.exitCode ? "FAIL" : "PASS"));
