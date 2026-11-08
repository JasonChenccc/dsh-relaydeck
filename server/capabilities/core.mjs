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
  }
]);

export { normalizeItem };
