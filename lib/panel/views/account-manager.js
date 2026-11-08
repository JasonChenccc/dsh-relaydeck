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

  root.appendChild(h("div", { className: "sa-section-title" }, "风控"));
  var riskBox = h("div", { className: "sa-list" });
  root.appendChild(riskBox);

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

  function loadRisk() {
    if (disposed) return;
    api.risk().then(function (res) {
      if (disposed) return;
      clear(riskBox);
      var r = res.ok && res.data ? res.data : null;
      if (!r) { riskBox.appendChild(h("div", { className: "sa-empty" }, "读取失败：" + (res.error || res.status))); return; }
      riskBox.appendChild(h("div", { className: "sa-row sa-list-row" }, [
        h("span", { className: "sa-dot", "data-state": r.healthy ? "online" : "offline" }),
        h("span", { style: { flex: 1, fontWeight: 600 } }, r.healthy ? "无异常" : "发现 " + (r.counts.signedOut + r.counts.failedRuns + r.counts.failedMonitors) + " 项需要处理"),
        h("span", { className: "sa-chip" }, "账号 " + r.counts.accounts),
        h("span", { className: "sa-chip" }, "未登录 " + r.counts.signedOut),
        h("span", { className: "sa-chip" }, "失败运行 " + r.counts.failedRuns),
        h("span", { className: "sa-chip" }, "失败监控 " + r.counts.failedMonitors),
        r.counts.unsupported ? h("span", { className: "sa-chip" }, "未接入 " + r.counts.unsupported) : null
      ]));
      (r.failedRuns || []).slice(0, 5).forEach(function (x) {
        riskBox.appendChild(h("div", { className: "sa-list-row" }, [
          h("div", { className: "sa-row" }, [h("span", { className: "sa-chip" }, "运行失败"), h("span", { style: { flex: 1 } }, x.flow_name || ""), h("span", { className: "sa-caption" }, fmtTime(x.started_at))]),
          h("div", { className: "sa-warn" }, (x.error || "").slice(0, 160))
        ]));
      });
      (r.failedMonitors || []).slice(0, 5).forEach(function (x) {
        riskBox.appendChild(h("div", { className: "sa-list-row" }, [
          h("div", { className: "sa-row" }, [h("span", { className: "sa-chip" }, "监控失败"), h("span", { style: { flex: 1 } }, x.name || ""), h("span", { className: "sa-caption" }, x.platform)]),
          h("div", { className: "sa-warn" }, (x.last_error || "").slice(0, 160))
        ]));
      });
    });
  }

  function activate() { if (disposed || timer !== null) return; load(); loadRisk(); timer = setInterval(function () { load(); loadRisk(); }, 15000); }
  function deactivate() { if (timer === null) return; clearInterval(timer); timer = null; }
  return { element: root, activate: activate, deactivate: deactivate, dispose: function () { disposed = true; deactivate(); } };
}
