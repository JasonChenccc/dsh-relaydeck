// RelayDeck — 抖音能力（浏览器驱动 + DOM 提取）。
//
// 抖音的数据接口由 Service Worker 发出，CDP 在页面会话里看不到；页面类名也是混淆的。
// 因此这里的做法是：像人一样操作页面，再从渲染结果里读取。提取器只依赖稳定特征 ——
// 封面图域名、卡片文本、以及 /video/<id> 链接。

import { register } from "./index.mjs";
import { ensureBrowser } from "../browser/session.mjs";
import { openPage } from "../browser/cdp.mjs";

/** "1.2万" -> 12000 */
function parseCount(text) {
  const m = String(text || "").match(/^([\d.]+)\s*(万|w|W)?/);
  if (!m) return 0;
  const n = Number(m[1]);
  if (!Number.isFinite(n)) return 0;
  return Math.round(m[2] ? n * 10000 : n);
}

/** 在页面里运行：把封面图对应到作品卡片。 */
function extractCards() {
  // 作品网格是一个容器，它的每个直接子元素各含一张"大封面"。
  // 尺寸过滤很关键：聊天/推荐等列表里也有小头像，只有作品封面是大图。
  const bigCover = (card) => {
    const img = card.querySelector ? card.querySelector('img[src*="douyinpic"]') : null;
    if (!img) return null;
    const r = img.getBoundingClientRect();
    if (r.width < 140 || r.height < 90) return null;
    return { img: img, w: Math.round(r.width), h: Math.round(r.height) };
  };

  let best = null;
  for (const el of document.querySelectorAll("ul, div")) {
    const kids = Array.from(el.children);
    if (kids.length < 2 || kids.length > 80) continue;
    const cards = kids.filter((k) => bigCover(k));
    if (cards.length < 2) continue;
    // 子元素尺寸一致性：作品卡片彼此几乎等大，聊天条目则参差不齐
    const sizes = cards.map((k) => bigCover(k).w);
    const spread = Math.max.apply(null, sizes) - Math.min.apply(null, sizes);
    const score = cards.length * 100 - spread;
    if (!best || score > best.score) best = { cards: cards, score: score };
  }
  if (!best) return [];

  const objectKey = (src) => {
    const m = String(src).match(/tos-cn-[a-z0-9-]+\/([A-Za-z0-9_-]{8,})/);
    return m ? m[1] : "";
  };

  const out = [];
  for (const card of best.cards) {
    const cover = bigCover(card);
    if (!cover) continue;
    const src = cover.img.getAttribute("src") || "";
    // 只认卡片自身的链接。父元素回退会让所有卡片共用同一个链接（之前就是这个 bug）。
    const link = card.querySelector('a[href*="/video/"]');
    const href = link ? link.getAttribute("href") || "" : "";
    const idMatch = href.match(/\/video\/(\d+)/);
    const key = objectKey(src);

    const text = (card.innerText || "").replace(/\s+/g, " ").trim();
    const first = text.split(" ")[0] || "";
    const numeric = /^[\d.]+\s*(万|w|W)?$/.test(first);
    out.push({
      item_id: idMatch ? idMatch[1] : (key ? "img:" + key : ""),
      cover_url: src,
      like_text: numeric ? first : "",
      desc: numeric ? text.slice(first.length).trim() : text,
      w: cover.w,
      h: cover.h
    });
  }
  return out;
}

/** 在页面里运行：读取当前登录账号。 */
function readAccount() {
  const s = window.userInfoStore && window.userInfoStore.curLoginUserInfo;
  return s && s.uid ? { uid: String(s.uid), nickname: s.nickname || "" } : null;
}

/** 在页面里运行：聚焦首页搜索框。 */
function focusSearchBox() {
  const input = Array.from(document.querySelectorAll("input")).find((el) => /搜索/.test(el.placeholder || ""));
  if (!input) return false;
  input.focus();
  input.click();
  return true;
}

const runInPage = (fn) => "(" + fn.toString() + ")()";

/** 稳定但非加密的字符串哈希，用于在拿不到作品 id 时生成去重键。 */
function hash(text) {
  let h = 0;
  for (let i = 0; i < text.length; i += 1) { h = (h * 31 + text.charCodeAt(i)) | 0; }
  return h;
}

