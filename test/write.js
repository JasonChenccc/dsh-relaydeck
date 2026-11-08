// Write path: create a flow, run it, inspect the trace, delete it.
import { makeContext, assert, heading, loadPlugin } from "./harness.mjs";

const PORT = 18735;
const plugin = await loadPlugin();
const { ctx, tools, dispose } = makeContext();
const cfg = plugin.Config["~standard"].validate({ port: PORT, autostart: false }).value;
plugin.apply(ctx, cfg);

await tools.get("relaydeck_start").execute({}, {});

heading("relaydeck_flow_create");
const created = await tools.get("relaydeck_flow_create").execute({
  name: "测试流程",
  spec: {
    source: { capability: "core.manual", params: { platform: "demo", items: [
      { item_id: "t1", title: "高价条目", stats: { like_count: 5000 } },
      { item_id: "t2", title: "低价条目", stats: { like_count: 10 } }
    ] } },
    filters: [{ capability: "core.stat", params: { field: "like_count", op: ">=", value: 1000 } }],
    actions: [{ capability: "core.store" }]
  }
}, {});
console.log(JSON.stringify(created).slice(0, 260));
assert(created.ok === true, "flow created");
const flowId = created.data.id;
assert(typeof flowId === "number", "flow id returned");

heading("relaydeck_flow_run");
const run = await tools.get("relaydeck_flow_run").execute({ id: flowId }, {});
const r = run.data;
console.log(JSON.stringify({ id: r.id, state: r.state, found: r.found, kept: r.kept, saved: r.saved }));
assert(run.ok === true, "flow ran");
assert(r.state === "ok", "run finished ok");
assert(r.found === 2 && r.kept === 1 && r.saved === 1, "engine filtered 2 -> 1 and stored 1");
assert(Array.isArray(r.steps) && r.steps.length === 3, "three steps recorded (source, filter, action)");
assert(r.steps.every((s) => s.state === "ok"), "every step ok");
assert(r.steps[1].stage === "filter" && r.steps[1].in_count === 2 && r.steps[1].out_count === 1, "filter step shows 2 -> 1");

heading("relaydeck_run_get");
const trace = await tools.get("relaydeck_run_get").execute({ id: r.id }, {});
assert(trace.ok === true && trace.data.steps.length === 3, "run trace readable by id");

heading("relaydeck_artifact_list");
const arts = await tools.get("relaydeck_artifact_list").execute({}, {});
assert(arts.data.items.some((a) => a.item_id === "t1"), "filtered item landed in the library");
assert(!arts.data.items.some((a) => a.item_id === "t2"), "filtered-out item was not stored");

heading("duplicate run (dedupe not in spec, unique key holds)");
const second = await tools.get("relaydeck_flow_run").execute({ id: flowId }, {});
assert(second.data.state === "ok", "second run ok");
const arts2 = await tools.get("relaydeck_artifact_list").execute({}, {});
assert(arts2.data.items.filter((a) => a.item_id === "t1").length === 1, "artifact upsert keeps a single row");

heading("relaydeck_flow_delete");
const deleted = await tools.get("relaydeck_flow_delete").execute({ id: flowId }, {});
assert(deleted.ok === true && deleted.data.deleted === true, "flow deleted");
const after = await tools.get("relaydeck_flow_list").execute({}, {});
assert(!after.data.items.some((f) => f.id === flowId), "flow gone from the list");

await tools.get("relaydeck_stop").execute({}, {});
await dispose();
console.log("\nWRITE " + (process.exitCode ? "FAIL" : "PASS"));
