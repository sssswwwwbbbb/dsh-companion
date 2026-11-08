# 主题盒子 1.0 · 皮肤配置与离线校验

本说明对应主题盒子 `1.0.0` 的配置和校验器。最近一次用户集中验收为 dev.47；1.0 新增的场景提示配置与连续陪伴按封版验收记录分别列出。日常安装使用对应平台的插件 `.tgz`；皮肤作者交可导入 ZIP。开发入口及素材清单见 [1.0 交接包](skin-kit-v1/README.md)。

## 先跑通可导入样例

- `no-pet-v3.zip` 可直接从「主题盒子 → 皮肤库 → 导入本地 ZIP」导入。导入后点「应用皮肤」。`sample/` 是同一份可编辑的样例。
- 样例使用四份原创几何资源。包含静态背景、两色入口徽记、一个工作区图标及两秒 H.264 MP4 开场。开场无音轨，方便只验证画面流程。
- `skin.json` 在 ZIP 根目录，使用 `formatVersion: 2`，模块为 `theme` v3 与 `startup` v3。无桌宠版省略 `pet` 和 `workspaceRole`。
- 当前小样可复用 `commander-v1`。同时声明 `semanticIcons` 与默认开启的 `workspaceDetailsEnabled`。当前适配器提供固定版式和图标替换点。颜色、图片和图标用本套资源。
- 入口徽记用 `theme.config.entryMarks`，浅深各一份 PNG，同时声明 `theme.settings.entryMarkEnabled`。推荐使用专用入口徽记；两项同时存在时优先采用 entryMarks，关闭后显示插件默认图标。

## 离线校验

解压制作工具包后，用 Node.js 22.19 或更新版本运行。校验器、插件的同版合同及 ZIP 依赖已随工具提供。

```sh
node scripts/skin-author-check.mjs no-pet-v3.zip --dsh-version 0.2.2-rc.1 --platform darwin-arm64
node scripts/skin-author-check.mjs sample --dsh-version 0.2.2-rc.1 --platform win32-x64
```

把首个参数换成自己的 ZIP 或解包目录。校验覆盖清单字段、资源路径、字节数、SHA-256、文件头、宿主版本及必需模块。ZIP 输入走插件实际导入逻辑。通过时输出内容摘要及各模块状态。实机仍需验颜色、开场解码、播放时长、跳过与冷启动。

`dshVersions` 列出实际验证过的 DSH 版本。小样先用 `["0.2.2-rc.1"]`。冷启动历史内置皮肤的固定内容摘要有兼容特例。普通作者包按自己声明的版本验收。主机缺少必需模块时整套应用失败。可选模块不可用时显示原因，其他模块可继续。第二套可将开场标为可选能力，并在正式交付时验开场实际就绪。

## 配色变量

每项填 `{ "light": "#RRGGBB", "dark": "#RRGGBB" }`，支持八位带 alpha 的十六进制颜色。允许的 **71 个键**随包附在 `theme-tokens.json`。色板里的自定义名需映射成这些真实键。下面是制作优先级，示例配色在 `sample/skin.json`，其余位置沿用 DSH 对应模式的默认颜色。

| 画面 | 优先对应的键 | 用色检查 |
| --- | --- | --- |
| 会话底色与面板 | `--dsw-alias-bg-base`、`--dsw-alias-bg-layer-1` 至 `-3` | 每一层在浅色和深色中都能辨别 |
| 正文、弱文字和辅助标签 | `--dsw-alias-label-primary`、`--dsw-alias-label-secondary`、`--dsw-alias-label-tertiary`、`--dsw-alias-label-caption` | 弱文字、时间和说明仍可读。优先验代码、长会话和表格 |
| 输入区和消息 | `--dsw-specific-input-major`、`--dsw-specific-bubble`、`--dsw-specific-bubble-highlight` | 发送、引用、禁用和聚焦都能分辨 |
| 侧栏与选中 | `--dsw-specific-sidebar-fill`、`--dsw-specific-sidebar-nav-item-active`、`--dsw-specific-sidebar-nav-item-active-accent`、`--dsw-specific-sidebar-nav-item-hover` | 工作区树、当前会话和悬停状态分开验 |
| 分割线与焦点 | `--dsw-alias-border-l1` 至 `-4`、`--dsw-alias-state-business-primary`、`--dsw-alias-state-business-tertiary` | 输入聚焦、选中项和菜单边界要清楚 |
| 代码、文件和选中文本 | `--dsw-alias-bg-layer-2`、`--dsw-alias-bg-document-preview`、`--dsw-alias-label-document-preview`、`--dsw-alias-bg-document-selection` | 代码块、文件预览和复制按钮在实际界面分别验 |
| 工具与提示 | `--dsw-specific-menu`、`--dsw-specific-selector`、`--dsw-alias-tooltip-bg`、`--dsw-alias-toast-bg`、`--dsw-alias-toast-label` | 菜单、下拉、提示和遮罩在窄窗口保持可读 |
| 成功、待处理、失败 | `--dsw-alias-state-success-primary`、`--dsw-alias-state-warn-primary`、`--dsw-alias-state-error-primary` | 颜色和文字一起表达状态 |

