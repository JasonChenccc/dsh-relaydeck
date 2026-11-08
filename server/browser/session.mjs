// RelayDeck — one shared browser session for the whole backend.
//
// The browser is launched lazily on first use and kept for the process lifetime;
// ctx.subprocess reaps it with the backend when the plugin is disposed.
import { launchBrowser, connectBrowser } from "./cdp.mjs";
import { log } from "../log.mjs";

let state = { browser: null, cdp: null };

export async function ensureBrowser(options = {}) {
  if (state.cdp !== null) return state;
  const browser = await launchBrowser({
    port: options.port || 19222,
    userDataDir: options.userDataDir,
    headless: options.headless === true,
    baseDir: options.baseDir,
    timeoutMs: options.timeoutMs
  });
  const cdp = await connectBrowser(browser);
  state = { browser, cdp };
  log("info", "browser session ready", { port: browser.port, executable: browser.executable, reused: browser.alreadyRunning });
  return state;
}

export function currentSession() {
  return state.cdp === null ? null : state;
}

export async function closeSession() {
  if (state.cdp !== null) { try { state.cdp.close(); } catch (e) { /* gone */ } }
  if (state.browser !== null) { try { await state.browser.stop(); } catch (e) { /* gone */ } }
  state = { browser: null, cdp: null };
}
