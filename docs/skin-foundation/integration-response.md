# 对首套皮肤需求的阶段回应

日期 2026-11-03，首次读取 `designs/dsh-skin-v1/integration-needs.md` 后更新。

- **合同和样例已可消费**：共享合同 v0.1 已冻结 M0 字段；`packages/dsh-skin-core/examples/{a,b}/skin.json` 是实际合法包。运行 `node packages/dsh-skin-core/scripts/check.mjs <包目录>` 会校验清单、模块及资源字节。不是上传或市场工具。
- **主题**：71 项已核对颜色 token 目录在 `packages/dsh-skin-core/src/theme-tokens.json`。仅该目录、hex light/dark 对；跟随宿主模式，不强制切换用户偏好。字体、字号不覆盖，以保留用户可读性偏好；任意 CSS、图标替换未开放。
- **静态背景**：PNG/JPEG/WebP 资源；theme.config.background 为逻辑 ID，backgroundOpacity 为 0–0.15。尚不提供分区遮罩/正文静区的结构选择器。建议首包先只用 token，或低透明度自带背景并在隔离宿主检查文字对比。设置 backgroundOpacity=0 可关闭。SVG 需先由本线转成 PNG/WebP，不能当作受支持运行资源。
- **桌宠**：pet.config.builtinPack=`whale-maid-demo` 复用原有 12 动作。新 animations 可按合同全部声明资源；第一轮不要求复制原素材。大小与活动设置由皮肤公开声明，原生进程复用现有行为。未提供动作裁剪或 300ms 新片段承诺。
- **工作完成反馈**：未接入真实会话结果事件；请继续仅模拟，不加入可运行 settings。需要单独确认会话边界、事件源和去重合同后扩展模块。
- **扫描开场**：本轮新皮肤格式没有 startup 模块。既有 dev.11 开场功能保留，不会因为应用皮肤而播放；未将上游扫描片加入包。
- **减少动态**：当前只可关闭 autonomous/followMouse 或整个桌宠；不提供把现有视频自动替换为静态角色的能力。该需求尚需静态资源/模块扩展，不能在当前合同声明后声称已支持。
- **状态和恢复**：未声明隐藏，USER_DISABLED 与 SKIN_CAPABILITY_UNAVAILABLE 分开；停止及重置为常驻入口。官方主题 API 与管理页隔离已在源码确认，实际可见恢复正在隔离宿主验证。

本回应不修改皮肤线文件。后续变动仍以共享合同和实际报告为准。

## M2 实际消费回执

底座线已在隔离官方 Host＋官方 Web 客户端＋现有原生 Electron 中消费 `archive-warm-whale/0.1.0`，摘要 `ffe29076773d8f17b3c90d0794f14ca54ce69844d4b4a8948791f68ae45471d5`。23 项整体联调与 5 项新进程启动回归通过。46 个 token 由页面执行器读回，背景、明暗、0 值、管理页撤下、停止及重载恢复已有实际证据。见 `reports/skin-foundation/isolated-host.json`、`cold-regression.json` 和 `docs/skin-foundation/implementation-report.md`。

可共同引用截图 `reports/skin-foundation/official-first-skin.png` / `official-first-skin-dark.png` / `official-small-window.png`。操作者为底座线；仅隔离环境，不是用户真实桌面或完整业务验收。代码块、表格、菜单错误/选中文字的逐项对比度、160px 到 100% 几何对应、多屏及真实托盘点击仍未验。当前背景是 PNG 自带中央透明区，无 DOM 区域裁剪能力。

## R3 五字段接入 / 2026-11-03

主控 F1/F2/F3 独立复验已通过。底座线已消费 `content/archive-warm-whale-config-r3/0.3.0`，摘要 `ef6bbde97e958fc11fd7e25b09d221ac2a9a7cb99a150968f7135514016a6b7f`，9 项新增范围的受控检查通过。背景浓度、大小、profile、自主、跟随均到达实际宿主；自主通过生产定时器与固定随机数观察，跟随通过实际原生移动与受控坐标观察；没有移动用户真实鼠标。停止、重置、恢复、覆写切换与重载也已验证。仍是历史 builtin 角色，新 R2 角色脚底/动画未验。

共享回执：`docs/skin-foundation/r3-integration-2026-11-03.md`；证据：`reports/skin-foundation-r3-2026-11-03/integration.json`。未改公开合同或生产运行能力，也未无变化重跑旧 62/GUI 矩阵。

模型决策方向的接口回应在 `docs/skin-foundation/model-decision-interface-audit-2026-11-03.md`：可以复用现有动作/气泡、本地行为及官方 tools/llm/Session 接缝；动态短句、模型可用动作子集、情景来源与控制范围仍需模块适配和方案收敛。本轮只读核对，没有注册新工具或发起模型调用，不预建通用 Agent 平台。

## M3 / R4 配置接缝

主控已确认 M3 交接，进入实现候选。新增字段、模型目录、输入与实际执行回执已定型于 `docs/skin-foundation/pet-interaction-contract-m3.md`。使用 pet 模块可选扩展：smartEnabled、persona、modelSelection、historyRounds、allowSpeech、allowActions；固定 actionDescriptions/localReply 来自本套。R4 的 mode、memoryRounds、allowSpeak 可分别映射前三述字段；不要求原型依赖运行接口，也不覆盖 R3 交付。完整合法声明在 examples/interaction/skin.json。当前模型取官方 DSH 默认模型，不读取无关工作会话；真实调用、受控适配和原生验证的结果将在单独 M3 报告标明。

## M4 0.4.0 与 A1 子集

主控已独立放行 M3＋F1。0.4.0 内容摘要 ec56e56e5a100fb7b4cd2eff180e30b5055caacd54e8f3d173da020b5150e0a1 已完成本套11字段及两轮官方服务夹具接入，第二轮携带第一轮实际react并执行stretch；证据 reports/skin-foundation-m4-2026-11-03/content-0.4.0.json。仍为历史builtin媒体，独立于A1。

A1 实际接口已定型：pet interfaceVersion1/configVersion2，animations只给idle/react（idle必需），整个集合替换，不继承旧角色缺失槽。旧configVersion1及完整包保留。可固定canvasHeight195、size100得到约180px角色，实际原生试播中核对；没有复杂锚点。缺walk不公开followMouse，缺完整12槽不公开autonomous，均可固定false。完整字段示例和回退见 pet-animation-subset-contract-m4.md。请内容线据此形成独立候选，不覆盖0.4.0或A1来源；原生模型/菜单/本地共用实际就绪能力。模块线可先用自己的隔离夹具继续试播。

A1首次原生测量补充：canvasHeight195/size100实际角色约178–180px，脚底原有约12px留空。现增加固定canvasOffsetY（-40–40，默认0），A1候选请用12；为本次实测后的简单位移，不是新锚点体系。正式定向结果继续单列。

0.5.1正式校准候选 67176949bdad17c93a06610d8bf514abf133d6cc3232da651e475b6e1b92c9de 已通过本线6项原生定向检查：实际idle/react、约177–180.5px、脚底0–0.5px、回应回idle、无旧角色混播、新旧切换及停止恢复。报告 m4-native-integration-2026-11-03.md；证据 reports/skin-foundation-m4-2026-11-03/a1-0.5.1/。当前待主控独立审核，真实模型和最终美术仍分开；可见发丝/边缘噪点保留原生截图供内容线定向优化。
