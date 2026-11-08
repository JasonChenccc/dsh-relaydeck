// RelayDeck — interactive QR login.
//
// A login opens the platform's own page in a visible browser window. The user
// scans the QR code there; the platform sets its session cookies on the page.
// RelayDeck only observes: it waits for those cookies, then records a binding.
// The browser profile lives on disk, so the session survives restarts.
import { ensureBrowser } from "./session.mjs";
import { PLATFORMS } from "../platforms.mjs";
import { openPage } from "./cdp.mjs";
import { platform, loginProbe } from "../platforms.mjs";
import { nowIso } from "../db.mjs";
import { log, errorText } from "../log.mjs";

const sessions = new Map();
let sequence = 0;

function nextId() {
  sequence += 1;
  return "login-" + Date.now().toString(36) + "-" + sequence;
}

function sessionView(session) {
  return {
    id: session.id,
    platform: session.platform,
    state: session.state,
    startedAt: new Date(session.startedAt).toISOString(),
    url: session.url,
    hint: session.hint,
    matched: session.matched || [],
    account: session.account || undefined,
    bindingId: session.bindingId,
    error: session.error
  };
}

/** Open the platform login page and start watching for a session. */
export async function startLogin(db, platformId, options = {}) {
  const p = platform(platformId);
  if (!p) throw new Error("unknown platform: " + platformId);

  // Only one live login per platform; reuse it instead of stacking windows.
  for (const existing of sessions.values()) {
    if (existing.platform === platformId && existing.state === "waiting") return sessionView(existing);
  }

  // Headed on purpose: platform login pages serve a captcha interstitial to a
  // headless browser. The window is sized like a compact panel and the QR is also
  // mirrored into the RelayDeck UI, so scanning can happen from either place.
  const { cdp } = await ensureBrowser({ headless: false, baseDir: options.baseDir });
  const page = await openPage(cdp, p.loginUrl);
  const session = {
    id: nextId(),
    platform: platformId,
    page,
    state: "waiting",
    startedAt: Date.now(),
    url: p.loginUrl,
    hint: p.hint,
    matched: []
  };
  sessions.set(session.id, session);
  log("info", "login started", { platform: platformId, id: session.id });
  return sessionView(session);
}

function saveBinding(db, p, cookies, account) {
  const secret = JSON.stringify(cookies
    .filter((c) => /session|sid|uid|passport|web_session|slave/i.test(c.name))
    .map((c) => ({ name: c.name, value: c.value, domain: c.domain, path: c.path, expires: c.expires })));
  const uid = String(account.uid);
  const existing = db.prepare("SELECT id FROM bindings WHERE platform = ? AND platform_uid = ?").get(p.id, uid);
  if (existing) {
    db.prepare("UPDATE bindings SET state = 'active', nickname = ?, label = ?, secret_json = ?, last_used_at = ? WHERE id = ?")
      .run(account.nickname || "", p.title, secret, nowIso(), existing.id);
    return existing.id;
  }
  const info = db.prepare(
    "INSERT INTO bindings (platform, label, platform_uid, nickname, state, secret_json, created_at) VALUES (?, ?, ?, ?, 'active', ?, ?)"
  ).run(p.title, p.title, uid, account.nickname || "", secret, nowIso());
  return Number(info.lastInsertRowid);
}

/** Check one login; records the binding as soon as the platform session exists. */
export async function pollLogin(db, id) {
  const session = sessions.get(id);
  if (!session) return { state: "unknown" };
  if (session.state !== "waiting") return sessionView(session);
  const p = platform(session.platform);
  try {
    const probe = loginProbe(session.platform);
    const account = probe ? await session.page.evaluate(probe).catch(() => null) : null;
    session.account = account || null;
    if (account && account.uid) {
      const cookies = await session.page.cookies();
      session.bindingId = saveBinding(db, p, cookies, account);
      session.state = "ok";
      session.matched = [account.nickname || account.uid];
      try { await session.page.close(); } catch (e) { /* keep the profile */ }
      log("info", "login captured", { platform: p.id, uid: account.uid, nickname: account.nickname });
    }
    return sessionView(session);
  } catch (error) {
    session.state = "failed";
    session.error = errorText(error);
    return sessionView(session);
  }
}

