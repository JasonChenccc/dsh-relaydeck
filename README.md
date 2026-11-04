# dsh-SAmanager

DeepSeek Harness (DSH) Cordis plugin that bridges the local **CreatorHub**
content workbench (抖音 / 小红书 / 快手 / 视频号 / TikTok) into agent tools and a
desktop sidebar panel.

Status: Phase 6 (config bridge + docs + packaging). Version 0.1.0, MIT.

## Architecture

```
        ┌─────────────────────── DSH host (Node, Cordis tree) ───────────────────────┐
        │  lib/index.js                                                             │
        │    22 tools: 5 built-in + 6 read-only + 10 approval-gated writes + config  │
        │    ctx.inject(["webServer"]) ──> GET /dsh-samanager/config  (read-only)   │
        └───────────────┬───────────────────────────────────────────┬───────────────┘
                        │ loopback HTTP                             │ same-origin fetch
                        v                                           v
        ┌──── CreatorHub :8731 ────┐              ┌──── DSH web client (browser) ────┐
        │ FastAPI + SQLite + CDP   │              │  client.js (side panel)          │
        │ /health, /api/*          │              │   ctx.slots.inject(              │
        └──────────────────────────┘              │     "sidebar.panellist"/"main")  │
                                                  └──────────────────────────────────┘
```

**Chains**

- **Write path**: tool → `normalizeApiPath` (reject absolute/`//`/`..`) → shared
  `WRITE_WHITELIST` (method + path template) → approval ×1 (medium) or ×2 (high) →
  redacted audit log → `callApi` on the loopback base URL. No match → `forbidden`;
  not `allowed-once` → `approval-denied` / `secondary-approval-denied`; no request sent.
- **Approval gate**: `ctx.get("approval").request({agent, toolName, callId?, reason?,
  displayReason?, signal?})` → `allowed-once | rejected | cancelled | unavailable`.
  Missing service, missing agent, thrown error, or any non-grant outcome fails closed.
- **Config bridge**: the client half cannot read the host `ctx` (the client runner
  mounts it with no config — `dsh-cordis-client-runner/lib/client.js:564`), so the host
  registers a read-only exact route `GET /dsh-samanager/config` behind the connection
  Host/Origin fence, and the panel fetches it. Resolution order:
  **bridge → `config.baseUrl` → `ctx.config.baseUrl` → default `http://127.0.0.1:8731`**;
  any non-loopback value is rejected.

## Tools

Built-in: `creatorhub_ping`, `creatorhub_status`, `creatorhub_start`, `creatorhub_stop`,
`creatorhub_request` (GET is an unapproved read; non-GET is whitelist + approval gated).

Read-only: `creatorhub_overview`, `creatorhub_accounts`, `creatorhub_account_stats`,
`creatorhub_task_queue`, `creatorhub_monitors`, `creatorhub_collections`,
`creatorhub_config_get`.

Approval-gated writes (risk / approvals):

| tool | method + path | risk | approvals |
|---|---|---|---|
| creatorhub_login | POST /api/login/{slug}/start | high | 2 |
| creatorhub_task_create | POST /api/collections | high | 2 |
| creatorhub_task_cancel | POST /api/collections/{job_id}/cancel | medium | 1 |
| creatorhub_monitor_add | POST /api/monitors | high | 2 |
| creatorhub_monitor_remove | DELETE /api/monitors/{tid} | medium | 1 |
| creatorhub_download | POST /api/share-download | high | 2 |
| creatorhub_publish | POST /api/publish | high | 2 |
| creatorhub_comment | POST /api/comment-rules | high | 2 |
| creatorhub_message | POST /api/account-actions (send_dm) | high | 2 |
| creatorhub_proxy_set | PUT /api/accounts/{account_id}/proxy | medium | 1 |

All HTTP is loopback-only (127.0.0.1 / localhost); non-loopback base URLs are rejected.

## Install / run / test / package

Install into a profile (a local path installs as a `link:` dependency):

    dsh plugin --profile <name> add <path-to-this-directory>

Compose check:

    dsh --profile <name> --dump-config          # expect: id: dsh-samanager / name: dsh-SAmanager
    dsh --profile <name> --dump-config-schema   # expect: the creatorhub config fragment

