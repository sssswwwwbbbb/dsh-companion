# M7 首套皮肤本地收束验收

2026-11-03，主控验收。结论：M7及定向返工M7-F1通过，首套0.7.1达到可查看、可操作、可复核的本地隔离候选结束线。底座与皮肤两条工作线本轮收束；制作器、上传和市场继续后置，等待用户对视觉、真实客户端及模型体验的下一步反馈。

## 本次交付身份

| 对象 | 本轮准确身份与范围 |
| --- | --- |
| 插件开发目录 | `packages/dsh-companion/`，版本仍为`0.1.0-dev.11` |
| 当前源码 | M7-F1同范围112文件，SHA256 `65b1bca875b99bb01e88f296357b35e917004b4f46fdf0ebd102334b36714a6b` |
| 普通内置内容 | `skins/archive-warm-whale/`，内容版本0.7.1，contentKey `4b643de142bb2770340cd56d7c2acd5bced3b09a69ddbf27cd3025d29639620b` |
| 内容输入 | `designs/dsh-skin-v1/content/archive-warm-whale-startup-m6-ready/`，构建校验后同步7文件，运行时不依赖设计目录 |
| 本地构建 | 55份插件文件与59份Mac原生payload分别核对；完整Electron分发体沿用已有缓存/构建记录 |
| 安装归档与发布 | npm pack仅dry-run证明文件包含；未生成本轮安装归档，未替用户安装或发布 |

三模块为工作区主题、A2两状态桌宠、8.20秒静音开场。八项皮肤参数各有默认值；两个开场开关复用既有状态与动作。公共协调器、控制器、原生播放与M6兼容修复在M7保持不变。

## 验收依据

模块线原五项日常串联见`reports/skin-foundation-m7-2026-11-03/daily.json`：fresh普通内置应用，预览/偏好同步，合成工作区与准确A2媒体，一次受控互动及大小105停止恢复，关闭桌宠后停止恢复并重新启用。受控模型调用1次，真实模型/工具执行0。皮肤线`reports/first-skin/m7-user-view-review.md`基于实际截图复看，没有新增阻断；其范围是截图与文案，不作为独立点击回执。

主控检查了M7实际差异、本地构建、准确内容及源码清单，并发现M7-F1：首次selected=null时，停止后不应显示读取selected.id的恢复按钮。返工只增加现有selected显示条件，同步生成client；112文件中仅模板和生成client相对原M7变化。模块线两条实际UI检查分别证明未选皮肤停止后无恢复按钮，以及已选0.7.1停止后仍能主动恢复；原证据保留。

主控实际CUA复验修正版：

1. 从普通皮肤页点击就近“预览开场”，观察原生开场；Host回读videoEnded=true、completions由0到1，自动偏好仍false，桌宠可见。
2. 皮肤页打开自动播放，开始使用页读为true；在开始使用页关闭后返回皮肤页读为false。确认已选整套时旧配置编辑/旧启动桌宠按钮隐藏，“前往皮肤设置”可达，footer为当前0.7.1。
3. 结束原Electron测试renderer后，将同一隔离Host交接至保留的应用内浏览器，避免两个页面竞争。新页面三个模块仍ready、八项默认正确、auto=false、completions仍1，重连未重播。

主控证据集中在`reports/skin-foundation-m7-acceptance-2026-11-03/`：`source-after.json`、`plugin-build-after.json`、`native-build-check.json`、`after-preview.json`、`ui-sync.json`及`final-state.json`。代表截图为`opening.png`、`managed-setup.png`、`controls-final.png`和`live-review.png`。主控没有新增模型调用，也没有重跑未变更的历史矩阵。

## 可查看的本地交接

当前隔离预览地址为`http://127.0.0.1:59621/`，应用内浏览器页已保留在“陪伴→皮肤”。Host及原生桌宠为评审保留，旧Electron renderer已退出；保留的是合成测试profile，真实用户DSH/profile和启动入口未改。该地址只对应当前本地进程，关闭后不能当作永久托管地址使用；环境重启沿用模块现有隔离脚本。

使用步骤与实际八项设置见`docs/first-skin-design/local-use-guide.md`；主题、透明媒体、单片开场及默认声明制作过程见`docs/first-skin-design/production-notes.md`。不用继续补新框架或扩建配置系统。

最终角色服装/动画节奏仍为候选；宿主代码语法色和链接保留已记录的部分覆盖限制。真实客户端安装/业务、真实外部模型质量和用户审美尚未验收；素材来源与NOTICE差异维持本地/隔离使用范围。本轮没有暂存/提交、推送、部署、上传或公开分发。