## 皮肤库封面

主题盒子 dev.38 起支持可选的顶层 `"cover": "library-cover"`。`library-cover` 是 `assets` 中声明的资源 ID。照其他图片填写路径、MIME、字节数和 SHA-256。封面支持 PNG 和 WebP，单张最多 2 MiB，建议交 960×600。卡片按 8∶5 居中铺满，皮肤名称和版本显示在封面下方。省略 `cover` 时使用现有占位。若仍需交给 dev.37 或更早的版本导入，另交一份省略该字段的清单。

## 图标替换位

以下 **50 个键**来自当前工作区替换表。它们是作者可声明的替换名，具体落点以目标 DSH 上的实机界面为准。PNG 保留透明背景，浅深分别提供，验收时按 16–20 像素查看识别度。

| 类别 | 当前替换键 |
| --- | --- |
| 导航和目录 | `workspace` 工作区、`compose` 新会话、`conversation` 会话、`search` 搜索、`panel-left` 侧栏、`folder` 目录、`folder-open` 展开目录、`pin` 置顶、`archive` 归档、`more` 更多 |
| 对话与操作 | `attachment` 附件、`link` 链接、`copy` 复制、`retry` 重试、`edit` 编辑、`branch` 分支、`send` 发送、`stop` 停止、`chevron-down` 展开、`chevron-right` 进入、`plus` 添加 |
| 文件和外部工具 | `terminal` 终端、`external` 外部打开、`file-code` 代码、`file-table` 表格、`file-image` 图片、`file-text` 文本 |
| 状态与媒体控制 | `check` 完成、`clock` 等待、`alert` 待处理、`info` 说明、`play` 播放、`pause` 暂停、`close` 关闭 |
| 设置和权限 | `settings` 设置、`sliders` 偏好、`sun` 浅色、`moon` 深色、`palette` 外观、`download` 下载、`shield` 权限、`expand` 展开 |
| DSH 能力 | `plugin` 插件、`skill` 技能、`model` 模型、`agent` 助手、`question` 问答、`plan` 计划、`inbox` 收件箱、`git-diff` 差异 |

DSH 0.2.2-rc.1 的侧栏导航和工作区按钮请用主题盒子 dev.38 或后续版本验收。已有语义图标配置沿用。当前覆盖范围是工作区，设置、技能和终端等独立面板按各自页面核对。

插件入口徽记单独交。历史 `history`、书签 `bookmark`、引用 `quote`、音量 `volume`、静音 `mute` 当前没有专属替换键，移到「待接入」。已经交付的素材可留档。

## 开场与 Windows 验收

- 正式开场交一份 **1280×720 H.264/AAC MP4** 和同构图 PNG/WebP 静帧。`soundEnabled: false` 会在播放器中静音原片。只需同一份有声 MP4。
- `startup` v3 的 MP4 单文件上限 **16 MiB**。用实测容器时长填 `seconds`。实际解码时长与该值偏差超过 **0.1 秒**，会回退静帧。例如实测 10.080 秒时，配置可写 `10.08`。验收时以实际封入 ZIP 的文件为准。
- Windows x64 使用官方 DSH `0.2.2-rc.1` 与主题盒子 1.0.0，并按需补验 `0.2.1-rc.5`。制作 Agent 提供最终 ZIP 和素材核对结果。主线准备包、步骤和验收记录，计划沿用项目方已有的 Windows 测试机。实机分别检查预览自然结束、Esc 跳过、完全退出后从原 DSH 图标冷启动。补验开启和关闭开场声音，以及切回「冷启动」。
- 当前素材产能为 H.264/AAC MP4、PNG/WebP 和 48 kHz／24 bit 双声道 WAV。本轮小样只消费现有图片和开场 MP4。每套素材依自己的许可记录使用和分发。