function toItems(rows) {
  const items = [];
  for (const row of rows) {
    const id = row.item_id || (row.desc ? "t" + Math.abs(hash(row.desc)).toString(36) : "");
    if (!id || String(id).length < 6) continue;
    items.push({
      platform: "douyin",
      item_id: String(id),
      title: String(row.desc || "").slice(0, 200),
      author: "",
      cover_url: row.cover_url || "",
      media: row.cover_url ? [row.cover_url] : [],
      stats: { like_count: parseCount(row.like_text) }
    });
  }
  return items;
}

async function waitFor(page, fn, timeoutMs, intervalMs) {
  const deadline = Date.now() + (timeoutMs || 15000);
  while (Date.now() < deadline) {
    const value = await page.evaluate(runInPage(fn)).catch(() => null);
    if (value && (!Array.isArray(value) || value.length > 0)) return value;
    await new Promise((resolve) => setTimeout(resolve, intervalMs || 800));
  }
  return null;
}

async function withPage(dataDir, fn) {
  const { cdp } = await ensureBrowser({ baseDir: dataDir });
  const page = await openPage(cdp, "about:blank");
  try { return await fn(page); } finally { try { await page.close(); } catch (e) { /* gone */ } }
}

async function collect(page, scrolls, limit, stepPx) {
  const collected = new Map();
  for (let round = 0; round <= scrolls; round += 1) {
    const rows = await page.evaluate(runInPage(extractCards)).catch(() => []);
    for (const item of toItems(rows)) collected.set(item.item_id, item);
    if (collected.size >= limit) break;
    await page.evaluate("window.scrollBy(0, " + stepPx + ")");
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  return collected;
}

register({
  id: "douyin.profile",
  platform: "douyin",
  stage: "source",
  title: "抖音 · 我的作品",
  description: "读取当前登录账号的主页作品（封面 + 标题 + 点赞数）。",
  params: { url: "主页地址（默认当前登录账号）", limit: "最多返回条数（默认 50）", scrolls: "向下滚动次数（默认 3）" },
  async run({ params, dataDir }) {
    const limit = Number(params.limit) || 50;
    const raw = params.scrolls === undefined ? 3 : Number(params.scrolls);
    const scrolls = Math.max(0, Math.min(Number.isFinite(raw) ? raw : 3, 20));
    const target = String(params.url || "").trim() || "https://www.douyin.com/user/self";
    return await withPage(dataDir, async (page) => {
      await page.navigate(target, { timeoutMs: 45000 });
      const account = await waitFor(page, readAccount, 20000, 800);
      if (!account) throw new Error("抖音未登录：请先在「账号」页扫码登录。");
      await waitFor(page, extractCards, 20000, 1200);
      await new Promise((resolve) => setTimeout(resolve, 1500));
      const collected = await collect(page, scrolls, limit, 900);
      const items = [...collected.values()].slice(0, limit);
      for (const item of items) item.author = account.nickname || "";
      return items;
    });
  }
});

register({
  id: "douyin.search",
  platform: "douyin",
  stage: "source",
  title: "抖音搜索",
  description: "在真实浏览器里用抖音首页搜索框搜索关键词，读取结果（封面 + 标题 + 点赞）。",
  params: { query: "搜索关键词", limit: "最多返回条数（默认 20）", scrolls: "向下滚动次数（默认 2）" },
  async run({ params, dataDir }) {
    const query = String(params.query || "").trim();
    if (!query) throw new Error("douyin.search 需要 params.query");
    const limit = Number(params.limit) || 20;
    const raw = params.scrolls === undefined ? 2 : Number(params.scrolls);
    const scrolls = Math.max(0, Math.min(Number.isFinite(raw) ? raw : 2, 10));
    return await withPage(dataDir, async (page) => {
      await page.navigate("https://www.douyin.com/", { timeoutMs: 45000 });
      const focused = await waitFor(page, focusSearchBox, 20000, 800);
      if (!focused) throw new Error("抖音首页没有找到搜索框（可能未登录或页面结构变化）。");
      await page.send("Input.insertText", { text: query });
      await new Promise((resolve) => setTimeout(resolve, 900));
      await page.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 });
      await page.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 });
      await waitFor(page, extractCards, 25000, 1500);
      const collected = await collect(page, scrolls, limit, 1000);
      if (collected.size === 0) {
        throw new Error("抖音没有返回结果：可能未登录、触发风控，或搜索未提交。请先在「账号」页确认已登录。");
      }
      return [...collected.values()].slice(0, limit);
    });
  }
});

