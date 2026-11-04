// 链接下载：只读历史。
import { renderList } from "./_list.js";
import { fmtTime } from "../dom.js";

export function renderDownloads(ctx) {
  var api = ctx.api;
  return renderList(ctx, {
    description: "分享链接解析与下载历史。",
    empty: "暂无下载记录",
    columns: [
      { label: "标题", render: function (r) { return r.title || "-"; } },
      { label: "平台", key: "platform" },
      { label: "状态", key: "status" },
      { label: "媒体数", key: "media_count" },
      { label: "作者", render: function (r) { return r.author || "-"; } },
      { label: "时间", render: function (r) { return fmtTime(r.created_at); } }
    ],
    load: function () { return api.getShareHistory(); }
  });
}
