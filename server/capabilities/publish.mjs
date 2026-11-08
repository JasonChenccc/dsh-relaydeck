// RelayDeck — prepare a publish draft in the platform\u2019s own creator UI.
//
// This is deliberately the LAST automated step: files are attached and fields are
// filled, then the window is left open for the operator to review and submit.
// RelayDeck never clicks the final publish button, so a bad flow cannot post.
import { register } from "./index.mjs";
import { ensureBrowser } from "../browser/session.mjs";
import { openPage } from "../browser/cdp.mjs";
import { platform, platformIds, publishPlanFor } from "../platforms.mjs";
import { nowIso } from "../db.mjs";

function fillExpression(selector, value) {
  return "(() => {"
    + " const el = document.querySelector(" + JSON.stringify(selector) + ");"
    + " if (!el) return false;"
    + " const text = " + JSON.stringify(value) + ";"
    + " if (el.isContentEditable) { el.focus(); el.textContent = text; }"
    + " else { el.focus(); el.value = text; }"
    + " el.dispatchEvent(new Event(\"input\", { bubbles: true }));"
    + " el.dispatchEvent(new Event(\"change\", { bubbles: true }));"
    + " return true;"
    + " })()";
}

async function attachFiles(page, selector, files) {
  await page.send("DOM.enable", {});
  const doc = await page.send("DOM.getDocument", { depth: -1 });
  const found = await page.send("DOM.querySelector", { nodeId: doc.root.nodeId, selector });
  if (!found || !found.nodeId) return false;
  await page.send("DOM.setFileInputFiles", { nodeId: found.nodeId, files });
  return true;
}

function registerPrepare(platformId) {
  const info = platform(platformId);
  const plan = publishPlanFor(platformId);
  if (!plan) return;
  register({
    id: platformId + ".prepareDraft",
    platform: platformId,
    stage: "action",
    title: info.title + " 准备发布草稿",
    description: "在 " + info.title + " 创作者后台打开发布页，附上素材并填写标题/正文，然后留给人工复核提交（不会自动点发布）。",
    params: { planIds: "指定发布计划 id 列表（默认取本流程刚生成的草稿）", keepOpen: "是否保留窗口（默认 true）" },
    async run({ db, params, items, run }) {
      const requested = Array.isArray(params.planIds) ? params.planIds : null;
      const rows = requested
        ? requested.map((id) => db.prepare("SELECT * FROM publish_plans WHERE id = ?").get(Number(id))).filter(Boolean)
        : db.prepare("SELECT * FROM publish_plans WHERE run_id = ? AND platform = ? AND status = 'draft'").all(run.id, platformId);
      if (rows.length === 0) return { detail: "没有可发布的草稿", saved: 0 };

      const { cdp } = await ensureBrowser({ baseDir: params.dataDir });
      const page = await openPage(cdp, plan.url);
      let prepared = 0;
      let attached = 0;
      try {
        await new Promise((resolve) => setTimeout(resolve, 4000));
        for (const row of rows) {
          let files = [];
          try { files = JSON.parse(row.files_json); } catch (error) { files = []; }
          if (files.length > 0) {
            const ok = await attachFiles(page, plan.fileInput, files).catch(() => false);
            if (ok) attached += 1;
          }
          if (row.title && plan.title) await page.evaluate(fillExpression(plan.title, row.title)).catch(() => false);
          if (row.body && plan.body) await page.evaluate(fillExpression(plan.body, row.body)).catch(() => false);
          db.prepare("UPDATE publish_plans SET status = 'prepared', updated_at = ? WHERE id = ?").run(nowIso(), row.id);
          prepared += 1;
        }
        if (params.keepOpen === false) await page.close();
        return { detail: "已准备 " + prepared + " 条草稿（附件 " + attached + "），请在浏览器窗口复核后手动提交", saved: 0 };
      } catch (error) {
        if (params.keepOpen === false) { try { await page.close(); } catch (e) { /* gone */ } }
        throw error;
      }
    }
  });
}

for (const id of platformIds()) registerPrepare(id);
