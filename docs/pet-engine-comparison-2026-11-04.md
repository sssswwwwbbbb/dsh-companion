# dsh-pet 与 Phaser：场景陪伴实跑对比

日期：2026-11-04。状态：底座线交审建议，**主控尚未选型，未迁移生产**。

## 建议

**建议先以 dsh-pet 整模块接管桌宠子系统，再接整套主题的场景编排；本轮不建议用 Phaser 全面重做桌宠。** 理由是它已提供不限于固定 12 槽的动画池、移动节奏、物理、睡眠段落、工作状态、播放回执及原生窗口。本次确实复用了这些实现，旧宠物播放器和行为系统可以退出生产路径，不以保留旧代码为前提。

Phaser 是更强的通用场景渲染基础：角色和书/杯直接放在同一 Container，随位置、缩放、层级共同变化；Scene、Video/Sprite、Tween、Input 和销毁能力已实际使用。如果下一阶段把复杂区域互动、多角色遮挡、连续道具变换作为核心需求，它更合适。但桌宠自主选择、DSH 事件语义、用户优先、恢复意图、原生窗口和旧配置兼容，仍需我们接入或从 dsh-pet 抽取，不能算成 Phaser 已提供。

两者单独都不等于完整“沉浸式主题产品”，也不会替作者制作连贯步态、可独立组合的肢体与道具。本轮只证明代表场景机制，坐姿和正式人物质量另验。推荐先让主控实跑下述两个首选路径，再决定正式替换范围。

**正式迁移前另有一项回执门槛**：本轮 dsh-pet 的 walk/run 实际画面与位移已完成，但其 API 播放记录为 `failed`、`reason=busy`；react/look 为 `ended`。这说明不能直接把目前的移动类 API 回执当作“过去实际执行”的可靠依据。差异来自适配方式、调用时序还是上游规则，尚未归因。本轮保留此问题交主控判断，不为完成对比而修改上游，也不宣称所有控制合同已验收。

## 固定输入与可重跑入口

| 项目 | 固定版本/来源 | 许可及本次使用 |
| --- | --- | --- |
| dsh-pet | npm 0.4.1；Git `51c3395d9e175d80fd7e29c6864da3747ebfe209` | 代码 MIT；README 对素材及衍生署名另有约定。公平预览未使用其人物动画和随包字体。 |
| Phaser | npm 4.2.1；gitHead `41be1e462bc600064e498cba370bfa8c5c055a22` | MIT，使用正式发行的 `phaser.min.js`。 |
| 公共运行时 | Electron 45.2.1、Node 24.14.0、1120×820 窗口 | 两个独立 App、独立 userData，同一套已核对的 Electron。 |
| 角色输入 | 本项目旧 idle/walk/run/react/sleep/wake/look 片段 | 两端使用同一转换结果与帧序列；保留原素材限制，不作正式美术/商业授权结论。 |
| 道具 | 实验自绘 book.svg、cup.svg | 独立文件；不烘焙进人物视频。 |

