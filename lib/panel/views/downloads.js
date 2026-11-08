// 链接下载 — 粘贴链接直接下载；下方是已下载到本地的文件。
import { h, clear, fmtTime } from "../dom.js";

export function renderDownloads(ctx) {
  var api = ctx.api;
  var root = h("div", { className: "sa-view" });
  var timer = null;
  var disposed = false;

  var input = h("textarea", { className: "sa-textarea", style: { minHeight: "80px" }, placeholder: "粘贴作品链接，一行一个。例如：\nhttps://www.douyin.com/video/7607954764765226633" });
  var perItem = h("input", { className: "sa-input", type: "number", value: "1", min: "1", style: { width: "80px" } });
  var btn = h("button", { type: "button", className: "sa-btn", "data-variant": "primary", onClick: start }, "开始下载");
  var status = h("div", { className: "sa-caption" }, "");
  var list = h("div", { className: "sa-list" });

  root.appendChild(h("div", { className: "sa-section-title" }, "链接下载"));
  root.appendChild(h("div", { className: "sa-muted" }, "粘贴作品链接，RelayDeck 会打开页面取出媒体地址并下载到本地。不依赖登录。"));
  root.appendChild(input);
  root.appendChild(h("div", { className: "sa-row" }, [h("span", { className: "sa-caption" }, "每个作品下载"), perItem, h("span", { className: "sa-caption" }, "个文件"), btn]));
  root.appendChild(status);
  root.appendChild(h("div", { className: "sa-section-title" }, "已下载文件"));
  root.appendChild(list);

  async function start() {
    var urls = input.value.trim();
    if (!urls) { status.textContent = "请先粘贴链接"; return; }
    btn.disabled = true;
    status.textContent = "正在解析并下载（会打开浏览器窗口，请稍候）…";
    try {
      var res = await api.downloadUrls(urls, Number(perItem.value) || 1);
      var d = res.ok && res.data ? res.data : null;
      if (!d) { status.textContent = "失败：" + (res.error || res.status); return; }
      if (d.error) { status.textContent = "失败：" + d.error; return; }
      var parts = ["解析 " + d.resolved + " 个作品", "下载 " + d.downloaded + " 个文件", d.sizeText];
      if (d.failures && d.failures.length) parts.push("跳过 " + d.failures.length + " 个");
      status.textContent = parts.join(" · ");
      if (d.failures && d.failures.length) {
        var warn = h("div", { className: "sa-warn" }, d.failures.map(function (f) { return f.url + "：" + f.reason; }).join("；"));
        root.insertBefore(warn, list);
      }
      input.value = "";
      load();
    } finally { btn.disabled = false; }
  }

  function load() {
    if (disposed) return;
    api.artifacts(300).then(function (res) {
      if (disposed) return;
      clear(list);
      var all = res.ok && res.data && Array.isArray(res.data.items) ? res.data.items : [];
      var items = all.filter(function (a) { return a.local_path && a.local_path.length > 0; });
      if (items.length === 0) { list.appendChild(h("div", { className: "sa-empty" }, "还没有下载任何文件。")); return; }
      items.forEach(function (row) {
        var size = "";
        try { var stats = JSON.parse(row.stats_json || "{}"); if (stats.duration) size = stats.duration + " 秒"; } catch (e) {}
        list.appendChild(h("div", { className: "sa-list-row" }, [
          h("div", { className: "sa-row" }, [
            h("span", { className: "sa-chip is-ok" }, "已下载"),
            h("span", { style: { flex: 1, fontWeight: 600 } }, row.title || row.item_id),
            size ? h("span", { className: "sa-caption" }, size) : null,
            h("span", { className: "sa-caption" }, fmtTime(row.collected_at)),
            h("button", { type: "button", className: "sa-btn", onClick: function () { api.areaDelete("artifacts", row.id).then(load); } }, "移除记录")
          ]),
          h("div", { className: "sa-caption", style: { wordBreak: "break-all" } }, row.local_path)
        ]));
      });
    });
  }

  function activate() { if (disposed || timer !== null) return; load(); timer = setInterval(load, 10000); }
  function deactivate() { if (timer === null) return; clearInterval(timer); timer = null; }
  return { element: root, activate: activate, deactivate: deactivate, dispose: function () { disposed = true; deactivate(); } };
}
