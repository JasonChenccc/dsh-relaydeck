// GENERATED FILE — edit lib/panel/** or lib/host/** then run: node scripts/build-client.mjs
// DSH serves one bundle per package (exports["./client"]); the modules are inlined below.
window.__ModuleLoader__.load({
  id: "dsh-SAmanager",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    var React = require("react");
    var PANEL_CSS = ".sa-manager-host { height: 100%; min-height: 320px; display: flex; }\n.sa-panel {\n  display: flex; flex-direction: row; align-items: stretch; width: 100%; height: 100%;\n  font: var(--dsh-content-font-size, 13px)/1.6 var(--dsh-font-family-text, system-ui, sans-serif);\n  color: var(--dsw-alias-label-primary, #1f2328);\n  background: var(--dsw-alias-bg-base, transparent);\n}\n.sa-nav {\n  width: 152px; flex: 0 0 auto; overflow: auto; padding: 10px 8px;\n  border-right: 1px solid var(--dsw-alias-border-l1, rgba(0,0,0,.08));\n  display: flex; flex-direction: column; gap: 2px;\n}\n.sa-nav-item {\n  appearance: none; border: 0; background: transparent; cursor: pointer; text-align: left;\n  padding: 7px 10px; border-radius: 6px; font: inherit;\n  color: var(--dsw-alias-label-secondary, #4b5563);\n}\n.sa-nav-item:hover { background: var(--dsw-alias-interactive-bg-hover, rgba(0,0,0,.04)); }\n.sa-nav-item[aria-current=\"true\"] {\n  background: var(--dsw-alias-interactive-bg-hover, rgba(0,0,0,.06));\n  color: var(--dsw-alias-label-primary, #111); font-weight: 600;\n}\n.sa-nav-item:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary, #4f46e5); outline-offset: 1px; }\n.sa-main { flex: 1; min-width: 0; overflow: auto; padding: 14px; }\n.sa-view { display: flex; flex-direction: column; gap: 12px; }\n.sa-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }\n.sa-dot { width: 8px; height: 8px; border-radius: 50%; flex: 0 0 auto; background: var(--dsw-alias-state-idle-primary, #9ca3af); }\n.sa-dot[data-state=\"online\"] { background: var(--dsw-alias-state-success-primary, #22c55e); }\n.sa-dot[data-state=\"offline\"] { background: var(--dsw-alias-state-error-primary, #ef4444); }\n.sa-muted { color: var(--dsw-alias-label-tertiary, #6b7280); }\n.sa-caption { color: var(--dsw-alias-label-caption, #9ca3af); font-size: 12px; }\n.sa-warn { color: var(--dsw-alias-state-warn-primary, #b45309); font-size: 12px; }\n.sa-addr { word-break: break-all; color: var(--dsw-alias-label-secondary, #4b5563); }\n.sa-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap: 8px; }\n.sa-card {\n  padding: 10px; border-radius: 8px; border: 1px solid var(--dsw-alias-settings-card-stroke, rgba(0,0,0,.08));\n  background: var(--dsw-alias-settings-card-fill, rgba(0,0,0,.02));\n}\n.sa-card b { display: block; font-size: 18px; font-weight: 600; }\n.sa-btn {\n  appearance: none; cursor: pointer; font: inherit; padding: 6px 12px; border-radius: 6px;\n  border: 1px solid var(--dsw-alias-border-l2, rgba(0,0,0,.12));\n  background: var(--dsw-alias-button-elevated-fill, transparent);\n  color: var(--dsw-alias-label-primary, #111);\n}\n.sa-btn:hover { background: var(--dsw-alias-interactive-bg-hover, rgba(0,0,0,.05)); }\n.sa-btn:disabled { cursor: not-allowed; opacity: .5; }\n.sa-btn[data-variant=\"primary\"] {\n  border-color: transparent; background: var(--dsw-alias-button-primary-fill, #4f46e5); color: #fff;\n}\n.sa-table { width: 100%; border-collapse: collapse; }\n.sa-table th, .sa-table td { text-align: left; padding: 6px 8px; border-bottom: 1px solid var(--dsw-alias-border-l1, rgba(0,0,0,.06)); vertical-align: top; }\n.sa-table th { color: var(--dsw-alias-label-tertiary, #6b7280); font-weight: 500; white-space: nowrap; }\n.sa-empty { padding: 24px 8px; text-align: center; color: var(--dsw-alias-label-tertiary, #6b7280); }\n.sa-trend { display: flex; flex-wrap: wrap; gap: 6px; }\n.sa-trend span { padding: 2px 6px; border-radius: 4px; background: var(--dsw-alias-bg-layer-2, rgba(0,0,0,.03)); color: var(--dsw-alias-label-secondary, #4b5563); font-size: 12px; }\n.sa-section-title { font-weight: 600; margin-top: 4px; }\n";

// ---- lib/panel/dom.js ----
// SA Manager panel — tiny DOM helpers (no framework, no external deps).
function h(tag, attrs, children) {
  var el = document.createElement(tag);
  if (attrs) {
    for (var key in attrs) {
      if (!Object.prototype.hasOwnProperty.call(attrs, key)) continue;
      var value = attrs[key];
      if (value === undefined || value === null || value === false) continue;
      if (key === "className") el.className = value;
      else if (key === "textContent") el.textContent = value;
      else if (key === "dataset") { for (var dk in value) el.dataset[dk] = value[dk]; }
      else if (key.slice(0, 2) === "on" && typeof value === "function") el.addEventListener(key.slice(2).toLowerCase(), value);
      else if (key === "style" && typeof value === "object") { for (var sk in value) el.style[sk] = value[sk]; }
      else el.setAttribute(key, value === true ? "" : String(value));
    }
  }
  append(el, children);
  return el;
}

function append(el, children) {
  if (children === undefined || children === null) return el;
  if (Array.isArray(children)) { for (var i = 0; i < children.length; i++) append(el, children[i]); return el; }
  if (children !== null && typeof children === "object" && typeof children.nodeType === "number") { el.appendChild(children); return el; }
  el.appendChild(document.createTextNode(String(children)));
  return el;
}

function clear(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
  return el;
}

function fmtTime(value) {
  if (!value) return "-";
  var d = new Date(value);
  if (isNaN(d.getTime())) return String(value);
  return d.toLocaleString();
}


// ---- lib/panel/events.js ----
// SA Manager panel — minimal event bus shared by the host bridge and the views.
// Every listener registered through on() is released by dispose(); createPanel
// calls dispose() on unmount so no subscription survives a closed panel.
function createEventBus() {
  var listeners = {};
  return {
    on: function (name, handler) {
      if (typeof handler !== "function") return function () {};
      (listeners[name] || (listeners[name] = [])).push(handler);
      return function off() {
        var list = listeners[name];
        if (!list) return;
        var index = list.indexOf(handler);
        if (index >= 0) list.splice(index, 1);
      };
    },
    emit: function (name, payload) {
      var list = listeners[name];
      if (!list) return;
      var snapshot = list.slice();
      for (var i = 0; i < snapshot.length; i++) { try { snapshot[i](payload); } catch (e) { /* listener errors stay local */ } }
    },
    size: function (name) { return listeners[name] ? listeners[name].length : 0; },
    dispose: function () { listeners = {}; }
  };
}


// ---- lib/panel/bridge.js ----
// SA Manager panel — CreatorHub API client.
// Every read goes through host.proxyFetch, which calls the same-origin Host route
// /dsh-samanager/proxy. There is deliberately NO direct-fetch fallback: a direct
// browser request to 127.0.0.1:8731 is cross-origin and would be masked by CORS
// as "Failed to fetch", hiding the real wiring problem.
var PLATFORMS = ["douyin", "xhs", "kuaishou", "shipinhao", "tiktok"];
var PLATFORM_OPTIONS = [
  { value: "", label: "全部平台" },
  { value: "douyin", label: "抖音" },
  { value: "xhs", label: "小红书" },
  { value: "kuaishou", label: "快手" },
  { value: "shipinhao", label: "视频号" },
  { value: "tiktok", label: "TikTok" }
];

var PROXY_UNAVAILABLE = "宿主代理不可用（host.proxyFetch 未注入）";

function createApiBridge(baseUrl, proxy) {
  function request(path, timeoutMs) {
    if (typeof proxy !== "function") {
      return Promise.resolve({ ok: false, status: 0, data: null, raw: "", latencyMs: 0, error: PROXY_UNAVAILABLE });
    }
    var started = Date.now();
    var run;
    try {
      run = proxy(path, { timeoutMs: timeoutMs });
    } catch (err) {
      return Promise.resolve({ ok: false, status: 0, data: null, raw: "", latencyMs: Date.now() - started, error: String(err && err.message ? err.message : err) });
    }
    return Promise.resolve(run).then(function (res) {
      if (!res) return { ok: false, status: 0, data: null, raw: "", latencyMs: Date.now() - started, error: "empty proxy response" };
      return {
        ok: res.ok === true,
        status: res.status || 0,
        data: res.data === undefined ? null : res.data,
        raw: res.data === undefined || res.data === null ? "" : JSON.stringify(res.data),
        error: res.error,
        latencyMs: Date.now() - started
      };
    }).catch(function (err) {
      return { ok: false, status: 0, data: null, raw: "", latencyMs: Date.now() - started, error: String(err && err.message ? err.message : err) };
    });
  }

  function query(platform) {
    return platform ? ("?platform=" + encodeURIComponent(platform)) : "";
  }

  return {
    baseUrl: baseUrl,
    request: request,
    getHealth: function () {
      return request("/health", 3000).then(function (res) {
        return {
          online: res.ok,
          status: res.status,
          latencyMs: res.latencyMs,
          raw: res.raw,
          error: res.ok ? undefined : (res.error || ("HTTP " + res.status))
        };
      });
    },
    getOverview: function (platform) { return request("/api/overview/summary?platform=" + encodeURIComponent(platform || "douyin")); },
    getSeries: function (platform, days) { return request("/api/stats/series?days=" + encodeURIComponent(String(days || 7)) + (platform ? "&platform=" + encodeURIComponent(platform) : "")); },
    getAccounts: function (platform) { return request("/api/accounts" + query(platform)); },
    getRiskSummary: function () { return request("/api/risk-control/summary"); },
    getMonitors: function () { return request("/api/monitors"); },
    getAccountWorks: function (accountId) { return request("/api/account-works?account_id=" + encodeURIComponent(String(accountId))); },
    getCollections: function () { return request("/api/collections"); },
    getCommentWatches: function () { return request("/api/comment-watches"); },
    getComments: function () { return request("/api/comments"); },
    getDanmakuWatches: function () { return request("/api/danmaku-watches"); },
    getDanmaku: function () { return request("/api/danmaku"); },
    getHubSummary: function (accountId) { return request("/api/hub/summary?account_id=" + encodeURIComponent(String(accountId))); },
    getAccountStats: function (accountId) { return request("/api/account-stats/" + encodeURIComponent(String(accountId))); },
    getTasks: function (options) {
      var opts = options || {};
      var q = "state=" + encodeURIComponent(opts.state || "active") +
        "&page=" + encodeURIComponent(String(opts.page || 1)) +
        "&page_size=" + encodeURIComponent(String(opts.pageSize || 20));
      if (opts.platform) q += "&platform=" + encodeURIComponent(opts.platform);
      if (opts.q) q += "&q=" + encodeURIComponent(opts.q);
      return request("/api/task-queue?" + q);
    },
    getPublish: function () { return request("/api/publish"); },
    getPublished: function () { return request("/api/publish/published"); },
    getCommentRules: function () { return request("/api/comment-rules"); },
    getCommentTasks: function () { return request("/api/comment-tasks"); },
    getShareHistory: function () { return request("/api/share-download/history"); },
    getNotifications: function () { return request("/api/notifications"); }
  };
}


// ---- lib/panel/views/_list.js ----
// Shared read-only list view: filters + table + empty state + 10 s polling that
// stops when the view is hidden and resumes when it is activated again.

function normalize(res) {
  var data = res && res.data;
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.items)) return data.items;
  return [];
}

