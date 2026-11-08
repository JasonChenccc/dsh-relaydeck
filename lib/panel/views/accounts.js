// 账号 — 平台凭据与登录态。
import { renderList } from "./_list.js";
import { fmtTime } from "../dom.js";

export function renderAccounts(ctx) {
  var api = ctx.api;
  return renderList(ctx, {
    description: "平台凭据（Cookie / 登录态）。当前版本尚未接入登录流程，这里会随平台能力上线而出现条目。",
    empty: "还没有绑定任何账号。",
    columns: [
      { label: "平台", key: "platform" },
      { label: "名称", render: function (r) { return r.label || r.nickname || "-"; } },
      { label: "状态", key: "state" },
      { label: "代理", render: function (r) { return r.proxy ? "已配置" : "直连"; } },
      { label: "最近使用", render: function (r) { return fmtTime(r.last_used_at); } }
    ],
    load: function () { return api.bindings(); }
  });
}
