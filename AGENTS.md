# RelayDeck — 执行手册（给 AI agent 的记忆）

> 这份文件是**唯一权威**。接手前先读完，再动代码。每完成一个阶段，更新下面的进度表。

---

## 一、身份与约束

| 项 | 值 |
|---|---|
| 包名 | `dsh-relaydeck` |
| 显示名 | RelayDeck |
| entry id | `dsh-relaydeck` |
| 后端 | `server/`（Node 零第三方依赖）· `http://127.0.0.1:18731` |
| 数据 | `node:sqlite` · `~/.relaydeck/relaydeck.db` · schema v3 |
| 面板 | `lib/panel/**` → `client.js`（构建产物） |
| 仓库根 | `D:\work\work\workstation\creatorhub-dsh` |

**硬约束**
1. **不复制任何第三方项目的代码 / 界面 / 素材**。参考原理可以，照抄不行。
2. **面板里不允许出现任何模拟数据**。空就是空；能力没做就写"尚未接入"。
3. **不改 DSH 本体**；只动本插件目录。
4. **不改 CreatorHub**（它已不再是依赖，只是曾经的参考对象）。
5. 平台访问一律**驱动真实浏览器**（CDP），不逆向签名。
6. 对外发内容的动作（发布 / 自动评论）**必须人工确认**，默认关闭。

## 二、命令

```powershell
node scripts/build-client.mjs --watch   # 改 lib/panel 后自动重建
node scripts/dev-pack.mjs               # 重建 + 打 tgz
node server/index.mjs --port=18731 --data=.tmp  # 单独起后端调试
set ELECTRON_RUN_AS_NODE=1 && "D:\dsh\DeepSeek Harness.exe" test/<name>.js
```

**回归（每次改完必须全绿）**：`smoke · lifecycle · readonly · write · client-contract · config-bridge`

## 三、架构

```
Flow  = source → filters[] → actions[]     ← 唯一的一等工作流实体
Run   = 一次执行，带逐步 RunStep 轨迹（可诊断、可重试）
Artifact = 采集到的内容（(platform,item_id) 唯一）
Capability = 一个平台/一个阶段的一个能力，注册即用
```

新增平台 = 在 `server/platforms.mjs` 加描述符 + 写一个 capability 模块。**引擎、面板、工具都不动。**

## 四、阶段计划与进度

| 阶段 | 内容 | 状态 |
|---|---|---|
| **P0** | 收尾与地基：修文案 / 统一任务队列 / 工作台真实指标 | ✅ 完成 |
| **P1** | 抖音做扎实：作品提取稳定 / 监控闭环 / 搜索稳定 / 账号统计 | 🔄 提取已稳定 5/5；监控调度待做 |
| **P2** | 链接下载：粘贴链接直接下载（不依赖登录） | ✅ 完成（实测下载 0.97MB 真实视频） |
| **P3** | 通知：Webhook + 桌面通知真实发送 | ✅ Webhook 完成（桌面通知未接入）|
| **P4** | 评论 & 弹幕采集 | ⬜ |
| **P5** | 发布：准备草稿 + 人工确认 | ⬜ |
| **P6** | 自动评论（最高风险，强制审批） | ⬜ |
| **P7** | 加固：风控域 / 导出 / 多平台扩展 | ⬜ |

## 五、每个阶段的完成标准

1. 后端接口真实可用（不是空壳）
2. 面板页显示真实数据，空态文案正确
3. 有失败路径的明确提示（不是静默失败）
4. `6 项回归全绿`
5. `node scripts/dev-pack.mjs` 通过
6. `git commit`，信息写清"做了什么 + 已知限制"

## 六、已知问题（接手先看）

- 抖音数据接口走 **Service Worker**，CDP 在页面会话里抓不到 → 只能用 DOM 提取（`server/capabilities/douyin.mjs`）
- 抖音**无头浏览器被识别**（返回验证码页）→ 所有浏览器操作必须**有头**
- 页面用户状态（`window.userInfoStore`）**要等 2-3 秒**才填充 → 必须轮询等待，不能读一次
- 登录判定**不能看 cookie**（设备/CSRF cookie 首次访问就有）→ 必须读页面里的真实账号
- ~~抖音主页作品提取只稳定 2/5 条~~ **已解决**：改为「先找作品网格容器（子元素各含大封面 + 尺寸一致），再逐卡片取字段」，并只认卡片自身的 /video/ 链接。实测 5/5，id 全部唯一
- **已验证可行**：视频页的 `video.currentSrc` / `<source>` 暴露真实 CDN 地址，可直接下载（P2 已落地）

## 七、工作方式

- 自己做决定，不问细节；只在**方向性选择**上停下来
- 每完成一个阶段：更新本文档进度表 → 跑回归 → 打包 → 提交
- 中间自己迭代验证；全部做完后交用户统一验收
