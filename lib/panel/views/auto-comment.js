// 自动评论 — 规则配置。
import { renderArea } from "./_area.js";

export function renderAutoComment(ctx) {
  return renderArea(ctx, {
    path: "comment-rules",
    title: "自动评论",
    description: "配置自动评论规则。默认关闭，且需要人工复核。",
    titleKey: "name",
    note: "尚未接入：评论发送能力还没实现。规则创建后默认停用，不会产生任何自动行为。",
    fields: [
      { key: "platform", label: "平台", type: "select", options: [{"value":"douyin","label":"抖音"},{"value":"xhs","label":"小红书"},{"value":"kuaishou","label":"快手"},{"value":"shipinhao","label":"视频号"},{"value":"tiktok","label":"TikTok"}] },
      { key: "name", label: "规则名", placeholder: "例如 露营视频感谢" },
      { key: "mode", label: "模式", type: "select", options: [{ value: "review", label: "人工复核" }, { value: "auto", label: "自动发送" }] },
      { key: "target_ref", label: "目标", placeholder: "作品或账号" },
      { key: "templates", label: "回复模板", placeholder: "多条用 | 分隔" },
      { key: "daily_cap", label: "每日上限", type: "number", value: "20", width: "100px" }
    ],
    subtitle: function (r) { return "模式 " + r.mode + " · 上限 " + r.daily_cap + "/天 · 目标 " + (r.target_ref || "-"); }
  });
}
