# Windows 桌宠探针与回复风格验证

2026-11-06。本轮使用已验收的 dev.27 和「冷启动」素材开展 Windows W0，并在官方 Mac Host 验证主题回复风格的接入点。两项都使用独立临时状态。[主线路线图](skin-roadmap-2026-11-06.md)

## Windows x64 桌宠验收插件

手动验收使用 [Windows 桌宠验收插件 tgz](../dist/dsh-plugin-companion-windows-check-0.1.0-w0.1.tgz)，197031780 字节，SHA-256 为 `78624d16375b495ea3ee22120f903d429fbc6a3f2ec5f91cea209c3d6ab6b465`。隔离 Mac 上，官方 DSH `0.2.2-rc.1` 的插件管理器成功安装并启用，主窗口已实点「Windows 桌宠验收」并显示 Windows x64 平台要求。验收包的兼容声明为 `0.2.2-rc.1` 和 `0.2.1-rc.5`。[DSH 官方包说明](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.2.2-rc.1/docs/user/develop/basic/publish.md#the-bundle-manifest) · [验收插件源码](../experiments/dsh-windows-w0/plugin)

1. 在 Windows x64 把 `.tgz` 放到本机，在 DSH「插件 → 添加插件」填入本地包地址并启用。可按自己的实际路径填写 `file:C:/Users/你的用户名/Downloads/dsh-plugin-companion-windows-check-0.1.0-w0.1.tgz`。
2. 打开侧栏「Windows 桌宠验收」，点「开始桌宠验证」。插件自动准备组件。桌宠出现后会从 100% 缩到 83%，可在显示期间点一次角色。
3. 观察透明边缘、缩放是否连续和退出效果。桌宠会自动关闭，最终结果显示在 DSH 页面内。把结果截图发回即可。

内置桌宠运行组件复用 Electron 45.2.1 x64、dev.27 的 dsh-pet 0.4.1 和「冷启动」动作。同一探针已通过 Mac 隔离隐藏窗口验证和用户 Windows x64 实机自动检查。[Electron 官方发布](https://github.com/electron/electron/releases/tag/v45.2.1) · [运行组件构建](../experiments/dsh-windows-w0/build-runtime.py)

| Windows 实机回执 | 结果 |
| --- | --- |
| 插件内自动检查 | `passed: true`，Windows x64，Electron 45.2.1 |
| 主屏缩放与桌宠尺寸 | 系统 100%，桌宠 685 → 568，进程和窗口保持 |
| 命中区域与清理 | 256 个区域，`cleanedUp: true` |
| 点击 | `clicks: 0`，实点、拖动和透明区穿透留到 W1 |
| DSH 宿主版本 | 回执未记录，在 W1 实机验证时登记 |

W1 复用这条桌宠链路，验收统一授权、主题应用和切换、桌宠设置保存及停用恢复，并补实点、拖动、透明区穿透与高 DPI。原 DSH 图标启动时的开场属于 W2。

| 官方 Windows x64 样本 | 2026-11-06 核对 |
| --- | --- |
| `0.2.2-rc.1` | 官网当前下载和 nightly feed，安装包可取得。用户正在使用的版本单列兼容 |
| `0.2.2-alpha.3` | 历史预发布，官方 CDN 安装包可取得 |
| `0.2.1-rc.5` | 历史 RC，官方 CDN 安装包可取得 |
| 最近三版 Stable | Stable feed 返回 404，正式版矩阵按后续可核实的发行记录与安装包登记 |

版本样本仅作测试输入，兼容结论由各版本的官方 Windows 客户端实测得出。[DSH 官方版本记录](https://github.com/deepseek-ai/deepseek-harness/releases) · [Windows 更新源](https://download.deepseek.com/dsh-desk/feeds/win-x64/nightly.yml)

## 工作区回复风格

用官方 Mac DSH `0.2.1-rc.5` 和 `0.2.2-rc.1` 的真实提示词注册表，在隔离 profile 各创建两个真实测试会话。两版均通过同一组验证。

- 启用风格后只进入所选会话的提示词组装，另一会话保持原样。
- 修改语气与称呼后，下次组装采用新值。关闭恢复基线，撤销注册后移除对应段落。
- 原提示词段及工具定义保持。试验共发送 0 次模型请求，阶段结论是提示词组装验证。

下一步把已验证的注册路径接入主题设置，按用户选择作用于当前会话，随后用同一工作问题做真实模型开启、修改、关闭与换肤对照。[验证脚本](../experiments/dsh-theme-persona/probe.mjs) · [主题人设方案](first-skin-brief.md#68-可选主题人设2026-11-04-设计补充)


### dev.35 接入回执

安装候选包后，官方 Mac DSH `0.2.1-rc.5`、`0.2.2-rc.1` 的隔离 profile 各使用两个真实测试会话。授权和已应用皮肤状态使用隔离测试输入。通过官方 RPC 开关、保存后，对照实际系统提示词组装。两版均确认默认关闭、只影响目标会话、更新称呼及语气、换皮与停止时撤下、关掉恢复基线、停用插件后清理。现有提示词段和工具保持。真实模型调用次数为 0。