function renderList(ctx, config) {
  var root = h("div", { className: "sa-view" });
  var state = {};
  var timer = null;
  var disposed = false;

  var controls = h("div", { className: "sa-row" });
  var summary = h("span", { className: "sa-caption" }, "");
  var tbody = h("tbody", null);
  var thead = h("thead", null, [h("tr", null, config.columns.map(function (c) { return h("th", null, c.label); }))]);
  var table = h("table", { className: "sa-table" }, [thead, tbody]);

  (config.filters || []).forEach(function (filter) {
    if (filter.value !== undefined) state[filter.id] = filter.value;
    var select = h("select", {
      className: "sa-btn",
      onChange: function (e) { state[filter.id] = e.target.value; refresh(); }
    });
    (filter.options || []).forEach(function (option) {
      var opt = h("option", { value: option.value }, option.label);
      if (state[filter.id] === option.value) opt.setAttribute("selected", "selected");
      select.appendChild(opt);
    });
    controls.appendChild(select);
  });

  var refreshBtn = h("button", { type: "button", className: "sa-btn", onClick: refresh }, "刷新");
  controls.appendChild(refreshBtn);
  controls.appendChild(summary);
  root.appendChild(controls);
  if (config.description) root.appendChild(h("div", { className: "sa-caption" }, config.description));
  root.appendChild(table);

  function showEmpty(text) {
    clear(tbody);
    tbody.appendChild(h("tr", null, [
      h("td", { colSpan: config.columns.length }, [h("div", { className: "sa-empty" }, text)])
    ]));
  }

  function refresh() {
    if (disposed) return;
    refreshBtn.disabled = true;
    Promise.resolve(config.load(state)).then(function (res) {
      if (disposed) return;
      refreshBtn.disabled = false;
      if (!res || res.ok !== true) {
        summary.textContent = "";
        showEmpty((res && res.error) ? ("加载失败：" + res.error) : "加载失败");
        return;
      }
      var items = normalize(res);
      summary.textContent = "共 " + items.length + " 条";
      if (items.length === 0) { showEmpty(config.empty || "暂无数据"); return; }
      clear(tbody);
      items.forEach(function (row) {
        var cells = config.columns.map(function (column) {
          var value = column.render ? column.render(row) : row[column.key];
          var text = value === undefined || value === null || value === "" ? "-" : String(value);
          return h("td", null, text);
        });
        tbody.appendChild(h("tr", null, cells));
      });
    }).catch(function (err) {
      if (disposed) return;
      refreshBtn.disabled = false;
      summary.textContent = "";
      showEmpty("加载失败：" + String(err && err.message ? err.message : err));
    });
  }

  function activate() {
    if (disposed || timer !== null) return;
    refresh();
    timer = setInterval(refresh, 10000);
  }
  function deactivate() {
    if (timer === null) return;
    clearInterval(timer);
    timer = null;
  }

  return {
    element: root,
    activate: activate,
    deactivate: deactivate,
    dispose: function () { disposed = true; deactivate(); }
  };
}


