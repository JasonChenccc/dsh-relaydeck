// 作品监控：只读列表。
import { renderList } from "./_list.js";
import { fmtTime } from "../dom.js";

export function renderMonitors(ctx) {
  var api = ctx.api;
  return renderList(ctx, {
    description: "监控中的博主 / 关键词目标。",
    empty: "暂无监控目标",
    columns: [
      { label: "昵称", render: function (r) { return r.nickname || r.alias || "-"; } },
      { label: "平台", key: "platform" },
      { label: "类型", key: "target_kind" },
      { label: "启用", render: function (r) { return r.enabled ? "是" : "否"; } },
      { label: "间隔(秒)", key: "interval_seconds" },
      { label: "最近扫描", render: function (r) { return fmtTime(r.last_scan_at); } },
      { label: "错误", render: function (r) { return r.last_error || "-"; } }
    ],
    load: function () { return api.getMonitors(); }
  });
}
