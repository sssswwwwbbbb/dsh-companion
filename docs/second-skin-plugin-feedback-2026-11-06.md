# 第二套皮肤「决斗者 · 天空龙」前置反馈与需求单

**致**：皮肤插件（主题盒子 / 陪伴）开发者
**提交方**：第二套皮肤制作（无桌宠版）
**日期**：2026-11-06
**核对基线**：macOS arm64 · DSH `0.2.2-rc.1` · `dsh-plugin-companion 0.1.0-dev.27` · 已授权（`companion` / `startup` / `configuration` / `private-updates`）
**用途**：在做 B 阶段「可运行小样」之前，把插件侧需要**确认或修改**的事项一次说清，便于逐条答复。文档里每条都带现象、证据、期望和可接受的简化做法，没写清楚的地方请直接标「不适用 / 不排期」，我这边按答复调整范围。

---

## 0. 核对方法（便于复现）

1. 解包 `dist/dsh-plugin-companion-0.1.0-dev.27.tgz`，阅读 `skin-core/src/schema.mjs`、`host-compatibility.mjs`、`src/coordinator.mjs`、`skin-core/adapters/startup.mjs`、`client.js`，以及原生运行时 `runtime-bundles/DSHCompanion-darwin-arm64.zip` 内的 `app/startup.mjs`。
2. 用 dev.27 自带的 `loadSkin` / `prepareResources` 对一份**用新素材组出的最小清单**做真实校验（结果见附录 B）。
3. 与 `docs/second-skin-developer-brief.md`、`docs/second-skin-materials-without-pet.md` 逐条对照。
4. 素材包：`素材/DSH-神之召唤-天空龙皮肤包-v1.0.zip`（372 个文件 / 92 MB）。

---

## 1. 摘要

| 编号 | 事项 | 影响 | 优先级 |
| --- | --- | --- | --- |
| A1 | 工作树 `main` 是 dev.11，与已验收 dev.27 不一致 | 按 main 开发会把合法素材判为非法 | P0 |
| A2 | `dshVersions` 是硬门槛，内置两套有白名单例外 | 本地导入皮肤可能「看似能跑、实际被拒」 | P0 |
| A3 | 入口标识两套机制（`entryMarks` / `semanticIcons.companion`）优先级未定 | 设置项声明了却不生效 | P0 |
| A4 | `workspacePreset` 只有两个写死版式 | 第二套皮肤无法自带版式 | P0 |
| A5 | 图标替换位 50 个，素材清单 56 枚 | 5 枚素材无位置 | P1 |
| A6 | 71 个 token 没有公开清单 | 制作侧只能猜映射，弱文字易不可读 | P1 |
| B1 | `workspaceRole` 强制两段 WebM | 无桌宠版想做角色位被卡住 | P1 |
| B2–B5 | 6 态状态图 / 小操作 / 待机循环 / 音效 均无挂点 | 一批素材没有消费方 | P1 |
| C1 | 发布包内没有校验器与示例 | 制作侧无法离线自检 | P0 |
| C3 | 本机无 ffmpeg，WebM 产出无规范 | 角色位 / 待机循环做不了 | P1 |
| C4 | 原生适配仅 darwin-arm64 | Windows 上看不到开场 | P2 |
| C5 | 开场时长容差 0.1 s 未写进文档 | 易在验收时误判「片子坏了」 | P2 |

---

## 2. P0：卡住小样的事项

### A1 分支基线不一致

- **现象**：当前工作树 `main` 的 `skin-core` 是 **dev.11**（资源上限 **32**、`startup` 仅 WebM 且只有配置 v1、`theme` 只到配置 v2）；已验收的 **dev.27** 在分支 `codex/dsh-accepted-baseline`。
- **证据**：`main` 的 `packages/dsh-skin-core/src/schema.mjs` 与 dev.27 tgz 内同名文件比对有差异，关键差异是 `Object.keys(input.assets).length>128`、`startupMp4` 分支、`configVersions:[1,2,3]`；baseline 分支的 `schema.mjs` 与 dev.27 逐字一致，`packages/dsh-companion/package.json` 版本亦为 `0.1.0-dev.27`。
- **影响**：只要照 `main` 的校验器开发，这份素材包会被直接判非法（项数超限、MP4 不合法），排查成本很高。
- **请求**：确认以 dev.27 为准；把 baseline 合回 `main`（或明确指定开发分支），并在两版都保留时标注差异。

