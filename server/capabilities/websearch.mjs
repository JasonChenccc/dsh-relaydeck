// RelayDeck — generic browser-driven search for every platform.
//
// One implementation serves all platforms: open the platform\u2019s own search
// page, let the page sign and issue its requests, capture the JSON responses off
// the wire, then map recognisable shapes into items. A platform only needs an
// entry in platforms.mjs (search URL + response matcher).
import { register } from "./index.mjs";
import { ensureBrowser } from "../browser/session.mjs";
import { openPage } from "../browser/cdp.mjs";
import { platformIds, platform, searchPlan } from "../platforms.mjs";

function urls(value) {
  if (!value) return [];
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(urls);
  if (typeof value === "object") {
    if (Array.isArray(value.url_list)) return value.url_list.filter((u) => typeof u === "string");
    if (typeof value.url === "string") return [value.url];
    if (typeof value.url_default === "string") return [value.url_default];
  }
  return [];
}

function firstUrl() {
  for (const value of arguments) {
    const hit = urls(value)[0];
    if (hit) return hit;
  }
  return "";
}

/** Recognise an item across the shapes these platforms use. */
function toItem(platformId, raw) {
  if (!raw || typeof raw !== "object") return null;
  const node = raw.aweme_info || raw.note_card || raw.note || raw.video || raw.item || raw;
  const id = node.aweme_id || node.note_id || node.id || node.item_id || raw.id;
  if (!id) return null;
  const stats = node.statistics || node.stats || node.interact_info || {};
  const author = node.author || node.user || node.nickname || {};
  const images = Array.isArray(node.images) ? node.images : (Array.isArray(node.image_list) ? node.image_list : []);
  const media = [
    ...urls(node.video && node.video.play_addr),
    ...urls(node.video && node.video.bit_rate),
    ...images.flatMap(urls),
    ...urls(node.cover),
    ...urls(node.video && node.video.cover)
  ];
  return {
    platform: platformId,
    item_id: String(id),
    title: String(node.desc || node.title || node.display_title || ""),
    author: String((typeof author === "string" ? author : (author.nickname || author.name)) || ""),
    cover_url: firstUrl(node.cover, node.video && node.video.cover, images[0]),
    media: [...new Set(media)],
    stats: {
      like_count: Number(stats.digg_count || stats.liked_count || stats.like_count || 0),
      comment_count: Number(stats.comment_count || 0),
      share_count: Number(stats.share_count || 0),
      play_count: Number(stats.play_count || stats.view_count || 0),
      collect_count: Number(stats.collect_count || stats.collected_count || 0)
    }
  };
}

const LIST_KEYS = ["aweme_list", "data", "items", "notes", "note_list", "feeds", "item_list", "list", "results"];

function harvest(payload, platformId, sink, depth) {
  if (!payload || typeof payload !== "object" || (depth || 0) > 6) return;
  if (Array.isArray(payload)) {
    for (const entry of payload) {
      const item = toItem(platformId, entry);
      if (item) sink.set(item.item_id, item);
      else harvest(entry, platformId, sink, (depth || 0) + 1);
    }
    return;
  }
  for (const key of LIST_KEYS) if (Array.isArray(payload[key])) harvest(payload[key], platformId, sink, (depth || 0) + 1);
  for (const key of ["data", "result", "search_data", "feed"]) {
    if (payload[key] && typeof payload[key] === "object") harvest(payload[key], platformId, sink, (depth || 0) + 1);
  }
}

function registerSearch(platformId) {
  const info = platform(platformId);
  register({
    id: platformId + ".search",
    platform: platformId,
    stage: "source",
    title: info.title + "搜索",
    description: "在真实浏览器里打开 " + info.title + " 搜索页，捕获页面自身接口返回并提取作品（不逆向签名）。",
    params: { query: "搜索关键词", limit: "最多返回条数（默认 20）", scrolls: "滚动次数，用于加载更多（默认 2）" },
    async run({ params, dataDir }) {
      const query = String(params.query || "").trim();
      if (!query) throw new Error(platformId + ".search 需要 params.query");
      const plan = searchPlan(platformId, query);
      if (!plan) throw new Error("no search plan for " + platformId);
      const limit = Number(params.limit) || 20;
      const raw = params.scrolls === undefined ? 2 : Number(params.scrolls);
      const scrolls = Math.max(0, Math.min(Number.isFinite(raw) ? raw : 2, 10));

      const { cdp } = await ensureBrowser({ baseDir: dataDir });
      const page = await openPage(cdp, "about:blank");
      const requestIds = [];
      const off = cdp.on((message) => {
        if (message.sessionId !== page.sessionId) return;
        if (message.method !== "Network.responseReceived") return;
        const url = (message.params && message.params.response && message.params.response.url) || "";
        if (plan.match.test(url)) requestIds.push(message.params.requestId);
      });
      try {
        await page.navigate(plan.url, { timeoutMs: 45000 });
        for (let index = 0; index < scrolls; index += 1) {
          await page.evaluate("window.scrollTo(0, document.body.scrollHeight)");
          await new Promise((resolve) => setTimeout(resolve, 1500));
        }
        const found = new Map();
        for (const requestId of requestIds) {
          try {
            const body = await page.send("Network.getResponseBody", { requestId });
            const text = body.base64Encoded ? Buffer.from(body.body, "base64").toString("utf8") : body.body;
            harvest(JSON.parse(text), platformId, found, 0);
          } catch (error) { /* one unreadable payload must not fail the run */ }
        }
        if (found.size === 0) {
          throw new Error(info.title + " 没有返回任何作品：通常是未登录或触发了风控。请先在「账号」页扫码登录 " + info.title + "，再重试。");
        }
        return [...found.values()].slice(0, limit);
      } finally {
        off();
        await page.close();
      }
    }
  });
}

for (const id of platformIds()) registerSearch(id);
