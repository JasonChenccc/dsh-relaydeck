// RelayDeck — 评论回复准备。
//
// 设计立场：**不做自动发送**。这个能力只把回复内容填进评论输入框，然后留着
// 让人工确认。理由：自动评论是唯一可能直接导致账号被限制的功能，收益远小于风险。
import { register } from "./index.mjs";
import { ensureBrowser } from "../browser/session.mjs";
import { openPage } from "../browser/cdp.mjs";
import { nowIso } from "../db.mjs";

/** 在页面里运行：把回复文本填进评论输入框，不提交。 */
function prepareReply(text) {
  const setValue = (el, value) => {
    el.focus();
    if (el.isContentEditable) el.textContent = value;
    else el.value = value;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  };
  const candidates = Array.from(document.querySelectorAll('textarea, [contenteditable="true"], input[type="text"]'));
  for (const el of candidates) {
    const hint = (el.placeholder || el.getAttribute("data-placeholder") || el.getAttribute("aria-label") || "") + "";
    const inCommentPanel = !!el.closest('[data-e2e="comment-list"]') || /评论|回复|说点什么/.test(hint);
    if (inCommentPanel) return { ok: setValue(el, text), hint: hint.slice(0, 30) };
  }
  // 退一步：取页面上最后一个可编辑元素（评论框通常在底部）
  const editable = candidates.filter((el) => el.isContentEditable);
  if (editable.length > 0) return { ok: setValue(editable[editable.length - 1], text), hint: "(fallback)" };
  return { ok: false, hint: "未找到评论输入框" };
}

register({
  id: "douyin.prepareComment",
  platform: "douyin",
  stage: "action",
  title: "抖音 准备评论回复",
  description: "把回复内容填进作品评论框，人工确认后手动发送。不会自动发送。",
  params: { url: "作品地址", text: "回复内容" },
  async run({ params, dataDir }) {
    const url = String(params.url || "").trim();
    const text = String(params.text || "").trim();
    if (!url) throw new Error("douyin.prepareComment 需要 params.url");
    if (!text) throw new Error("douyin.prepareComment 需要 params.text");

    const { cdp } = await ensureBrowser({ headless: false, baseDir: dataDir });
    const page = await openPage(cdp, "about:blank");
    try {
      await page.navigate(url, { timeoutMs: 45000 });
      await new Promise((r) => setTimeout(r, 6000));
      await page.evaluate("(() => { const el = document.querySelector('[data-e2e=\"feed-comment-icon\"]'); if (el) el.click(); return true; })()").catch(() => {});
      await new Promise((r) => setTimeout(r, 5000));
      let result = null;
      for (let i = 0; i < 8 && !(result && result.ok); i += 1) {
        result = await page.evaluate("(" + prepareReply.toString() + ")(" + JSON.stringify(text) + ")").catch(() => null);
        if (!(result && result.ok)) await new Promise((r) => setTimeout(r, 2000));
      }
      return { detail: result && result.ok
        ? "回复已填入评论框（" + result.hint + "），请在浏览器窗口确认后手动发送"
        : "没能填入评论框：" + (result ? result.hint : "未知原因"), saved: 0 };
    } finally {
      // 刻意不关页面：人工需要看到并发送
    }
  }
});
