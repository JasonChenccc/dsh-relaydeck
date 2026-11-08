// 通知 — 通知渠道配置。
import { renderArea } from "./_area.js";

export function renderNotifications(ctx) {
  return renderArea(ctx, {
    path: "notifications",
    title: "通知",
    description: "流程结束、采集完成、失败告警的推送渠道。",
    exportTable: "notifications",
    titleKey: "name",
    note: "Webhook / 钉钉 / 飞书 会真实发送；「桌面通知」类型尚未接入。流程失败会自动推送，流程完成也会推送。",
    fields: [
      { key: "name", label: "名称", placeholder: "例如 我的钉钉群" },
      { key: "type", label: "类型", type: "select", options: [{ value: "webhook", label: "Webhook" }, { value: "desktop", label: "桌面通知" }] },
      { key: "config_json", label: "配置(JSON)", placeholder: '{"url":"..."}' }
    ],
    subtitle: function (r) { return r.type + " · " + (r.config_json || "{}").slice(0, 60); },
    actions: [{
      label: "测试",
      run: async function (row, api) {
        var res = await api.testNotification(row.id);
        var r = res.ok && res.data ? res.data.result : null;
        if (!r) return "测试失败：" + (res.error || res.status);
        return r.ok ? ("已发送（HTTP " + r.status + "）") : ("发送失败：" + (r.error || r.status));
      }
    }]
  });
}
