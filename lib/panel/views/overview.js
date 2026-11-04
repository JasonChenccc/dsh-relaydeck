// 工作概览：当前会话 + 健康灯 + 配置来源 + 总览卡片 + 近 7 天数字趋势 + 快捷操作。
import { h } from "../dom.js";
import { PLATFORM_OPTIONS } from "../bridge.js";

export function renderOverview(ctx) {
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