### A2 `dshVersions` 是硬门槛，内置皮肤有白名单

- **现象**：应用皮肤前会先做宿主版本判断，不通过直接失败；但**包内自带的两套皮肤**即使只声明 `0.2.1-rc.5`，在 `0.2.2-rc.1` 上也能跑。
- **证据**：`src/coordinator.mjs:38` 调用 `supportsSkinHost`；`skin-core/src/host-compatibility.mjs` 里 `builtInSkins` 写死了两个 `contentKey`（本地实测为 `3f86c237…`、`4b643de1…`，对应内置的 commander / archive-r2 两套）。
- **影响**：本地导入的皮肤若只声明 `0.2.1-rc.5`，在这台 `0.2.2-rc.1` 上应用会直接 `SKIN_HOST_UNSUPPORTED`；而内置皮肤不受影响 —— 很容易误判成「功能正常」。
- **请求**：
  1. 在交付说明里写明「`dshVersions` 必须包含实际宿主版本，否则无法应用」；
  2. 说明白名单是否长期保留、本地导入的皮肤是否永不豁免。
- **我方做法**：本套只声明 `["0.2.2-rc.1"]`（仅此一台实测），不声明未验证版本。

### A3 入口标识两套机制冲突

- **现象**：侧栏入口标识有两条来源，同时存在时只有一条生效，另一条对应的设置项会变成「点了没反应」。
- **证据**：
  - `schema.mjs:130-133`：声明 `entryMarks` 必须同时声明 `entryMarkEnabled`；只声明 `entryMarkEnabled` 而缺 `entryMarks` 会报 `SKIN_RESOURCE_MISSING`；
  - `client.js` 的 `present()`：`setEntryMark(selected.workspace?.icons?.companion || selected.entryMarks || null)` —— **`companion` 图标优先于 `entryMarks`**。
- **影响**：若同套皮肤既给 `semanticIcons.companion` 又给 `entryMarks`，入口标识实际用 `companion`，`entryMarkEnabled` 设置项失效，与路线图 P1「已声明但当前不可用的能力显示原因」冲突。
- **请求**：明确二者优先级并在设置页隐藏无效项，或规定互斥（给了 `companion` 就禁止 `entryMarks`，反之亦然），并写进交付说明。
- **我方选择（请确认）**：只用 `entryMarks`（96×96 六角徽记，小尺寸更清楚），`semanticIcons` 不提供 `companion`，这样入口标识走 `entryMarks`、`entryMarkEnabled` 真实可用。

### A4 版式只有两个写死值

- **现象**：`workspacePreset` 只接受 `archive-warm-r2` 与 `commander-v1`；并且只要声明了任何一个 workspace 字段（`semanticIcons` / `workspaceDetailsEnabled` / `workspaceMotionEnabled` / `workspaceRole`），就必须同时给 `workspacePreset` + `semanticIcons` + `workspaceDetailsEnabled`。
- **证据**：`schema.mjs:120-123`。
- **影响**：第二套皮肤**无法自带版式**，只能用「衬线纸质」或「无衬线」。也就是说成套语义图标必须挂在别人的版式上。
- **请求**：
  1. 确认 `commander-v1` 是否作为「通用版式」允许其他皮肤复用（我方读代码判断它是全 `--dsw-*` token 驱动、与首套配色解耦，倾向复用）；
  2. 若不允许复用，请给第三套版式的排期，或把版式做成皮肤可声明的参数；
  3. 把复用规则写进交付说明。

### A5 图标替换位 50 个，素材清单 56 枚

