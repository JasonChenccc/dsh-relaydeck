// SA Manager host half (browser side) — config resolution, session context,
// event forwarding, and the same-origin proxy call.
//
// IMPORTANT: this file is bundled into client.js and therefore runs in the
// RENDERER, not in Node. A direct fetch to 127.0.0.1:8731 from here is a browser
// request and CreatorHub sends no Access-Control-Allow-Origin, so it fails with
// "Failed to fetch". Every API read must go through /dsh-samanager/proxy, which
// the Node half (lib/index.js) registers and forwards.
export var DEFAULT_BASE_URL = "http://127.0.0.1:8731";
export var CONFIG_PATH = "/dsh-samanager/config";
export var PROXY_PATH = "/dsh-samanager/proxy";
export var PANEL_ID = "dsh-samanager";
var BRIDGE_TIMEOUT_MS = 2000;
var PROXY_TIMEOUT_MS = 10000;

export function isLoopback(value) {
  if (typeof value !== "string" || value.length === 0) return false;
  try {
    var host = new URL(value).hostname;
    return host === "127.0.0.1" || host === "localhost";
  } catch (e) { return false; }
}

export function resolveStaticBaseUrl(ctx, config) {
  var candidates = [];
  if (config && typeof config.baseUrl === "string") candidates.push(config.baseUrl);
  try {
    if (ctx && ctx.config && typeof ctx.config.baseUrl === "string") candidates.push(ctx.config.baseUrl);
  } catch (e) { /* guarded ctx denies undeclared reads */ }
  if (ctx && typeof ctx.get === "function") {
    try {
      var injected = ctx.get("saManagerConfig");
      if (injected && typeof injected.baseUrl === "string") candidates.push(injected.baseUrl);
    } catch (e) { /* optional lookup */ }
  }
  for (var i = 0; i < candidates.length; i++) if (isLoopback(candidates[i])) return candidates[i];
  return undefined;
}

export function fetchBridgeBaseUrl(fetchImpl) {
  var doFetch = fetchImpl || fetch;
  try {
    return doFetch(CONFIG_PATH, {
      signal: AbortSignal.timeout(BRIDGE_TIMEOUT_MS),
      credentials: "same-origin",
      headers: { accept: "application/json" }
    }).then(function (res) { return res && res.ok ? res.json() : null; })
      .then(function (json) { return json && typeof json.baseUrl === "string" ? json.baseUrl : undefined; })
      .catch(function () { return undefined; });
  } catch (e) {
    return Promise.resolve(undefined);
  }
}

export function pickBaseUrl(bridgeValue, staticValue) {
  if (isLoopback(bridgeValue)) return { baseUrl: bridgeValue, source: "host-bridge" };
  if (isLoopback(staticValue)) return { baseUrl: staticValue, source: "host-config" };
  return { baseUrl: DEFAULT_BASE_URL, source: "default" };
}

// Read the host's current session context through the optional uiSession service.
// Never throws: a missing service or an unexpected shape degrades to { available: false }.
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
    if (ids.length === 0) return { available: true, sessionId: null, title: "(无会话)", messageCount: 0, running: false, sessionCount: 0 };
    var mainId = uiSession.mainRetainId && byId[uiSession.mainRetainId] ? uiSession.mainRetainId : ids[0];
    var session = byId[mainId] || {};
    var running = session.running === true || session.status === "running";
    return {
      available: true,
      sessionId: session.id || mainId,
      title: session.title || session.name || "(未命名会话)",
      messageCount: typeof session.messageCount === "number" ? session.messageCount : (typeof session.messages === "number" ? session.messages : undefined),
      running: running,
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

    resolveBaseUrl: function () {
      return fetchBridgeBaseUrl().then(function (bridgeValue) {
        return pickBaseUrl(bridgeValue, resolveStaticBaseUrl(ctx, config));
      });
    },

    // Read-only CreatorHub request forwarded by the Node half. Only /health and
    // /api/* are allowed; the Host route repeats the same check.
    proxyFetch: function (path, options) {
      var opts = options || {};
      var timeoutMs = typeof opts.timeoutMs === "number" ? opts.timeoutMs : PROXY_TIMEOUT_MS;
      if (typeof path !== "string" || path.charAt(0) !== "/") return Promise.resolve({ ok: false, status: 0, data: null, error: "forbidden" });
      if (path !== "/health" && path.indexOf("/api/") !== 0) return Promise.resolve({ ok: false, status: 0, data: null, error: "forbidden" });
      if (opts.method !== undefined && opts.method !== "GET") return Promise.resolve({ ok: false, status: 0, data: null, error: "forbidden" });
      var url = PROXY_PATH + "?path=" + encodeURIComponent(path);
      return fetch(url, {
        method: "GET",
        credentials: "same-origin",
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(timeoutMs)
      }).then(function (res) {
        return res.text().then(function (text) {
          var data = null;
          if (text.length > 0) { try { data = JSON.parse(text); } catch (e) { data = null; } }
          return { ok: res.ok, status: res.status, data: data };
        });
      }).catch(function (err) {
        return { ok: false, status: 0, data: null, error: String(err && err.message ? err.message : err) };
      });
    },

    // Forward host events to the panel. Returns an unsubscribe that releases every
    // registration, so the panel can dispose without leaving listeners behind.
    subscribe: function (emit) {
      var disposers = [];
      function emitSafe(name, payload) { try { emit({ name: name, payload: payload }); } catch (e) { /* panel listener errors stay local */ } }

      try {
        if (ctx && typeof ctx.on === "function") {
          var onReset = ctx.on("connection/reset", function () { emitSafe("connection-reset", {}); });
          if (typeof onReset === "function") disposers.push(onReset);
        }
      } catch (e) { /* optional event */ }

      try {
        var uiSession = ctx && typeof ctx.get === "function" ? ctx.get("uiSession") : undefined;
        if (uiSession && uiSession.sessions && uiSession.sessions.list && typeof uiSession.sessions.list.subscribe === "function") {
          var offList = uiSession.sessions.list.subscribe(function () { emitSafe("session-context", getSessionContext(ctx)); });
          if (typeof offList === "function") disposers.push(offList);
        }
      } catch (e) { /* optional service */ }

      try {
        var remote = ctx && typeof ctx.get === "function" ? ctx.get("remote") : undefined;
        if (remote && typeof remote.$on === "function") {
          var offStatus = remote.$on("api-session/status", function (sessionId, running) {
            emitSafe("agent-status", { sessionId: sessionId, running: running === true });
          });
          if (typeof offStatus === "function") disposers.push(offStatus);
        }
      } catch (e) { /* optional service */ }

      return function unsubscribe() {
        while (disposers.length > 0) {
          var dispose = disposers.pop();
          try { dispose(); } catch (e) { /* already gone */ }
        }
      };
    },

    openExternal: function (url) {
      if (!isLoopback(url)) return false;
      try { window.open(url, "_blank", "noopener,noreferrer"); return true; } catch (e) { return false; }
    }
  };
}
