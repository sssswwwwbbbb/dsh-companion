# 冷启动 · 图标语汇重做与交付交接（2026-11-08 修订）

首套皮肤 `commander-workspace-private` 0.6.0 → 0.7.0 → 0.7.1 · 图标线 56 组 / 112 张全部重画

这份文档只讲图标这一条线，不替代[配音升级回执](dsh-cold-start-cs07-voice-upgrade-2026-11-06.md)。用户已确认 0.7.0 实机效果，本线**未提交**，按用户决定留给主控统一处理。

## 为什么之前"看着没换图标"

0.4.0/0.5.x 那套图标是线描 + 蓝灰，和 DSH 原生同一套图形词汇（齿轮、放大镜、省略号、方块、文件夹），缩到 16px 后几乎无法分辨；当时只有「新会话」和「插件」两枚因为换成了画笔方块和拼图才看得出来。不是没生效，是存在感不够。

顺带纠正一条曾经写错的结论：早期判断「替换表 146 条 data-icon 选择器不可能命中」**是错的**。图标 id 在运行时拼接（`dsw-icon-<name>-<weight>`），静态 grep 找不到字面量。从 `dsh-web-frontend` 真实前端包解出注册表后重算：**228 条选择器里 216 条能命中当前构建**，50 个键中 44 个全覆盖，6 个部分覆盖（`more` 3/5、`send` 6/7、`stop` 3/4、`plus` 2/8、`model` 5/6、`file-code` 2/3），没有 0 覆盖的键。

## 设计语汇（CS-07 面板）

| 项 | 取值 |
| --- | --- |
| 网格 | 96px（DSH 图标资源规格），整体绕中心放大 1.07 |
| 笔画 | 主 11 / 次 9（对应 16px 实显 1.85px / 1.5px），butt cap、miter join |
| 主色 | 浅色 `#2F4154` / 深色 `#E2ECF8` |
| 强调 | 警示琥珀 浅 `#B85108` / 深 `#FFB454`，每枚图标**只有一个**琥珀元素 |
| 身份色 | 全息青 浅 `#0E6A86` / 深 `#8FE6FA`，只给 `companion`、`agent`、`model` 三枚 |
| 轮廓 | 切角面板；0.7.0 把面板框拆开，让加粗后的字形不与框互挤 |

0.6.0 是第一版（笔画 9、原尺寸、琥珀偏小），用户反馈存在感不足后推出 0.7.0：笔画加粗、整体放大 7%、琥珀面积放大、墨色加深、面板框拆开。

## 素材与脚本位置

全部在 `designs/dsh-skin-assets-v3/review/cold-start-icons-v2-2026-11-06/`：

| 文件 | 作用 |
| --- | --- |
| `make_icons.py` | 参数化生成器：56 个图标函数 + 共用图元，一次渲染 112 张（384px 光栅化后缩到 96px） |
| `png/{light,dark}/<key>.png` | 生成的 96×96 透明 PNG，文件名即 `semanticIcons` 的键名 |
| `apply_icons_v2.mjs` | 迁移 0.5.1 → 0.6.0（换图、改哈希、升版本、补内容键） |
| `apply_icons_v3.mjs` | 迁移 0.6.0 → 0.7.0（同上，换强化版图） |
| `make_skin_zip.mjs` | 打可导入 ZIP（0.7.0 时的一次性脚本） |
| `apply_and_pack.mjs` | 现行脚本：装图 + 升版本 + 追内容键 + 出 ZIP，一条命令（`--zip-only` 只重打包） |
| `send-button-fix.png` | 发送按钮在两种底色/两种不透明度下的对照 |
| `commander-workspace-private-0.7.1.zip` | 26 776 254 B · sha256 `cc6e09e519c30fae399d41b37c6a076c3b0b208e25b1417cb3a6cfe017a758d0` |
| `commander-workspace-private-0.7.0.zip` | 旧版，保留作对照 |
| `contact-sheet-light/dark.png` | 两版全集对照（64px） |
| `actual-16px-light/dark.png` | 全部按**真实 16px**渲染再放大 3 倍，用于可辨识度检查 |
| `before-after-16px.png` | 0.6.0 vs 0.7.0 同尺寸对比 |
| `applied-0.6.0-sidebar.png` / `applied-0.7.0-sidebar.png` | 实机侧栏截图（0.7.1 只改发送/停止，侧栏外观不变） |

渲染依赖：`/usr/bin/sips` 做 SVG→PNG（`PIL` 只做缩放与拼图）。生成器不依赖网络与任何付费模型。

## 内容键全表

| 皮肤版本 | 内容键 | 来源 |
| --- | --- | --- |
| 0.4.0 | `3f86c237…` | 已验收基线 |
| 0.5.0 | `8e9284c9…` | CS-07 配音接入 |
| 0.5.1 | `1f579f33…` | 第四条 +5.1 dB |
| 0.6.0 | `3ce0bc25…` | 图标 v2 |
| 0.7.0（内置） | `c55d6e9a…` | 图标 v3（已被 0.7.1 取代） |
| 0.7.0（导入 ZIP） | `3a8c9a9b…` | 同上内容，`dshVersions` 多一条 `0.2.2-rc.1` |
| 0.7.1（内置） | `20b4d4a3…` | 发送/停止改实心琥珀 |
| 0.7.1（导入 ZIP） | `4cc753bd…` | 同上内容，`dshVersions` 多一条 `0.2.2-rc.1` |

