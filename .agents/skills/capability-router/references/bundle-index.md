# Bundle 能力索引

数据来源：2026-11-06 对当前 profile 执行 `plugin_manager list_bundles`，共 26 个 bundle。**索引会过期，给建议前必须重新核实。**

状态含义：

- **可装**：`availability: installation`，可直接 `install_bundle`。
- **已装**：`availability: profile`，已在本 profile 内。
- **需源**：`availability: missing`，要额外来源才能装（子智能体包、CUA）。

## 语音与输入

| 能力 | 包 | 状态 | 代价 |
| --- | --- | --- | --- |
| 语音输入（转文字） | `@deepseek-ai/dsh-experimental-voice-input-bundle` | 可装 | 实验性；首次使用下载本地 SenseVoice 运行时 |

## 检索与记忆

| 能力 | 包 | 状态 | 代价 |
| --- | --- | --- | --- |
| 搜索并读取历史会话 | `@deepseek-ai/dsh-experimental-session-search` | 可装 | 实验性；建 SQLite 索引，占磁盘 |
| 原始 Session 日志与节点检查 | `@deepseek-ai/dsh-experimental-inspector-profile` | 可装 | 实验性；调试用，日常不必开 |

## 协作与共享

| 能力 | 包 | 状态 | 代价 |
| --- | --- | --- | --- |
| 多智能体协作（Agent Teams） | `@deepseek-ai/dsh-experimental-agent-team-profile` | 可装 | 实验性；覆盖 subagent 工具，与现有子智能体冲突 |
| 通过独立 Relay 共享会话 | `@deepseek-ai/dsh-experimental-liveshare` | 可装 | 实验性；需要 Relay，默认只读可见 |

## Git 与评审

| 能力 | 包 | 状态 | 代价 |
| --- | --- | --- | --- |
| 创建并进入 Git worktree | `@deepseek-ai/dsh-experimental-tool-worktree` | 可装 | 实验性；会改工作目录 |
| 变更请求面板 + worktree | `@deepseek-ai/dsh-experimental-forge-bundle` | 可装 | 实验性；需要 Git 仓库状态干净 |

## 终端与长驻进程

| 能力 | 包 | 状态 | 代价 |
| --- | --- | --- | --- |
| 跨工具调用保持 shell 进程 | `@deepseek-ai/dsh-experimental-terminal-bundle` | 可装 | 实验性；常驻进程需手动清理 |

## 插件市场与推荐

| 能力 | 包 | 状态 | 代价 |
| --- | --- | --- | --- |
| 自定义插件索引、Discover 浏览安装 | `@deepseek-ai/dsh-experimental-plugin-market-bundle` | 可装 | 实验性；需要自备索引地址 |
| 回答下方的个性化推荐卡片 | `@deepseek-ai/dsh-personalized-recommendations` | 可装 | 非实验命名；含插件推荐，按偏好而非任务匹配 |

## 自动化与集成

| 能力 | 包 | 状态 | 代价 |
| --- | --- | --- | --- |
| 一次性运行、无 Host/HTTP | `@deepseek-ai/dsh-headless` | 可装 | 覆盖 system-prompt、sandbox-policy 等多项 |
| ACP JSON-RPC 自动化 | `@deepseek-ai/dsh-acp-app` | 可装 | 仅自动化场景 |
| SDK JSON-RPC 服务 | `@deepseek-ai/dsh-sdk-app` / `dsh-sdk-minimal` | 可装 | 面向外部程序集成 |
| 桌面自动化（CUA） | `@deepseek-ai/dsh-cua-bundle` | 需源 | 需要额外安装源 |

## 子智能体

| 能力 | 包 | 状态 | 代价 |
| --- | --- | --- | --- |
| Claude Code 子智能体 | `@deepseek-ai/dsh-subagent-claude-code` | 需源 | 要有 claude 可执行文件 |
| Codex 子智能体 | `@deepseek-ai/dsh-subagent-codex` | 需源 | 要有 codex 可执行文件 |

## 批处理与重复任务

| 能力 | 包 | 状态 | 代价 |
| --- | --- | --- | --- |
| 用新 agent 反复跑同一任务 | `@deepseek-ai/dsh-experimental-ralph-bundle` | 可装 | 实验性；token 消耗随轮数上升 |

## 安全与审阅

| 能力 | 包 | 状态 | 代价 |
| --- | --- | --- | --- |
| 逐工具 LLM 授权审阅 | `@deepseek-ai/dsh-experimental-auto-review` | 可装 | 实验性；只对 Auto 权限预设生效，每次调用多一次模型请求 |

## 会话与输出

| 能力 | 包 | 状态 | 代价 |
| --- | --- | --- | --- |
| 随新提问刷新会话标题 | `@deepseek-ai/dsh-experimental-session-titles-bundle` | 可装 | 实验性；每条新提问多一次模型调用 |
| 给输出加 powered by dsh 徽章 | `@deepseek-ai/dsh-experimental-badge-skill-bundle` | 可装 | 会改文档/PR 内容 |
| 推理内容机器翻译 | `@deepseek-ai/dsh-experimental-cot-translation-bundle` | 可装 | 实验性；多一次翻译请求 |

## 已在本 profile 内

| 包 | 说明 | 注意 |
| --- | --- | --- |
| `dsh-plugin-companion` | 桌宠与主题插件（本项目） | 本地产物，非市场包 |
| `@dsh-persona/workshop` | 人格工坊 | 要求 `engines.dsh 0.2.1-rc.3`，当前 `0.2.2-rc.1`，安装会报 `incompatible-version` |

## 核心 bundle（不可移除）

`@deepseek-ai/dsh-base`、`@deepseek-ai/dsh-web-app`、`dsh-headless`、`dsh-sdk-app`、`dsh-acp-app` 属于运行形态层，不是能力插件，不用于「加一个能力」。

## 维护方式

索引只记录包名、能力标签与代价，不抄接口细节。核实顺序：

1. `plugin_manager list_bundles` 拿最新状态。
2. 包名与版本以实际返回为准。
3. 装之前确认 `engines.dsh` 与当前运行时一致。
