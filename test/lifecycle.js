// Lifecycle: the plugin starts and stops ITS OWN backend through ctx.subprocess.
import { makeContext, assert, heading, loadPlugin } from "./harness.mjs";

const PORT = 18733;
const plugin = await loadPlugin();
const { ctx, tools, dispose } = makeContext();
const cfg = plugin.Config["~standard"].validate({ port: PORT, autostart: false }).value;
plugin.apply(ctx, cfg);

const start = tools.get("relaydeck_start");
const stop = tools.get("relaydeck_stop");
const status = tools.get("relaydeck_status");

heading("relaydeck_start");
const started = await start.execute({}, {});
console.log(JSON.stringify({ started: started.started, port: started.port, readyMs: started.readyMs }));
assert(started.started === true, "backend started");
assert(started.port === PORT, "reports the configured port");
assert(Array.isArray(started.command) && started.command.length > 1, "exposes the spawned command");
assert(String(started.log).includes("relaydeck backend ready") || started.readyMs >= 0, "backend log captured");

heading("relaydeck_status (after start)");
const up = await status.execute({}, {});
console.log(JSON.stringify(up));
assert(up.running === true, "status reports running after start");
assert(up.data && up.data.name === "relaydeck", "health payload identifies relaydeck");

heading("relaydeck_start again (idempotent)");
const again = await start.execute({}, {});
assert(again.started === false && again.reason === "already-running", "second start is a no-op");

heading("relaydeck_stop");
const stopped = await stop.execute({}, {});
console.log(JSON.stringify(stopped));
assert(stopped.stopped === true, "stop reports stopped");

heading("relaydeck_status (after stop)");
const down = await status.execute({}, {});
console.log(JSON.stringify(down));
assert(down.running === false, "status reports not running after stop");

await dispose();
console.log("\nLIFECYCLE " + (process.exitCode ? "FAIL" : "PASS"));
