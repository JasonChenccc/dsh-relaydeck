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

## 在 DSH 里添加

**设置 → 插件市场 → 索引源（indexes）** 里加入上面的 URL，刷新后即可在市场里搜到 **RelayDeck**（关键词：抖音、小红书、采集、下载、发布）。

## 更新索引

改了插件版本后，重新生成索引（把 `versions` 里加一条新的 `version` + `publishTimestamp` +
`source.commit`），再提交即可。校验方法：

```js
import { parseMarketIndex } from '@deepseek-ai/dsh-plugin-market-index'
parseMarketIndex(JSON.parse(readFileSync('market/index.json', 'utf8')), 'https://raw.githubusercontent.com/.../index.json')
```