// ---- lib/panel/views/overview.js ----
// 工作概览：当前会话 + 健康灯 + 配置来源 + 总览卡片 + 近 7 天数字趋势 + 快捷操作。

function renderOverview(ctx) {
  var api = ctx.api;
  var events = ctx.events;
  var navigate = ctx.navigate;
  var resolved = ctx.resolved;
  var root = h("div", { className: "sa-view" });
  var disposers = [];
  var timer = null;
  var disposed = false;
  var platform = "douyin";

  // ---- 当前会话 ----
  var sessionDot = h("span", { className: "sa-dot", "data-state": "idle" });
  var sessionMeta = h("span", { className: "sa-caption" }, "");
  root.appendChild(h("div", { className: "sa-card" }, [
    h("div", { className: "sa-row" }, [sessionDot, h("span", { style: { fontWeight: 600 } }, "当前会话")]),
    h("div", { className: "sa-row" }, [sessionMeta])
  ]));

  function applySession(session) {
    if (!session || session.available === false) {
      sessionDot.dataset.state = "idle";
      sessionMeta.textContent = "宿主未提供会话上下文（功能不受影响）";
      return;
    }
    sessionMeta.textContent = [
      session.title || "(未命名会话)",
      typeof session.messageCount === "number" ? session.messageCount + " 条消息" : null,
      typeof session.sessionCount === "number" ? "共 " + session.sessionCount + " 个会话" : null,
      session.running ? "运行中" : "空闲"
    ].filter(Boolean).join(" · ");
    sessionDot.dataset.state = session.running ? "online" : "idle";
  }
  applySession(ctx.sessionContext);
  if (events && typeof events.on === "function") {
    disposers.push(events.on("session-context", applySession));
    disposers.push(events.on("agent-status", function (payload) {
      if (!payload) return;
      applySession({ available: true, running: payload.running === true });
    }));
  }

  // ---- 健康灯 / 地址 / 配置来源 ----
  var dot = h("span", { className: "sa-dot", "data-state": "idle" });
  var stateText = h("span", null, "检测中");
  var latency = h("span", { className: "sa-muted" }, "");
  var refreshBtn = h("button", { type: "button", className: "sa-btn", onClick: refresh }, "刷新");
  var addr = h("div", { className: "sa-addr" }, resolved.baseUrl);
  var sourceText = resolved.source === "host-bridge" ? "配置来源：宿主配置桥"
    : resolved.source === "host-config" ? "配置来源：宿主注入的 config"
    : "配置来源：默认地址";
  var source = h("div", { className: "sa-caption" }, sourceText);
  root.appendChild(h("div", { className: "sa-row" }, [dot, stateText, latency, refreshBtn]));
  root.appendChild(h("div", { className: "sa-row" }, [addr]));
  root.appendChild(h("div", { className: "sa-row" }, [source]));
  if (resolved.source === "default") root.appendChild(h("div", { className: "sa-warn" }, "默认地址，未确认与 CreatorHub 实际端口一致。"));

  // ---- 平台白名单 ----
  var platformSelect = h("select", { className: "sa-btn", onChange: function (e) { platform = e.target.value; refresh(); } });
  PLATFORM_OPTIONS.forEach(function (opt) {
    if (!opt.value) return;
    var el = h("option", { value: opt.value }, opt.label);
    if (opt.value === platform) el.setAttribute("selected", "selected");
    platformSelect.appendChild(el);
  });
  root.appendChild(h("div", { className: "sa-row" }, [h("span", { className: "sa-caption" }, "平台"), platformSelect]));

  // ---- 总览卡片 ----
  var cards = h("div", { className: "sa-cards" });
  function card(label) {
    var value = h("b", null, "-");
    cards.appendChild(h("div", { className: "sa-card" }, [value, h("span", { className: "sa-caption" }, label)]));
    return value;
  }
  var cAccounts = card("账号");
  var cMonitors = card("启用监控");
  var cDownloaded = card("已下载");
  var cComments = card("评论");
  root.appendChild(cards);

  // ---- 近 7 天（纯数字）----
  var trend = h("div", { className: "sa-trend" });
  root.appendChild(h("div", { className: "sa-section-title" }, "近 7 天采集"));
  root.appendChild(trend);

  // ---- 快捷操作 ----
  var actions = h("div", { className: "sa-row" });
  [["tasks", "任务队列"], ["publish", "发布"], ["collections", "关键词采集"], ["downloads", "链接下载"]].forEach(function (pair) {
    actions.appendChild(h("button", { type: "button", className: "sa-btn", onClick: function () { navigate(pair[0]); } }, pair[1]));
  });
  root.appendChild(h("div", { className: "sa-section-title" }, "快捷操作"));
  root.appendChild(actions);

  function refresh() {
    if (disposed) return;
    refreshBtn.disabled = true;
    api.getHealth().then(function (health) {
      if (disposed) return;
      dot.dataset.state = health.online ? "online" : "offline";
      stateText.textContent = health.online ? "服务在线" : "服务离线";
      latency.textContent = health.online ? (health.latencyMs + " ms") : (health.error || "");
      refreshBtn.disabled = false;
    });
    api.getOverview(platform).then(function (res) {
      if (disposed) return;
      var data = res && res.ok && res.data ? res.data : {};
      cAccounts.textContent = String(data.accounts === undefined ? "-" : data.accounts);
      cMonitors.textContent = String(data.monitors === undefined ? "-" : data.monitors);
      cDownloaded.textContent = String(data.downloaded === undefined ? "-" : data.downloaded);
      cComments.textContent = String(data.comments === undefined ? "-" : data.comments);
    });
    api.getSeries(platform, 7).then(function (res) {
      if (disposed) return;
      while (trend.firstChild) trend.removeChild(trend.firstChild);
      var data = res && res.ok && res.data ? res.data : null;
      if (!data || !Array.isArray(data.days)) { trend.appendChild(h("span", null, "暂无数据")); return; }
      var contents = Array.isArray(data.contents) ? data.contents : [];
      var comments = Array.isArray(data.comments) ? data.comments : [];
      for (var i = 0; i < data.days.length; i++) {
        trend.appendChild(h("span", null, String(data.days[i]).slice(5) + " 作品 " + (contents[i] === undefined ? 0 : contents[i]) + " / 评论 " + (comments[i] === undefined ? 0 : comments[i])));
      }
    });
  }

  function activate() {
    if (disposed || timer !== null) return;
    refresh();
    timer = setInterval(refresh, 10000);
  }
  function deactivate() {
    if (timer === null) return;
    clearInterval(timer);
    timer = null;
  }

  return {
    element: root,
    activate: activate,
    deactivate: deactivate,
    dispose: function () {
      disposed = true;
      deactivate();
      while (disposers.length > 0) { try { disposers.pop()(); } catch (e) { /* already gone */ } }
    }
  };
}


