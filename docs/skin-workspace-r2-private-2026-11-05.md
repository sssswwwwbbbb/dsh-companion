# R2 桌面私有集成验收 · 2026-11-05

R2 已进入官方 DSH 桌面客户端，普通会话流程、开卷/归档、模块停止恢复和原生高清人物均有本机证据。当前状态是**实现线自验完成，提交主控独立审查**，整套皮肤尚未由主控或用户最终验收。

唯一交接入口：[验收回执](<<本机路径>/reports/dsh-workspace-r2-2026-11-05/receipt.json>)。私有内容标识 `45fd34eef50be7b3e17e6cbfed3c545e0506379910c489868673b27cee43fe22`；实际构建与运行绑定见 [runtime-binding](<<本机路径>/reports/dsh-workspace-r2-2026-11-05/runtime-binding.json>)。

| 范围 | 本轮结果与证据 |
| --- | --- |
| 工作区 | 官方 Theme/Slot、原导航/会话/对话/输入/文件控件；固定 rc.5 叶子适配。56 对图标打包、50 类有宿主映射；真实 [文件树](<<本机路径>/reports/dsh-workspace-r2-2026-11-05/files-tree-final.png>)、[文件原文](<<本机路径>/reports/dsh-workspace-r2-2026-11-05/file-open.png>)、[浅色](<<本机路径>/reports/dsh-workspace-r2-2026-11-05/final-workspace.png>)、[暗色](<<本机路径>/reports/dsh-workspace-r2-2026-11-05/dark-workspace-final.png>)。未对每枚图标扩大状态矩阵。 |
| 普通流程 | 实际复制并粘贴回读；原 OS 文件选择器附加本地60字节文件；键盘切换离线模型 `probe-alt`；原按钮发送、停止，记录 `aborted` 且无完成演出。两个不同 Session 的绑定和返回草稿已核对。[覆盖详情](<<本机路径>/reports/dsh-workspace-r2-2026-11-05/desktop-coverage.json>) |
| 开卷/归档 | [开卷实际序列](<<本机路径>/reports/dsh-workspace-r2-2026-11-05/opening-actual.mp4>)34帧，约4.4秒；完成序号25/33触发归档，[归档实际尾段](<<本机路径>/reports/dsh-workspace-r2-2026-11-05/completion-actual-tail.mp4>)可见纸页/角色/收起并回会话。归档拍摄从触发后约1.8秒开始，未拍全展开起点。原失败帧和修后日志保留。 |
| 开关与清理 | 动效关闭→静态预览/Esc退出；呼应关闭→角色静态回退；细节关闭→撤去纸面、图标、陪伴位；设置页更新不重建工作区位。全部效果停止时 backend=null/windows=[]，恢复后草稿保留，四个主题布尔偏好恢复为true。私有外观恢复跟随系统。系统“减少动态”分支保留，未更改系统设置实测。 |
| 原生人物 | 原始499×1024视频按原仿射几何重新派生1920×1080；可见源高度318→954，实际显示约681像素。[同尺寸修前](<<本机路径>/reports/dsh-workspace-r2-2026-11-05/native-no-default-props.png>) / [修后](<<本机路径>/reports/dsh-workspace-r2-2026-11-05/native-high-density-after.png>)；相位和窗口位置不同，均为sprite685。真实头部点击2条trusted事件、14个react播放样本，结束回呼吸；透明探针alpha0，脚线和命中几何相同。[实际加载读回](<<本机路径>/reports/dsh-workspace-r2-2026-11-05/high-density-readback.json>) |
| 道具 | 当前普通站立 `props=[]`，书杯资源和能力保留；使用姿势、接触和遮挡未交付前不显示。旧跟随机制验收作为历史证据保留。 |

本轮合同增量：theme configVersion3、受限preset、成套图标和固定角色资源引用、两个声明式布尔开关；旧1/2兼容。资产数量上限32→128（当前124）；64KiB清单、128MiB总量与单项上限保留。当前清单49,651字节、资源6,380,277字节。首次缓存格式化超过64KiB的问题，仅对v3改用紧凑JSON并完成实际缓存往返检查。拒绝任意CSS/脚本/未知preset与错误媒体类型。

源码差异11项见 [差异索引](<<本机路径>/reports/dsh-workspace-r2-2026-11-05/source-differences.json>)；[源冻结](<<本机路径>/reports/dsh-workspace-r2-2026-11-05/source-freeze.json>)、[运行冻结](<<本机路径>/reports/dsh-workspace-r2-2026-11-05/runtime-freeze.json>)各自独立。最后两行静态回退修补已进入最终加载构建；未另做媒体故障注入。

验证：新增定向测试 **8/8通过**。继承skin-core **68项：63通过、5失败**；原H4基线同命令也是63/5，触发测试和所读源码逐项SHA一致。[完整结果与对应原因](<<本机路径>/reports/dsh-workspace-r2-2026-11-05/core-regression-comparison.json>)附两份原始输出。不能据此称全套测试通过，也未扩修旧基线。

保留边界：原H4源35/35不变、运行125/126不变；唯一运行差异仍为此前主控接受的未使用配置项再生成。R2设计源12/12不变。未改071原开场/原1024母版、日用DSH或授权；未提交、推送、打包发布或生产迁移。整套素材权属、真实外部模型、真实引用聚合、新开机片和走路均不在本轮通过项；离线夹具外部模型调用0。

下一门：主控独立代码审查及实际证据复核，通过后按主控派工继续。当前不要重新运行首制 `prepare.mjs` 覆盖已绑定的高清候选；检查使用现有冻结目录，重建只用 `experiments/dsh-workspace-r2/build.mjs`。本轮不接入设计线的新启动片或步态。