- **现象**：工作区语义图标只替换固定的一批位置。
- **证据**：`client.js` 中 `WORKSPACE_R2_LEAVES` 共 **50** 个键；`companion` 不在其中（它走入口标识）；`history`、`bookmark`、`quote`、`volume`、`mute` 没有对应键。
- **影响**：素材清单按 56 枚交付，其中 5 枚没有位置；本套先按「未接入」处理，但需要插件侧给结论。
- **请求**：确认这 5 个功能位在 `0.2.2-rc.1` 界面里是否存在（例如侧栏历史入口、消息引用、音轨开关）。存在请补选择器；不存在请在素材清单里标「不适用」，避免后续重复制作。

### A6 缺少公开 token 清单

- **现象**：引擎只认 `theme-tokens.json` 里 **71** 个 `--dsw-*` 名，每个必须给 light / dark 两个 hex；但交付说明没有列这 71 个名字的含义。
- **影响**：素材侧的色值表用的是自造名（`--bg-base`、`--accent` 等），制作侧只能凭经验映射，最容易出错的是弱文字、边框、选中态和代码块，属于「长时间可读性」的关键项。
- **请求**：给一份 token 语义清单（用途 + 明暗示例 + 建议用色关系），或至少给「最少必须覆盖的一组」（例如侧栏、正文、代码、输入、选中、状态色约 30 个）。
- **可接受简化**：直接导出当前应用皮肤的 `tokens` 作为参照样例。

---

## 3. P1：能力缺口（本轮可先记为「未接入」，但需要排期答复）

### B1 `workspaceRole` 强制两段 WebM

- **现象**：角色位要求 `poster` / `portrait` / `avatar` 三张 PNG **加上** `idle` / `react` 两段 `video/webm`，共 5 个键（带 `name` / `model` 时 7 个）。
- **证据**：`schema.mjs:26-31`、`schema.mjs:124-126`。
- **影响**：无桌宠版本来就不带桌宠动作，素材包里也没有 WebM；想做「工作区角色位」会被硬性卡住。**只有头像没有用武之地**（头像必须挂在 `workspaceRole` 上）。
- **期望**：允许 `idle` / `react` 用静态 PNG（或单帧 WebM）；或在没有 `pet` 模块时只要求 `avatar` \+ `portrait`。
- **可接受简化**：本轮不做角色位，只做色彩 + 图标 + 开场。请确认这个取舍不影响后续补做。

### B2 工作反馈 6 态没有图标位

- **现状**：工作反馈只有一段 12px 文案加三点动效（`adapters/session-feedback.mjs`），`theme.workFeedbackEnabled` 是唯一开关；没有放状态图的位置。
- **素材已就位**：`state-start / running / need-action / done / stop / failed` 各浅深两版（96×96 RGBA），附短文案表、触发点、结束状态、静态替代。
- **请求**：开放「状态图」声明（light / dark PNG），映射到已有的 `running` / `attention` / `completed` 事件（引擎里事件已经有了，只差展示位）；给出触发点和静音 / 减少动态时的表现。
- **验收方式**：给一个真实会话，逐个触发状态，截图对照素材。

### B3 小操作微反馈没有挂点

- **现状**：新会话、发送消息、复制成功这三个点击级反馈，引擎侧没有钩子。
- **素材已就位**：3 枚 96×96 PNG + 时长与帧数说明（320 / 260 / 400 ms）。
- **请求**：提供点击级钩子，或明确本轮不做。

### B4 工作区待机循环没有挂点

- **现状**：工作区只能放一张静态背景（`theme.background`，`backgroundOpacity` 0–0.15），没有「装饰层 + 低频循环动效」的位置。
- **素材已就位**：`idle-loop-still-512x512.png` + 2.4 s 循环参数表（循环点、终态、静态替代、静音表现）。
- **请求**：装饰层支持「静态图 + 可选动效参数（时长 / 循环点 / 终态）」，或明确本轮只用静帧。

### B5 界面提示音没有通道

