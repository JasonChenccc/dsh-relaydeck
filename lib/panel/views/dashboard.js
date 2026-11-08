// 工作台 — 一行状态条、四个今日指标、近 7 天趋势、平台分布、最近运行。
import { h, clear, fmtTime } from "../dom.js";

export function renderDashboard(ctx) {
  var api = ctx.api;
  var events = ctx.events;
  var root = h("div", { className: "sa-view" });
  var disposers = [];
  var timer = null;
  var disposed = false;

  // ── 顶部状态条：后端 + 当前会话 ──
  var dot = h("span", { className: "sa-dot", "data-state": "idle" });
  var stateText = h("span", null, "检测中");
  var latency = h("span", { className: "sa-muted" }, "");
  var sessionText = h("span", null, "—");
  var refreshBtn = h("button", { type: "button", className: "sa-btn", onClick: refresh }, "刷新");
  root.appendChild(h("div", { className: "sa-strip" }, [
    h("span", { className: "sa-strip-main" }, [dot, stateText, latency]),
    h("span", { className: "sa-strip-sub" }, [h("span", null, "会话"), sessionText, refreshBtn])
  ]));

  function applySession(s) {
    if (!s || s.available === false) { sessionText.textContent = "宿主未提供"; return; }
    sessionText.textContent = (s.title || "(未命名)") + (s.running ? " · 运行中" : " · 空闲");
  }
  applySession(ctx.sessionContext);
  if (events && typeof events.on === "function") {
    disposers.push(events.on("session-context", applySession));
    disposers.push(events.on("agent-status", function (x) { if (x) applySession({ available: true, running: x.running === true }); }));
  }

  // ── 今日指标 ──
  var cards = h("div", { className: "sa-cards" });
  function card(label, hint) {
    var value = h("b", null, "0");
    var note = h("div", { className: "sa-caption" }, hint || "");
    cards.appendChild(h("div", { className: "sa-card" }, [value, h("span", { className: "sa-caption" }, label), note]));
    return { value: value, note: note };
  }
  var cRuns = card("今日运行", "vs 昨日");
  var cSaved = card("今日新增素材", "入库条数");
  var cFail = card("失败率", "全部历史");
  var cSched = card("定时任务", "已启用");
  root.appendChild(cards);

  // ── 近 7 天 ──
  var chartTitle = h("div", { className: "sa-row" }, [h("span", { className: "sa-section-title", style: { margin: 0 } }, "近 7 天")]);
  root.appendChild(chartTitle);
  root.appendChild(h("div", { className: "sa-legend" }, [
    h("span", null, [h("i", { style: { background: "var(--dsw-alias-brand-primary, #4f46e5)" } }), "发现"]),
    h("span", null, [h("i", { style: { background: "var(--dsw-alias-state-success-primary, #22c55e)" } }), "写入"])
  ]));
  var chart = h("div", { className: "sa-chart" });
  root.appendChild(chart);

  // ── 平台分布 ──
  root.appendChild(h("div", { className: "sa-section-title" }, "素材平台分布"));
  var dist = h("div", { className: "sa-dist" });
  root.appendChild(dist);

  // ── 最近运行 ──
  root.appendChild(h("div", { className: "sa-section-title" }, "最近运行"));
  var recent = h("div", { className: "sa-list" });
  root.appendChild(recent);

  function renderChart(days) {
    clear(chart);
    var list = days || [];
    var peak = 0;
    list.forEach(function (d) { peak = Math.max(peak, d.found, d.saved, d.runs); });
    if (peak === 0) {
      chart.appendChild(h("div", { className: "sa-chart-empty" }, "近 7 天还没有采集记录"));
      return;
    }
    var todayKey = list.length ? list[list.length - 1].day : "";
    list.forEach(function (d) {
      var stackH = 96;
      function barHeight(value, kind) {
        if (!value) return "0px";
        return Math.max(4, Math.round((value / peak) * stackH)) + "px";
      }
      var isToday = d.day === todayKey;
      chart.appendChild(h("div", { className: "sa-chart-col" }, [
        h("span", { className: "sa-chart-value" }, d.found || d.saved ? String(d.found) : ""),
        h("div", { className: "sa-chart-stack" }, [
          h("div", { className: "sa-chart-bar", style: { height: barHeight(d.found) }, title: "发现 " + d.found }),
          h("div", { className: "sa-chart-bar is-second", style: { height: barHeight(d.saved) }, title: "写入 " + d.saved })
        ]),
        h("span", { className: "sa-chart-label" + (isToday ? " is-today" : "") }, d.day.slice(5).replace("-", "/"))
      ]));
    });
  }

  function renderDist(rows) {
    clear(dist);
    if (!rows || rows.length === 0) { dist.appendChild(h("div", { className: "sa-empty" }, "还没有素材。")); return; }
    var peak = rows.reduce(function (m, r) { return Math.max(m, r.n); }, 0) || 1;
    rows.forEach(function (r) {
      dist.appendChild(h("div", { className: "sa-dist-row" }, [
        h("span", { className: "sa-dist-name" }, r.platform),
        h("div", { className: "sa-dist-track" }, [h("div", { className: "sa-dist-fill", style: { width: Math.round((r.n / peak) * 100) + "%" } })]),
        h("span", { className: "sa-dist-value" }, String(r.n))
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
      var yesterday = m.days.length >= 2 ? m.days[m.days.length - 2].runs : 0;
      cRuns.value.textContent = String(m.today.runs);
      cRuns.note.textContent = "昨日 " + yesterday;
      cSaved.value.textContent = String(m.today.saved);
      cSaved.note.textContent = "发现 " + m.today.found;
      cFail.value.textContent = m.total.runs === 0 ? "—" : (m.total.failureRate + "%");
      cFail.note.textContent = "共 " + m.total.runs + " 次运行";
      cSched.value.textContent = String(m.scheduled);
      cSched.note.textContent = m.scheduled === 0 ? "未配置定时" : "已启用";
      renderChart(m.days);
      renderDist(m.byPlatform);
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
