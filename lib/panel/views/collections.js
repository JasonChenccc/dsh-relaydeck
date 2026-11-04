// 关键词采集：只读列表。
import { renderList } from "./_list.js";
import { fmtTime } from "../dom.js";

export function renderCollections(ctx) {
  var api = ctx.api;
  return renderList(ctx, {
    description: "关键词采集任务。",
    empty: "暂无采集任务",
    columns: [
      { label: "平台", key: "platform" },
      { label: "来源", key: "source_type" },
      { label: "关键词", render: function (r) { return r.keywords || "-"; } },
      { label: "状态", key: "status" },
      { label: "当前关键词", key: "current_keyword" },
      { label: "创建时间", render: function (r) { return fmtTime(r.created_at); } }
    ],
    load: function () { return api.getCollections(); }
  });
}