## 工作区场景提示

`workspaceCues` 支持 `welcome`（回到 DSH）、`session`（同工作区切换已有会话）和 `workspace`（切到另一工作区中的会话）。每条独立声明文案、开关和呈现默认值。下面是配置节选：

```json
"workspaceCues": {
  "welcome": {
    "text": "欢迎回来。",
    "default": false,
    "seconds": 6,
    "position": "above-input",
    "effect": "slide",
    "colors": {
      "background": {"light": "#FFF4DF", "dark": "#281B14"},
      "text": {"light": "#332014", "dark": "#FFF1DB"},
      "border": {"light": "#AB6737", "dark": "#D9A16D"}
    }
  }
}
```

- `text` 与布尔值 `default` 必填，文字最多 72 字符。其余字段可省略；普通旧包补用 `4` 秒、输入框上方居中、淡入的默认表现。
- `seconds` 为 1–8 秒；`position` 可为 `above-input`（输入框上方居中）、`bottom-right`（输入框右上方）、`top-right`（窗口右上角）、`bottom-bar`（窗口底栏）。没有活动会话的输入框锚点时，输入框位置回退到窗口右上角。
- `effect` 可为 `none`、`fade`、`slide`，分别为直接显示、淡入和轻移入场。系统减少动态时禁用出场动画。
- `colors` 可选填 `background`、`text`、`border` 中的任意项，每项提供 `light` 与 `dark` 十六进制颜色。未提供时复用宿主 toast 颜色；容器统一有 1 px 描边、内边距和圆角。
- 设置页可逐条覆写位置、时长和效果，并直接预览。预览返回会话页面，采用当前配置，不改变开关；陪伴勿扰时暂停。恢复本条默认同时恢复作者开关和呈现默认值，其他场景保留。
- `welcome` 要求离开至少 15 秒后返回，间隔至少 60 秒。`session` 与 `workspace` 各自间隔至少 4 秒。只展开目录不会触发；初次进入会话保持安静。切换会话、皮肤、离开工作区或开启勿扰会清理过期提示。
- 这里的效果是提示容器的入场动效。角色视频演出、空白新会话开场和整套工作区转场仍在后续接口计划，尚不能在此声明任意媒体、JS 或 CSS。
- 冷启动的兼容预设分别采用回归居中 4 秒淡入、切会话输入框右上方 2 秒淡入、切工作区右上角 3 秒轻移；旧内容键与已有开关继续保留。

dev.47 起，皮肤可选填顶层 `character`，提供工作区与桌宠共用的身份设定。现有 `replyStyle` 继续提供称呼与语气。

```json
"character": {
  "name": "领航员",
  "identity": "你是与用户协作的领航员，耐心、认真地提供帮助。",
  "workContext": "在工作区准确完成当前任务，清楚说明依据。",
  "petContext": "在桌面简短陪伴，根据当前情景选择表达和动作。",
  "petEnabledDefault": false
}
```

- `name` 必填，1–32 字符。`identity` 必填，1–2000 字符。`workContext` 与 `petContext` 至少提供一项，每项最多 600 字符，允许空字符串。提供工作区补充需要主题模块，提供桌宠补充需要桌宠模块。
- `petEnabledDefault` 可选，默认 false，只在提供 `petContext` 时使用。它决定首次使用时桌宠是否采用共用角色。用户覆写按皮肤保存。已登记的冷启动历史包由插件提供默认关闭的兼容设定。
- 工作区始终由用户在对应会话标题旁开启「主题角色」。该开关提供身份与工作区场景补充。「回复风格」独立控制称呼、语气。角色设定只加入本插件持有的提示词段，宿主工作指令和工具规则优先。
- 桌宠开启「桌宠使用主题角色」后，专属互动、完成回应与自主活动共用身份、当前称呼与语气，并加入 `petContext`。桌宠独立人设继续保存，关闭共用后采用独立设定。两端保留各自历史。
- 「本套设置 → 角色」可修改角色名、身份及各端补充。角色名用于模型的自称。保存后下一次请求采用新值，旧的待执行桌宠模型结果会取消。停止、换肤或关闭会话角色后撤掉对应提示；已开始的工作请求沿用当时输入。
- 重置本套会恢复共用角色内容与桌宠开关。工作区会话启用选项独立保存。未声明该能力的普通皮肤隐藏角色页与会话按钮。可按需只提供工作区或桌宠角色。

