# creatorhub-dsh

DeepSeek Harness (DSH) Cordis plugin that bridges the local **CreatorHub**
content workbench (抖音 / 小红书 / 快手 / 视频号 / TikTok) into agent tools.

## Status: Phase 4 — approval-gated write tools

All HTTP is loopback-only (127.0.0.1 / localhost). Every write tool requires
approval through the composed `ctx.get("approval")` service and fails closed
when that service is missing, unreachable, or rejects.

## Read tools

| tool | endpoint |
|---|---|
| creatorhub_ping | — (Phase 1 stub) |
| creatorhub_status | GET /health |
| creatorhub_start / creatorhub_stop | spawn/stop the managed backend |
| creatorhub_request | GET any /api/*; non-GET must be whitelisted + approved |
| creatorhub_overview | GET /api/overview/summary |
| creatorhub_accounts | GET /api/accounts |
| creatorhub_account_stats | GET /api/account-stats/{id} |
| creatorhub_task_queue | GET /api/task-queue |
| creatorhub_monitors | GET /api/monitors |
| creatorhub_collections | GET /api/collections |

## Write tools (approval-gated)

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

Approval contract (verified in @deepseek-ai/dsh-user-approval):
`ctx.get("approval").request({agent, toolName, callId?, reason?, displayReason?, signal?})`
returns "allowed-once" | "rejected" | "cancelled" | "unavailable"; only
"allowed-once" grants. High-risk tools ask twice; the second displayReason.zh
starts with 再次确认 and restates the action, parameters, and irreversibility.
Write calls are logged with the path and a redacted parameter summary
(credentials never enter the log).

Route sources (app/main.py): overview/summary:1711, accounts:1728,
account-stats:3560, task-queue:1880, monitors:8112, collections:7485;
login:1469+, collections POST:7408, cancel:7661, monitors POST:7923,
monitors DELETE:8148, share-download:6455, publish:10152, comment-rules:10813,
account-actions:4540, account proxy:5035.

## Config

| field | default |
|---|---|
| baseUrl | http://127.0.0.1:8731 |
| autostart | false |
| rootDir | D:\work\work\workstation\creatorhub-main\creatorhub-main |
| healthTimeoutMs | 120000 |
| requestTimeoutMs | 30000 |
| maxLogBytes | 65536 |

## Tests

    set ELECTRON_RUN_AS_NODE=1
    "D:\dsh\DeepSeek Harness.exe" test/smoke.js
    "D:\dsh\DeepSeek Harness.exe" test/phase2-io.js
    "D:\dsh\DeepSeek Harness.exe" test/phase3-readonly.js
    "D:\dsh\DeepSeek Harness.exe" test/phase4-io.js

phase4-io.js injects a mock approval service and counts Node-side HTTP via a
monkey-patched fetch: deny and secondary-deny must send no request; grant must
send exactly one. The counter proves plugin-side HTTP only, not the absence of
external side effects inside the CreatorHub process.

## Notice

For technical learning and personal content management only. Respect each
platform rules and local law; respect content copyright and personal privacy.
