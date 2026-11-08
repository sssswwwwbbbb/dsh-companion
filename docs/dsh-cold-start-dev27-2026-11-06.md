# DSH 0.2.2-rc.1 兼容修复

2026-11-06，Mac arm64 日用 DSH 已通过「插件 → 添加插件」覆盖安装并启用 `dsh-plugin-companion@0.1.0-dev.27`。同一 DSH 窗口保留「冷启动」0.4.0、83% 角色大小和自动开场。主题、桌宠和开场均显示就绪，桌宠窗口可见并停在高清待机帧。[本地安装包](../dist/dsh-plugin-companion-0.1.0-dev.27.tgz)

dev.26 的 `engines.dsh` 精确声明为 `0.2.1-rc.5`，宿主升级后会拒绝加载。dev.27 精确列出 `0.2.1-rc.5` 和 `0.2.2-rc.1`，并同步插件依赖、服务与开场的版本判断。两套内置皮肤沿用原清单、资源和内容标识。外部皮肤仍按各自清单的 `dshVersions` 检查。[DSH 官方兼容规则](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.2.2-rc.1/docs/user/develop/basic/publish.md)

| 验证 | 结果 |
| --- | --- |
| 官方 0.2.2-rc.1 隔离安装 | 包正常加载，两个内置皮肤均入库 |
| 官方 Mac 主窗口冷启动 | 片尾自然回到带主题的工作区，紧凑陪伴位与原生桌宠可用 |
| 同一隔离包前台换肤 | 「冷启动」与「档案暖白 · 鲸鱼娘」双向通过，两次切换后三模块均就绪 |
| 同一隔离包桌宠缩放 | 87% 到 88%，原生尺寸 596 到 603，保留窗口、进程、人物中心和皮肤代次 |
| 日用 DSH 覆盖升级 | dev.27 已启用，选择、桌宠大小、自动开场偏好保持，桌宠可见。日用窗口内完成热恢复，冷启动在隔离实例验收 |
| 归档与源代码测试 | 两套皮肤共 133 项素材摘要匹配，109 项自动测试通过 |

隔离验收早期有一次换肤清理确认失败和一次应用失败。随后移除临时诊断代码，将 DSH 窗口明确置于前台，在原样安装包上完成双向换肤。前两次失败的原因未单独确认。本轮实机使用 0.2.2-rc.1，0.2.1-rc.5 保留兼容声明。[官方安装回执](../reports/dsh-cold-start-dev27-2026-11-06/official-host.json) · [归档校验](../reports/dsh-cold-start-dev27-2026-11-06/archive-exact.json) · [隔离开场截图](../reports/dsh-cold-start-dev27-2026-11-06/cold-opening.jpg)

安装包 SHA-256 为 `ce4243371a1f0d1fbbd04ddf3d1bdf243fc6f5552ad52fcd329a59aa30e47f00`。从项目根目录可用以下命令重建。

```sh
node experiments/dsh-cold-start-install/stage.mjs .local/dsh-cold-start-dev27-rebuild 0.1.0-dev.27
cd .local/dsh-cold-start-dev27-rebuild
npm run package:mac
```

## 早期安装候选记录

dev.22 至 dev.24 的安装说明已由当前验收基线接替，早期复现和验收回执继续留存。

- dev.22 验证官方 Host 装载和解包，以及桌宠左走、转正、回待机和退出。[验证汇总](../reports/dsh-cold-start-dev22-2026-11-05/summary.json)
- dev.23 在隔离 DSH 验证 dev.18 → dev.23 → dev.18 的授权、会话和设置保留。日用环境另复现迟到开场和影片提前结束。[隔离回执](../reports/dsh-cold-start-install-qa-2026-11-05/dev23-primary-review.json) · [日用复现](../reports/dsh-cold-start-dev23-field-2026-11-05/observed.json)
- dev.24 改由实际媒体结束事件收尾并验证慢速播放、取消和减少动态。待机循环和暂停的性能对照留在原始采样。[验证汇总](../reports/dsh-cold-start-dev24-2026-11-05/summary.json) · [原始采样](../reports/dsh-cold-start-dev24-2026-11-05/ordinary-restart.json)

