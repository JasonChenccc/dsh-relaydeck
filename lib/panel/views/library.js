// 素材 — 流程产出的内容产物。
import { renderList } from "./_list.js";
import { fmtTime } from "../dom.js";

export function renderLibrary(ctx) {
  var api = ctx.api;
  return renderList(ctx, {
    description: "流程产出的素材。",
    empty: "素材库还是空的——到「流程」跑一条试试。",
    columns: [
      { label: "平台", key: "platform" },
      { label: "标题", render: function (r) { return r.title || r.item_id; } },
      { label: "作者", render: function (r) { return r.author || "-"; } },
      { label: "下载", render: function (r) { return r.download_state === "none" ? "-" : r.download_state; } },
      { label: "采集时间", render: function (r) { return fmtTime(r.collected_at); } }
    ],
    load: function () { return api.artifacts(100); }
  });
}
