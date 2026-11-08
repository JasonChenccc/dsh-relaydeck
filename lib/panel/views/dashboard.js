// 看板 — 一屏看清：后端健康、流转规模、最近运行、当前会话。
import { h, clear, fmtTime } from "../dom.js";

export function renderDashboard(ctx) {
  var api = ctx.api;
  var events = ctx.events;
  var root = h("div", { className: "sa-view" });
  var disposers = [];
  var timer = null;
  var disposed = false;

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
      session.running ? "运行中" : "空闲"
    ].filter(Boolean).join(" · ");
    sessionDot.dataset.state = session.running ? "online" : "idle";
  }
  applySession(ctx.sessionContext);
  if (events && typeof events.on === "function") {
    disposers.push(events.on("session-context", applySession));
    disposers.push(events.on("agent-status", function (payload) {
      if (payload) applySession({ available: true, running: payload.running === true });
    }));
  }

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
  var cBindings = card("账号");
  root.appendChild(cards);

  root.appendChild(h("div", { className: "sa-section-title" }, "最近运行"));
  var recent = h("div", { className: "sa-list" });
  root.appendChild(recent);

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
      var counts = data && data.counts ? data.counts : {};
      cFlows.textContent = String(counts.flows === undefined ? "-" : counts.flows);
      cRuns.textContent = String(counts.runs === undefined ? "-" : counts.runs);
      cArtifacts.textContent = String(counts.artifacts === undefined ? "-" : counts.artifacts);
      cBindings.textContent = String(counts.bindings === undefined ? "-" : counts.bindings);
    });
    api.runs(8).then(function (res) {
      if (disposed) return;
      clear(recent);
      var items = res.ok && res.data && Array.isArray(res.data.items) ? res.data.items : [];
      if (items.length === 0) { recent.appendChild(h("div", { className: "sa-empty" }, "还没有运行记录。到「流程」建一条并执行。")); return; }
      items.forEach(function (run) {
        recent.appendChild(h("div", { className: "sa-row sa-list-row" }, [
          h("span", { className: "sa-dot", "data-state": run.state === "ok" ? "online" : (run.state === "failed" ? "offline" : "idle") }),
          h("span", { style: { flex: 1 } }, run.flow_name || ("流程 " + run.flow_id)),
          h("span", { className: "sa-caption" }, "发现 " + run.found + " · 保留 " + run.kept + " · 写入 " + run.saved),
          h("span", { className: "sa-caption" }, fmtTime(run.started_at))
        ]));
      });
    });
  }

  function activate() { if (disposed || timer !== null) return; refresh(); timer = setInterval(refresh, 10000); }
  function deactivate() { if (timer === null) return; clearInterval(timer); timer = null; }

  return {
    element: root,
    activate: activate,
    deactivate: deactivate,
    dispose: function () {
      disposed = true;
      deactivate();
      while (disposers.length > 0) { try { disposers.pop()(); } catch (e) { /* gone */ } }
    }
  };
}
