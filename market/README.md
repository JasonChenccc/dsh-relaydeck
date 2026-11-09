# RelayDeck 插件市场索引

这是一份符合 **DSH 插件市场索引格式 1** 的索引文件，用来让 RelayDeck 出现在 DSH 的插件市场中。

## 文件

| 文件 | 用途 |
|---|---|
| `index.json` | 索引正文（已通过官方 `parseMarketIndex` 校验） |
| `icon.svg` | 插件图标（索引里用相对路径引用，会解析成绝对 URL） |

## 索引地址

```
https://raw.githubusercontent.com/JasonChenccc/dsh-relaydeck/main/market/index.json
```

镜像（dsh 抓取索引源的超时是 **15 秒**；jsDelivr 走 CDN，国内通常更稳）：

```
https://cdn.jsdelivr.net/gh/JasonChenccc/dsh-relaydeck@main/market/index.json
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
