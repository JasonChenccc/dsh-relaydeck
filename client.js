// creatorhub-dsh browser half (Phase 5).
// Loaded by the DSH web client through window.__ModuleLoader__: the host serves
// this file under /plugins and the browser registers the factory below.
// Contract: exports.apply(ctx, config) + exports.inject; registers a sidebar
// panel (sidebar.panellist entry + layout "main" keyed slot with the same id).
// Native JS only: no build step, no JSX, no external resources.
window.__ModuleLoader__.load({
  id: "creatorhub-dsh",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;

    var React = require("react");

    var PANEL_ID = "creatorhub";
    var DEFAULT_BASE_URL = "http://127.0.0.1:8731";
    var HEALTH_INTERVAL_MS = 30000;

    // Loopback guard: the panel never points at a non-loopback address.
    function isLoopback(value) {
      if (typeof value !== "string" || value.length === 0) return false;
      try {
        var host = new URL(value).hostname;
        return host === "127.0.0.1" || host === "localhost";
      } catch (e) { return false; }
    }

    // baseUrl comes from the host-injected plugin config; the constant is only
    // a last-resort fallback when no loopback value was injected.
    function resolveBaseUrl(ctx, config) {
      var candidates = [];
      if (config && typeof config.baseUrl === "string") candidates.push(config.baseUrl);
      if (ctx && ctx.config && typeof ctx.config.baseUrl === "string") candidates.push(ctx.config.baseUrl);
      if (ctx && typeof ctx.get === "function") {
        var injected = ctx.get("creatorhubConfig");
        if (injected && typeof injected.baseUrl === "string") candidates.push(injected.baseUrl);
      }
      for (var i = 0; i < candidates.length; i++) if (isLoopback(candidates[i])) return candidates[i];
      return DEFAULT_BASE_URL;
    }

    function apply(ctx, config) {
      var baseUrl = resolveBaseUrl(ctx, config);
      var e = React.createElement;

      function useHealth() {
        var pair = React.useState({ running: false, checked: false });
        var health = pair[0];
        var setHealth = pair[1];
        React.useEffect(function () {
          var cancelled = false;
          function probe() {
            fetch(baseUrl + "/health", { signal: AbortSignal.timeout(2000) })
              .then(function (res) { return res.ok; })
              .catch(function () { return false; })
              .then(function (ok) { if (!cancelled) setHealth({ running: ok, checked: true }); });
          }
          probe();
          var timer = setInterval(probe, HEALTH_INTERVAL_MS);
          return function () { cancelled = true; clearInterval(timer); };
        }, []);
        return health;
      }

      function CreatorHubIcon() {
        return e("svg", { width: 16, height: 16, viewBox: "0 0 16 16", "aria-hidden": "true", focusable: "false" },
          e("rect", { x: 1.5, y: 1.5, width: 13, height: 13, rx: 3, fill: "none", stroke: "currentColor", strokeWidth: 1.5 }),
          e("path", { d: "M4.5 8.5 L7 11 L11.5 5.5", fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round" })
        );
      }

      function CreatorHubPanel() {
        var health = useHealth();
        var dot = health.running ? "#22c55e" : (health.checked ? "#ef4444" : "#9ca3af");
        var state = health.running ? "服务在线" : (health.checked ? "服务离线" : "检测中");
        return e("div", { style: { padding: "12px", fontSize: "13px", lineHeight: 1.7 } },
          e("div", { style: { display: "flex", alignItems: "center", gap: "8px", fontWeight: 600 } },
            e("span", { "aria-hidden": "true", style: { width: "8px", height: "8px", borderRadius: "50%", background: dot, display: "inline-block", flex: "0 0 auto" } }),
            e("span", null, "CreatorHub"),
            e("span", { style: { color: "#888", fontWeight: 400 } }, state)
          ),
          e("div", { style: { color: "#888", margin: "6px 0 12px", wordBreak: "break-all" } }, baseUrl),
          e("button", {
            type: "button",
            onClick: function () { try { window.open(baseUrl, "_blank", "noopener,noreferrer"); } catch (err) {} },
            style: { padding: "6px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", background: "transparent", cursor: "pointer" }
          }, "打开工作台"),
          e("div", { style: { color: "#9ca3af", marginTop: "10px", fontSize: "12px" } },
            "登录、采集、发布等操作都在工作台内完成；本面板只做跳转与 /health 探测。"
          )
        );
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
      return { baseUrl: baseUrl, panelId: PANEL_ID };
    }

    exports.apply = apply;
    exports.inject = ["slots"];
    return module.exports;
  }
});
