// 流程 — 表单式构建器：选数据源 → 勾筛选 → 勾动作。用户不需要看到任何 JSON。
import { h, clear, fmtTime } from "../dom.js";

var TARGETS = [
  { value: "douyin", label: "抖音" },
  { value: "xhs", label: "小红书" },
  { value: "kuaishou", label: "快手" },
  { value: "shipinhao", label: "视频号" },
  { value: "tiktok", label: "TikTok" }
];

var SOURCE_LABEL = {
  "core.demoFeed": "演示数据源（不用登录）",
  "douyin.search": "抖音 · 关键词搜索",
  "xhs.search": "小红书 · 关键词搜索",
  "kuaishou.search": "快手 · 关键词搜索",
  "shipinhao.search": "视频号 · 关键词搜索",
  "tiktok.search": "TikTok · 关键词搜索"
};

/** Turn a saved spec into one readable sentence for the flow list. */
function describeSpec(spec) {
  var parts = [];
  var src = (spec && spec.source) || {};
  var srcLabel = SOURCE_LABEL[src.capability] || src.capability;
  var srcParams = src.params || {};
  if (srcParams.query) srcLabel += "「" + srcParams.query + "」";
  parts.push(srcLabel);
  (spec && spec.filters ? spec.filters : []).forEach(function (f) {
    var q = f.params || {};
    if (f.capability === "core.stat") parts.push((q.field === "like_count" ? "点赞" : q.field) + " " + q.op + " " + q.value);
    else if (f.capability === "core.dedupe") parts.push("去重");
    else if (f.capability === "core.limit") parts.push("最多 " + q.count + " 条");
    else if (f.capability === "core.contains") parts.push("文本筛选");
  });
  (spec && spec.actions ? spec.actions : []).forEach(function (a) {
    var q = a.params || {};
    if (a.capability === "core.store") parts.push("存入素材库");
    else if (a.capability === "core.download") parts.push("下载媒体");
    else if (a.capability === "core.publishPlan") {
      var t = TARGETS.filter(function (x) { return x.value === q.target; })[0];
      parts.push("生成发布草稿 → " + (t ? t.label : q.target));
    } else if (a.capability === "core.notify") parts.push("通知");
  });
  return parts.join(" → ");
}

