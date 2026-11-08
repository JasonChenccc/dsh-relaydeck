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
  const out = [];
  const seen = new Set();
  const covers = [];
  for (const img of document.querySelectorAll("img")) {
    const src = img.getAttribute("src") || "";
    if (!src.includes("douyinpic")) continue;
    const r = img.getBoundingClientRect();
    if (r.width < 96 || r.height < 64) continue;
    covers.push({ img, src, top: r.top });
  }
  covers.sort((a, b) => a.top - b.top);

  const findHref = (node) => {
    let up = node;
    for (let i = 0; i < 9 && up; i += 1) {
      if (up.querySelector) {
        const a = up.querySelector('a[href*="/video/"]');
        if (a) return { holder: up, href: a.getAttribute("href") || "" };
      }
      up = up.parentElement;
    }
    return null;
  };
  const findText = (node) => {
    let up = node;
    for (let i = 0; i < 7 && up; i += 1) {
      const t = (up.innerText || "").replace(/\s+/g, " ").trim();
      if (t.length > 3 && t.length < 300) return { holder: up, text: t };
      up = up.parentElement;
    }
    return null;
  };

  for (const cover of covers) {
    const linked = findHref(cover.img);
    const textual = findText(cover.img);
    const holder = (linked && linked.holder) || (textual && textual.holder) || null;
    if (!holder) continue;
    const text = (holder.innerText || "").replace(/\s+/g, " ").trim();
    const href = linked ? linked.href : "";
    const idMatch = href.match(/\/video\/(\d+)/);
    const key = idMatch ? idMatch[1] : cover.src.slice(0, 90);
    if (seen.has(key)) continue;
    seen.add(key);
    const first = text.split(" ")[0] || "";
    const numeric = /^[\d.]+\s*(万|w|W)?$/.test(first);
    out.push({
      item_id: idMatch ? idMatch[1] : "",
      cover_url: cover.src,
      like_text: numeric ? first : "",
      desc: numeric ? text.slice(first.length).trim() : text
    });
  }

  // 兜底：给还缺 id 的条目，按 DOM 顺序分配页面上未使用的作品链接。
  const pageLinks = Array.from(document.querySelectorAll('a[href*="/video/"]'))
    .map((a) => { const m = (a.getAttribute("href") || "").match(/\/video\/(\d+)/); return m ? m[1] : null; })
    .filter(Boolean);
  const used = new Set(out.filter((x) => x.item_id).map((x) => x.item_id));
  const spare = pageLinks.filter((id) => !used.has(id));
  let cursor = 0;
  for (const entry of out) {
    if (entry.item_id) continue;
    if (cursor < spare.length) { entry.item_id = spare[cursor]; cursor += 1; }
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
  params: { limit: "最多返回条数（默认 50）", scrolls: "向下滚动次数（默认 3）" },
  async run({ params, dataDir }) {
    const limit = Number(params.limit) || 50;
    const raw = params.scrolls === undefined ? 3 : Number(params.scrolls);
    const scrolls = Math.max(0, Math.min(Number.isFinite(raw) ? raw : 3, 20));
    return await withPage(dataDir, async (page) => {
      await page.navigate("https://www.douyin.com/user/self", { timeoutMs: 45000 });
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
