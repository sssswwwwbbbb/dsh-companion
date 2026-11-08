# 开源与既有能力复用记录

日期：2026-11-03。适用本轮底座返工；用户补充原则见 parallel-development-2026-11-03.md。先修验收缺陷，不借此换栈或扩展首版功能。

| 来源 / 版本 | 本轮采用 | 取舍与平台、成本 |
| --- | --- | --- |
| 官方 @deepseek-ai/dsh-client-ui-theme 0.2.1-rc.5，MIT | overrideTokens、主题快照和宿主呈现 | 使用现成叠加/撤销机制，不复制 CSS 主题引擎、不建立私有 DOM 选择器体系；版本按目标 SDK 验证 |
| 官方 dsh-client-ui-layout 0.2.1-rc.5，MIT | panelInfo 与 shell.overlay | 保留官方布局和管理入口；没有另造桌面布局、消息列表或弹层系统 |
| 官方 dsh-typert-protocol 0.2.1-rc.5，MIT；Cordis 4.0.5，MIT | 同一插件远程调用、注入和 effect 释放 | 停止、配置、页面回执复用现有通道；新增的是本项目操作身份、停止锁和就绪确认语义 |
| 宿主提供的 React 模块 | 继续现有陪伴页面及表单控件 | 没有新增或复制 React vendor，也没有另选前端框架；实际 SDK 元数据及源码摘要在 sdk-reuse.json |
| 本项目现有认证 bridge、授权、PackStore、Electron 45.2.1 运行层 | 原生窗口、签名授权、12 动作及同一进程 | 不再创建宿主、授权服务或通用动作引擎。返工只修清理和失效；无新增运行依赖或模型调用 |
| Node 内置 Promise、fs、crypto | 串行事务、原子文件、UUID 和本地停止请求 | 先保留已有实现。通用队列库不能替本项目决定页面与原生的停止/确认顺序，因此仅补小型适配，不引入新调度框架 |
| 既有参考调研：skin-reference-sources-2026-11-03.json、skin-scope-reference-sources-2026-11-03.json | 复核已有插件/模块和资源接入边界 | 本轮没有复制新第三方实现；开场和壁纸方案不能替代本次停止竞态修复，未为复用引入外部壁纸、编辑器、上传或市场 |

本轮 SDK 四项包的实际版本与许可取自已安装官方应用 package.json；三个客户端源码摘要重新读取，记录于 reports/skin-foundation-rework-2026-11-03/sdk-reuse.json。它们在原 Host 内使用，不作为另一份第三方引擎打包。已有包的许可证与声明继续保留。

角色 WebM 仍沿用既有 dsh-pet 来源及 CC BY-NC-SA / 非商业限制；与 SDK 的 MIT 代码许可分开。原创网格由皮肤内容线维护。本轮没有新增、转换或重新授权角色、声音、扫描视频或字体，也没有决定整个项目或后续制作工具的许可证。

新增代码仅为项目特有的跨执行端协议和 UI 请求顺序：原生本地停止 revision、Host 事务恢复身份、页面重连确认、停止优先请求门控。它们复用现有 API；未来配置界面或素材工具扩展，仍先检查现有模块和开源实现，独立记录适配、体积、性能与许可。

## M3 增量

- 官方 `dsh-llm` / `dsh-agent-default-model` / `dsh-session` 0.2.1-rc.5，MIT：复用 provider/model 目录、当前默认选择、prepareCall、BlockAssembler、createUserMessage 和桌宠专属 Session 请求记录；新增一个官方 peerDependency，不内置新网关/模型SDK。调用失败不重试收费服务。
- `dsh-session-title-llm` 仅参考官方 prepareCall → 精确输入记录 → stream/assembler 的调用方式；没有调用标题接口、复制其代码或借用标题事件。桌宠请求以自己的官方 Session 中标准 user/message 保存。官方实验专用 appendPluginRecord 明确禁止仓库外插件调用，本实现未使用。
- 皮肤线已研究的 PC2005-cloud/dsh-pet：参考“人设＋近期对话＋动作清单→一次回复”的设计，未复制其 MIT 代码。此前多轮必须携带实际执行结果的本项目缺口，由小型 PetInteraction 适配补齐。人设来自皮肤声明，不内置首套角色到协调器。
- 官方 defineTool/ctx.tools.register 可用于工作 Agent 工具，但 M3 是独立桌宠输入的一次短决策，无需向全部工作会话注册全局能力。本轮使用受限JSON结果直接连接已有执行端，保留当前授权/停止机制。
- 继续使用既有 builtin12槽 WebM、行为物理、认证 bridge、纯文本气泡和逐套配置。角色/媒体原许可与代码许可分开；没有新增或转换角色资源。近期历史为本插件运行内存，模型请求审计由官方 Session 保存，不建设长期记忆。
