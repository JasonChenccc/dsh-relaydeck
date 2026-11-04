// 发布：只读列表。
import { renderList } from "./_list.js";
import { fmtTime } from "../dom.js";

export function renderPublish(ctx) {
  var api = ctx.api;
  return renderList(ctx, {
    description: "发布任务与已发布记录。",
    empty: "暂无发布任务",
    columns: [
      { label: "标题", render: function (r) { return r.title || "-"; } },
      { label: "平台", key: "platform" },
      { label: "类型", key: "media_type" },
      { label: "状态", key: "status" },
      { label: "计划时间", render: function (r) { return fmtTime(r.scheduled_at); } },
      { label: "结果", render: function (r) { return r.error || r.result_url || "-"; } }
    ],
    load: function () { return api.getPublish(); }
  });
}