// ---- lib/panel/views/accounts.js ----
// 平台账号：只读列表 + 平台白名单筛选。

function renderAccounts(ctx) {
  var api = ctx.api;
  return renderList(ctx, {
    description: "CreatorHub 已添加的平台账号。",
    empty: "暂无账号",
    filters: [{ id: "platform", value: "", options: PLATFORM_OPTIONS }],
    columns: [
      { label: "昵称", render: function (r) { return r.nickname || r.douyin_id || r.uid || "-"; } },
      { label: "平台", key: "platform" },
      { label: "粉丝", render: function (r) { return r.follower_count === undefined ? "-" : r.follower_count; } },
      { label: "状态", key: "status" },
      { label: "代理", render: function (r) { return r.proxy ? "已配置" : "直连"; } },
      { label: "更新时间", render: function (r) { return fmtTime(r.updated_at || r.created_at); } }
    ],
    load: function (s) { return api.getAccounts(s.platform); }
  });
}


// ---- lib/panel/views/monitors.js ----
// 作品监控：只读列表。

function renderMonitors(ctx) {
  var api = ctx.api;
  return renderList(ctx, {
    description: "监控中的博主 / 关键词目标。",
    empty: "暂无监控目标",
    columns: [
      { label: "昵称", render: function (r) { return r.nickname || r.alias || "-"; } },
      { label: "平台", key: "platform" },
      { label: "类型", key: "target_kind" },
      { label: "启用", render: function (r) { return r.enabled ? "是" : "否"; } },
      { label: "间隔(秒)", key: "interval_seconds" },
      { label: "最近扫描", render: function (r) { return fmtTime(r.last_scan_at); } },
      { label: "错误", render: function (r) { return r.last_error || "-"; } }
    ],
    load: function () { return api.getMonitors(); }
  });
}


// ---- lib/panel/views/collections.js ----
// 关键词采集：只读列表。

function renderCollections(ctx) {
  var api = ctx.api;
  return renderList(ctx, {
    description: "关键词采集任务。",
    empty: "暂无采集任务",
    columns: [
      { label: "平台", key: "platform" },
      { label: "来源", key: "source_type" },
      { label: "关键词", render: function (r) { return r.keywords || "-"; } },
      { label: "状态", key: "status" },
      { label: "当前关键词", key: "current_keyword" },
      { label: "创建时间", render: function (r) { return fmtTime(r.created_at); } }
    ],
    load: function () { return api.getCollections(); }
  });
}


// ---- lib/panel/views/comment-watches.js ----
// 评论监控：只读列表。

