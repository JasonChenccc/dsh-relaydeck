// RelayDeck — 抖音 capability.
//
// Deliberately browser-driven: a real page performs 抖音's own request signing,
// so RelayDeck never reimplements abogus/mstoken. The capability opens the search
// page, lets the page issue its own requests, captures the JSON responses off the
// wire, and maps them into items.
import { register } from "./index.mjs";
import { ensureBrowser } from "../browser/session.mjs";
import { openPage } from "../browser/cdp.mjs";

const SEARCH_ENDPOINT = /aweme\/v1\/web\/search\/item|search\/item|general\/search/;

function pickUrls(value) {
  if (!value) return [];
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(pickUrls);
  if (typeof value === "object") {
    if (Array.isArray(value.url_list)) return value.url_list.filter((u) => typeof u === "string");
    if (typeof value.url === "string") return [value.url];
  }
  return [];
}

/** Every playable / viewable URL an aweme exposes, best first. */
function mediaOf(aweme) {
  const urls = [];
  const video = aweme.video || {};
  urls.push(...pickUrls(video.play_addr));
  urls.push(...pickUrls(video.play_addr_h264));
  if (Array.isArray(video.bit_rate)) {
    for (const rate of video.bit_rate) urls.push(...pickUrls(rate && rate.play_addr));
  }
  if (Array.isArray(aweme.images)) {
    for (const image of aweme.images) urls.push(...pickUrls(image));
  }
  urls.push(...pickUrls(video.download_addr));
  const cover = pickUrls(video.cover)[0] || pickUrls(video.origin_cover)[0];
  if (cover) urls.push(cover);
  return [...new Set(urls)];
}

function toItem(aweme) {
  if (!aweme || typeof aweme !== "object") return null;
  const id = aweme.aweme_id || aweme.awemeId || aweme.id;
  if (!id) return null;
  const stats = aweme.statistics || {};
  const author = aweme.author || {};
  return {
    platform: "douyin",
    item_id: String(id),
    title: String(aweme.desc || aweme.title || ""),
    author: String(author.nickname || ""),
    cover_url: pickUrls((aweme.video && aweme.video.cover) || aweme.cover)[0] || "",
    media: mediaOf(aweme),
    stats: {
      like_count: Number(stats.digg_count || 0),
      comment_count: Number(stats.comment_count || 0),
      share_count: Number(stats.share_count || 0),
      play_count: Number(stats.play_count || 0),
      collect_count: Number(stats.collect_count || 0)
    },
    published_at: aweme.create_time ? new Date(Number(aweme.create_time) * 1000).toISOString() : undefined
  };
}

function extractFrom(payload, sink) {
  if (!payload || typeof payload !== "object") return;
  for (const list of [payload.aweme_list, payload.data, payload.items]) {
    if (!Array.isArray(list)) continue;
    for (const entry of list) {
      // 抖音 sometimes nests the aweme under an "aweme_info" wrapper.
      const item = toItem(entry && entry.aweme_info ? entry.aweme_info : entry);
      if (item) sink.set(item.item_id, item);
    }
  }
}

register({
  id: "douyin.search",
  platform: "douyin",
  stage: "source",
  title: "抖音搜索",
  description: "在真实浏览器里打开抖音搜索页，捕获页面自身的搜索接口返回并提取作品（不逆向签名）。",
  params: { query: "搜索关键词", limit: "最多返回条数（默认 20）", scrolls: "向下滚动次数，用于加载更多（默认 2）" },
  async run({ params, dataDir }) {
    const query = String(params.query || "").trim();
    if (!query) throw new Error("douyin.search 需要 params.query");
    const limit = Number(params.limit) || 20;
    const rawScrolls = params.scrolls === undefined ? 2 : Number(params.scrolls);
    const scrolls = Math.max(0, Math.min(Number.isFinite(rawScrolls) ? rawScrolls : 2, 10));

    const { cdp } = await ensureBrowser({ baseDir: dataDir });
    const page = await openPage(cdp, "about:blank");
    const requestIds = [];
    const off = cdp.on((message) => {
      if (message.sessionId !== page.sessionId) return;
      if (message.method !== "Network.responseReceived") return;
      const url = (message.params && message.params.response && message.params.response.url) || "";
      if (SEARCH_ENDPOINT.test(url)) requestIds.push(message.params.requestId);
    });

    try {
      await page.navigate("https://www.douyin.com/search/" + encodeURIComponent(query), { timeoutMs: 45000 });
      for (let index = 0; index < scrolls; index += 1) {
        await page.evaluate("window.scrollTo(0, document.body.scrollHeight)");
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }

      const found = new Map();
      for (const requestId of requestIds) {
        try {
          const body = await page.send("Network.getResponseBody", { requestId });
          const text = body.base64Encoded ? Buffer.from(body.body, "base64").toString("utf8") : body.body;
          extractFrom(JSON.parse(text), found);
        } catch (error) { /* one unreadable payload must not fail the run */ }
      }

      if (found.size === 0) {
        throw new Error("抖音没有返回任何作品：通常是未登录或触发了风控。请先在「账号」页扫码登录抖音，再重试。");
      }
      return [...found.values()].slice(0, limit);
    } finally {
      off();
      await page.close();
    }
  }
});
