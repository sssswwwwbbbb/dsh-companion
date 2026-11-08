# 整支 dsh-pet 接入隔离 DSH Host

**H1–H3 已经主控复审关闭；H4 生命周期就绪判定已作最后一处修正，等待主控确认，整体仍未通过 GUI 验收。** 初轮 10 项单测、官方 Host 14 项接口、手动 startup 3 项，以及兼容修补的 11 项实际 Host 接口和四种真正冷启动证据原样保留。本次仅将初次 apply 实际播放等待与后续生命周期健康分开，新增一项既有三帧快照与实际 Host maintain 回归，定向测试 11/11。此前新 Host 冻结版本的真人拖动与书杯跟随已获主控确认，不补记旧 geometry、头像旧框外命中或整体验收通过。最新短回执为 `reports/dsh-pet-host-2026-11-04/compatibility/h4-lifecycle/receipt.json`。

当前使用新的私有副本 `.local/dsh-pet-host-20261104/staging` 与独立 profile `host-home/profiles/pet`。为避免相同人物重叠，已按主控许可正常退出旧 geometry 的 native/console/私有服务；全部源码、冻结、失败报告和本次旧实例零事件记录保留，见旧报告的 `retirement.json`。比较、F1/dev20、维护源、内置包、日用 DSH 和正式授权配置未操作。没有 commit、push、tgz、发布或部署。

## 接入范围

沿用现有 CompanionController、SkinCoordinator、NativePetAdapter、NativeSkinRuntime 与配置/皮肤库。由 NativeSkinRuntime 的 apply/isReady/hide/workAction 接缝接入一整支固定 **dsh-pet 0.4.1 / 51c3395d9e175d80fd7e29c6864da3747ebfe209**。适配层没有重写上游播放、运动、选择器或物理。

新 supervisor 入口不导入或构造旧 PetBehavior，不创建旧 pet 窗口、不加载 pet.html、不注册旧命中/拖动 IPC，也不安装 33ms 运动 tick。唯一保留的 supervisor 窗口是原 startup 窗口。旧 pet 文件仍随标准构建拷贝，执行入口不再引用；静态位置和责任证据见 `replaced-responsibilities.json`，实际进程清理检查见接口报告。

进程归属为官方 Host → 现有 Controller → 私有 supervisor → 单个整支 dsh-pet backend。backend 的 profile、appData、DSH_HOME 和媒体全部位于新私有状态目录。模块退出、皮肤停止和插件停用等待 backend 窗口为零及主进程退出，再返回 cleared；backend 也监视 supervisor 存活。上游 Electron 的渲染/GPU 子进程随所属 app 退出。

apply 等到实际前台视频播放、道具加载和主进程收到内容命中区域，再给 ready。动作回执关联真实 playbackId，工作反馈等待动作实际开始；迟到 apply/工作结果受 generation、contentKey、局部 revision 和停止门闩拦截。原 Host、授权、停止优先、theme 与 startup 事务继续使用现有路径。

## 两个内容身份

| 内容 | 原始身份及接入方式 |
| --- | --- |
| 准确 0.7.1 | key `4b643de142bb2770340cd56d7c2acd5bced3b09a69ddbf27cd3025d29639620b`；原包、清单、默认值与原媒体不改，执行时用已审派生及固定几何表映射，默认 size 367 |
| 母版04私有候选 | `archive-master04-private` / 0.1.0，key `91868bb3a32505e87ef0a866ef62bd0e61f139cbb3324bc596ee6e200bfb8abf`；独立清单及资源，默认 size 685，独立书杯各一件 |

新候选继续用现有 formatVersion 2 与 pet configVersion 2 字段：animations、canvasHeight、canvasOffsetY、size、动作说明和互动权限。theme 与 startup 复用已有档案资源；工作反馈设置使用已有 theme configVersion 2 字段。候选清单和全部资源经过原 loadSkin/prepareResources、SHA、字节数及类型验证，native apply 再验证操作与资源身份。

现有美术 manifest/layout 与 geometry fixture 没有被直接宣布为通用运行合同。`config/pet-backend-map.json` 是适配器持有、仅绑定上述两个内容 key 的私有转换表，列明派生媒体哈希、固定 Alpha/脚线几何、manifest 道具资产及地面锚点。使用前检查内容绑定、有限坐标、Alpha 行范围、媒体路径和道具资产引用；未知内容在 prepare 阶段拒绝。**schema 未加字段不等于通用皮肤转换、作者能力或通用导入器已完成。**

