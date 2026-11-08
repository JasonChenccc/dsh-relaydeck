// RelayDeck — generic media download action.
//
// Downloads whatever URLs an item exposes (item.media[]), writing into the run's
// output directory. Platform-agnostic: a capability only has to fill item.media.
import { mkdirSync, writeFileSync } from "node:fs";
import { extname, join } from "node:path";
import { register } from "../capabilities/index.mjs";
import { nowIso } from "../db.mjs";

const DEFAULT_EXT = {
  "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp",
  "video/mp4": ".mp4", "video/quicktime": ".mov", "audio/mpeg": ".mp3"
};

function safeName(value) {
  return String(value || "item").replace(/[^\w.\-\u4e00-\u9fa5]+/g, "_").slice(0, 80);
}

register({
  id: "core.download",
  platform: "core",
  stage: "action",
  title: "下载媒体",
  description: "下载条目里的媒体地址到输出目录，并更新素材库的下载状态。",
  params: { dir: "输出目录（默认 <dataDir>/downloads）", limit: "每个条目最多下载几个文件" },
  async run({ db, params, items, run, dataDir }) {
    const baseDir = String(params.dir || join(dataDir || ".", "downloads"));
    const perItem = Number(params.limit) || 0;
    let files = 0;
    let bytes = 0;

    for (const item of items) {
      const media = Array.isArray(item.media) ? item.media : [];
      const picked = perItem > 0 ? media.slice(0, perItem) : media;
      if (picked.length === 0) continue;
      const itemDir = join(baseDir, safeName(item.platform), safeName(item.item_id));
      try { mkdirSync(itemDir, { recursive: true }); } catch (e) { /* exists */ }
      const written = [];
      for (let index = 0; index < picked.length; index += 1) {
        const entry = picked[index];
        const url = typeof entry === "string" ? entry : (entry && entry.url);
        if (!url) continue;
        try {
          const res = await fetch(url, { signal: AbortSignal.timeout(120000) });
          if (!res.ok) continue;
          const buffer = Buffer.from(await res.arrayBuffer());
          const type = res.headers.get("content-type") || "";
          const ext = extname(new URL(url).pathname) || DEFAULT_EXT[String(type).split(";")[0]] || ".bin";
          const file = join(itemDir, String(index + 1).padStart(2, "0") + ext);
          writeFileSync(file, buffer);
          written.push(file);
          files += 1;
          bytes += buffer.length;
        } catch (error) { /* one bad URL must not fail the run */ }
      }
      if (written.length > 0) {
        db.prepare("UPDATE artifacts SET download_state = 'done', local_path = ? WHERE platform = ? AND item_id = ?")
          .run(itemDir, item.platform, item.item_id);
      }
    }

    return { detail: "下载 " + files + " 个文件 / " + Math.round(bytes / 1024) + " KB", saved: 0 };
  }
});
