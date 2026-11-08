// 发布 — 待发布草稿与复核。
import { h, clear, fmtTime } from "../dom.js";

export function renderPublish(ctx) {
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
