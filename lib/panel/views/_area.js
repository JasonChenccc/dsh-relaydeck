// 通用板块页：新建 → 列表 → 启停 / 删除。所有数据都来自后端真实行。
import { h, clear, fmtTime } from "../dom.js";

export function renderArea(ctx, config) {
  var api = ctx.api;
  var root = h("div", { className: "sa-view" });
  var timer = null;
  var disposed = false;
  var state = { draft: {} };

  var status = h("div", { className: "sa-caption" }, "");
  var list = h("div", { className: "sa-list" });

  root.appendChild(h("div", { className: "sa-section-title" }, config.title));
  if (config.description) root.appendChild(h("div", { className: "sa-muted" }, config.description));

  // 新建区
  var form = h("div", { className: "sa-subcard" }, [h("div", { className: "sa-media-title" }, "新建")]);
  var fields = h("div", { className: "sa-checks" });
  (config.fields || []).forEach(function (field) {
    var input;
    if (field.type === "select") {
      input = h("select", { className: "sa-btn" });
      (field.options || []).forEach(function (opt) { input.appendChild(h("option", { value: opt.value }, opt.label)); });
    } else if (field.type === "textarea") {
      input = h("textarea", { className: "sa-textarea", style: { minHeight: "60px" }, placeholder: field.placeholder || "" });
    } else {
      input = h("input", { className: "sa-input", type: field.type || "text", placeholder: field.placeholder || "", style: { width: field.width || "180px" } });
    }
    if (field.value !== undefined) input.value = field.value;
    input.addEventListener("input", function () { state.draft[field.key] = input.value; });
    input.addEventListener("change", function () { state.draft[field.key] = input.value; });
    state.draft[field.key] = input.value;
    fields.appendChild(h("label", { className: "sa-check" }, [h("span", { className: "sa-caption" }, field.label), input]));
  });
  var createBtn = h("button", { type: "button", className: "sa-btn", "data-variant": "primary", onClick: create }, "创建");
  form.appendChild(fields);
  form.appendChild(h("div", { className: "sa-row" }, [createBtn, status]));
  if (config.note) form.appendChild(h("div", { className: "sa-warn" }, config.note));
  root.appendChild(form);

  root.appendChild(h("div", { className: "sa-section-title" }, "列表"));
  root.appendChild(list);

  function payload() {
    var out = {};
    (config.fields || []).forEach(function (field) {
      var value = state.draft[field.key];
      if (field.type === "number") out[field.key] = Number(value) || 0;
      else out[field.key] = value === undefined ? "" : value;
    });
    return out;
  }

  async function create() {
    createBtn.disabled = true;
    try {
      var res = await api.areaCreate(config.path, payload());
      status.textContent = res.ok ? "已创建 ✓" : ("创建失败：" + (res.error || res.status));
      if (res.ok) refresh();
    } finally { createBtn.disabled = false; }
  }

  async function toggle(id) { await api.areaToggle(config.path, id); refresh(); }
  async function remove(id) { await api.areaDelete(config.path, id); refresh(); }

  function refresh() {
    if (disposed) return;
    api.areaList(config.path).then(function (res) {
      if (disposed) return;
      clear(list);
      var items = res.ok && res.data && Array.isArray(res.data.items) ? res.data.items : [];
      if (!res.ok) { list.appendChild(h("div", { className: "sa-empty" }, "读取失败：" + (res.error || res.status))); return; }
      if (items.length === 0) { list.appendChild(h("div", { className: "sa-empty" }, "还没有条目 —— 用上面的表单建一条。")); return; }
      items.forEach(function (row) {
        var title = row[config.titleKey] || row.name || row.title || ("#" + row.id);
        var sub = (config.subtitle || function (r) { return ""; })(row);
        var toggleBtn = h("button", { type: "button", className: "sa-btn", onClick: function () { toggle(row.id); } }, row.enabled ? "停用" : "启用");
        list.appendChild(h("div", { className: "sa-list-row" }, [
          h("div", { className: "sa-row" }, [
            h("span", { className: "sa-dot", "data-state": row.enabled ? "online" : "idle" }),
            h("span", { style: { flex: 1, fontWeight: 600 } }, title),
            h("span", { className: "sa-chip" }, row.platform || config.path),
            row.items ? h("span", { className: "sa-chip is-ok" }, "采集 " + row.items) : null,
            h("span", { className: "sa-caption" }, row.last_scan_at ? fmtTime(row.last_scan_at) : "未运行"),
            toggleBtn,
            h("button", { type: "button", className: "sa-btn", onClick: function () { remove(row.id); } }, "删除")
          ]),
          sub ? h("div", { className: "sa-caption" }, sub) : null,
          row.last_error ? h("div", { className: "sa-warn" }, row.last_error) : null
        ]));
      });
    });
  }

  function activate() { if (disposed || timer !== null) return; refresh(); timer = setInterval(refresh, 10000); }
  function deactivate() { if (timer === null) return; clearInterval(timer); timer = null; }
  return { element: root, activate: activate, deactivate: deactivate, dispose: function () { disposed = true; deactivate(); } };
}
