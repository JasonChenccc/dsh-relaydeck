// 评论监控 — 盯住作品/账号的评论。
import { renderArea } from "./_area.js";

export function renderCommentWatches(ctx) {
  return renderArea(ctx, {
    path: "comment-watches",
    title: "评论监控",
    description: "盯住指定作品或账号的评论。",
    titleKey: "title",
    note: "尚未接入：平台侧评论采集能力还没实现，因此这里只会显示你配置的监控项，不会有采集结果。",
    fields: [
      { key: "platform", label: "平台", type: "select", options: [{"value":"douyin","label":"抖音"},{"value":"xhs","label":"小红书"},{"value":"kuaishou","label":"快手"},{"value":"shipinhao","label":"视频号"},{"value":"tiktok","label":"TikTok"}] },
      { key: "title", label: "名称", placeholder: "备注名" },
      { key: "ref", label: "作品/账号", placeholder: "作品链接或账号" },
      { key: "interval_seconds", label: "间隔(秒)", type: "number", value: "1800", width: "110px" }
    ],
    subtitle: function (r) { return "目标：" + (r.ref || "-"); }
  });
}