function renderCommentWatches(ctx) {
  var api = ctx.api;
  return renderList(ctx, {
    description: "评论监控目标。",
    empty: "暂无评论监控",
    columns: [
      { label: "标题", render: function (r) { return r.title || r.alias || "-"; } },
      { label: "平台", key: "platform" },
      { label: "启用", render: function (r) { return r.enabled ? "是" : "否"; } },
      { label: "评论数", render: function (r) { return r.comment_count === undefined ? "-" : r.comment_count; } },
      { label: "最近扫描", render: function (r) { return fmtTime(r.last_scan_at); } },
      { label: "错误", render: function (r) { return r.last_error || "-"; } }
    ],
    load: function () { return api.getCommentWatches(); }
  });
}


// ---- lib/panel/views/danmaku-watches.js ----
// 弹幕监控：只读列表。

function renderDanmakuWatches(ctx) {
  var api = ctx.api;
  return renderList(ctx, {
    description: "弹幕监控目标。",
    empty: "暂无弹幕监控",
    columns: [
      { label: "标题", render: function (r) { return r.title || r.alias || "-"; } },
      { label: "平台", key: "platform" },
      { label: "模式", key: "mode" },
      { label: "启用", render: function (r) { return r.enabled ? "是" : "否"; } },
      { label: "最近扫描", render: function (r) { return fmtTime(r.last_scan_at); } },
      { label: "错误", render: function (r) { return r.last_error || "-"; } }
    ],
    load: function () { return api.getDanmakuWatches(); }
  });
}


// ---- lib/panel/views/account-hub.js ----
// 本账号管理：先选账号，再按 account_id 拉 hub summary。
// /api/hub/summary 不接受缺省 account_id（422），所以这里必须等用户选定。

function renderAccountHub(ctx) {
  var api = ctx.api;
  var root = h("div", { className: "sa-view" });
  var timer = null;
  var disposed = false;
  var accountId = null;
  var loaded = false;

  var select = h("select", { className: "sa-btn", onChange: function (e) { accountId = e.target.value ? Number(e.target.value) : null; refresh(); } });
  var status = h("span", { className: "sa-caption" }, "加载账号…");
  var cards = h("div", { className: "sa-cards" });
  function card(label) {
    var value = h("b", null, "-");
    cards.appendChild(h("div", { className: "sa-card" }, [value, h("span", { className: "sa-caption" }, label)]));
    return value;
  }
  var cWorks = card("作品");
  var cFollowing = card("关注");
  var cFans = card("粉丝");
  var cDm = card("私信会话");

  root.appendChild(h("div", { className: "sa-row" }, [h("span", { className: "sa-caption" }, "账号"), select, status]));
  root.appendChild(cards);

  function showEmpty(text) {
    while (cards.firstChild) cards.removeChild(cards.firstChild);
    cards.appendChild(h("div", { className: "sa-empty" }, text));
  }

  function refresh() {
    if (disposed) return;
    api.getAccounts().then(function (res) {
      if (disposed) return;
      var list = res && res.ok && Array.isArray(res.data) ? res.data : [];
      if (list.length === 0) { status.textContent = ""; showEmpty("暂无账号"); return; }
      if (!loaded) {
        loaded = true;
        select.textContent = "";
        list.forEach(function (a) {
          var opt = h("option", { value: String(a.id) }, (a.nickname || ("账号 " + a.id)) + " · " + (a.platform || ""));
          select.appendChild(opt);
        });
        accountId = list[0].id;
        select.value = String(accountId);
      }
      if (accountId === null) return;
      api.getHubSummary(accountId).then(function (hub) {
        if (disposed) return;
        if (!hub || !hub.ok || !hub.data) { status.textContent = "汇总加载失败"; return; }
        status.textContent = "";
        cWorks.textContent = String(hub.data.works === undefined ? "-" : hub.data.works);
        cFollowing.textContent = String(hub.data.following === undefined ? "-" : hub.data.following);
        cFans.textContent = String(hub.data.fans === undefined ? "-" : hub.data.fans);
        cDm.textContent = String(hub.data.dm === undefined ? "-" : hub.data.dm);
      });
    });
  }

  function activate() {
    if (disposed || timer !== null) return;
    refresh();
    timer = setInterval(refresh, 10000);
  }
  function deactivate() {
    if (timer === null) return;
    clearInterval(timer);
    timer = null;
  }

  return { element: root, activate: activate, deactivate: deactivate, dispose: function () { disposed = true; deactivate(); } };
}


// ---- lib/panel/views/tasks.js ----
// 任务队列：只读列表 + 状态筛选。

var STATES = ["active", "all", "pending", "running", "blocked", "failed", "completed"];

function renderTasks(ctx) {
  var api = ctx.api;
  return renderList(ctx, {
    description: "统一任务队列（采集 / 发布 / 评论 / 操作 / 下载）。",
    empty: "当前筛选下没有任务",
    filters: [{
      id: "state",
      value: "active",
      options: STATES.map(function (s) { return { value: s, label: s }; })
    }],
    columns: [
      { label: "队列", render: function (r) { return r.queue_label || r.queue || "-"; } },
      { label: "标题", render: function (r) { return r.title || r.detail || "-"; } },
      { label: "状态", render: function (r) { return r.state || r.status || "-"; } },
      { label: "时间", render: function (r) { return fmtTime(r.scheduled_at || r.created_at); } }
    ],
    load: function (s) { return api.getTasks({ state: s.state, page: 1, pageSize: 20 }); }
  });
}


// ---- lib/panel/views/publish.js ----
// 发布：只读列表。

function renderPublish(ctx) {
  var api = ctx.api;
  return renderList(ctx, {
    description: "发布任务与已发布记录。",
    empty: "暂无发布任务",
    columns: [
      { label: "标题", render: function (r) { return r.title || "-"; } },
      { label: "平台", key: "platform" },
      { label: "类型", key: "media_type" },
      { label: "状态", key: "status" },
      { label: "计划时间", render: function (r) { return fmtTime(r.scheduled_at); } },
      { label: "结果", render: function (r) { return r.error || r.result_url || "-"; } }
    ],
    load: function () { return api.getPublish(); }
  });
}


// ---- lib/panel/views/auto-comment.js ----
// 自动评论：规则 + 评论任务两张只读表，共用一个 10 s 轮询。

