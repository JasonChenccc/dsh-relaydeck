# 学习笔记：把 CreatorHub 做成 DSH 插件

记录本项目在 DeepSeek Harness 0.2.1-rc.5 上实测到的插件契约。所有结论都标注了代码出处，
不是推测；凡未能验证的一律写"待验证"。

## 1. DSH 的扩展点与分半身机制

- **profile / bundle**：`dsh --profile <name>` 启动的是"bundle patch 层栈"。插件的
  `package.json` 用 `dsh.bundle.patch` 指向 `cordis.patch.yml`，该文件往配置树 `insert` 一行
  `{ id, name }`，`name` 是裸包名，解析到包入口（`main`）。
- **host 半身**：Node 进程里的 Cordis 插件，导出 `name / Config / inject / apply(ctx, config)`。
- **client 半身**：浏览器里的另一棵 Cordis 树。`package.json` 用 `dsh.client = { platform: "web" }`
  声明，入口由 `exports["./client"]` 发现；bundle 不是普通 ESM，而是自注册工厂：
  `window.__ModuleLoader__.load({ id, factory })`，factory 返回 `{ apply, inject }`。
- **两半身不共享 ctx 与服务**。client-runner 挂载 client 半身时不传 config：
  `@deepseek-ai/dsh-cordis-client-runner/lib/client.js:564`
  `const entryId = await this.env.loader.create({ name: moduleId });`
  → 这直接决定了"配置桥"必须走进程外通道（本项目的 HTTP 端点方案）。
- **工具必须显式声明 output**：`defineTool({ output: { schema, render } })`；
  `ctx.tools.register()` 会 `assertSupportedJsonSchema(output.schema)`
  （`dsh-tools/lib/index.js:2973` 附近）。

## 2. 审批网关契约

出处：`@deepseek-ai/dsh-user-approval/lib/index.js`。

- 服务名 `"approval"`，读法 `ctx.get("approval")`；缺失返回 `undefined`。
- `request({ agent, toolName, callId?, reason?, displayReason?: {en, zh}, signal? })`
  → `"allowed-once" | "rejected" | "cancelled" | "unavailable"`（闭集）；**只有
  `allowed-once` 是放行**。
- `req.agent` 必填；`request()` 要求 session 处于 open turn，否则抛错
  （`hasOpenTurn(session)` 检查 `turn/start` … `turn/end`）。
- 策略 `ask`(默认) / `never`：`never` 直接 `rejected`；没有应答者时 waterfall 默认返回
  `unavailable` —— 即 **fail-closed**。
- **没有独立的"二次确认"类型**。高危操作的做法是在同一流程里再调一次 `request()`，
  第二次的 `displayReason.zh` 以"再次确认"开头并复述动作/参数/不可逆后果。
- **所有 `request()` 调用都要包 try/catch**：异常、超时、缺 agent 一律视为拒绝。
- 官方调用样板：`dsh-sandbox/lib/index.js` 的 `approveEscalation()`。

## 3. 工具参数与返回值的实际行为

- 参数用 `ParameterSchemaSpec`（JSON-Schema 子集），**不是 Schemastery**；
  Schemastery 只用于插件的 `Config`。
- `default` 只写进 JSON Schema 作**注解**（`dsh-tools/lib/index.js:550`），
  **不会自动注入参数**；默认值必须在 `execute` 里用 `args.x ?? default` 自己兜。
- 返回值**会被运行时校验**：`validateJsonSchemaValue(tool.output.schema, value, ...)`
  （`dsh-tools/lib/index.js:3638`），不符抛 `ToolOutputError`。所以"失败时返回 null"的字段
  必须用 `oneOf: [{type:"integer"},{type:"null"}]` 之类显式允许 null。
- `{ type: "json" }` 编译为注解型空 schema `{}`，可同时承载 object/array。

## 4. 槽位注册的真实契约

- 必须**延迟注册**：`ctx.slots.inject(slotName, () => ctx.slots.register(def, Component))`，
  而不是直接 `ctx.slots.register(...)`。
  出处：`dsh-client-ui-schedule/lib/client.js:7473-7490`、
  `dsh-client-ui-plugin-manager/lib/client.js:4483`。
- `sidebar.panellist`：`kind:"list"`、`scope:"root"`；`id` 必填，`order`/`label` 可选
  （`label` 支持 `string | (() => string)`）。
- `main`：`kind:"keyed"`、`scope:"root"`；`key` 必填，**必须等于 panellist 的 `id`**
  （"Central panel selected by sidebar entry id"）。
- `exports.inject` 是**服务名**数组（如 `["slots","locale",...]`）；
  `package.json` 的 `dsh.client.inject` 是**模块**名数组。两者含义不同。

## 5. client 配置文件桥的缺失与最小可行补法

**缺失**：client 半身拿不到宿主 `Config`（见 §1 的 :564）。

**最小可行补法**（本项目采用）：host 半身注册一个回环只读 HTTP 路由，client 同源 fetch。

```js
// host：可选注入 webServer（headless 没有它，硬注入会让插件永远等待）
ctx.inject(["webServer"], (webCtx) => {
  webCtx.effect(() => webCtx.webServer.register({
    kind: "exact", path: "/dsh-samanager/config",
    handler: async (req, res) => { /* connection.requestRejection(req) 围栏 + GET + JSON */ }
  }), "dsh-SAmanager: config route");
});
```

- 路由形状与围栏样板：`dsh-host-open-in-app/lib/index.js:1263-1282`；
  可选注入样板：`dsh-client-modules/lib/index.js:570`。
- 围栏实现：`dsh-client-connection/lib/index.js:737-750`（Host/Origin 不信任 → 403；
  未认证 → 401；浏览器同源带签名 cookie 的请求通过）。
- 路由匹配规则：整表 exact → 最长 prefix → fallback（`dsh-host-webserver` README）。
- 解析顺序（client 侧）：**宿主桥 → `config.baseUrl` → `ctx.config.baseUrl` → 默认
  `http://127.0.0.1:8731`**；任何一环命中但非回环一律丢弃。

## 6. 测试策略

- **mock approval**：注入假 `ctx.get("approval")`，用队列脚本化返回 outcome，即可覆盖
  deny / grant / 二次拒绝三条路径，无需真实应答者。
- **mock HTTP + 计数器**：monkey-patch `globalThis.fetch`，记录 `{url, method, body}` 并转发，
  用"目标路径的调用次数为 0"证明**插件侧未发起 HTTP**。
- **静态请求构造**：对可能拉起浏览器或触发外网解析的路由（login / monitor_add），grant 路径
  不真发请求，而是注入 mock responder，断言 method + path + body 结构。
- **真实空库 4xx**：安全路由的 grant 路径打真实 CreatorHub，空库自然 400/404，证明请求真的发出。
- **边界措辞**：deny 测试只证明"Node 插件侧未发起 HTTP"，**不能**声明 CreatorHub 进程无外部动作；
  grant 测试只证明"插件发出了请求并收到 4xx"，**不暗示外部副作用为零**。
- **契约可执行化**：client bundle 用桩 `window.__ModuleLoader__` + 桩 `require("react")` 在 Node 里
  真实执行，断言 loader id、导出形状、槽位贡献与解析顺序 —— 比静态扫描强得多。
- **host 路由可在进程内测**：捕获 `webServer.register` 的 route，直接构造假 `req/res` 调 handler，
  覆盖 200 / 403 / 405，不需要真开端口。
- **GUI 渲染仍待桌面端手动确认**：本环境是 CLI/headless，渲染层无法覆盖。
