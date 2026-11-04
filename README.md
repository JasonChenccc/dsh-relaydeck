# creatorhub-dsh

DeepSeek Harness (DSH) Cordis plugin that bridges the local **CreatorHub**
content workbench (抖音 / 小红书 / 快手 / 视频号 / TikTok) into agent tools.

## Status: Phase 3 — typed read-only tools

All HTTP is loopback-only (127.0.0.1 / localhost). No write tools are
registered. The plugin manages CreatorHub own backend process.

## Tools

| tool | endpoint | purpose |
|---|---|---|
| creatorhub_ping | — | Phase 1 stub; proves the plugin loaded (no network) |
| creatorhub_status | GET /health | 2 s timeout; never throws; { running: false } when down |
| creatorhub_start | spawn | CreatorHub .venv python; poll /health up to 120 s |
| creatorhub_stop | — | tree-kill only the process this plugin spawned |
| creatorhub_request | any /api/* | raw GET/POST/PUT/DELETE, body truncated at 8 KiB |
| creatorhub_overview | GET /api/overview/summary | per-platform counts (accounts/monitors/downloaded/comments) |
| creatorhub_accounts | GET /api/accounts | account list (login/risk/fingerprint/proxy fields) |
| creatorhub_account_stats | GET /api/account-stats/{id} | per-account daily trend + works |
| creatorhub_task_queue | GET /api/task-queue | unified queue, paged, with summary |
| creatorhub_monitors | GET /api/monitors | monitor targets + content counts |
| creatorhub_collections | GET /api/collections | keyword collection jobs |

The six typed tools return { ok, data, truncated, error?, status?, bodyBytes? };
they never throw. `truncated` is an informational flag: true when the raw
response body exceeded 8 KiB (data is still the full parsed JSON).

Route sources (app/main.py): /api/overview/summary:1711, /api/accounts:1728,
/api/account-stats/{account_id}:3560, /api/task-queue:1880, /api/monitors:8112,
/api/collections:7485.

## Config

| field | default | meaning |
|---|---|---|
| baseUrl | http://127.0.0.1:8731 | loopback API base (port is passed to CreatorHub) |
| autostart | false | deferred start on next tick when true; apply itself never spawns |
| rootDir | D:\work\work\workstation\creatorhub-main\creatorhub-main | CreatorHub checkout (cwd for spawn) |
| healthTimeoutMs | 120000 | /health poll budget for creatorhub_start |
| requestTimeoutMs | 30000 | per-request timeout |
| maxLogBytes | 65536 | captured child log ring size |

## Tests

Run with the bundled Electron-as-Node runtime (no standalone node required):

    set ELECTRON_RUN_AS_NODE=1
    "D:\dsh\DeepSeek Harness.exe" test/smoke.js
    "D:\dsh\DeepSeek Harness.exe" test/phase2-io.js
    "D:\dsh\DeepSeek Harness.exe" test/phase3-readonly.js

smoke.js asserts the Phase 1 stub payload. phase2-io.js performs a real
start -> status -> request -> stop -> status cycle. phase3-readonly.js starts
CreatorHub, calls every typed read-only tool, and stops it.

## Next step

Phase 4: approval-gated write tools (login, collection, publish, comment, DM).

## Notice

For technical learning and personal content management only. Respect each
platform rules and local law; respect content copyright and personal privacy.
