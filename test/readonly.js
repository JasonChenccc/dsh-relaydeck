// Read-only tools against the real backend.
import { makeContext, assert, heading, loadPlugin, tempDataDir, removeDataDir } from "./harness.mjs";

const PORT = 18734;
const plugin = await loadPlugin();
const { ctx, tools, dispose } = makeContext();
const dataDir = tempDataDir("readonly");
const cfg = plugin.Config["~standard"].validate({ port: PORT, autostart: false, dataDir }).value;
plugin.apply(ctx, cfg);

heading("start backend");
const started = await tools.get("relaydeck_start").execute({}, {});
assert(started.started === true, "backend started on " + PORT);

for (const [name, check] of [
  ["relaydeck_capabilities", (d) => Array.isArray(d.items) && d.items.some((c) => c.id === "core.store")],
  ["relaydeck_flow_list", (d) => Array.isArray(d.items)],
  ["relaydeck_run_list", (d) => Array.isArray(d.items)],
  ["relaydeck_artifact_list", (d) => Array.isArray(d.items)],
  ["relaydeck_binding_list", (d) => Array.isArray(d.items)]
]) {
  heading(name);
  const res = await tools.get(name).execute({}, {});
  console.log(JSON.stringify(res).slice(0, 220));
  assert(res.ok === true, name + " ok");
  assert(check(res.data), name + " returns the documented shape");
}

heading("platforms");
const plats = await fetch("http://127.0.0.1:" + PORT + "/api/platforms", { signal: AbortSignal.timeout(5000) }).then((r) => r.json());
const ids = plats.items.map((p) => p.id).sort();
console.log(ids.join(", "));
assert(ids.length === 5, "five platforms are declared");
assert(["douyin","kuaishou","shipinhao","tiktok","xhs"].every((id) => ids.includes(id)), "all five platform ids present");

heading("login surface");
const logins = await fetch("http://127.0.0.1:" + PORT + "/api/login", { signal: AbortSignal.timeout(5000) }).then((r) => r.json());
assert(Array.isArray(logins.items), "login list is an array");

heading("capability stages");
const caps = (await tools.get("relaydeck_capabilities").execute({}, {})).data.items;
const stages = new Set(caps.map((c) => c.stage));
assert(stages.has("source") && stages.has("filter") && stages.has("action"), "all three stages are represented");

await tools.get("relaydeck_stop").execute({}, {});
await dispose();
removeDataDir(dataDir);
console.log("\nREADONLY " + (process.exitCode ? "FAIL" : "PASS"));
