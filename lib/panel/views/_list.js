// Shared read-only list view: filters + table + empty state + 10 s polling that
// stops when the view is hidden and resumes when it is activated again.
import { h, clear, fmtTime } from "../dom.js";

function normalize(res) {
  var data = res && res.data;
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.items)) return data.items;
  return [];
}

export function renderList(ctx, config) {
  var root = h("div", { className: "sa-view" });
  var state = {};
  var timer = null;
  var disposed = false;

  var controls = h("div", { className: "sa-row" });
  var summary = h("span", { className: "sa-caption" }, "");
  var tbody = h("tbody", null);
  var thead = h("thead", null, [h("tr", null, config.columns.map(function (c) { return h("th", null, c.label); }))]);
  var table = h("table", { className: "sa-table" }, [thead, tbody]);

  (config.filters || []).forEach(function (filter) {
    if (filter.value !== undefined) state[filter.id] = filter.value;
    var select = h("select", {
      className: "sa-btn",
      onChange: function (e) { state[filter.id] = e.target.value; refresh(); }
    });
    (filter.options || []).forEach(function (option) {
      var opt = h("option", { value: option.value }, option.label);
      if (state[filter.id] === option.value) opt.setAttribute("selected", "selected");
      select.appendChild(opt);
    });
    controls.appendChild(select);
  });

  var refreshBtn = h("button", { type: "button", className: "sa-btn", onClick: refresh }, "刷新");
  controls.appendChild(refreshBtn);
  controls.appendChild(summary);
  root.appendChild(controls);
  if (config.description) root.appendChild(h("div", { className: "sa-caption" }, config.description));
  root.appendChild(table);

  function showEmpty(text) {
    clear(tbody);
    tbody.appendChild(h("tr", null, [
      h("td", { colSpan: config.columns.length }, [h("div", { className: "sa-empty" }, text)])
    ]));
  }

  function refresh() {
    if (disposed) return;
    refreshBtn.disabled = true;
    Promise.resolve(config.load(state)).then(function (res) {
      if (disposed) return;
      refreshBtn.disabled = false;
      if (!res || res.ok !== true) {
        summary.textContent = "";
        showEmpty((res && res.error) ? ("加载失败：" + res.error) : "加载失败");
        return;
      }
      var items = normalize(res);
      summary.textContent = "共 " + items.length + " 条";
      if (items.length === 0) { showEmpty(config.empty || "暂无数据"); return; }
      clear(tbody);
      items.forEach(function (row) {
        var cells = config.columns.map(function (column) {
          var value = column.render ? column.render(row) : row[column.key];
          var text = value === undefined || value === null || value === "" ? "-" : String(value);
          return h("td", null, text);
        });
        tbody.appendChild(h("tr", null, cells));
      });
    }).catch(function (err) {
      if (disposed) return;
      refreshBtn.disabled = false;
      summary.textContent = "";
      showEmpty("加载失败：" + String(err && err.message ? err.message : err));
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

  return {
    element: root,
    activate: activate,
    deactivate: deactivate,
    dispose: function () { disposed = true; deactivate(); }
  };
}
