// 本账号管理：先选账号，再按 account_id 拉 hub summary。
// /api/hub/summary 不接受缺省 account_id（422），所以这里必须等用户选定。
import { h } from "../dom.js";

export function renderAccountHub(ctx) {
  var api = ctx.api;
  var root = h("div", { className: "sa-view" });
  var timer = null;
  var disposed = false;
  var accountId = null;
  var loaded = false;

  var select = h("select", { className: "sa-btn", onChange: function (e) { accountId = e.target.value ? Number(e.target.value) : null; refresh(); } });
  var status = h("span", { className: "sa-caption" }, "加载账号…");
  var cards = h("div", { className: "sa-cards" });
  function card(label) {
    var value = h("b", null, "-");
    cards.appendChild(h("div", { className: "sa-card" }, [value, h("span", { className: "sa-caption" }, label)]));
    return value;
  }
  var cWorks = card("作品");
  var cFollowing = card("关注");
  var cFans = card("粉丝");
  var cDm = card("私信会话");

  root.appendChild(h("div", { className: "sa-row" }, [h("span", { className: "sa-caption" }, "账号"), select, status]));
  root.appendChild(cards);

  function showEmpty(text) {
    while (cards.firstChild) cards.removeChild(cards.firstChild);
    cards.appendChild(h("div", { className: "sa-empty" }, text));
  }

  function refresh() {
    if (disposed) return;
    api.getAccounts().then(function (res) {
      if (disposed) return;
      var list = res && res.ok && Array.isArray(res.data) ? res.data : [];
      if (list.length === 0) { status.textContent = ""; showEmpty("暂无账号"); return; }
      if (!loaded) {
        loaded = true;
        select.textContent = "";
        list.forEach(function (a) {
          var opt = h("option", { value: String(a.id) }, (a.nickname || ("账号 " + a.id)) + " · " + (a.platform || ""));
          select.appendChild(opt);
        });
        accountId = list[0].id;
        select.value = String(accountId);
      }
      if (accountId === null) return;
      api.getHubSummary(accountId).then(function (hub) {
        if (disposed) return;
        if (!hub || !hub.ok || !hub.data) { status.textContent = "汇总加载失败"; return; }
        status.textContent = "";
        cWorks.textContent = String(hub.data.works === undefined ? "-" : hub.data.works);
        cFollowing.textContent = String(hub.data.following === undefined ? "-" : hub.data.following);
        cFans.textContent = String(hub.data.fans === undefined ? "-" : hub.data.fans);
        cDm.textContent = String(hub.data.dm === undefined ? "-" : hub.data.dm);
      });
    });
  }

  function activate() {
    if (disposed || timer !== null) return;
    refresh();
    timer = setInterval(refresh, 10000);
  }
  function deactivate() {
    if (timer === null) return;
    clearInterval(timer);
    timer = null;
  }

  return { element: root, activate: activate, deactivate: deactivate, dispose: function () { disposed = true; deactivate(); } };
}