/**
 * Screenshot just the QR code region so the panel can show it inline instead of
 * opening a browser window.
 */
/**
 * The page's user store fills in only after its SPA hydrates, so a single read
 * right after navigation is a false "signed out". Poll until it appears.
 */
async function waitForAccount(page, probe, timeoutMs) {
  const deadline = Date.now() + (timeoutMs || 15000);
  while (Date.now() < deadline) {
    const account = await page.evaluate(probe).catch(() => null);
    if (account && account.uid) return account;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  return null;
}

export async function qrImage(id) {
  const session = sessions.get(id);
  if (!session) return { found: false, reason: "unknown login" };
  if (session.state !== "waiting") return { found: false, reason: session.state };
  try {
    // Login QR codes are rendered as inline data-URL images (or a canvas). That
    // signature is far more precise than "largest square element", which happily
    // matches video thumbnails.
    const rect = await session.page.evaluate(`(() => {
      const nodes = Array.from(document.querySelectorAll('img, canvas'));
      let best = null;
      for (const node of nodes) {
        const box = node.getBoundingClientRect();
        if (box.width < 110 || box.width > 340) continue;
        if (Math.abs(box.width - box.height) > box.width * 0.25) continue;
        if (box.bottom < 0 || box.right < 0 || box.top > innerHeight || box.left > innerWidth) continue;
        const src = String(node.getAttribute('src') || '');
        const inline = src.startsWith('data:image/');
        const qrLike = inline
          || node.tagName === 'CANVAS'
          || /qr|code/i.test(String(node.className || ''))
          || /qr|code/i.test(src);
        if (!qrLike) continue;
        const area = box.width * box.height;
        if (!best || area > best.area) {
          best = { x: box.x, y: box.y, width: box.width, height: box.height, area, inline };
        }
      }
      return best ? { x: best.x, y: best.y, width: best.width, height: best.height, inline: best.inline } : null;
    })()`).catch(() => null);

    if (!rect) return { found: false, reason: "页面上还没有出现二维码，请稍后重试" };

    const shot = await session.page.send("Page.captureScreenshot", {
      format: "png",
      clip: { x: Math.max(0, rect.x - 8), y: Math.max(0, rect.y - 8), width: rect.width + 16, height: rect.height + 16, scale: 3 }
    });
    return { found: true, rect, inline: rect.inline, image: "data:image/png;base64," + shot.data, capturedAt: new Date().toISOString() };
  } catch (error) {
    return { found: false, reason: errorText(error) };
  }
}

export async function cancelLogin(id) {
  const session = sessions.get(id);
  if (!session) return { cancelled: false };
  try { await session.page.close(); } catch (e) { /* gone */ }
  session.state = "cancelled";
  return { cancelled: true };
}

/**
 * Re-read every platform's own page state and reconcile the stored bindings.
 *
 * This is the repair path for bindings recorded before the account probe existed:
 * a platform with no signed-in account loses its binding, a signed-in one gains
 * the real uid and nickname, and a second account on the same platform becomes a
 * separate row instead of overwriting the first.
 */
export async function verifyBindings(db) {
  const { cdp } = await ensureBrowser({ headless: false });
  const results = [];
  for (const p of PLATFORMS) {
    const probe = loginProbe(p.id);
    if (!probe) { results.push({ platform: p.id, state: "no-probe" }); continue; }
    let page = null;
    try {
      page = await openPage(cdp, p.home);
      const account = await waitForAccount(page, probe, 18000);
      if (account && account.uid) {
        const cookies = await page.cookies();
        const id = saveBinding(db, p, cookies, account);
        results.push({ platform: p.id, state: "active", uid: account.uid, nickname: account.nickname, bindingId: id });
      } else {
        const removed = db.prepare("DELETE FROM bindings WHERE platform = ?").run(p.id);
        results.push({ platform: p.id, state: "signed-out", removed: removed.changes });
      }
    } catch (error) {
      results.push({ platform: p.id, state: "error", error: errorText(error) });
    } finally {
      if (page) { try { await page.close(); } catch (e) { /* gone */ } }
    }
  }
  return results;
}

/** 在页面里运行：读取账号主页的统计数字。 */
function readProfileStats() {
  const pick = (selector) => {
    const el = document.querySelector(selector);
    if (!el) return "";
    return (el.innerText || "").replace(/\s+/g, " ").trim();
  };
  const num = (text) => {
    const m = String(text || "").match(/([\d.]+)\s*(万|w|W)?/);
    if (!m) return 0;
    const n = Number(m[1]);
    return Number.isFinite(n) ? Math.round(m[2] ? n * 10000 : n) : 0;
  };
  const info = pick('[data-e2e="user-info"]');
  const user = window.userInfoStore && window.userInfoStore.curLoginUserInfo;
  return {
    nickname: (user && user.nickname) || "",
    uid: user && user.uid ? String(user.uid) : "",
    fans: num(pick('[data-e2e="user-info-fans"]')),
    following: num(pick('[data-e2e="user-info-follow"]')),
    likes: num(pick('[data-e2e="user-info-like"]')),
    works: num(user && user.awemeCount),
    raw: info.slice(0, 300)
  };
}

/**
 * 逐个已登录平台读取账号统计并落库。只对有实现的平台生效，其余如实返回 unsupported。
 */
export async function refreshAccountStats(db) {
  const supported = { douyin: "https://www.douyin.com/user/self" };
  const bindings = db.prepare("SELECT * FROM bindings WHERE state = 'active'").all();
  if (bindings.length === 0) return [];
  const { cdp } = await ensureBrowser({ headless: false });
  const results = [];
  for (const binding of bindings) {
    const url = supported[binding.platform];
    if (!url) { results.push({ platform: binding.platform, state: "unsupported" }); continue; }
    let page = null;
    try {
      page = await openPage(cdp, url);
      const probe = loginProbe(binding.platform);
      const account = await waitForAccount(page, probe, 18000);
      if (!account) { results.push({ platform: binding.platform, state: "signed-out" }); continue; }
      await page.evaluate("window.scrollBy(0, 300)").catch(() => {});
      await new Promise((resolve) => setTimeout(resolve, 2500));
      const stats = await page.evaluate("(" + readProfileStats.toString() + ")()").catch(() => null);
      if (!stats) { results.push({ platform: binding.platform, state: "no-stats" }); continue; }
      db.prepare(
        "INSERT INTO account_stats (platform, binding_id, nickname, followers, following, works, likes, raw_json, taken_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
      ).run(binding.platform, binding.id, stats.nickname || binding.nickname || "", stats.fans || 0, stats.following || 0, stats.works || 0, stats.likes || 0, JSON.stringify(stats), nowIso());
      results.push({ platform: binding.platform, state: "ok", nickname: stats.nickname, fans: stats.fans, following: stats.following, works: stats.works, likes: stats.likes });
    } catch (error) {
      results.push({ platform: binding.platform, state: "error", error: errorText(error) });
    } finally {
      if (page) { try { await page.close(); } catch (e) { /* gone */ } }
    }
  }
  return results;
}

export function listLogins() {
  return [...sessions.values()].map(sessionView);
}

export async function closeAllLogins() {
  for (const session of sessions.values()) {
    if (session.state === "waiting") { try { await session.page.close(); } catch (e) { /* gone */ } }
  }
  sessions.clear();
}
