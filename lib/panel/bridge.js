// RelayDeck panel — backend API client. Every call goes through the host proxy,
// so the renderer never talks to the loopback port itself.
export function createApiBridge(proxy) {
  function call(method, path, body, timeoutMs) {
    if (typeof proxy !== "function") {
      return Promise.resolve({ ok: false, status: 0, data: null, error: "宿主代理不可用（host.proxyFetch 未注入）" });
    }
    const started = Date.now();
    let pending;
    try {
      pending = proxy(path, { method: method, body: body, timeoutMs: timeoutMs });
    } catch (error) {
      return Promise.resolve({ ok: false, status: 0, data: null, error: String(error && error.message ? error.message : error) });
    }
    return Promise.resolve(pending).then(function (res) {
      if (!res) return { ok: false, status: 0, data: null, error: "empty proxy response" };
      return { ok: res.ok === true, status: res.status || 0, data: res.data === undefined ? null : res.data, error: res.error, latencyMs: Date.now() - started };
    }).catch(function (error) {
      return { ok: false, status: 0, data: null, error: String(error && error.message ? error.message : error), latencyMs: Date.now() - started };
    });
  }

  return {
    call: call,
    health: function () { return call("GET", "/health", undefined, 4000); },
    capabilities: function () { return call("GET", "/api/capabilities"); },
    flows: function () { return call("GET", "/api/flows"); },
    createFlow: function (payload) { return call("POST", "/api/flows", payload); },
    updateFlow: function (id, payload) { return call("PUT", "/api/flows/" + encodeURIComponent(String(id)), payload); },
    deleteFlow: function (id) { return call("DELETE", "/api/flows/" + encodeURIComponent(String(id))); },
    runFlow: function (id) { return call("POST", "/api/flows/" + encodeURIComponent(String(id)) + "/run", {}, 60000); },
    runs: function (limit) { return call("GET", "/api/runs?limit=" + encodeURIComponent(String(limit || 50))); },
    run: function (id) { return call("GET", "/api/runs/" + encodeURIComponent(String(id))); },
    artifacts: function (limit, platform) {
      let path = "/api/artifacts?limit=" + encodeURIComponent(String(limit || 100));
      if (platform) path += "&platform=" + encodeURIComponent(platform);
      return call("GET", path);
    },
    bindings: function () { return call("GET", "/api/bindings"); },
    verifyBindings: function () { return call("POST", "/api/bindings/verify", {}, 120000); },
    queue: function () { return call("GET", "/api/queue"); },
    metrics: function () { return call("GET", "/api/metrics"); },
    testNotification: function (id) { return call("POST", "/api/notifications/" + encodeURIComponent(String(id)) + "/send-test", {}, 20000); },
    downloadUrls: function (urls, perItem) { return call("POST", "/api/downloads", { urls: urls, perItem: perItem || 1 }, 600000); },
    areaList: function (path) { return call("GET", "/api/" + path); },
    areaCreate: function (path, body) { return call("POST", "/api/" + path, body); },
    areaUpdate: function (path, id, body) { return call("PUT", "/api/" + path + "/" + encodeURIComponent(String(id)), body); },
    areaToggle: function (path, id) { return call("POST", "/api/" + path + "/" + encodeURIComponent(String(id)) + "/toggle", {}); },
    areaDelete: function (path, id) { return call("DELETE", "/api/" + path + "/" + encodeURIComponent(String(id))); },
    records: function (kind, limit) { return call("GET", "/api/records?kind=" + encodeURIComponent(kind || "") + "&limit=" + (limit || 100)); },
    accountStats: function () { return call("GET", "/api/account-stats"); },
    refreshAccountStats: function () { return call("POST", "/api/account-stats/refresh", {}, 180000); },
    publishPlans: function () { return call("GET", "/api/publish-plans"); },
    reviewPlan: function (id, status) { return call("POST", "/api/publish-plans/" + encodeURIComponent(String(id)), { status: status }); },
    platforms: function () { return call("GET", "/api/platforms"); },
    logins: function () { return call("GET", "/api/login"); },
    startLogin: function (platform) { return call("POST", "/api/login", { platform: platform }); },
    loginStatus: function (id) { return call("GET", "/api/login/" + encodeURIComponent(String(id))); },
    loginQr: function (id) { return call("GET", "/api/login/" + encodeURIComponent(String(id)) + "/qr", undefined, 20000); },
    cancelLogin: function (id) { return call("POST", "/api/login/" + encodeURIComponent(String(id)) + "/cancel", {}); }
  };
}
