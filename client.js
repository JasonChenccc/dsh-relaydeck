// GENERATED FILE — edit lib/panel/** or lib/host/** then run: node scripts/build-client.mjs
// DSH serves one bundle per package (exports["./client"]); the modules are inlined below.
window.__ModuleLoader__.load({
  id: "dsh-relaydeck",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    var React = require("react");
    var PANEL_CSS = ".sa-manager-host { height: 100%; min-height: 320px; display: flex; }\n.sa-panel {\n  display: flex; flex-direction: row; align-items: stretch; width: 100%; height: 100%;\n  font: var(--dsh-content-font-size, 13px)/1.6 var(--dsh-font-family-text, system-ui, sans-serif);\n  color: var(--dsw-alias-label-primary, #1f2328);\n  background: var(--dsw-alias-bg-base, transparent);\n}\n.sa-nav {\n  width: 152px; flex: 0 0 auto; overflow: auto; padding: 10px 8px;\n  border-right: 1px solid var(--dsw-alias-border-l1, rgba(0,0,0,.08));\n  display: flex; flex-direction: column; gap: 2px;\n}\n.sa-nav-item {\n  appearance: none; border: 0; background: transparent; cursor: pointer; text-align: left;\n  padding: 7px 10px; border-radius: 6px; font: inherit;\n  color: var(--dsw-alias-label-secondary, #4b5563);\n}\n.sa-nav-item:hover { background: var(--dsw-alias-interactive-bg-hover, rgba(0,0,0,.04)); }\n.sa-nav-item[aria-current=\"true\"] {\n  background: var(--dsw-alias-interactive-bg-hover, rgba(0,0,0,.06));\n  color: var(--dsw-alias-label-primary, #111); font-weight: 600;\n}\n.sa-nav-item:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary, #4f46e5); outline-offset: 1px; }\n.sa-main { flex: 1; min-width: 0; overflow: auto; padding: 14px; }\n.sa-view { display: flex; flex-direction: column; gap: 12px; }\n.sa-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }\n.sa-dot { width: 8px; height: 8px; border-radius: 50%; flex: 0 0 auto; background: var(--dsw-alias-state-idle-primary, #9ca3af); }\n.sa-dot[data-state=\"online\"] { background: var(--dsw-alias-state-success-primary, #22c55e); }\n.sa-dot[data-state=\"offline\"] { background: var(--dsw-alias-state-error-primary, #ef4444); }\n.sa-muted { color: var(--dsw-alias-label-tertiary, #6b7280); }\n.sa-caption { color: var(--dsw-alias-label-caption, #9ca3af); font-size: 12px; }\n.sa-warn { color: var(--dsw-alias-state-warn-primary, #b45309); font-size: 12px; }\n.sa-addr { word-break: break-all; color: var(--dsw-alias-label-secondary, #4b5563); }\n.sa-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap: 8px; }\n.sa-card {\n  padding: 10px; border-radius: 8px; border: 1px solid var(--dsw-alias-settings-card-stroke, rgba(0,0,0,.08));\n  background: var(--dsw-alias-settings-card-fill, rgba(0,0,0,.02));\n}\n.sa-card b { display: block; font-size: 18px; font-weight: 600; }\n.sa-btn {\n  appearance: none; cursor: pointer; font: inherit; padding: 6px 12px; border-radius: 6px;\n  border: 1px solid var(--dsw-alias-border-l2, rgba(0,0,0,.12));\n  background: var(--dsw-alias-button-elevated-fill, transparent);\n  color: var(--dsw-alias-label-primary, #111);\n}\n.sa-btn:hover { background: var(--dsw-alias-interactive-bg-hover, rgba(0,0,0,.05)); }\n.sa-btn:disabled { cursor: not-allowed; opacity: .5; }\n.sa-btn[data-variant=\"primary\"] {\n  border-color: transparent; background: var(--dsw-alias-button-primary-fill, #4f46e5); color: #fff;\n}\n.sa-table { width: 100%; border-collapse: collapse; }\n.sa-table th, .sa-table td { text-align: left; padding: 6px 8px; border-bottom: 1px solid var(--dsw-alias-border-l1, rgba(0,0,0,.06)); vertical-align: top; }\n.sa-table th { color: var(--dsw-alias-label-tertiary, #6b7280); font-weight: 500; white-space: nowrap; }\n.sa-empty { padding: 24px 8px; text-align: center; color: var(--dsw-alias-label-tertiary, #6b7280); }\n.sa-trend { display: flex; flex-wrap: wrap; gap: 6px; }\n.sa-trend span { padding: 2px 6px; border-radius: 4px; background: var(--dsw-alias-bg-layer-2, rgba(0,0,0,.03)); color: var(--dsw-alias-label-secondary, #4b5563); font-size: 12px; }\n.sa-section-title { font-weight: 600; margin-top: 4px; }\n\n.sa-dev-log {\n  margin: 0; padding: 10px; border-radius: 8px; max-height: 260px; overflow: auto;\n  background: var(--dsw-alias-markdown-code-block, rgba(0,0,0,.04));\n  color: var(--dsw-alias-label-secondary, #4b5563);\n  font: var(--dsh-font-family-code, ui-monospace, monospace); font-size: 12px; white-space: pre-wrap; word-break: break-all;\n}\n\n.sa-list { display: flex; flex-direction: column; gap: 6px; }\n.sa-list-row {\n  padding: 6px 8px; border-radius: 6px;\n  border: 1px solid var(--dsw-alias-border-l1, rgba(0,0,0,.06));\n}\n.sa-input {\n  width: 100%; padding: 6px 10px; border-radius: 6px; font: inherit;\n  border: 1px solid var(--dsw-alias-border-l2, rgba(0,0,0,.12));\n  background: var(--dsw-alias-bg-base, transparent); color: inherit;\n}\n.sa-textarea {\n  width: 100%; min-height: 150px; padding: 10px; border-radius: 8px;\n  border: 1px solid var(--dsw-alias-border-l2, rgba(0,0,0,.12));\n  background: var(--dsw-alias-markdown-code-block, rgba(0,0,0,.03));\n  color: inherit; font: var(--dsh-font-family-code, ui-monospace, monospace);\n  font-size: 12px; white-space: pre;\n}\n\n/* ── visual building blocks ── */\n.sa-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 10px; }\n.sa-platform {\n  border: 1px solid var(--dsw-alias-border-l1, rgba(0,0,0,.08)); border-radius: 10px;\n  padding: 12px; display: flex; flex-direction: column; gap: 8px;\n  background: var(--dsw-alias-settings-card-fill, rgba(0,0,0,.02));\n}\n.sa-platform.is-bound { border-color: var(--dsw-alias-state-success-tertiary, rgba(34,197,94,.45)); }\n.sa-platform-head { display: flex; align-items: center; gap: 8px; }\n.sa-badge {\n  width: 28px; height: 28px; border-radius: 8px; flex: 0 0 auto;\n  display: inline-flex; align-items: center; justify-content: center;\n  font-size: 12px; font-weight: 600; color: #fff;\n  background: var(--dsw-alias-brand-primary, #4f46e5);\n}\n.sa-platform-name { flex: 1; font-weight: 600; }\n.sa-state { font-size: 12px; color: var(--dsw-alias-label-tertiary, #6b7280); }\n.sa-state.is-ok { color: var(--dsw-alias-state-success-primary, #16a34a); }\n.sa-platform-body { font-size: 12px; color: var(--dsw-alias-label-tertiary, #6b7280); min-height: 32px; }\n.sa-platform-foot { display: flex; gap: 8px; }\n\n.sa-qr-card {\n  margin-top: 12px; display: flex; gap: 18px; align-items: center; padding: 16px;\n  border: 1px solid var(--dsw-alias-border-l1, rgba(0,0,0,.08)); border-radius: 12px;\n  background: var(--dsw-alias-bg-layer-2, rgba(0,0,0,.02));\n}\n.sa-qr-box {\n  width: 200px; height: 200px; flex: 0 0 auto; border-radius: 10px; overflow: hidden;\n  background: #fff; display: flex; align-items: center; justify-content: center;\n  border: 1px solid var(--dsw-alias-border-l2, rgba(0,0,0,.12));\n}\n.sa-qr-img { width: 100%; height: 100%; object-fit: contain; }\n.sa-qr-placeholder { font-size: 12px; color: #9ca3af; }\n.sa-qr-info { display: flex; flex-direction: column; gap: 8px; align-items: flex-start; }\n.sa-qr-title { font-weight: 600; }\n.sa-qr-hint { font-size: 12px; color: var(--dsw-alias-label-secondary, #4b5563); }\n\n.sa-media-card {\n  border: 1px solid var(--dsw-alias-border-l1, rgba(0,0,0,.08)); border-radius: 10px;\n  overflow: hidden; background: var(--dsw-alias-settings-card-fill, rgba(0,0,0,.02));\n  display: flex; flex-direction: column;\n}\n.sa-thumb {\n  width: 100%; aspect-ratio: 16 / 9; object-fit: cover; display: block;\n  background: var(--dsw-alias-bg-skeleton, rgba(0,0,0,.06));\n}\n.sa-thumb-empty {\n  width: 100%; aspect-ratio: 16 / 9; display: flex; align-items: center; justify-content: center;\n  background: var(--dsw-alias-bg-skeleton, rgba(0,0,0,.06)); color: #9ca3af; font-size: 12px;\n}\n.sa-media-body { padding: 10px; display: flex; flex-direction: column; gap: 6px; }\n.sa-media-title { font-weight: 600; font-size: 13px; line-height: 1.4; max-height: 2.8em; overflow: hidden; }\n.sa-media-meta { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--dsw-alias-label-tertiary, #6b7280); }\n.sa-chip {\n  font-size: 11px; padding: 1px 6px; border-radius: 999px;\n  background: var(--dsw-alias-bg-layer-3, rgba(0,0,0,.06)); color: var(--dsw-alias-label-secondary, #4b5563);\n}\n.sa-chip.is-ok { background: var(--dsw-alias-state-success-tertiary, rgba(34,197,94,.18)); color: var(--dsw-alias-state-success-primary, #15803d); }\n\n/* ── builder form ── */\n.sa-form { display: flex; flex-direction: column; gap: 12px; }\n.sa-field { display: flex; flex-direction: column; gap: 6px; }\n.sa-field > label { font-size: 12px; color: var(--dsw-alias-label-tertiary, #6b7280); }\n.sa-checks { display: flex; flex-wrap: wrap; gap: 10px; }\n.sa-check { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; }\n.sa-row-inline { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }\n.sa-subcard {\n  border: 1px solid var(--dsw-alias-border-l1, rgba(0,0,0,.08)); border-radius: 10px; padding: 12px;\n  background: var(--dsw-alias-settings-card-fill, rgba(0,0,0,.02));\n}\n\n/* ── dashboard chart ── */\n.sa-chart { display: flex; align-items: flex-end; gap: 8px; height: 110px; padding: 8px 4px 0; }\n.sa-chart-col { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; height: 100%; justify-content: flex-end; }\n.sa-chart-bar { width: 100%; max-width: 34px; border-radius: 4px 4px 0 0; background: var(--dsw-alias-brand-primary, #4f46e5); min-height: 2px; }\n.sa-chart-bar.is-second { background: var(--dsw-alias-state-success-primary, #22c55e); }\n.sa-chart-label { font-size: 11px; color: var(--dsw-alias-label-tertiary, #6b7280); }\n.sa-legend { display: flex; gap: 14px; font-size: 12px; color: var(--dsw-alias-label-tertiary, #6b7280); }\n.sa-legend i { display: inline-block; width: 10px; height: 10px; border-radius: 2px; margin-right: 4px; }\n\n/* ── run timeline ── */\n.sa-steps { display: flex; flex-direction: column; gap: 0; }\n.sa-step { display: flex; gap: 10px; padding: 8px 0; }\n.sa-step-dot {\n  width: 10px; height: 10px; border-radius: 50%; margin-top: 5px; flex: 0 0 auto;\n  background: var(--dsw-alias-state-idle-primary, #9ca3af);\n}\n.sa-step-dot.is-ok { background: var(--dsw-alias-state-success-primary, #22c55e); }\n.sa-step-dot.is-bad { background: var(--dsw-alias-state-error-primary, #ef4444); }\n.sa-step-main { flex: 1; display: flex; flex-direction: column; gap: 2px; }\n.sa-step-title { font-weight: 600; font-size: 13px; }\n";

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
// RelayDeck panel — backend API client. Every call goes through the host proxy,
// so the renderer never talks to the loopback port itself.
function createApiBridge(proxy) {
  function call(method, path, body, timeoutMs) {
    if (typeof proxy !== "function") {
      return Promise.resolve({ ok: false, status: 0, data: null, error: "宿主代理不可用（host.proxyFetch 未注入）" });
    }
    const started = Date.now();
    let pending;
    try {
      pending = proxy(path, { method: method, body: body, timeoutMs: timeoutMs });
    } catch (error) {
      return Promise.resolve({ ok: false, status: 0, data: null, error: String(error && error.message ? error.message : error) });
    }
    return Promise.resolve(pending).then(function (res) {
      if (!res) return { ok: false, status: 0, data: null, error: "empty proxy response" };
      return { ok: res.ok === true, status: res.status || 0, data: res.data === undefined ? null : res.data, error: res.error, latencyMs: Date.now() - started };
    }).catch(function (error) {
      return { ok: false, status: 0, data: null, error: String(error && error.message ? error.message : error), latencyMs: Date.now() - started };
    });
  }

  return {
    call: call,
    health: function () { return call("GET", "/health", undefined, 4000); },
    capabilities: function () { return call("GET", "/api/capabilities"); },
    flows: function () { return call("GET", "/api/flows"); },
    createFlow: function (payload) { return call("POST", "/api/flows", payload); },
    updateFlow: function (id, payload) { return call("PUT", "/api/flows/" + encodeURIComponent(String(id)), payload); },
    deleteFlow: function (id) { return call("DELETE", "/api/flows/" + encodeURIComponent(String(id))); },
    runFlow: function (id) { return call("POST", "/api/flows/" + encodeURIComponent(String(id)) + "/run", {}, 60000); },
    runs: function (limit) { return call("GET", "/api/runs?limit=" + encodeURIComponent(String(limit || 50))); },
    run: function (id) { return call("GET", "/api/runs/" + encodeURIComponent(String(id))); },
    artifacts: function (limit, platform) {
      let path = "/api/artifacts?limit=" + encodeURIComponent(String(limit || 100));
      if (platform) path += "&platform=" + encodeURIComponent(platform);
      return call("GET", path);
    },
    bindings: function () { return call("GET", "/api/bindings"); },
    verifyBindings: function () { return call("POST", "/api/bindings/verify", {}, 120000); },
    areaList: function (path) { return call("GET", "/api/" + path); },
    areaCreate: function (path, body) { return call("POST", "/api/" + path, body); },
    areaUpdate: function (path, id, body) { return call("PUT", "/api/" + path + "/" + encodeURIComponent(String(id)), body); },
    areaToggle: function (path, id) { return call("POST", "/api/" + path + "/" + encodeURIComponent(String(id)) + "/toggle", {}); },
    areaDelete: function (path, id) { return call("DELETE", "/api/" + path + "/" + encodeURIComponent(String(id))); },
    records: function (kind, limit) { return call("GET", "/api/records?kind=" + encodeURIComponent(kind || "") + "&limit=" + (limit || 100)); },
    accountStats: function () { return call("GET", "/api/account-stats"); },
    refreshAccountStats: function () { return call("POST", "/api/account-stats/refresh", {}, 180000); },
    publishPlans: function () { return call("GET", "/api/publish-plans"); },
    reviewPlan: function (id, status) { return call("POST", "/api/publish-plans/" + encodeURIComponent(String(id)), { status: status }); },
    platforms: function () { return call("GET", "/api/platforms"); },
    logins: function () { return call("GET", "/api/login"); },
    startLogin: function (platform) { return call("POST", "/api/login", { platform: platform }); },
    loginStatus: function (id) { return call("GET", "/api/login/" + encodeURIComponent(String(id))); },
    loginQr: function (id) { return call("GET", "/api/login/" + encodeURIComponent(String(id)) + "/qr", undefined, 20000); },
    cancelLogin: function (id) { return call("POST", "/api/login/" + encodeURIComponent(String(id)) + "/cancel", {}); }
  };
}


// ---- lib/panel/views/_area.js ----
// 通用板块页：新建 → 列表 → 启停 / 删除。所有数据都来自后端真实行。

function renderArea(ctx, config) {
  var api = ctx.api;
  var root = h("div", { className: "sa-view" });
  var timer = null;
  var disposed = false;
  var state = { draft: {} };

  var status = h("div", { className: "sa-caption" }, "");
  var list = h("div", { className: "sa-list" });

  root.appendChild(h("div", { className: "sa-section-title" }, config.title));
  if (config.description) root.appendChild(h("div", { className: "sa-muted" }, config.description));

  // 新建区
  var form = h("div", { className: "sa-subcard" }, [h("div", { className: "sa-media-title" }, "新建")]);
  var fields = h("div", { className: "sa-checks" });
  (config.fields || []).forEach(function (field) {
    var input;
    if (field.type === "select") {
      input = h("select", { className: "sa-btn" });
      (field.options || []).forEach(function (opt) { input.appendChild(h("option", { value: opt.value }, opt.label)); });
    } else if (field.type === "textarea") {
      input = h("textarea", { className: "sa-textarea", style: { minHeight: "60px" }, placeholder: field.placeholder || "" });
    } else {
      input = h("input", { className: "sa-input", type: field.type || "text", placeholder: field.placeholder || "", style: { width: field.width || "180px" } });
    }
    if (field.value !== undefined) input.value = field.value;
    input.addEventListener("input", function () { state.draft[field.key] = input.value; });
    input.addEventListener("change", function () { state.draft[field.key] = input.value; });
    state.draft[field.key] = input.value;
    fields.appendChild(h("label", { className: "sa-check" }, [h("span", { className: "sa-caption" }, field.label), input]));
  });
  var createBtn = h("button", { type: "button", className: "sa-btn", "data-variant": "primary", onClick: create }, "创建");
  form.appendChild(fields);
  form.appendChild(h("div", { className: "sa-row" }, [createBtn, status]));
  if (config.note) form.appendChild(h("div", { className: "sa-warn" }, config.note));
  root.appendChild(form);

  root.appendChild(h("div", { className: "sa-section-title" }, "列表"));
  root.appendChild(list);

  function payload() {
    var out = {};
    (config.fields || []).forEach(function (field) {
      var value = state.draft[field.key];
      if (field.type === "number") out[field.key] = Number(value) || 0;
      else out[field.key] = value === undefined ? "" : value;
    });
    return out;
  }

  async function create() {
    createBtn.disabled = true;
    try {
      var res = await api.areaCreate(config.path, payload());
      status.textContent = res.ok ? "已创建 ✓" : ("创建失败：" + (res.error || res.status));
      if (res.ok) refresh();
    } finally { createBtn.disabled = false; }
  }

  async function toggle(id) { await api.areaToggle(config.path, id); refresh(); }
  async function remove(id) { await api.areaDelete(config.path, id); refresh(); }

  function refresh() {
    if (disposed) return;
    api.areaList(config.path).then(function (res) {
      if (disposed) return;
      clear(list);
      var items = res.ok && res.data && Array.isArray(res.data.items) ? res.data.items : [];
      if (!res.ok) { list.appendChild(h("div", { className: "sa-empty" }, "读取失败：" + (res.error || res.status))); return; }
      if (items.length === 0) { list.appendChild(h("div", { className: "sa-empty" }, "还没有条目 —— 用上面的表单建一条。")); return; }
      items.forEach(function (row) {
        var title = row[config.titleKey] || row.name || row.title || ("#" + row.id);
        var sub = (config.subtitle || function (r) { return ""; })(row);
        var toggleBtn = h("button", { type: "button", className: "sa-btn", onClick: function () { toggle(row.id); } }, row.enabled ? "停用" : "启用");
        list.appendChild(h("div", { className: "sa-list-row" }, [
          h("div", { className: "sa-row" }, [
            h("span", { className: "sa-dot", "data-state": row.enabled ? "online" : "idle" }),
            h("span", { style: { flex: 1, fontWeight: 600 } }, title),
            h("span", { className: "sa-chip" }, row.platform || config.path),
            row.items ? h("span", { className: "sa-chip is-ok" }, "采集 " + row.items) : null,
            h("span", { className: "sa-caption" }, row.last_scan_at ? fmtTime(row.last_scan_at) : "未运行"),
            toggleBtn,
            h("button", { type: "button", className: "sa-btn", onClick: function () { remove(row.id); } }, "删除")
          ]),
          sub ? h("div", { className: "sa-caption" }, sub) : null,
          row.last_error ? h("div", { className: "sa-warn" }, row.last_error) : null
        ]));
      });
    });
  }

  function activate() { if (disposed || timer !== null) return; refresh(); timer = setInterval(refresh, 10000); }
  function deactivate() { if (timer === null) return; clearInterval(timer); timer = null; }
  return { element: root, activate: activate, deactivate: deactivate, dispose: function () { disposed = true; deactivate(); } };
}


// ---- lib/panel/views/dashboard.js ----
// 看板 — 状态、规模、近 7 天趋势、最近运行。

function last7Days() {
  var days = [];
  var now = new Date();
  for (var i = 6; i >= 0; i -= 1) {
    var d = new Date(now.getTime() - i * 86400000);
    days.push({ key: d.toISOString().slice(0, 10), label: (d.getMonth() + 1) + "/" + d.getDate() });
  }
  return days;
}

function renderDashboard(ctx) {
  var api = ctx.api;
  var events = ctx.events;
  var root = h("div", { className: "sa-view" });
  var disposers = [];
  var timer = null;
  var disposed = false;

  // session
  var sessionDot = h("span", { className: "sa-dot", "data-state": "idle" });
  var sessionMeta = h("span", { className: "sa-caption" }, "");
  root.appendChild(h("div", { className: "sa-platform" }, [
    h("div", { className: "sa-platform-head" }, [sessionDot, h("span", { className: "sa-platform-name" }, "当前会话")]),
    h("div", { className: "sa-platform-body" }, [sessionMeta])
  ]));
  function applySession(s) {
    if (!s || s.available === false) { sessionDot.dataset.state = "idle"; sessionMeta.textContent = "宿主未提供会话上下文"; return; }
    sessionMeta.textContent = [s.title || "(未命名会话)", typeof s.messageCount === "number" ? s.messageCount + " 条消息" : null, s.running ? "运行中" : "空闲"].filter(Boolean).join(" · ");
    sessionDot.dataset.state = s.running ? "online" : "idle";
  }
  applySession(ctx.sessionContext);
  if (events && typeof events.on === "function") {
    disposers.push(events.on("session-context", applySession));
    disposers.push(events.on("agent-status", function (payload) { if (payload) applySession({ available: true, running: payload.running === true }); }));
  }

  // health + stats
  var dot = h("span", { className: "sa-dot", "data-state": "idle" });
  var stateText = h("span", null, "检测中");
  var latency = h("span", { className: "sa-muted" }, "");
  var refreshBtn = h("button", { type: "button", className: "sa-btn", onClick: refresh }, "刷新");
  root.appendChild(h("div", { className: "sa-row" }, [dot, stateText, latency, refreshBtn]));

  var cards = h("div", { className: "sa-cards" });
  function card(label) {
    var value = h("b", null, "-");
    cards.appendChild(h("div", { className: "sa-card" }, [value, h("span", { className: "sa-caption" }, label)]));
    return value;
  }
  var cFlows = card("流程");
  var cRuns = card("运行");
  var cArtifacts = card("素材");
  var cBindings = card("已登录平台");
  root.appendChild(cards);

  // chart
  root.appendChild(h("div", { className: "sa-section-title" }, "近 7 天"));
  root.appendChild(h("div", { className: "sa-legend" }, [
    h("span", null, [h("i", { style: { background: "var(--dsw-alias-brand-primary, #4f46e5)" } }), "发现"]),
    h("span", null, [h("i", { style: { background: "var(--dsw-alias-state-success-primary, #22c55e)" } }), "写入"])
  ]));
  var chart = h("div", { className: "sa-chart" });
  root.appendChild(chart);

  root.appendChild(h("div", { className: "sa-section-title" }, "最近运行"));
  var recent = h("div", { className: "sa-list" });
  root.appendChild(recent);

  function renderChart(runs) {
    clear(chart);
    var days = last7Days();
    var byDay = {};
    days.forEach(function (d) { byDay[d.key] = { found: 0, saved: 0 }; });
    runs.forEach(function (r) {
      var key = String(r.started_at || "").slice(0, 10);
      if (!byDay[key]) return;
      byDay[key].found += Number(r.found || 0);
      byDay[key].saved += Number(r.saved || 0);
    });
    var peak = 1;
    days.forEach(function (d) { peak = Math.max(peak, byDay[d.key].found, byDay[d.key].saved); });
    days.forEach(function (d) {
      var data = byDay[d.key];
      var bars = h("div", { className: "sa-row-inline", style: { alignItems: "flex-end", gap: "2px", height: "100%" } }, [
        h("div", { className: "sa-chart-bar", style: { height: Math.round((data.found / peak) * 80) + "%" } }),
        h("div", { className: "sa-chart-bar is-second", style: { height: Math.round((data.saved / peak) * 80) + "%" } })
      ]);
      chart.appendChild(h("div", { className: "sa-chart-col" }, [
        bars,
        h("span", { className: "sa-chart-label" }, d.label)
      ]));
    });
  }

  function refresh() {
    if (disposed) return;
    refreshBtn.disabled = true;
    api.health().then(function (res) {
      if (disposed) return;
      refreshBtn.disabled = false;
      var data = res.ok && res.data ? res.data : null;
      dot.dataset.state = res.ok ? "online" : "offline";
      stateText.textContent = res.ok ? "后端在线" : "后端离线";
      latency.textContent = res.ok ? ((res.latencyMs || 0) + " ms") : (res.error || "");
      var c = data && data.counts ? data.counts : {};
      cFlows.textContent = String(c.flows === undefined ? "-" : c.flows);
      cRuns.textContent = String(c.runs === undefined ? "-" : c.runs);
      cArtifacts.textContent = String(c.artifacts === undefined ? "-" : c.artifacts);
      cBindings.textContent = String(c.bindings === undefined ? "-" : c.bindings);
    });
    api.runs(100).then(function (res) {
      if (disposed) return;
      var items = res.ok && res.data && Array.isArray(res.data.items) ? res.data.items : [];
      renderChart(items);
      clear(recent);
      if (items.length === 0) { recent.appendChild(h("div", { className: "sa-empty" }, "还没有运行记录 —— 到「流程」页建一条并运行。")); return; }
      items.slice(0, 8).forEach(function (run) {
        recent.appendChild(h("div", { className: "sa-row sa-list-row" }, [
          h("span", { className: "sa-dot", "data-state": run.state === "ok" ? "online" : (run.state === "failed" ? "offline" : "idle") }),
          h("span", { style: { flex: 1 } }, run.flow_name || ("流程 " + run.flow_id)),
          h("span", { className: "sa-chip" }, "发现 " + run.found),
          h("span", { className: "sa-chip is-ok" }, "写入 " + run.saved),
          h("span", { className: "sa-caption" }, fmtTime(run.started_at))
        ]));
      });
    });
  }

  function activate() { if (disposed || timer !== null) return; refresh(); timer = setInterval(refresh, 10000); }
  function deactivate() { if (timer === null) return; clearInterval(timer); timer = null; }
  return {
    element: root, activate: activate, deactivate: deactivate,
    dispose: function () {
      disposed = true; deactivate();
      while (disposers.length > 0) { try { disposers.pop()(); } catch (e) { /* gone */ } }
    }
  };
}


// ---- lib/panel/views/accounts.js ----
// 账号 — 平台登录。二维码就地刷新（不重建 DOM，避免屏闪）；支持同平台多账号。

function renderAccounts(ctx) {
  var api = ctx.api;
  var root = h("div", { className: "sa-view" });
  var listTimer = null;
  var pollTimer = null;
  var disposed = false;
  var active = null;
  var lastQr = null;
  var platforms = [];
  var bindings = [];

  var grid = h("div", { className: "sa-grid" });
  var qrPanel = h("div", { className: "sa-qr" });
  var status = h("div", { className: "sa-caption" }, "");
  var verifyBtn = h("button", { type: "button", className: "sa-btn", onClick: verify }, "重新校验登录");
  var bindingGrid = h("div", { className: "sa-grid" });

  // Live references into the QR card, so polls only touch the image source.
  var qrImg = null;
  var qrHint = null;

  root.appendChild(h("div", { className: "sa-section-title" }, "平台登录"));
  root.appendChild(h("div", { className: "sa-muted" }, "点「扫码登录」，二维码会显示在下面，用手机 App 扫一下即可。同一平台可以登录多个账号，会分别列出。"));
  root.appendChild(grid);
  root.appendChild(qrPanel);
  root.appendChild(status);
  root.appendChild(h("div", { className: "sa-section-title" }, "已登录账号"));
  root.appendChild(h("div", { className: "sa-row" }, [verifyBtn, h("span", { className: "sa-muted" }, "（会打开各平台页面核对一次真实登录态）")]));
  root.appendChild(bindingGrid);

  function renderPlatforms() {
    clear(grid);
    if (platforms.length === 0) { grid.appendChild(h("div", { className: "sa-empty" }, "后端没有平台定义。")); return; }
    platforms.forEach(function (pf) {
      var mine = bindings.filter(function (b) { return b.platform === pf.id; });
      var isActive = active !== null && active.platform === pf.id;
      var button = h("button", {
        type: "button", className: "sa-btn",
        "data-variant": mine.length ? "ghost" : "primary",
        onClick: function () { startLogin(pf.id); }
      }, isActive ? "登录中…" : (mine.length ? "再登一个账号" : "扫码登录"));
      if (isActive) button.disabled = true;
      var names = mine.map(function (b) { return b.nickname || b.label || b.platform_uid; }).join("、");
      grid.appendChild(h("div", { className: "sa-platform" + (mine.length ? " is-bound" : "") }, [
        h("div", { className: "sa-platform-head" }, [
          h("span", { className: "sa-badge" }, pf.title.slice(0, 2)),
          h("span", { className: "sa-platform-name" }, pf.title),
          h("span", { className: "sa-state" + (mine.length ? " is-ok" : "") }, mine.length ? ("已登录 " + mine.length) : "未登录")
        ]),
        h("div", { className: "sa-platform-body" }, mine.length ? names : (pf.hint || "")),
        h("div", { className: "sa-platform-foot" }, [button])
      ]));
    });
  }

  function buildQrCard() {
    clear(qrPanel);
    qrImg = null; qrHint = null; lastQr = null;
    if (active === null) return;
    var box = h("div", { className: "sa-qr-box" });
    qrImg = h("img", { className: "sa-qr-img", alt: "登录二维码" });
    box.appendChild(qrImg);
    qrHint = h("div", { className: "sa-qr-hint" }, "二维码加载中…");
    var info = h("div", { className: "sa-qr-info" }, [
      h("div", { className: "sa-qr-title" }, "扫码登录 " + (active.title || "")),
      h("div", { className: "sa-muted" }, "打开手机 App → 扫一扫"),
      qrHint,
      h("button", { type: "button", className: "sa-btn", onClick: cancelLogin }, "取消")
    ]);
    qrPanel.appendChild(h("div", { className: "sa-qr-card" }, [box, info]));
  }

  function setQr(image) {
    if (!qrImg) return;
    if (image === lastQr) return;      // identical pixels: leave the DOM alone
    lastQr = image;
    qrImg.src = image;
  }

  function setHint(text) { if (qrHint) qrHint.textContent = text; }

  function renderBindings() {
    clear(bindingGrid);
    if (bindings.length === 0) { bindingGrid.appendChild(h("div", { className: "sa-empty" }, "还没有登录任何平台。")); return; }
    bindings.forEach(function (b) {
      var pf = platforms.filter(function (x) { return x.id === b.platform; })[0] || { title: b.platform };
      bindingGrid.appendChild(h("div", { className: "sa-platform is-bound" }, [
        h("div", { className: "sa-platform-head" }, [
          h("span", { className: "sa-badge" }, (b.nickname || pf.title).slice(0, 2)),
          h("span", { className: "sa-platform-name" }, b.nickname || "(未命名账号)"),
          h("span", { className: "sa-state is-ok" }, pf.title)
        ]),
        h("div", { className: "sa-platform-body" }, "ID " + (b.platform_uid || "-") + " · 最近使用 " + fmtTime(b.last_used_at || b.created_at))
      ]));
    });
  }

  function loadBindings() {
    return api.bindings().then(function (res) {
      bindings = res.ok && res.data && Array.isArray(res.data.items) ? res.data.items : [];
    });
  }

  function refresh() {
    if (disposed) return;
    Promise.all([api.platforms(), loadBindings()]).then(function (pair) {
      if (disposed) return;
      platforms = pair[0].ok && pair[0].data && Array.isArray(pair[0].data.items) ? pair[0].data.items : [];
      renderPlatforms();
      renderBindings();
    });
  }

  function startLogin(platformId) {
    var pf = platforms.filter(function (x) { return x.id === platformId; })[0] || { id: platformId, title: platformId };
    status.textContent = "正在打开 " + pf.title + " 登录页…";
    if (pollTimer) { clearTimeout(pollTimer); pollTimer = null; }
    api.startLogin(platformId).then(function (res) {
      if (disposed) return;
      if (!res.ok || !res.data) { status.textContent = "无法开始登录：" + (res.error || res.status); return; }
      active = res.data;
      active.title = pf.title;
      buildQrCard();
      renderPlatforms();
      poll();
    });
  }

  function poll() {
    if (disposed || active === null) return;
    var id = active.id;
    api.loginQr(id).then(function (res) {
      if (disposed || active === null || active.id !== id) return;
      var d = res.ok && res.data ? res.data : null;
      if (d && d.image) { setQr(d.image); setHint("等待扫码…"); }
      else if (d && d.reason) setHint(d.reason);
    });
    api.loginStatus(id).then(function (res) {
      if (disposed || active === null || active.id !== id) return;
      var s = res.ok && res.data ? res.data : null;
      if (!s) { pollTimer = setTimeout(poll, 2000); return; }
      if (s.state === "ok") {
        var who = s.account && s.account.nickname ? ("：" + s.account.nickname) : "";
        status.textContent = "登录成功 ✓" + who;
        if (pollTimer) { clearTimeout(pollTimer); pollTimer = null; }
        active = null; clear(qrPanel); qrImg = null; refresh();
        return;
      }
      if (s.state === "failed") { status.textContent = "登录失败：" + (s.error || ""); active = null; clear(qrPanel); qrImg = null; refresh(); return; }
      if (s.state === "cancelled" || s.state === "unknown") { status.textContent = "已取消"; active = null; clear(qrPanel); qrImg = null; refresh(); return; }
      pollTimer = setTimeout(poll, 2000);
    });
  }

  function cancelLogin() {
    if (active === null) return;
    var id = active.id;
    active = null; qrImg = null; lastQr = null;
    if (pollTimer) { clearTimeout(pollTimer); pollTimer = null; }
    clear(qrPanel);
    status.textContent = "已取消";
    api.cancelLogin(id).then(function () { refresh(); });
  }

  function verify() {
    verifyBtn.disabled = true;
    status.textContent = "正在核对各平台登录态…（会依次打开页面，约 20 秒）";
    api.verifyBindings().then(function (res) {
      verifyBtn.disabled = false;
      var results = res.ok && res.data && Array.isArray(res.data.results) ? res.data.results : [];
      if (results.length === 0) { status.textContent = "核对失败：" + (res.error || res.status); return; }
      status.textContent = results.map(function (r) {
        if (r.state === "active") return r.platform + " ✓ " + (r.nickname || r.uid);
        if (r.state === "signed-out") return r.platform + " 未登录";
        return r.platform + " " + r.state;
      }).join(" · ");
      refresh();
    });
  }

  function activate() {
    if (disposed || listTimer !== null) return;
    refresh();
    listTimer = setInterval(refresh, 15000);
  }
  function deactivate() { if (listTimer !== null) { clearInterval(listTimer); listTimer = null; } }

  return {
    element: root,
    activate: activate,
    deactivate: deactivate,
    dispose: function () {
      disposed = true;
      deactivate();
      if (pollTimer) { clearTimeout(pollTimer); pollTimer = null; }
    }
  };
}


// ---- lib/panel/views/monitors.js ----
// 作品监控 — 盯住创作者，按间隔采集新作品。

function renderMonitors(ctx) {
  return renderArea(ctx, {
    path: "monitors",
    title: "作品监控",
    description: "盯住指定创作者，按间隔采集新作品。",
    titleKey: "name",
    note: "采集能力：抖音已支持主页作品读取；其余平台的监控采集尚未接入。",
    fields: [
      { key: "platform", label: "平台", type: "select", options: [{"value":"douyin","label":"抖音"},{"value":"xhs","label":"小红书"},{"value":"kuaishou","label":"快手"},{"value":"shipinhao","label":"视频号"},{"value":"tiktok","label":"TikTok"}] },
      { key: "kind", label: "类型", type: "select", options: [{ value: "creator", label: "创作者" }, { value: "keyword", label: "关键词" }] },
      { key: "name", label: "名称", placeholder: "备注名，例如 露营小李" },
      { key: "ref", label: "标识/关键词", placeholder: "主页链接或关键词" },
      { key: "interval_seconds", label: "间隔(秒)", type: "number", value: "3600", width: "110px" }
    ],
    subtitle: function (r) { return (r.kind === "keyword" ? "关键词：" : "目标：") + (r.ref || "-") + " · 每 " + r.interval_seconds + " 秒"; }
  });
}


// ---- lib/panel/views/collections.js ----
// 关键词采集 — 按关键词在平台上采集内容。

var PLATFORMS = [
  { value: "douyin", label: "抖音" }, { value: "xhs", label: "小红书" },
  { value: "kuaishou", label: "快手" }, { value: "shipinhao", label: "视频号" }, { value: "tiktok", label: "TikTok" }
];

function renderCollections(ctx) {
  var api = ctx.api;
  var root = h("div", { className: "sa-view" });
  var timer = null;
  var disposed = false;

  var platform = h("select", { className: "sa-btn" });
  PLATFORMS.forEach(function (x) { platform.appendChild(h("option", { value: x.value }, x.label)); });
  var keyword = h("input", { className: "sa-input", placeholder: "关键词，例如 露营", style: { width: "200px" } });
  var limit = h("input", { className: "sa-input", type: "number", value: "20", min: "1", style: { width: "90px" } });
  var createBtn = h("button", { type: "button", className: "sa-btn", "data-variant": "primary", onClick: create }, "开始采集");
  var status = h("div", { className: "sa-caption" }, "");
  var list = h("div", { className: "sa-list" });

  root.appendChild(h("div", { className: "sa-section-title" }, "关键词采集"));
  root.appendChild(h("div", { className: "sa-muted" }, "按关键词在平台上采集内容，结果进入素材库。每个关键词保存为一条可重复运行的采集任务。"));
  root.appendChild(h("div", { className: "sa-row" }, [platform, keyword, h("span", { className: "sa-caption" }, "条数"), limit, createBtn]));
  root.appendChild(status);
  root.appendChild(h("div", { className: "sa-section-title" }, "采集任务"));
  root.appendChild(list);

  root.appendChild(h("div", { className: "sa-section-title" }, "采集结果"));
  var resultInfo = h("div", { className: "sa-caption" }, "");
  var resultGrid = h("div", { className: "sa-grid" });
  root.appendChild(resultInfo);
  root.appendChild(resultGrid);

  function isSearchFlow(flow) {
    var cap = flow && flow.spec && flow.spec.source ? flow.spec.source.capability : "";
    return /\.search$/.test(cap);
  }

  async function create() {
    var query = keyword.value.trim();
    if (!query) { status.textContent = "请填写关键词"; return; }
    createBtn.disabled = true;
    try {
      var res = await api.createFlow({
        name: platform.options[platform.selectedIndex].text + " 采集：" + query,
        spec: {
          source: { capability: platform.value + ".search", params: { query: query, limit: Number(limit.value) || 20 } },
          filters: [{ capability: "core.dedupe", params: {} }],
          actions: [{ capability: "core.store", params: {} }]
        }
      });
      status.textContent = res.ok ? "已创建 ✓" : ("创建失败：" + (res.error || res.status));
      if (res.ok) { keyword.value = ""; refresh(); }
    } finally { createBtn.disabled = false; }
  }

  async function run(id, button) {
    button.disabled = true; button.textContent = "采集中…";
    try {
      var res = await api.runFlow(id);
      var r = res.ok && res.data ? res.data : null;
      status.textContent = r ? ("采集完成：发现 " + r.found + " · 新增 " + r.kept + " · 入库 " + r.saved) : ("采集失败：" + (res.error || res.status) + (res.data && res.data.error ? " — " + res.data.error : ""));
      refresh();
    } finally { button.disabled = false; button.textContent = "采集"; }
  }

  function refresh() {
    if (disposed) return;
    api.flows().then(function (res) {
      if (disposed) return;
      clear(list);
      var flows = res.ok && res.data && Array.isArray(res.data.items) ? res.data.items.filter(isSearchFlow) : [];
      if (flows.length === 0) { list.appendChild(h("div", { className: "sa-empty" }, "还没有采集任务。")); return; }
      flows.forEach(function (flow) {
        var query = flow.spec.source.params && flow.spec.source.params.query || "";
        var btn = h("button", { type: "button", className: "sa-btn", "data-variant": "primary", onClick: function () { run(flow.id, btn); } }, "采集");
        list.appendChild(h("div", { className: "sa-list-row" }, [
          h("div", { className: "sa-row" }, [
            h("span", { className: "sa-dot", "data-state": flow.last_state === "ok" ? "online" : (flow.last_state === "failed" ? "offline" : "idle") }),
            h("span", { style: { flex: 1, fontWeight: 600 } }, flow.name),
            h("span", { className: "sa-chip" }, query),
            h("span", { className: "sa-caption" }, flow.last_run_at ? fmtTime(flow.last_run_at) : "未运行"),
            btn,
            h("button", { type: "button", className: "sa-btn", onClick: function () { api.deleteFlow(flow.id).then(refresh); } }, "删除")
          ]),
          flow.last_state === "failed" ? h("div", { className: "sa-warn" }, "上次失败") : null
        ]));
      });
    });
  }

  function loadResults() {
    if (disposed) return;
    api.artifacts(200).then(function (res) {
      if (disposed) return;
      clear(resultGrid);
      var items = res.ok && res.data && Array.isArray(res.data.items) ? res.data.items : [];
      resultInfo.textContent = "共 " + items.length + " 条";
      if (items.length === 0) { resultGrid.appendChild(h("div", { className: "sa-empty" }, "还没有采集结果。")); return; }
      items.slice(0, 60).forEach(function (item) {
        var cover = item.cover_url
          ? h("img", { className: "sa-thumb", src: item.cover_url, alt: "", loading: "lazy", onError: function (e) { e.target.style.display = "none"; } })
          : h("div", { className: "sa-thumb-empty" }, item.platform);
        var likes = 0;
        try { likes = Number(JSON.parse(item.stats_json || "{}").like_count || 0); } catch (e) {}
        resultGrid.appendChild(h("div", { className: "sa-media-card" }, [
          cover,
          h("div", { className: "sa-media-body" }, [
            h("div", { className: "sa-media-title" }, item.title || item.item_id),
            h("div", { className: "sa-media-meta" }, [
              h("span", { className: "sa-chip" }, item.platform),
              item.author ? h("span", null, item.author) : null,
              likes > 0 ? h("span", null, "♥ " + likes) : null,
              h("span", { className: "sa-chip" + (item.local_path ? " is-ok" : "") }, item.local_path ? "已下载" : "未下载")
            ])
          ])
        ]));
      });
    });
  }

  function activate() { if (disposed || timer !== null) return; refresh(); loadResults(); timer = setInterval(function () { refresh(); loadResults(); }, 10000); }
  function deactivate() { if (timer === null) return; clearInterval(timer); timer = null; }
  return { element: root, activate: activate, deactivate: deactivate, dispose: function () { disposed = true; deactivate(); } };
}


// ---- lib/panel/views/comment-watches.js ----
// 评论监控 — 盯住作品/账号的评论。

function renderCommentWatches(ctx) {
  return renderArea(ctx, {
    path: "comment-watches",
    title: "评论监控",
    description: "盯住指定作品或账号的评论。",
    titleKey: "title",
    note: "尚未接入：平台侧评论采集能力还没实现，因此这里只会显示你配置的监控项，不会有采集结果。",
    fields: [
      { key: "platform", label: "平台", type: "select", options: [{"value":"douyin","label":"抖音"},{"value":"xhs","label":"小红书"},{"value":"kuaishou","label":"快手"},{"value":"shipinhao","label":"视频号"},{"value":"tiktok","label":"TikTok"}] },
      { key: "title", label: "名称", placeholder: "备注名" },
      { key: "ref", label: "作品/账号", placeholder: "作品链接或账号" },
      { key: "interval_seconds", label: "间隔(秒)", type: "number", value: "1800", width: "110px" }
    ],
    subtitle: function (r) { return "目标：" + (r.ref || "-"); }
  });
}


// ---- lib/panel/views/danmaku-watches.js ----
// 弹幕监控 — 盯住视频弹幕。

function renderDanmakuWatches(ctx) {
  return renderArea(ctx, {
    path: "danmaku-watches",
    title: "弹幕监控",
    description: "盯住指定视频的弹幕。",
    titleKey: "title",
    note: "尚未接入：平台侧弹幕采集能力还没实现，因此这里只会显示你配置的监控项，不会有采集结果。",
    fields: [
      { key: "platform", label: "平台", type: "select", options: [{"value":"douyin","label":"抖音"},{"value":"xhs","label":"小红书"},{"value":"kuaishou","label":"快手"},{"value":"shipinhao","label":"视频号"},{"value":"tiktok","label":"TikTok"}] },
      { key: "title", label: "名称", placeholder: "备注名" },
      { key: "ref", label: "视频", placeholder: "视频链接或 ID" },
      { key: "interval_seconds", label: "间隔(秒)", type: "number", value: "1800", width: "110px" }
    ],
    subtitle: function (r) { return "目标：" + (r.ref || "-"); }
  });
}


// ---- lib/panel/views/account-manager.js ----
// 账号管理 — 已登录账号自身的数据（粉丝 / 关注 / 作品 / 获赞）。

function renderAccountManager(ctx) {
  var api = ctx.api;
  var root = h("div", { className: "sa-view" });
  var timer = null;
  var disposed = false;
  var status = h("div", { className: "sa-caption" }, "");
  var refreshBtn = h("button", { type: "button", className: "sa-btn", "data-variant": "primary", onClick: refreshStats }, "刷新账号数据");
  var grid = h("div", { className: "sa-grid" });

  root.appendChild(h("div", { className: "sa-section-title" }, "账号管理"));
  root.appendChild(h("div", { className: "sa-muted" }, "读取已登录账号自身的运营数据。点「刷新账号数据」会打开账号主页读取一次。"));
  root.appendChild(h("div", { className: "sa-row" }, [refreshBtn, status]));
  root.appendChild(grid);

  async function refreshStats() {
    refreshBtn.disabled = true;
    status.textContent = "正在读取（打开账号主页，约 10-20 秒）…";
    try {
      var res = await api.refreshAccountStats();
      var results = res.ok && res.data && Array.isArray(res.data.results) ? res.data.results : [];
      if (results.length === 0) { status.textContent = "没有已登录账号，或读取失败：" + (res.error || res.status); return; }
      status.textContent = results.map(function (r) {
        if (r.state === "ok") return r.platform + " ✓ " + r.nickname + "（粉丝 " + r.fans + "）";
        if (r.state === "unsupported") return r.platform + " 尚未接入";
        if (r.state === "signed-out") return r.platform + " 未登录";
        return r.platform + " " + (r.error || r.state);
      }).join(" · ");
      load();
    } finally { refreshBtn.disabled = false; }
  }

  function load() {
    if (disposed) return;
    api.accountStats().then(function (res) {
      if (disposed) return;
      clear(grid);
      var items = res.ok && res.data && Array.isArray(res.data.items) ? res.data.items : [];
      if (items.length === 0) { grid.appendChild(h("div", { className: "sa-empty" }, "还没有账号数据 —— 点上面的按钮读取一次。")); return; }
      var latest = {};
      items.forEach(function (row) { if (!latest[row.platform]) latest[row.platform] = row; });
      Object.keys(latest).forEach(function (key) {
        var row = latest[key];
        grid.appendChild(h("div", { className: "sa-platform is-bound" }, [
          h("div", { className: "sa-platform-head" }, [
            h("span", { className: "sa-badge" }, (row.nickname || key).slice(0, 2)),
            h("span", { className: "sa-platform-name" }, row.nickname || key),
            h("span", { className: "sa-state is-ok" }, key)
          ]),
          h("div", { className: "sa-cards" }, [
            h("div", { className: "sa-card" }, [h("b", null, String(row.followers)), h("span", { className: "sa-caption" }, "粉丝")]),
            h("div", { className: "sa-card" }, [h("b", null, String(row.following)), h("span", { className: "sa-caption" }, "关注")]),
            h("div", { className: "sa-card" }, [h("b", null, String(row.works)), h("span", { className: "sa-caption" }, "作品")]),
            h("div", { className: "sa-card" }, [h("b", null, String(row.likes)), h("span", { className: "sa-caption" }, "获赞")])
          ]),
          h("div", { className: "sa-caption" }, "读取于 " + fmtTime(row.taken_at))
        ]));
      });
    });
  }

  function activate() { if (disposed || timer !== null) return; load(); timer = setInterval(load, 15000); }
  function deactivate() { if (timer === null) return; clearInterval(timer); timer = null; }
  return { element: root, activate: activate, deactivate: deactivate, dispose: function () { disposed = true; deactivate(); } };
}


// ---- lib/panel/views/runs.js ----
// 运行 — 时间线视图：每次运行展开成可视化的步骤。

var STAGE_LABEL = { source: "取内容", filter: "筛选", action: "执行" };

function renderRuns(ctx) {
  var api = ctx.api;
  var root = h("div", { className: "sa-view" });
  var timer = null;
  var disposed = false;
  var list = h("div", { className: "sa-list" });
  var expanded = null;

  root.appendChild(h("div", { className: "sa-section-title" }, "运行历史"));
  root.appendChild(list);

  function stepsFor(run) {
    var box = h("div", { className: "sa-steps" });
    (run.steps || []).forEach(function (step) {
      box.appendChild(h("div", { className: "sa-step" }, [
        h("span", { className: "sa-step-dot" + (step.state === "ok" ? " is-ok" : " is-bad") }),
        h("div", { className: "sa-step-main" }, [
          h("div", { className: "sa-step-title" }, (STAGE_LABEL[step.stage] || step.stage) + " · " + step.capability),
          h("div", { className: "sa-caption" }, "进入 " + step.in_count + " 条 → 产出 " + step.out_count + " 条" + (step.detail ? " · " + step.detail : "")),
          step.error ? h("div", { className: "sa-warn" }, step.error) : null
        ])
      ]));
    });
    return box;
  }

  async function toggle(id, card) {
    if (expanded === id) { expanded = null; refresh(); return; }
    expanded = id;
    var res = await api.run(id);
    var holder = card.querySelector("[data-detail]");
    if (holder && res.ok && res.data) { clear(holder); holder.appendChild(stepsFor(res.data)); }
  }

  function refresh() {
    if (disposed) return;
    api.runs(30).then(function (res) {
      if (disposed) return;
      clear(list);
      var items = res.ok && res.data && Array.isArray(res.data.items) ? res.data.items : [];
      if (items.length === 0) { list.appendChild(h("div", { className: "sa-empty" }, "还没有运行记录。")); return; }
      items.forEach(function (run) {
        var detail = h("div", { "data-detail": "" });
        var card = h("div", { className: "sa-platform" }, [
          h("div", { className: "sa-platform-head" }, [
            h("span", { className: "sa-dot", "data-state": run.state === "ok" ? "online" : (run.state === "failed" ? "offline" : "idle") }),
            h("span", { className: "sa-platform-name" }, "#" + run.id + " " + (run.flow_name || "")),
            h("span", { className: "sa-chip" }, "发现 " + run.found),
            h("span", { className: "sa-chip is-ok" }, "写入 " + run.saved),
            h("span", { className: "sa-caption" }, fmtTime(run.started_at)),
            h("button", { type: "button", className: "sa-btn", onClick: function () { toggle(run.id, card); } }, expanded === run.id ? "收起" : "查看步骤")
          ]),
          run.error ? h("div", { className: "sa-warn" }, run.error) : null,
          detail
        ]);
        list.appendChild(card);
        if (expanded === run.id) {
          api.run(run.id).then(function (full) {
            if (disposed || !full.ok || !full.data) return;
            clear(detail);
            detail.appendChild(stepsFor(full.data));
          });
        }
      });
    });
  }

  function activate() { if (disposed || timer !== null) return; refresh(); timer = setInterval(refresh, 10000); }
  function deactivate() { if (timer === null) return; clearInterval(timer); timer = null; }
  return { element: root, activate: activate, deactivate: deactivate, dispose: function () { disposed = true; deactivate(); } };
}


// ---- lib/panel/views/publish.js ----
// 发布 — 待发布草稿与复核。

function renderPublish(ctx) {
  var api = ctx.api;
  var root = h("div", { className: "sa-view" });
  var timer = null;
  var disposed = false;
  var status = h("div", { className: "sa-caption" }, "");
  var list = h("div", { className: "sa-list" });

  root.appendChild(h("div", { className: "sa-section-title" }, "发布"));
  root.appendChild(h("div", { className: "sa-muted" }, "流程产生的发布草稿。批准后才会进入下一步（准备草稿到平台创作者后台）。"));
  root.appendChild(status);
  root.appendChild(list);

  async function review(id, nextStatus) {
    var res = await api.reviewPlan(id, nextStatus);
    status.textContent = res.ok ? ("已标记为 " + nextStatus) : ("操作失败：" + (res.error || res.status));
    refresh();
  }

  function refresh() {
    if (disposed) return;
    api.publishPlans().then(function (res) {
      if (disposed) return;
      clear(list);
      var items = res.ok && res.data && Array.isArray(res.data.items) ? res.data.items : [];
      if (items.length === 0) {
        list.appendChild(h("div", { className: "sa-empty" }, "还没有发布草稿。在「流程」里加一个「生成发布计划」动作即可产出。"));
        return;
      }
      items.forEach(function (row) {
        var badge = row.status === "approved" ? "已批准" : (row.status === "discarded" ? "已丢弃" : (row.status === "prepared" ? "已准备" : "待复核"));
        var rowEl = h("div", { className: "sa-list-row" }, [
          h("div", { className: "sa-row" }, [
            h("span", { className: "sa-chip" }, row.source_platform + " → " + row.platform),
            h("span", { style: { flex: 1, fontWeight: 600 } }, row.title || "(无标题)"),
            h("span", { className: "sa-state" + (row.status === "approved" ? " is-ok" : "") }, badge),
            h("span", { className: "sa-caption" }, fmtTime(row.created_at)),
            row.status === "draft" ? h("button", { type: "button", className: "sa-btn", "data-variant": "primary", onClick: function () { review(row.id, "approved"); } }, "批准") : null,
            row.status === "draft" ? h("button", { type: "button", className: "sa-btn", onClick: function () { review(row.id, "discarded"); } }, "丢弃") : null
          ]),
          row.body ? h("div", { className: "sa-caption" }, row.body) : null,
          row.tags ? h("div", { className: "sa-caption" }, "标签：" + row.tags) : null
        ]);
        list.appendChild(rowEl);
      });
    });
  }

  function activate() { if (disposed || timer !== null) return; refresh(); timer = setInterval(refresh, 10000); }
  function deactivate() { if (timer === null) return; clearInterval(timer); timer = null; }
  return { element: root, activate: activate, deactivate: deactivate, dispose: function () { disposed = true; deactivate(); } };
}


// ---- lib/panel/views/auto-comment.js ----
// 自动评论 — 规则配置。

function renderAutoComment(ctx) {
  return renderArea(ctx, {
    path: "comment-rules",
    title: "自动评论",
    description: "配置自动评论规则。默认关闭，且需要人工复核。",
    titleKey: "name",
    note: "尚未接入：评论发送能力还没实现。规则创建后默认停用，不会产生任何自动行为。",
    fields: [
      { key: "platform", label: "平台", type: "select", options: [{"value":"douyin","label":"抖音"},{"value":"xhs","label":"小红书"},{"value":"kuaishou","label":"快手"},{"value":"shipinhao","label":"视频号"},{"value":"tiktok","label":"TikTok"}] },
      { key: "name", label: "规则名", placeholder: "例如 露营视频感谢" },
      { key: "mode", label: "模式", type: "select", options: [{ value: "review", label: "人工复核" }, { value: "auto", label: "自动发送" }] },
      { key: "target_ref", label: "目标", placeholder: "作品或账号" },
      { key: "templates", label: "回复模板", placeholder: "多条用 | 分隔" },
      { key: "daily_cap", label: "每日上限", type: "number", value: "20", width: "100px" }
    ],
    subtitle: function (r) { return "模式 " + r.mode + " · 上限 " + r.daily_cap + "/天 · 目标 " + (r.target_ref || "-"); }
  });
}


// ---- lib/panel/views/downloads.js ----
// 链接下载 — 已下载到本地的素材文件。

function renderDownloads(ctx) {
  var api = ctx.api;
  var root = h("div", { className: "sa-view" });
  var timer = null;
  var disposed = false;
  var status = h("div", { className: "sa-caption" }, "");
  var list = h("div", { className: "sa-list" });

  root.appendChild(h("div", { className: "sa-section-title" }, "链接下载"));
  root.appendChild(h("div", { className: "sa-muted" }, "流程里勾选「下载媒体文件」后，文件会落在这里。按链接下载（粘贴链接直接下载）尚未接入。"));
  root.appendChild(status);
  root.appendChild(list);

  function refresh() {
    if (disposed) return;
    api.artifacts(300).then(function (res) {
      if (disposed) return;
      clear(list);
      var all = res.ok && res.data && Array.isArray(res.data.items) ? res.data.items : [];
      var items = all.filter(function (a) { return a.local_path && a.local_path.length > 0; });
      status.textContent = "已下载 " + items.length + " 项 · 素材库共 " + all.length + " 项";
      if (items.length === 0) { list.appendChild(h("div", { className: "sa-empty" }, "还没有下载任何文件。")); return; }
      items.forEach(function (row) {
        list.appendChild(h("div", { className: "sa-list-row" }, [
          h("div", { className: "sa-row" }, [
            h("span", { className: "sa-chip is-ok" }, "已下载"),
            h("span", { style: { flex: 1, fontWeight: 600 } }, row.title || row.item_id),
            h("span", { className: "sa-caption" }, row.platform + " · " + fmtTime(row.collected_at))
          ]),
          h("div", { className: "sa-caption", style: { wordBreak: "break-all" } }, row.local_path)
        ]));
      });
    });
  }

  function activate() { if (disposed || timer !== null) return; refresh(); timer = setInterval(refresh, 10000); }
  function deactivate() { if (timer === null) return; clearInterval(timer); timer = null; }
  return { element: root, activate: activate, deactivate: deactivate, dispose: function () { disposed = true; deactivate(); } };
}


// ---- lib/panel/views/notifications.js ----
// 通知 — 通知渠道配置。

function renderNotifications(ctx) {
  return renderArea(ctx, {
    path: "notifications",
    title: "通知",
    description: "流程结束、采集完成、失败告警的推送渠道。",
    titleKey: "name",
    note: "尚未接入：推送发送还没实现，配置会保存但不会真正发出通知。",
    fields: [
      { key: "name", label: "名称", placeholder: "例如 我的钉钉群" },
      { key: "type", label: "类型", type: "select", options: [{ value: "webhook", label: "Webhook" }, { value: "desktop", label: "桌面通知" }] },
      { key: "config_json", label: "配置(JSON)", placeholder: '{"url":"..."}' }
    ],
    subtitle: function (r) { return r.type + " · " + (r.config_json || "{}").slice(0, 60); }
  });
}


// ---- lib/panel/views/dev.js ----
// 开发调试：重载插件 / 重启宿主 / 重新打包。
// Reload uses the Host's native remote pluginManager (typert RPC) — no extra route.
// Pack and restart go through the Host dev routes registered in lib/index.js.

var PACK_PATH = "/dsh-relaydeck/dev/pack";
var RESTART_PATH = "/dsh-relaydeck/dev/restart";
var PACKAGE_NAME = "dsh-relaydeck";

function renderDev(ctx) {
  var clientCtx = ctx.clientCtx;
  var root = h("div", { className: "sa-view" });
  var status = h("div", { className: "sa-caption" }, "");
  var log = h("pre", { className: "sa-dev-log" }, "");

  function say(text) { status.textContent = text; }
  function write(text) { log.textContent = String(text).slice(0, 4000); }

  function remoteManager() {
    try {
      if (!clientCtx || !clientCtx.remote) return undefined;
      return clientCtx.remote.pluginManager;
    } catch (e) { return undefined; }
  }

  async function findEntryId() {
    var manager = remoteManager();
    if (!manager) return undefined;
    var listed = await manager.listPlugins();
    var value = listed && listed.ok ? listed.value : listed;
    var items = value && (value.plugins || value.items || value);
    if (!Array.isArray(items)) return undefined;
    for (var i = 0; i < items.length; i++) {
      var row = items[i] || {};
      if (row.packageName === PACKAGE_NAME || row.name === PACKAGE_NAME || row.package === PACKAGE_NAME) {
        return row.id || row.entryId || row.key;
      }
    }
    for (var k = 0; k < items.length; k++) {
      var r = items[k] || {};
      var hay = JSON.stringify(r);
      if (hay.indexOf(PACKAGE_NAME) >= 0) return r.id || r.entryId || r.key;
    }
    return undefined;
  }

  var reloadBtn = h("button", { type: "button", className: "sa-btn", "data-variant": "primary", onClick: reload }, "重载插件");
  var restartBtn = h("button", { type: "button", className: "sa-btn", onClick: restart }, "重启宿主");
  var packBtn = h("button", { type: "button", className: "sa-btn", onClick: pack }, "重新打包");

  async function reload() {
    var manager = remoteManager();
    if (!manager) { say("宿主 remote.pluginManager 不可用"); return; }
    reloadBtn.disabled = true;
    try {
      var entryId = await findEntryId();
      if (!entryId) { say("未在插件列表中找到 " + PACKAGE_NAME); return; }
      say("正在重载 " + entryId + " …");
      await manager.setPluginEnabled(entryId, false);
      var back = await manager.setPluginEnabled(entryId, true);
      var applied = back && back.ok && back.value ? back.value.application : undefined;
      say(applied === "restart-required"
        ? "已提交，但需要重启宿主：" + (back.value.restartReason || "")
        : "重载已提交" + (applied ? "（" + applied + "）" : ""));
    } catch (e) {
      say("重载失败：" + String(e && e.message ? e.message : e));
    } finally {
      reloadBtn.disabled = false;
    }
  }

  async function restart() {
    restartBtn.disabled = true;
    try {
      say("正在请求重启宿主 …");
      var res = await fetch(RESTART_PATH, { method: "POST", credentials: "same-origin", headers: { accept: "application/json" } });
      var body = await res.json();
      if (body.ok) say("宿主即将重启（窗口会关闭后自动拉起）");
      else say("未重启：" + (body.hint || body.error || body.reason || res.status));
      write(JSON.stringify(body, null, 2));
    } catch (e) {
      say("重启请求失败：" + String(e && e.message ? e.message : e));
    } finally {
      restartBtn.disabled = false;
    }
  }

  async function pack() {
    packBtn.disabled = true;
    try {
      say("正在重新打包 …");
      var res = await fetch(PACK_PATH, { method: "POST", credentials: "same-origin", headers: { accept: "application/json" } });
      var body = await res.json();
      if (body.ok) say("打包完成：" + body.name + "@" + body.version + " · " + body.bytes + " B · client.js " + body.clientBytes + " B");
      else say("打包失败：" + (body.error || res.status));
      write(JSON.stringify(body, null, 2));
    } catch (e) {
      say("打包请求失败：" + String(e && e.message ? e.message : e));
    } finally {
      packBtn.disabled = false;
    }
  }

  var info = h("div", { className: "sa-caption" }, "读取宿主 dev 配置 …");
  root.appendChild(info);
  fetch("/dsh-relaydeck/config", { credentials: "same-origin", headers: { accept: "application/json" } })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (cfg) {
      if (!cfg) { info.textContent = "无法读取宿主配置"; return; }
      info.textContent = "devMode=" + String(cfg.devMode) + " · allowHostRestart=" + String(cfg.allowHostRestart) + " · 后端端口 " + cfg.port + " · 数据目录 " + cfg.dataDir;
    })
    .catch(function () { info.textContent = "无法读取宿主配置"; });
  root.appendChild(h("div", { className: "sa-caption" }, "开发调试：重载插件走宿主 remote.pluginManager（原生，无需重启）；重新打包在宿主执行 scripts/dev-pack.mjs；重启宿主需在插件配置中开启 allowHostRestart。"));
  root.appendChild(h("div", { className: "sa-row" }, [reloadBtn, restartBtn, packBtn]));
  root.appendChild(status);
  root.appendChild(log);

  return {
    element: root,
    activate: function () { say("就绪"); },
    deactivate: function () {},
    dispose: function () {}
  };
}


// ---- lib/panel/views/about.js ----
// 关于 — 版本、许可证、免责声明。

var DISCLAIMER = "RelayDeck 是独立项目：不包含、不依赖、也不分发任何第三方内容工具的代码或素材。所有平台能力均为本项目自行实现。";

function renderAbout(ctx) {
  var api = ctx.api;
  var root = h("div", { className: "sa-view" });
  var body = h("div", { className: "sa-list" });
  root.appendChild(body);

  api.health().then(function (res) {
    clear(body);
    var data = res.ok && res.data ? res.data : null;
    body.appendChild(h("div", { className: "sa-card" }, [
      h("div", { className: "sa-row" }, [h("span", { style: { fontWeight: 600 } }, "RelayDeck")]),
      h("div", { className: "sa-caption" }, "DSH 原生内容流转工作台 · Flow = 源 → 筛选 → 动作"),
      h("div", { className: "sa-caption" }, "版本 " + (data ? data.version : "?") + " · API " + (data ? data.api : "?") + " · schema " + (data ? data.schemaVersion : "?"))
    ]));
    body.appendChild(h("div", { className: "sa-card" }, [
      h("div", { className: "sa-row" }, [h("span", { style: { fontWeight: 600 } }, "许可证")]),
      h("div", { className: "sa-caption" }, "MIT")
    ]));
    body.appendChild(h("div", { className: "sa-card" }, [
      h("div", { className: "sa-row" }, [h("span", { style: { fontWeight: 600 } }, "免责声明")]),
      h("div", { className: "sa-caption" }, DISCLAIMER)
    ]));
  });

  return { element: root, activate: function () {}, deactivate: function () {}, dispose: function () {} };
}


// ---- lib/panel/index.js ----
// RelayDeck panel — 左侧 12 个板块（与用户指定顺序一致）+ 开发调试 / 关于。
// 每个板块都读取后端真实数据；尚未接入的能力会在页面上明确标注，不做任何模拟。

var VIEWS = [
  { id: "dashboard", label: "工作台", render: renderDashboard },
  { id: "accounts", label: "平台账号", render: renderAccounts },
  { id: "monitors", label: "作品监控", render: renderMonitors },
  { id: "collections", label: "关键词采集", render: renderCollections },
  { id: "comment-watches", label: "评论监控", render: renderCommentWatches },
  { id: "danmaku-watches", label: "弹幕监控", render: renderDanmakuWatches },
  { id: "account-manager", label: "账号管理", render: renderAccountManager },
  { id: "tasks", label: "任务队列", render: renderRuns },
  { id: "publish", label: "发布", render: renderPublish },
  { id: "auto-comment", label: "自动评论", render: renderAutoComment },
  { id: "downloads", label: "链接下载", render: renderDownloads },
  { id: "notifications", label: "通知", render: renderNotifications },
  { id: "dev", label: "开发调试", render: renderDev },
  { id: "about", label: "关于", render: renderAbout }
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

  var config = null;
  var api = null;
  var sessionContext = opts.sessionContext || null;
  var current = null;
  var activeId = "dashboard";
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
    if (!api) { main.appendChild(h("div", { className: "sa-empty" }, "正在连接 RelayDeck 后端…")); return; }
    var view = null;
    for (var i = 0; i < VIEWS.length; i++) if (VIEWS[i].id === id) view = VIEWS[i];
    if (!view) return;
    current = view.render({
      h: h, api: api, host: host, config: config, events: events,
      sessionContext: sessionContext, clientCtx: opts.clientCtx, navigate: mountView
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

  var offSession = events.on("session-context", function (payload) { if (payload) sessionContext = payload; });

  host.resolveConfig().then(function (cfg) {
    if (disposed) return;
    config = cfg;
    api = createApiBridge(function (path, o) { return host.proxyFetch(path, o); });
    renderNav();
  }).catch(function () {
    if (disposed) return;
    config = { port: 18731, baseUrl: "http://127.0.0.1:18731", dataDir: "" };
    api = createApiBridge(function (path, o) { return host.proxyFetch(path, o); });
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
// RelayDeck host half (browser side) — config resolution, session context,
// event forwarding, and the same-origin proxy call.
//
// IMPORTANT: this file is bundled into client.js and runs in the RENDERER. A
// direct fetch to the loopback backend from here would be cross-origin, so every
// API call goes through /dsh-relaydeck/proxy, which the Node half registers.
var DEFAULT_PORT = 18731;
var CONFIG_PATH = "/dsh-relaydeck/config";
var PROXY_PATH = "/dsh-relaydeck/proxy";
var PANEL_ID = "dsh-relaydeck";
var CONFIG_TIMEOUT_MS = 3000;
var PROXY_TIMEOUT_MS = 15000;

/** The proxy is the only way the panel reaches the backend. */
function isProxyPath(value) {
  return typeof value === "string" && value.charAt(0) === "/";
}

function fetchHostConfig(fetchImpl) {
  var doFetch = fetchImpl || fetch;
  try {
    return doFetch(CONFIG_PATH, {
      signal: AbortSignal.timeout(CONFIG_TIMEOUT_MS),
      credentials: "same-origin",
      headers: { accept: "application/json" }
    }).then(function (res) { return res && res.ok ? res.json() : null; })
      .catch(function () { return null; });
  } catch (e) {
    return Promise.resolve(null);
  }
}

// Read the host's current session context through the optional uiSession service.
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
    if (ids.length === 0) return { available: true, sessionId: null, title: "(无会话)", running: false, sessionCount: 0 };
    var mainId = uiSession.mainRetainId && byId[uiSession.mainRetainId] ? uiSession.mainRetainId : ids[0];
    var session = byId[mainId] || {};
    return {
      available: true,
      sessionId: session.id || mainId,
      title: session.title || session.name || "(未命名会话)",
      messageCount: typeof session.messageCount === "number" ? session.messageCount : undefined,
      running: session.running === true || session.status === "running",
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

    /** Effective host config (port, data dir, dev flags). */
    resolveConfig: function () {
      return fetchHostConfig().then(function (cfg) {
        return cfg || { port: DEFAULT_PORT, baseUrl: "http://127.0.0.1:" + DEFAULT_PORT, source: "default" };
      });
    },

    /**
     * Call the RelayDeck backend through the host route. The browser never
     * touches the loopback port directly.
     */
    proxyFetch: function (path, options) {
      var opts = options || {};
      var timeoutMs = typeof opts.timeoutMs === "number" ? opts.timeoutMs : PROXY_TIMEOUT_MS;
      if (!isProxyPath(path)) return Promise.resolve({ ok: false, status: 0, data: null, error: "forbidden" });
      if (path !== "/health" && path.indexOf("/api/") !== 0) return Promise.resolve({ ok: false, status: 0, data: null, error: "forbidden" });
      var url = PROXY_PATH + "?path=" + encodeURIComponent(path);
      var init = {
        method: opts.method || "GET",
        credentials: "same-origin",
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(timeoutMs)
      };
      if (opts.body !== undefined) {
        init.headers["content-type"] = "application/json";
        init.body = JSON.stringify(opts.body);
      }
      return fetch(url, init).then(function (res) {
        return res.text().then(function (body) {
          var data = null;
          if (body.length > 0) { try { data = JSON.parse(body); } catch (e) { data = null; } }
          return { ok: res.ok, status: res.status, data: data };
        });
      }).catch(function (err) {
        return { ok: false, status: 0, data: null, error: String(err && err.message ? err.message : err) };
      });
    },

    /** Forward host events to the panel; the returned unsubscribe releases all. */
    subscribe: function (emit) {
      var disposers = [];
      function emitSafe(name, payload) { try { emit({ name: name, payload: payload }); } catch (e) { /* listener errors stay local */ } }

      try {
        if (ctx && typeof ctx.on === "function") {
          var onReset = ctx.on("connection/reset", function () { emitSafe("connection-reset", {}); });
          if (typeof onReset === "function") disposers.push(onReset);
        }
      } catch (e) { /* optional */ }

      try {
        var uiSession = ctx && typeof ctx.get === "function" ? ctx.get("uiSession") : undefined;
        if (uiSession && uiSession.sessions && uiSession.sessions.list && typeof uiSession.sessions.list.subscribe === "function") {
          var offList = uiSession.sessions.list.subscribe(function () { emitSafe("session-context", getSessionContext(ctx)); });
          if (typeof offList === "function") disposers.push(offList);
        }
      } catch (e) { /* optional */ }

      try {
        var remote = ctx && typeof ctx.get === "function" ? ctx.get("remote") : undefined;
        if (remote && typeof remote.$on === "function") {
          var offStatus = remote.$on("api-session/status", function (sessionId, running) {
            emitSafe("agent-status", { sessionId: sessionId, running: running === true });
          });
          if (typeof offStatus === "function") disposers.push(offStatus);
        }
      } catch (e) { /* optional */ }

      return function unsubscribe() {
        while (disposers.length > 0) {
          var dispose = disposers.pop();
          try { dispose(); } catch (e) { /* already gone */ }
        }
      };
    },

    openExternal: function (url) {
      try { window.open(url, "_blank", "noopener,noreferrer"); return true; } catch (e) { return false; }
    }
  };
}


// ---- lib/host/client.js ----
// SA Manager host half (browser side) — mounts the native panel into the DSH slot
// and owns its lifecycle. The bundle's apply() calls mountPanel once.

var PANEL_ID = "dsh-relaydeck";
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
  var host = createHostBridge(ctx, config);

  function SAManagerPanel() {
    var ref = React.useRef(null);
    React.useEffect(function () {
      var panel = createPanel(host, { injectCss: injectCss, sessionContext: getSessionContext(ctx), clientCtx: ctx });
      if (ref.current) ref.current.appendChild(panel.element);
      return function () { panel.dispose(); };
    }, []);
    return React.createElement("div", { ref: ref, className: "sa-manager-host" });
  }

  ctx.slots.inject("sidebar.panellist", function () {
    return ctx.slots.register({ name: "sidebar.panellist", id: PANEL_ID, order: 50, label: "RelayDeck" }, SAManagerIcon);
  });
  ctx.slots.inject("main", function () {
    return ctx.slots.register({ name: "main", key: PANEL_ID }, SAManagerPanel);
  });

  return { panelId: PANEL_ID, configPath: host.configPath };
}


    exports.apply = function (ctx, config) { return mountPanel(ctx, config); };
    exports.inject = ["slots", "remote"];
    exports.createHostBridge = createHostBridge;
    exports.fetchHostConfig = fetchHostConfig;
    exports.getSessionContext = getSessionContext;
    exports.createEventBus = createEventBus;
    exports.createPanel = createPanel;
    exports.CONFIG_PATH = CONFIG_PATH;
    exports.PROXY_PATH = PROXY_PATH;
    exports.PANEL_ID = PANEL_ID;
    return module.exports;
  }
});
