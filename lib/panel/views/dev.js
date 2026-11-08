// 开发调试：重载插件 / 重启宿主 / 重新打包。
// Reload uses the Host's native remote pluginManager (typert RPC) — no extra route.
// Pack and restart go through the Host dev routes registered in lib/index.js.
import { h } from "../dom.js";

var PACK_PATH = "/dsh-relaydeck/dev/pack";
var RESTART_PATH = "/dsh-relaydeck/dev/restart";
var PACKAGE_NAME = "dsh-relaydeck";

export function renderDev(ctx) {
  var clientCtx = ctx.clientCtx;
  var root = h("div", { className: "sa-view" });
  var status = h("div", { className: "sa-caption" }, "");
  var log = h("pre", { className: "sa-dev-log" }, "");

  function say(text) { status.textContent = text; }
  function write(text) { log.textContent = String(text).slice(0, 4000); }

  function remoteManager() {
    try {
      if (!clientCtx || !clientCtx.remote) return undefined;
      return clientCtx.remote.pluginManager;
    } catch (e) { return undefined; }
  }

  async function findEntryId() {
    var manager = remoteManager();
    if (!manager) return undefined;
    var listed = await manager.listPlugins();
    var value = listed && listed.ok ? listed.value : listed;
    var items = value && (value.plugins || value.items || value);
    if (!Array.isArray(items)) return undefined;
    for (var i = 0; i < items.length; i++) {
      var row = items[i] || {};
      if (row.packageName === PACKAGE_NAME || row.name === PACKAGE_NAME || row.package === PACKAGE_NAME) {
        return row.id || row.entryId || row.key;
      }
    }
    for (var k = 0; k < items.length; k++) {
      var r = items[k] || {};
      var hay = JSON.stringify(r);
      if (hay.indexOf(PACKAGE_NAME) >= 0) return r.id || r.entryId || r.key;
    }
    return undefined;
  }

  var reloadBtn = h("button", { type: "button", className: "sa-btn", "data-variant": "primary", onClick: reload }, "重载插件");
  var restartBtn = h("button", { type: "button", className: "sa-btn", onClick: restart }, "重启宿主");
  var packBtn = h("button", { type: "button", className: "sa-btn", onClick: pack }, "重新打包");

  async function reload() {
    var manager = remoteManager();
    if (!manager) { say("宿主 remote.pluginManager 不可用"); return; }
    reloadBtn.disabled = true;
    try {
      var entryId = await findEntryId();
      if (!entryId) { say("未在插件列表中找到 " + PACKAGE_NAME); return; }
      say("正在重载 " + entryId + " …");
      await manager.setPluginEnabled(entryId, false);
      var back = await manager.setPluginEnabled(entryId, true);
      var applied = back && back.ok && back.value ? back.value.application : undefined;
      say(applied === "restart-required"
        ? "已提交，但需要重启宿主：" + (back.value.restartReason || "")
        : "重载已提交" + (applied ? "（" + applied + "）" : ""));
    } catch (e) {
      say("重载失败：" + String(e && e.message ? e.message : e));
    } finally {
      reloadBtn.disabled = false;
    }
  }

  async function restart() {
    restartBtn.disabled = true;
    try {
      say("正在请求重启宿主 …");
      var res = await fetch(RESTART_PATH, { method: "POST", credentials: "same-origin", headers: { accept: "application/json" } });
      var body = await res.json();
      if (body.ok) say("宿主即将重启（窗口会关闭后自动拉起）");
      else say("未重启：" + (body.hint || body.error || body.reason || res.status));
      write(JSON.stringify(body, null, 2));
    } catch (e) {
      say("重启请求失败：" + String(e && e.message ? e.message : e));
    } finally {
      restartBtn.disabled = false;
    }
  }

  async function pack() {
    packBtn.disabled = true;
    try {
      say("正在重新打包 …");
      var res = await fetch(PACK_PATH, { method: "POST", credentials: "same-origin", headers: { accept: "application/json" } });
      var body = await res.json();
      if (body.ok) say("打包完成：" + body.name + "@" + body.version + " · " + body.bytes + " B · client.js " + body.clientBytes + " B");
      else say("打包失败：" + (body.error || res.status));
      write(JSON.stringify(body, null, 2));
    } catch (e) {
      say("打包请求失败：" + String(e && e.message ? e.message : e));
    } finally {
      packBtn.disabled = false;
    }
  }

  var info = h("div", { className: "sa-caption" }, "读取宿主 dev 配置 …");
  root.appendChild(info);
  fetch("/dsh-relaydeck/config", { credentials: "same-origin", headers: { accept: "application/json" } })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (cfg) {
      if (!cfg) { info.textContent = "无法读取宿主配置"; return; }
      info.textContent = "devMode=" + String(cfg.devMode) + " · allowHostRestart=" + String(cfg.allowHostRestart) + " · 后端端口 " + cfg.port + " · 数据目录 " + cfg.dataDir;
    })
    .catch(function () { info.textContent = "无法读取宿主配置"; });
  root.appendChild(h("div", { className: "sa-caption" }, "开发调试：重载插件走宿主 remote.pluginManager（原生，无需重启）；重新打包在宿主执行 scripts/dev-pack.mjs；重启宿主需在插件配置中开启 allowHostRestart。"));
  root.appendChild(h("div", { className: "sa-row" }, [reloadBtn, restartBtn, packBtn]));
  root.appendChild(status);
  root.appendChild(log);

  return {
    element: root,
    activate: function () { say("就绪"); },
    deactivate: function () {},
    dispose: function () {}
  };
}
