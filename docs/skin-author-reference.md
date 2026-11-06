# 主题盒子 · 无桌宠皮肤制作与校验

适用基线为主题盒子 `0.1.0-dev.35`。Windows dev.35 已获用户实机验收。源码基线见提交 `77730c2`。这是制作交接包，日常安装仍用对应平台的主题盒子插件 `.tgz`。

## 先跑通可导入样例

- `no-pet-v3.zip` 可直接从「主题盒子 → 皮肤库 → 导入本地 ZIP」导入。导入后点「应用皮肤」。`sample/` 是同一份可编辑的样例。
- 样例使用四份原创几何资源。包含静态背景、两色入口徽记、一个工作区图标及两秒 H.264 MP4 开场。开场无音轨，方便只验证画面流程。
- `skin.json` 在 ZIP 根目录，使用 `formatVersion: 2`，模块为 `theme` v3 与 `startup` v3。无桌宠版省略 `pet` 和 `workspaceRole`。
- 当前小样可复用 `commander-v1`。同时声明 `semanticIcons` 与默认开启的 `workspaceDetailsEnabled`。当前适配器提供固定版式和图标替换点。颜色、图片和图标用本套资源。
- 入口徽记用 `theme.config.entryMarks`，浅深各一份 PNG，同时声明 `theme.settings.entryMarkEnabled`。兼容 dev.35 的新包请省略 `semanticIcons.companion`。dev.36 在两项同时存在时优先采用专用入口徽记，关闭后显示插件默认图标。

## 离线校验

解压制作工具包后，用 Node.js 22.19 或更新版本运行。校验器、插件的同版合同及 ZIP 依赖已随工具提供。

```sh
node scripts/skin-author-check.mjs no-pet-v3.zip --dsh-version 0.2.2-rc.1 --platform darwin-arm64
node scripts/skin-author-check.mjs sample --dsh-version 0.2.2-rc.1 --platform win32-x64
```

把首个参数换成自己的 ZIP 或解包目录。校验覆盖清单字段、资源路径、字节数、SHA-256、文件头、宿主版本及必需模块。ZIP 输入走插件实际导入逻辑。通过时输出内容摘要及各模块状态。实机仍需验颜色、开场解码、播放时长、跳过与冷启动。

`dshVersions` 列出实际验证过的 DSH 版本。小样先用 `["0.2.2-rc.1"]`。两套历史内置皮肤的固定内容摘要有兼容特例。普通作者包按自己声明的版本验收。主机缺少必需模块时整套应用失败。可选模块不可用时显示原因，其他模块可继续。第二套可将开场标为可选能力，并在正式交付时验开场实际就绪。

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

插件入口徽记单独交。历史 `history`、书签 `bookmark`、引用 `quote`、音量 `volume`、静音 `mute` 当前没有专属替换键，移到「待接入」。已经交付的素材可留档。

## 开场与 Windows 验收

- 正式开场交一份 **1280×720 H.264/AAC MP4** 和同构图 PNG/WebP 静帧。`soundEnabled: false` 会在播放器中静音原片。只需同一份有声 MP4。
- `startup` v3 的 MP4 单文件上限 **16 MiB**。用实测容器时长填 `seconds`。实际解码时长与该值偏差超过 **0.1 秒**，会回退静帧。天空龙当前报告有声版 10.080 秒，配置可写 `10.08`。验收时以实际封入 ZIP 的文件为准。
- Windows x64 用 DSH `0.2.2-rc.1` 与主题盒子 dev.35。制作 Agent 提供最终 ZIP 和素材核对结果。主线准备包、步骤和验收记录，计划沿用项目方已有的 Windows 测试机。实机分别检查预览自然结束、Esc 跳过、完全退出后从原 DSH 图标冷启动。补验开启和关闭开场声音，以及切回「冷启动」。
- 当前素材产能为 H.264/AAC MP4、PNG/WebP 和 48 kHz／24 bit 双声道 WAV。本轮小样只消费现有图片和开场 MP4。天空龙素材依已有许可记录用于私有自用。

## 增强素材接口预案

| 事项 | 先按什么格式准备 |
| --- | --- |
| B1 静态角色位 | 后续接口先接透明 PNG 头像与半身图。按需增加静态海报。工作区静态角色位与桌宠动作各自声明。现行 `workspaceRole` 仍按现有 WebM 合同校验，小样省略该项。 |
| B4 待机装饰 | 第一阶段接 PNG/WebP 静帧。全画面动效可另评估 MP4。需要透明视频叠层时，再由引擎线提供 VP9 alpha WebM 转码配方或工具。制作方可以按现有交付格式准备。 |
| B5 事件提示音 | 拟直接接收 RIFF/WAVE 的 PCM 24-bit 小端、48 kHz、立体声 WAV。单条最长 **2 秒**。可测量的片段以 **−16 LUFS-I** 为源文件目标，真峰值不高于 **−1 dBTP**。短于 400 ms 的点击声用真峰值和同组试听校准。默认播放增益拟为 **−6 dB**，再用实机校准。现有 WAV 可原样交，事件播放接口及 Windows 解码需在 B5 接入时验收，所需转码由引擎线提供。 |

当前本轮先交可运行小样。状态图、小操作反馈、装饰循环和事件音效在对应引擎能力接入后再使用。
