// 评论监控 — 盯住作品/账号的评论。
import { renderArea } from "./_area.js";

export function renderCommentWatches(ctx) {
  return renderArea(ctx, {
    path: "comment-watches",
    title: "评论监控",
    description: "盯住指定作品或账号的评论。",
    exportTable: "comment_watches",
    titleKey: "title",
    note: "抖音已接入评论采集（需要登录）。注意：该提取只在一批真实评论数据上做过结构核对，实际返回可能为空。",
    fields: [
      { key: "platform", label: "平台", type: "select", options: [{"value":"douyin","label":"抖音"},{"value":"xhs","label":"小红书"},{"value":"kuaishou","label":"快手"},{"value":"shipinhao","label":"视频号"},{"value":"tiktok","label":"TikTok"}] },
      { key: "title", label: "名称", placeholder: "备注名" },
      { key: "ref", label: "作品/账号", placeholder: "作品链接或账号" },
      { key: "interval_seconds", label: "间隔(秒)", type: "number", value: "1800", width: "110px" }
    ],
    subtitle: function (r) { return "目标：" + (r.ref || "-"); },
    actions: [{
      label: "扫描",
      run: async function (row, api) {
        var res = await api.scanWatch("comment-watches", row.id);
        var d = res.ok && res.data ? res.data : null;
        if (!d) return "扫描失败：" + (res.error || res.status);
        if (d.state === "ok") return "扫描完成：发现 " + d.found + " · 新增 " + d.added;
        if (d.state === "unsupported") return "该平台采集能力尚未接入";
        return "扫描失败：" + (d.error || d.state);
      }
    }]
  });
}
