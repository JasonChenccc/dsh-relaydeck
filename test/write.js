// Write path: create a flow, run it, inspect the trace, relay-plan, retry, delete.
import { makeContext, assert, heading, loadPlugin, tempDataDir, removeDataDir } from "./harness.mjs";

const PORT = 18735;
const plugin = await loadPlugin();
const { ctx, tools, dispose } = makeContext();
const dataDir = tempDataDir("write");
const cfg = plugin.Config["~standard"].validate({ port: PORT, autostart: false, dataDir }).value;
plugin.apply(ctx, cfg);

await tools.get("relaydeck_start").execute({}, {});

heading("relaydeck_flow_create");
const created = await tools.get("relaydeck_flow_create").execute({
  name: "测试流程",
  spec: {
    source: { capability: "core.manual", params: { platform: "douyin", items: [
      { item_id: "t1", title: "高价条目", author: "张三", stats: { like_count: 5000 } },
      { item_id: "t2", title: "低价条目", author: "李四", stats: { like_count: 10 } }
    ] } },
    filters: [{ capability: "core.stat", params: { field: "like_count", op: ">=", value: 1000 } }],
    actions: [
      { capability: "core.store" },
      { capability: "core.publishPlan", params: { target: "xhs", tags: "露营", titleTemplate: "{title}" } }
    ]
  }
}, {});
console.log(JSON.stringify(created).slice(0, 220));
assert(created.ok === true, "flow created");
const flowId = created.data.id;
assert(typeof flowId === "number", "flow id returned");

heading("relaydeck_flow_run");
const run = await tools.get("relaydeck_flow_run").execute({ id: flowId }, {});
const r = run.data;
console.log(JSON.stringify({ id: r.id, state: r.state, found: r.found, kept: r.kept, saved: r.saved }));
assert(run.ok === true, "flow ran");
assert(r.state === "ok", "run finished ok");
assert(r.found === 2 && r.kept === 1, "engine filtered 2 -> 1");
assert(Array.isArray(r.steps) && r.steps.length === 4, "four steps recorded (source, filter, store, plan)");
assert(r.steps.every((s) => s.state === "ok"), "every step ok");
assert(r.steps[1].stage === "filter" && r.steps[1].in_count === 2 && r.steps[1].out_count === 1, "filter step shows 2 -> 1");

heading("relaydeck_run_get (trace)");
const trace = await tools.get("relaydeck_run_get").execute({ id: r.id }, {});
assert(trace.ok === true && trace.data.steps.length === 4, "run trace readable by id");

heading("relaydeck_artifact_list");
const arts = await tools.get("relaydeck_artifact_list").execute({}, {});
assert(arts.data.items.some((a) => a.item_id === "t1"), "filtered item landed in the library");
assert(!arts.data.items.some((a) => a.item_id === "t2"), "filtered-out item was not stored");

heading("relaydeck_plan_list (cross-platform relay draft)");
const plans = await tools.get("relaydeck_plan_list").execute({}, {});
const plan = plans.data.items[0];
console.log(JSON.stringify(plan).slice(0, 220));
assert(plans.data.items.length === 1, "one publish draft was produced");
assert(plan.platform === "xhs" && plan.source_platform === "douyin", "draft relays douyin -> xhs");
assert(plan.title === "高价条目" && plan.status === "draft", "draft carries the rendered title");

heading("relaydeck_plan_review");
const approved = await tools.get("relaydeck_plan_review").execute({ id: plan.id, status: "approved" }, {});
assert(approved.ok === true && approved.data.updated === true, "draft approved");
const rejected = await tools.get("relaydeck_plan_review").execute({ id: plan.id, status: "nonsense" }, {});
assert(rejected.ok === false, "invalid status rejected");

heading("relaydeck_run_retry (replay)");
const replay = await tools.get("relaydeck_run_retry").execute({ id: r.id }, {});
console.log(JSON.stringify({ id: replay.data.id, state: replay.data.state, found: replay.data.found }));
assert(replay.ok === true, "retry accepted");
assert(replay.data.id !== r.id, "retry produced a new run");
assert(replay.data.state === "ok" && replay.data.kept === 1, "replay reproduced the result");

heading("relaydeck_scheduler_get");
const sched = await tools.get("relaydeck_scheduler_get").execute({}, {});
console.log(JSON.stringify(sched.data).slice(0, 200));
assert(typeof sched.data.running === "boolean", "scheduler reports running state");
assert(Array.isArray(sched.data.monitored), "scheduler lists monitored flows");

heading("relaydeck_flow_delete");
const deleted = await tools.get("relaydeck_flow_delete").execute({ id: flowId }, {});
assert(deleted.ok === true && deleted.data.deleted === true, "flow deleted");
const after = await tools.get("relaydeck_flow_list").execute({}, {});
assert(!after.data.items.some((f) => f.id === flowId), "flow gone from the list");

await tools.get("relaydeck_stop").execute({}, {});
await dispose();
removeDataDir(dataDir);
console.log("\nWRITE " + (process.exitCode ? "FAIL" : "PASS"));
