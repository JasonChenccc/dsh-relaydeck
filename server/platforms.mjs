// RelayDeck — platform descriptors.
//
// One entry per platform: where to log in, which cookies prove a live session,
// and which capabilities it registers. Adding a platform means adding an entry
// and a capability module; the engine, panel and tools stay untouched.
export const PLATFORMS = [
  {
    id: "douyin",
    title: "抖音",
    home: "https://www.douyin.com/",
    loginUrl: "https://www.douyin.com/",
    sessionCookies: ["sessionid", "sessionid_ss"],
    hint: "在打开的窗口里用抖音 App 扫码登录，登录完成后回到面板刷新。"
  },
  {
    id: "xhs",
    title: "小红书",
    home: "https://www.xiaohongshu.com/",
    loginUrl: "https://www.xiaohongshu.com/",
    sessionCookies: ["web_session"],
    hint: "用小红书 App 扫码登录。"
  },
  {
    id: "kuaishou",
    title: "快手",
    home: "https://www.kuaishou.com/",
    loginUrl: "https://www.kuaishou.com/",
    sessionCookies: ["kuaishou.web.cp.api_st", "kuaishou.web.cp.api_ph"],
    hint: "用快手 App 扫码登录。"
  },
  {
    id: "shipinhao",
    title: "视频号",
    home: "https://channels.weixin.qq.com/platform",
    loginUrl: "https://channels.weixin.qq.com/platform",
    sessionCookies: ["slave_sid", "wxuin"],
    hint: "用微信扫码登录视频号助手。"
  },
  {
    id: "tiktok",
    title: "TikTok",
    home: "https://www.tiktok.com/",
    loginUrl: "https://www.tiktok.com/login",
    sessionCookies: ["sessionid", "sid_tt"],
    hint: "用 TikTok App 扫码登录（可能需要网络代理）。"
  }
];

/**
 * Where to run a search, and which responses carry the results.
 * Keeping this declarative is what lets one generic capability serve every
 * platform: the browser does the signing, RelayDeck only reads the wire.
 */
export const SEARCH = {
  douyin: { url: (q) => "https://www.douyin.com/search/" + encodeURIComponent(q), match: /aweme\/v1\/web\/search\/item|search\/item|general\/search/ },
  xhs: { url: (q) => "https://www.xiaohongshu.com/search_result?keyword=" + encodeURIComponent(q), match: /api\/sns\/web\/v1\/search|search\/notes|search_result/ },
  kuaishou: { url: (q) => "https://www.kuaishou.com/search/video?searchKey=" + encodeURIComponent(q), match: /graphql|search|visionSearch/ },
  shipinhao: { url: (q) => "https://channels.weixin.qq.com/platform/search?query=" + encodeURIComponent(q), match: /search|cgi-bin/ },
  tiktok: { url: (q) => "https://www.tiktok.com/search?q=" + encodeURIComponent(q), match: /api\/search|search\/general|item_list/ }
};

export function searchPlan(id, query) {
  const plan = SEARCH[id];
  if (!plan) return undefined;
  return { url: plan.url(query), match: plan.match };
}

/**
 * Where each platform publishes, plus the fields RelayDeck tries to fill.
 * Selectors are best-effort hints: when one misses, the draft is still prepared
 * and left open for the human to finish. Final submission is never automated.
 */
export const PUBLISH = {
  douyin: {
    url: "https://creator.douyin.com/creator-micro/content/upload",
    fileInput: 'input[type="file"]',
    title: 'input[placeholder*="标题"], input[placeholder*="作品"]',
    body: 'div[contenteditable="true"], textarea[placeholder*="作品描述"]'
  },
  xhs: {
    url: "https://creator.xiaohongshu.com/publish/publish",
    fileInput: 'input[type="file"]',
    title: 'input[placeholder*="标题"]',
    body: 'div[contenteditable="true"], textarea[placeholder*="正文"]'
  },
  kuaishou: {
    url: "https://cp.kuaishou.com/article/publish/video",
    fileInput: 'input[type="file"]',
    title: 'input[placeholder*="标题"]',
    body: 'div[contenteditable="true"], textarea[placeholder*="描述"]'
  },
  shipinhao: {
    url: "https://channels.weixin.qq.com/platform/post/create",
    fileInput: 'input[type="file"]',
    title: 'input[placeholder*="标题"]',
    body: 'div[contenteditable="true"], textarea[placeholder*="描述"]'
  },
  tiktok: {
    url: "https://www.tiktok.com/tiktokstudio/upload",
    fileInput: 'input[type="file"]',
    title: 'input[placeholder*="title"], input[placeholder*="Title"]',
    body: 'div[contenteditable="true"]'
  }
};

export function publishPlanFor(id) {
  return PUBLISH[id];
}

export function platform(id) {
  return PLATFORMS.find((p) => p.id === id);
}

export function platformIds() {
  return PLATFORMS.map((p) => p.id);
}