内置与导入同内容却不同键，因为导入包按自己声明的宿主版本检查，而内置包靠白名单放行。两份都登记，回滚路径才完整。

## 当前改动落点

工作树 `.local/accepted-inputs/`（**gitignore**）里是皮肤真实内容：0.7.0 的 `skin.json` 与 112 张新图标。tracked 文件我只动了四处：

| 文件 | 改动 |
| --- | --- |
| `packages/dsh-skin-core/src/host-compatibility.mjs` | `builtInSkins` 累加 `3ce0bc25`、`c55d6e9a`（旧键全部保留） |
| `packages/dsh-companion/config/reply-styles.json` | 同步累加，旧键保留 |
| `runtime-src/pet-backend/skin.json` | `contentKey` → `c55d6e9a`；`compatibleContentKeys` 补 `1f579f33`、`3ce0bc25`、`3a8c9a9b`（否则桌宠 `/backend/input` 会以 `BACKEND_CONTENT_NOT_REGISTERED` 拒绝点击） |
| `runtime-src/pet-backend/dsh-pet/runtime/electron-helper/content-context.js` | 同步内容键 |

`packages/dsh-companion/skins/` 仍是 0.6.0 —— 那是 `build-client` 的产物，下次构建会自动从输入同步到 0.7.0。

## 重建步骤

```bash
# 1. 重画图标（可选，素材已在仓库外的 zip 里）
python3 designs/dsh-skin-assets-v3/review/cold-start-icons-v2-2026-11-06/make_icons.py

# 2. 把图标装进构建输入并出 ZIP（升到目标版本；输入已是该版本时用 --zip-only）
node designs/dsh-skin-assets-v3/review/cold-start-icons-v2-2026-11-06/apply_and_pack.mjs <工作树根> 0.7.1

# 3. 正常出包
node scripts/build-client.mjs && node scripts/build-mac.mjs && node scripts/package-mac.mjs
```

`build-client` 会把输入同步到 `packages/dsh-companion/skins/` 并重新生成 `client.js`，白名单与回复风格已在改动里，无需再手工补。

## 风险：`prepare-accepted-inputs.py` 会冲掉这套素材

`.local/accepted-inputs/` 由 `scripts/prepare-accepted-inputs.py` 按固定哈希从 dev.27 验收包**整体重建**。任何人为了复现旧基线跑一次，皮肤就会退回 0.4.0：0.7.0 的图标、0.5.1 的配音全部丢失。

建议主控二选一：

1. **把素材落进仓库**：`designs/dsh-skin-assets-v3/` 已在工作树里（untracked），加一次提交即可，同时在 `skin-production-handbook.md` 记一句「输入被重建后重跑 apply 脚本」；
2. **给 `prepare-accepted-inputs.py` 加保护**：目标目录已存在且版本高于验收输入时拒绝覆盖，或改成增量。

在此之前，重建输入的脚本请先确认 `.local/accepted-inputs/skins/archive-workspace-r2-private/skin.json` 的 `version` 仍是 0.7.0。

## 发送/停止按钮的不明显问题（0.7.1）

用户反馈输入框右下角的发送图标看不清。原因是该按钮的底色**随状态变化**：

| 状态 | 按钮底色 | 表现为 |
| --- | --- | --- |
| 输入框为空（禁用） | 浅蓝灰 `#A7C1CA` | 整颗按钮被压到约 40% 不透明，细描边纸飞机在压暗后只剩淡影 |
| 有文字（可用） | 深蓝填充（`--dsw-alias-state-business-primary` 一档） | 深墨图标在深色底上几乎看不见 |

同一张 PNG 没法同时适配两种底色：深墨只适合浅底，浅色只适合深底。琥珀是唯一在两种底色上都站得住的色相，所以 `send` 与 `stop` 这两枚**整枚用琥珀实心**——这是本套"每枚图标只有一个琥珀元素"规则里的唯一例外，理由是它们所在的按钮会换底色。

`send-button-fix.png` 是同一枚图标在浅底/深底、100%/40% 四种组合下的对照：0.7.0 的描边版在深底完全消失，0.7.1 的实心琥珀在四种组合下都读得出来。

## 仍未覆盖的图标位

引擎侧没有替换位，有素材也换不上：

- `bookmark`、`history`、`mute`、`quote`、`volume` —— 开发侧已确认书签/音量/静音当前无对应界面位置
- `companion` —— 走插件入口注入，不走替换表

另有 6 个键在替换表里是部分覆盖（见上文），属于同一批待补的选择器工作，不阻塞使用。

## 验收状态

| 项 | 结论 |
| --- | --- |
| 视觉 | 用户确认「现在的效果可以了」（0.7.0 实机侧栏截图见上） |
| 素材校验 | ZIP 内 128 项资源逐一哈希比对通过；`dshVersions` 在 `0.2.1-rc.5` 与 `0.2.2-rc.1` 均为 true |
| 实机 | 用户已在皮肤库导入 0.7.0 并启用，内容键 `3a8c9a9b…`，`theme` 状态 ready |
| Windows | 未验；本线只做素材，不影响跨平台构建 |
| 提交 | **未提交**，按用户决定交主控处理 |
