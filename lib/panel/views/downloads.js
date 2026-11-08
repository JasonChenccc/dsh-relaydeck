// 链接下载 — 已下载到本地的素材文件。
import { h, clear, fmtTime } from "../dom.js";

export function renderDownloads(ctx) {
  var api = ctx.api;
  var root = h("div", { className: "sa-view" });
  var timer = null;
  var disposed = false;
  var status = h("div", { className: "sa-caption" }, "");
  var list = h("div", { className: "sa-list" });

  root.appendChild(h("div", { className: "sa-section-title" }, "链接下载"));
  root.appendChild(h("div", { className: "sa-muted" }, "流程里勾选「下载媒体文件」后，文件会落在这里。按链接下载（粘贴链接直接下载）尚未接入。"));
  root.appendChild(status);
  root.appendChild(list);

  function refresh() {
    if (disposed) return;
    api.artifacts(300).then(function (res) {
      if (disposed) return;
      clear(list);
      var all = res.ok && res.data && Array.isArray(res.data.items) ? res.data.items : [];
      var items = all.filter(function (a) { return a.local_path && a.local_path.length > 0; });
      status.textContent = "已下载 " + items.length + " 项 · 素材库共 " + all.length + " 项";
      if (items.length === 0) { list.appendChild(h("div", { className: "sa-empty" }, "还没有下载任何文件。")); return; }
      items.forEach(function (row) {
        list.appendChild(h("div", { className: "sa-list-row" }, [
          h("div", { className: "sa-row" }, [
            h("span", { className: "sa-chip is-ok" }, "已下载"),
            h("span", { style: { flex: 1, fontWeight: 600 } }, row.title || row.item_id),
            h("span", { className: "sa-caption" }, row.platform + " · " + fmtTime(row.collected_at))
          ]),
          h("div", { className: "sa-caption", style: { wordBreak: "break-all" } }, row.local_path)
        ]));
      });
    });
  }

  function activate() { if (disposed || timer !== null) return; refresh(); timer = setInterval(refresh, 10000); }
  function deactivate() { if (timer === null) return; clearInterval(timer); timer = null; }
  return { element: root, activate: activate, deactivate: deactivate, dispose: function () { disposed = true; deactivate(); } };
}
