// RelayDeck — 通知发送。
//
// 三类渠道：通用 webhook、钉钉、飞书。发送失败不影响主流程，只记日志。
import { log, errorText } from "./log.mjs";

/** 把统一载荷翻译成各渠道要求的格式。 */
function bodyFor(type, payload) {
  const text = payload.text;
  if (type === "dingtalk") return { msgtype: "text", text: { content: text } };
  if (type === "feishu") return { msg_type: "text", content: { text: text } };
  return { text: text, title: payload.title || "", event: payload.event || "", data: payload.data || {} };
}

function urlOf(channel) {
  let config = {};
  try { config = JSON.parse(channel.config_json || "{}"); } catch (e) { config = {}; }
  return config.url || config.webhook || "";
}

/** 发送到单个渠道。返回 { ok, status, error }。 */
export async function sendNotification(channel, payload, timeoutMs) {
  if (!channel) return { ok: false, error: "no channel" };
  if (channel.enabled !== 1 && channel.enabled !== true) return { ok: false, error: "channel disabled" };
  const url = urlOf(channel);
  if (!url) return { ok: false, error: "channel has no url" };
  if (channel.type === "desktop") {
    // 桌面通知由宿主负责；这里只记录，避免伪造"已发送"。
    return { ok: false, error: "桌面通知尚未接入" };
  }
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(bodyFor(channel.type, payload)),
      signal: AbortSignal.timeout(timeoutMs || 10000)
    });
    const text = await res.text().catch(() => "");
    return { ok: res.ok, status: res.status, response: String(text).slice(0, 200) };
  } catch (error) {
    return { ok: false, error: errorText(error) };
  }
}

/** 广播给所有启用的渠道。 */
export async function notifyAll(db, event, payload) {
  const channels = db.prepare("SELECT * FROM notifications WHERE enabled = 1").all();
  if (channels.length === 0) return [];
  const results = [];
  for (const channel of channels) {
    const result = await sendNotification(channel, { event: event, text: payload.text, title: payload.title, data: payload.data });
    results.push({ id: channel.id, name: channel.name, type: channel.type, ...result });
    if (!result.ok) log("warn", "notification failed", { channel: channel.name, error: result.error || result.status });
  }
  return results;
}
