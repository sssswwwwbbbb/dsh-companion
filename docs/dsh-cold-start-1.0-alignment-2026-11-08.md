# 冷启动 · 主题盒子 1.0 能力对齐与素材需求（2026-11-08）

首套皮肤 `commander-workspace-private` 0.7.1 → … → **0.9.6（已上架云端皮肤库）** · 作者 Dr.S · 可分发

本轮按 `dist/dsh-skin-development-kit-1.0.0.zip` 把 1.0 的声明式能力接进这套皮肤。结论先说：0.7.1 **一直能通过 1.0 校验**，但「能通过」不等于「用上了」——1.0 新增的封面、入口徽记、共用角色、场景提示、场景配色、自主活动与互动记忆，这套皮肤此前一个都没声明，全是插件按**内容键**兜底的。

## 为什么值得改

1.0 的兼容兜底是按 `contentKey` 登记的（`host-compatibility.mjs` 的 `commanderSkins`、`config/reply-styles.json`、`pet-activities.mjs`）。这套皮肤的每次素材改动都会换内容键，等于每改一次就要再补一次兜底；**声明到 manifest 后与内容键解耦**，改素材不再牵动回复风格和角色设定。

另外工作区场景提示（`workspaceCues`）在插件里**没有**冷启动兜底，0.7.1 完全没有这个能力。

## 已接入（0.8.0）

| 1.0 能力 | 落点 | 内容 | 需要新素材？ |
| --- | --- | --- | --- |
| 回复风格 | 顶层 `replyStyle` | 称呼「指挥官」＋既有语气 | 否 |
| 共用角色 | 顶层 `character` | 单元-07 身份、工作区与桌宠补充、`petEnabledDefault: false` | 否 |
| 皮肤库封面 | 顶层 `cover` | 复用既有 `workspace-cover`（960×600 PNG，411 KB） | 否 |
| 入口徽记 | `theme.entryMarks` + `entryMarkEnabled` | 复用 `i-companion` 浅深一对 | 否 |
| 场景提示 | 顶层 `workspaceCues` | 回归 4 s 输入框上方淡入、切会话 2 s 右上方淡入、切工作区 3 s 右上角轻移 | 否 |
| 场景配色 | `scenePresets.workspace` | 琥珀值班 / 冷启动待命 / 警戒守卫三组明暗强调色 | 否 |
| 自主活动 | `pet.activityDescriptions` | `react`：侧头确认一下指挥官的状态 | 否 |
| 互动记忆 | `pet.interactionMemory` | 默认开启，偏好「先结论后依据、工作时不卖萌」 | 否 |

一份素材都没新增：1.0 的资源上限是 **128 项**，这套皮肤正好卡在上限（128），所以封面与徽记都复用了已有资源。

## 校验

`dsh-skin-development-kit-1.0.0.zip` 自带的官方校验器，四种组合全通过：

| 宿主 | 平台 | 结果 |
| --- | --- | --- |
| `0.2.2-rc.1` | darwin-arm64 | valid，theme/pet/startup 均 enabled |
| `0.2.2-rc.1` | win32-x64 | valid |
| `0.2.1-rc.5` | darwin-arm64 | valid |
| `0.2.1-rc.5` | win32-x64 | valid |

导入包：`commander-workspace-private-0.9.6.zip`，9 993 908 B，sha256 `b10e9bcf70f79eab5e333bb4fdc33ff72ff5ef2400b306bce2e33c971dc95903`，内容键 `d42505a3…`；内置版内容键 `2bad2595…`（下次主控出包会带）。

## 0.9.0：关闭桌宠与自产素材

用户要求这套皮肤先关闭桌宠，其余素材由我补。结果：

| 动作 | 内容 | 影响 |
| --- | --- | --- |
| 移除 `modules.pet` | 这套皮肤不再有桌宠；设置页隐藏桌宠与角色页，`petEchoEnabled` 一并移除 | 侧栏陪伴位的完成脉冲随「桌宠回应」失效（该动效本就挂在桌宠回路上） |
| 删除 8 项资源 | `master-idle` / `master-react` / `master-walk-left` / `book-prop` / `cup-prop` / `master-turn-front` / `archive-grid` / `archive-startup-poster` | 素材从 128 项降到 125 项，包体从 26.8 MB 降到 10.0 MB；`workspaceRole` 的立绘与待机/回应 WebM 保留 |
| 新画皮肤库封面 | `workspace-cover` 换成 1440×900 的 CS-07 面板构图（网格、切角框、单元-07 六边形核、警示斜纹） | 皮肤库卡片与设置页封面同步更新 |
| 新画入口徽记 | `mark-light` / `mark-dark` 各 96×96，`theme.entryMarks` 改指向它 | 不再借用工作区图标当入口标记 |
| 新画模型场景徽记 | `badge-swift` / `badge-deep` / `badge-final` 各 128×128 | 打开「模型场景」页：速攻 / 长思 / 决算 三组，用户绑定真实模型即可 |