/** 在页面里运行：读取评论列表。 */
function readComments() {
  const list = document.querySelector('[data-e2e="comment-list"]');
  if (!list) return [];
  const out = [];
  for (const card of list.children) {
    const text = (card.innerText || "").replace(/\s+/g, " ").trim();
    if (!text || /暂无评论/.test(text)) continue;
    const img = card.querySelector("img");
    // 卡片首行通常是昵称，其余是内容
    const lines = text.split(" ").filter(Boolean);
    out.push({
      author: lines[0] || "",
      text: lines.slice(1).join(" ") || text,
      avatar: img ? String(img.getAttribute("src") || "") : ""
    });
  }
  return out;
}

/** 在页面里运行：读取弹幕。 */
function readDanmaku() {
  const box = document.querySelector('[data-e2e="danmaku-container"]');
  if (!box) return [];
  const rows = Array.from(box.querySelectorAll("div, span"))
    .map((el) => (el.innerText || "").replace(/\s+/g, " ").trim())
    .filter((t) => t.length > 0 && t.length < 80);
  return [...new Set(rows)].slice(0, 500);
}

async function withVideoPage(dataDir, url, fn) {
  const { cdp } = await ensureBrowser({ baseDir: dataDir });
  const page = await openPage(cdp, "about:blank");
  try {
    await page.navigate(url, { timeoutMs: 45000 });
    await new Promise((r) => setTimeout(r, 6000));
    // 评论区是懒加载：先点开评论图标
    await page.evaluate("(() => { const el = document.querySelector('[data-e2e=\"feed-comment-icon\"]'); if (el) el.click(); return true; })()").catch(() => {});
    await new Promise((r) => setTimeout(r, 6000));
    return await fn(page);
  } finally { try { await page.close(); } catch (e) { /* gone */ } }
}

register({
  id: "douyin.comments",
  platform: "douyin",
  stage: "source",
  title: "抖音评论",
  description: "打开作品页并展开评论区，读取评论（需要登录）。",
  params: { url: "作品地址", limit: "最多条数（默认 50）" },
  async run({ params, dataDir }) {
    const url = String(params.url || "").trim();
    if (!url) throw new Error("douyin.comments 需要 params.url");
    const limit = Number(params.limit) || 50;
    return await withVideoPage(dataDir, url, async (page) => {
      let rows = [];
      for (let i = 0; i < 10 && rows.length === 0; i += 1) {
        await new Promise((r) => setTimeout(r, 2000));
        rows = await page.evaluate(runInPage(readComments)).catch(() => []);
      }
      const idMatch = String(url).match(/\/video\/(\d+)/);
      const itemId = idMatch ? idMatch[1] : "video";
      return rows.slice(0, limit).map((row, index) => ({
        platform: "douyin",
        item_id: itemId + "#c" + index,
        title: row.text,
        author: row.author,
        cover_url: row.avatar,
        media: [],
        stats: {}
      }));
    });
  }
});

register({
  id: "douyin.danmaku",
  platform: "douyin",
  stage: "source",
  title: "抖音弹幕",
  description: "打开作品页并读取弹幕层文本（需要登录）。",
  params: { url: "作品地址", limit: "最多条数（默认 200）" },
  async run({ params, dataDir }) {
    const url = String(params.url || "").trim();
    if (!url) throw new Error("douyin.danmaku 需要 params.url");
    const limit = Number(params.limit) || 200;
    return await withVideoPage(dataDir, url, async (page) => {
      let rows = [];
      for (let i = 0; i < 6 && rows.length === 0; i += 1) {
        await new Promise((r) => setTimeout(r, 2000));
        rows = await page.evaluate(runInPage(readDanmaku)).catch(() => []);
      }
      const idMatch = String(url).match(/\/video\/(\d+)/);
      const itemId = idMatch ? idMatch[1] : "video";
      return rows.slice(0, limit).map((text, index) => ({
        platform: "douyin",
        item_id: itemId + "#d" + index,
        title: text,
        author: "",
        cover_url: "",
        media: [],
        stats: {}
      }));
    });
  }
});
