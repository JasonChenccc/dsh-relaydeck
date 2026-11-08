// 账号 — 平台扫码登录与登录态。
// 登录时会在桌面打开一个真实浏览器窗口，用手机扫码；RelayDeck 只观察 Cookie，不接触密码。
import { h, clear, fmtTime } from "../dom.js";

export function renderAccounts(ctx) {
  var api = ctx.api;
  var root = h("div", { className: "sa-view" });
  var listTimer = null;
  var pollTimer = null;
  var disposed = false;
  var active = null;

  var status = h("div", { className: "sa-caption" }, "");
  var platformList = h("div", { className: "sa-list" });
  var bindingList = h("div", { className: "sa-list" });

  root.appendChild(h("div", { className: "sa-section-title" }, "平台登录"));
  root.appendChild(h("div", { className: "sa-caption" }, "点击登录后会在桌面弹出浏览器窗口，用对应 App 扫码即可。登录态保存在本机浏览器 profile 中。"));
  root.appendChild(platformList);
  root.appendChild(status);
  root.appendChild(h("div", { className: "sa-section-title" }, "已绑定"));
  root.appendChild(bindingList);

  function setStatus(text) { status.textContent = text; }

  function refreshBindings() {
    if (disposed) return;
    api.bindings().then(function (res) {
      if (disposed) return;
      clear(bindingList);
      var items = res.ok && res.data && Array.isArray(res.data.items) ? res.data.items : [];
      if (items.length === 0) { bindingList.appendChild(h("div", { className: "sa-empty" }, "还没有绑定任何账号。")); return; }
      items.forEach(function (b) {
        bindingList.appendChild(h("div", { className: "sa-row sa-list-row" }, [
          h("span", { className: "sa-dot", "data-state": b.state === "active" ? "online" : "idle" }),
          h("span", { style: { width: "72px" } }, b.platform),
          h("span", { style: { flex: 1 } }, b.label || b.nickname || "-"),
          h("span", { className: "sa-caption" }, b.state),
          h("span", { className: "sa-caption" }, fmtTime(b.last_used_at || b.created_at))
        ]));
      });
    });
  }

  function bindingsByPlatform() {
    return api.bindings().then(function (res) {
      var map = {};
      var items = res.ok && res.data && Array.isArray(res.data.items) ? res.data.items : [];
      items.forEach(function (b) { map[b.platform] = b; });
      return map;
    });
  }

  function refreshPlatforms() {
    if (disposed) return;
    Promise.all([api.platforms(), bindingsByPlatform()]).then(function (pair) {
      if (disposed) return;
      var res = pair[0];
      var bound = pair[1] || {};
      clear(platformList);
      var items = res.ok && res.data && Array.isArray(res.data.items) ? res.data.items : [];
      if (items.length === 0) { platformList.appendChild(h("div", { className: "sa-empty" }, "后端没有平台定义。")); return; }
      items.forEach(function (pf) {
        var isActive = active !== null && active.platform === pf.id;
        var btn = h("button", {
          type: "button", className: "sa-btn", "data-variant": bound[pf.id] ? undefined : "primary",
          onClick: function () { startLogin(pf.id); }
        }, isActive ? "登录中…" : (bound[pf.id] ? "重新登录" : "扫码登录"));
        if (isActive) btn.disabled = true;
        platformList.appendChild(h("div", { className: "sa-card" }, [
          h("div", { className: "sa-row" }, [
            h("span", { className: "sa-dot", "data-state": bound[pf.id] ? "online" : "idle" }),
            h("span", { style: { fontWeight: 600, flex: 1 } }, pf.title),
            h("span", { className: "sa-caption" }, bound[pf.id] ? "已登录" : "未登录"),
            btn,
            isActive ? h("button", { type: "button", className: "sa-btn", onClick: function () { cancel(); } }, "取消") : null
          ]),
          h("div", { className: "sa-caption" }, pf.hint || "")
        ]));
      });
    });
  }

  function startLogin(platformId) {
    setStatus("正在打开 " + platformId + " 登录窗口…");
    api.startLogin(platformId).then(function (res) {
      if (disposed) return;
      if (!res.ok || !res.data) { setStatus("无法开始登录：" + (res.error || res.status)); return; }
      active = res.data;
      setStatus("等待扫码…（窗口已打开，扫码后会自动完成）");
      refreshPlatforms();
      poll();
    });
  }

  function poll() {
    if (disposed || active === null) return;
    api.loginStatus(active.id).then(function (res) {
      if (disposed || active === null) return;
      if (!res.ok || !res.data) { setStatus("登录状态查询失败：" + (res.error || res.status)); return; }
      var s = res.data;
      if (s.state === "ok") {
        setStatus("登录成功：" + s.platform + (s.matched && s.matched.length ? "（" + s.matched.join(", ") + "）" : ""));
        active = null;
        refreshPlatforms();
        refreshBindings();
        return;
      }
      if (s.state === "failed") { setStatus("登录失败：" + (s.error || "")); active = null; refreshPlatforms(); return; }
      if (s.state === "cancelled" || s.state === "unknown") { setStatus("登录已取消"); active = null; refreshPlatforms(); return; }
      pollTimer = setTimeout(poll, 2000);
    });
  }

  function cancel() {
    if (active === null) return;
    var id = active.id;
    active = null;
    if (pollTimer) { clearTimeout(pollTimer); pollTimer = null; }
    api.cancelLogin(id).then(function () { setStatus("已取消"); refreshPlatforms(); });
  }

  function activate() {
    if (disposed || listTimer !== null) return;
    refreshPlatforms();
    refreshBindings();
    listTimer = setInterval(function () { refreshPlatforms(); refreshBindings(); }, 15000);
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
