// 能力 — agent 与流程可用的动作面，按阶段分组。
import { h, clear } from "../dom.js";

var STAGE_LABEL = { source: "源（产出条目）", filter: "筛选（收窄条目）", action: "动作（消费条目）" };

export function renderCapabilities(ctx) {
  var api = ctx.api;
  var root = h("div", { className: "sa-view" });
  var timer = null;
  var disposed = false;
  var body = h("div", { className: "sa-list" });

  root.appendChild(h("div", { className: "sa-caption" }, "每个能力都能被流程引用，也能由 agent 通过 relaydeck_* 工具间接驱动。加一个平台 = 注册一组能力，所有流程立刻可用。"));
  root.appendChild(body);

  function refresh() {
    if (disposed) return;
    api.capabilities().then(function (res) {
      if (disposed) return;
      clear(body);
      var items = res.ok && res.data && Array.isArray(res.data.items) ? res.data.items : [];
      if (items.length === 0) { body.appendChild(h("div", { className: "sa-empty" }, "后端没有注册任何能力。")); return; }
      var groups = { source: [], filter: [], action: [] };
      items.forEach(function (cap) { (groups[cap.stage] || (groups[cap.stage] = [])).push(cap); });
      Object.keys(groups).forEach(function (stage) {
        if (groups[stage].length === 0) return;
        body.appendChild(h("div", { className: "sa-section-title" }, STAGE_LABEL[stage] || stage));
        groups[stage].forEach(function (cap) {
          body.appendChild(h("div", { className: "sa-card" }, [
            h("div", { className: "sa-row" }, [
              h("span", { style: { fontWeight: 600 } }, cap.title || cap.id),
              h("span", { className: "sa-caption" }, cap.id)
            ]),
            h("div", { className: "sa-caption" }, cap.description || "")
          ]));
        });
      });
    });
  }

  function activate() { if (disposed || timer !== null) return; refresh(); timer = setInterval(refresh, 10000); }
  function deactivate() { if (timer === null) return; clearInterval(timer); timer = null; }
  return { element: root, activate: activate, deactivate: deactivate, dispose: function () { disposed = true; deactivate(); } };
}
