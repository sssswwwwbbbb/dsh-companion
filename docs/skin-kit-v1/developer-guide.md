# 主题盒子 1.0 · 皮肤开发说明

## 1. 要做成什么

让工作区主题、开场、角色、声音和交互形成同一个场景。无桌宠主题靠工作区与开场成立；带桌宠主题把同一角色延续到系统桌面。二次元、立绘、科幻、赛博和动漫都是可选方向，具体世界观由每套皮肤决定。

皮肤作者负责角色与视觉方案、素材、默认文案与配置、ZIP 和自测。引擎线负责 DSH 接入、授权、跨平台宿主、原生桌宠及能力扩展。用户从原 DSH 图标启动，在「主题盒子」内管理；皮肤不另做启动器。

## 2. 版本、交付与已支持范围

配置/工具基线：主题盒子 `1.0.0`，构建号 `10000`；运行目标为 Mac ARM64、Windows x64，官方 DSH `0.2.1-rc.5`、`0.2.2-rc.1`。这两个宿主版本按实际结果记录，不能外推到其他正式版。

| 能力 | 作者如何提供 | 素材或文字 | 边界 |
| --- | --- | --- | --- |
| 明暗工作区主题 | `modules.theme`，接口 1，推荐配置 3 的 `commander-v1` | 明暗色板、可选静态背景与语义图标 | 复用既有界面结构；自定义布局、字体文件和任意 CSS/JS 需引擎扩展 |
| 入口徽记与卡片封面 | `entryMarks` / `entryMarkEnabled`、顶层 `cover` | 明暗透明 PNG；封面 PNG/WebP | 封面 ≤2 MiB。入口徽记与 50 个工作区图标分开交 |
| 开场 | `modules.startup`，接口 1、配置 3 | H.264/AAC MP4 + 同构图 PNG/WebP 静帧 | 1–15 秒，准确填写实测时长。声音由同一成片静音控制 |
| 工作区回复风格 | 顶层 `replyStyle` | 默认称呼与语气 | 默认开启，新会话沿用本套最近选择，明确开关的会话保留自己选择 |
| 共用角色 | 顶层 `character` | 身份、工作区和桌宠场景补充 | 两端独立启停，工作区主题角色仍需逐会话开启 |
| 三类工作区提示 | 顶层 `workspaceCues` | 每场景文案、时长、位置、动效、可选明暗颜色 | 有容器与预览；尚非角色视频演出或新会话开场接口 |
| 模型/工作区场景 | 顶层 `scenePresets` | 模型徽记或立绘、工作区明暗强调色、可选问候 | 用户在设置绑定实际 provider/model 或工作区 ID；默认可回退 |
| 基础桌宠 | `modules.pet`，接口 1、配置 2 | 透明待机、回应与动作描述 | 原生驱动必须能执行该动作；不能靠写名字自动获得物理移动 |
| 模型桌宠互动 | persona、modelSelection、historyRounds、allowSpeech、allowActions 等 | 人设、短句回退、动作语义 | 当前文字气泡；预录语音和 TTS 不是该开关自动提供的能力 |
| 自主活动 | `pet.config.activityDescriptions` | 有限短动作及语义 | 从当前可用动作中选或保持安静，遵守工作、勿扰、打断与落点约束 |
| 连续陪伴 | `pet.config.interactionMemory` | 默认开关和互动偏好 | 最近 20 条专属互动/实际动作，按皮肤保存，可查看、清空和重置 |

不带桌宠的包省略 `pet` 及其资源，设置页随声明隐藏能力。普通皮肤不应写冷启动的兼容内容键或私有后端注册表。

## 3. 制作顺序

1. **确定覆盖**：选择无桌宠或带桌宠，确认主题名、角色、工作区、开场和声音。把必做、可选、后续分开。
2. **冻结母版**：角色全身、面部、配色、标志物、称呼及语气。让开场、头像、徽记与桌宠在一张同角色对照板里可辨认。
3. **先做可运行小样**：复制工具包的 `sample/`，先只改 ID、配色和入口标记，导入并应用，再接开场和所选模块。
4. **定运行规格**：在真实 DSH 中确定裁切、角色大小、透明边缘、脚点、声音强度和提示位置，然后批量制作。
5. **填清单**：素材采用稳定资源 ID，填写文件名、格式、尺寸、时长、Alpha、循环、来源和许可；配置按 ID 引用。
6. **接配置**：作者给每个公开项提供本套默认值，用户覆写按皮肤保存；没有声明的能力隐藏。不要把能力不可用当成关闭。
7. **校验和实机**：先跑同版离线校验，再验证明暗、输入、代码、列表、开场自然结束与跳过、冷启动、切换与恢复。
8. **交付**：单个皮肤 ZIP、完整美术/音频源文件包、清单、动作目录、版本和逐平台测试回执。

## 4. 包结构和接口实现

作者主要实现声明，不需要写插件或重新做模型执行器。

