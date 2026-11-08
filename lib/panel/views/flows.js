// 流程 — 产品核心：源 → 筛选 → 动作。可建、可跑、可删。
import { h, clear, fmtTime } from "../dom.js";

var TEMPLATE = "{\"source\":{\"capability\":\"core.manual\",\"params\":{\"platform\":\"demo\",\"items\":[{\"item_id\":\"a1\",\"title\":\"示例条目 A\",\"stats\":{\"like_count\":1500}},{\"item_id\":\"a2\",\"title\":\"示例条目 B\",\"stats\":{\"like_count\":90}}]}},\"filters\":[{\"capability\":\"core.stat\",\"params\":{\"field\":\"like_count\",\"op\":\">=\",\"value\":1000}}],\"actions\":[{\"capability\":\"core.store\"},{\"capability\":\"core.notify\",\"params\":{\"message\":\"完成\"}}]}";

export function renderFlows(ctx) {
  var api = ctx.api;
  var events = ctx.events;
  var root = h("div", { className: "sa-view" });
  var disposers = [];
  var timer = null;
  var disposed = false;

  var nameInput = h("input", { className: "sa-input", placeholder: "流程名称" });
  var specArea = h("textarea", { className: "sa-textarea", spellcheck: "false" });
  specArea.value = TEMPLATE;
  var createBtn = h("button", { type: "button", className: "sa-btn", "data-variant": "primary", onClick: create }, "创建流程");
  var status = h("div", { className: "sa-caption" }, "");
  var list = h("div", { className: "sa-list" });

  root.appendChild(h("div", { className: "sa-section-title" }, "新建流程"));
  root.appendChild(h("div", { className: "sa-caption" }, "一条流程 = 源(source) → 筛选(filters) → 动作(actions)。下面是可直接运行的示例。"));
  root.appendChild(nameInput);
  root.appendChild(specArea);
  root.appendChild(h("div", { className: "sa-row" }, [createBtn, status]));
  root.appendChild(h("div", { className: "sa-section-title" }, "流程列表"));
  root.appendChild(list);

  async function create() {
    createBtn.disabled = true;
    try {
      var spec;
      try { spec = JSON.parse(specArea.value); } catch (e) { status.textContent = "规格不是合法 JSON"; return; }
      var res = await api.createFlow({ name: nameInput.value || "未命名流程", spec: spec, trigger: "manual" });
      status.textContent = res.ok ? "已创建 #" + (res.data && res.data.id) : ("创建失败：" + (res.error || res.status));
      if (res.ok) { nameInput.value = ""; refresh(); }
    } finally { createBtn.disabled = false; }
  }

  async function runFlow(id, button) {
    button.disabled = true;
    button.textContent = "运行中…";
    try {
      var res = await api.runFlow(id);
      var run = res.ok && res.data ? res.data : null;
      status.textContent = run ? ("运行 #" + run.id + " " + run.state + "：发现 " + run.found + " / 保留 " + run.kept + " / 写入 " + run.saved) : ("运行失败：" + (res.error || res.status));
      refresh();
    } finally { button.disabled = false; button.textContent = "运行"; }
  }

  async function removeFlow(id) {
    status.textContent = "删除中…";
    var res = await api.deleteFlow(id);
    status.textContent = res.ok ? "已删除" : ("删除失败：" + (res.error || res.status));
    refresh();
  }

  function refresh() {
    if (disposed) return;
    api.flows().then(function (res) {
      if (disposed) return;
      clear(list);
      var items = res.ok && res.data && Array.isArray(res.data.items) ? res.data.items : [];
      if (items.length === 0) { list.appendChild(h("div", { className: "sa-empty" }, "还没有流程。用上面的示例创建一个。" )); return; }
      items.forEach(function (flow) {
        var runBtn = h("button", { type: "button", className: "sa-btn", onClick: function () { runFlow(flow.id, runBtn); } }, "运行");
        list.appendChild(h("div", { className: "sa-card" }, [
          h("div", { className: "sa-row" }, [
            h("span", { className: "sa-dot", "data-state": flow.last_state === "ok" ? "online" : (flow.last_state === "failed" ? "offline" : "idle") }),
            h("span", { style: { fontWeight: 600, flex: 1 } }, "#" + flow.id + " " + flow.name),
            h("span", { className: "sa-caption" }, flow.trigger + (flow.last_run_at ? " · " + fmtTime(flow.last_run_at) : "")),
            runBtn,
            h("button", { type: "button", className: "sa-btn", onClick: function () { removeFlow(flow.id); } }, "删除")
          ]),
          h("pre", { className: "sa-dev-log" }, JSON.stringify(flow.spec))
        ]));
      });
    });
  }

  function activate() { if (disposed || timer !== null) return; refresh(); timer = setInterval(refresh, 10000); }
  function deactivate() { if (timer === null) return; clearInterval(timer); timer = null; }
  return { element: root, activate: activate, deactivate: deactivate, dispose: function () { disposed = true; deactivate(); while (disposers.length) { try { disposers.pop()(); } catch (e) {} } } };
}