生成器 `make_1_0_assets.py`，迁移脚本 `apply_no_pet_1_0_assets.mjs`，成品 PNG 在 `out/`。

角色设定随之调整为只保留工作区一侧（`petContext` 与 `petEnabledDefault` 移除）；其余 1.0 字段不变。

## 0.9.1 / 0.9.2：场景提示与徽记打磨

### 场景提示的文本与演出

三条提示改成分角色配色 + 各自的节奏，不再共用一套钢青：

| 提示 | 文案 | 呈现 | 配色重点 |
| --- | --- | --- | --- |
| `welcome` 回到 DSH | 单元-07 重新在线，等待指令。 | 5 s · 输入框上方 · 滑入 | 琥珀边框，像一次交接 |
| `session` 切会话 | 已切到这条任务线。 | 2 s · 输入框右上方 · 淡入 | 钢青，压低存在感（切会话很频繁） |
| `workspace` 切工作区 | 工作区切换完毕。 | 3 s · 右上角 · 滑入 | 全息青，右上角轻移表示上下文跳转 |

每条都给了明暗两套 `background` / `text` / `border`，不依赖宿主 toast 默认色。`session` 保持默认关闭，避免高频打扰；`welcome` 与 `workspace` 默认开启。

### 提示词文本

- `replyStyle.tone` 收到 75 字：结论先行、短句、不用感叹号与语气词、不确定直说、要求展开再分层。
- `character.identity` 收到 64 字：先判断情景再开口、任务当清单推进、不卖萌不假装情绪。
- `character.workContext` 明确「先确认目标与约束再动手，缺条件直接问」。

### 模型场景徽记

三枚徽记从 128 px 几何版升级为 **256 px 面板版**：深钢圆盘 + 刷边 + 刻度环 + 角色符号（速攻·琥珀闪电 / 长思·全息青六边核 / 决算·准星）。按底栏实际 20–24 px 反推验证过，浅底、深底、灰底三种背景都能辨认。

**不做真实厂商 logo。** 那是第三方商标，仿制既不像也不合规；「正式感」靠层次与工艺，不靠品牌符号。若要按具体模型出图，给方向（例如「按算力/推理/协作三种气质」）我可以再出变体。

## 0.9.6：作者与授权更正

原先每项资源的 `license` 写着「Private project use only」「no new distribution grant」，是早期参考其他皮肤作品时的私有口径。按作者本人确认更正：

| 项 | 内容 |
| --- | --- |
| 作者 | **Dr.S**（笔名） |
| 授权 | **可分发**：允许原样分发并上架皮肤库；须保留署名；不得单独转售或再授权包内素材 |

落点说明：manifest 没有顶层 author/license 字段，署名与授权只能写在每项资源的 `source` / `license` 上。全量 125 项统一改成 `Dr.S · 图标 · plugin · 浅` 与 `© 2026 Dr.S · 可分发，保留署名，禁单独转售素材`；完整条款进包内 `LICENSE.txt`，素材来源进 `CREDITS.md`。

**64 KB 上限坑**：第一次把完整条款写进每项资源，manifest 涨到 70 064 B 直接 `SKIN_MANIFEST_INVALID`。现在 49 359 B，留了余量。

## 0.9.5：描述修正与上架冻结

0.9.4 的描述还写着「桌宠」，而 0.9.0 已移除 pet 模块 —— 皮肤库卡片会显示错误宣传。0.9.5 改成「与指挥官协作的工作区、场景提示与 CS-07 声线开场」，其余内容不变。

同时按新版制作流程冻结交付物：同目录 `DELIVERY.md`、`SHA256SUMS.txt`。

### 上架（2026-11-08 完成）

服务端切到新皮肤库后发布成功：

| 项 | 值 |
| --- | --- |
| releaseId | `skin_499d42d0-d0a1-4cf6-ab2a-7d4c91174693` |
| id / version | `commander-workspace-private` / `0.9.6` |
| sha256 | `b10e9bcf…`（与本地一致） |
| contentKey | `d42505a3…`（一致） |
| size | 9 993 908 B（一致） |

发布命令：

```sh
DSH_CLOUD_SSH_KEY='<本机路径> \
  node deploy/cloud-admin.mjs publish-skin '<绝对路径>/commander-workspace-private-0.9.6.zip' '冷启动'
```

