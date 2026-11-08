// 运行 — 每次执行的轨迹：哪个阶段、进了多少、出了多少、错在哪。
import { h, clear, fmtTime } from "../dom.js";

export function renderRuns(ctx) {
  var api = ctx.api;
  var root = h("div", { className: "sa-view" });
  var timer = null;
  var disposed = false;
  var list = h("div", { className: "sa-list" });
  var detail = h("div", { className: "sa-list" });

  root.appendChild(h("div", { className: "sa-section-title" }, "运行历史"));
  root.appendChild(list);
  root.appendChild(h("div", { className: "sa-section-title" }, "轨迹"));
  root.appendChild(detail);

  async function showRun(id) {
    clear(detail);
    var res = await api.run(id);
    if (!res.ok || !res.data) { detail.appendChild(h("div", { className: "sa-empty" }, "读取失败：" + (res.error || res.status))); return; }
    var run = res.data;
    detail.appendChild(h("div", { className: "sa-row" }, [
      h("span", { style: { fontWeight: 600 } }, "运行 #" + run.id + " " + run.state),
      h("span", { className: "sa-caption" }, "发现 " + run.found + " · 保留 " + run.kept + " · 写入 " + run.saved + (run.error ? " · " + run.error : ""))
    ]));
    (run.steps || []).forEach(function (step) {
      detail.appendChild(h("div", { className: "sa-row sa-list-row" }, [
        h("span", { className: "sa-dot", "data-state": step.state === "ok" ? "online" : "offline" }),
        h("span", { style: { width: "54px" } }, step.stage),
        h("span", { style: { flex: 1 } }, step.capability),
        h("span", { className: "sa-caption" }, "in " + step.in_count + " → out " + step.out_count),
        step.detail ? h("span", { className: "sa-caption" }, step.detail) : null,
        step.error ? h("span", { className: "sa-warn" }, step.error) : null
      ]));
    });
  }

  function refresh() {
    if (disposed) return;
    api.runs(30).then(function (res) {
      if (disposed) return;
      clear(list);
      var items = res.ok && res.data && Array.isArray(res.data.items) ? res.data.items : [];
      if (items.length === 0) { list.appendChild(h("div", { className: "sa-empty" }, "还没有运行记录。")); return; }
      items.forEach(function (run) {
        var row = h("div", { className: "sa-row sa-list-row", style: { cursor: "pointer" }, onClick: function () { showRun(run.id); } }, [
          h("span", { className: "sa-dot", "data-state": run.state === "ok" ? "online" : (run.state === "failed" ? "offline" : "idle") }),
          h("span", { style: { width: "58px" } }, "#" + run.id),
          h("span", { style: { flex: 1 } }, run.flow_name || "-"),
          h("span", { className: "sa-caption" }, run.state),
          h("span", { className: "sa-caption" }, fmtTime(run.started_at))
        ]);
        list.appendChild(row);
      });
    });
  }

  function activate() { if (disposed || timer !== null) return; refresh(); timer = setInterval(refresh, 10000); }
  function deactivate() { if (timer === null) return; clearInterval(timer); timer = null; }
  return { element: root, activate: activate, deactivate: deactivate, dispose: function () { disposed = true; deactivate(); } };
}
