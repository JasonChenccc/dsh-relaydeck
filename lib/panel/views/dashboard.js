// 看板 — 状态、规模、近 7 天趋势、最近运行。
import { h, clear, fmtTime } from "../dom.js";

function last7Days() {
  var days = [];
  var now = new Date();
  for (var i = 6; i >= 0; i -= 1) {
    var d = new Date(now.getTime() - i * 86400000);
    days.push({ key: d.toISOString().slice(0, 10), label: (d.getMonth() + 1) + "/" + d.getDate() });
  }
  return days;
}

export function renderDashboard(ctx) {
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
