# 黑焰 · 无桌宠版 — 0.1.2 自检记录

2026-11-08 · macOS arm64 · DSH `0.2.2-rc.1` · 主题盒子 `0.1.0-dev.46`
素材基线：`素材/DSH-烬角黑焰-皮肤素材包-v3.6.zip`（371 个文件，v3.1 的修订版）

## 一、构建事实

| 项 | 值 |
| --- | --- |
| 皮肤 ID / 版本 | `black-flame` / `0.1.2`（0.1.0 基于素材包 v3.1，0.1.1 起基于 v3.6） |
| 名称 | 黑焰（角色：阿斯特 · 封存编号 07；称呼：契约者） |
| 模块 | `theme` v3（`required: true`）+ `startup` v3（`required: false`），无 `pet`、无 `workspaceRole` |
| 资源 | 106 项 / 9.00 MiB（限制 128 项 / 128 MiB） |
| 最大单件 | 开场片 7.69 MiB（限制 16 MiB）；静帧 0.94 MiB（限制 8 MiB） |
| 令牌 | 71 / 71 个允许键全覆盖 |
| 语义图标 | 50 / 50 个替换键，取素材包中性色成套（浅深各一） |
| 卡片封面 | `cover-960x600.webp`，59 KB（dev.38+ 支持 WebP） |
| 开场 | **9.35 s**（本地裁切）/ 1280×720 / H.264 + AAC 立体声；`seconds: 9.4`、`handoffSeconds: 0.35`、`stillSeconds: 1.2` |
| `contentKey` | `87981d9ab4bde33dba661655215cef918df2eec29947d9aff6b460e57a7afa65` |
| ZIP SHA-256 | `042508572da4f78c40b457c83bd75421d476c132bdf8f67ff993569ade5431e6`（8.48 MiB） |

## 二、校验

| 校验 | 命令 | 结果 |
| --- | --- | --- |
| dev.46 目录 | `node scripts/check-skin.mjs` | `valid: true`，`hostSupported: true`，`theme` / `startup` 均 `enabled` |
| dev.46 ZIP 真实导入 | `node scripts/check-skin.mjs black-flame-0.1.2.zip`（`SkinLibrary.install`） | 导入成功，106 项 |
| dev.35 兼容包 | `node <工具包>/scripts/skin-author-check.mjs black-flame-0.1.2-dev35.zip --dsh-version 0.2.2-rc.1 --platform darwin-arm64` | `valid: true`，105 项，`contentKey dbb520dc…` |
| ZIP 完整性 | `python3 -m zipfile -t` ×2 | 均 `Done testing` |

设置项：`backgroundOpacity=0.04`、`entryMarkEnabled=true`、`workspaceDetailsEnabled=true`、`workspaceMotionEnabled=true`、`workFeedbackEnabled=true`、`reducedMotion=false`、`soundEnabled=true`。

## 三、图标

v3.6 起素材包自带中性色成套（`exports/icons/{light,dark}-neutral/`，56 枚含 `companion`），颜色与本套 0.1.0 的本地重上色一致：中性色 `#5C423C` / `#D6BAAD`，`send` / `stop` 近白 `#FFF8F2`。因此 0.1.1 **不再在本地改图**，直接取包内文件，只取有替换键的 50 枚。

宿主仍以 CSS `background-image` 贴图标（子元素 `opacity:0`），图标颜色由 PNG 决定。对照板：`review/contact-sheet-{light,dark}.png`，主区 50 枚铺在实际 surface / bg 上，底部窄条是 `send` / `stop` 落在强调色填充按钮与中性底上的对比。

## 三之二、0.1.2：去掉开场尾部的落版主题字

成片 9.5 s 起硬切出「烬角 · 黑焰」字样（烧进画面，不是播放器叠的 `greeting`／`subtitle`——自定义皮肤下那两个元素本来就被 CSS 隐藏）。按「可以直接删尾帧」处理：

| 项 | 处理 |
| --- | --- |
| 成片 | 用 AVFoundation 裁到 **9.35 s**（标题出现前的最后一帧），音频尾 0.35 s 淡出，`scripts/video-tools.swift trim` |
| `seconds` | 由构建脚本从 mp4 各轨时长自动算，取值 **9.4**（播放器 `video.duration` 9.433 s，偏差 0.033 s，在 0.1 s 容差内） |
| 开场静帧 | 原静帧同样带主题字，改用成片 9.0 s 的干净帧（1280×720，`scripts/video-tools.swift frame`） |
| 代价 | 丢掉 9.35–10.50 s 的落版节拍与片尾音效 `sfx-end-hit`；画面停在火与角色的持镜上，交接由 `handoffSeconds: 0.35` 完成 |