- **现状**：除开场成片音轨（`soundEnabled`）外，引擎没有事件音效播放通道。
- **素材已就位**：8 条 48 kHz / 24-bit WAV（成功、需处理、上电、转场等）+ BGM 与分轨。
- **请求**：给事件音效挂点（至少成功 / 需处理），或明确「本套只做开场声音」。

### B6 多套共存与切换（需确认，不是缺口）

- **请求**：确认 A → B → A 互切后各套设置独立保存、停用后旧样式 / 媒体 / 覆盖层完整退出。我方会在最终验收跑这条，先确认这是当前设计的承诺。

---

## 4. 工具与发布包

### C1 发布包内没有校验器和示例

- **现象**：dev.27 的 tgz 里 `skin-core/` **没有** `examples/` 和 `scripts/`（仓库里有 `scripts/check.mjs`、`examples/*`）。
- **影响**：制作侧拿不到离线自检手段，只能整包装进 DSH 才知对错；一旦清单写错，排查要反复装包。
- **请求**：随包附一个校验 CLI（或 npm script），并给一份**最小 v3 示例（无桌宠）**。目前 tgz 里唯一可参考的 v3 是内置的 `skins/archive-workspace-r2-private`，但它用了 **128 项资源正好顶满**、还带 `workspaceRole`，不适合当最小样例。

### C3 没有 WebM 转码规范

- **现象**：本机没有 `ffmpeg` 命令行，`imageio-ffmpeg` 也未安装。
- **影响**：角色位（B1）、待机循环（B4）如果要做，都需要 WebM。
- **请求**：给编码参数（建议 VP9/VP8 带 alpha、帧率、码率、循环点对齐）与验收阈值（时长容差、体积上限、透明边缘检查方法）。若短期内不给，我方按「不做 WebM」推进。

### C4 Windows 的降级表现

- **现象**：`NativeStartupAdapter.available()` 与 `NativePetAdapter.available()` 只在 `darwin && arm64` 返回真。
- **影响**：同一套皮肤在 Windows 上主题与图标可用，开场和角色位不可用。
- **请求**：确认 Windows 上「模块不可用」是否会在设置页显示原因；以及 Windows 开场的路线图（W3 已过的是插件兼容，不是这套皮肤的模块可用性）。

### C5 开场时长容差写进文档

- **现象**：原生播放器在起播前比对 `|video.duration − config.seconds| > 0.1` 就回落到静帧（`app/startup.mjs:45`）。
- **影响**：制作侧如果按「10 秒」四舍五入填，是否通过取决于真实时长，容易在验收时被当成「片子坏了」。
- **请求**：在交付说明里写明这条容差和取值口径（用实测容器时长，不做四舍五入）。我方按 **10.08** 填（含音轨版实测 10.080 s，静音版 10.042 s）。

---

## 5. 已核验正常（不必重复排查）

| 项 | 实测结果 |
| --- | --- |
| 资源限额 | 128 项 / 单图 8 MiB / 视频 16 MiB / 合计 128 MiB；ZIP 本体 129 MiB、最多 256 条目、单条目 16 MiB |
| MP4 校验 | 走 `ftyp` 头；MP4 只在 `startup` 配置 v3 的视频位合法（配置 v1 实测报 `SKIN_ASSET_INVALID`） |
| 背景 | WebP 可用；`backgroundOpacity` 0–0.15 生效；建议用 213 KB 的 WebP 而不是 2 MB 的 PNG |
| 声音 | `soundEnabled=true` 才取消静音；MP4 含 AAC 音轨可出声 |
| 减少动态 | `reducedMotion` 生效，直接用 `poster` 静帧 |
| 导入链路 | `skinInstall` → 校验 manifest、资源头、sha256、字节数，通过后入库可应用 |
| 候选清单 | 107 项资源 / 4.97 MiB / `contentKey` 前缀 `6d7f7b47`，`loadSkin` + `prepareResources` 通过 |
| 开场片 | 1280×720 H.264 + AAC，2.89 MiB，10.080 s（含音轨）/ 10.042 s（静音版） |

---

