// RelayDeck — 抖音发布准备。
//
// 打开创作者后台的上传页，把素材挂到文件输入框，等表单出现后填标题/正文，
// 然后把窗口留着让人工确认提交。**永远不会自动点发布。**
import { register } from "./index.mjs";
import { ensureBrowser } from "../browser/session.mjs";
import { openPage } from "../browser/cdp.mjs";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { nowIso } from "../db.mjs";

const UPLOAD_URL = "https://creator.douyin.com/creator-micro/content/upload";

/** 从素材目录里找出可上传的文件。 */
function filesIn(dir) {
  try {
    return readdirSync(dir)
      .map((name) => join(dir, name))
      .filter((file) => { try { return statSync(file).isFile(); } catch (e) { return false; } });
  } catch (e) { return []; }
}

/** 在页面里运行：填写标题与正文。 */
function fillForm(title, body) {
  const setValue = (el, value) => {
    el.focus();
    if (el.isContentEditable) el.textContent = value;
    else el.value = value;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    el.dispatchEvent(new Event("blur", { bubbles: true }));
  };
  const inputs = Array.from(document.querySelectorAll("input, textarea, [contenteditable='true']"));
  let titleDone = false;
  let bodyDone = false;
  for (const el of inputs) {
    const hint = (el.placeholder || el.getAttribute("data-placeholder") || "") + "";
    if (!titleDone && title && /标题|title/i.test(hint) && hint.length < 40) { setValue(el, title); titleDone = true; continue; }
    if (!bodyDone && body && (/作品描述|正文|描述|简介/.test(hint) || el.isContentEditable)) { setValue(el, body); bodyDone = true; }
  }
  return { titleDone, bodyDone, fields: inputs.length };
}

register({
  id: "douyin.prepareDraft",
  platform: "douyin",
  stage: "action",
  title: "抖音 准备发布草稿",
  description: "把素材上传到抖音创作者后台并填好标题/正文，最后一步留给人工确认（不会自动发布）。",
  params: { planIds: "指定发布计划 id（默认取本流程刚生成的草稿）" },
  async run({ db, params, run }) {
    const requested = Array.isArray(params.planIds) ? params.planIds : null;
    const rows = requested
      ? requested.map((id) => db.prepare("SELECT * FROM publish_plans WHERE id = ?").get(Number(id))).filter(Boolean)
      : db.prepare("SELECT * FROM publish_plans WHERE run_id = ? AND platform = 'douyin' AND status IN ('draft','approved')").all(run.id);
    if (rows.length === 0) return { detail: "没有待准备的抖音草稿", saved: 0 };

    const plan = rows[0];
    let files = [];
    try { files = JSON.parse(plan.files_json); } catch (e) { files = []; }
    const targets = [];
    for (const entry of files) {
      if (!entry) continue;
      try { if (statSync(entry).isDirectory()) targets.push(...filesIn(entry)); else targets.push(entry); }
      catch (e) { /* 路径已失效 */ }
    }
    if (targets.length === 0) {
      db.prepare("UPDATE publish_plans SET note = ?, updated_at = ? WHERE id = ?").run("素材文件不存在，请先下载", nowIso(), plan.id);
      return { detail: "草稿 " + plan.id + " 没有可上传的素材文件", saved: 0 };
    }

    const { cdp } = await ensureBrowser({ headless: false });
    const page = await openPage(cdp, UPLOAD_URL);
    try {
      await page.send("DOM.enable", {});
      let attached = false;
      for (let i = 0; i < 15 && !attached; i += 1) {
        await new Promise((r) => setTimeout(r, 1500));
        try {
          const doc = await page.send("DOM.getDocument", { depth: -1 });
          const found = await page.send("DOM.querySelector", { nodeId: doc.root.nodeId, selector: 'input[type="file"]' });
          if (found && found.nodeId) {
            await page.send("DOM.setFileInputFiles", { nodeId: found.nodeId, files: targets });
            attached = true;
          }
        } catch (e) { /* 页面还在加载 */ }
      }
      if (!attached) {
        db.prepare("UPDATE publish_plans SET note = ?, updated_at = ? WHERE id = ?").run("未找到上传入口", nowIso(), plan.id);
        return { detail: "没有找到文件上传入口（可能页面结构变化或未登录）", saved: 0 };
      }

      // 等上传与表单渲染
      await new Promise((r) => setTimeout(r, 12000));
      const filled = await page.evaluate("(" + fillForm.toString() + ")(" + JSON.stringify(plan.title || "") + ", " + JSON.stringify(plan.body || "") + ")").catch(() => null);
      db.prepare("UPDATE publish_plans SET status = 'prepared', note = ?, updated_at = ? WHERE id = ?")
        .run("已挂载 " + targets.length + " 个文件" + (filled ? "，标题填充=" + filled.titleDone + " 正文填充=" + filled.bodyDone : ""), nowIso(), plan.id);
      return { detail: "草稿 " + plan.id + " 已准备：上传 " + targets.length + " 个文件，请在浏览器窗口复核后手动发布", saved: 0 };
    } catch (error) {
      db.prepare("UPDATE publish_plans SET note = ?, updated_at = ? WHERE id = ?").run(String(error && error.message ? error.message : error).slice(0, 200), nowIso(), plan.id);
      throw error;
    }
  }
});
