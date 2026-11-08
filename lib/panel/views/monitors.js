// 作品监控 — 盯住创作者，按间隔采集新作品。
import { renderArea } from "./_area.js";

export function renderMonitors(ctx) {
  return renderArea(ctx, {
    path: "monitors",
    title: "作品监控",
    description: "盯住指定创作者，按间隔采集新作品。",
    exportTable: "monitors",
    titleKey: "name",
    note: "抖音创作者监控会读取主页作品（需先登录抖音）；关键词监控走搜索。其余平台尚未接入。开启后按间隔自动扫描，也可点行内「扫描」立即执行。",
    fields: [
      { key: "platform", label: "平台", type: "select", options: [{"value":"douyin","label":"抖音"},{"value":"xhs","label":"小红书"},{"value":"kuaishou","label":"快手"},{"value":"shipinhao","label":"视频号"},{"value":"tiktok","label":"TikTok"}] },
      { key: "kind", label: "类型", type: "select", options: [{ value: "creator", label: "创作者" }, { value: "keyword", label: "关键词" }] },
      { key: "name", label: "名称", placeholder: "备注名，例如 露营小李" },
      { key: "ref", label: "标识/关键词", placeholder: "主页链接或关键词" },
      { key: "interval_seconds", label: "间隔(秒)", type: "number", value: "3600", width: "110px" }
    ],
    subtitle: function (r) { return (r.kind === "keyword" ? "关键词：" : "目标：") + (r.ref || "-") + " · 每 " + r.interval_seconds + " 秒"; },
    actions: [{
      label: "扫描",
      run: async function (row, api) {
        var res = await api.scanMonitor(row.id);
        var d = res.ok && res.data ? res.data : null;
        if (!d) return "扫描失败：" + (res.error || res.status);
        if (d.state === "ok") return "扫描完成：发现 " + d.found + " · 新增 " + d.added;
        if (d.state === "unsupported") return "该平台采集能力尚未接入";
        return "扫描失败：" + (d.error || d.state);
      }
    }]
  });
}
