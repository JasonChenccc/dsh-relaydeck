// RelayDeck — a zero-dependency Chrome DevTools Protocol client.
//
// Node 24 ships a WebSocket client, so driving a real browser needs no packages:
// launch Chrome/Edge with --remote-debugging-port, read /json/version, then talk
// CDP over that socket. Driving the real page is deliberate: the page performs
// its own request signing, so RelayDeck does not reimplement platform crypto.
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { findBrowser, defaultUserDataDir } from "./find.mjs";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchJson(url, timeoutMs) {
  const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs || 2000) });
  if (!res.ok) throw new Error("HTTP " + res.status);
  return await res.json();
}

/** Wait until the debugging endpoint answers, or fail with a clear reason. */
async function waitForEndpoint(port, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let last;
  while (Date.now() < deadline) {
    try { return await fetchJson("http://127.0.0.1:" + port + "/json/version", 1500); }
    catch (error) { last = error; await sleep(200); }
  }
  throw new Error("browser debugging endpoint never came up on port " + port + (last ? " (" + last.message + ")" : ""));
}

/**
 * Launch a browser with remote debugging enabled.
 * @returns {{port:number, executable:string, userDataDir:string, version:object, stop:Function, alreadyRunning:boolean}}
 */
export async function launchBrowser(options = {}) {
  const executable = options.executable || findBrowser();
  if (!executable) throw new Error("no Chrome/Edge found; set RELAYDECK_BROWSER to a browser executable");
  const port = Number(options.port || 19222);
  const userDataDir = options.userDataDir || defaultUserDataDir(options.baseDir);
  mkdirSync(userDataDir, { recursive: true });

  // Reuse an already-listening instance on this port (previous run, same profile).
  try {
    const version = await fetchJson("http://127.0.0.1:" + port + "/json/version", 1200);
    return { port, executable, userDataDir, version, alreadyRunning: true, stop: async () => {} };
  } catch (e) { /* not running yet */ }

  const args = [
    "--remote-debugging-port=" + port,
    "--user-data-dir=" + userDataDir,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-features=Translate,OptimizationHints",
    ...(options.headless ? ["--headless=new"] : []),
    ...(options.args || []),
    options.startUrl || "about:blank"
  ];
  const child = spawn(executable, args, { stdio: "ignore", detached: false, windowsHide: false });
  child.on("error", () => {});

  const version = await waitForEndpoint(port, options.timeoutMs || 25000);
  return {
    port, executable, userDataDir, version, alreadyRunning: false,
    stop: async () => {
      try { child.kill(); } catch (e) { /* already gone */ }
      await sleep(200);
    }
  };
}

/** Open one CDP WebSocket connection to the browser endpoint. */
export async function connectBrowser(browser) {
  const wsUrl = browser.version && browser.version.webSocketDebuggerUrl
    ? browser.version.webSocketDebuggerUrl
    : (await fetchJson("http://127.0.0.1:" + browser.port + "/json/version", 2000)).webSocketDebuggerUrl;
  const socket = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", () => resolve(), { once: true });
    socket.addEventListener("error", () => reject(new Error("CDP socket failed to open")), { once: true });
  });

  let nextId = 1;
  const pending = new Map();
  const listeners = new Set();

  socket.addEventListener("message", (event) => {
    let message;
    try { message = JSON.parse(String(event.data)); } catch (e) { return; }
    if (message.id !== undefined && pending.has(message.id)) {
      const entry = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) entry.reject(new Error(message.error.message || "CDP error"));
      else entry.resolve(message.result);
      return;
    }
    if (message.method) for (const listener of [...listeners]) { try { listener(message); } catch (e) { /* ignore */ } }
  });

  function send(method, params, sessionId) {
    const id = nextId++;
    const payload = { id, method, params: params || {} };
    if (sessionId) payload.sessionId = sessionId;
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      try { socket.send(JSON.stringify(payload)); }
      catch (error) { pending.delete(id); reject(error); }
      setTimeout(() => {
        if (pending.has(id)) { pending.delete(id); reject(new Error("CDP timeout: " + method)); }
      }, 45000).unref();
    });
  }

  return {
    send,
    on(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    close() { try { socket.close(); } catch (e) { /* already closed */ } }
  };
}

/** Attach to a fresh page target and return page-scoped helpers. */
export async function openPage(cdp, url) {
  const { targetId } = await cdp.send("Target.createTarget", { url: url || "about:blank" });
  const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });
  const send = (method, params) => cdp.send(method, params, sessionId);
  await send("Page.enable", {});
  await send("Runtime.enable", {});
  await send("Network.enable", {});
  return {
    targetId,
    sessionId,
    send,
    async navigate(target, options2) {
      const opts = options2 || {};
      const done = new Promise((resolve) => {
        const off = cdp.on((message) => {
          if (message.sessionId === sessionId && message.method === "Page.loadEventFired") { off(); resolve(); }
        });
        setTimeout(() => { off(); resolve(); }, opts.timeoutMs || 45000).unref();
      });
      await send("Page.navigate", { url: target });
      await done;
    },
    async evaluate(expression, awaitPromise) {
      const result = await send("Runtime.evaluate", {
        expression, awaitPromise: awaitPromise !== false, returnByValue: true
      });
      if (result.exceptionDetails) {
        throw new Error("evaluate failed: " + (result.exceptionDetails.text || "unknown"));
      }
      return result.result ? result.result.value : undefined;
    },
    async cookies(urls) {
      const result = await send("Network.getCookies", urls ? { urls } : {});
      return result.cookies || [];
    },
    async close() {
      try { await cdp.send("Target.closeTarget", { targetId }); } catch (e) { /* gone */ }
    }
  };
}

export { findBrowser, defaultUserDataDir };
