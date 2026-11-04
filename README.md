# creatorhub-dsh

DeepSeek Harness (DSH) Cordis plugin that bridges the local **CreatorHub**
content workbench (抖音 / 小红书 / 快手 / 视频号 / TikTok) into agent tools.

## Status: Phase 2 — real loopback IO

The plugin manages CreatorHub own backend process and exposes read-only
tools over the loopback HTTP API. All requests are restricted to
127.0.0.1 / localhost.

## Tools

| tool | purpose |
|---|---|
| creatorhub_ping | Phase 1 stub; proves the plugin loaded (no network) |
| creatorhub_status | GET /health, 2 s timeout; never throws; { running: false } when down |
| creatorhub_start | spawn CreatorHub .venv python (creatorhub.py start --no-open --port <port>), poll /health up to 120 s |
| creatorhub_stop | stop only the process this plugin spawned (Windows taskkill /T /F tree kill); never kills unknown PIDs |
| creatorhub_request | GET/POST/PUT/DELETE a /api/* path; returns status + body truncated at 8 KiB |

## Config

| field | default | meaning |
|---|---|---|
| baseUrl | http://127.0.0.1:8731 | loopback API base (port is passed to CreatorHub) |
| autostart | false | deferred start on next tick when true; apply itself never spawns |
| rootDir | D:\work\work\workstation\creatorhub-main\creatorhub-main | CreatorHub checkout (cwd for spawn) |
| healthTimeoutMs | 120000 | /health poll budget for creatorhub_start |
| requestTimeoutMs | 30000 | per-request timeout for creatorhub_request |
| maxLogBytes | 65536 | captured child log ring size |

## Tests

Run with the bundled Electron-as-Node runtime (no standalone node required):

    set ELECTRON_RUN_AS_NODE=1
    "D:\dsh\DeepSeek Harness.exe" test/smoke.js
    "D:\dsh\DeepSeek Harness.exe" test/phase2-io.js

smoke.js asserts the Phase 1 stub payload. phase2-io.js performs a real
start -> status -> request /api/overview/summary -> stop -> status cycle.

## Next step

Phase 3: compile common read-only /api/* endpoints into typed tools with
structured output and GUI presenters.

## Notice

For technical learning and personal content management only. Respect each
platform rules and local law; respect content copyright and personal privacy.
