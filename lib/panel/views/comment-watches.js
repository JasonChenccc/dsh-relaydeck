// 评论监控：只读列表。
import { renderList } from "./_list.js";
import { fmtTime } from "../dom.js";

export function renderCommentWatches(ctx) {
  var api = ctx.api;
  return renderList(ctx, {
    description: "评论监控目标。",
    empty: "暂无评论监控",
    columns: [
      { label: "标题", render: function (r) { return r.title || r.alias || "-"; } },
      { label: "平台", key: "platform" },
      { label: "启用", render: function (r) { return r.enabled ? "是" : "否"; } },
      { label: "评论数", render: function (r) { return r.comment_count === undefined ? "-" : r.comment_count; } },
      { label: "最近扫描", render: function (r) { return fmtTime(r.last_scan_at); } },
      { label: "错误", render: function (r) { return r.last_error || "-"; } }
    ],
    load: function () { return api.getCommentWatches(); }
  });
}
