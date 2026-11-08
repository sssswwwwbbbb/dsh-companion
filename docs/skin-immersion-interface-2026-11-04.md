# 沉浸细节：官方接入点核对

2026-11-04。目标为本机官方 DSH **0.2.1-rc.5**。入口、当前会话、执行及明确回合结束信号可复用；“需处理”不能直接等同于当前弹出的面板。当前仅完成接口核对与独立探针，待主控审核后再安排实现。

| 能力 | 官方接口 / 语义 | 本轮证据 |
| --- | --- | --- |
| 本套入口标识 | 既有 `sidebar.panellist` 中插件自己的条目组件 | 独立条目可注册/撤销；三个品牌槽位注册数量未变。不替换品牌或插件管理器的静态包图标。 |
| 工作区状态位 | `conversation.session.header.utilities`，list、session scope | 实际官方客户端渲染取得 A/B 各自的 `sessionId`、`useSession` 和 `useSessionStatus`；只验证接口，不宣称视觉验收。 |
| 当前工作会话 | `uiSession.adapter.current`；官方按 `mainView` retain 确定当前 binding | A→B 切换、回到 A 的历史基线、解绑旧事件均已验证。Host 的所有 Agent 事件不能直接当成“当前会话”。 |
| 执行中 | `uiSession.sessionStatus` 的 `running`；Host `agent/status` → `api-session/status` | 官方 AgentLoop 经 Controller 到真实客户端的链路已验证。 |
| 本轮成功结束 | 当前 binding 的 `session.eventSource` 新增 `turn/end`，`reason.kind === 'completed'` | 实际回合得到 completed / error / aborted，均会结束运行。**`running=false` 与 `completionUnread` 都不证明成功。** “completed”仅指本回合，不证明整个业务任务完成。 |
| 需处理 / 解除 | `sessionStatus.pendingInteraction` 提供 approval / question / plan-review；持久问答还要看 `userQuestions` 投影及 `inbox` 中已提交回答 | 官方 `userQuestions.askTimed` 的展示→隐藏→重新展示→回答已验证；隐藏时 Host 仍未结束，回答后才结束。持久投影与排队回答规则目前仅源码确认。 |

独立 profile 为 `.local/immersion-interface-icxpmH/profiles/interface`，没有加载日用 profile 或会话。探针使用本地无网适配器和显式释放屏障，经官方 AgentLoop 产生5个回合结束事件；共7次无网适配器请求（含辅助请求），没有用演示计时器推断完成。Host 在启动前阻断非回环 Socket，隐藏 renderer 也阻断外部请求，两端均未出现被阻断的外连尝试。13份针对性回执见[机器汇总](../reports/immersion-interface-2026-11-04/probe-result.json)；未测试真实模型、真实工具业务或原生桌宠呼应。

本轮确认的两个缺口：

- **SVG 尚未进入皮肤资源合同。** 当前 `schema.mjs:65` 只允许 PNG/JPEG/WebP/WebM，资源准备也只按这些格式检查。探针使用已审 SVG 的本地内联图像，只证明可提供导航组件，不能据此放开导入任意 SVG。正式接入需要先审核本节点必需的资源/校验增量，或由主控另定资源交付形式；本轮未改合同、资源或0.7.1。
- **没有覆盖所有业务的通用“需处理已解除”信号。** 官方 PendingQuestion 面板关闭可只撤下展示，原请求继续；不能据 `pendingInteraction` 变空清除事项。已有 `userQuestions.active` 的 open/continued 状态和 inbox 回答规则可复用，但本次问答探针没有真实 tool/call 记录，尚未证明这条持久投影链路。Approval 实际生产者与断线重放也未做运行验证，不扩大为通用任务状态引擎。

建议的最小接入映射（待审核，**不是已修改的配置合同**）：

| 每套皮肤的可选声明 | 声明后的默认值与呈现 | 无声明时 |
| --- | --- | --- |
| 本套入口标识资源引用 | “入口标识”默认开，仅替换插件自己的入口组件；关闭恢复原插件图标 | 没有新增入口标识设置 |
| 工作状态反馈能力 | “工作反馈”默认开；读取上述官方状态，需处理优先于结束装饰，失败/取消不播放成功反馈 | 没有新增工作反馈设置 |
| 该能力的桌宠呼应 | 仅同时具备 pet 和已声明 idle/react 时展示，默认开；新成功回合最多回应一次，执行/需处理保持既有 idle | 没有新增桌宠呼应设置 |

关闭反馈或呼应只移除装饰/动作，不取消 Agent、不回答问答、不修改原运行和待处理状态。事件先建立当前基线，只消费新的 append；用当前 binding、所选皮肤 contentKey/generation 和事件 seq 约束归属及去重。离开工作区、切会话、换套或停止时沿用现有页适配所有权与清理；桌宠转发只能由当前页所有者通过已有 Host/原生动作通路执行。该转发及原生中途取消尚未实现，需要下一节点验证。

本轮新增监听与槽位已全部撤销，自己的 Host 和隐藏 renderer 均正常退出；原皮肤库隔离预览没有改动。82份生产输入、schema/resources、准确0.7.1媒体与源码dev.11均未变；dev.19交付/暂存归档仍为 `d645d0b0e0d807b193004199e37ac11ca0501070bb734d1543565a07ea90d673`，dev.18包也未变。未操作日用 DSH、未打包、未提交推送或发云端。模式外观和共享人设不在本节点。

源码原始 ASAR 路径、所读副本与摘要见 [source-index.json](../reports/immersion-interface-2026-11-04/source-index.json)；接口逐项来源与验证层级见 [interface-map.json](../reports/immersion-interface-2026-11-04/interface-map.json)。当前交主控审核这些接口边界与最小映射，不能将其算作沉浸功能已接入。

## 主控结论与本轮实现安排

2026-11-04，接口节点通过限定范围的主控审核。116份所读源码及副本与本机官方ASAR摘要一致，82份生产输入未变；主控检查了AgentLoop/Controller探针、客户端当前binding订阅、5种回合结果记录及隐藏问答后Host仍未settled的证据，没有重复整套探针。回执见 `reports/immersion-interface-2026-11-04/primary-review.json`。

- 图标沿用已审造型，导出透明PNG，使用现有图片资源合同；本轮不增加SVG导入格式。视觉线负责深浅背景下的资源交付，可与底座实现并行。
- 工作反馈使用已确认的真实信号；成功文案为“本轮回复完成”，不代表业务任务完成。桌宠呼应直接复用本地idle/react执行器，不经智能互动调用模型，失败和取消不播放成功动作。
- “需处理”只再补一条真实tool/call问答投影的隐藏→回答贯通，沿官方userQuestions/inbox语义；不新增自造待办状态，不将approval所有生产者和断线重放扩大为首批门槛。尚未验证的情形不能补记已支持，也不阻塞图标与已验证反馈。
- 保持每套可选声明及默认值、无声明则隐藏、关闭和停止保留的既有约定。准确0.7.1和已审dev.19包保持不变；新增声明使用独立版本候选，原五份媒体不改。

下一节点是独立环境中的最小实现与实际联调，尚未安装到日用客户端。
