// 账号管理 — 已登录账号自身的数据（粉丝 / 关注 / 作品 / 获赞）。
import { h, clear, fmtTime } from "../dom.js";

export function renderAccountManager(ctx) {
  var api = ctx.api;
  var root = h("div", { className: "sa-view" });
  var timer = null;
  var disposed = false;
  var status = h("div", { className: "sa-caption" }, "");
  var refreshBtn = h("button", { type: "button", className: "sa-btn", "data-variant": "primary", onClick: refreshStats }, "刷新账号数据");
  var grid = h("div", { className: "sa-grid" });

  root.appendChild(h("div", { className: "sa-section-title" }, "账号管理"));
  root.appendChild(h("div", { className: "sa-muted" }, "读取已登录账号自身的运营数据。点「刷新账号数据」会打开账号主页读取一次。"));
  root.appendChild(h("div", { className: "sa-row" }, [refreshBtn, status]));
  root.appendChild(grid);

  async function refreshStats() {
    refreshBtn.disabled = true;
    status.textContent = "正在读取（打开账号主页，约 10-20 秒）…";
    try {
      var res = await api.refreshAccountStats();
      var results = res.ok && res.data && Array.isArray(res.data.results) ? res.data.results : [];
      if (results.length === 0) { status.textContent = "没有已登录账号，或读取失败：" + (res.error || res.status); return; }
      status.textContent = results.map(function (r) {
        if (r.state === "ok") return r.platform + " ✓ " + r.nickname + "（粉丝 " + r.fans + "）";
        if (r.state === "unsupported") return r.platform + " 尚未接入";
        if (r.state === "signed-out") return r.platform + " 未登录";
        return r.platform + " " + (r.error || r.state);
      }).join(" · ");
      load();
    } finally { refreshBtn.disabled = false; }
  }

  function load() {
    if (disposed) return;
    api.accountStats().then(function (res) {
      if (disposed) return;
      clear(grid);
      var items = res.ok && res.data && Array.isArray(res.data.items) ? res.data.items : [];
      if (items.length === 0) { grid.appendChild(h("div", { className: "sa-empty" }, "还没有账号数据 —— 点上面的按钮读取一次。")); return; }
      var latest = {};
      items.forEach(function (row) { if (!latest[row.platform]) latest[row.platform] = row; });
      Object.keys(latest).forEach(function (key) {
        var row = latest[key];
        grid.appendChild(h("div", { className: "sa-platform is-bound" }, [
          h("div", { className: "sa-platform-head" }, [
            h("span", { className: "sa-badge" }, (row.nickname || key).slice(0, 2)),
            h("span", { className: "sa-platform-name" }, row.nickname || key),
            h("span", { className: "sa-state is-ok" }, key)
          ]),
          h("div", { className: "sa-cards" }, [
            h("div", { className: "sa-card" }, [h("b", null, String(row.followers)), h("span", { className: "sa-caption" }, "粉丝")]),
            h("div", { className: "sa-card" }, [h("b", null, String(row.following)), h("span", { className: "sa-caption" }, "关注")]),
            h("div", { className: "sa-card" }, [h("b", null, String(row.works)), h("span", { className: "sa-caption" }, "作品")]),
            h("div", { className: "sa-card" }, [h("b", null, String(row.likes)), h("span", { className: "sa-caption" }, "获赞")])
          ]),
          h("div", { className: "sa-caption" }, "读取于 " + fmtTime(row.taken_at))
        ]));
      });
    });
  }

  function activate() { if (disposed || timer !== null) return; load(); timer = setInterval(load, 15000); }
  function deactivate() { if (timer === null) return; clearInterval(timer); timer = null; }
  return { element: root, activate: activate, deactivate: deactivate, dispose: function () { disposed = true; deactivate(); } };
}