export function renderFlows(ctx) {
  var api = ctx.api;
  var root = h("div", { className: "sa-view" });
  var timer = null;
  var disposed = false;
  var sources = [];

  // ── builder ──
  var nameInput = h("input", { className: "sa-input", placeholder: "给这条流程起个名字，例如：抖音露营热门" });
  var sourceSelect = h("select", { className: "sa-btn" });
  var queryInput = h("input", { className: "sa-input", placeholder: "搜索关键词，例如 露营" });
  var countInput = h("input", { className: "sa-input", type: "number", value: "20", min: "1" });
  var sourceExtra = h("div", { className: "sa-row-inline" });

  var statCheck = h("input", { type: "checkbox" });
  statCheck.checked = true;
  var statValue = h("input", { className: "sa-input", type: "number", value: "1000", min: "0", style: { width: "110px" } });
  var dedupeCheck = h("input", { type: "checkbox" });
  dedupeCheck.checked = true;
  var limitCheck = h("input", { type: "checkbox" });
  var limitValue = h("input", { className: "sa-input", type: "number", value: "20", min: "1", style: { width: "90px" } });

  var storeCheck = h("input", { type: "checkbox" });
  storeCheck.checked = true;
  var downloadCheck = h("input", { type: "checkbox" });
  downloadCheck.checked = true;
  var planCheck = h("input", { type: "checkbox" });
  var planTarget = h("select", { className: "sa-btn" });
  TARGETS.forEach(function (t) { var o = h("option", { value: t.value }, t.label); if (t.value === "xhs") o.setAttribute("selected", "selected"); planTarget.appendChild(o); });
  var planTags = h("input", { className: "sa-input", placeholder: "标签，逗号分隔", style: { width: "180px" } });

  var buildStatus = h("div", { className: "sa-caption" }, "");
  var createBtn = h("button", { type: "button", className: "sa-btn", "data-variant": "primary", onClick: create }, "创建流程");
  var list = h("div", { className: "sa-grid" });

  function syncSourceFields() {
    clear(sourceExtra);
    var caps = sourceSelect.value;
    if (caps === "core.demoFeed") {
      sourceExtra.appendChild(h("span", { className: "sa-caption" }, "条数"));
      sourceExtra.appendChild(countInput);
    } else {
      sourceExtra.appendChild(h("span", { className: "sa-caption" }, "关键词"));
      sourceExtra.appendChild(queryInput);
      sourceExtra.appendChild(h("span", { className: "sa-caption" }, "最多"));
      sourceExtra.appendChild(countInput);
      sourceExtra.appendChild(h("span", { className: "sa-caption" }, "条"));
    }
  }

  sourceSelect.addEventListener("change", syncSourceFields);

  root.appendChild(h("div", { className: "sa-section-title" }, "新建流程"));
  root.appendChild(h("div", { className: "sa-form" }, [
    h("div", { className: "sa-field" }, [h("label", null, "名称"), nameInput]),
    h("div", { className: "sa-subcard" }, [
      h("div", { className: "sa-media-title" }, "① 数据源"),
      h("div", { className: "sa-field" }, [h("label", null, "从哪里取内容"), sourceSelect]),
      h("div", { className: "sa-field" }, [sourceExtra])
    ]),
    h("div", { className: "sa-subcard" }, [
      h("div", { className: "sa-media-title" }, "② 筛选（可选）"),
      h("div", { className: "sa-checks" }, [
        h("label", { className: "sa-check" }, [statCheck, "点赞数不低于"]), statValue,
        h("label", { className: "sa-check" }, [dedupeCheck, "排除已采集过的"]),
        h("label", { className: "sa-check" }, [limitCheck, "最多保留"]), limitValue
      ])
    ]),
    h("div", { className: "sa-subcard" }, [
      h("div", { className: "sa-media-title" }, "③ 要做什么"),
      h("div", { className: "sa-checks" }, [
        h("label", { className: "sa-check" }, [storeCheck, "存入素材库"]),
        h("label", { className: "sa-check" }, [downloadCheck, "下载媒体文件"]),
        h("label", { className: "sa-check" }, [planCheck, "生成发布草稿到"]), planTarget, planTags
      ])
    ]),
    h("div", { className: "sa-row-inline" }, [createBtn, buildStatus])
  ]));

  root.appendChild(h("div", { className: "sa-section-title" }, "我的流程"));
  root.appendChild(list);

  function buildSpec() {
    var cap = sourceSelect.value;
    var params = cap === "core.demoFeed"
      ? { count: Number(countInput.value) || 6, platform: "douyin" }
      : { query: queryInput.value.trim(), limit: Number(countInput.value) || 20 };
    var spec = { source: { capability: cap, params: params }, filters: [], actions: [] };
    if (statCheck.checked) spec.filters.push({ capability: "core.stat", params: { field: "like_count", op: ">=", value: Number(statValue.value) || 0 } });
    if (dedupeCheck.checked) spec.filters.push({ capability: "core.dedupe", params: {} });
    if (limitCheck.checked) spec.filters.push({ capability: "core.limit", params: { count: Number(limitValue.value) || 20 } });
    if (storeCheck.checked) spec.actions.push({ capability: "core.store", params: {} });
    if (downloadCheck.checked) spec.actions.push({ capability: "core.download", params: { limit: 1 } });
    if (planCheck.checked) spec.actions.push({ capability: "core.publishPlan", params: { target: planTarget.value, tags: planTags.value, titleTemplate: "{title}" } });
    return spec;
  }

  async function create() {
    var spec = buildSpec();
    if (spec.source.capability !== "core.demoFeed" && !spec.source.params.query) {
      buildStatus.textContent = "请填写搜索关键词";
      return;
    }
    if (spec.actions.length === 0) { buildStatus.textContent = "至少勾一个动作"; return; }
    createBtn.disabled = true;
    try {
      var res = await api.createFlow({
        name: nameInput.value.trim() || describeSpec(spec).slice(0, 40),
        spec: spec
      });
      buildStatus.textContent = res.ok ? "已创建 ✓" : ("创建失败：" + (res.error || res.status));
      if (res.ok) { nameInput.value = ""; refresh(); }
    } finally { createBtn.disabled = false; }
  }

  async function runFlow(id, button) {
    button.disabled = true;
    button.textContent = "运行中…";
    try {
      var res = await api.runFlow(id);
      var r = res.ok && res.data ? res.data : null;
      buildStatus.textContent = r
        ? ("运行完成：发现 " + r.found + " · 保留 " + r.kept + " · 写入 " + r.saved)
        : ("运行失败：" + (res.error || res.status));
      refresh();
    } finally { button.disabled = false; button.textContent = "运行"; }
  }

  async function removeFlow(id) {
    await api.deleteFlow(id);
    refresh();
  }

  function refresh() {
    if (disposed) return;
    api.flows().then(function (res) {
      if (disposed) return;
      clear(list);
      var items = res.ok && res.data && Array.isArray(res.data.items) ? res.data.items : [];
      if (items.length === 0) { list.appendChild(h("div", { className: "sa-empty" }, "还没有流程 —— 用上面的表单建一条。")); return; }
      items.forEach(function (flow) {
        var runBtn = h("button", { type: "button", className: "sa-btn", "data-variant": "primary", onClick: function () { runFlow(flow.id, runBtn); } }, "运行");
        list.appendChild(h("div", { className: "sa-platform" + (flow.last_state === "ok" ? " is-bound" : "") }, [
          h("div", { className: "sa-platform-head" }, [
            h("span", { className: "sa-dot", "data-state": flow.last_state === "ok" ? "online" : (flow.last_state === "failed" ? "offline" : "idle") }),
            h("span", { className: "sa-platform-name" }, flow.name)
          ]),
          h("div", { className: "sa-platform-body" }, describeSpec(flow.spec)),
          h("div", { className: "sa-caption" }, flow.last_run_at ? ("上次运行 " + fmtTime(flow.last_run_at)) : "还没运行过"),
          h("div", { className: "sa-platform-foot" }, [runBtn, h("button", { type: "button", className: "sa-btn", onClick: function () { removeFlow(flow.id); } }, "删除")])
        ]));
      });
    });
  }

  function loadSources() {
    return api.capabilities().then(function (res) {
      var items = res.ok && res.data && Array.isArray(res.data.items) ? res.data.items : [];
      sources = items.filter(function (c) { return c.stage === "source"; });
      clear(sourceSelect);
      sources.forEach(function (c) {
        sourceSelect.appendChild(h("option", { value: c.id }, SOURCE_LABEL[c.id] || c.title || c.id));
      });
      syncSourceFields();
    });
  }

  function activate() {
    if (disposed || timer !== null) return;
    loadSources().then(refresh);
    timer = setInterval(refresh, 10000);
  }
  function deactivate() { if (timer === null) return; clearInterval(timer); timer = null; }
  return { element: root, activate: activate, deactivate: deactivate, dispose: function () { disposed = true; deactivate(); } };
}