工具与用法（在 `scripts/` 下，需要 Swift 6）：

```sh
swiftc -O scripts/video-tools.swift -o /tmp/video-tools
/tmp/video-tools trim  <素材包成片> assets-src/opening-film-notitle.mp4 9.35 0.35
/tmp/video-tools frame <素材包成片> assets-src/opening-still-clean.png 9.0
python3 scripts/build-skin.py      # 自动优先用 assets-src/ 的两份本地文件
```

## 四、素材包 v3.6 相对 v3.1 的实质变化

| 变化 | 影响 |
| --- | --- |
| 图标补到 56 枚（新增 `companion` + SVG） | 「56 枚」名副其实 |
| 新增 `light-neutral` / `dark-neutral` 各 56 枚 | 本套不再需要本地重上色 |
| 新增 `cover-960x600.webp`（59 KB） | 封面从 688 KB 降到 59 KB |
| 成片重做：11.245 s → **10.495 s**（10.08 生成画面 + 0.42 落版补帧，无工作区尾段） | `seconds` 从 11.25 改为 10.5 |
| 成片音轨从单声道改为 **AAC 立体声** | 与分轨口径一致 |
| 18 条 WAV 全部重做（v3.3 自修：上一版转立体声时按错字节序，整条是满量程噪声） | **v3.1 包里那版开场音轨是坏的，0.1.0 的成片音轨不可用**；0.1.1 已换新 |
| 台词全部重写（v3.4 自修：旧台词是「机械姬」口径，与角族少女设定不符） | 台词、入点、人设、分镜同步更新 |
| 台账重建到 314 行，`exports/` 每件一行 | A2 / A3 / A8 已闭合 |
| `README` 新增第五节「开场时长换算」、电平口径 | A7 已闭合 |

## 五、残留项（已回传素材侧，不影响本包运行）

1. `copy/基础文案.md` 台词表表头仍写「成片 **11.66 s**」，与 README 第五节、分镜开头的 **10.50 s** 不一致，应为 10.50 s。
2. 台账 314 行里**没有** `exports/audio/opening-mix-13.0.wav`；README 与分镜也没说明这条 13.0 s 母版的用途（成片只用 `opening-mix-10.5.wav`）。
3. `copy/基础文案.md` 副标题仍是「封存体解除 · **单元**苏醒」、世界观里有「不该再被点亮的单元」，而 v3.4 声明已清除「单元 / 本单元」机号口径；本套 `subtitle` 暂按文案原样使用。

## 六、实机验收（2026-11-08）

| 项 | 结果 |
| --- | --- |
| 导入并应用 | 通过 · `selected black-flame 0.1.2`、`contentKey 87981d9a…` |
| 深浅两套可读性 | 通过（用户实测） |
| 输入区发送 / 停止图标 | 通过（用户实测可见） |
| 开场 9.35 s 播放与 Esc 跳过 | 通过（用户实测） |
| 按皮肤保存设置 | 通过 · `overrides["black-flame"]` = 背景浓度 0.12 + 两条陪伴开关 |
| A → B → A 互切 | 通过 · 四套皮肤 overrides 各自保留，`generation 474` |
| 语义图标命中率 | 7 / 50 · 命中 `folder` `send` `stop` `file-code` `file-table` `file-image` `file-text`，其余 43 位为纯路径选择器，不命中（见 `docs/second-skin-icon-coverage-2026-11-06.md` 复测节） |

仍未验：卡片封面缩略图与三条陪伴文案的实际出现时机；实机截图或短录屏（我没有截图通道）。

## 七、主题盒子 1.0 升级（0.2.1）

基线：主题盒子 `1.0.0`（构建号 10000），官方 DSH `0.2.1-rc.5` / `0.2.2-rc.1`；用户验收版本为 dev.47。本机已装 `1.0.0`。

### 采用了什么

| 能力 | 用法 |
| --- | --- |
| `workspaceCues` 呈现字段 | 每条补 `seconds` / `position` / `effect` / `colors`：欢迎 5 s·`above-input`·`fade`；切会话 3 s·`bottom-right`·`fade`；切工作区 4 s·`top-right`·`slide`。配色取本套明暗（底 `#FFF8F2`/`#2C1A22`，字 `#2A1A18`/`#F4E3D8`，描边 `#C0282E`/`#FF6A3C`） |
| `character` | 阿斯特的身份（76 字）与工作区补充（42 字）；不带 `petContext`，故不声明 `petEnabledDefault` |
| `replyStyle` 默认启用 | 1.0 起声明即默认开，无需用户手动打开 |

这直接解决了 2026-11-08 反馈里的「cue 2.8 秒、无底色、贴底边、看不见」——1.0 给 cue 加了容器、位置与时长，不必再等引擎。

