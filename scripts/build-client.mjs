// Inline lib/panel + lib/host into the single browser bundle DSH serves.
// DSH serves exactly one file per package (exports["./client"]) and only accepts
// sibling client.<name>.js chunks; local module imports are not fetchable, so the
// modules are concatenated here. Plain Node, no third-party dependencies.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const MODULES = [
  "lib/panel/dom.js",
  "lib/panel/events.js",
  "lib/panel/bridge.js",
  "lib/panel/views/_list.js",
  "lib/panel/views/overview.js",
  "lib/panel/views/accounts.js",
  "lib/panel/views/monitors.js",
  "lib/panel/views/collections.js",
  "lib/panel/views/comment-watches.js",
  "lib/panel/views/danmaku-watches.js",
  "lib/panel/views/account-hub.js",
  "lib/panel/views/tasks.js",
  "lib/panel/views/publish.js",
  "lib/panel/views/auto-comment.js",
  "lib/panel/views/downloads.js",
  "lib/panel/views/notifications.js",
  "lib/panel/index.js",
  "lib/host/bridge.js",
  "lib/host/client.js"
];

function strip(source) {
  return source.split("\n")
    .filter((line) => !/^\s*import\s/.test(line))
    .map((line) => line.replace(/^export\s+/, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n");
}

const css = readFileSync(join(root, "lib/panel/styles.css"), "utf8");
const body = MODULES.map((rel) => "// ---- " + rel + " ----\n" + strip(readFileSync(join(root, rel), "utf8"))).join("\n\n");

const out = [
  "// GENERATED FILE — edit lib/panel/** or lib/host/** then run: node scripts/build-client.mjs",
  "// DSH serves one bundle per package (exports[\"./client\"]); the modules are inlined below.",
  "window.__ModuleLoader__.load({",
  "  id: \"dsh-SAmanager\",",
  "  factory: (require) => {",
  "    var module = { exports: {} };",
  "    var exports = module.exports;",
  "    var React = require(\"react\");",
  "    var PANEL_CSS = " + JSON.stringify(css) + ";",
  "",
  body,
  "",
  "    exports.apply = function (ctx, config) { return mountPanel(ctx, config); };",
  "    exports.inject = [\"slots\"];",
  "    exports.pickBaseUrl = pickBaseUrl;",
  "    exports.fetchBridgeBaseUrl = fetchBridgeBaseUrl;",
  "    exports.resolveStaticBaseUrl = resolveStaticBaseUrl;",
  "    exports.isLoopback = isLoopback;",
  "    exports.CONFIG_PATH = CONFIG_PATH;",
  "    exports.DEFAULT_BASE_URL = DEFAULT_BASE_URL;",
  "    exports.PANEL_ID = PANEL_ID;",
  "    exports.createHostBridge = createHostBridge;",
  "    exports.getSessionContext = getSessionContext;",
  "    exports.createEventBus = createEventBus;",
  "    exports.createPanel = createPanel;",
  "    return module.exports;",
  "  }",
  "});",
  ""
].join("\n");

writeFileSync(join(root, "client.js"), out, "utf8");
console.log("client.js generated:", out.length, "bytes");
