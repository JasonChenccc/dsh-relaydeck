// SA Manager panel — CreatorHub API client.
// Every read goes through host.proxyFetch, which calls the same-origin Host route
// /dsh-samanager/proxy. There is deliberately NO direct-fetch fallback: a direct
// browser request to 127.0.0.1:8731 is cross-origin and would be masked by CORS
// as "Failed to fetch", hiding the real wiring problem.
export var PLATFORMS = ["douyin", "xhs", "kuaishou", "shipinhao", "tiktok"];
export var PLATFORM_OPTIONS = [
  { value: "", label: "全部平台" },
  { value: "douyin", label: "抖音" },
  { value: "xhs", label: "小红书" },
  { value: "kuaishou", label: "快手" },
  { value: "shipinhao", label: "视频号" },
  { value: "tiktok", label: "TikTok" }
];

export var PROXY_UNAVAILABLE = "宿主代理不可用（host.proxyFetch 未注入）";

export function createApiBridge(baseUrl, proxy) {
  function request(path, timeoutMs) {
    if (typeof proxy !== "function") {
      return Promise.resolve({ ok: false, status: 0, data: null, raw: "", latencyMs: 0, error: PROXY_UNAVAILABLE });
    }
    var started = Date.now();
    var run;
    try {
      run = proxy(path, { timeoutMs: timeoutMs });
    } catch (err) {
      return Promise.resolve({ ok: false, status: 0, data: null, raw: "", latencyMs: Date.now() - started, error: String(err && err.message ? err.message : err) });
    }
    return Promise.resolve(run).then(function (res) {
      if (!res) return { ok: false, status: 0, data: null, raw: "", latencyMs: Date.now() - started, error: "empty proxy response" };
      return {
        ok: res.ok === true,
        status: res.status || 0,
        data: res.data === undefined ? null : res.data,
        raw: res.data === undefined || res.data === null ? "" : JSON.stringify(res.data),
        error: res.error,
        latencyMs: Date.now() - started
      };
    }).catch(function (err) {
      return { ok: false, status: 0, data: null, raw: "", latencyMs: Date.now() - started, error: String(err && err.message ? err.message : err) };
    });
  }

  function query(platform) {
    return platform ? ("?platform=" + encodeURIComponent(platform)) : "";
  }

  return {
    baseUrl: baseUrl,
    request: request,
    getHealth: function () {
      return request("/health", 3000).then(function (res) {
        return {
          online: res.ok,
          status: res.status,
          latencyMs: res.latencyMs,
          raw: res.raw,
          error: res.ok ? undefined : (res.error || ("HTTP " + res.status))
        };
      });
    },
    getOverview: function (platform) { return request("/api/overview/summary?platform=" + encodeURIComponent(platform || "douyin")); },
    getSeries: function (platform, days) { return request("/api/stats/series?days=" + encodeURIComponent(String(days || 7)) + (platform ? "&platform=" + encodeURIComponent(platform) : "")); },
    getAccounts: function (platform) { return request("/api/accounts" + query(platform)); },
    getRiskSummary: function () { return request("/api/risk-control/summary"); },
    getMonitors: function () { return request("/api/monitors"); },
    getAccountWorks: function (accountId) { return request("/api/account-works?account_id=" + encodeURIComponent(String(accountId))); },
    getCollections: function () { return request("/api/collections"); },
    getCommentWatches: function () { return request("/api/comment-watches"); },
    getComments: function () { return request("/api/comments"); },
    getDanmakuWatches: function () { return request("/api/danmaku-watches"); },
    getDanmaku: function () { return request("/api/danmaku"); },
    getHubSummary: function (accountId) { return request("/api/hub/summary?account_id=" + encodeURIComponent(String(accountId))); },
    getAccountStats: function (accountId) { return request("/api/account-stats/" + encodeURIComponent(String(accountId))); },
    getTasks: function (options) {
      var opts = options || {};
      var q = "state=" + encodeURIComponent(opts.state || "active") +
        "&page=" + encodeURIComponent(String(opts.page || 1)) +
        "&page_size=" + encodeURIComponent(String(opts.pageSize || 20));
      if (opts.platform) q += "&platform=" + encodeURIComponent(opts.platform);
      if (opts.q) q += "&q=" + encodeURIComponent(opts.q);
      return request("/api/task-queue?" + q);
    },
    getPublish: function () { return request("/api/publish"); },
    getPublished: function () { return request("/api/publish/published"); },
    getCommentRules: function () { return request("/api/comment-rules"); },
    getCommentTasks: function () { return request("/api/comment-tasks"); },
    getShareHistory: function () { return request("/api/share-download/history"); },
    getNotifications: function () { return request("/api/notifications"); }
  };
}
