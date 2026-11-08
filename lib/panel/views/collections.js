// 关键词采集 — 按关键词在平台上采集内容。
import { h, clear, fmtTime } from "../dom.js";

var PLATFORMS = [
  { value: "douyin", label: "抖音" }, { value: "xhs", label: "小红书" },
  { value: "kuaishou", label: "快手" }, { value: "shipinhao", label: "视频号" }, { value: "tiktok", label: "TikTok" }
];

export function renderCollections(ctx) {
  var api = ctx.api;
  var root = h("div", { className: "sa-view" });
  var timer = null;
  var disposed = false;

  var platform = h("select", { className: "sa-btn" });
  PLATFORMS.forEach(function (x) { platform.appendChild(h("option", { value: x.value }, x.label)); });
  var keyword = h("input", { className: "sa-input", placeholder: "关键词，例如 露营", style: { width: "200px" } });
  var limit = h("input", { className: "sa-input", type: "number", value: "20", min: "1", style: { width: "90px" } });
  var createBtn = h("button", { type: "button", className: "sa-btn", "data-variant": "primary", onClick: create }, "开始采集");
  var status = h("div", { className: "sa-caption" }, "");
  var list = h("div", { className: "sa-list" });

  root.appendChild(h("div", { className: "sa-section-title" }, "关键词采集"));
  root.appendChild(h("div", { className: "sa-muted" }, "按关键词在平台上采集内容，结果进入素材库。每个关键词保存为一条可重复运行的采集任务。"));
  root.appendChild(h("div", { className: "sa-row" }, [platform, keyword, h("span", { className: "sa-caption" }, "条数"), limit, createBtn]));
  root.appendChild(status);
  root.appendChild(h("div", { className: "sa-section-title" }, "采集任务"));
  root.appendChild(list);

  root.appendChild(h("div", { className: "sa-section-title" }, "采集结果"));
  var resultInfo = h("div", { className: "sa-caption" }, "");
  var resultGrid = h("div", { className: "sa-grid" });
  root.appendChild(resultInfo);
  root.appendChild(resultGrid);

  function isSearchFlow(flow) {
    var cap = flow && flow.spec && flow.spec.source ? flow.spec.source.capability : "";
    return /\.search$/.test(cap);
  }

  async function create() {
    var query = keyword.value.trim();
    if (!query) { status.textContent = "请填写关键词"; return; }
    createBtn.disabled = true;
    try {
      var res = await api.createFlow({
        name: platform.options[platform.selectedIndex].text + " 采集：" + query,
        spec: {
          source: { capability: platform.value + ".search", params: { query: query, limit: Number(limit.value) || 20 } },
          filters: [{ capability: "core.dedupe", params: {} }],
          actions: [{ capability: "core.store", params: {} }]
        }
      });
      status.textContent = res.ok ? "已创建 ✓" : ("创建失败：" + (res.error || res.status));
      if (res.ok) { keyword.value = ""; refresh(); }
    } finally { createBtn.disabled = false; }
  }

  async function run(id, button) {
    button.disabled = true; button.textContent = "采集中…";
    try {
      var res = await api.runFlow(id);
      var r = res.ok && res.data ? res.data : null;
      status.textContent = r ? ("采集完成：发现 " + r.found + " · 新增 " + r.kept + " · 入库 " + r.saved) : ("采集失败：" + (res.error || res.status) + (res.data && res.data.error ? " — " + res.data.error : ""));
      refresh();
    } finally { button.disabled = false; button.textContent = "采集"; }
  }

  function refresh() {
    if (disposed) return;
    api.flows().then(function (res) {
      if (disposed) return;
      clear(list);
      var flows = res.ok && res.data && Array.isArray(res.data.items) ? res.data.items.filter(isSearchFlow) : [];
      if (flows.length === 0) { list.appendChild(h("div", { className: "sa-empty" }, "还没有采集任务。")); return; }
      flows.forEach(function (flow) {
        var query = flow.spec.source.params && flow.spec.source.params.query || "";
        var btn = h("button", { type: "button", className: "sa-btn", "data-variant": "primary", onClick: function () { run(flow.id, btn); } }, "采集");
        list.appendChild(h("div", { className: "sa-list-row" }, [
          h("div", { className: "sa-row" }, [
            h("span", { className: "sa-dot", "data-state": flow.last_state === "ok" ? "online" : (flow.last_state === "failed" ? "offline" : "idle") }),
            h("span", { style: { flex: 1, fontWeight: 600 } }, flow.name),
            h("span", { className: "sa-chip" }, query),
            h("span", { className: "sa-caption" }, flow.last_run_at ? fmtTime(flow.last_run_at) : "未运行"),
            btn,
            h("button", { type: "button", className: "sa-btn", onClick: function () { api.deleteFlow(flow.id).then(refresh); } }, "删除")
          ]),
          flow.last_state === "failed" ? h("div", { className: "sa-warn" }, "上次失败") : null
        ]));
      });
    });
  }

  function loadResults() {
    if (disposed) return;
    api.artifacts(200).then(function (res) {
      if (disposed) return;
      clear(resultGrid);
      var items = res.ok && res.data && Array.isArray(res.data.items) ? res.data.items : [];
      resultInfo.textContent = "共 " + items.length + " 条";
      if (items.length === 0) { resultGrid.appendChild(h("div", { className: "sa-empty" }, "还没有采集结果。")); return; }
      items.slice(0, 60).forEach(function (item) {
        var cover = item.cover_url
          ? h("img", { className: "sa-thumb", src: item.cover_url, alt: "", loading: "lazy", onError: function (e) { e.target.style.display = "none"; } })
          : h("div", { className: "sa-thumb-empty" }, item.platform);
        var likes = 0;
        try { likes = Number(JSON.parse(item.stats_json || "{}").like_count || 0); } catch (e) {}
        resultGrid.appendChild(h("div", { className: "sa-media-card" }, [
          cover,
          h("div", { className: "sa-media-body" }, [
            h("div", { className: "sa-media-title" }, item.title || item.item_id),
            h("div", { className: "sa-media-meta" }, [
              h("span", { className: "sa-chip" }, item.platform),
              item.author ? h("span", null, item.author) : null,
              likes > 0 ? h("span", null, "♥ " + likes) : null,
              h("span", { className: "sa-chip" + (item.local_path ? " is-ok" : "") }, item.local_path ? "已下载" : "未下载")
            ])
          ])
        ]));
      });
    });
  }

  function activate() { if (disposed || timer !== null) return; refresh(); loadResults(); timer = setInterval(function () { refresh(); loadResults(); }, 10000); }
  function deactivate() { if (timer === null) return; clearInterval(timer); timer = null; }
  return { element: root, activate: activate, deactivate: deactivate, dispose: function () { disposed = true; deactivate(); } };
}
