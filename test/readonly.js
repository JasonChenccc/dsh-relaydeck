// Read-only tools against the real backend.
import { makeContext, assert, heading, loadPlugin } from "./harness.mjs";

const PORT = 18734;
const plugin = await loadPlugin();
const { ctx, tools, dispose } = makeContext();
const cfg = plugin.Config["~standard"].validate({ port: PORT, autostart: false }).value;
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

heading("capability stages");
const caps = (await tools.get("relaydeck_capabilities").execute({}, {})).data.items;
const stages = new Set(caps.map((c) => c.stage));
assert(stages.has("source") && stages.has("filter") && stages.has("action"), "all three stages are represented");

await tools.get("relaydeck_stop").execute({}, {});
await dispose();
console.log("\nREADONLY " + (process.exitCode ? "FAIL" : "PASS"));
