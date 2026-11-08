// 账号 — 平台登录。二维码直接显示在面板里，不弹外部浏览器窗口。
import { h, clear, fmtTime } from "../dom.js";

export function renderAccounts(ctx) {
  var api = ctx.api;
  var root = h("div", { className: "sa-view" });
  var listTimer = null;
  var pollTimer = null;
  var disposed = false;
  var active = null;
  var bound = {};
  var platforms = [];
  var qrImage = null;

  var grid = h("div", { className: "sa-grid" });
  var qrPanel = h("div", { className: "sa-qr" });
  var status = h("div", { className: "sa-caption" }, "");
  var bindingGrid = h("div", { className: "sa-grid" });

  root.appendChild(h("div", { className: "sa-section-title" }, "平台登录"));
  root.appendChild(h("div", { className: "sa-muted" }, "点「扫码登录」，二维码会显示在下面，用手机 App 扫一下即可。登录态保存在本机。"));
  root.appendChild(grid);
  root.appendChild(qrPanel);
  root.appendChild(status);
  root.appendChild(h("div", { className: "sa-section-title" }, "已登录账号"));
  root.appendChild(bindingGrid);

  function renderPlatforms() {
    clear(grid);
    if (platforms.length === 0) { grid.appendChild(h("div", { className: "sa-empty" }, "后端没有平台定义。")); return; }
    platforms.forEach(function (pf) {
      var isBound = !!bound[pf.id];
      var isActive = active !== null && active.platform === pf.id;
      var button = h("button", {
        type: "button", className: "sa-btn",
        "data-variant": isBound ? "ghost" : "primary",
        onClick: function () { startLogin(pf.id); }
      }, isActive ? "登录中…" : (isBound ? "重新登录" : "扫码登录"));
      if (isActive) button.disabled = true;
      grid.appendChild(h("div", { className: "sa-platform" + (isBound ? " is-bound" : "") }, [
        h("div", { className: "sa-platform-head" }, [
          h("span", { className: "sa-badge" }, pf.title.slice(0, 2)),
          h("span", { className: "sa-platform-name" }, pf.title),
          h("span", { className: "sa-state" + (isBound ? " is-ok" : "") }, isBound ? "已登录" : "未登录")
        ]),
        h("div", { className: "sa-platform-body" }, pf.hint || ""),
        h("div", { className: "sa-platform-foot" }, [button])
      ]));
    });
  }

  function renderQr() {
    clear(qrPanel);
    if (active === null) return;
    var box = h("div", { className: "sa-qr-box" });
    var info = h("div", { className: "sa-qr-info" }, [
      h("div", { className: "sa-qr-title" }, "扫码登录 " + (active.title || "")),
      h("div", { className: "sa-muted" }, "打开手机 App → 扫一扫"),
      h("div", { className: "sa-qr-hint" }, active.stateText || "等待扫码…")
    ]);
    var cancel = h("button", { type: "button", className: "sa-btn", onClick: cancelLogin }, "取消");
    info.appendChild(cancel);
    if (qrImage) {
      box.appendChild(h("img", { className: "sa-qr-img", src: qrImage, alt: "登录二维码" }));
    } else {
      box.appendChild(h("div", { className: "sa-qr-placeholder" }, "二维码加载中…"));
    }
    qrPanel.appendChild(h("div", { className: "sa-qr-card" }, [box, info]));
  }

  function renderBindings() {
    clear(bindingGrid);
    var items = Object.keys(bound).map(function (k) { return bound[k]; });
    if (items.length === 0) { bindingGrid.appendChild(h("div", { className: "sa-empty" }, "还没有登录任何平台。")); return; }
    items.forEach(function (b) {
      bindingGrid.appendChild(h("div", { className: "sa-platform is-bound" }, [
        h("div", { className: "sa-platform-head" }, [
          h("span", { className: "sa-badge" }, (b.label || b.platform).slice(0, 2)),
          h("span", { className: "sa-platform-name" }, b.label || b.platform),
          h("span", { className: "sa-state is-ok" }, "已登录")
        ]),
        h("div", { className: "sa-platform-body" }, "最近使用 " + fmtTime(b.last_used_at || b.created_at))
      ]));
    });
  }

  function loadBindings() {
    return api.bindings().then(function (res) {
      bound = {};
      var items = res.ok && res.data && Array.isArray(res.data.items) ? res.data.items : [];
      items.forEach(function (b) { bound[b.platform] = b; });
    });
  }

  function refresh() {
    if (disposed) return;
    Promise.all([api.platforms(), loadBindings()]).then(function (pair) {
      if (disposed) return;
      var res = pair[0];
      platforms = res.ok && res.data && Array.isArray(res.data.items) ? res.data.items : [];
      renderPlatforms();
      renderBindings();
    });
  }

  function startLogin(platformId) {
    var pf = platforms.filter(function (x) { return x.id === platformId; })[0] || { id: platformId, title: platformId };
    status.textContent = "正在打开 " + pf.title + " 登录页…";
    if (pollTimer) { clearTimeout(pollTimer); pollTimer = null; }
    api.startLogin(platformId).then(function (res) {
      if (disposed) return;
      if (!res.ok || !res.data) { status.textContent = "无法开始登录：" + (res.error || res.status); return; }
      active = res.data;
      active.title = pf.title;
      active.stateText = "等待扫码…";
      qrImage = null;
      renderPlatforms();
      renderQr();
      poll();
    });
  }

  function poll() {
    if (disposed || active === null) return;
    var id = active.id;
    api.loginQr(id).then(function (res) {
      if (disposed || active === null || active.id !== id) return;
      if (res.ok && res.data && res.data.image) { qrImage = res.data.image; renderQr(); }
    });
    api.loginStatus(id).then(function (res) {
      if (disposed || active === null || active.id !== id) return;
      var s = res.ok && res.data ? res.data : null;
      if (!s) { pollTimer = setTimeout(poll, 2000); return; }
      if (s.state === "ok") {
        status.textContent = "登录成功 ✓";
        active = null; qrImage = null;
        clear(qrPanel); refresh();
        return;
      }
      if (s.state === "failed") { status.textContent = "登录失败：" + (s.error || ""); active = null; qrImage = null; clear(qrPanel); refresh(); return; }
      if (s.state === "cancelled" || s.state === "unknown") { status.textContent = "已取消"; active = null; qrImage = null; clear(qrPanel); refresh(); return; }
      active.stateText = s.matched && s.matched.length ? "已检测到登录态…" : "等待扫码…";
      renderQr();
      pollTimer = setTimeout(poll, 2000);
    });
  }

  function cancelLogin() {
    if (active === null) return;
    var id = active.id;
    active = null; qrImage = null;
    if (pollTimer) { clearTimeout(pollTimer); pollTimer = null; }
    clear(qrPanel);
    status.textContent = "已取消";
    api.cancelLogin(id).then(function () { refresh(); });
  }

  function activate() {
    if (disposed || listTimer !== null) return;
    refresh();
    listTimer = setInterval(refresh, 15000);
  }
  function deactivate() {
    if (listTimer !== null) { clearInterval(listTimer); listTimer = null; }
  }

  return {
    element: root,
    activate: activate,
    deactivate: deactivate,
    dispose: function () {
      disposed = true;
      deactivate();
      if (pollTimer) { clearTimeout(pollTimer); pollTimer = null; }
    }
  };
}