function renderAutoComment(ctx) {
  var api = ctx.api;
  var root = h("div", { className: "sa-view" });
  var timer = null;
  var disposed = false;

  var rulesBody = h("tbody", null);
  var tasksBody = h("tbody", null);

  function table(headers, body) {
    return h("table", { className: "sa-table" }, [
      h("thead", null, [h("tr", null, headers.map(function (label) { return h("th", null, label); }))]),
      body
    ]);
  }

  function fill(body, res, width, emptyText, cells) {
    clear(body);
    if (!res || res.ok !== true) {
      body.appendChild(h("tr", null, [h("td", { colSpan: width }, [h("div", { className: "sa-empty" }, "加载失败：" + (res && res.error ? res.error : ""))])]));
      return;
    }
    var items = Array.isArray(res.data) ? res.data : (res.data && Array.isArray(res.data.items) ? res.data.items : []);
    if (items.length === 0) {
      body.appendChild(h("tr", null, [h("td", { colSpan: width }, [h("div", { className: "sa-empty" }, emptyText)])]));
      return;
    }
    items.forEach(function (row) {
      body.appendChild(h("tr", null, cells(row).map(function (value) {
        return h("td", null, value === undefined || value === null || value === "" ? "-" : String(value));
      })));
    });
  }

  root.appendChild(h("div", { className: "sa-section-title" }, "自动评论规则"));
  root.appendChild(table(["名称", "模式", "启用", "每日上限"], rulesBody));
  root.appendChild(h("div", { className: "sa-section-title" }, "评论任务"));
  root.appendChild(table(["目标", "内容", "状态", "错误", "时间"], tasksBody));

  function refresh() {
    if (disposed) return;
    api.getCommentRules().then(function (res) {
      if (disposed) return;
      fill(rulesBody, res, 4, "暂无自动评论规则", function (r) {
        return [r.name || "-", r.mode || "-", r.enabled ? "是" : "否", r.daily_cap];
      });
    });
    api.getCommentTasks().then(function (res) {
      if (disposed) return;
      fill(tasksBody, res, 5, "暂无评论任务", function (r) {
        return [r.target_nick || r.target_comment_id || "-", r.content || "-", r.status || "-", r.error || "-", fmtTime(r.created_at)];
      });
    });
  }

  function activate() {
    if (disposed || timer !== null) return;
    refresh();
    timer = setInterval(refresh, 10000);
  }
  function deactivate() {
    if (timer === null) return;
    clearInterval(timer);
    timer = null;
  }

  return { element: root, activate: activate, deactivate: deactivate, dispose: function () { disposed = true; deactivate(); } };
}


// ---- lib/panel/views/downloads.js ----
// 链接下载：只读历史。

function renderDownloads(ctx) {
  var api = ctx.api;
  return renderList(ctx, {
    description: "分享链接解析与下载历史。",
    empty: "暂无下载记录",
    columns: [
      { label: "标题", render: function (r) { return r.title || "-"; } },
      { label: "平台", key: "platform" },
      { label: "状态", key: "status" },
      { label: "媒体数", key: "media_count" },
      { label: "作者", render: function (r) { return r.author || "-"; } },
      { label: "时间", render: function (r) { return fmtTime(r.created_at); } }
    ],
    load: function () { return api.getShareHistory(); }
  });
}


// ---- lib/panel/views/notifications.js ----
// 通知：只读列表。

function renderNotifications(ctx) {
  var api = ctx.api;
  return renderList(ctx, {
    description: "通知渠道配置。",
    empty: "暂无通知渠道",
    columns: [
      { label: "名称", render: function (r) { return r.name || "-"; } },
      { label: "类型", key: "type" },
      { label: "启用", render: function (r) { return r.enabled ? "是" : "否"; } },
      { label: "创建时间", render: function (r) { return fmtTime(r.created_at); } }
    ],
    load: function () { return api.getNotifications(); }
  });
}


// ---- lib/panel/index.js ----
// SA Manager panel — native secondary navigation over the CreatorHub menu.
// One DSH sidebar entry (registered in lib/host/client.js); the twelve views live
// inside the panel. Polling is owned by each view: activate() on show,
// deactivate() on hide or switch, dispose() on unmount.

var VIEWS = [
  { id: "overview", label: "工作概览", render: renderOverview },
  { id: "accounts", label: "平台账号", render: renderAccounts },
  { id: "monitors", label: "作品监控", render: renderMonitors },
  { id: "collections", label: "关键词采集", render: renderCollections },
  { id: "comment-watches", label: "评论监控", render: renderCommentWatches },
  { id: "danmaku-watches", label: "弹幕监控", render: renderDanmakuWatches },
  { id: "account-hub", label: "本账号管理", render: renderAccountHub },
  { id: "tasks", label: "任务队列", render: renderTasks },
  { id: "publish", label: "发布", render: renderPublish },
  { id: "auto-comment", label: "自动评论", render: renderAutoComment },
  { id: "downloads", label: "链接下载", render: renderDownloads },
  { id: "notifications", label: "通知", render: renderNotifications }
];

