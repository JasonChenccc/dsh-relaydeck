// 素材 — 缩略图卡片墙，不是表格。
import { h, clear, fmtTime } from "../dom.js";

function metric(statsJson, key) {
  try { var s = JSON.parse(statsJson || "{}"); return Number(s[key] || 0); } catch (e) { return 0; }
}

export function renderLibrary(ctx) {
  var api = ctx.api;
  var root = h("div", { className: "sa-view" });
  var timer = null;
  var disposed = false;

  var toolbar = h("div", { className: "sa-row" });
  var count = h("span", { className: "sa-caption" }, "");
  var refreshBtn = h("button", { type: "button", className: "sa-btn", onClick: refresh }, "刷新");
  toolbar.appendChild(refreshBtn);
  toolbar.appendChild(count);
  root.appendChild(toolbar);

  var grid = h("div", { className: "sa-grid" });
  root.appendChild(grid);

  function refresh() {
    if (disposed) return;
    refreshBtn.disabled = true;
    api.artifacts(200).then(function (res) {
      if (disposed) return;
      refreshBtn.disabled = false;
      clear(grid);
      var items = res.ok && res.data && Array.isArray(res.data.items) ? res.data.items : [];
      count.textContent = "共 " + items.length + " 条";
      if (items.length === 0) {
        grid.appendChild(h("div", { className: "sa-empty" }, "素材库还是空的 —— 到「流程」页跑一条流程试试。"));
        return;
      }
      items.forEach(function (item) {
        var cover = item.cover_url && item.cover_url.length > 0 && !item.cover_url.startsWith("data:image/png;base64,iVBOR")
          ? h("img", { className: "sa-thumb", src: item.cover_url, alt: "", loading: "lazy", onError: function (e) { e.target.style.display = "none"; } })
          : h("div", { className: "sa-thumb-empty" }, item.platform);
        var liked = metric(item.stats_json, "like_count");
        grid.appendChild(h("div", { className: "sa-media-card" }, [
          cover,
          h("div", { className: "sa-media-body" }, [
            h("div", { className: "sa-media-title" }, item.title || item.item_id),
            h("div", { className: "sa-media-meta" }, [
              h("span", { className: "sa-chip" }, item.platform),
              item.author ? h("span", null, item.author) : null,
              liked > 0 ? h("span", null, "♥ " + liked) : null,
              h("span", { className: "sa-chip" + (item.download_state === "done" ? " is-ok" : "") },
                item.download_state === "done" ? "已下载" : "未下载")
            ]),
            h("div", { className: "sa-caption" }, fmtTime(item.collected_at))
          ])
        ]));
      });
    });
  }

  function activate() { if (disposed || timer !== null) return; refresh(); timer = setInterval(refresh, 10000); }
  function deactivate() { if (timer === null) return; clearInterval(timer); timer = null; }
  return { element: root, activate: activate, deactivate: deactivate, dispose: function () { disposed = true; deactivate(); } };
}
