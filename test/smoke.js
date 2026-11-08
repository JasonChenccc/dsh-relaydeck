// Smoke: the plugin half loads, registers its tools, and reports identity.
import { makeContext, assert, heading, loadPlugin } from "./harness.mjs";

const plugin = await loadPlugin();
const { ctx, tools } = makeContext();
const cfg = plugin.Config["~standard"].validate({ autostart: false }).value;
plugin.apply(ctx, cfg);

heading("registered tools");
const names = [...tools.keys()].sort();
console.log(names.join(", "));
assert(names.length >= 12, "registers at least 12 tools (" + names.length + ")");
assert(names.every((n) => n.startsWith("relaydeck_")), "every tool is namespaced relaydeck_");
assert(names.includes("relaydeck_ping"), "relaydeck_ping registered");
assert(names.includes("relaydeck_status"), "relaydeck_status registered");
assert(names.includes("relaydeck_flow_create"), "relaydeck_flow_create registered");
assert(names.includes("relaydeck_flow_run"), "relaydeck_flow_run registered");

heading("relaydeck_ping");
const ping = await tools.get("relaydeck_ping").execute({}, {});
console.log(JSON.stringify(ping));
assert(ping.ok === true, "ping ok");
assert(ping.plugin === "dsh-relaydeck", "plugin identity is dsh-relaydeck");
assert(ping.autostart === false, "autostart reflects config");
assert(ping.devMode === false, "devMode off for a packed install");

heading("relaydeck_config_get");
const conf = await tools.get("relaydeck_config_get").execute({}, {});
console.log(JSON.stringify(conf));
assert(conf.port === 18731, "default port is 18731");
assert(typeof conf.backendEntry === "string" && conf.backendEntry.endsWith("index.mjs"), "backend entry resolved");

console.log("\nSMOKE " + (process.exitCode ? "FAIL" : "PASS"));
