// 通知：只读列表。
import { renderList } from "./_list.js";
import { fmtTime } from "../dom.js";

export function renderNotifications(ctx) {
  var api = ctx.api;
  return renderList(ctx, {
    description: "通知渠道配置。",
    empty: "暂无通知渠道",
    columns: [
      { label: "名称", render: function (r) { return r.name || "-"; } },
      { label: "类型", key: "type" },
      { label: "启用", render: function (r) { return r.enabled ? "是" : "否"; } },
      { label: "创建时间", render: function (r) { return fmtTime(r.created_at); } }
    ],
    load: function () { return api.getNotifications(); }
  });
}
