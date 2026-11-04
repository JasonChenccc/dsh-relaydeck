// 任务队列：只读列表 + 状态筛选。
import { renderList } from "./_list.js";
import { fmtTime } from "../dom.js";

var STATES = ["active", "all", "pending", "running", "blocked", "failed", "completed"];

export function renderTasks(ctx) {
  var api = ctx.api;
  return renderList(ctx, {
    description: "统一任务队列（采集 / 发布 / 评论 / 操作 / 下载）。",
    empty: "当前筛选下没有任务",
    filters: [{
      id: "state",
      value: "active",
      options: STATES.map(function (s) { return { value: s, label: s }; })
    }],
    columns: [
      { label: "队列", render: function (r) { return r.queue_label || r.queue || "-"; } },
      { label: "标题", render: function (r) { return r.title || r.detail || "-"; } },
      { label: "状态", render: function (r) { return r.state || r.status || "-"; } },
      { label: "时间", render: function (r) { return fmtTime(r.scheduled_at || r.created_at); } }
    ],
    load: function (s) { return api.getTasks({ state: s.state, page: 1, pageSize: 20 }); }
  });
}
