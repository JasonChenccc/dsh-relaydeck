// SA Manager panel — native secondary navigation over the CreatorHub menu.
// One DSH sidebar entry (registered in lib/host/client.js); the twelve views live
// inside the panel. Polling is owned by each view: activate() on show,
// deactivate() on hide or switch, dispose() on unmount.
import { h, clear } from "./dom.js";
import { createEventBus } from "./events.js";
import { createApiBridge } from "./bridge.js";
import { renderOverview } from "./views/overview.js";
import { renderAccounts } from "./views/accounts.js";
import { renderMonitors } from "./views/monitors.js";
import { renderCollections } from "./views/collections.js";
import { renderCommentWatches } from "./views/comment-watches.js";
import { renderDanmakuWatches } from "./views/danmaku-watches.js";
import { renderAccountHub } from "./views/account-hub.js";
import { renderTasks } from "./views/tasks.js";
import { renderPublish } from "./views/publish.js";
import { renderAutoComment } from "./views/auto-comment.js";
import { renderDownloads } from "./views/downloads.js";
import { renderNotifications } from "./views/notifications.js";

var VIEWS = [
  { id: "overview", label: "工作概览", render: renderOverview },
  { id: "accounts", label: "平台账号", render: renderAccounts },
  { id: "monitors", label: "作品监控", render: renderMonitors },
  { id: "collections", label: "关键词采集", render: renderCollections },
  { id: "comment-watches", label: "评论监控", render: renderCommentWatches },
  { id: "danmaku-watches", label: "弹幕监控", render: renderDanmakuWatches },
  { id: "account-hub", label: "本账号管理", render: renderAccountHub },
  { id: "tasks", label: "任务队列", render: renderTasks },
  { id: "publish", label: "发布", render: renderPublish },
  { id: "auto-comment", label: "自动评论", render: renderAutoComment },
  { id: "downloads", label: "链接下载", render: renderDownloads },
  { id: "notifications", label: "通知", render: renderNotifications }
];

export function createPanel(host, options) {
  var opts = options || {};
  var injectCss = opts.injectCss ? opts.injectCss : function () {};
  injectCss();

  var events = createEventBus();
  var unsubscribeHost = typeof host.subscribe === "function"
    ? host.subscribe(function (event) { events.emit(event.name, event.payload); })
    : function () {};

  var nav = h("nav", { className: "sa-nav" });
  var main = h("div", { className: "sa-main" });
  var root = h("div", { className: "sa-panel" }, [nav, main]);

  var resolved = null;
  var api = null;
  var sessionContext = opts.sessionContext || null;
  var current = null;
  var activeId = "overview";
  var visible = true;
  var disposed = false;
  var buttons = {};
  var observer = null;

  if (typeof IntersectionObserver !== "undefined") {
    observer = new IntersectionObserver(function (entries) {
      var entry = entries[entries.length - 1];
      var next = !!(entry && entry.isIntersecting);
      if (next === visible) return;
      visible = next;
      if (!current) return;
      if (visible) current.activate();
      else current.deactivate();
    }, { threshold: 0 });
    observer.observe(root);
  }

  function mountView(id) {
    if (disposed) return;
    if (current) { current.deactivate(); current.dispose(); current = null; }
    clear(main);
    for (var key in buttons) buttons[key].setAttribute("aria-current", key === id ? "true" : "false");
    activeId = id;
    if (!resolved) {
      main.appendChild(h("div", { className: "sa-empty" }, "正在读取配置…"));
      return;
    }
    var view = null;
    for (var i = 0; i < VIEWS.length; i++) if (VIEWS[i].id === id) view = VIEWS[i];
    if (!view) return;
    current = view.render({
      h: h,
      api: api,
      host: host,
      resolved: resolved,
      events: events,
      sessionContext: sessionContext,
      navigate: mountView
    });
    main.appendChild(current.element);
    if (visible) current.activate();
  }

  function renderNav() {
    clear(nav);
    buttons = {};
    for (var i = 0; i < VIEWS.length; i++) {
      (function (view) {
        var btn = h("button", {
          type: "button", className: "sa-nav-item",
          "aria-current": view.id === activeId ? "true" : "false",
          onClick: function () { mountView(view.id); }
        }, view.label);
        buttons[view.id] = btn;
        nav.appendChild(btn);
      })(VIEWS[i]);
    }
    mountView(activeId);
  }

  var offSession = events.on("session-context", function (payload) {
    if (payload) sessionContext = payload;
  });

  host.resolveBaseUrl().then(function (r) {
    if (disposed) return;
    resolved = r;
    api = createApiBridge(r.baseUrl, function (path, opts2) { return host.proxyFetch(path, opts2); });
    renderNav();
  }).catch(function () {
    if (disposed) return;
    resolved = { baseUrl: "http://127.0.0.1:8731", source: "default" };
    api = createApiBridge(resolved.baseUrl, function (path, opts2) { return host.proxyFetch(path, opts2); });
    renderNav();
  });

  return {
    element: root,
    events: events,
    dispose: function () {
      disposed = true;
      if (observer) { observer.disconnect(); observer = null; }
      offSession();
      unsubscribeHost();
      events.dispose();
      if (current) { current.deactivate(); current.dispose(); current = null; }
    }
  };
}
