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
