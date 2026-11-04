// creatorhub-dsh browser half (Phase 5/6).
// Loaded by the DSH web client through window.__ModuleLoader__: the host serves
// this file under /plugins and the browser registers the factory below.
// Contract: exports.apply(ctx, config) + exports.inject; registers a sidebar
// panel via ctx.slots.inject (deferred registration).
// Native JS only: no build step, no JSX, no external resources.
window.__ModuleLoader__.load({
  id: "creatorhub-dsh",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;

    var React = require("react");

    var PANEL_ID = "creatorhub";
    var DEFAULT_BASE_URL = "http://127.0.0.1:8731";
    var CONFIG_PATH = "/creatorhub-dsh/config";
    var HEALTH_INTERVAL_MS = 30000;
    var BRIDGE_TIMEOUT_MS = 2000;

    // Loopback guard: the panel never points at a non-loopback address.
    function isLoopback(value) {
      if (typeof value !== "string" || value.length === 0) return false;
      try {
        var host = new URL(value).hostname;
        return host === "127.0.0.1" || host === "localhost";
      } catch (e) { return false; }
    }

    // Final resolution order: host bridge -> host-injected config -> static
    // candidates -> loopback default. Any non-loopback value is rejected.
    function pickBaseUrl(bridgeValue, staticValue) {
      if (isLoopback(bridgeValue)) return { baseUrl: bridgeValue, source: "host-bridge" };
      if (isLoopback(staticValue)) return { baseUrl: staticValue, source: "host-config" };
      return { baseUrl: DEFAULT_BASE_URL, source: "default" };
    }

    // Static candidates the host may already have injected into apply(ctx, config).
    function resolveStaticBaseUrl(ctx, config) {
      var candidates = [];
      if (config && typeof config.baseUrl === "string") candidates.push(config.baseUrl);
      if (ctx && ctx.config && typeof ctx.config.baseUrl === "string") candidates.push(ctx.config.baseUrl);
      for (var i = 0; i < candidates.length; i++) if (isLoopback(candidates[i])) return candidates[i];
      return undefined;
    }

    // Read baseUrl from the host-registered read-only config route. Never throws.
    function fetchBridgeBaseUrl(fetchImpl) {
      var doFetch = fetchImpl || fetch;
      try {
        return doFetch(CONFIG_PATH, { signal: AbortSignal.timeout(BRIDGE_TIMEOUT_MS), credentials: "same-origin", headers: { accept: "application/json" } })
          .then(function (res) { return res && res.ok ? res.json() : null; })
          .then(function (json) { return json && typeof json.baseUrl === "string" ? json.baseUrl : undefined; })
          .catch(function () { return undefined; });
      } catch (e) {
        return Promise.resolve(undefined);
      }
    }

    function apply(ctx, config) {
      var staticBaseUrl = resolveStaticBaseUrl(ctx, config);
      var e = React.createElement;

      function useResolved() {
        var pair = React.useState({ baseUrl: null, source: "pending" });
        var state = pair[0];
        var setState = pair[1];
        React.useEffect(function () {
          var cancelled = false;
          fetchBridgeBaseUrl().then(function (bridgeValue) {
            if (!cancelled) setState(pickBaseUrl(bridgeValue, staticBaseUrl));
          });
          return function () { cancelled = true; };
        }, []);
        return state;
      }

      function useHealth(address) {
        var pair = React.useState({ running: false, checked: false });
        var health = pair[0];
        var setHealth = pair[1];
        React.useEffect(function () {
          if (!address) return undefined;
          var cancelled = false;
          function probe() {
            fetch(address + "/health", { signal: AbortSignal.timeout(2000) })
              .then(function (res) { return res.ok; })
              .catch(function () { return false; })
              .then(function (ok) { if (!cancelled) setHealth({ running: ok, checked: true }); });
          }
          probe();
          var timer = setInterval(probe, HEALTH_INTERVAL_MS);
          return function () { cancelled = true; clearInterval(timer); };
        }, [address]);
        return health;
      }

      function CreatorHubIcon() {
        return e("svg", { width: 16, height: 16, viewBox: "0 0 16 16", "aria-hidden": "true", focusable: "false" },
          e("rect", { x: 1.5, y: 1.5, width: 13, height: 13, rx: 3, fill: "none", stroke: "currentColor", strokeWidth: 1.5 }),
          e("path", { d: "M4.5 8.5 L7 11 L11.5 5.5", fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round" })
        );
      }

      function CreatorHubPanel() {
        var resolved = useResolved();
        var health = useHealth(resolved.baseUrl);
        var dot = health.running ? "#22c55e" : (health.checked ? "#ef4444" : "#9ca3af");
        var state = resolved.baseUrl === null ? "读取配置中" : (health.running ? "服务在线" : (health.checked ? "服务离线" : "检测中"));
        var sourceText = resolved.source === "host-bridge" ? "配置来源：宿主配置桥"
          : resolved.source === "host-config" ? "配置来源：宿主注入的 config"
          : resolved.source === "default" ? "配置来源：默认地址"
          : "配置来源：读取中…";
        var muted = { color: "#888" };
        var children = [
          e("div", { key: "head", style: { display: "flex", alignItems: "center", gap: "8px", fontWeight: 600 } },
            e("span", { "aria-hidden": "true", style: { width: "8px", height: "8px", borderRadius: "50%", background: dot, display: "inline-block", flex: "0 0 auto" } }),
            e("span", null, "CreatorHub"),
            e("span", { style: { color: "#888", fontWeight: 400 } }, state)
          ),
          e("div", { key: "addr", style: { color: "#888", margin: "6px 0 2px", wordBreak: "break-all" } }, resolved.baseUrl || DEFAULT_BASE_URL),
          e("div", { key: "src", style: { color: "#9ca3af", fontSize: "12px" } }, sourceText)
        ];
        if (resolved.source === "default") {
          children.push(e("div", { key: "warn", style: { color: "#b45309", marginTop: "6px", fontSize: "12px" } },
            "默认地址，未确认与 CreatorHub 实际端口一致。"));
        }
        children.push(e("div", { key: "btn", style: { margin: "12px 0 0" } },
          e("button", {
            type: "button",
            disabled: !resolved.baseUrl,
            onClick: function () { try { window.open(resolved.baseUrl, "_blank", "noopener,noreferrer"); } catch (err) {} },
            style: { padding: "6px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", background: "transparent", cursor: resolved.baseUrl ? "pointer" : "not-allowed" }
          }, "打开工作台")
        ));
        children.push(e("div", { key: "note", style: { color: "#9ca3af", marginTop: "10px", fontSize: "12px" } },
          "登录、采集、发布等操作都在工作台内完成；本面板只做跳转、配置读取与 /health 探测。"));
        return e("div", { style: { padding: "12px", fontSize: "13px", lineHeight: 1.7 } }, children);
      }

      // Real contract, verified against dsh-client-ui-schedule and
      // dsh-client-ui-plugin-manager: every contribution is deferred with
      // ctx.slots.inject(slotName, () => ctx.slots.register(definition, Component)).
      ctx.slots.inject("sidebar.panellist", function () {
        return ctx.slots.register({
          name: "sidebar.panellist",
          id: PANEL_ID,
          order: 50,
          label: "CreatorHub"
        }, CreatorHubIcon);
      });
      ctx.slots.inject("main", function () {
        return ctx.slots.register({
          name: "main",
          key: PANEL_ID
        }, CreatorHubPanel);
      });
      return { panelId: PANEL_ID, configPath: CONFIG_PATH, staticBaseUrl: staticBaseUrl || null };
    }

    exports.apply = apply;
    exports.inject = ["slots"];
    // Extra exports are ignored by the runner (it spreads the module); they exist
    // so the contract test can exercise the resolution helpers directly.
    exports.pickBaseUrl = pickBaseUrl;
    exports.fetchBridgeBaseUrl = fetchBridgeBaseUrl;
    exports.resolveStaticBaseUrl = resolveStaticBaseUrl;
    exports.isLoopback = isLoopback;
    exports.CONFIG_PATH = CONFIG_PATH;
    exports.DEFAULT_BASE_URL = DEFAULT_BASE_URL;
    return module.exports;
  }
});
