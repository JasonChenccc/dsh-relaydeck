// 工作台 — 后端健康、今日实况、近 7 天趋势、平台分布、最近运行。
import { h, clear, fmtTime } from "../dom.js";

export function renderDashboard(ctx) {
  var api = ctx.api;
  var events = ctx.events;
  var root = h("div", { className: "sa-view" });
  var disposers = [];
  var timer = null;
  var disposed = false;

  // 当前会话
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
    disposers.push(events.on("agent-status", function (x) { if (x) applySession({ available: true, running: x.running === true }); }));
  }

  // 健康
  var dot = h("span", { className: "sa-dot", "data-state": "idle" });
  var stateText = h("span", null, "检测中");
  var latency = h("span", { className: "sa-muted" }, "");
  var refreshBtn = h("button", { type: "button", className: "sa-btn", onClick: refresh }, "刷新");
  root.appendChild(h("div", { className: "sa-row" }, [dot, stateText, latency, refreshBtn]));

  // 今日四个指标
  var cards = h("div", { className: "sa-cards" });
  function card(label) {
    var value = h("b", null, "-");
    cards.appendChild(h("div", { className: "sa-card" }, [value, h("span", { className: "sa-caption" }, label)]));
    return value;
  }
  var cTodayRuns = card("今日运行");
  var cTodaySaved = card("今日新增素材");
  var cFailRate = card("失败率");
  var cScheduled = card("定时任务");
  root.appendChild(cards);

  // 近 7 天
  root.appendChild(h("div", { className: "sa-section-title" }, "近 7 天"));
  root.appendChild(h("div", { className: "sa-legend" }, [
    h("span", null, [h("i", { style: { background: "var(--dsw-alias-brand-primary, #4f46e5)" } }), "发现"]),
    h("span", null, [h("i", { style: { background: "var(--dsw-alias-state-success-primary, #22c55e)" } }), "写入"])
  ]));
  var chart = h("div", { className: "sa-chart" });
  root.appendChild(chart);

  // 平台分布
  root.appendChild(h("div", { className: "sa-section-title" }, "素材平台分布"));
  var platformRow = h("div", { className: "sa-row" });
  root.appendChild(platformRow);

  root.appendChild(h("div", { className: "sa-section-title" }, "最近运行"));
  var recent = h("div", { className: "sa-list" });
  root.appendChild(recent);

  function renderChart(days) {
    clear(chart);
    var peak = 1;
    (days || []).forEach(function (d) { peak = Math.max(peak, d.found, d.saved); });
    (days || []).forEach(function (d) {
      var label = d.day.slice(5).replace("-", "/");
      chart.appendChild(h("div", { className: "sa-chart-col" }, [
        h("div", { className: "sa-row-inline", style: { alignItems: "flex-end", gap: "2px", height: "100%" } }, [
          h("div", { className: "sa-chart-bar", style: { height: Math.round((d.found / peak) * 80) + "%" } }),
          h("div", { className: "sa-chart-bar is-second", style: { height: Math.round((d.saved / peak) * 80) + "%" } })
        ]),
        h("span", { className: "sa-chart-label" }, label)
      ]));
    });
  }

  function refresh() {
    if (disposed) return;
    refreshBtn.disabled = true;
    api.health().then(function (res) {
      if (disposed) return;
      refreshBtn.disabled = false;
      dot.dataset.state = res.ok ? "online" : "offline";
      stateText.textContent = res.ok ? "后端在线" : "后端离线";
      latency.textContent = res.ok ? ((res.latencyMs || 0) + " ms") : (res.error || "");
    });
    api.metrics().then(function (res) {
      if (disposed) return;
      var m = res.ok && res.data ? res.data : null;
      if (!m) return;
      cTodayRuns.textContent = String(m.today.runs);
      cTodaySaved.textContent = String(m.today.saved);
      cFailRate.textContent = m.total.runs === 0 ? "—" : (m.total.failureRate + "%");
      cScheduled.textContent = String(m.scheduled);
      renderChart(m.days);
      clear(platformRow);
      if (!m.byPlatform || m.byPlatform.length === 0) {
        platformRow.appendChild(h("span", { className: "sa-caption" }, "还没有素材。"));
      } else {
        m.byPlatform.forEach(function (x) { platformRow.appendChild(h("span", { className: "sa-chip" }, x.platform + " " + x.n)); });
      }
    });
    api.runs(8).then(function (res) {
      if (disposed) return;
      clear(recent);
      var items = res.ok && res.data && Array.isArray(res.data.items) ? res.data.items : [];
      if (items.length === 0) { recent.appendChild(h("div", { className: "sa-empty" }, "还没有运行记录 —— 去「关键词采集」或「作品监控」建一条。")); return; }
      items.forEach(function (run) {
        recent.appendChild(h("div", { className: "sa-row sa-list-row" }, [
          h("span", { className: "sa-dot", "data-state": run.state === "ok" ? "online" : (run.state === "failed" ? "offline" : "idle") }),
          h("span", { style: { flex: 1 } }, run.flow_name || ("任务 " + run.flow_id)),
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
    dispose: function () { disposed = true; deactivate(); while (disposers.length) { try { disposers.pop()(); } catch (e) {} } }
  };
}