`stats` 已能查到该记录；下一步是客户端刷新皮肤库下载安装做实机验收。

## 0.9.4：恢复设计封面

0.9.0 我把 `workspace-cover` 换成了自己画的 1440×900 封面，皮肤库卡片跟着变了 —— 这不是需求，是「自产素材」那一轮的越界。0.9.4 恢复设计方原图（`assets/commander-cover.png`，960×600，`dfe2e17f…`），库表预览回到原样；我画的那版仍留在 `designs/.../cold-start-icons-v2-2026-11-06/out/skin-cover.png`，想用随时可换。

约定一条：**已有设计稿的素材我不替换**，要换先问。

## 0.9.3：悬浮提示白底白字

用户反馈输入框上方悬浮提示的文字看不清。根因在皮肤 token：`--dsw-alias-tooltip-bg` 被设成 `#ffffff`，而 DSH 的 tooltip 文字用的是**静态白** `--dsw-static-neutral-bluish-00`（#fff），白底白字。

| token | 改前（浅色） | 改后（浅色） | 深色 |
| --- | --- | --- | --- |
| `--dsw-alias-tooltip-bg` | `#ffffff` | `#1F2C38` | `#2E3E4C` |
| `--dsw-alias-tooltip-key-bg` | 未声明（走默认） | `#3A4C5E` | `#46586A` |

改后白字对比度：浅色 14.2:1、深色 11.0:1。顺手把全部 43 个 token 做了配对对比度检查，其余底色/文字组合都在 11:1 以上，没有第二处同类问题。

教训记一笔：DSH 的 tooltip 文字不跟 `label-*` 走，是固定的白色，所以 tooltip 底色**必须保持深色**，这条不能按"浅色主题就配浅底"的直觉来。

## 需要你制作的素材清单

按「影响哪个已声明能力」排序。前两项不交，对应能力就空着，但不影响其余部分。

| # | 素材 | 状态 | 说明 |
| --- | --- | --- | --- |
| 1 | 模型场景徽记或立绘 | **已自产（256 px 面板版）** | 三组直接用；真实厂商 logo 不做，若要按模型气质再出变体可提方向 |
| 2 | 专用入口徽记 | **已自产** | `mark-light` / `mark-dark`，96×96 |
| 3 | 专用皮肤库封面 | 已恢复原图 | 0.9.4 起用设计封面；我画的 1440×900 版本留档可选 |
| 4 | 桌宠道具动作（读书/喝茶） | 暂不需要 | 桌宠已关闭；日后恢复桌宠再交透明 PNG 序列 + 帧率 + 脚点 |
| 5 | 文案定稿 | 可随时改 | 场景提示、角色身份、回复语气均已落进 manifest，改字即可 |

仍需你拍板或出图的只剩两件：

- **模型场景要不要换成正式徽记/立绘**：现在是我画的几何版（速攻/长思/决算）。如果希望按真实模型品牌出图，给一张透明徽记（方图 128–256 px，≤2 MiB）或立绘（保留头像区），我替换并对齐尺寸。
- **文案语气**：现在是 CS-07 冷简风格，若想更「机械播报」或更「人味」，给我一句方向我改。

其中 1、2、3 我可以用现有的几何/面板语汇程序化生成一版垫用（风格与图标一致、可随时替换成正式美术），4 必须有真实动作素材，5 你点头或改文案即可。

## 未做的部分（引擎侧，不属素材）

- `scenePresets.model`：0.9.0 已声明三组并配自产徽记；如需按品牌出图见上文。
- 角色欢迎演出、空白新会话开场、整套工作区转场、多方向走跑与攀爬：1.0 明确列为后续接口，当前 manifest 无法声明。
- 图标替换位：`bookmark`、`history`、`mute`、`quote`、`volume` 在 1.0 图标清单里仍是「储备」，引擎未给替换位；`companion` 走插件入口注入不受替换表控制。

## 复现

```bash
# 1.0 字段（幂等：只接受 0.7.1 输入）
node designs/dsh-skin-assets-v3/review/cold-start-icons-v2-2026-11-06/apply_1_0_fields.mjs <工作树根>

# 重新出导入包
node designs/dsh-skin-assets-v3/review/cold-start-icons-v2-2026-11-06/apply_and_pack.mjs <工作树根> 0.8.0 --zip-only
```

图标线另见[图标语汇交接](dsh-cold-start-icon-vocabulary-2026-11-08.md)，配音线见[CS-07 配音回执](dsh-cold-start-cs07-voice-upgrade-2026-11-06.md)。
