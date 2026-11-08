// 关于 — 版本、许可证、免责声明。
import { h, clear } from "../dom.js";

var DISCLAIMER = "RelayDeck 是独立项目：不包含、不依赖、也不分发任何第三方内容工具的代码或素材。所有平台能力均为本项目自行实现。";

export function renderAbout(ctx) {
  var api = ctx.api;
  var root = h("div", { className: "sa-view" });
  var body = h("div", { className: "sa-list" });
  root.appendChild(body);

  api.health().then(function (res) {
    clear(body);
    var data = res.ok && res.data ? res.data : null;
    body.appendChild(h("div", { className: "sa-card" }, [
      h("div", { className: "sa-row" }, [h("span", { style: { fontWeight: 600 } }, "RelayDeck")]),
      h("div", { className: "sa-caption" }, "DSH 原生内容流转工作台 · Flow = 源 → 筛选 → 动作"),
      h("div", { className: "sa-caption" }, "版本 " + (data ? data.version : "?") + " · API " + (data ? data.api : "?") + " · schema " + (data ? data.schemaVersion : "?"))
    ]));
    body.appendChild(h("div", { className: "sa-card" }, [
      h("div", { className: "sa-row" }, [h("span", { style: { fontWeight: 600 } }, "许可证")]),
      h("div", { className: "sa-caption" }, "MIT")
    ]));
    body.appendChild(h("div", { className: "sa-card" }, [
      h("div", { className: "sa-row" }, [h("span", { style: { fontWeight: 600 } }, "免责声明")]),
      h("div", { className: "sa-caption" }, DISCLAIMER)
    ]));
  });

  return { element: root, activate: function () {}, deactivate: function () {}, dispose: function () {} };
}