### 未采用

| 能力 | 原因 |
| --- | --- |
| `scenePresets` | 需要模型徽记/立绘与工作区强调色绑定，属可选增强；素材里已有头像与徽记，可另起一版 |
| `interactionMemory` | 桌宠专属，无桌宠版不适用 |

### 校验

| 项 | 结果 |
| --- | --- |
| 1.0 真实导入 | `valid: true`，106 项，`contentKey 2547763a…` |
| 1.0 校验器 darwin-arm64 | 通过 |
| 1.0 校验器 win32-x64（兼容包） | 通过，105 项，`contentKey 37854a00…` |
| 0.1.2 在 1.0 下 | 仍通过（向后兼容），说明升级不是被迫的 |

### 待实机

1. 「本套设置 → 工作区陪伴」的预览按钮：三条 cue 的容器、位置、时长、配色。
2. 会话标题旁的「主题角色」开启后，确认 `character` 生效。

### 提示词与演出（0.2.0 修订）

| 场景 | 台词 | 时长 | 位置 | 入场 | 描边 |
| --- | --- | --- | --- | --- | --- |
| welcome | 你回来了。火还在。 | 6 s | `above-input` | `fade` | 强调红 `#C0282E` / `#FF6A3C` |
| session | 换了一页。 | 2.5 s | `bottom-right` | `fade` | 中性 `#C6A897` / `#7D615C` |
| workspace | 我跟着过来了。 | 3 s | `top-right` | `slide` | 余烬金 `#C98A4B` / `#E7A45C` |

三条共用同一套底色与字色（`#FFF8F2`/`#2C1A22`，`#2A1A18`/`#F4E3D8`），只用描边区分「发生了什么」：回来是火的颜色，普通切换退到中性，跨工作区用余烬金。

台词重写理由：原稿「会话切了。我在。」「换了地方。我跟上。」是系统播报口吻，与阿斯特「不寒暄、先结论」的人设不符；现稿去掉「会话」「工作区」这类界面术语，改成动作句。

预览图：`review/cue-preview.png`（按 manifest 配色手工合成的形态示意，非实机截图）。

## 八、主题盒子 1.0 能力对照

逐项对照 1.0 开发说明第 2 节的能力表。

| 1.0 能力 | 状态 | 依据 |
| --- | --- | --- |
| 明暗工作区主题 | 已跟上 | 71/71 令牌、`commander-v1`、49 枚语义图标、聊天背景 |
| 入口徽记与卡片封面 | 已跟上 | `entryMarks` + `entryMarkEnabled`；`cover` 为 960×600 WebP |
| 开场 | 已跟上（含一处偏离） | `startup` v3 全字段；成片按需求裁到 9.35 s，偏离清单「不切掉结尾」 |
| 工作区回复风格 | 已跟上 | `replyStyle`；1.0 起默认启用 |
| 共用角色 | 已跟上 | `character`：identity + workContext（无 petContext） |
| 三类工作区提示 | 已跟上 | 文案 + `seconds` / `position` / `effect` / `colors` |
| 模型/工作区场景 | 已跟上 | 3 组模型（徽记 256×256）+ 3 组工作区（明暗强调色） |
| 资产 / 音频 / 动作表 | 已跟上 | `review/kit-asset-register.csv`、`kit-audio-cues.csv`、`kit-action-catalog.csv` |
| 交付对照图 | 已跟上（缺亮色） | `review/delivery-board.png`；亮色实装截图未补 |
| `workspaceRole` 工作区角色位 | 未做（可选） | 仍需两段 alpha WebM；1.0 允许纯静态场景省略 |
| 桌宠四件套 | 不适用 | 无桌宠版不声明 `pet`，相关设置随声明隐藏 |
| 图标替换覆盖 | 未跟上（引擎侧） | 1.0 替换表仍是 228 条选择器、7 键有类选择器；实机命中 7/50 |

### 其余差距

1. 亮色实装截图与交互录像未补（交付 §7 要求明暗截图与开场/交互录像）。
2. `replyStyle` 三组示例未随 ZIP，已摘录到 `review/文案示例.md`。
3. `scenePresets` 需用户在设置里绑定 provider/model 或工作区 ID，尚未实机绑定验证。

## 九、授权与作者更正（0.2.1）

早期素材包的授权文字沿用了参考作品的底稿（「个人二创、非商业、仅限本人本地使用」），未随本套更新。现按委托人口径更正：

| 项 | 值 |
| --- | --- |
| 作者 | Dr.S |
| 授权 | 可分发（保留署名 Dr.S） |
| 落点 | `licenses/README.md`；`skin.json` 每项 `license` 与 `description`；`review/kit-*.csv` 的作者/许可/署名/可分发范围列 |

