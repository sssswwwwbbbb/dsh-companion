# M5 真实工作区覆盖与原生提示

2026-11-03，模块线送主控审核。使用已通过M4的准确0.5.2内容，key `32db05e1113a48b24de2b1d515fff07423d306f4f2d4af31b77ccce1e90c419b`。没有生成新颜色包或改皮肤线素材。

## 实际呈现方式

复用官方Session和消息构造器，以标准user/message、assistant/message、tool/call、tool/result及轮次事件装载合成内容。本次Session共14条记录，包含宿主初始化记录。官方客户端的真实Markdown、表格、工具卡片、输入和模型菜单负责呈现，没有另造聊天UI，也没有注册新的Agent或工具框架。

工具卡片明确写“合成读取成功，无真实工具执行”。模型可见内容全部是本次构造文本，外部模型调用和真实工具执行均为0；未读取真实聊天、用户profile或默认工作目录内文件。夹具只用于新的隔离Host，不能用它灌入业务会话。

## 已看的代表画面

证据目录 `reports/skin-foundation-m5-2026-11-03/`。最终主图使用已完成真实高亮的light-code-highlighted.png；早期light-code-table.png记录高亮尚未就绪的瞬态，不用它代表后续颜色指标。

| 画面 | 观察 |
| --- | --- |
| light-code-highlighted.png | 长中文、引用、行内代码、真实高亮和表头；层级与换行清楚 |
| light-tools-output.png / light-input-focus.png | 官方工具输入/输出可展开，输入可聚焦并保留合成草稿，没有发送请求 |
| dark-code-table.png / dark-model-menu.png | 深色正文、代码及菜单实际跟随宿主模式；模型目录只有当前受控项 |
| light-selection.png | 浏览器原生蓝色文字选中可见，文字仍可辨；未声称它已换成铜色 |
| narrow-model-input.png | 外窗760×820，实际内容视口760×788；侧栏自动收为图标，表格、草稿和248px菜单均在窗内 |

窄窗document/body scrollWidth均760，未出现全页横向溢出。本次合成表格完整呈现；没有将760px结果称为手机适配。焦点以实际activeElement、可见草稿/光标和截图核对，保留宿主原焦点样式。

## CSS对照与保留原生的位置

测量按实际前景与祖先背景alpha合成，**不含背景图/叠层像素**；视觉截图与CSS数值分别记录，不据此称全区域达标。

| 实际区域 | 浅色对比 | 深色对比 |
| --- | --- | --- |
| 正文/表格 | 11.91 | 13.62 |
| 工具输出 | 5.39 | 8.63 |
| 输入的合成草稿 | 13.23 | 11.98 |

部分宿主原生语法高亮保留，未全部达到4.5：关键字/标点约4.42，类型/布尔值4.02，字符串4.18，注释3.18。关闭本套主题后，同一注释仍为rgb(134,142,150)、相同代码底色与3.18；普通代码文本会继承主题主色，不能把整个高亮区都称为不受主题影响。深色本次高亮最低约6.95。

链接也保留宿主蓝色：同色在暖白底约3.75，原生底约4.23。浏览器选中、发送按钮、部分图标及代码/工具容器的宿主底色没有强制替换。当前已开放71个官方颜色token没有专门的代码高亮/链接项，本轮不追加私有CSS或大批DOM样式选择器，不让内容线盲改背景来掩盖原生配色。主控已收到同场景on/off对照；这些是本轮覆盖限制，不拆成一串新增整改单，也不称所有小字对比均已通过。

详细数值在light/dark-metrics.json、final-light-metrics.json、light-focus-metrics.json、narrow-metrics.json、code-native-comparison.json、link-native-comparison.json。

## 原生提示的小修

生产仅修改runtime-src/pet.html与pet.mjs：初始无条件“双击喂饭”改为中性的加载提示；真实已解码集合包含react才提示“点击回应”，包含eat才提示“双击喂饭”。使用当前包名更新可访问名称和窗口标题，拖动/菜单提示保留。复用decodedMedia，没有新增配置或通用提示系统。

实际隔离原生DOM核对见native-accessibility.json：

- 0.5.2两段：点击回应、拖动移动、右键菜单，没有喂饭。
- v1完整包：仍提示双击喂饭。
- 切回0.5.2：喂饭提示移除，标题恢复本套名称。

这是本次提示路径的定向验证，没有无变化重跑旧启停/授权/冷启动矩阵，也没有给低风险文案另写一套镜像单测。源码/JSON检查、本地构建通过。

## 复用和复看

workspace-fixture.mjs仅以官方dsh-llm消息/流构造器及已审Session标准事件装载合成内容；workspace-inspection.mjs只读CSS和布局。依赖沿用目标DSH 0.2.1-rc.5/MIT SDK，没有新增第三方包。UI状态通过隔离renderer命令驱动，属于作者受控检查，不冒充用户真实客户端或主控独立CUA结论。

当前隔离Host、renderer和原生窗口暂留给主控复看；私有连接资料仍只在.local/skin-foundation-current.json，不放入报告。当前工作区是已展开的合成消息，外窗恢复1180×820、浅色。复用现有环境无需再workspaceSeed；新环境可按以下步骤加载一次：

```sh
ELECTRON_RUN_AS_NODE=1 '/Applications/DeepSeek Harness.app/Contents/MacOS/DeepSeek Harness' packages/dsh-skin-core/scripts/isolated-host.mjs --model-fixtures --config-fixtures designs/dsh-skin-v1/content/archive-warm-whale-a1-m4-grounded
.cache/electron/45.2.1/darwin-arm64/Electron.app/Contents/MacOS/Electron packages/dsh-skin-core/scripts/isolated-renderer.cjs
```

renderer-ready后，在项目根用control调用host workspaceSeed一次、host select archive-warm-whale；展开“已完成，用时…”和“已调用工具”，即可使用真实界面查看代码/表格/工具卡片。原生标签在现有/test/pet测试回读中可查。复看结束由环境操作者先page quit、再host quit。

源码和0.5.2内容现固定，待主控本阶段审核。A2美术由皮肤线另行交付；真实外部模型、客户使用、更多自主玩法及发布部署仍各自待验。本轮未改真实安装/profile、暂存/提交/推送/发布。
