# workspace-v2 代表机制运行结论

2026-11-04。两类代表机制已在独立环境跑通：原生复制状态可随新图形切换，输入区的附件、模型菜单、发送与停止保留原行为。此次只临时注入叶节点 CSS，没有接入整套主题。

运行层级为本机官方 **DSH 0.2.1-rc.5 Host＋官方 Web 客户端＋独立 Electron 45.2.1 壳**。会话只使用明确注册的本地离线适配器，Host 与渲染器都限制为回环地址；真实模型/云调用、外连尝试和最终页面错误均为零。此结果不等同日用桌面客户端验收。

| 检查 | 实际结果 | 主要证据，均在 `reports/skin-workspace-v2-probe-2026-11-04/` |
|---|---|---|
| 复制→完成→回复制 | 浅深均由官方按钮实际触发，记录到 `copy→check→copy`；同一按钮、28×28 命中区。用真实 ⌘V 粘贴回原输入框，原文一致 | `light-copy-verified.json`、`dark-copy-and-paste.json`；`copy-completed-light.png`、`copy-completed-dark-cua.jpg` |
| 附件与模型 | 文件菜单浅深 attachment PNG 均命中；原生选择器实际载入本环境的 59B 文本文件。原模型菜单通过方向键＋回车切到离线备选，后续真实请求的 model 为 `probe-alt` | `light-attachment-menu.json`、`dark-attachment-menu.json`、`native-model-menu.jpg`、`actual-ui-send-host.json` |
| 发送→停止 | 点击原发送按钮，附件随消息进入官方流程，离线回复停在受控屏障；同一 34×34 按钮呈现浅深 stop PNG。点击原停止按钮后，官方事件为 `turn/end seq39 reason=aborted`，控件恢复发送 | `light-running.json`、`dark-running.json`、`native-running-light.jpg`、`native-running-dark.jpg`、`final-host.json` |
| 撤下与保留 | 移除临时样式后背景图清空、原 SVG 路径恢复；重新附加仍有效。撤下前后原按钮身份、草稿和待发送附件完全相同 | `before-detach.json`、`after-detach.json`、`after-reattach.json` |

**模型图形的实证边界：**本轮原生布局显示模型文字，内置图标宽高为 0。选择器与浅深资源已命中，但其可见图形没有运行验收；菜单、键盘切换及新模型实际被请求已验。若整稿要求宽布局也显示图标，最小替代是通过公开 `conversation.input.model.label` 在标签中添加标识，保留原菜单；此替代仍是建议，本轮未实现。

适配表依赖 rc.5 的 CSS Module 类和原 SVG path/rect 结构，用 `:has()` 命中叶节点，CSS 背景显示 PNG、原路径透明；没有替换按钮或改写事件。三份官方组件源码摘要在夹具启动时核对，PNG 摘要见 `used-pngs.json`。不匹配的分支按钮仍显示原图；跨版本回退未另行运行验证。颜色仍沿用宿主底色，最终整体视觉以完整新稿接入验收为准。

夹具初始化时曾先于客户端会话索引加载而打开会话，已改为等待索引。初始文案选择器按真实 SVG 结构修正；一次附件菜单下移误触本环境的 compact，已由本地离线屏障完成，不计入代表验收。严格 Electron 剪贴板等值测量未确认，内容验收采用实际 ⌘V 回读；深色瞬态自动截图曾保留旧合成帧，采用已目视核对的 `copy-completed-dark-cua.jpg`。这些过程单列 `setup-failures.json`，不推定为生产缺陷。

只读保护核对确认：原 24 项冻结文件、准确 0.7.1、0.7.2 候选全部文件、dev.18/dev.19 压缩包不变；没有修改生产、合同或媒体，没有运行旧测试矩阵、打新包、提交或推送。夹具四文件语法检查通过，Impeccable 检测一次为 `[]`。

独立预览保持运行：私有定位 `.local/skin-workspace-v2-probe-current.json`；App 为 `.local/workspace-v2-probe-b4x3easw/WorkspaceProbe.app`，bundle ID `local.dsh.workspace.v2.probe.20261104`，标题“DSH 工作区图形 · 独立探针”。主控保留的 dev.20 预览及日用实例未访问。下一步交主控复核这两个机制；整套图标、布局及新建/删除演出待完整新稿审后成批接入，本次未测试新建/删除演出，未执行对话删除。
