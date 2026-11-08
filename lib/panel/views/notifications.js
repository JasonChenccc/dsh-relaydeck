// 通知 — 通知渠道配置。
import { renderArea } from "./_area.js";

export function renderNotifications(ctx) {
  return renderArea(ctx, {
    path: "notifications",
    title: "通知",
    description: "流程结束、采集完成、失败告警的推送渠道。",
    titleKey: "name",
    note: "尚未接入：推送发送还没实现，配置会保存但不会真正发出通知。",
    fields: [
      { key: "name", label: "名称", placeholder: "例如 我的钉钉群" },
      { key: "type", label: "类型", type: "select", options: [{ value: "webhook", label: "Webhook" }, { value: "desktop", label: "桌面通知" }] },
      { key: "config_json", label: "配置(JSON)", placeholder: '{"url":"..."}' }
    ],
    subtitle: function (r) { return r.type + " · " + (r.config_json || "{}").slice(0, 60); }
  });
}