```text
my-skin/
  skin.json
  assets/
    icons/light/*.png
    icons/dark/*.png
    cover.webp
    opening/still.png
    opening/film.mp4
    pet/idle.webm          # 只有带桌宠版需要
    pet/react.webm
```

ZIP 根目录必须直接有 `skin.json`。包格式 `formatVersion: 2`，ID 为 3–64 字符的小写字母/数字/连字符，以字母开头；同一套迭代沿用 ID，版本用 `X.Y.Z`。`dshVersions` 明确列实测版本。每个模块有 interfaceVersion、configVersion、required、config、settings。固定值/资源引用写 config，用户可改项写 settings，settings 的每项须有 label 与合法 default。

资源条目填写 path、mime、bytes、sha256，建议同时填 width、height、alpha、source、license。图片 ≤8 MiB；视频 ≤16 MiB；封面/场景立绘 ≤2 MiB；总资源 ≤128 MiB，最多 128 项。MP4 当前仅用于 startup v3。完整图标会占约 100 项资源，新增大量变体/动作前先核对总数。浅深能共用同一图时可引用同一资源 ID。

- `theme`：色值对应 `theme-tokens.json`，每项同时交 light/dark。使用 commander-v1 时提供 semanticIcons 与 workspaceDetailsEnabled。纯静态场景可省略 workspaceRole，模型徽记/头像优先用 scenePresets。
- `pet`：基于现有 pack，固定动画槽包括 idle、look、walk、run、stretch、eat、play、greet、react、sleep-in、sleep、wake。先接 idle/react；部分动作集使用配置 2。每段填 asset、seconds、loop。桌宠动作的实时位移、道具层或窗口边接触由引擎验证。
- `startup`：poster、video、seconds、handoffSeconds、stillSeconds、greeting、subtitle。时长以成片实测为准；MP4 解码时长与声明偏差 >0.1 秒会回退静帧。soundEnabled=false 直接静音同一文件，无需另交静音运行片。
- `replyStyle`：address ≤32 字，tone ≤280 字。提供正常任务、报错解释、详细展开三组示例。
- `character`：name ≤32、identity ≤2000、workContext/petContext 各 ≤600 字；至少一个场景。petEnabledDefault 决定桌宠是否默认共用；工作区开关独立。
- `workspaceCues`：welcome/session/workspace 分别声明 text ≤72 字与 default，可选 seconds 1–8、position、effect、colors。各条分别可配置与预览。详见配置参考。
- `scenePresets`：model/workspace 每组最多 8 个；徽记/立绘引用 PNG/WebP，工作区 accent 提供明暗色。映射由用户选择，作者交默认组和每组用途。
- `interactionMemory`：enabledDefault 布尔值、preferenceDefault ≤400 字，均必填。无需额外图像或音频；按皮肤保存。

完整节选和字段名以同包 `configuration-reference.md` 与工具包校验器为准。不要向清单加入尚未支持的 media、audio 或自定义脚本字段。

## 5. 素材产能与转换分工

当前素材人员可交 H.264/AAC MP4（1280×720）、PNG/WebP、48 kHz/24-bit 立体声 WAV，无需采购或学习 WebM、Lottie、AE 工程来完成无桌宠主题。开场直接使用有声 MP4。

透明桌宠运行文件当前仍需 VP9 Alpha WebM。美术可交**透明 PNG 序列**和帧率、脚点、首尾说明，由接入方准备转码工具；仅有不透明 MP4 时，不能假定已有透明桌宠。单张 PNG 可用于静态头像/徽记，不冒充动画。先做一小段转换与实机确认，再生产整组。

## 6. 开发者自测

```sh
node scripts/skin-author-check.mjs my-skin.zip --dsh-version 0.2.2-rc.1 --platform darwin-arm64
node scripts/skin-author-check.mjs my-skin.zip --dsh-version 0.2.2-rc.1 --platform win32-x64
```

校验器来自同版作者工具包。真实操作要覆盖：导入→应用→明暗切换→阅读代码/表格→输入与发消息→每项设置→三类提示预览/实际触发→开场自然结束/跳过/静音→完全退出从原 DSH 图标重开→换肤→停止/恢复→覆盖升级保留。带桌宠另验透明命中、缩放、拖拽、动作结束回待机、模型说话、共享角色和连续陪伴。

## 7. 最终提交物

皮肤 ZIP、版本号与摘要；源文件与导出成品；填好的资产/音频/动作表；授权与署名文件；明暗截图、开场与交互录像；平台/DSH/插件版本与通过/未过清单。安装包、模型密钥、机器授权由项目方分别提供，皮肤包只携带内容和配置。

## 8. 后续需求如何提

角色欢迎演出、新会话空白页开场、工作区完整过渡、多方向走跑/坐靠/攀爬、道具、事件音效、TTS、自定义字体和作者编辑上传仍在路线图。交触发、预期画面、最小素材、当前结果、可接受简化；先让引擎线确认接入，再把它写成皮肤承诺。