冷启动桌宠也支持既有「允许说话」开关控制的文字气泡。配合「智能互动」和可用的互动模型，可在桌宠专属输入中直接对话。文字气泡复用 dsh-pet 的展示通道，声音配置仍由相应素材模块提供。上述字段请使用 dev.47 或更高版本的校验器与插件验证。

dev.46 起，桌宠模块可选填固定字段 `config.activityDescriptions`，例如 `"activityDescriptions": {"react": "侧头观察一下", "walk": "向左散步一小段"}`。描述可由每套角色自行设计，模型只会收到本套声明、用户允许且当前原生驱动可执行的动作。

动作必须有 `config.animations` 中同名的素材，时长与该素材一致，`loop` 为 `false`。首批支持已有动画槽的有限动作，`idle`、`sleep-in` 与 `sleep` 使用既有待机或睡眠流程。`activityDescriptions` 用于自主活动，`actionDescriptions` 用于桌宠专属对话。首次安装默认关闭自主活动，默认决定间隔为 3 分钟，各动作默认允许；用户可选 3、5、10 分钟并逐项关闭。关闭和重开保留偏好，「重置活动偏好」恢复默认并关闭自主活动。未提供此字段的普通皮肤隐藏该设置，已登记的冷启动历史包由插件提供兼容预设。

模型沿用本套的 `modelSelection` 与 `persona`，只接收角色设定、当前工作状态、上次自动动作和可用动作清单。用户开启「自动决定短动作」后，在工作空闲并开启工作反馈、允许动作时生效。工作忙碌、等待处理、陪伴勿扰、减少动态、手动输入或拖拽会让出。模型可返回 `{"speech":null,"action":null}` 保持安静。失败保持待机。向左走需要当前屏幕有足够空间，原生驱动会检查落点。

dev.45 起，可选填顶层 `scenePresets`。本套设置会为声明了场景的皮肤显示「场景」页。用户将预设绑定到 DSH 官方模型的 provider/model 组合或工作区 ID，选择按皮肤保存。未绑定、预设移除或清除选择时使用皮肤默认表现。

```json
"scenePresets": {
  "model": {
    "pilot": {
      "label": "领航员",
      "badge": "mark-light",
      "portrait": "role-portrait",
      "notice": "领航员已接入。"
    }
  },
  "workspace": {
    "amber": {
      "label": "琥珀值班",
      "accent": {"light": "#A45622", "dark": "#E2A56E"},
      "notice": "值班工作区已就绪。"
    }
  }
}
```

- `model` 与 `workspace` 均可省略，至少提供一组，每组最多 8 个预设。预设 ID 使用小写字母、数字及短横线，`label` 为 1–32 字符。
- 模型预设至少提供 `badge` 或 `portrait` 之一，值引用 `assets` 中经过校验的 PNG/WebP，每张最多 2 MiB。素材显示在工作区底栏。建议徽记使用透明背景方图，立绘保留头像区域方便小尺寸裁切。两者同时提供时优先展示徽记。
- 工作区预设必须提供 `accent.light` 和 `accent.dark`，均为 `#RRGGBB`。颜色用于工作区当前会话标记和底栏场景标识，请选择在主题对应底色上可辨认的颜色。
- `notice` 为可选的 1–72 字符短提示。模型提示只在同一会话确认切换到映射模型后显示。工作区问候跟随 `workspaceCues.workspace` 的用户开关，未声明该开关时由映射启用。所有提示受陪伴勿扰控制。初次打开会话保持安静。
- 场景只增加工作区外观与提示，桌宠沿用当前皮肤的角色与动作素材。升级与停止后恢复保留映射，重置本套会清除本套映射。请用 dev.45 或更高版本的校验器与插件验证。


