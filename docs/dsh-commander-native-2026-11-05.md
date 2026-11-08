# 机械姬 × 指挥官 · 真实 DSH 私有接入

主控已完成工作区主题与桌宠的功能复核，无机制阻断。本次只修正文阅读层，提交视觉补审。当前仅声明 **theme＋pet**：原导航、Session、消息、过程/回执、输入与资料继续由 DSH 管理，机械姬只在同母版陪伴位提供状态回应。本轮没有接入新过场或声音，没有改日用安装、提交、打包或发布。

![正文阅读层修正后的真实桌面](<<本机路径>/reports/dsh-commander-native-2026-11-05/surface-fix/reading-after-review.png>)

上图为本次修正后的真实正文截图。正文现在与工作区头部使用同一 `--surface`，导航继续 `--paper`，输入原背景保持不变；只在现有 rc.5 `.kiGsTW_scrollBody` 增加 `background:var(--surface)`。主控 before 图、前版文件和冻结回执保留在 `primary-review/` 与 `before-surface-fix/`；本次截图、原草稿、实际加载与差异证据见 `surface-fix/`。此前原生人物见 [native-final-crop.png](<<本机路径>/reports/dsh-commander-native-2026-11-05/native-final-crop.png>)。

当前实例「DSH 机械姬 · 指挥官私有验收」，Mac arm64、DSH `0.2.1-rc.5`。Host **52802**、客户端 **52839**、supervisor **52909**、人物后端 **61134**，generation **15**，theme/pet ready、道具 0、错误 0、移动与跟随句柄清空；startup 未声明、未播放。主控原草稿 `Commander draft retained across sessions.` 已保留。本次仅重新加载客户端，没有发送消息或重复功能流程。

皮肤声明与资源未变：`commander-workspace-private@0.1.0`，内容键仍为 `d940dbdd93ac8c1dda644e23296e0732f00a7ee78442b5ab8e19f5b636682a8c`。实际客户端日志确认加载的 presentation SHA 为 `2082678a190745d11d06687980192e481fbae301b530faaacacc97b9f0046efa`，与构建输入摘要一致；原生实际加载的待机、回应和有限左走文件也逐项摘要匹配，当前加载详见 `surface-fix/runtime-binding.json`；前版媒体核对保留在 `runtime-binding.json`。

已绑定主控修后设计回执 `reports/coordination/commander-workspace-v1-primary/rereview/review.json` 的十份运行相关设计源，README SHA `eb353ce49d8f422e69b29bfcd1a6408c6df3146a9147b2c1cd8d93f07941a741` 及对应 verification。绑定结果为 `design-source-binding.json`；批准输入已另存不可变私有副本，避免后续设计推进改动本轮冻结。`app.js`、`performance.js`、`motion.js` 仅作为设计依据，没有执行或移植其模拟会话、完成计时或过场播放到 DSH。

| 实际覆盖与路径 | 实现与自验证据 |
| --- | --- |
| 导航、会话、消息、过程与回执 | 43 项官方 Theme token；集中 rc.5 样式/语义图标适配；保留原消息身份、工具过程、复制与停止控件。明暗阅读均实际查看。 |
| 输入接点、发送、停止 | 原输入卡焦点边线；最终内容键下实际原发送→turn/start，原停止→turn/end reason=`aborted`，原记录“已停止”、陪伴位“已中断”。见 `final-turn-stopped.ax.txt`、`final-host-workflow.json`。 |
| 待决策及提交 | 受控离线适配器产生真实 `ask_user_question` 工具调用；原问题、选项、提交保留，琥珀状态与陪伴位“等待决策”同步；实际提交显示“1/1 已回答”并恢复执行。见 `actual-attention.*`、`actual-question-submitted.ax.txt`。 |
| 完成回应与取消 | 原 turn/end completed 驱动一次陪伴位短反馈；聚焦原输入立即取消回应、保留原完成状态。切历史不补播。原生桌面已观察，动画所有权/新工作/设置/资源释放另有定向检查。 |
| 草稿、资料 | 切换两条真实 Session 后草稿恢复；原右侧文件列表打开 `commander-attachment.txt`，内容正确，草稿继续保留。见 `draft-restored.ax.txt`、`file-open.*`、`dark-file-view.*`。 |
| 陪伴位、封面、设置横幅 | 同一母版04的既有肖像；既有自绘封面转 PNG；实际库卡片仅显示工作区/桌宠，071 明确标“旧版对照”。专属桌宠人设经原偏好合同保存，智能互动默认关闭，不影响其他 Agent。 |
| 设置、停用、恢复 | 原事务关闭细节后陪伴位退出；开启后偏好恢复。原“停止全部”使 backend 空、窗口0，工作区样式/陪伴清理且草稿保留；原自验恢复后generation11；主控另实测generation13停止、generation14恢复，人物59986、theme/pet ready一致。本次加载阅读层修正后generation15、人物61134正常。见 `details-*.json`、`all-effects-stopped.json`、`stopped-workspace.*`、`restored-native.json`。 |

