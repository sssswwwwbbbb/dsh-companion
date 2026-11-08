# 沉浸事件节点：本地实现交审

2026-11-04。当前节点已完成本地实现和定向运行验证，交主控独立验收。隔离预览为 `0.1.0-dev.20`，源码三处版本仍为 `0.1.0-dev.11`；未生成 dev.20 安装包，未安装到日常 DSH，未提交、推送或发布。

## 本节点行为

- 主题包可选提供浅、深两张 PNG，仅替换本插件自己的侧栏入口图标，显示尺寸 24px。
- 官方当前会话执行时显示“正在执行”，待处理时显示“有事项需要处理”；新到达的成功结束事件显示“本轮回复完成”。执行动效有限播放，遵循减弱动态设置。
- 用户可选择完成后让桌宠执行一次本地 `react` 并回到 `idle`。动作权限、模块关闭、皮肤停止、页面所有权、会话切换、内容标识、代次和序号在现有链路中复核；错误、取消和历史恢复不庆祝。
- 三个新开关由独立 0.7.2 内容包声明。关闭工作反馈后隐藏呼应设置并保留原选择；准确 0.7.1 保持原有八项设置。

本节点沿用现有主题、配置、资源、协调器和页面租约，没有新增消息总线或规则引擎。桌宠呼应没有调用 `petInteract`、模型或语音服务。真实运行验证采用官方 Host、官方客户端和原生桌宠，配合隔离的离线会话适配器；不代表真实模型或日常客户端验收。

## 验证证据

| 定向检查 | 结果与证据 |
|---|---|
| 契约、事件去重与失效、原生兼容 | `tests/skin-immersion.test.mjs` 四项通过；与原生三项合跑 7/7。补充权限立即取消断言后四项再次通过 |
| 构建与语法 | 最终源码 `npm run build:mac`、相关脚本语法检查通过；修正独立模块 import 后生成客户端与已运行预览字节一致 |
| 设计检测 | 本节点 Impeccable 检测一次，结果 `[]`，见 `reports/skin-immersion-2026-11-04/impeccable-detect.json` |
| 浅深入口与设置 | 实际页面确认 24px 标识；`dark-entry-library.jpg`、`dark-entry-workspace.jpg`、`new072-controls.jpg` |
| 旧包无新增设置、用户关闭值保留 | `old071-settings.ax.txt`、`candidate072-disabled-choices-retained.json`、`hidden-choice-retained.ax.txt` |
| 官方默认问答 | 真实 `tool/call → tool/result`；收起、展开、回答后恢复执行；只有后续成功结束才呼应一次。见 `real-question-collapsed.ax.txt`、`actual-question-answered.json`、`real-question-after-reply.json` |
| 错误、取消 | 均无完成呼应：`controlled-error-no-react.json`、`controlled-cancel-no-react.json` |
| 切离旧会话、停止后迟到成功 | 均无额外呼应：`switched-old-b-no-react.json`、`stopped-late-completion-no-react.json`；重新应用不回放旧完成 |
| 关闭呼应 | 仍显示本轮回复完成，原生无额外动作：`echo-off-completed.ax.txt`、`echo-off-completed-no-react.json` |

以上证据均在 `reports/skin-immersion-2026-11-04/`。当前连续运行中，原生累计完成呼应为一次；最终姿态为 `idle`。`skin.workFeedback` 是最后接受的回执，当前动画应读取原生顶层 `action`。最终客户端日志为空，无页面错误或警告；早期失败的夹具设置单列于 `setup-failures.json`，不计为业务通过。

**问答范围限定：**本节点“收起”只折叠问题卡片正文，卡片仍待回答。官方默认工具为 untimed；隐藏整个 seat、持久 timed 投影隐藏、排队回答恢复仅有源码分析或单元覆盖，尚无运行验收。文件名 `real-tool-question-hidden*.json` 中的 hidden 也只指本次卡片折叠，不证明上述待验证行为。这一范围已获主控确认，无需为本节点改动默认工具配置。

## 候选与复核入口

- 独立内容目录：`.local/skin-immersion-content-c4vgpsos/archive-warm-whale`，版本 `0.7.2`。
- 内容标识：`1a5f9e2ec00c0bc41b0fef92b61a18ad94389d02dde8992f90ee0a4f7feb0a42`。原五份媒体不变，新增两张已审 PNG。
- 当前预览定位：`.local/skin-immersion-current.json`。这是私有连接文件，不复制其中 URL 或令牌到外发材料。
- 预览 App：`.local/skin-foundation-1793769324470/ImmersionClient.app`，bundle ID `local.dsh.immersion.client.dev20.r2`，标题“DSH 沉浸候选 · dev.20”。Host、客户端和桌宠保持运行。
- 最终快照：`final-state.json`、`final-native.json`；背景 8%、角色 80%，三个新开关开启。参数按当前值保留。
- 冻结清单：`source-freeze.json`；预览比对：`preview-source-match.json`；旧资产与已审包保护：`preservation.json`。只读复核命令：`node reports/skin-immersion-2026-11-04/audit.mjs`。

主控下一步独立检查本节点源码、有限动效、成功与失败边界及现存预览，再决定后续安装包或接入范围。成套功能图标、对话区与导航区深化属于 `designs/dsh-skin-workspace-v2/` 新稿，待新稿审核后单独安排，不插入本节点。

准确 0.7.1、普通内置 0.7.1、原五份媒体、dev.18/dev.19 压缩包及 dev.19 留存制作目录均按保护基线核对。日常安装和设置未操作；日常角色 84% 为此前主控观察，本轮未重新读取或回写。
