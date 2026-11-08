// RelayDeck — built-in, platform-independent capabilities. They make a flow
// runnable before any platform is wired up, and stay useful afterwards.
import { registerAll } from "./index.mjs";
import { nowIso } from "../db.mjs";

function normalizeItem(raw, fallbackPlatform) {
  const item = raw && typeof raw === "object" ? raw : {};
  return {
    platform: String(item.platform || fallbackPlatform || "core"),
    item_id: String(item.item_id || item.id || ""),
    title: String(item.title || ""),
    author: String(item.author || ""),
    cover_url: String(item.cover_url || ""),
    media: Array.isArray(item.media) ? item.media : [],
    stats: item.stats && typeof item.stats === "object" ? item.stats : {},
    published_at: item.published_at ? String(item.published_at) : undefined
  };
}

registerAll([
  {
    id: "core.manual",
    platform: "core",
    stage: "source",
    title: "手动条目",
    description: "直接把条目写在流程里，用于测试流程编排或让 agent 投递素材。",
    params: { items: "条目数组" },
    async run({ params }) {
      const items = Array.isArray(params.items) ? params.items : [];
      return items.map((raw) => normalizeItem(raw, params.platform));
    }
  },
  {
    id: "core.stat",
    platform: "core",
    stage: "filter",
    title: "指标筛选",
    description: "按统计字段过滤，例如 like_count >= 1000。",
    params: { field: "统计字段名", op: ">= | > | <= | < | == | !=", value: "阈值" },
    async run({ params, items }) {
      const field = String(params.field || "");
      const op = String(params.op || ">=");
      const value = Number(params.value);
      const test = {
        ">=": (a, b) => a >= b, ">": (a, b) => a > b,
        "<=": (a, b) => a <= b, "<": (a, b) => a < b,
        "==": (a, b) => a === b, "!=": (a, b) => a !== b
      }[op];
      if (!field || typeof test !== "function" || Number.isNaN(value)) return items;
      return items.filter((item) => {
        const actual = Number(item.stats ? item.stats[field] : NaN);
        return !Number.isNaN(actual) && test(actual, value);
      });
    }
  },
  {
    id: "core.contains",
    platform: "core",
    stage: "filter",
    title: "文本筛选",
    description: "标题包含 / 排除指定词。",
    params: { include: "包含（逗号分隔）", exclude: "排除（逗号分隔）" },
    async run({ params, items }) {
      const inc = String(params.include || "").split(",").map((s) => s.trim()).filter(Boolean);
      const exc = String(params.exclude || "").split(",").map((s) => s.trim()).filter(Boolean);
      return items.filter((item) => {
        const title = String(item.title || "");
        if (inc.length && !inc.some((w) => title.includes(w))) return false;
        if (exc.length && exc.some((w) => title.includes(w))) return false;
        return true;
      });
    }
  },
  {
    id: "core.limit",
    platform: "core",
    stage: "filter",
    title: "数量上限",
    description: "只保留前 N 条。",
    params: { count: "上限条数" },
    async run({ params, items }) {
      const n = Number(params.count);
      return Number.isFinite(n) && n > 0 ? items.slice(0, n) : items;
    }
  },
  {
    id: "core.dedupe",
    platform: "core",
    stage: "filter",
    title: "去重（对比已存）",
    description: "丢掉数据库里已经存在的同平台同 ID 条目。",
    params: { scope: "global（默认）" },
    async run({ db, items }) {
      const seen = new Set(
        db.prepare("SELECT platform, item_id FROM artifacts").all().map((r) => r.platform + "\u0000" + r.item_id)
      );
      return items.filter((item) => !seen.has(item.platform + "\u0000" + item.item_id));
    }
  },
  {
    id: "core.store",
    platform: "core",
    stage: "action",
    title: "落库",
    description: "把当前条目写入素材库。",
    params: {},
    async run({ db, items, run }) {
      let saved = 0;
      for (const item of items) {
        if (!item.item_id) continue;
        db.prepare(
          "INSERT INTO artifacts (run_id, flow_id, platform, item_id, title, author, cover_url, media_json, stats_json, collected_at) " +
          "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) " +
          "ON CONFLICT(platform, item_id) DO UPDATE SET title = excluded.title, cover_url = excluded.cover_url, " +
          "media_json = excluded.media_json, stats_json = excluded.stats_json"
        ).run(run.id, run.flow_id, item.platform, item.item_id, item.title, item.author,
              item.cover_url, JSON.stringify(item.media), JSON.stringify(item.stats), nowIso());
        saved += 1;
      }
      return { detail: "写入 " + saved + " 条", saved };
    }
  },
  {
    id: "core.notify",
    platform: "core",
    stage: "action",
    title: "通知",
    description: "记录一条运行通知（M6 接入真实渠道）。",
    params: { message: "通知内容" },
    async run({ params, items }) {
      return { detail: "通知：" + String(params.message || "") + "（" + items.length + " 条）" };
    }
  },
  {
    id: "core.publishPlan",
    platform: "core",
    stage: "action",
    title: "生成发布计划",
    description: "把条目整理成待发布的草稿计划（标题/正文/标签/文件），供人工复核后再交给平台能力发布。",
    params: {
      target: "目标平台 id（douyin / xhs / kuaishou / shipinhao / tiktok）",
      titleTemplate: "标题模板，支持 {title} / {author}",
      bodyTemplate: "正文模板，支持 {title} / {author}",
      tags: "标签，逗号分隔",
      limit: "最多生成几条计划"
    },
    async run({ db, params, items, run }) {
      const target = String(params.target || "").trim();
      if (!target) throw new Error("core.publishPlan 需要 params.target（目标平台）");
      const limit = Number(params.limit) || 20;
      const tags = String(params.tags || "");
      const titleTpl = String(params.titleTemplate || "{title}");
      const bodyTpl = String(params.bodyTemplate || "{title} · 来自 {author}");
      const render = (tpl, item) => tpl.split("{title}").join(item.title || "").split("{author}").join(item.author || "");
      let created = 0;
      for (const item of items.slice(0, limit)) {
        const row = db.prepare("SELECT local_path FROM artifacts WHERE platform = ? AND item_id = ?").get(item.platform, item.item_id);
        const localPath = row && row.local_path ? row.local_path : "";
        db.prepare(
          "INSERT INTO publish_plans (run_id, flow_id, platform, status, title, body, tags, files_json, source_platform, created_at, updated_at) " +
          "VALUES (?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?)"
        ).run(run.id, run.flow_id, target, render(titleTpl, item), render(bodyTpl, item), tags,
              JSON.stringify(localPath ? [localPath] : []), item.platform, nowIso(), nowIso());
        created += 1;
      }
      return { detail: "生成 " + created + " 条发布草稿 → " + target, saved: 0 };
    }
  },
  {
    id: "core.demoFeed",
    platform: "core",
    stage: "source",
    title: "演示数据源",
    description: "不需要登录的离线数据源，用来验证整条流程链（筛选→落库→下载→发布计划）确实能跑通。",
    params: { count: "生成条数（默认 6）", platform: "伪装的来源平台（默认 douyin）", realMedia: "改为真实图片 URL 时填 1" },
    async run({ params }) {
      const count = Math.max(1, Math.min(Number(params.count) || 6, 50));
      const platform = String(params.platform || "douyin");
      const useReal = String(params.realMedia || "") === "1";
      const png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
      const media = (index) => useReal
        ? ["https://picsum.photos/seed/relaydeck" + index + "/240/135"]
        : [png];
      const items = [];
      for (let index = 1; index <= count; index += 1) {
        const likes = [120, 860, 1500, 2400, 7300, 55][index % 6];
        items.push({
          platform: platform,
          item_id: "demo-" + String(index).padStart(3, "0"),
          title: "演示作品 " + index + "（点赞 " + likes + "）",
          author: "演示作者 " + ((index % 3) + 1),
          cover_url: media(index)[0],
          media: media(index),
          stats: { like_count: likes, comment_count: likes % 97, share_count: likes % 31, play_count: likes * 12 },
          published_at: new Date(Date.now() - index * 3600_000).toISOString()
        });
      }
      return items;
    }
  }
]);

export { normalizeItem };
