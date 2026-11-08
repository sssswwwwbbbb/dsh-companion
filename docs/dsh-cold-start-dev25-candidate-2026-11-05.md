# 「冷启动」本机修复包 dev.25

适用 Mac arm64 和官方 DSH 0.2.1-rc.5。皮肤内容为「冷启动」0.4.0，安装包版本为 `dsh-plugin-companion 0.1.0-dev.25`。请通过 DSH 的插件管理器添加本地包并启用，然后在「陪伴 → 皮肤库」选择「冷启动」。本机隔离升级保留了同一授权、会话、草稿和主题偏好。[dev.25 安装包](<<本机路径>/dist/dsh-plugin-companion-0.1.0-dev.25.tgz>)

- 直接打开 DSH 会进入工作区并恢复桌宠。开场可通过「本套设置 → 预览开场」播放，也可在开启「陪伴启动器开场」后，用陪伴启动器打开尚未运行的 DSH。DSH 已在运行时，启动器只聚焦窗口。
- 正常影片由实际媒体结束事件收场。减弱动态或媒体卡住时走静帧。原片 12.5 秒，慢播实测约 18 秒仍能到片尾。[启动与慢播回执](../reports/dsh-cold-start-dev24-2026-11-05/summary.json)
- 左下角改为 45 像素的紧凑角色条。已在隔离工作区点开目录最下方会话。[实机截图](../reports/dsh-cold-start-dev24-2026-11-05/primary-review/sidebar-dev24.jpg)
- 桌宠无动作时停在原 1920×1080 素材的首帧。左走、转正和待机切换保持同一个桌宠进程。两次在同一台 Mac 的隔离工作区进行 10 秒采样，桌宠进程组占一个 CPU 核心的比例由 31.8% 降至 2.1%。这个数字仅衡量桌宠进程组。[新版待机](../reports/dsh-cold-start-dev25-2026-11-05/primary-review/idle-dev25.json) · [旧版待机](../reports/dsh-cold-start-dev24-2026-11-05/primary-review/idle-dev23.json)

安装包 SHA-256 为 `6836bf29efae26336dd2ed47e06035a77f79f2bd50e65d3292ded18efb540a81`。主控安装与验证在隔离 DSH 上执行，日用 DSH 的安装和设置未改动。[验收回执](../reports/dsh-cold-start-dev25-2026-11-05/primary-review/review.json)