完整结果为 `desktop-results.json`，上述实际检查均为真，外部模型调用 **0**。这使用既有离线 LLM Adapter 与原 Agent/Session/工具链作受控验收；完成由实际事件和显式释放闸门产生，没有假完成定时器。针对合同、token/图标、禁自动开场、原生事务预算、状态语义、原 Session 事件与回应取消的检查及主控独立复核均为 **7/7 通过**。本次CSS补审仅追加编译语法、生成文件差异和实际阅读层核对，未重跑这7项或旧68项矩阵；R2 原已审63通过/5项既有失败仍按原报告保留，未称全绿。

资源共126项。56枚既有矢量图标完整复用，只按已审银蓝 token 生成明暗 PNG；50类有集中版本样式映射，companion另走官方入口图标。history/bookmark/quote没有该 CSS 叶子映射，保留宿主呈现；volume/mute本轮不启用。映射数不代表每个图标都已逐一实点。完整清单及来源/派生摘要见 `prepared-assets.json`、`coverage.json`。

初次原生应用被原有128KiB事务限制拒绝，未计为通过；已精简重复素材说明，将完整矢量来源/SHA保留在核对表，未放宽限制。最终 manifest **44,902字节**（上限65,536），含实际有效偏好的原生事务 **118,398字节**（上限131,072）。初次设置配色选择器与旧“纸面/开卷”文案也在实际界面检查中纠正，最终截图和内容键以本文为准。

覆盖边界：官方 Theme/Slot 与当前 rc.5 的集中样式适配共同实现本轮界面；没有通用公开 IconProvider，部分宿主图标仍由原组件提供。系统标题栏、Dock、访达和系统文件选择器不属于该主题接口。其他独立插件业务面板保留各自呈现。新过场/声音留待下一节点；已审有限六周期左向走路只保留显式测试入口，没有扩大自主频率或新增动作引擎；44→0接缝与侧身回正面待机的素材边界仍沿用原结论。

运行控制沿用当前私有探针，项目根目录执行：

```sh
node experiments/dsh-commander-native/probe.mjs status
node experiments/dsh-commander-native/probe.mjs workflow-status
node experiments/dsh-commander-native/probe.mjs workflow-release
```

`workflow-release`只供手动发送后的本地测试流结束；真实原发送/停止/问题提交仍从 UI 操作。有限走路仍可显式用 `walk-start` / `walk-stop` 观察，不作为主题验收新增矩阵。GUI 交审后由主控操作，本线保持候选冻结。

冻结入口 `source-freeze.json`（152项）、`runtime-freeze.json`（549项）、`evidence-freeze.json`，总回执 `receipt.json`。源码聚合 `b8b198f422657925f4be9e50d24cb775bc13033992e37eb1a2fd1be9832704c5`，实际运行聚合 `2c2ab5a13850f36cec824b317ce9a719a0afbfd18148ba2d377e3de1d937d843`。所有索引路径相对项目根；聚合为 `sha256(json.dumps(files,separators=(',',':'),ensure_ascii=False).encode())`，保持 files 顺序及每项 path/sha256/bytes 键序，不加换行，区别于索引文件自身 SHA。

保护读回：R2源码76/76、运行410/410，walk源码94/94、运行540/540均未变；H4源码35/35、运行125/126，仅沿用已审未使用config的maxBodyWidthPct再生例外。旧071与已审原生媒体保持原摘要。未改全会话system prompt，未引入新运行服务或预览框架。

本次补审见 `surface-fix/verification.json`、`surface-fix/bounded-delta.json` 和 `surface-fix/surface-color-readback.json`：产品只改一条CSS背景声明，生成包差异仅该CSS及presentation标识；正文采样与未变的头部一致，导航/输入采样前后相同。主控原84项冻结回执及两个日志的原封存副本已保留；新的证据冻结采用活跃日志只读快照，原件和主控新增记录继续保留，不回写旧内容。
