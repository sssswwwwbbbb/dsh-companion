# M0 能力矩阵

核对日期：2026-11-03。目标 Mac ARM64 / DSH 0.2.1-rc.5。官方源码根：`/Applications/DeepSeek Harness.app/Contents/Resources/app.asar/dsh/node_modules/@deepseek-ai/`。用官方应用 Node 模式只读检查，运行结果另列报告。

| 能力 | 真实接口和源码证据 | 本轮边界 |
| --- | --- | --- |
| 颜色层 | dsh-client-ui-theme/lib/client.js: overrideTokens(source,tokens)、getTheme、exportInspectTokens；README.zh.md 注册主题段 | 官方支持成对 light/dark token；返回的 disposer 只移除自己的层，不写官方偏好 |
| 实际呈现 | dsh-client-ui-layout/lib/client.js: ThemePresenter、theme/change | 写 body 内联 token；执行器需读回实际颜色后确认 |
| 管理页隔离 | 同包 layout.panelInfo.getSnapshot()/subscribe()、selectPanel | activePanelId=null 为会话；其他页面暂撤主题，保留管理恢复入口 |
| 插件入口与生命周期 | 既有 client.template.js 的 slots.register / ctx.effect；index.js 的 TypertRemoteService / Remote | 复用陪伴入口及官方 pluginManager.setBundleEnabled |
| 原生桌宠 | runtime-src/main.mjs: bridge、packToken、companion:ready、ownerPid | 复用 Electron 宿主；新增操作代次、清理与就绪合同 |
| 自定义媒体子集（M4） | pet configVersion2、NativeSkinRuntime集合替换、当前代次decodedMedia就绪集 | idle必需、仅实际片段；保持比例，固定基础高度/平移校准；模型和本地不执行未提供动作 |
| 授权 | 既有 Entitlement 与原生 authorization() | 一份签名授权，包不含授权信息 |
| 冷启动 | src/startup.mjs、index.js 的 appReady | 保留 dev.11：正常重开按设置播放，同进程启用安静；换肤不重播 |
| 自带静态背景 | ui-layout 的 shell.overlay list slot | 受控图片层、不拦截输入；不承诺外部壁纸兼容 |
| 模型与桌宠互动（M3） | 官方 llm 目录/prepareCall/stream、agentDefaultModel、sessions；既有认证原生 bridge | 明确点击/专属输入的一次短决策，已有动作和动态短句；8项受控联调通过，真实模型未验 |
| 工作会话运行信号 | ui-session 存在官方服务入口 | 尚未接入，不允许包任意声明事件或读取无关工作对话 |
| 皮肤开场（M6） | startup v1、原intro窗口、独立资源/登记、既有启动触发与进入路径 | poster/可选无声WebM；不借pet.greet、不等pet.ready；定向隔离回执见M6报告，代码/阶段待独立审 |
| 自定义字体、图标、声音 | 没有本轮可撤销适配证据 | 合同暂不开放 |
| Windows、其他 DSH、其他全局外观插件共存 | 无本轮证据 | 不宣称支持 |

主题覆盖官方 token 消费区域（侧栏、正文、输入区和会话内浮层），不宣称替换每个硬编码颜色。恢复、中文/代码/表格、滚动及窄窗口的可见检查须在隔离官方客户端完成；源码发现不是业务验收。

本轮运行验证已完成：23 项隔离官方宿主联调、5 项新进程启动回归、6 项最终源码/异常退出检查通过。源码能力和实际结果的对应说明见 implementation-report.md；目标版本和平台范围未扩大。

M5补充：已在准确0.5.2的隔离官方客户端装载合成Session，查看真实长中文、代码、表格、可展开工具输入/输出、模型菜单、输入焦点和文字选中，补明暗及760px窄窗。当前token覆盖的正文/表格清楚；部分原生代码高亮、链接及系统选中/发送按钮颜色保留，未称全区域对比均达到4.5。原生提示已依据已解码动作集合生成。结果和限制见m5-workspace-review-2026-11-03.md，当前仍待M5独立阶段审核；不等于真实模型或业务客户端通过。

阶段更新：M5及A2准确0.6.0已由主控验收其本地/隔离范围。M6复用原启动窗口与全局自动偏好，应用/恢复不重播；同内容页面接管先让当前一轮完成再恢复。当前只报告M6源码、自动检查及隔离播放，未扩大到真实安装、模型或业务验收。
