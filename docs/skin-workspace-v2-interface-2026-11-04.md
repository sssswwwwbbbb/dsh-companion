# workspace-v2 接入核对

2026-11-04。完整工作区主题可按“官方主题/Slot ＋ rc.5 集中适配”推进。颜色、面板入口和若干内容席位有公开接口；部分原生按钮内部没有独立图标席位。后者需要版本适配，不应据此缩小成套图标目标。

本次只读核对本机官方 `0.2.1-rc.5` 包及现有实现，没有运行新探针。读取结束时，稿件为 **56 枚 SVG、112 份浅深 PNG**，导出清单已同步；`runtimeLoadable:false`，仍待主控审稿。这是设计快照，不是接入或运行验收。

| 代表范围 | 可直接复用的官方机制 | 需要适配的部分 |
|---|---|---|
| 主题与工作区细节 | `theme.overrideTokens()` 支持浅深色对及精确撤销；沿用现有页面所有权、工作区切换与设置隔离 | 非颜色的纸面、边线、间距、选中层次用宿主内置的 workspace-v2 样式预设；细分哪些已有 token，哪些依赖版本结构 |
| 导航：面板入口、置顶/归档 | `sidebar.panellist` 注册的是图标组件；会话行操作、菜单、leading/hover 另有 list Slot，可复用官方来源与回调 | 新建、折叠、搜索等内置图形直接写在组件中，没有各自图标 Slot；整体 `sidebar` / `sidebar.workspaces` 虽可替换，但只换图标不宜复制整块业务逻辑 |
| 消息：复制/分支、工作过程 | `conversation.chat.node` 按节点 key 选择，`tool.call.toolview` 按工具名选择；推理正文及附加助手动作有 Slot | 复制/分支在私有 `MessageIconActions` 内；附加动作席位不替换原复制按钮。需同时覆盖复制→完成、展开/收起、运行/失败状态，保留现有过程与工具 renderer |
| 引用与资料 | `conversation.user.text.node` 的 file/folder 席位、`MarkdownDelegateProvider`、`openResource` 可复用原路径、行号、打开失败及重试语义 | 稿件的编号引用和“本轮引用”聚合，尚未在本次所查公开接口中找到统一来源索引；先对齐实际消息元数据，不能直接把本地样例列表当作已提供的运行数据 |
| 输入：附件、模型、发送/停止 | attachments、model、model.label、left/right/activity 均有席位，保留 InputHub 的草稿、上传、权限及提交行为 | model.label 只控制标签；触发器图形仍内置。加号、发送、停止、附件卡片图形需小范围适配，不替换整个 Composer |
| 文件工具 | 右栏 files 的 pane/title 是 keyed Slot，继续复用目录加载、监听和打开资源 | 文件行使用固定 `FileTypeIcon`，目录、刷新、暂停等图形内置；按文件类别和操作状态映射，保留原文件名与操作 |

**集中适配的最小候选：**由插件持有一份 rc.5 适配表，限定到官方 Slot 容器及已核对的类/图形结构，只改变 SVG 叶节点的浅深 PNG 呈现，保留原按钮、事件、命中区、焦点、tooltip 和无障碍名称。复制/完成、发送/停止必须成对映射；结构不匹配时保留官方原图。选择器、样式和版本判断留在可信插件代码，内容包只提供语义资源引用。此候选依赖具体 DOM/私有结构，**尚未运行验证**；不是长期公开接口。

SlotCore 支持不同优先级遮蔽同一 single/keyed/list 项，较低值优先，disposer 可恢复原项；重复声明既有 child Slot 会报错。Component Factory 可复用、可选择其公开局部组件，**重复定义同名 Factory 会报错**。检查到的 UI primitives 为冻结导出，未见统一的按图标名替换服务，不能把 Factory 或图标导出误当作全局换图接口。

建议审稿后的首批顺序：

1. 整理全套语义图标表和主题 token/样式预设；先接公开导航入口、会话行及 file/folder 引用，复用现有主题生命周期。
2. 单独环境只验证两个有代表性的适配：复制→完成，以及输入附件/模型与发送→停止；确认明暗、键盘、停用撤销，再按同一机制补全其余映射，不为每枚图标分别造探针。
3. 收敛过程/资料侧栏细节；编号引用按实际来源接口接入。继续复用官方 Markdown、ToolCall、FileTypeIcon 所属业务流程与已有 React/CSS 能力，无需另加渲染平台或规则引擎。

**最少合同增量，仅供审议：**主题新增可选的语义图标引用表 `{用途:{light:assetId,dark:assetId}}`、可信工作区样式预设 ID，按需求配一个总开关；新字段放入新的 theme configVersion，保留旧版 1/2。沿用 PNG、资源哈希、原有配置合成与撤销。资源计数建议从 32 调整到 128：当前 56 对图标加既有 7 资源最多 119；总 128 MiB、单项限制继续保留，64 KiB 清单上限在实际组包时核量。这个计数不是缩减完整图标集的理由，也不要求增加 SVG 执行或任意 CSS/脚本合同。

官方证据：本机 `DeepSeek Harness.app/Contents/Resources/app.asar/dsh/node_modules/@deepseek-ai/` 内的 rc.5 包。已只读留存原文、版本、原始路径及 SHA256 于 [来源索引](<<本机路径>/reports/skin-workspace-v2-interface-2026-11-04/source-index.json>)；主要依据为 `ui-theme/lib/client.js:1819`、`ui-sidebar/lib/client.js:568`、`ui-workspace/lib/client.js:5221`、`ui-chat/lib/client.js:5175/7209`、`ui-reference/lib/client.js:274`、`ui-model-selection/lib/client.js:1491/1903`、`ui-conversation/lib/client.js:19235`、`ui-sidebar-files/lib/client.js:996`。索引中的包名均带 `dsh-client-` 前缀；SlotCore 和冻结图标导出的原文及定位见索引 `coreExcerpts`。所核对包的 MIT 许可在包元数据中可查。

本次只更新本线进度及新增核对材料，原交审的 24 项冻结文件保持一致。沉浸事件节点已由主控本地隔离验收通过；该预览由主控保留，本次未访问。生产、合同、媒体、日用实例未改，没有重跑测试、打新包、真实模型/云调用或提交推送。下一步为主控审新稿与上述接入建议后安排实现。
