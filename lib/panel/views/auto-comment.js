// 自动评论 — 规则配置。
import { renderArea } from "./_area.js";

export function renderAutoComment(ctx) {
  return renderArea(ctx, {
    path: "comment-rules",
    title: "自动评论",
    description: "保存回复模板与目标。不会自动发送，只用于人工复核后手动发出。",
    exportTable: "comment_rules",
    titleKey: "name",
    note: "本板块**不做自动发送**。规则只用来保存模板与目标；实际回复走「准备回复」：把内容填进评论框，由你人工确认发送。这是刻意限制——自动评论是唯一可能直接导致账号受限的功能。",
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
