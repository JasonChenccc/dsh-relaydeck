// 任务队列 — 采集 / 下载 / 发布 的待处理与历史，汇到一处。
import { h, clear, fmtTime } from "../dom.js";

var KIND = { run: "采集", plan: "发布", download: "下载" };
var STATE = { ok: "成功", failed: "失败", running: "运行中", draft: "待复核", approved: "已批准", prepared: "已准备", done: "已下载" };

export function renderRuns(ctx) {
  var api = ctx.api;
  var root = h("div", { className: "sa-view" });
  var timer = null;
  var disposed = false;
  var expanded = null;

  var summary = h("div", { className: "sa-row" });
  var list = h("div", { className: "sa-list" });
  root.appendChild(h("div", { className: "sa-section-title" }, "任务队列"));
  root.appendChild(summary);
  root.appendChild(list);

  function stepDot(state) { return state === "ok" ? " is-ok" : (state === "failed" ? " is-bad" : ""); }

  function stepsFor(run) {
    var box = h("div", { className: "sa-steps" });
    (run.steps || []).forEach(function (step) {
      box.appendChild(h("div", { className: "sa-step" }, [
        h("span", { className: "sa-step-dot" + stepDot(step.state) }),
        h("div", { className: "sa-step-main" }, [
          h("div", { className: "sa-step-title" }, step.stage + " · " + step.capability),
          h("div", { className: "sa-caption" }, "进入 " + step.in_count + " → 产出 " + step.out_count + (step.detail ? " · " + step.detail : "")),
          step.error ? h("div", { className: "sa-warn" }, step.error) : null
        ])
      ]));
    });
    return box;
  }

  async function toggle(kind, id, holder) {
    if (kind !== "run") return;
    if (expanded === id) { expanded = null; clear(holder); return; }
    expanded = id;
    var res = await api.run(id);
    clear(holder);
    if (res.ok && res.data) holder.appendChild(stepsFor(res.data));
  }

  function refresh() {
    if (disposed) return;
    api.queue().then(function (res) {
      if (disposed) return;
      clear(list);
      clear(summary);
      if (!res.ok || !res.data) { list.appendChild(h("div", { className: "sa-empty" }, "读取失败：" + (res.error || res.status))); return; }
      var s = res.data.summary || {};
      summary.appendChild(h("span", { className: "sa-chip" }, "运行 " + (s.runs || 0)));
      summary.appendChild(h("span", { className: "sa-chip" + (s.failed ? " is-bad" : "") }, "失败 " + (s.failed || 0)));
      summary.appendChild(h("span", { className: "sa-chip" }, "待发布 " + (s.pendingPlans || 0)));
      summary.appendChild(h("span", { className: "sa-chip is-ok" }, "已下载 " + (s.downloads || 0)));
      var items = Array.isArray(res.data.items) ? res.data.items : [];
      if (items.length === 0) { list.appendChild(h("div", { className: "sa-empty" }, "队列为空。")); return; }
      items.slice(0, 60).forEach(function (item) {
        var detail = h("div", { "data-detail": "" });
        var row = h("div", { className: "sa-list-row" }, [
          h("div", { className: "sa-row" }, [
            h("span", { className: "sa-dot", "data-state": item.state === "ok" || item.state === "done" ? "online" : (item.state === "failed" ? "offline" : "idle") }),
            h("span", { className: "sa-chip" }, KIND[item.kind] || item.kind),
            h("span", { style: { flex: 1, fontWeight: 600 } }, item.title),
            h("span", { className: "sa-state" }, STATE[item.state] || item.state),
            h("span", { className: "sa-caption" }, fmtTime(item.at)),
            item.kind === "run" ? h("button", { type: "button", className: "sa-btn", onClick: function () { toggle(item.kind, item.id, detail); } }, expanded === item.id ? "收起" : "轨迹") : null
          ]),
          h("div", { className: "sa-caption", style: { wordBreak: "break-all" } }, item.detail || ""),
          item.error ? h("div", { className: "sa-warn" }, item.error) : null,
          detail
        ]);
        list.appendChild(row);
      });
    });
  }

  function activate() { if (disposed || timer !== null) return; refresh(); timer = setInterval(refresh, 10000); }
  function deactivate() { if (timer === null) return; clearInterval(timer); timer = null; }
  return { element: root, activate: activate, deactivate: deactivate, dispose: function () { disposed = true; deactivate(); } };
}