## 6. 素材侧待修（不属插件，单独分派）

1. `moon` 图标画成了 C 形；`settings` 齿轮与 `sun` 在 16 px 下接近，与「设置 / 主题一眼分开」的验收条冲突。
2. `key-art/light-key-art.png`、`dark-key-art.png` 是「假 App」模拟图（窗口写着 DSP，侧栏是卡组 / 手牌 / 回合），不能当工作区一屏稿；色板可用，一屏稿要在真实 DSH 上重做。
3. `exports/icons/overview-56-light/dark.png` 是**旧卡牌版**拼版，与 `icons-index.csv` 的新线性图标不是同一套，交付时容易误认。
4. 全包没有 WebM；授权记录写明「粉丝二创、仅限本人本地使用、禁止分发」——本套只能按私有自用处理，不进公开皮肤库、不上架。

---

## 7. 需要逐条答复的问题

| 编号 | 问题 | 我方暂定假设 |
| --- | --- | --- |
| Q1 | 开发分支以哪条为准？baseline 会不会合回 `main`？ | 以 dev.27（baseline）为准 |
| Q2 | 本地导入皮肤是否必须自带宿主版本？内置白名单是否长期保留？ | 必须自带 `0.2.2-rc.1` |
| Q3 | 入口标识：给 `companion` 时 `entryMarks` 是否失效？二者可否互斥校验？ | 只用 `entryMarks`，不给 `companion` |
| Q4 | `commander-v1` 是否允许其他皮肤复用？不给第三套的话何时有？ | 复用 `commander-v1` |
| Q5 | `history` / `bookmark` / `quote` / `volume` / `mute` 五个位置是否存在？ | 视为「不适用」 |
| Q6 | 能否提供 token 清单或「最少必须覆盖的一组」？ | 按 71 个名的语义自行映射 |
| Q7 | `workspaceRole` 能否放宽为静态 PNG？本轮不做是否可接受？ | 本轮不做角色位 |
| Q8 | 状态图 / 小操作 / 待机循环 / 音效 四项：排期还是明确不做？ | 记为「未接入」，单列需求 |
| Q9 | Windows 上开场与角色位的降级表现与路线图？ | 只交付 Mac 实测结果 |
| Q10 | 能否随包附校验 CLI 与最小 v3 无桌宠示例？ | 用 dev.27 的 `loadSkin` 自建脚本自检 |

---

## 8. 开发侧答复与状态（2026-11-06 更新）

**基线更新**：dev.35 源码在工作树 `~/.codex/worktrees/dsh-accepted-baseline/`，含 Mac 与 Windows 安装包；验收分支停在 dev.27，`main` 待同步。制作方可直接按 Mac dev.35 自测。dev.35 与 dev.27 的契约差异只有新增顶层 `replyStyle`（`address` ≤ 32 / `tone` ≤ 280），其余资源与模块规则相同。