`skin.json` 没有顶层作者字段（schema 只允许固定键），所以作者写在 `description` 尾部与 `licenses/README.md`。

素材包 `素材/DSH-烬角黑焰-皮肤素材包-v3.6.zip` 内的 `licenses/README.md` 与 `README-交付说明.md` 同步改为「作者 Dr.S，可分发」，解包目录 `素材/烬角-黑焰/` 一并更新。素材包新 SHA-256：`791c6cc9…`（仅两个文本条目变化，二进制资源未动，皮肤重建后 `contentKey` 保持 `ecf220c0…`）。

## 十、云端发布（2026-11-08 15:32）

| 项 | 值 |
| --- | --- |
| 发布命令 | `node deploy/cloud-admin.mjs publish-skin <zip> '黑焰'` |
| releaseId | `skin_ff141a72-2a78-41c2-acfb-e83dba6d43c6` |
| id / version | `black-flame` / `0.2.1` |
| sha256 | `730c94ff4ed7baa4981abf8840aefde69900bb007cef3d913653fe8c95ecdae4`（与本地一致） |
| size | 8,929,567 字节（与本地一致） |
| contentKey | `ecf220c072871f4830bc6502505e2fde9978d3e64691b1f867251e61b5c4a905` |
| 云端统计 | `stats.skins` 内 `black-flame` 仅 1 条，字段与本地上冻结包一致 |

## 十一、实机补充验证（2026-11-08 15:57）

| 项 | 结果 | 证据 |
| --- | --- | --- |
| 亮色工作区 | 通过 | `review/screenshots/workspace-light-applied.png` |
| `welcome` 提示（亮色） | 通过 · 浅底 + 红描边 + 深色字 | `review/screenshots/cue-welcome-light.png` |
| `session` 提示（亮色） | 通过 · 中性描边 | `review/screenshots/cue-session-light.png` |
| 场景绑定 | 通过 · DeepSeek-V4.1-Flash → `flare`（炽焰） | `skin-state.json` 的 `sceneBindings`；底栏徽记见 `scene-badge-workspace.png` |
| 开场预览与 Esc | 通过 · 门体 → 角色 → 回工作区 | `review/opening-preview.mp4`（9.5–23.5 s，1280×720，静音）、`opening-preview-door.png`、`opening-preview-character.png` |

录像说明：`screencapture -v` 只能录屏，无法录系统声音；开场音轨不在录像里。要带声音需装音频回环设备，本次未做。

未复现：`workspace` 一条 cue（需跨工作区切会话）。界面点击自动化在本机不可用（System Events 坐标点击落到输入框），场景绑定与开场预览由委托人手动完成。


## 十二、授权口径修正与 0.2.2（2026-11-08 16:02）

委托人口径：**只有作者本人可以分发；其他人只能使用作者分发的版本**。原 `licenses/README.md` 写的「可分发（保留署名）」作废。

| 落点 | 改动 |
| --- | --- |
| `licenses/README.md` | 重写：分发权归 Dr.S；获取者可自用、可修改，不得再分发、转售或上传其它渠道；不得移除署名 |
| `skin.json` | 每项 `license` 改为「Dr.S 授权，禁止转发」；`description` 改为「作者 Dr.S，仅本人分发」 |
| `使用说明.md`、`README.md`、验收清单 | 同步改口径 |
| 版本 | 0.2.2（ZIP 内容变化，按规则升版本） |

云端：`publish-skin` 成功，releaseId `skin_68a98e1e-7b1c-4e7f-a8e8-b83640566daf`，sha256 `788fd5cc…`（与本地一致），size 8,929,587，contentKey `7ddd8c3d…`。`stats.skins` 中 `black-flame` 现有 0.2.1 与 0.2.2 两条，客户端展示最新版。

上架并不违反新口径：云端皮肤库由作者本人维护与分发。


## 十三、插话按钮异常与 0.2.3（2026-11-08 20:00）

现象：队列面板的「插话发送」按钮显示为一片浅色，几乎看不见。

根因：引擎的 `send` 替换表含 `svg[data-icon="dsw-icon-send-outline-regular"]`，会命中所有 send 图标，包括这个透明底按钮。本套 `send` 是近白 `#FFF8F2`（为强调色填充的主发送键准备），贴到浅色卡片上即隐形。

处理：0.2.3 起从 `semanticIcons` 移除 `send`，49 枚；`stop` 暂留（其 `data-icon` 选择器同样宽，若在别处变白再一并去掉）。资源 109 → 107 项。

委托人实机确认修复。云端发布：releaseId `skin_8a39f89b-9d96-41d6-80b5-715a744522cb`，sha256 `72d8203c…`，size 8,925,242，contentKey `3a93bd80…`。
