// 平台账号：只读列表 + 平台白名单筛选。
import { renderList } from "./_list.js";
import { PLATFORM_OPTIONS } from "../bridge.js";
import { fmtTime } from "../dom.js";

export function renderAccounts(ctx) {
  var api = ctx.api;
  return renderList(ctx, {
    description: "CreatorHub 已添加的平台账号。",
    empty: "暂无账号",
    filters: [{ id: "platform", value: "", options: PLATFORM_OPTIONS }],
    columns: [
      { label: "昵称", render: function (r) { return r.nickname || r.douyin_id || r.uid || "-"; } },
      { label: "平台", key: "platform" },
      { label: "粉丝", render: function (r) { return r.follower_count === undefined ? "-" : r.follower_count; } },
      { label: "状态", key: "status" },
      { label: "代理", render: function (r) { return r.proxy ? "已配置" : "直连"; } },
      { label: "更新时间", render: function (r) { return fmtTime(r.updated_at || r.created_at); } }
    ],
    load: function (s) { return api.getAccounts(s.platform); }
  });
}