| 编号 | 答复要点 | 状态 | 我方动作 |
| --- | --- | --- | --- |
| A1 | dev.35 整理成可复现提交后同步 `main`；先用 Mac dev.35 自测 | 已解决（待 `main` 同步） | 自测基线改为 dev.35 |
| A2 | 填 `["0.2.2-rc.1"]`；例外只对应两套内置皮肤的固定内容摘要 | 已确认 | 只声明 `0.2.2-rc.1` |
| A3 | 引擎缺陷；改为「声明 `entryMarks` 时由 `entryMarkEnabled` 控制，关闭回插件默认图标」；旧皮肤只给 `companion` 继续支持 | 已排期修复 | 本轮只用 `entryMarks`，省略 `companion` |
| A4 | 小样复用 `commander-v1`，用自己的颜色与图标，省略 `workspaceRole` 与 `pet` | 已确认 | 按此出小样 |
| A5 | 五枚移入「待接入」；`history` / `quote` 需再确认具体替换位，`bookmark` / `volume` / `mute` 暂无位 | 已确认 | 本轮 51 对图标；5 枚留档 |
| A6 | 将补颜色变量语义（实测 **71** 个）、实际图标位（**50** 个）、开场时长容差 | 待交付 | 先按正文 / 弱文字 / 输入框 / 代码块 / 侧栏 / 选中态配色 |
| B1 | 静态角色位、语义图标与版式解耦列为后续引擎能力 | 已确认（延后） | 本轮不做角色位 |
| B2–B5 | 排在增强项；B2 先复用「执行中 / 待处理 / 已完成」三态，再核对开始、停止、失败的触发语义 | 已确认（延后） | 本轮用静态背景与开场自带音轨 |
| B6 | 参数按皮肤 ID 保存；模块启停与开场自动播放属全局偏好；最终验收做「冷启动 → 天空龙 → 冷启动」 | 已确认 | 纳入最终验收 |
| C1 | 将交独立制作工具与最小无桌宠 v3 示例 | 待交付 | 先用 dev.35 的 `loadSkin` 自检 |
| C3–C5 | 小样用现有 H.264/AAC MP4 与静帧；`seconds` 按容器时长，**10.08 合适**；Windows x64 dev.35 已有开场适配 | 已确认 | 按 10.08 填；Windows 另做实机验证 |

### 仍需确认：素材格式边界

本轮不构成阻塞，但需要开发者给一句格式契约，避免增强项落地时二次生产。

1. **事件提示音（B5）**：落地时要求的容器 / 编码、采样率、声道、单条时长上限、响度目标。我方现有源轨统一为 **48 kHz / 24-bit 立体声 WAV、−16 LUFS**。
2. **静态角色位或待机装饰循环（B1 / B4）**：要 PNG 静帧还是视频？若要求 **WebM（VP9 alpha）**，需给转码参数或工具 —— 本机无 `ffmpeg`，我方目前产不出 WebM。
3. **开场静音版**：是否需要单独交一个无音轨 MP4？我方理解 `soundEnabled=false` 已覆盖静音，不需要额外文件，请确认。

> **不在制作方范围**：Windows 实机验证（预览、跳过、原图标冷启动）由项目方安排，制作方只交 Mac 实测结果。

### 本套将声明 `replyStyle`

dev.35 更新记录写明「皮肤可声明可选的回复风格默认值」，属于对外能力，不是内部试验字段。本套按素材包 `copy/character-style.md` 填报，已用 dev.35 校验器验证通过：

```json
"replyStyle": {
  "address": "决斗者",
  "tone": "语气沉稳克制，结论先行，句子短，不喊口号、不用轻佻语气。可用「回合」「手牌」「召唤」「条件」作比喻，但每三轮最多一次，并保证非玩家也能看懂上下文。报错时归因于条件不满足，不指责用户；用户要求展开时分层详述，否则先给最直接的一步。"
}
```

两点影响：

1. **版本门槛**：`replyStyle` 是 dev.35 新增字段，dev.27 的校验器会直接报 `SKIN_FIELDS_INVALID`（已实测）。所以含该字段的包必须在 **dev.35 及以上** 的插件上导入，Mac 自测基线随之改为 dev.35。
2. **不是强制改写**：风格默认值只是皮肤默认，需用户在会话标题旁主动开启，且可按皮肤保存、随时关闭。

### 实机走查追加（2026-11-06，dev.38 已复）

> dev.38 已合入两项修复：图标替换改用 SVG 精灵图匹配（官方隔离环境用天空龙 0.1.1 验了 12 个图标的浅深素材），`skin.json` 新增顶层 `cover`（PNG/WebP，≤ 2 MiB，建议 960×600）。制作侧已出 0.1.3 接入，待本机复验。



应用 0.1.1 后新增两项，均非素材缺失：

