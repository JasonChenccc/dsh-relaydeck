# RelayDeck 插件市场索引

这是一份符合 **DSH 插件市场索引格式 1** 的索引文件，用来让 RelayDeck 出现在 DSH 的插件市场中。

## 文件

| 文件 | 用途 |
|---|---|
| `index.json` | 索引正文（已通过官方 `parseMarketIndex` 校验） |
| `icon.svg` | 插件图标（索引里用相对路径引用，会解析成绝对 URL） |

## 索引地址

**主地址**（跟随 `main`，缓存 5 分钟，发版后自动更新）：

```
https://raw.githubusercontent.com/JasonChenccc/dsh-relaydeck/main/market/index.json
```

> ⚠️ **`raw.githubusercontent.com` 在部分网络下不可达。** 本机 2026-11-09 实测：DNS 解析正常，
> 但 TCP/TLS 被重置（HTTP `000`，3/3 失败）；同一天早些时候它还是 1.4 秒正常 —— 属**间歇性**。
> 抓不到时市场会因为 15 秒超时而整条失败。

**备选地址**（同一份索引；下面的耗时是本机实测，均为钉死的 tag，内容不可变）：

| 地址 | 实测 |
|---|---|
| `https://fastly.jsdelivr.net/gh/JasonChenccc/dsh-relaydeck@v0.1.1/market/index.json` | 200 · 1.58 s |
| `https://gcore.jsdelivr.net/gh/JasonChenccc/dsh-relaydeck@v0.1.1/market/index.json` | 200 · 1.61 s |
| `https://testingcf.jsdelivr.net/gh/JasonChenccc/dsh-relaydeck@v0.1.1/market/index.json` | 200 · 1.82 s |
| `https://jsdelivr.b-cdn.net/gh/JasonChenccc/dsh-relaydeck@v0.1.1/market/index.json` | 200 · 2.40 s |

> ⚠️ **不要用 `cdn.jsdelivr.net`（jsDelivr 主域）。** 本机实测它与 `raw.githubusercontent.com`
> 一样被重置（HTTP `000`，3/3 失败）；而且它对移动引用 `@main` 还会缓存 **12 小时**
> （`s-maxage=43200`，实测当时仍返回旧的 `0.1.0`）。用上面四个**备用端点**（钉 tag）则返回
> `immutable`、缓存一年；代价是**每次发版都要更新这些行里的 tag**。

若 GitHub 系域名整体不可达，可把仓库同步到 GitCode 后使用它自己的 raw 路径 —— 本机实测
**0.22 s**，是全部候选中最快的：

```
https://gitcode.com/<用户名>/<仓库>/raw/main/market/index.json
```

## 在 DSH 里添加

**添加索引源之前，必须先启用一个默认禁用的可选 bundle**，否则界面里根本没有入口：

1. 打开**插件页** →「**实验性插件**」旁的「**更多**」→ 启用「**自定义插件市场**」。
   该 bundle（`@deepseek-ai/dsh-experimental-plugin-market-bundle`）随包默认禁用；
   启用后插件页会多出「**已安装**」和「**发现**」两个标签页。
2. 切到「**发现**」标签页 →「**添加索引源**」，填入上面的 URL。
3. 刷新后即可搜到 **RelayDeck**（关键词：抖音、小红书、采集、下载、发布）。

> **索引源只能由用户手动添加。** `dsh-plugin-market` 的工具描述原文：
> "Only the user can add or remove index sources." —— agent 无法代劳。
>
> 官方**没有**任何默认索引目录：`indexes` 配置默认是空数组，所以不存在"向官方索引仓库提 PR"
> 这条路。官方 README 的原话是「目前没有官方插件市场；发现标签页只列出用户添加的索引源」。

## 更新索引

改了插件版本后，重新生成索引（把 `versions` 里加一条新的 `version` + `publishTimestamp` +
`source.commit`），再提交即可。校验方法：

```js
import { parseMarketIndex } from '@deepseek-ai/dsh-plugin-market-index'
parseMarketIndex(JSON.parse(readFileSync('market/index.json', 'utf8')), 'https://raw.githubusercontent.com/.../index.json')
```