## 增强素材接口预案

| 事项 | 先按什么格式准备 |
| --- | --- |
| B1 静态角色位 | 后续接口先接透明 PNG 头像与半身图。按需增加静态海报。工作区静态角色位与桌宠动作各自声明。现行 `workspaceRole` 仍按现有 WebM 合同校验，小样省略该项。 |
| B4 待机装饰 | 第一阶段接 PNG/WebP 静帧。全画面动效可另评估 MP4。需要透明视频叠层时，再由引擎线提供 VP9 alpha WebM 转码配方或工具。制作方可以按现有交付格式准备。 |
| B5 事件提示音 | 拟直接接收 RIFF/WAVE 的 PCM 24-bit 小端、48 kHz、立体声 WAV。单条最长 **2 秒**。可测量的片段以 **−16 LUFS-I** 为源文件目标，真峰值不高于 **−1 dBTP**。短于 400 ms 的点击声用真峰值和同组试听校准。默认播放增益拟为 **−6 dB**，再用实机校准。现有 WAV 可原样交，事件播放接口及 Windows 解码需在 B5 接入时验收，所需转码由引擎线提供。 |

当前本轮先交可运行小样。状态图、小操作反馈、装饰循环和事件音效在对应引擎能力接入后再使用。

### dev.47 回复风格默认与记忆

声明 replyStyle 的皮肤默认启用工作区回复风格。在会话标题切换后，本套皮肤记住该选择作为新会话默认；已明确开关的会话保留自己的选择。称呼、语气和默认开关按皮肤保存。主题角色人设仍需在各会话单独开启，桌宠共用身份由独立开关控制。

### 1.0 连续陪伴与互动偏好

皮肤可选在 `modules.pet.config` 声明：

```json
"interactionMemory": {
  "enabledDefault": false,
  "preferenceDefault": "工作时安静陪伴，避免反复走动。"
}
```

两个字段均必填，`enabledDefault` 为布尔值，`preferenceDefault` 最长 400 字，可为空。复用本套 `persona` 或共用角色、`modelSelection`、`historyRounds` 和动作能力；无需新增素材。未声明的普通皮肤隐藏「连续陪伴」。已登记的冷启动历史快照与导入版使用默认关闭、空偏好的兼容预设，内容键保持不变。

- 「本套设置 → 更多 → 连续陪伴」可开启、编辑偏好、查看并清空记录。开关与偏好按皮肤 ID 保存。
- 开启后保留最近 **20 条**桌宠专属互动与实际动作回执。本次运行中已完成的专属互动会作为起点纳入。`historyRounds` 控制专属对话参考的近期对话轮数。
- 专属对话可参考过去用户输入和桌宠实际回复。完成回应与自主活动只接收偏好和近期动作回执，不接收专属对话正文。工作区对话人设与回复风格不读取此记忆。
- 记录源为 `interaction`、`activity`、`work`。仅保存实际回执中的动作与已显示的文字，模型计划不直接写成执行结果；静默自主决定不产生假动作记录。时间表示确认回执的时刻，不代表动画完成时刻。
- `memory.preference` 为本套偏好，`memory.recentActions` 为 `{source, action, at}` 数组，用作模型输入。当前动作开关、原生可执行范围、勿扰与打断仍决定能否执行。
- 关闭会清空本套记录并保留偏好文字；清空记录保留开关和偏好；恢复连续陪伴默认同时清空记录并恢复默认开关与偏好；重置本套也清空该皮肤的记录。其他皮肤记录保留。
- 切换、停用和重启保留已选择保留的记录。数据位于插件已有 profile 的 `pet-memory/<skinId>.json`，以现有原子 JSON 写入方式保存。此记录不进入皮肤 ZIP 或安装包。

验收建议：开启后输入一条容易辨认的代号，完整重启后再询问，核对实际模型输入包含上次专属互动与执行结果。修改偏好后再触发自主决定，核对偏好与过去动作进入该次模型请求。清空、关闭、换肤和重置分别核对保存范围。
