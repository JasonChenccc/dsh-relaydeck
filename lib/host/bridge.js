// RelayDeck host half (browser side) — config resolution, session context,
// event forwarding, and the same-origin proxy call.
//
// IMPORTANT: this file is bundled into client.js and runs in the RENDERER. A
// direct fetch to the loopback backend from here would be cross-origin, so every
// API call goes through /dsh-relaydeck/proxy, which the Node half registers.
export var DEFAULT_PORT = 18731;
export var CONFIG_PATH = "/dsh-relaydeck/config";
export var PROXY_PATH = "/dsh-relaydeck/proxy";
export var PANEL_ID = "dsh-relaydeck";
var CONFIG_TIMEOUT_MS = 3000;
var PROXY_TIMEOUT_MS = 15000;

/** The proxy is the only way the panel reaches the backend. */
export function isProxyPath(value) {
  return typeof value === "string" && value.charAt(0) === "/";
}

export function fetchHostConfig(fetchImpl) {
  var doFetch = fetchImpl || fetch;
  try {
    return doFetch(CONFIG_PATH, {
      signal: AbortSignal.timeout(CONFIG_TIMEOUT_MS),
      credentials: "same-origin",
      headers: { accept: "application/json" }
    }).then(function (res) { return res && res.ok ? res.json() : null; })
      .catch(function () { return null; });
  } catch (e) {
    return Promise.resolve(null);
  }
}

// Read the host's current session context through the optional uiSession service.
export function getSessionContext(ctx) {
  var fallback = { available: false };
  try {
    if (!ctx || typeof ctx.get !== "function") return fallback;
    var uiSession = ctx.get("uiSession");
    if (!uiSession || !uiSession.sessions || !uiSession.sessions.list) return fallback;
    var snapshot = uiSession.sessions.list.getSnapshot ? uiSession.sessions.list.getSnapshot() : null;
    if (!snapshot || !snapshot.byId) return fallback;
    var byId = snapshot.byId;
    var ids = Object.keys(byId);
    if (ids.length === 0) return { available: true, sessionId: null, title: "(无会话)", running: false, sessionCount: 0 };
    var mainId = uiSession.mainRetainId && byId[uiSession.mainRetainId] ? uiSession.mainRetainId : ids[0];
    var session = byId[mainId] || {};
    return {
      available: true,
      sessionId: session.id || mainId,
      title: session.title || session.name || "(未命名会话)",
      messageCount: typeof session.messageCount === "number" ? session.messageCount : undefined,
      running: session.running === true || session.status === "running",
      sessionCount: ids.length
    };
  } catch (e) {
    return { available: false, error: String(e && e.message ? e.message : e) };
  }
}

export function createHostBridge(ctx, config) {
  return {
    panelId: PANEL_ID,
    configPath: CONFIG_PATH,
    proxyPath: PROXY_PATH,

    /** Effective host config (port, data dir, dev flags). */
    resolveConfig: function () {
      return fetchHostConfig().then(function (cfg) {
        return cfg || { port: DEFAULT_PORT, baseUrl: "http://127.0.0.1:" + DEFAULT_PORT, source: "default" };
      });
    },

    /**
     * Call the RelayDeck backend through the host route. The browser never
     * touches the loopback port directly.
     */
    proxyFetch: function (path, options) {
      var opts = options || {};
      var timeoutMs = typeof opts.timeoutMs === "number" ? opts.timeoutMs : PROXY_TIMEOUT_MS;
      if (!isProxyPath(path)) return Promise.resolve({ ok: false, status: 0, data: null, error: "forbidden" });
      if (path !== "/health" && path.indexOf("/api/") !== 0) return Promise.resolve({ ok: false, status: 0, data: null, error: "forbidden" });
      var url = PROXY_PATH + "?path=" + encodeURIComponent(path);
      var init = {
        method: opts.method || "GET",
        credentials: "same-origin",
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(timeoutMs)
      };
      if (opts.body !== undefined) {
        init.headers["content-type"] = "application/json";
        init.body = JSON.stringify(opts.body);
      }
      return fetch(url, init).then(function (res) {
        return res.text().then(function (body) {
          var data = null;
          if (body.length > 0) { try { data = JSON.parse(body); } catch (e) { data = null; } }
          return { ok: res.ok, status: res.status, data: data };
        });
      }).catch(function (err) {
        return { ok: false, status: 0, data: null, error: String(err && err.message ? err.message : err) };
      });
    },

    /** Forward host events to the panel; the returned unsubscribe releases all. */
    subscribe: function (emit) {
      var disposers = [];
      function emitSafe(name, payload) { try { emit({ name: name, payload: payload }); } catch (e) { /* listener errors stay local */ } }

      try {
        if (ctx && typeof ctx.on === "function") {
          var onReset = ctx.on("connection/reset", function () { emitSafe("connection-reset", {}); });
          if (typeof onReset === "function") disposers.push(onReset);
        }
      } catch (e) { /* optional */ }

      try {
        var uiSession = ctx && typeof ctx.get === "function" ? ctx.get("uiSession") : undefined;
        if (uiSession && uiSession.sessions && uiSession.sessions.list && typeof uiSession.sessions.list.subscribe === "function") {
          var offList = uiSession.sessions.list.subscribe(function () { emitSafe("session-context", getSessionContext(ctx)); });
          if (typeof offList === "function") disposers.push(offList);
        }
      } catch (e) { /* optional */ }

      try {
        var remote = ctx && typeof ctx.get === "function" ? ctx.get("remote") : undefined;
        if (remote && typeof remote.$on === "function") {
          var offStatus = remote.$on("api-session/status", function (sessionId, running) {
            emitSafe("agent-status", { sessionId: sessionId, running: running === true });
          });
          if (typeof offStatus === "function") disposers.push(offStatus);
        }
      } catch (e) { /* optional */ }

      return function unsubscribe() {
        while (disposers.length > 0) {
          var dispose = disposers.pop();
          try { dispose(); } catch (e) { /* already gone */ }
        }
      };
    },

    openExternal: function (url) {
      try { window.open(url, "_blank", "noopener,noreferrer"); return true; } catch (e) { return false; }
    }
  };
}
