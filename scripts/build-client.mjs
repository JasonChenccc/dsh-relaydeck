// Inline lib/panel + lib/host into the single browser bundle DSH serves.
// DSH serves exactly one file per package (exports["./client"]) and only accepts
// sibling client.<name>.js chunks; local module imports are not fetchable, so the
// modules are concatenated here. Plain Node, no third-party dependencies.
//
//   node scripts/build-client.mjs           # one build
//   node scripts/build-client.mjs --watch   # rebuild on save (300 ms debounce)
import { readFileSync, writeFileSync, watch } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const MODULES = [
  "lib/panel/dom.js",
  "lib/panel/events.js",
  "lib/panel/bridge.js",
  "lib/panel/views/_list.js",
  "lib/panel/views/dashboard.js",
  "lib/panel/views/flows.js",
  "lib/panel/views/runs.js",
  "lib/panel/views/library.js",
  "lib/panel/views/accounts.js",
  "lib/panel/views/capabilities.js",
  "lib/panel/views/dev.js",
  "lib/panel/views/about.js",
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

function build() {
  const css = readFileSync(join(root, "lib/panel/styles.css"), "utf8");
  const body = MODULES.map((rel) => "// ---- " + rel + " ----\n" + strip(readFileSync(join(root, rel), "utf8"))).join("\n\n");
  const out = [
    "// GENERATED FILE — edit lib/panel/** or lib/host/** then run: node scripts/build-client.mjs",
    "// DSH serves one bundle per package (exports[\"./client\"]); the modules are inlined below.",
    "window.__ModuleLoader__.load({",
    "  id: \"dsh-relaydeck\",",
    "  factory: (require) => {",
    "    var module = { exports: {} };",
    "    var exports = module.exports;",
    "    var React = require(\"react\");",
    "    var PANEL_CSS = " + JSON.stringify(css) + ";",
    "",
    body,
    "",
    "    exports.apply = function (ctx, config) { return mountPanel(ctx, config); };",
    "    exports.inject = [\"slots\", \"remote\"];",
    "    exports.createHostBridge = createHostBridge;",
    "    exports.fetchHostConfig = fetchHostConfig;",
    "    exports.getSessionContext = getSessionContext;",
    "    exports.createEventBus = createEventBus;",
    "    exports.createPanel = createPanel;",
    "    exports.CONFIG_PATH = CONFIG_PATH;",
    "    exports.PROXY_PATH = PROXY_PATH;",
    "    exports.PANEL_ID = PANEL_ID;",
    "    return module.exports;",
    "  }",
    "});",
    ""
  ].join("\n");
  writeFileSync(join(root, "client.js"), out, "utf8");
  return out.length;
}

const bytes = build();
console.log("client.js generated:", bytes, "bytes");

if (process.argv.includes("--watch")) {
  const targets = [join(root, "lib/panel"), join(root, "lib/host")];
  let timer = null;
  const rebuild = () => {
    try {
      console.log("[watch]", new Date().toLocaleTimeString(), "client.js regenerated:", build(), "bytes");
    } catch (error) {
      console.error("[watch] build failed:", error && error.message ? error.message : error);
    }
  };
  for (const target of targets) {
    watch(target, { recursive: true }, () => {
      if (timer !== null) clearTimeout(timer);
      timer = setTimeout(rebuild, 300);
    });
  }
  console.log("[watch] watching lib/panel and lib/host (300 ms debounce); Ctrl+C to stop");
}
