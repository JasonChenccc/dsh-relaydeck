// RelayDeck — 链接解析与下载。
//
// 粘贴作品链接 → 在真实浏览器里打开 → 从页面自己的播放器里取出媒体地址 →
// 由后端下载。这样不需要逆向任何签名：播放器拿到的地址本来就是可用的。
import { register } from "./index.mjs";
import { ensureBrowser } from "../browser/session.mjs";
import { openPage } from "../browser/cdp.mjs";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/** 在页面里运行：读取播放器暴露的媒体地址与标题。 */
function readPlayer() {
  const video = document.querySelector("video");
  const sources = Array.from(document.querySelectorAll("video source"))
    .map((s) => s.src)
    .filter((s) => s && s.startsWith("http"));
  const primary = video && video.currentSrc ? video.currentSrc : "";
  const media = [primary, ...sources].filter((s, i, arr) => s && s.startsWith("http") && arr.indexOf(s) === i);
  const raw = (document.title || "").trim();
  return {
    media,
    title: raw.replace(/\s*-\s*抖音\s*$/, "").replace(/^抖音\s*-?\s*/, "").trim(),
    cover: (video && video.poster) || "",
    duration: video && video.duration ? Math.round(video.duration) : 0
  };
}

function hash(text) {
  let h = 0;
  for (let i = 0; i < text.length; i += 1) { h = (h * 31 + text.charCodeAt(i)) | 0; }
  return h;
}

function safeName(value) {
  return String(value || "item").replace(/[^\w.\-\u4e00-\u9fa5]+/g, "_").slice(0, 80);
}

function extFrom(url, contentType) {
  const m = String(url).match(/\.(mp4|mov|m4a|mp3|jpg|jpeg|png|webp)(?:\?|$)/i);
  if (m) return "." + m[1].toLowerCase();
  const type = String(contentType || "").split(";")[0];
  if (type === "video/mp4") return ".mp4";
  if (type === "image/jpeg") return ".jpg";
  if (type === "image/png") return ".png";
  if (type === "image/webp") return ".webp";
  return ".bin";
}

/**
 * 解析若干作品链接，返回可下载的条目。
 * @returns 条目数组（含 media 地址、标题、封面）
 */
export async function resolveLinks(urls, dataDir, limit) {
  const list = (Array.isArray(urls) ? urls : String(urls || "").split(/\s+/))
    .map((s) => String(s).trim())
    .filter(Boolean)
    .slice(0, Number(limit) || 20);
  if (list.length === 0) throw new Error("没有提供链接");

  const { cdp } = await ensureBrowser({ headless: false, baseDir: dataDir });
  const items = [];
  const failures = [];

  for (const url of list) {
    const page = await openPage(cdp, "about:blank");
    try {
      await page.navigate(url, { timeoutMs: 45000 });
      let found = null;
      for (let i = 0; i < 18 && !found; i += 1) {
        await new Promise((r) => setTimeout(r, 1000));
        const data = await page.evaluate("(" + readPlayer.toString() + ")()").catch(() => null);
        if (data && data.media && data.media.length > 0) found = data;
      }
      const finalUrl = await page.evaluate("location.href").catch(() => url);
      if (!found) { failures.push({ url: url, reason: "页面上没有找到可下载的媒体（可能需要登录，或不是作品页）" }); continue; }
      const idMatch = String(finalUrl || url).match(/\/video\/(\d+)/) || String(url).match(/\/video\/(\d+)/);
      const itemId = idMatch ? idMatch[1] : "link-" + Math.abs(hash(url)).toString(36);
      items.push({
        platform: "douyin",
        item_id: itemId,
        title: found.title || "",
        cover_url: found.cover || "",
        media: found.media,
        stats: found.duration ? { duration: found.duration } : {}
      });
    } catch (error) {
      failures.push({ url: url, reason: String(error && error.message ? error.message : error) });
    } finally {
      try { await page.close(); } catch (e) { /* gone */ }
    }
  }
  for (const item of items) item.failures = undefined;
  if (items.length === 0) {
    throw new Error("没有解析到任何可下载内容：" + (failures[0] ? failures[0].reason : "未知原因"));
  }
  return { items, failures };
}

/** 下载条目里的媒体到磁盘。 */
export async function downloadItems(items, dataDir, perItem) {
  const baseDir = join(dataDir || ".", "downloads");
  let files = 0;
  let bytes = 0;
  const written = [];
  for (const item of items) {
    const media = (item.media || []).slice(0, Number(perItem) || 1);
    if (media.length === 0) continue;
    const dir = join(baseDir, safeName(item.platform), safeName(item.item_id));
    try { mkdirSync(dir, { recursive: true }); } catch (e) { /* exists */ }
    for (let index = 0; index < media.length; index += 1) {
      try {
        const res = await fetch(media[index], {
          headers: { referer: "https://www.douyin.com/", "user-agent": "Mozilla/5.0" },
          signal: AbortSignal.timeout(300000)
        });
        if (!res.ok) continue;
        const buffer = Buffer.from(await res.arrayBuffer());
        const file = join(dir, String(index + 1).padStart(2, "0") + extFrom(media[index], res.headers.get("content-type")));
        writeFileSync(file, buffer);
        files += 1;
        bytes += buffer.length;
        written.push(file);
      } catch (error) { /* 单个地址失败不影响其它 */ }
    }
    item.local_path = files > 0 ? dir : "";
  }
  return { files, bytes, written };
}

register({
  id: "core.linkDownload",
  platform: "core",
  stage: "source",
  title: "链接解析",
  description: "粘贴作品链接，在真实浏览器里打开并取出可下载的媒体地址（不逆向签名）。",
  params: { urls: "链接，换行或空格分隔", limit: "最多解析几个（默认 20）" },
  async run({ params, dataDir }) {
    const result = await resolveLinks(params.urls, dataDir, params.limit);
    return result.items;
  }
});
