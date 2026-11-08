// 作品监控 — 盯住创作者，按间隔采集新作品。
import { renderArea } from "./_area.js";

export function renderMonitors(ctx) {
  return renderArea(ctx, {
    path: "monitors",
    title: "作品监控",
    description: "盯住指定创作者，按间隔采集新作品。",
    titleKey: "name",
    note: "采集能力：抖音已支持主页作品读取；其余平台的监控采集尚未接入。",
    fields: [
      { key: "platform", label: "平台", type: "select", options: [{"value":"douyin","label":"抖音"},{"value":"xhs","label":"小红书"},{"value":"kuaishou","label":"快手"},{"value":"shipinhao","label":"视频号"},{"value":"tiktok","label":"TikTok"}] },
      { key: "kind", label: "类型", type: "select", options: [{ value: "creator", label: "创作者" }, { value: "keyword", label: "关键词" }] },
      { key: "name", label: "名称", placeholder: "备注名，例如 露营小李" },
      { key: "ref", label: "标识/关键词", placeholder: "主页链接或关键词" },
      { key: "interval_seconds", label: "间隔(秒)", type: "number", value: "3600", width: "110px" }
    ],
    subtitle: function (r) { return (r.kind === "keyword" ? "关键词：" : "目标：") + (r.ref || "-") + " · 每 " + r.interval_seconds + " 秒"; }
  });
}