function createPanel(host, options) {
  var opts = options || {};
  var injectCss = opts.injectCss ? opts.injectCss : function () {};
  injectCss();

  var events = createEventBus();
  var unsubscribeHost = typeof host.subscribe === "function"
    ? host.subscribe(function (event) { events.emit(event.name, event.payload); })
    : function () {};

  var nav = h("nav", { className: "sa-nav" });
  var main = h("div", { className: "sa-main" });
  var root = h("div", { className: "sa-panel" }, [nav, main]);

  var resolved = null;
  var api = null;
  var sessionContext = opts.sessionContext || null;
  var current = null;
  var activeId = "overview";
  var visible = true;
  var disposed = false;
  var buttons = {};
  var observer = null;

  if (typeof IntersectionObserver !== "undefined") {
    observer = new IntersectionObserver(function (entries) {
      var entry = entries[entries.length - 1];
      var next = !!(entry && entry.isIntersecting);
      if (next === visible) return;
      visible = next;
      if (!current) return;
      if (visible) current.activate();
      else current.deactivate();
    }, { threshold: 0 });
    observer.observe(root);
  }

  function mountView(id) {
    if (disposed) return;
    if (current) { current.deactivate(); current.dispose(); current = null; }
    clear(main);
    for (var key in buttons) buttons[key].setAttribute("aria-current", key === id ? "true" : "false");
    activeId = id;
    if (!resolved) {
      main.appendChild(h("div", { className: "sa-empty" }, "正在读取配置…"));
      return;
    }
    var view = null;
    for (var i = 0; i < VIEWS.length; i++) if (VIEWS[i].id === id) view = VIEWS[i];
    if (!view) return;
    current = view.render({
      h: h,
      api: api,
      host: host,
      resolved: resolved,
      events: events,
      sessionContext: sessionContext,
      navigate: mountView
    });
    main.appendChild(current.element);
    if (visible) current.activate();
  }

  function renderNav() {
    clear(nav);
    buttons = {};
    for (var i = 0; i < VIEWS.length; i++) {
      (function (view) {
        var btn = h("button", {
          type: "button", className: "sa-nav-item",
          "aria-current": view.id === activeId ? "true" : "false",
          onClick: function () { mountView(view.id); }
        }, view.label);
        buttons[view.id] = btn;
        nav.appendChild(btn);
      })(VIEWS[i]);
    }
    mountView(activeId);
  }

  var offSession = events.on("session-context", function (payload) {
    if (payload) sessionContext = payload;
  });

  host.resolveBaseUrl().then(function (r) {
    if (disposed) return;
    resolved = r;
    api = createApiBridge(r.baseUrl, function (path, opts2) { return host.proxyFetch(path, opts2); });
    renderNav();
  }).catch(function () {
    if (disposed) return;
    resolved = { baseUrl: "http://127.0.0.1:8731", source: "default" };
    api = createApiBridge(resolved.baseUrl, function (path, opts2) { return host.proxyFetch(path, opts2); });
    renderNav();
  });

  return {
    element: root,
    events: events,
    dispose: function () {
      disposed = true;
      if (observer) { observer.disconnect(); observer = null; }
      offSession();
      unsubscribeHost();
      events.dispose();
      if (current) { current.deactivate(); current.dispose(); current = null; }
    }
  };
}


// ---- lib/host/bridge.js ----
// SA Manager host half (browser side) — config resolution, session context,
// event forwarding, and the same-origin proxy call.
//
// IMPORTANT: this file is bundled into client.js and therefore runs in the
// RENDERER, not in Node. A direct fetch to 127.0.0.1:8731 from here is a browser
// request and CreatorHub sends no Access-Control-Allow-Origin, so it fails with
// "Failed to fetch". Every API read must go through /dsh-samanager/proxy, which
// the Node half (lib/index.js) registers and forwards.
var DEFAULT_BASE_URL = "http://127.0.0.1:8731";
var CONFIG_PATH = "/dsh-samanager/config";
var PROXY_PATH = "/dsh-samanager/proxy";
var PANEL_ID = "dsh-samanager";
var BRIDGE_TIMEOUT_MS = 2000;
var PROXY_TIMEOUT_MS = 10000;

function isLoopback(value) {
  if (typeof value !== "string" || value.length === 0) return false;
  try {
    var host = new URL(value).hostname;
    return host === "127.0.0.1" || host === "localhost";
  } catch (e) { return false; }
}

function resolveStaticBaseUrl(ctx, config) {
  var candidates = [];
  if (config && typeof config.baseUrl === "string") candidates.push(config.baseUrl);
  try {
    if (ctx && ctx.config && typeof ctx.config.baseUrl === "string") candidates.push(ctx.config.baseUrl);
  } catch (e) { /* guarded ctx denies undeclared reads */ }
  if (ctx && typeof ctx.get === "function") {
    try {
      var injected = ctx.get("saManagerConfig");
      if (injected && typeof injected.baseUrl === "string") candidates.push(injected.baseUrl);
    } catch (e) { /* optional lookup */ }
  }
  for (var i = 0; i < candidates.length; i++) if (isLoopback(candidates[i])) return candidates[i];
  return undefined;
}

function fetchBridgeBaseUrl(fetchImpl) {
  var doFetch = fetchImpl || fetch;
  try {
    return doFetch(CONFIG_PATH, {
      signal: AbortSignal.timeout(BRIDGE_TIMEOUT_MS),
      credentials: "same-origin",
      headers: { accept: "application/json" }
    }).then(function (res) { return res && res.ok ? res.json() : null; })
      .then(function (json) { return json && typeof json.baseUrl === "string" ? json.baseUrl : undefined; })
      .catch(function () { return undefined; });
  } catch (e) {
    return Promise.resolve(undefined);
  }
}

function pickBaseUrl(bridgeValue, staticValue) {
  if (isLoopback(bridgeValue)) return { baseUrl: bridgeValue, source: "host-bridge" };
  if (isLoopback(staticValue)) return { baseUrl: staticValue, source: "host-config" };
  return { baseUrl: DEFAULT_BASE_URL, source: "default" };
}

// Read the host's current session context through the optional uiSession service.
// Never throws: a missing service or an unexpected shape degrades to { available: false }.
function getSessionContext(ctx) {
  var fallback = { available: false };
  try {
    if (!ctx || typeof ctx.get !== "function") return fallback;
    var uiSession = ctx.get("uiSession");
    if (!uiSession || !uiSession.sessions || !uiSession.sessions.list) return fallback;
    var snapshot = uiSession.sessions.list.getSnapshot ? uiSession.sessions.list.getSnapshot() : null;
    if (!snapshot || !snapshot.byId) return fallback;
    var byId = snapshot.byId;
    var ids = Object.keys(byId);
    if (ids.length === 0) return { available: true, sessionId: null, title: "(无会话)", messageCount: 0, running: false, sessionCount: 0 };
    var mainId = uiSession.mainRetainId && byId[uiSession.mainRetainId] ? uiSession.mainRetainId : ids[0];
    var session = byId[mainId] || {};
    var running = session.running === true || session.status === "running";
    return {
      available: true,
      sessionId: session.id || mainId,
      title: session.title || session.name || "(未命名会话)",
      messageCount: typeof session.messageCount === "number" ? session.messageCount : (typeof session.messages === "number" ? session.messages : undefined),
      running: running,
      sessionCount: ids.length
    };
  } catch (e) {
    return { available: false, error: String(e && e.message ? e.message : e) };
  }
}

