// 运行 — 时间线视图：每次运行展开成可视化的步骤。
import { h, clear, fmtTime } from "../dom.js";

var STAGE_LABEL = { source: "取内容", filter: "筛选", action: "执行" };

export function renderRuns(ctx) {
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