Tests (no standalone Node is required; the bundled runtime runs them):

    set ELECTRON_RUN_AS_NODE=1
    "D:\dsh\DeepSeek Harness.exe" test/smoke.js
    "D:\dsh\DeepSeek Harness.exe" test/phase2-io.js
    "D:\dsh\DeepSeek Harness.exe" test/phase3-readonly.js
    "D:\dsh\DeepSeek Harness.exe" test/phase4-io.js
    "D:\dsh\DeepSeek Harness.exe" test/client-contract.js
    "D:\dsh\DeepSeek Harness.exe" test/config-bridge.js

The IO tests start the real CreatorHub backend on **port 8731** (not 8000; that port is
often taken by unrelated services) and stop it afterwards. `phase2-io.js` and
`phase3-readonly.js` need a provisioned CreatorHub environment; run
`python creatorhub.py install --skip-browser --skip-node` once if the venv is missing.

Package contents (`package.json.files`): `lib/index.js`, `client.js`, `icon.svg`,
`cordis.patch.yml`, `README.md`, `docs/`, `test/`. `.venv/`, `data/` and `config.yaml`
are never included.

## Desktop panel (client half)

`dsh.client = { "platform": "web" }` plus `exports["./client"] = "./client.js"`. The
browser half is a native-JS `window.__ModuleLoader__.load({ id, factory })` bundle (no
build step, no JSX, no external resources); the factory returns `{ apply, inject }` with
`inject = ["slots"]`.

Contributions use the real slot contract:

    ctx.slots.inject("sidebar.panellist", () => ctx.slots.register(
      { name: "sidebar.panellist", id: "dsh-samanager", order: 50, label: "SA Manager" },
      CreatorHubIcon));
    ctx.slots.inject("main", () => ctx.slots.register(
      { name: "main", key: "dsh-samanager" },
      CreatorHubPanel));

The panel shows the plugin name, the effective `baseUrl`, the **config source**
(host bridge / injected config / default), a `/health` status dot (30 s poll) and an
**打开工作台** button. When the source is `default` the panel says the address is
unconfirmed. If the bridge times out the panel falls back silently and keeps working.

**Why a button, not an iframe:** the DSH Web GUI authenticates through a signed session
cookie and Host/Origin fences, and the CreatorHub workbench is a separate origin with its
own (absent) auth and long-lived session. Embedding it via `<iframe>` would either be
blocked by CSP/`frame-ancestors` or create a second unmanaged session, and "fixing" that
would mean weakening the host fences. `window.open` to the loopback origin is the
supported, non-hacky path.

### Manual test checklist (desktop GUI)

1. Install the plugin into the desktop profile and restart DSH.
2. Sidebar shows a **SA Manager** entry with the check-mark icon.
3. Selecting it shows the panel: name, base URL, **配置来源：宿主配置桥** (or
   **配置来源：默认地址** with the amber unconfirmed warning), and a status dot.
4. CreatorHub stopped → red 服务离线; after `creatorhub_start` (or manual start) → green
   服务在线 within 30 s.
5. **打开工作台** opens the workbench at the loopback base URL in a new tab.
6. Change the plugin `baseUrl` in the profile patch and reload: the panel shows the new
   value with source 宿主配置桥.

## Known limitations

1. **Config bridge is an HTTP route, not the official client-config mechanism.**
   0.2.1-rc.5 has no host→client config channel, so this plugin registers its own
   read-only route (`GET /dsh-samanager/config`) gated by the connection fence.
   Replace it when an official mechanism lands.
2. **GUI rendering is unverified here.** This environment is CLI/headless; the button
   path, icon rendering and dot colouring need the desktop checklist above.
3. **Approval requires an open turn.** `approval.request()` throws outside a turn; the
   plugin catches it and denies. Tools therefore cannot be approved from a non-agent
   caller.
4. **`Config.baseUrl` defaults are not visible to the client half.** Unless the row
   config sets `baseUrl`, the bridge reports the host default and the panel labels it
   `默认地址`.
5. **Writes are real.** With an empty database they fail naturally (4xx), but on a
   populated deployment the write tools perform real platform actions. Approval is the
   only guard, so review every prompt.
6. **The test suite proves plugin-side HTTP only.** "No request sent" does not prove the
   CreatorHub process performed no external action, and a granted request returning 4xx
   does not prove zero external side effects.

## Notice

For technical learning and personal content management only. Respect each platform
rules and local law; respect content copyright and personal privacy.