上游依据：[dsh-pet 固定源码](https://github.com/PC2005-cloud/dsh-pet/tree/51c3395d9e175d80fd7e29c6864da3747ebfe209)、[MIT](https://github.com/PC2005-cloud/dsh-pet/blob/51c3395d9e175d80fd7e29c6864da3747ebfe209/LICENSE)、[素材与署名约定](https://github.com/PC2005-cloud/dsh-pet/blob/51c3395d9e175d80fd7e29c6864da3747ebfe209/README.md)、[Phaser 固定源码](https://github.com/phaserjs/phaser/tree/41be1e462bc600064e498cba370bfa8c5c055a22)、[Phaser Video API](https://docs.phaser.io/api-documentation/class/gameobjects-video)。

所有原型源码在 `experiments/pet-engine-comparison/`，完整上游、依赖、转换媒体、App 和临时资料在 `.local/pet-engine-comparison-20261104/`。根依赖未增加。固定依赖及完整性摘要见 `upstream-lock.json`、`dependency-lock.json`。

从项目根目录执行：

```sh
# 已准备好缓存时，直接从下面的 run 开始即可。
node experiments/pet-engine-comparison/setup.mjs

# 一个回环实验服务，附带上游 standalone host；不访问模型或云服务。
node experiments/pet-engine-comparison/run.mjs

# 两个终端分别运行，可单独退出/重开，互不依赖另一端的页面。
node experiments/pet-engine-comparison/launch.mjs dsh
node experiments/pet-engine-comparison/launch.mjs phaser
```

两个可操作窗口：`local.dsh.engine-comparison.dshpet`、`local.dsh.engine-comparison.phaser`。实时地址见 `.local/pet-engine-comparison-20261104/runtime.json` 的 `urls`；选择 Phaser 时默认走 Video。帧图备选仅需在其网页地址追加 `&media=frames`。页面均有整段重播、单步动作、工作开始/结束、用户回应、添加动作/道具、停止及重新应用按钮。实验 Host 与页面应一起保留；它们和主控管理的 F1/dev.20 预览没有共享配置。

## 实际跑过的同一段旅程

主题与角色一起出现 → 右向慢走 → 左向小跑 → 坐姿开始/循环与书 → 工作状态打断、结束后恢复 → 用户回应打断、恢复 → 新增 look 与杯子 → 停止清理 → 换主题重新进入。

首选证据：`reports/pet-engine-comparison-2026-11-04/dsh-preferred-accepted-run.json`、`phaser-preferred-accepted-run.json`；原帧图及初步接缝记录另存，没有替代首选结果。角色运动读数来自 dsh-pet 的姿态/播放进度接口和 Phaser 对象，非只看按钮文字。

这里的“旅程完成”指观测到的动作、位移、恢复及清理；API 回执可靠性单列在 `upstream-playback-receipts.json` 和 `verification.json.playbackReceiptGate`。曾在仅核对回执可读取后生成的首版审查摘要已保留为 `*-r1.json`，最终摘要明确为 `completed-with-findings`。

| 检查 | dsh-pet | Phaser Video |
| --- | --- | --- |
| 慢走 | 视频时间推进，朝右，位移约 254 px | 同一片段，朝右，位移约 255 px |
| 小跑 | 视频时间推进，朝左，回程约 363 px | 同一片段，朝左，回程约 364 px |
| 坐姿/循环 | 上游 sleep 的 start/loop/end；书单独跟随 pose | Video 切段；书为 Container 子对象 |
| 工作/用户打断 | 实际进入退出段及 react，再恢复坐姿和书 | 同样的退出节奏、回应与恢复 |
| 新动作/道具 | 增加池内 look，重读配置；杯子为外部组合层 | Loader 动态加 look 和杯子纹理 |
| 停止/换肤 | React 卸载后 pose reader、视频节点为零，再应用一套 | Game 销毁后 canvas/角色为零，再创建一套 |

步态素材本身有连续动作帧，并同时采样到位移；没有把静态图片横移写成走/跑。坐姿取旧睡眠序列，带睡眠表情，只用来检验段落和道具组合，**不是正式读书演出，也未验证手持/骨骼绑定**。

本地工作按钮经上游 `work-status` API 或 Phaser 适配进入角色；用户回应也实际打断当前意图。没有真实模型调用，没有把这些按钮注入称为目标 DSH 的真实会话验收。上游原有 DSH 会话监听器可复用，正式接入仍需核对目标 DSH 版本及实际事件。

## 真实复用与维护边界

| 部分 | dsh-pet 方案 | Phaser 方案 |
| --- | --- | --- |
| 角色渲染 | 上游 `makePetUI`，完整 PetCard、双缓冲、动画/睡眠驱动 | 原生 Scene + Video；备选 Sprite + AnimationState |
| 位移/方向 | 上游 moves、motion、物理与朝向 | TweenManager、flipX；目标和节奏适配由本实验提供 |
| 自主行为 | 上游随机池、权重、边界、睡眠等已有实现 | 本轮未另造随机行为/物理；Phaser 本身不提供桌宠业务 |
| 原生能力 | 官方 `lib/app.js` 连同服务、鉴权、透明窗口、托盘/输入代码实际运行 | 本轮为普通 Electron 里的场景；未实现桌宠原生窗口管理 |
| 外部控制 | 真实 lock/anim/position/work-status API，pose/progress 读法及播放回执 | 本实验适配器调用标准对象 API |
| 场景道具 | 使用 pose 接独立 HTML 道具；原生同窗道具扩展尚未实现 | Container 自带父子变换、层级及独立子对象 |
| 本方业务 | 主题入口、工作意图与恢复、授权/配置迁移仍要负责 | 同样要负责，另需自主行为及原生适配 |

dsh-pet 的前端依赖图涉及 173 个上游模块，**119 个实际进入输出，287,324 字节上游实现进入未压缩产物**，清单见 `reuse-and-size.json` / `verification.json`。不能把所有模块都算成已逐功能验收；本轮执行的是表内旅程。上游业务源码补丁数为 **0**。本方 dsh 适配约 5.7 KB，Phaser 适配约 7.1 KB，公共旅程/观测约 7.3 KB；这些是实际文件量，不是“节省百分比”，也不是生产迁移工作量。

上游合同见 [HTTP API](https://github.com/PC2005-cloud/dsh-pet/blob/51c3395d9e175d80fd7e29c6864da3747ebfe209/API.md)、[Cordis pose/progress](https://github.com/PC2005-cloud/dsh-pet/blob/51c3395d9e175d80fd7e29c6864da3747ebfe209/CORDIS.md)。实际接缝有三处：控制调用需带 `surface=web`；睡眠退出有异步尾段，恢复前须用进度确认尾段结束；同一 Video key 重播应显式 play，不能只 changeSource。均已在实验适配中处理，没有修改上游实现。后续快速连续输入暴露的旧 wake 等待超时，也已用命令及生命周期当前性检查隔离；原混合记录保留，不归因于主控或上游。完成瞬间自动存档一段旅程，避免后续输入混入该段结论。

最现实的整模块方案是由我们的插件入口协调 dsh-pet，使用其 pet pack/配置和公开控制服务，统一管理默认值、授权及停用；上游设置/聊天等重复入口需要收敛。本次“完整原生 App”证明整模块能独立工作，**不证明它已作为插件装入目标 DSH 并完成兼容验收**。

抽核心也可行：本实验已经把上游 React 宠物及共享层直接打包，外接其原版 Host。若连 Host 也抽掉，就要接管其 state/lock/playback/config 契约，维护成本明显增加；不建议只抄播放器后重写全部服务。纯 motion/physics/work-status 可作为 Phaser 的复用候选，但本轮 Phaser 未接入这些模块，不把它们记为已完成。内部 TS 工厂路径不是稳定公共 API；升级时须重跑本旅程、类型构建和清理检查。整模块升级主要核对公开 API/配置差异，抽核心还要跟踪内部模块及构建变化。

## 代表性资源样本

同一台 Mac ARM64、相同 Electron 45.2.1、同为 1120×820 工作台、相同 WebM、系统字体，关闭后台节流。媒体使用上游默认 `max-age=3600`，Phaser 同口径。每端空闲循环取约 1 秒间隔的 6 份快照；CPU 去掉首份预热读数。此前包含上游默认字体、实验 no-store 的结果另存，**不混入本表**。采样后只补了实验按钮取消守卫和完成时存档；引擎、媒体与闲置循环未变，未再重复资源采样。

| 口径 | dsh-pet 网页工作台 | Phaser Video 网页工作台 |
| --- | ---: | ---: |
| Electron 进程数 | 4 | 4 |
| 进程启动至页面可用，单次暖 OS 缓存 | 1,186 ms | 1,255 ms |
| UI 模块开始至可用 | 228 ms | 283 ms |
| Electron working-set 相加中位数 | 285.4 MiB | 262.3 MiB |
| 样本范围 | 283.7–287.0 MiB | 258.1–276.6 MiB |
| Electron 各进程 CPU 百分比之和，均值 | 1.08% | 3.34% |

该表只包含各自 Browser/GPU/Utility/Tab，未包含公共静态实验服务和启动脚本。dsh-pet 网页方案另有上游 standalone Node Host：同期 `ps` RSS 点值约 21.3 MiB；公共实验服务约 25.6 MiB。上游 Host 启动到配置可读另测为 421 ms，与页面计时起点不同。RSS 包含共享页，受系统回收影响，不能当独占内存或峰值；本轮未做长期压力或统计显著性测试，不能只按此表选型。

**原生完整 App 为另一口径**：官方 `lib/app.js` 同进程承载 Host 和原生窗口，另有 GPU/Utility/Tab，空闲单点约 369.5 MiB。窗口为 840×747 的透明承载区，没有工作台内容。这个数不能直接与上表的“网页前端、不含 Host”评胜负。记录在 `native-whole-app-*.json`。

包体也分清范围：

- 公平输入 WebM 合计 **349,668 字节**；两端相同。Phaser Video 不要求额外帧图。
- 原型实际发送的引擎前端 JS：dsh-pet/React 550,346 字节；Phaser 正式 min 文件加适配 1,384,291 字节。前者原型未压缩，后者主库是发行 min；同一压缩口径的计算值见 `verification.json`，不把不同构建形式当必然差距。
- 完整 npm 解包约 dsh-pet **74.20 MB**、Phaser **112.53 MB**，含默认素材/文档/源文件，不能与上面的浏览器运行文件混比。dsh-pet lib 约 5.69 MB、native-helper 0.46 MB；完整独立 Host 还安装 OpenAI/Anthropic 等依赖，不能只报前端文件。
- Electron 二进制是两端公共基座，未新打发行包。若正式用 Phaser 定制构建或裁剪 dsh-pet，需重新测量；本轮没把未完成裁剪算作收益。

## 一次新增动作与道具的实际过程

新增 look 取已有片段，设定区间并转换为同一 WebM；杯子独立绘为 SVG。dsh-pet 在动画池追加名字、将文件放入自己的动画目录并重读成品配置，真实调用 anim 后显示杯子。Phaser Video 通过 Loader 加同一视频与 SVG，创建子对象、调用 Video 播放；无需修改运动或渲染底层。

备选帧图流程也实际执行：同一视频解为 12 fps PNG，拼成每张 8 列的 sheet，交 AnimationState 使用。8 个动作完整转换共约 **6.15 秒**，额外 sheet 共 **5,553,423 字节**。这是可编辑帧动画路径的实际成本，不是 Phaser 的必需迁移成本。原始连续动作、人物一致性、自然循环点、坐姿/手持道具的制作成本都仍在作者侧，不能从一次裁片的几秒推算正式动作美术工期。

## 正式迁移清单

| 现有责任 | dsh-pet 整模块 | Phaser Video |
| --- | --- | --- |
| 现有皮肤/媒体 | 生成 pet pack/动画池映射；内容标识进入资源路径，保留原始包 | 生成视频/场景配置，保留内容标识及资源校验 |
| 0.7.1 及几何 | 362×362 等非 16:9 输入须核对留白、脚线和尺寸换算；本轮未验完整兼容 | 视频可直接用，但需按实际纵横比 fit；本轮同为 16:9 片段，未验完整旧包 |
| 默认值/用户覆盖 | 皮肤级偏好映射至上游配置，处理其自行保存设置与统一入口的归属 | 我方维护内容默认值和用户覆盖；Phaser 不提供这层业务 |
| 停止/恢复/换肤 | 接上游锁、卸载和回执；整套主题提交及失败恢复仍需统一 owner | Scene/Game 生命周期可直接用；整套提交、代次和恢复仍需实现/保留合同 |
| DSH 工作状态 | 复用上游 session-watch/work-status-bridge，核对当前宿主事件与作用域 | 接同一事件；可再抽上游状态归纳，当前只做本地注入 |
| 桌宠模型互动 | 可使用上游聊天或保留薄业务适配；需逐项对齐人设、历史、实际执行回执与取消语义 | 不提供模型/人设/历史；需同类业务适配 |
| 原生窗口/穿透 | 由上游 helper 承接，窗口已实跑；物理点击穿透仍待验收 | 复用现有或上游窗口模块再适配 Phaser；本轮未实现 |
| 动作/道具扩展 | 配置池不限固定 12 槽；网页独立道具已跑，原生同窗道具需扩展 | 原生 Container/层级/输入可复用；自主行为和角色状态编排仍需接入 |
| 授权/启动动画 | 仍由产品入口负责；dsh-pet 不能替代整套主题授权或已验启动交接 | 同左 |

可替换/移除的旧生产职责包括：旧 PetBehavior 的自主/移动/拖拽物理、旧 pet 页面播放器及命中处理、NativeSkinRuntime 的宠物执行路径、原生宠物适配和固定 12 槽限制。设计预览和历史证据保留。`runtime-src/main.mjs` 同时承载启动与授权等职责，不能整文件删掉；须先剥离这些必要职责。现协调器可以替换，但一套主题跨模块选择、停止优先、偏好保留和失败恢复这些产品合同仍需要某处承担，不能因引入引擎消失。

配置不能仅按同名字段搬迁：现 `allowSpeech` 是文字回应许可，不等于上游的语音开关；`smartEnabled`、模型选择、历史条数、动作许可及按皮肤隔离也须逐项核对。新方案走完一次旧内容导入、停止/恢复和失败回退前，保留旧执行路径及原皮肤包，按开关选择引擎；回退恢复旧配置，不覆写原素材。

移动类回执差异关闭前，不把该方案接入模型执行历史或生产切换确认。工期范围假设该差异可在适配核对中关闭；若需要修改上游核心，应先重新估算。

实际已完成的是两个交互原型、同素材两种媒体路径、官方原生 App、资源样本及源码复用核对。剩余主要工作为：目标 DSH 整插件接入、统一入口/授权、配置迁移、旧包几何兼容、原生输入/道具适配、整套事务与回退验收。以 Mac、现有视频内容、一个正式场景、复用现有授权/启动能力为前提，dsh-pet 整模块迁移粗估 **5–9 人日**；Phaser 加桌宠行为/窗口及同等兼容粗估 **7–12 人日**。这些范围未含正式美术、骨骼加工、创作编辑器、市场、Windows 或新模型服务；目标 DSH API 的适配偏差会改变估算。抽核心不预设比整模块更便宜。

## 已测、未测与下一门槛

已测：两端首选 WebM 路径、一次帧图备选、位置/方向/进度、段落/循环、独立道具、显式工作与用户打断及恢复、清理/重建；dsh-pet 官方原生 App 的可见置顶窗口与真实视频。没有改上游业务源码。原生观测到 ignoreMouseEvents=true，**未取得充分的实际物理点击穿透/命中验收**，不作通过结论。

未测：真实 DSH 会话联动和模型、完整 0.7.1/0.7.2 内容兼容、跨屏拖抛/点击穿透、原生同窗道具、完整授权/安装迁移、高负载/长期资源、爬行及全部坐躺组合。不得以源码存在或一次演示替代这些结论。

初期适配失败保留在原记录中：遗漏 surface 参数产生 bad-request；过早恢复遇到上游退出尾段；CLI 直接接桌面页遇到鉴权 403，后改用上游官方 App 入口；Phaser 同 key changeSource 不重播，已改显式 play。它们说明实际适配边界，不混作最终路径失败或已验证的生产缺陷。

本节点最终清单及摘要见 `source-freeze.json`、`verification.json`、`summary.json`。F1 原/新冻结、准确 0.7.1、独立 0.7.2、旧压缩包均核对保留。产品源、主控保留预览及日用 DSH 没有修改；没有新 tgz、commit/push、发布或真实模型调用。交主控实跑与复核后再安排迁移。
