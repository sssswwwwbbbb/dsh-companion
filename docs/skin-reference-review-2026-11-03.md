# DSH 同类项目参考调研

调研日期：2026-11-03（Asia/Shanghai）。

状态：参考阅读完成，首套皮肤范围和主题仍待讨论。用户要求先读这些仓库，因此暂缓上一轮的范围提问。本次阅读 README、包声明、许可说明和关键实现；未安装插件、未运行仓库代码、未操作真实 DSH，也未把上游自述的测试结果当作本项目验收。

## 仓库去重与地址变化

用户提供的启动动画链接重复一次；两个 EAC 主仓库地址当前指向同一个 GitHub 仓库。因此共核对 **7 个独立仓库**：

| 用户提供的地址 | 当前核对地址 |
|---|---|
| lxj5820/dsh-boot-animation | [同名仓库](https://github.com/lxj5820/dsh-boot-animation) |
| elysia395/dsh-wallpaper-engine | [同名仓库](https://github.com/elysia395/dsh-wallpaper-engine) |
| zhang66633/dsh-pixel-ui | [同名仓库](https://github.com/zhang66633/dsh-pixel-ui) |
| LeeRolling/da-feiyu-player | [同名仓库](https://github.com/LeeRolling/da-feiyu-player) |
| zouyuxuan122/Deepseek-Harness-EAC；DSH-EAC/DSH-Desktop-EAC | [Ebony-Vinyl/EAC-Desktop](https://github.com/Ebony-Vinyl/EAC-Desktop)，GitHub repository ID 均为 1334373503 |
| DSH-EAC/dsh-ui-skin-loader | [Ebony-Vinyl/EAC-skin-loader](https://github.com/Ebony-Vinyl/EAC-skin-loader)，repository ID 为 1387401606 |
| kingOfSoySauce/dsh-skin-market | [同名仓库](https://github.com/kingOfSoySauce/dsh-skin-market) |

## 功能与参考价值

“可参考”是本轮分析判断，不表示已选用、可直接兼容或已获素材使用授权。

| 项目 | 覆盖的体验 | 已读实现中的关键做法 | 对本项目的参考价值 |
|---|---|---|---|
| [启动动画](https://github.com/lxj5820/dsh-boot-animation/blob/b7786cd749ef18608340a8f5e2071a3656ebf009/README.md) | DSH Web UI 启动覆盖层、片尾过渡、闲置屏保、素材轮播、声音 | 启动前注入脚本；启动与屏保独立控制；视频/图片/动图渲染器；超时和跳过处理 | 开场与主界面的交接、素材池、屏保候选；不能直接替代现有启动器覆盖的更早启动阶段 |
| [壁纸引擎](https://github.com/elysia395/dsh-wallpaper-engine/blob/9aeaf5d1484466f7d677a0bc45d2037fc7582394/README.md) | 图片、视频、WE Scene/Web 壁纸；玻璃效果、字体、头像、吉祥物、指针特效 | 多组件包；宿主保存配置和资源；整套预设；不同宿主适配；与其他皮肤的让位规则 | 整套外观的组合方式、预设携带资源、局部开关及冲突处理 |
| [像素 UI](https://github.com/zhang66633/dsh-pixel-ui/blob/ebbbec1ae661a69a9b85b00a2a53234219ad62a6/README.md) | 九套主题，侧栏、聊天、输入、菜单、表格、滚动条、字体、光标等 | 注册 DSH 主题及颜色变量；按主题标记限定 CSS；部分主题使用 9-slice 切片；宿主保存偏好 | 当前最直接的主界面外观实现参考，尤其适合核对主题接口和控件覆盖面 |
| [大肥鱼播放器](https://github.com/LeeRolling/da-feiyu-player/blob/b2642c160d20a1957bbecce65cd10e649cb64af3/README.md) | 音乐、封面、频谱、逐字歌词、粒子、时间轴与录制导出 | 单文件 HTML；Web Audio 分析；Canvas 绘制；MediaRecorder 导出 | 音乐可视化、动效节奏及视频素材制作参考；当前代码没有 DSH 插件接入 |
| [EAC 桌面端](https://github.com/Ebony-Vinyl/EAC-Desktop/blob/f97635e89ff9f41af11fe51614c5613a684a1f1d/README.md) | 独立桌面工作台、窗口及插件生态、外观接入 | Tauri 桌面壳、Node 服务与 Harness 内核分层；HostProfile 和皮肤管理器工件锁 | 界面区域与宿主能力如何分工；属于桌面宿主层面的参考，不能把其私有能力当作官方 DSH 插件接口 |
| [EAC 皮肤加载器](https://github.com/Ebony-Vinyl/EAC-skin-loader/blob/43e9236c162332058754c7e84dc76aefa8ac40b7/README.md) | 发现皮肤、互斥激活、恢复默认、持久化、故障记录、13 款示例或迁移皮肤 | registerSkin 与 activate/deactivate 分离；切换状态机；资源撤销；宿主设置保存状态 | 多套皮肤切换和退出清理的直接参考；现有配置包需另行设计适配，不能直接导入这些插件包 |
| [皮肤市场](https://github.com/kingOfSoySauce/dsh-skin-market/blob/6f5fb3bbc87d5ee6086a57afdf21cd3af8d993e0/README.md) | 浏览、搜索、安装、使用、停用、常驻、更新、卸载、预览 | 固定安装目标；不同宿主的管理适配；安装与应用状态分开；冲突及失败恢复处理 | 分发与管理体验参考；市场管理能力和皮肤自身的绘制能力分别评估 |

## 逐项阅读记录

### 1. dsh-boot-animation

源码版本 0.3.0。README 以 DSH 0.2.0-rc.2 为目标说明。

- Host 在 `webserver/index-inject` 中加入配置、媒体渲染器、屏保与开场脚本；开场开关单独决定是否加入开场脚本。实现位置：[entry.js](https://github.com/lxj5820/dsh-boot-animation/blob/b7786cd749ef18608340a8f5e2071a3656ebf009/entry.js#L1585)。
- 开场是在 DSH 页面中的覆盖层；它通过 `[data-dsh-boot]` 和启动进度样式读取状态。页面覆盖层的“全屏”不等于操作系统全屏，也不覆盖 WebView 尚未创建的阶段。[boot-screen.js](https://github.com/lxj5820/dsh-boot-animation/blob/b7786cd749ef18608340a8f5e2071a3656ebf009/src/boot-screen.js#L543)。
- 开场支持片尾交叉淡出、放完再淡出、点击进入，以及声音解锁、音画一起淡出、异常超时。屏保另有轮播和退出效果。
- README 明确：整机闲置检测只有 Windows；其他平台依赖窗口失焦。Live2D 只是适配入口，仓库不附带其运行时；不稳定的指针互动已撤掉设置入口。
- 本项目可参考播放与交接规则，是否增加屏保尚未确定。依赖启动页 DOM 的部分需要按目标 DSH 版本重新核对。

许可记录：代码标为 MIT；内置视频另有保留权利声明，仅允许其列出的非商业随插件使用，不能把代码许可套用于视频。[LICENSE](https://github.com/lxj5820/dsh-boot-animation/blob/b7786cd749ef18608340a8f5e2071a3656ebf009/LICENSE)。

### 2. dsh-wallpaper-engine

源码版本 1.4.0；包声明 `engines.dsh: ^0.2.0-rc.1`。声明范围不是本项目的实机验证结果。

- 支持自定义图片/视频以及 Wallpaper Engine 项目。Scene/Web 实时渲染使用 WebWallGL；Application 类壁纸不支持。macOS 可使用本地图片/视频或 WE 项目目录。
- 除背景外，还覆盖玻璃表面、字体、头像、吉祥物、指针效果和视差。官方 `dsh-pet` 联动是可选项；页面吉祥物与本项目系统桌面桌宠应分别核对。
- 已读 `adapter.js`：区分浏览器、社区桌面端、官方桌面端，能力判定包含手选、宿主上报和本地信号。[宿主适配](https://github.com/elysia395/dsh-wallpaper-engine/blob/9aeaf5d1484466f7d677a0bc45d2037fc7582394/src/adapter.js)。
- 已读 `preset-store.js`：预设同时处理设置与可选字体/吉祥物/头像资源；区分“不包含该资源”“明确清除”“指向内置”“携带资源”。这是切换两套外观时避免上一套资源残留的重要参考。导入与立即应用分开。[预设实现](https://github.com/elysia395/dsh-wallpaper-engine/blob/9aeaf5d1484466f7d677a0bc45d2037fc7582394/src/preset-store.js)。
- 玻璃为独立组件行；停用时撤销样式、装饰及变量。代码中也有行状态探测和重建逻辑，说明热停用并非只改一个布尔值。[玻璃生命周期](https://github.com/elysia395/dsh-wallpaper-engine/blob/9aeaf5d1484466f7d677a0bc45d2037fc7582394/packages/glass/src/client.js#L268)。
- 共存说明含皮肤标记让位、主题变量及局部表面认领；这些是该项目在特定宿主上的处理方式，不能视为所有插件通用且稳定的官方契约。[工作原理](https://github.com/elysia395/dsh-wallpaper-engine/blob/9aeaf5d1484466f7d677a0bc45d2037fc7582394/docs/HOW-IT-WORKS.md#L236)。

本轮判断：值得参考“外观组合与完整预设”，具体是否采用实时场景、玻璃或 WE 兼容，应由范围讨论决定；它们还带来媒体、渲染和平台适配工作。

许可记录：代码 MIT；仓库明确提醒壁纸、角色与字体素材需分别核对，不自动继承代码许可。

### 3. dsh-pixel-ui

源码版本 1.13.2；README 明确目标 DSH 0.2.1-rc.5，与本项目交接记录的目标内核相同。此处仍只是上游声明，未在本项目验证。

- 客户端注入 `slots/theme/locale` 服务，调用 `ctx.theme.register` 注册主题，通过 `setTheme` 切换。
- 自定义 CSS 以 `data-pixel-ui` 等标记限定作用范围，补足颜色变量之外的边框、字体、光标、切片与控件形状。[主题入口](https://github.com/zhang66633/dsh-pixel-ui/blob/ebbbec1ae661a69a9b85b00a2a53234219ad62a6/src/client/index.js#L507)、[控件样式](https://github.com/zhang66633/dsh-pixel-ui/blob/ebbbec1ae661a69a9b85b00a2a53234219ad62a6/src/client/pixel.css)。
- 设置入口注册在 `settings.general.item`；退出时清理自己的样式与标记，提供“现代默认”选项。
- 偏好持久化有宿主文件与 localStorage 两层，专门处理桌面端随机端口导致浏览器存储失去连续性的问题。[Host 实现](https://github.com/zhang66633/dsh-pixel-ui/blob/ebbbec1ae661a69a9b85b00a2a53234219ad62a6/lib/index.js)。
- README 画廊区分真实宿主截图与组件预览图；不能把所有预览图统一当作本项目的完整界面验收。

本轮判断：这是核对“主界面整套外观”的优先源码参考。它说明主题服务与 CSS 可以共同承担换肤，但具体选择器和覆盖程度仍需以目标宿主实际结构确认。

许可记录：代码 MIT；字体与 UI 切片有独立来源和许可。仓库列出的字体包括 MIT / SIL OFL，Complete UI 切片为 CC BY 4.0；不能只保留根目录 MIT 而忽略素材说明。

### 4. da-feiyu-player

- 仓库只有单页播放器及音频/歌词示例，没有 DSH 插件包结构。
- `AudioContext/createAnalyser` 驱动音乐响应，Canvas 绘制封面、频谱、歌词和粒子；`captureStream/MediaRecorder` 组合音画录制。[音频入口](https://github.com/LeeRolling/da-feiyu-player/blob/b2642c160d20a1957bbecce65cd10e649cb64af3/index.html#L200)、[录制实现](https://github.com/LeeRolling/da-feiyu-player/blob/b2642c160d20a1957bbecce65cd10e649cb64af3/index.html#L688)。
- 对主题皮肤的价值在于听觉与视觉节奏、音乐场景或制作可播放视频；若要嵌入 DSH，还需设计入口、播放状态、音量、关闭时清理等接入行为。
- 当前不把音乐播放、歌词或录制功能列为首版需求。

许可记录：仓库标注 CC BY 4.0，并在 README 给出署名文字；引入具体音乐/图片时仍需记录所选资源来源。

### 5. EAC-Desktop

- 这是基于 Harness 的独立桌面工作台；本轮读到的主分支 `dsh-desktop/package.json` 为 6.1.0，README 下载区另列已发布平台版本。源码版本、安装包版本和实机状态不得合并。
- `host-profile.json` 列出六类区域（上下左右侧栏、session、overlay）、弹窗/对话框/浮窗实例及窗口能力、默认回退资源。[HostProfile](https://github.com/Ebony-Vinyl/EAC-Desktop/blob/f97635e89ff9f41af11fe51614c5613a684a1f1d/tauri-shell/host-profile.json)。
- 工件锁固定的是 `@dsh-eac/ui-skin-manager` 与 `system.default`，和下述 `@dsh-eac/ui-skin-loader` **不是同一个包或同一份协议**。[工件锁](https://github.com/Ebony-Vinyl/EAC-Desktop/blob/f97635e89ff9f41af11fe51614c5613a684a1f1d/tauri-shell/skin-manager-artifact.lock.json)。
- ADR 描述宿主、管理器、默认资源三方分工及按槽位组合的方向；该文档自身说明不包含运行时实现。本轮没有把其全部设计条目记为当前已实现能力。[集成边界 ADR](https://github.com/Ebony-Vinyl/EAC-Desktop/blob/f97635e89ff9f41af11fe51614c5613a684a1f1d/docs/adr/0010-ui-skin-manager-integration.md)。

本轮判断：可参考区域、窗口能力与皮肤呈现的边界；是否接触桌面壳、更换宿主或扩大到窗口装饰，仍未讨论或授权。

许可记录：主项目代码 MIT，第三方插件和皮肤各自保留许可。

### 6. EAC-skin-loader

源码版本 1.2.0。加载器包仅声明 DSH 0.1.7-rc.2 或 0.2.0-rc.2，Node >=24；与本项目目标 DSH 0.2.1-rc.5 不同，因此不能直接认定可用。[包声明](https://github.com/Ebony-Vinyl/EAC-skin-loader/blob/43e9236c162332058754c7e84dc76aefa8ac40b7/packages/loader/package.json)。

- `registerSkin` 负责登记；`activate/deactivate` 定义进入与退出；`switchTo` 控制互斥切换。注册皮肤本身不应产生可见效果。[协议](https://github.com/Ebony-Vinyl/EAC-skin-loader/blob/43e9236c162332058754c7e84dc76aefa8ac40b7/packages/loader/src/protocol.ts)。
- 运行时代码包含激活/停用超时、AbortSignal、故障记录和回退默认；关闭无法确认时标为“疑似残留”，不会把未知清理结果写成成功。[切换运行时](https://github.com/Ebony-Vinyl/EAC-skin-loader/blob/43e9236c162332058754c7e84dc76aefa8ac40b7/packages/loader/src/client/runtime/runtime.ts)。
- 极光示例在激活时登记主题、token 覆盖、样式节点、设置订阅和插槽；退出时按记录撤销。实际代码采用 `overrideTokens`，不会强写用户主题偏好。[极光会话](https://github.com/Ebony-Vinyl/EAC-skin-loader/blob/43e9236c162332058754c7e84dc76aefa8ac40b7/packages/skins/aurora/src/client/session.ts)。
- README 列出 13 款皮肤。不同批次有不同验证范围，不能把老版本五款皮肤的实机结论扩展到所有皮肤及新版 Desktop。
- 现有本项目使用 JSON 配置与固定内置素材；该加载器接收带生命周期代码的皮肤插件。复用管理思路、接入加载器、兼容其包格式，是不同选择，目前均未确认。

许可记录：加载器骨架 MIT；迁移皮肤有 BSD-3-Clause、CC BY-NC-SA 4.0 等组合声明，尤其不能将整仓视为素材全部可商用。

### 7. dsh-skin-market

源码版本 0.1.72。

- 它管理第三方皮肤的发现与包生命周期，皮肤效果仍由被安装的插件提供。
- 源码区分官方 Desktop 的 `pluginManager`、Web CLI 和社区桌面管理路径。[入口适配](https://github.com/kingOfSoySauce/dsh-skin-market/blob/6f5fb3bbc87d5ee6086a57afdf21cd3af8d993e0/src/index.ts)。
- 官方 Desktop 适配结果包括 `applied/restart-required/overridden/failed/cancelled` 和未知状态；“已安装”“已启用”“已生效”不是同一回事。[官方管理适配](https://github.com/kingOfSoySauce/dsh-skin-market/blob/6f5fb3bbc87d5ee6086a57afdf21cd3af8d993e0/src/official-desktop.ts)。
- `SkinLifecycle` 串行处理 profile 变更，包含使用、停用、常驻与安装操作；目录固定包版本或提交，GitHub/monorepo 条目的安装能力另行判断。[生命周期](https://github.com/kingOfSoySauce/dsh-skin-market/blob/6f5fb3bbc87d5ee6086a57afdf21cd3af8d993e0/src/lifecycle.ts)。
- 可以参考列表、预览、兼容说明和明确状态反馈。是否需要市场、联网目录、多来源安装或常驻组合，均不因提供这个参考而自动进入首版。

许可记录：市场代码 MIT；目录中收录的每套皮肤仍使用各自的许可。

## Steam Wallpaper Engine：补充产品参考

用户进一步明确，所说的 Wallpaper 是 Steam 上的 Wallpaper Engine。它与前述 `elysia395/dsh-wallpaper-engine` 不是同一个项目；最初的 7 仓库阅读不包含 Steam 原版。

补充查阅了 [官方产品网站](https://www.wallpaperengine.io/en)、[Web 壁纸创作接口](https://docs.wallpaperengine.io/en/web/overview.html) 和 [编辑已有壁纸的说明](https://help.wallpaperengine.io/en/functionality/editingwallpapers.html)。

- 官方产品支持多种壁纸内容、可调参数、播放规则以及暂停和性能设置；创作接口开放 HTML/CSS/JavaScript 壁纸的用户参数、音频响应、帧率限制等能力。
- 本项目据此提炼的产品参考是：运行程序与内容分开，内容可声明参数，底座统一协调启停和资源使用。这是设计判断，未经其引擎源码验证。
- 截至本轮查阅，未找到原版完整引擎的官方开源仓库或开源许可。公开创作接口、可编辑的内容文件以及社区兼容实现，不能作为原版引擎开源的证据。目前不将 Steam 原版列为可直接复用的代码来源。
- 借鉴这些机制不等于首版必须支持创意工坊、场景编辑器或全部 Wallpaper Engine 项目格式。兼容其内容时仍需另行核对资源格式、运行能力和素材使用范围。

该补充属于官方网页研究，不增加前述 GitHub 仓库或文件索引数量。重新整理的产品分工与推进顺序见 [整体方案](first-skin-brief.md)。

## 对当前需求讨论的影响

仓库阅读阶段得到的是参考框架。用户随后明确补充：制作皮肤的能力需要开源，其他人安装插件后能够自制并上传自定义皮肤；这些列入已确认的后续功能，不作为当前最小底座或首套皮肤的交付条件。具体视觉模块仍未选择，上传位置与公开范围仍需明确。最新分工及推进顺序以 [整体方案](first-skin-brief.md) 为准。

| 可讨论的层次 | 这些仓库提供的例子 | 本项目状态 |
|---|---|---|
| 日常界面 | 主题颜色、控件、字体、图标/光标、菜单与弹层 | 仍待确认覆盖范围 |
| 背景与氛围 | 静态/动态壁纸、玻璃、视差、粒子、音乐响应 | 仍待确认是否纳入 |
| 进入与离开 | 启动片头、交叉过渡、闲置屏保、退出效果 | 现有启动基础可复用；新增部分待定 |
| 角色与互动 | 页面吉祥物、角色头像、可选桌宠联动 | 与系统桌宠分别讨论；角色未选定 |
| 管理与交付 | 预设、资源导入导出、切换、还原、管理器、市场 | 统一配置方向已确认；开放制作与自定义上传列为已确认后续功能，上传位置、公开范围和市场形态待定 |

三个值得后续保留的判断：

1. 主界面换肤已有可研究的主题服务和插槽用例，后续可以基于实际代码核对能力，不必只停留在概念设计。
2. 一套皮肤能否可靠切换，取决于配置、资源和清理规则一起成立；能显示一张背景还不能证明整套切换成立。
3. 先决定想要的完整体验，再选择参考中的能力。本轮没有决定采用哪个项目、复制哪套素材，也没有确定首版功能取舍。

## 固定阅读版本

以下均为本轮从 main 分支解析并用于读取源码的提交；已核对读取文件的 blob SHA 与对应提交树一致。后续内容可能更新，复核时应先确认版本。

| 仓库 | 本轮固定提交 |
|---|---|
| lxj5820/dsh-boot-animation | [b7786cd749ef18608340a8f5e2071a3656ebf009](https://github.com/lxj5820/dsh-boot-animation/commit/b7786cd749ef18608340a8f5e2071a3656ebf009) |
| elysia395/dsh-wallpaper-engine | [9aeaf5d1484466f7d677a0bc45d2037fc7582394](https://github.com/elysia395/dsh-wallpaper-engine/commit/9aeaf5d1484466f7d677a0bc45d2037fc7582394) |
| zhang66633/dsh-pixel-ui | [ebbbec1ae661a69a9b85b00a2a53234219ad62a6](https://github.com/zhang66633/dsh-pixel-ui/commit/ebbbec1ae661a69a9b85b00a2a53234219ad62a6) |
| LeeRolling/da-feiyu-player | [b2642c160d20a1957bbecce65cd10e649cb64af3](https://github.com/LeeRolling/da-feiyu-player/commit/b2642c160d20a1957bbecce65cd10e649cb64af3) |
| Ebony-Vinyl/EAC-Desktop | [f97635e89ff9f41af11fe51614c5613a684a1f1d](https://github.com/Ebony-Vinyl/EAC-Desktop/commit/f97635e89ff9f41af11fe51614c5613a684a1f1d) |
| Ebony-Vinyl/EAC-skin-loader | [43e9236c162332058754c7e84dc76aefa8ac40b7](https://github.com/Ebony-Vinyl/EAC-skin-loader/commit/43e9236c162332058754c7e84dc76aefa8ac40b7) |
| kingOfSoySauce/dsh-skin-market | [6f5fb3bbc87d5ee6086a57afdf21cd3af8d993e0](https://github.com/kingOfSoySauce/dsh-skin-market/commit/6f5fb3bbc87d5ee6086a57afdf21cd3af8d993e0) |

文件级索引见 [skin-reference-sources-2026-11-03.json](skin-reference-sources-2026-11-03.json)。源码按功能选读，未做全部代码审计、性能测试或本项目兼容验收。

