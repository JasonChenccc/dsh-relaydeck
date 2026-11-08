# RelayDeck — agent integration guide

This file is for **agents** (and humans automating it). The panel is the human UI;
everything here is the machine interface. Both drive the same backend.

---

## 1. Shape of the system

```
DSH plugin (lib/index.js)            agent tools: relaydeck_*
        │  spawns / reaps
        ▼
RelayDeck backend  server/           127.0.0.1:18731
        │  node:http + node:sqlite, zero third-party dependencies
        ▼
Flows: source → filters → actions   each execution is a traced Run
```

The backend ships inside the plugin. Nothing else needs installing.

---

## 2. Core concepts

| Concept | Meaning |
|---|---|
| **Capability** | one ability in one stage: \`source\` / \`filter\` / \`action\` |
| **Flow** | \`{ source, filters[], actions[] }\` — the unit of work |
| **Run** | one execution; carries \`found / kept / saved\` and a **step trace** |
| **RunStep** | one stage execution: \`in_count\`, \`out_count\`, \`detail\`, \`error\` |
| **Artifact** | a collected item, unique per \`(platform, item_id)\` |
| **PublishPlan** | a draft to publish an artifact elsewhere: \`draft → approved → prepared\` |
| **Binding** | platform login state (cookies), never a password |

Add a platform = register capabilities. No schema change, no panel change.

---

## 3. Capabilities

Read the live list: \`GET /api/capabilities\` or the \`relaydeck_capabilities\` tool.

| id | stage | params |
|---|---|---|
| \`core.manual\` | source | \`{ items: [...] , platform? }\` — items supplied inline |
| \`core.demoFeed\` | source | \`{ count?, platform? }\` — login-free demo data with downloadable media |
| \`<platform>.search\` | source | \`{ query, limit?, scrolls? }\` — douyin / xhs / kuaishou / shipinhao / tiktok |
| \`core.stat\` | filter | \`{ field, op, value }\` — op ∈ \`>= > <= < == !=\` |
| \`core.contains\` | filter | \`{ include?, exclude? }\` — comma-separated |
| \`core.limit\` | filter | \`{ count }\` |
| \`core.dedupe\` | filter | \`{}\` — drops items already in the library |
| \`core.store\` | action | \`{}\` |
| \`core.download\` | action | \`{ dir?, limit? }\` — writes item media to disk |
| \`core.publishPlan\` | action | \`{ target, titleTemplate?, bodyTemplate?, tags?, limit? }\` |
| \`<platform>.prepareDraft\` | action | \`{ planIds? }\` — fills the platform's creator UI, **never submits** |
| \`core.notify\` | action | \`{ message }\` |

### Item shape produced by sources

```json
{
  "platform": "douyin", "item_id": "7123…", "title": "…", "author": "…",
  "cover_url": "https://…", "media": ["https://…"], 
  "stats": { "like_count": 0, "comment_count": 0, "share_count": 0, "play_count": 0 }
}
```

---

## 4. Flow spec

```json
{
  "source":  { "capability": "douyin.search", "params": { "query": "露营", "limit": 20 } },
  "filters": [
    { "capability": "core.stat",   "params": { "field": "like_count", "op": ">=", "value": 1000 } },
    { "capability": "core.dedupe", "params": {} }
  ],
  "actions": [
    { "capability": "core.store",       "params": {} },
    { "capability": "core.download",    "params": { "limit": 1 } },
    { "capability": "core.publishPlan", "params": { "target": "xhs", "tags": "露营" } }
  ]
}
```

A filter that empties the list short-circuits the remaining filters; actions still run
(so a plan-only action on an empty list is a no-op, not an error).

**Triggers**: \`manual\` (default), \`interval\` (\`cron\` holds seconds, ≥ 30),
\`cron\` (\`cron\` holds a five-field expression, local time).

---

## 5. HTTP API

All loopback-only. The desktop panel reaches it through the same-origin route
\`/dsh-relaydeck/proxy?path=<encoded>\`; the agent tools call it directly.

| Method | Path | Purpose |
|---|---|---|
| GET | \`/health\` | status, version, schema version, row counts |
| GET | \`/api/capabilities\` | registered capabilities |
| GET | \`/api/platforms\` | platforms + login hints |
| GET/POST | \`/api/flows\` | list / create |
| PUT/DELETE | \`/api/flows/:id\` | update / delete |
| POST | \`/api/flows/:id/run\` | run now, returns the finished run with steps |
| GET | \`/api/runs?limit=\` | run history |
| GET | \`/api/runs/:id\` | one run **with its step trace** |
| POST | \`/api/runs/:id/retry\` | replay the run's flow |
| GET | \`/api/artifacts?limit=&platform=\` | library |
| GET | \`/api/publish-plans\` | drafts awaiting review |
| POST | \`/api/publish-plans/:id\` | \`{ status: draft \\| approved \\| discarded }\` |
| GET | \`/api/scheduler\` | scheduler state + next run per timed flow |
| POST | \`/api/scheduler/start\` \\| \`/stop\` | control the scheduler |
| GET/POST | \`/api/login\` | list / start an interactive login |
| GET | \`/api/login/:id\` | poll login state (\`ok\` = captured) |
| GET | \`/api/login/:id/qr\` | QR PNG data URL for the panel |
| POST | \`/api/login/:id/cancel\` | cancel |
| GET | \`/api/bindings\` | recorded logins |
| POST | \`/api/purge\` | clear flows/runs/artifacts/plans (\`{ keepBindings }\`) |

Errors: \`{ "error": "..." }\` with a 4xx/5xx status. A failed run still returns 200 with
\`state: "failed"\` and the failing step's message — read the trace, not just the status.

---

## 6. Agent tools

**Read** \`relaydeck_ping\`, \`relaydeck_config_get\`, \`relaydeck_status\`,
\`relaydeck_capabilities\`, \`relaydeck_flow_list\`, \`relaydeck_run_list\`,
\`relaydeck_run_get\`, \`relaydeck_artifact_list\`, \`relaydeck_binding_list\`,
\`relaydeck_platform_list\`, \`relaydeck_login_list\`, \`relaydeck_scheduler_get\`,
\`relaydeck_plan_list\`

**Write** \`relaydeck_start\`, \`relaydeck_stop\`, \`relaydeck_flow_create\`,
\`relaydeck_flow_run\`, \`relaydeck_flow_delete\`, \`relaydeck_run_retry\`,
\`relaydeck_login_start\`, \`relaydeck_login_status\`, \`relaydeck_plan_review\`

Typical loop: \`relaydeck_capabilities\` → \`relaydeck_flow_create\` →
\`relaydeck_flow_run\` → read \`data.steps\` → adjust.

---

## 7. Platform access model

Platforms are reached by **driving a real browser over CDP** (Node's built-in
\`WebSocket\`; no Puppeteer/Playwright). The page performs its own request signing, so
RelayDeck reimplements no platform crypto. The browser profile lives on disk, so a
login survives restarts.

Consequences worth knowing:

* A \`<platform>.search\` that returns nothing usually means **not logged in** or rate
  limited; the thrown message says so.
* Response matchers and draft selectors live in \`server/platforms.mjs\` and may need
  tuning per platform. Everything else is shared.
* \`prepareDraft\` stops before submission **by design**.