function createHostBridge(ctx, config) {
  return {
    panelId: PANEL_ID,
    configPath: CONFIG_PATH,
    proxyPath: PROXY_PATH,

    resolveBaseUrl: function () {
      return fetchBridgeBaseUrl().then(function (bridgeValue) {
        return pickBaseUrl(bridgeValue, resolveStaticBaseUrl(ctx, config));
      });
    },

    // Read-only CreatorHub request forwarded by the Node half. Only /health and
    // /api/* are allowed; the Host route repeats the same check.
    proxyFetch: function (path, options) {
      var opts = options || {};
      var timeoutMs = typeof opts.timeoutMs === "number" ? opts.timeoutMs : PROXY_TIMEOUT_MS;
      if (typeof path !== "string" || path.charAt(0) !== "/") return Promise.resolve({ ok: false, status: 0, data: null, error: "forbidden" });
      if (path !== "/health" && path.indexOf("/api/") !== 0) return Promise.resolve({ ok: false, status: 0, data: null, error: "forbidden" });
      if (opts.method !== undefined && opts.method !== "GET") return Promise.resolve({ ok: false, status: 0, data: null, error: "forbidden" });
      var url = PROXY_PATH + "?path=" + encodeURIComponent(path);
      return fetch(url, {
        method: "GET",
        credentials: "same-origin",
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(timeoutMs)
      }).then(function (res) {
        return res.text().then(function (text) {
          var data = null;
          if (text.length > 0) { try { data = JSON.parse(text); } catch (e) { data = null; } }
          return { ok: res.ok, status: res.status, data: data };
        });
      }).catch(function (err) {
        return { ok: false, status: 0, data: null, error: String(err && err.message ? err.message : err) };
      });
    },

    // Forward host events to the panel. Returns an unsubscribe that releases every
    // registration, so the panel can dispose without leaving listeners behind.
    subscribe: function (emit) {
      var disposers = [];
      function emitSafe(name, payload) { try { emit({ name: name, payload: payload }); } catch (e) { /* panel listener errors stay local */ } }

      try {
        if (ctx && typeof ctx.on === "function") {
          var onReset = ctx.on("connection/reset", function () { emitSafe("connection-reset", {}); });
          if (typeof onReset === "function") disposers.push(onReset);
        }
      } catch (e) { /* optional event */ }

      try {
        var uiSession = ctx && typeof ctx.get === "function" ? ctx.get("uiSession") : undefined;
        if (uiSession && uiSession.sessions && uiSession.sessions.list && typeof uiSession.sessions.list.subscribe === "function") {
          var offList = uiSession.sessions.list.subscribe(function () { emitSafe("session-context", getSessionContext(ctx)); });
          if (typeof offList === "function") disposers.push(offList);
        }
      } catch (e) { /* optional service */ }

      try {
        var remote = ctx && typeof ctx.get === "function" ? ctx.get("remote") : undefined;
        if (remote && typeof remote.$on === "function") {
          var offStatus = remote.$on("api-session/status", function (sessionId, running) {
            emitSafe("agent-status", { sessionId: sessionId, running: running === true });
          });
          if (typeof offStatus === "function") disposers.push(offStatus);
        }
      } catch (e) { /* optional service */ }

      return function unsubscribe() {
        while (disposers.length > 0) {
          var dispose = disposers.pop();
          try { dispose(); } catch (e) { /* already gone */ }
        }
      };
    },

    openExternal: function (url) {
      if (!isLoopback(url)) return false;
      try { window.open(url, "_blank", "noopener,noreferrer"); return true; } catch (e) { return false; }
    }
  };
}


// ---- lib/host/client.js ----
// SA Manager host half (browser side) — mounts the native panel into the DSH slot
// and owns its lifecycle. The bundle's apply() calls mountPanel once.

var PANEL_ID = "dsh-samanager";
var cssInjected = false;

function injectCss() {
  if (cssInjected || typeof document === "undefined") return;
  cssInjected = true;
  var style = document.createElement("style");
  style.setAttribute("data-sa-manager", "");
  style.textContent = typeof PANEL_CSS === "string" ? PANEL_CSS : "";
  (document.head || document.documentElement).appendChild(style);
}

function SAManagerIcon() {
  return React.createElement("svg", { width: 16, height: 16, viewBox: "0 0 16 16", "aria-hidden": "true", focusable: "false" },
    React.createElement("rect", { x: 1.5, y: 1.5, width: 13, height: 13, rx: 3, fill: "none", stroke: "currentColor", strokeWidth: 1.5 }),
    React.createElement("path", { d: "M4.5 8.5 L7 11 L11.5 5.5", fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round" })
  );
}

function mountPanel(ctx, config) {
  var staticBaseUrl = resolveStaticBaseUrl(ctx, config);
  var host = createHostBridge(ctx, config);

  function SAManagerPanel() {
    var ref = React.useRef(null);
    React.useEffect(function () {
      var panel = createPanel(host, { injectCss: injectCss, sessionContext: getSessionContext(ctx) });
      if (ref.current) ref.current.appendChild(panel.element);
      return function () { panel.dispose(); };
    }, []);
    return React.createElement("div", { ref: ref, className: "sa-manager-host" });
  }

  ctx.slots.inject("sidebar.panellist", function () {
    return ctx.slots.register({ name: "sidebar.panellist", id: PANEL_ID, order: 50, label: "SA Manager" }, SAManagerIcon);
  });
  ctx.slots.inject("main", function () {
    return ctx.slots.register({ name: "main", key: PANEL_ID }, SAManagerPanel);
  });

  return { panelId: PANEL_ID, configPath: host.configPath, staticBaseUrl: staticBaseUrl || null };
}


    exports.apply = function (ctx, config) { return mountPanel(ctx, config); };
    exports.inject = ["slots"];
    exports.pickBaseUrl = pickBaseUrl;
    exports.fetchBridgeBaseUrl = fetchBridgeBaseUrl;
    exports.resolveStaticBaseUrl = resolveStaticBaseUrl;
    exports.isLoopback = isLoopback;
    exports.CONFIG_PATH = CONFIG_PATH;
    exports.DEFAULT_BASE_URL = DEFAULT_BASE_URL;
    exports.PANEL_ID = PANEL_ID;
    exports.createHostBridge = createHostBridge;
    exports.getSessionContext = getSessionContext;
    exports.createEventBus = createEventBus;
    exports.createPanel = createPanel;
    return module.exports;
  }
});
