// 账号 — 平台登录。二维码就地刷新（不重建 DOM，避免屏闪）；支持同平台多账号。
import { h, clear, fmtTime } from "../dom.js";

export function renderAccounts(ctx) {
  var api = ctx.api;
  var root = h("div", { className: "sa-view" });
  var listTimer = null;
  var pollTimer = null;
  var disposed = false;
  var active = null;
  var lastQr = null;
  var platforms = [];
  var bindings = [];

  var grid = h("div", { className: "sa-grid" });
  var qrPanel = h("div", { className: "sa-qr" });
  var status = h("div", { className: "sa-caption" }, "");
  var verifyBtn = h("button", { type: "button", className: "sa-btn", onClick: verify }, "重新校验登录");
  var bindingGrid = h("div", { className: "sa-grid" });

  // Live references into the QR card, so polls only touch the image source.
  var qrImg = null;
  var qrHint = null;

  root.appendChild(h("div", { className: "sa-section-title" }, "平台登录"));
  root.appendChild(h("div", { className: "sa-muted" }, "点「扫码登录」，二维码会显示在下面，用手机 App 扫一下即可。同一平台可以登录多个账号，会分别列出。"));
  root.appendChild(grid);
  root.appendChild(qrPanel);
  root.appendChild(status);
  root.appendChild(h("div", { className: "sa-section-title" }, "已登录账号"));
  root.appendChild(h("div", { className: "sa-row" }, [verifyBtn, h("span", { className: "sa-muted" }, "（会打开各平台页面核对一次真实登录态）")]));
  root.appendChild(bindingGrid);

  function renderPlatforms() {
    clear(grid);
    if (platforms.length === 0) { grid.appendChild(h("div", { className: "sa-empty" }, "后端没有平台定义。")); return; }
    platforms.forEach(function (pf) {
      var mine = bindings.filter(function (b) { return b.platform === pf.id; });
      var isActive = active !== null && active.platform === pf.id;
      var button = h("button", {
        type: "button", className: "sa-btn",
        "data-variant": mine.length ? "ghost" : "primary",
        onClick: function () { startLogin(pf.id); }
      }, isActive ? "登录中…" : (mine.length ? "再登一个账号" : "扫码登录"));
      if (isActive) button.disabled = true;
      var names = mine.map(function (b) { return b.nickname || b.label || b.platform_uid; }).join("、");
      grid.appendChild(h("div", { className: "sa-platform" + (mine.length ? " is-bound" : "") }, [
        h("div", { className: "sa-platform-head" }, [
          h("span", { className: "sa-badge" }, pf.title.slice(0, 2)),
          h("span", { className: "sa-platform-name" }, pf.title),
          h("span", { className: "sa-state" + (mine.length ? " is-ok" : "") }, mine.length ? ("已登录 " + mine.length) : "未登录")
        ]),
        h("div", { className: "sa-platform-body" }, mine.length ? names : (pf.hint || "")),
        h("div", { className: "sa-platform-foot" }, [button])
      ]));
    });
  }

  function buildQrCard() {
    clear(qrPanel);
    qrImg = null; qrHint = null; lastQr = null;
    if (active === null) return;
    var box = h("div", { className: "sa-qr-box" });
    qrImg = h("img", { className: "sa-qr-img", alt: "登录二维码" });
    box.appendChild(qrImg);
    qrHint = h("div", { className: "sa-qr-hint" }, "二维码加载中…");
    var info = h("div", { className: "sa-qr-info" }, [
      h("div", { className: "sa-qr-title" }, "扫码登录 " + (active.title || "")),
      h("div", { className: "sa-muted" }, "打开手机 App → 扫一扫"),
      qrHint,
      h("button", { type: "button", className: "sa-btn", onClick: cancelLogin }, "取消")
    ]);
    qrPanel.appendChild(h("div", { className: "sa-qr-card" }, [box, info]));
  }

  function setQr(image) {
    if (!qrImg) return;
    if (image === lastQr) return;      // identical pixels: leave the DOM alone
    lastQr = image;
    qrImg.src = image;
  }

  function setHint(text) { if (qrHint) qrHint.textContent = text; }

  function renderBindings() {
    clear(bindingGrid);
    if (bindings.length === 0) { bindingGrid.appendChild(h("div", { className: "sa-empty" }, "还没有登录任何平台。")); return; }
    bindings.forEach(function (b) {
      var pf = platforms.filter(function (x) { return x.id === b.platform; })[0] || { title: b.platform };
      bindingGrid.appendChild(h("div", { className: "sa-platform is-bound" }, [
        h("div", { className: "sa-platform-head" }, [
          h("span", { className: "sa-badge" }, (b.nickname || pf.title).slice(0, 2)),
          h("span", { className: "sa-platform-name" }, b.nickname || "(未命名账号)"),
          h("span", { className: "sa-state is-ok" }, pf.title)
        ]),
        h("div", { className: "sa-platform-body" }, "ID " + (b.platform_uid || "-") + " · 最近使用 " + fmtTime(b.last_used_at || b.created_at))
      ]));
    });
  }

  function loadBindings() {
    return api.bindings().then(function (res) {
      bindings = res.ok && res.data && Array.isArray(res.data.items) ? res.data.items : [];
    });
  }

  function refresh() {
    if (disposed) return;
    Promise.all([api.platforms(), loadBindings()]).then(function (pair) {
      if (disposed) return;
      platforms = pair[0].ok && pair[0].data && Array.isArray(pair[0].data.items) ? pair[0].data.items : [];
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
      buildQrCard();
      renderPlatforms();
      poll();
    });
  }

  function poll() {
    if (disposed || active === null) return;
    var id = active.id;
    api.loginQr(id).then(function (res) {
      if (disposed || active === null || active.id !== id) return;
      var d = res.ok && res.data ? res.data : null;
      if (d && d.image) { setQr(d.image); setHint("等待扫码…"); }
      else if (d && d.reason) setHint(d.reason);
    });
    api.loginStatus(id).then(function (res) {
      if (disposed || active === null || active.id !== id) return;
      var s = res.ok && res.data ? res.data : null;
      if (!s) { pollTimer = setTimeout(poll, 2000); return; }
      if (s.state === "ok") {
        var who = s.account && s.account.nickname ? ("：" + s.account.nickname) : "";
        status.textContent = "登录成功 ✓" + who;
        if (pollTimer) { clearTimeout(pollTimer); pollTimer = null; }
        active = null; clear(qrPanel); qrImg = null; refresh();
        return;
      }
      if (s.state === "failed") { status.textContent = "登录失败：" + (s.error || ""); active = null; clear(qrPanel); qrImg = null; refresh(); return; }
      if (s.state === "cancelled" || s.state === "unknown") { status.textContent = "已取消"; active = null; clear(qrPanel); qrImg = null; refresh(); return; }
      pollTimer = setTimeout(poll, 2000);
    });
  }

  function cancelLogin() {
    if (active === null) return;
    var id = active.id;
    active = null; qrImg = null; lastQr = null;
    if (pollTimer) { clearTimeout(pollTimer); pollTimer = null; }
    clear(qrPanel);
    status.textContent = "已取消";
    api.cancelLogin(id).then(function () { refresh(); });
  }

  function verify() {
    verifyBtn.disabled = true;
    status.textContent = "正在核对各平台登录态…（会依次打开页面，约 20 秒）";
    api.verifyBindings().then(function (res) {
      verifyBtn.disabled = false;
      var results = res.ok && res.data && Array.isArray(res.data.results) ? res.data.results : [];
      if (results.length === 0) { status.textContent = "核对失败：" + (res.error || res.status); return; }
      status.textContent = results.map(function (r) {
        if (r.state === "active") return r.platform + " ✓ " + (r.nickname || r.uid);
        if (r.state === "signed-out") return r.platform + " 未登录";
        return r.platform + " " + r.state;
      }).join(" · ");
      refresh();
    });
  }

  function activate() {
    if (disposed || listTimer !== null) return;
    refresh();
    listTimer = setInterval(refresh, 15000);
  }
  function deactivate() { if (listTimer !== null) { clearInterval(listTimer); listTimer = null; } }

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