1. **语义图标替换覆盖不足**。50 个替换位全部声明，实机只命中输入区发送/停止与工作区树文件夹行；侧栏导航与工作区头部未命中。证据、排除项与建议见[图标命中报告](second-skin-icon-coverage-2026-11-06.md)。
2. **皮肤卡片没有封面**。皮肤库卡片的封面/立绘在 `skin-settings-ui.mjs` 里按内置两套皮肤的 `contentKey` 写死，导入包一律回落到通用占位图标与名称；清单 schema 也没有封面字段。制作侧已备好 960×600（8:5，与卡片同比例）的封面文件，等接口。

   建议的最小接口：`skin.json` 增加可选顶层 `cover`（资源 ID，PNG/WebP，按 8:5 铺满，缺省回退现有占位）；如要连续两张，再加可选 `portrait`。验收只需一条用例：导入包与内置皮肤并排，卡片封面、标题与版本都对得上。

### 令牌白名单覆盖不足（面板页仍是黑白）

实机走查发现：侧栏与对话区能跟着皮肤走，但「插件」「设置」这类整页面板仍是 DSH 默认外观——白色卡片、黑色主按钮。

原因不是皮肤没生效，而是这些页面用的令牌**不在可覆盖的 71 个里**：

| 实测 | 数值 |
| --- | --- |
| DSH 各包实际引用的 `--dsw-*` 变量 | **426 个** |
| 皮肤允许覆盖（`theme-tokens.json`） | **71 个** |
| 白名单外 | **356 个** |

面板页高频、且当前白名单缺失的：

- `--dsw-alias-settings-card-fill` / `-settings-card-stroke`（插件页、设置页的卡片）
- `--dsw-alias-button-primary-fill` / `-button-primary-hover`（「添加插件」这类主按钮，现在是黑色）
- `--dsw-alias-interactive-bg-hover` / `-interactive-bg-active`（列表悬停与按下）
- `--dsw-alias-bg-layer-4`
- `--dsw-alias-label-quaternary`、`--dsw-alias-link`
- `--dsw-alias-markdown-code-block` / `-inline-code` / `-code-segment-*`
- `--dsw-alias-code-diff-*`、`--dsw-alias-file-diff-*`

**请求**：把这些面板级令牌并进皮肤可覆盖白名单（或让白名单与主题变量表同步生成）。否则任何皮肤都只能改一半界面，作者也解释不了"为什么插件页突然是白的"。

**验收**：同一套皮肤下打开「插件」与「设置」，卡片底色、主按钮、悬停态与工作区一致。

## 附录 A 核对证据路径

| 结论 | 路径 |
| --- | --- |
| 资源上限 128、MP4 仅 startup v3 | `dist/dsh-plugin-companion-0.1.0-dev.27.tgz` → `package/skin-core/src/schema.mjs:82, 88-90, 141-145` |
| workspace 版式与角色位强制项 | 同上 `schema.mjs:26-32, 120-126` |
| 入口标识双向强制 | 同上 `schema.mjs:130-133`；`client.js`（`present()`） |
| 图标替换位 50 个 | 同上 `client.js`（`WORKSPACE_R2_LEAVES`） |
| 宿主版本门槛与内置白名单 | 同上 `skin-core/src/host-compatibility.mjs`、`src/coordinator.mjs:38` |
| 开场时长容差 0.1 s | 同上 `runtime-bundles/DSHCompanion-darwin-arm64.zip` → `app/startup.mjs:42, 45` |
| 工作反馈只有文案 | 同上 `skin-core/adapters/session-feedback.mjs` |

## 附录 B 候选清单（用于确认「素材侧已就绪」）

| 模块 | 内容 | 数量 |
| --- | --- | --- |
| `theme` | 配色 token（候选 12 个，正式约 35–40）、聊天背景 WebP、入口标识浅深 2 张、50 个语义替换位 + `companion` 共 51 对图标 | 107 项合计 |
| `startup` | 开场静帧 PNG（1280×720）、开场片 MP4（10.080 s）、`handoffSeconds` 0.35、`stillSeconds` 1.2 | 同上 |
| 合计 | 4.97 MiB，`contentKey` 前缀 `6d7f7b47`，`loadSkin` / `prepareResources` 通过 | — |

> 说明：该清单只用于验证契约，不是交付物；正式版本会在插件侧答复后按最终范围重做。