大小沿原皮肤设置入口映射为默认原生尺寸 × 百分比，80% 为 548；模块开关沿原 disable 接口。旧 canvasOffsetY=10 等默认值原样保存，本次固定归一脚线映射不代表任意旧渲染器像素语义已迁移。新人物仅呼吸循环与侧头回应，未接新步态或五档节奏。书杯沿用已审场景地面锚点，不宣称手持。

## 已完成证据

| 结果 | 证据 |
| --- | --- |
| 等待异步 ready/cleared、拒绝停止后的迟到结果、工作去重、转换数据边界，10/10 | `targeted-tests.tap` |
| 官方 runProfile 实际加载暂存插件，14/14 接口/生命周期结果 | `official-host-verification.json` |
| 选新皮肤后实际一窗两道具、685/548、有限回应至 ended、切原071为367且无旧道具 | `master-native-ready.json`、`legacy-native-ready.json`、native telemetry |
| 现有 skinPage → WorkFeedback → /skin/work → 实际原生 react | 接口报告与 telemetry；**工作 packet 为受控本地注入，不是真人当前会话验收** |
| 模块/皮肤停止实际零窗；官方 pluginManager 停用后 supervisor/backend 退出，启用恢复 | 接口报告的进程存活断言与 native telemetry |
| 旧 startup 视频就绪时宠物暂停，完整结束后恢复一窗两道具，3/3 | `startup-interface-verification.json`、`startup-native-playing.json`、`startup-native-returned.json` |
| 完整官方 Host client 已加载，实际 Page mailbox 已连接当前候选 | `official-client-connection.json`；无自造配置/诊断界面，未做 GUI 实点 |

官方 Host 在 Node 模式下使用安装版 SDK 的公共 profile 启动接口；接口检查的 Page ack 和工作 packet 均显式标为受控注入。最后已停止注入轮询，保留完整官方 Host client 的真实连接。真人点击、视觉和拖动没有因接口或页面连接通过而补记通过。

授权复用已有非云端工作流的本地测试签名凭据及原校验代码，仅复制到新 profile；不签发、不激活、不复制生产用户凭据。测试仅本地互动，未调用外部模型。准确071在本私有 profile 以现有偏好入口保存 smartEnabled=false、allowSpeech=false，原内容默认不改。MVP 文字气泡映射未接入，当前本地互动关闭说话；不将此节点描述为完整互动能力迁移。

## 实际改动与保留失败

主控初审确认整支旧宠物退出、28/125 冻结及原定向结果成立，但因四处兼容入口问题退回。本次只修这四项：

| 项 | 私有修补与定向验证 |
| --- | --- |
| H1 冷启动自动开场 | Controller 保留原启动请求至首次启动，native 读取原环境标记并检查 autoStart/startupEnabled、停止和模块门闩。开场 pending/playing 时，新建宠物窗口先受管隐藏，实际解码就绪可回执，影片结束才释放显示。真实冷启动还暴露恢复等待在解码前估算截止点过早；私有 skins.restorePage 改在既有 20 秒阶段预算内等实际完成，保留身份/停止条件。正常冷启动 168 份开场采样、宠物露出 0 次；关闭自动播放、已停止、模块关闭三种新 Host 冷启动均不播放。没有调用 replayIntro 代替。 |
| H2 ZIP 入口 | 恢复原 /skin/library/choose、ZIP 过滤、取消与选文件合同。通过原 Controller → picker route → SkinLibrary 验证私有候选 ZIP；取消/选择结果是显式接口注入，实际 OS picker 仍待可视验收。测试文件已移除，正常入口使用原生 dialog。 |
| H3 动作开关热更新 | 原生点击只送受信意图，不再持有 apply 时的 allowActions；Host 用当前 generation/contentKey/偏好检查。false 应用后打开，同 PID/窗口能真正开始本地 react；再次关闭不执行，旧 generation 拒绝。检查用受控 native-intent packet，未冒充真人点击。 |
| H4 唯一管理 owner | managed native 禁用整套未接 Host 的上游右键管理菜单，tray=false，独立 app menu 关闭。初次 apply 仍等待真实播放、道具和命中区；就绪后的健康检查关注活进程、窗口、可视及道具结构，正常片尾暂停不判丢失，显式 startup suspension/hold 仍区分处理。实际注入非预期零窗时 ready 变 false，Host 原入口可恢复。 |

