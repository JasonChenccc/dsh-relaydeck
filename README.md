# RelayDeck

**A DSH-native content relay workbench.** Declare a flow — *source → filters → actions* — and it collects, narrows, stores and moves content for you. Every execution is traced and replayable.

```
dsh-relaydeck   ·   panel label: RelayDeck   ·   entry id: dsh-relaydeck
```

---

## The idea

Most content tools are organised as feature pages: an account page, a monitor page, a publish page. You click through them one at a time.

RelayDeck is organised around **flows**. One flow is one sentence:

> "Take the top videos for *camping* with 1000+ likes, download them, and publish them."

That sentence is a first-class, savable, schedulable, replayable entity:

```json
{
  "source":  { "capability": "core.manual", "params": { "items": [ /* ... */ ] } },
  "filters": [ { "capability": "core.stat", "params": { "field": "like_count", "op": ">=", "value": 1000 } } ],
  "actions": [ { "capability": "core.store" }, { "capability": "notify", "params": { "message": "done" } } ]
}
```

The panel is an **observability surface**, not a control panel: it shows what is running, what it produced, and where it failed.

---

## Core model

| Concept | Meaning |
|---|---|
| **Capability** | One ability on one platform, in one stage: `source` / `filter` / `action` |
| **Flow** | `source → filters[] → actions[]` — the product's main entity |
| **Run** | One execution of a flow |
| **RunStep** | One stage execution inside a run: inputs, outputs, detail, error |
| **Artifact** | A content item a run produced and stored |
| **Binding** | Platform credentials / login state (never a password) |

Adding a platform means **registering capabilities**. Every existing flow can immediately reference them — no new pages, no new schema.

---

## Architecture

```
dsh-relaydeck/
├── lib/            DSH plugin half (tools, lifecycle, host routes)
├── client.js       panel bundle (generated)
└── server/         the product: own Node backend, zero dependencies
    ├── index.mjs       127.0.0.1:18731
    ├── db.mjs          node:sqlite schema + migrations
    ├── flow.mjs        the flow engine
    ├── capabilities/   registry + built-in core capabilities
    └── api/            routes shared by the panel and the tools
```

* **Runtime**: DSH's bundled Node. Users install nothing else — no Python, no virtualenv, no separate download.
* **Storage**: `node:sqlite` (built in).
* **HTTP**: `node:http` (built in).
* **Panel**: hand-written DOM, DSH design tokens, no framework.
* **Platform access**: a real browser is driven over CDP (Node's built-in WebSocket). The page signs its own requests, so RelayDeck does not reimplement any platform's signing algorithm.
* **Lifecycle**: the plugin spawns the backend through `ctx.subprocess`; disposing the plugin reaps the whole process range.

The panel runs on the DSH origin, so it reaches the backend through the same-origin route `/dsh-relaydeck/proxy` — never by calling the loopback port directly.

---

## Panel

| View | What it shows |
|---|---|
| 看板 Dashboard | Backend health, flow/run/artifact counts, most recent runs, current DSH session |
| 流程 Flows | Flow list, run/delete, create from a spec |
| 运行 Runs | Run history; click a run to see its step-by-step trace |
| 素材 Library | Artifacts produced by runs |
| 账号 Accounts | QR login per platform + recorded bindings |
| 能力 Capabilities | Every registered capability, grouped by stage |
| 开发调试 Dev | Reload / repack / restart helpers |
| 关于 About | Version, license, disclaimer |

---

## Agent tools

All tools are namespaced `relaydeck_*`.

**Read** — `relaydeck_ping`, `relaydeck_config_get`, `relaydeck_status`, `relaydeck_capabilities`, `relaydeck_flow_list`, `relaydeck_run_list`, `relaydeck_run_get`, `relaydeck_artifact_list`, `relaydeck_binding_list`, `relaydeck_platform_list`, `relaydeck_login_list`

**Write** — `relaydeck_start`, `relaydeck_stop`, `relaydeck_flow_create`, `relaydeck_flow_run`, `relaydeck_flow_delete`, `relaydeck_login_start`, `relaydeck_login_status`

---

## Configuration

```yaml
- id: dsh-relaydeck
  config:
    port: 18731              # loopback backend port
    dataDir: ""              # defaults to ~/.relaydeck
    autostart: true          # start the backend with the plugin
    startTimeoutMs: 30000
    requestTimeoutMs: 30000
    devMode: false           # enables /dsh-relaydeck/dev/* routes
    allowHostRestart: false
```

`devMode` also turns itself on automatically when the package is loaded through a link (dev source).

---

## Development

```powershell
node scripts/dev-enable.mjs              # dry run: show planned profile changes
node scripts/dev-enable.mjs --apply      # back up the profile, switch to link: + enable HMR
node scripts/build-client.mjs --watch    # rebuild client.js on save (300 ms debounce)
node scripts/dev-pack.mjs                # rebuild + repackage the tarball
```

Save a file under `lib/panel/**` → `client.js` is rebuilt → the Host swaps the plugin into the open page. Change `lib/index.js` → use the panel's **开发调试 → 重载插件**.

The backend is plain Node: run it standalone with
`node server/index.mjs --port=18731 --data=.tmp-data`.

### Tests

```powershell
# from a checkout of the DSH desktop app
set ELECTRON_RUN_AS_NODE=1 && "D:\dsh\DeepSeek Harness.exe" test/smoke.js
```

`smoke · lifecycle · readonly · write · client-contract · config-bridge`

---

## Status

| Milestone | State |
|---|---|
| **M0** skeleton: backend, schema, flow engine, lifecycle, panel | ✅ done |
| **M1** browser channel + QR login + first platform capability | ✅ done |
| **M2** flow scheduling, retry, replay | ⏳ |
| **M3** cross-platform relay (collect on one platform, publish to another) | ⏳ next |
| **M2** all five platform search capabilities (one generic engine + descriptors) | ✅ done |
| **M5** more platforms | ⏳ |

---

## Independence

RelayDeck is an independent project. It contains no third-party content-tool code, assets, text or design, and it does not bundle, launch or require any other workbench. Platform integrations are implemented here, against the platforms' own public web interfaces, using the credentials of the user's own accounts. See `NOTICE`.

Platform terms of service govern automated access to those platforms; using this software is your responsibility.

## License

MIT — see `LICENSE`.
