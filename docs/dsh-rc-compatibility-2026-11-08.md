# 最近三个 RC 的兼容交付与集中验收

日期：2026-11-08。目标 DSH 为 `0.2.1-rc.4`、`0.2.1-rc.5`、`0.2.2-rc.1`。插件候选为主题盒子 `1.1.0-dev.5` / build `10005`，包含 dev.4 的独立下载队列和分页库。用户随后明确要求同步云端，现安装更新通道已发布 `1.1.0-dev.5`；本轮 Windows 集中实机验收仍单独记录。发布到云端不等同于已完成人工实机验收。

## 交付物

| 项目 | 新版本 | 文件 |
| --- | --- | --- |
| Mac ARM64 插件 | 1.1.0-dev.5 | [dsh-plugin-companion-1.1.0-dev.5.tgz](<<本机路径>/dist/dsh-plugin-companion-1.1.0-dev.5.tgz>) |
| Windows x64 插件 | 1.1.0-dev.5 | [dsh-plugin-companion-1.1.0-dev.5-win32-x64.tgz](<<本机路径>/dist/dsh-plugin-companion-1.1.0-dev.5-win32-x64.tgz>) |
| 冷启动 | 1.0.1 | [commander-workspace-private-1.0.1-rc-compat.zip](<<本机路径>/dist/skin-rc-compat/commander-workspace-private-1.0.1-rc-compat.zip>) |
| 黑焰 | 0.2.3 | [black-flame-0.2.3-rc-compat.zip](<<本机路径>/dist/skin-rc-compat/black-flame-0.2.3-rc-compat.zip>) |
| 天空龙 | 1.0.6 | [duelist-sky-dragon-1.0.6-rc-compat.zip](<<本机路径>/dist/skin-rc-compat/duelist-sky-dragon-1.0.6-rc-compat.zip>) |
| 独立作者校验工具 | 1.1.0-dev.5 | [dsh-skin-author-kit-1.1.0-dev.5.zip](<<本机路径>/dist/dsh-skin-author-kit-1.1.0-dev.5.zip>) |

兼容包只修改 skin.json 的 version、dshVersions，原 ZIP 和制作者目录均未覆盖，所有其他清单字段和素材字节一致。稳定 skin.id 保持，领取名额继续按同一皮肤计算。新包 contentKey 会变化，需要下载安装并主动应用，新版不会自动替换旧选择。用户自行上架；本次没有上传或替换云端皮肤包。

## 引擎调整

安装声明、versioned peerDependencies、运行名单和本地服务配置统一到三个 RC。原图标自动开场使用运行配置中的宿主名单，避免另有两版本硬编码挡住 rc.4。

同步修复了兼容包升级触发的会话偏好问题：同 skin.id 的旧 contentKey 可通过已有 skinOwners 识别，分别保留每个会话的回复风格开关和角色开关。未知来源/不同皮肤继续隔离；新会话沿用本套默认，现有会话的单独选择不被其他会话覆盖。偏好修复以三套真实新旧包、重启及跨皮肤切换独立复核通过。

## 实际验证范围

| DSH | 使用的官方运行环境 | 三套皮肤实际 Host 流程 | 当前边界 |
| --- | --- | --- | --- |
| 0.2.1-rc.4 | 官方精确 npm SDK；296 个 DSH 包均为 rc.4，graph.release=ec17a2c | 新装、真实授权、Remote调用、主题CSS、全部布尔配置、完整原生开场、停止/恢复、卸载、插件停启通过 | 尚未跑 rc.4 完整 Electron 桌面壳的原图标冷启动 |
| 0.2.1-rc.5 | 本机保留的官方 Mac app.asar SDK | 上述流程及 dev.3 覆盖升级保留授权/选择/设置通过 | 本轮未重新执行完整桌面壳冷启动 |
| 0.2.2-rc.1 | 当前官方 Mac app.asar SDK | 上述流程及 dev.3 覆盖升级保留授权/选择/设置通过 | Windows 的本轮结果仍需集中实测 |

九次完整开场均按影片时长播放：冷启动约13～14秒、黑焰约9.7秒、天空龙约10.4秒。检查中未调用真实模型，临时测试授权均已撤销，用户真实 DSH profile 没有修改。Host 流程不能代替完整桌面壳和 Windows 的体验验收。

另完成：三套皮肤 × 三个RC × 两个平台 = 18项作者合同检查；独立审查新旧包差异及会话偏好保持；相关自动回归、语法与打包核对。具体摘要、命令和边界见 reports/rc-compat/skin-packages.json、host-research.json、host-<version>.json 及 packages.json。

## Windows 一次集中验收

用同一个 dev.5 Windows 包及三套新皮肤，按下表顺序测试，无需每修一项就重新验收。每换 DSH 版本前完全退出 DSH，并使用对应版本本身的原图标启动。

| 顺序 | 官方 DSH | 安装方式 |
| --- | --- | --- |
| 1 | 0.2.2-rc.1 | 现有版本覆盖安装 dev.5，先确认授权和设置保留 |
| 2 | 0.2.1-rc.5 | 安装对应 DSH，再测试同一 dev.5 插件和新皮肤 |
| 3 | 0.2.1-rc.4 | 安装对应 DSH，再测试同一 dev.5 插件和新皮肤 |

每版统一检查：

1. 插件能安装/启用；导入三套新包并逐套应用，主题、图标和本套设置正确。
2. 三套各预览一次：画面和声音正常、完整播放，Esc可跳过；静音开关生效。
3. 开启“启动时自动播放”，完全退出后用该版 DSH 原图标启动：在工作区出现前自动播放，只播一次、播完进入工作区；修改设置不重启桌面组件，也不重新播放开场。
4. 一套皮肤保存的模块开关、布局/提示配置，以及某会话的回复风格关闭/角色开启，换肤、换回、升级和重启后保持各自选择。
5. 停止本套、恢复、卸载当前皮肤、插件停用/启用正常；主题能还原。原有授权与其他皮肤不丢失。
6. 顺带验收 dev.4 合入的下载队列和分页库：连续加入两至三项任务，仍可搜索/切换列表，取消重试正常，安装完成不自动换肤。

可按“DSH版本／结果／异常动作”一次回报。不需要人工制造上千套分页，上千项列表与并发边界已有隔离验证。

## 首次插件安装的进度边界

这三个 RC 均有公开 install-state 和 install-log，状态包含 installing/cancelling/applying；没有公开下载字节/百分比合同。首次插件尚未安装，主题盒子无法自己修改 DSH 的原生安装弹窗。下方 pnpm 的 resolved/reused/downloaded/added 是包数，不是总安装百分比。

本轮用户遇到的安装失败是云端公开通道两连接限制导致429，已单独修复；记录见 docs/plugin-install-429-fix-2026-11-08.md。
