// 自动评论：规则 + 评论任务两张只读表，共用一个 10 s 轮询。
import { h, clear, fmtTime } from "../dom.js";

export function renderAutoComment(ctx) {
  var api = ctx.api;
  var root = h("div", { className: "sa-view" });
  var timer = null;
  var disposed = false;

  var rulesBody = h("tbody", null);
  var tasksBody = h("tbody", null);

  function table(headers, body) {
    return h("table", { className: "sa-table" }, [
      h("thead", null, [h("tr", null, headers.map(function (label) { return h("th", null, label); }))]),
      body
    ]);
  }

  function fill(body, res, width, emptyText, cells) {
    clear(body);
    if (!res || res.ok !== true) {
      body.appendChild(h("tr", null, [h("td", { colSpan: width }, [h("div", { className: "sa-empty" }, "加载失败：" + (res && res.error ? res.error : ""))])]));
      return;
    }
    var items = Array.isArray(res.data) ? res.data : (res.data && Array.isArray(res.data.items) ? res.data.items : []);
    if (items.length === 0) {
      body.appendChild(h("tr", null, [h("td", { colSpan: width }, [h("div", { className: "sa-empty" }, emptyText)])]));
      return;
    }
    items.forEach(function (row) {
      body.appendChild(h("tr", null, cells(row).map(function (value) {
        return h("td", null, value === undefined || value === null || value === "" ? "-" : String(value));
      })));
    });
  }

  root.appendChild(h("div", { className: "sa-section-title" }, "自动评论规则"));
  root.appendChild(table(["名称", "模式", "启用", "每日上限"], rulesBody));
  root.appendChild(h("div", { className: "sa-section-title" }, "评论任务"));
  root.appendChild(table(["目标", "内容", "状态", "错误", "时间"], tasksBody));

  function refresh() {
    if (disposed) return;
    api.getCommentRules().then(function (res) {
      if (disposed) return;
      fill(rulesBody, res, 4, "暂无自动评论规则", function (r) {
        return [r.name || "-", r.mode || "-", r.enabled ? "是" : "否", r.daily_cap];
      });
    });
    api.getCommentTasks().then(function (res) {
      if (disposed) return;
      fill(tasksBody, res, 5, "暂无评论任务", function (r) {
        return [r.target_nick || r.target_comment_id || "-", r.content || "-", r.status || "-", r.error || "-", fmtTime(r.created_at)];
      });
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

  return { element: root, activate: activate, deactivate: deactivate, dispose: function () { disposed = true; deactivate(); } };
}
