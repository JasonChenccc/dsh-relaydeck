// 弹幕监控 — 盯住视频弹幕。
import { renderArea } from "./_area.js";

export function renderDanmakuWatches(ctx) {
  return renderArea(ctx, {
    path: "danmaku-watches",
    title: "弹幕监控",
    description: "盯住指定视频的弹幕。",
    titleKey: "title",
    note: "尚未接入：平台侧弹幕采集能力还没实现，因此这里只会显示你配置的监控项，不会有采集结果。",
    fields: [
      { key: "platform", label: "平台", type: "select", options: [{"value":"douyin","label":"抖音"},{"value":"xhs","label":"小红书"},{"value":"kuaishou","label":"快手"},{"value":"shipinhao","label":"视频号"},{"value":"tiktok","label":"TikTok"}] },
      { key: "title", label: "名称", placeholder: "备注名" },
      { key: "ref", label: "视频", placeholder: "视频链接或 ID" },
      { key: "interval_seconds", label: "间隔(秒)", type: "number", value: "1800", width: "110px" }
    ],
    subtitle: function (r) { return "目标：" + (r.ref || "-"); }
  });
}