本轮新增证据位于 `compatibility/targeted-tests.tap`、`host-interfaces.json`、`cold-enabled.json`、`cold-startup-off.json`、`cold-stopped.json`、`cold-module-off.json` 与对应冷启动 trace。前版源/运行文件及原 14/3 报告已完整保存于 `compatibility/before/`。新的 `compatibility-only.patch` 给出相对此冻结版本的必要增量，完整相对 canonical 差异也在该目录。

最后一次 H4 复审指出有限 idle 片尾的正常换片间隙可能被误判丢失。保留原 34/126 冻结和文件于 `compatibility/h4-lifecycle/before/`；直接固定原生时刻 1793805423648、1793805423749、1793805423850 三份快照。旧函数结果 true→false→true；新生命周期函数保持 true→true→true，实际 Host maintain 不写 unavailable，零窗/退出仍失效。只移除后续健康对单份 paused 的要求，初次 apply 等待完全不动；没有加去抖、看门狗或重跑冷启动/拖动矩阵。

真人拖动补充索引为 `manual-input-readonly-2026-11-04T15-12-17.627Z/physical-drag-proof.json`，主控回执 `primary-review/manual-drag-review.json`。本次输入实际落在新 Host backend：人物及书杯世界坐标同移 [+567,-44]、两道具 local box 不变，错误为空；不归给旧 geometry，也不推断此前空输入的原因。修补没有改几何 mask、pointer drag/物理输入链；`compatibility/drag-path-integrity.json` 列出字节核对。点击意图和原生菜单是本轮变化范围，真人点击仍待验。

`compatibility/canonical-differences.json` 与 `canonical-to-private.patch` 给出 staging 相对维护源的实际差异。必要实现集中在 supervisor 入口、NativeSkinRuntime awaitable 回调、原工作执行回执、native 预检绑定、Controller 的私有 backend 环境/停止等待和上述冷启动恢复等待；新 backend/锁/固定转换校验由适配器持有。测试授权配置、独立应用标识和 profile 属夹具差异。标准 build-client/build-mac 只在 staging 执行，canonical core 是 packages/dsh-skin-core，复制产物没有被当主源编辑。

`compatibility/dsh-pet-native.patch` / `upstream-patch-cost.json` 列出相对固定上游的实际补丁：复用已审内容/命中接缝，另加窄的 native click intent preload IPC 与 managed 菜单守卫。点击经现有 PetInteraction 权限与本地模式再执行，不注入全局 Agent 事件。人物/道具同窗；现有 Session 反馈 producer、theme 和 startup 入口复用。

保留了首次 Host 导入的重复插入、测试配置字段遗漏、就绪探针类名、插件重启后的注入 Page 重新登记，以及开场封面先就绪导致等待条件过早的失败。索引见 `failure-index.json`；原记录为 `host-start-failure.json`、私有 `host-start.log`、`official-host-verification-before-*.json`、`startup-interface-before-*.json` 及 host-events。它们不算通过，也没有被解释为引擎或用户错误。旧 geometry 的 buttons 异常、零事件、原位置和锁屏记录保持原文件不动。

## 审查与后续实点

最新受影响冻结位于 `compatibility/h4-lifecycle/source-freeze.json`、`runtime-freeze.json`，原 `compatibility/` 及初版冻结不覆盖。运行版本恢复完整官方 client 后保留供主控审查，不追加机制。

当前恢复入口为 `.local/dsh-pet-host-20261104/host-runtime.json`（包含私有鉴权 URL，不外发）。完整官方 Host 界面应用 `local.dsh.pet-host.ui`，新人物应用 `local.dsh.pet-host.backend`，supervisor 为 `local.dsh.pet-host.supervisor`；PID 与新状态目录见 handoff 索引。与保留中的旧 `local.dsh.pet-geometry.native` 明确区分，不操作旧实例。

待主控独立代码/证据审查后，再统一补官方界面选择/设置、真实人物点击回应、当前会话反馈、原生文件选择器与修后旧框外头像命中。本次已被确认的真人拖动/道具跟随不重复采集；旧 geometry 历史待验记录保留且实例已退出，后续只认新 Host 一个真人验收目标。不重复请求解锁，不将锁屏时资源/接口检查记为真人验收。
