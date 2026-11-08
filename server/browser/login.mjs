// RelayDeck — interactive QR login.
//
// A login opens the platform's own page in a visible browser window. The user
// scans the QR code there; the platform sets its session cookies on the page.
// RelayDeck only observes: it waits for those cookies, then records a binding.
// The browser profile lives on disk, so the session survives restarts.
import { ensureBrowser } from "./session.mjs";
import { openPage } from "./cdp.mjs";
import { platform } from "../platforms.mjs";
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

function saveBinding(db, p, cookies) {
  const secret = JSON.stringify(cookies.map((c) => ({ name: c.name, value: c.value, domain: c.domain, path: c.path, expires: c.expires })));
  const existing = db.prepare("SELECT id FROM bindings WHERE platform = ? AND platform_uid = ?").get(p.id, "default");
  if (existing) {
    db.prepare("UPDATE bindings SET state = 'active', secret_json = ?, last_used_at = ? WHERE id = ?").run(secret, nowIso(), existing.id);
    return existing.id;
  }
  const info = db.prepare(
    "INSERT INTO bindings (platform, label, platform_uid, nickname, state, secret_json, created_at) VALUES (?, ?, ?, ?, 'active', ?, ?)"
  ).run(p.id, p.title, "default", "", secret, nowIso());
  return Number(info.lastInsertRowid);
}

/** Check one login; records the binding as soon as the platform session exists. */
export async function pollLogin(db, id) {
  const session = sessions.get(id);
  if (!session) return { state: "unknown" };
  if (session.state !== "waiting") return sessionView(session);
  const p = platform(session.platform);
  try {
    const cookies = await session.page.cookies();
    const matched = p.sessionCookies.filter((name) => cookies.some((c) => c.name === name && c.value));
    session.matched = matched;
    if (matched.length > 0) {
      session.bindingId = saveBinding(db, p, cookies);
      session.state = "ok";
      try { await session.page.close(); } catch (e) { /* keep the profile */ }
      log("info", "login captured", { platform: p.id, cookies: cookies.length, matched });
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

export function listLogins() {
  return [...sessions.values()].map(sessionView);
}

export async function closeAllLogins() {
  for (const session of sessions.values()) {
    if (session.state === "waiting") { try { await session.page.close(); } catch (e) { /* gone */ } }
  }
  sessions.clear();
}
