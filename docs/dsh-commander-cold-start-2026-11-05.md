# 冷启动 0.4.0 桌面验收

「冷启动」0.4.0 已通过主控的 Mac 隔离实机复验。皮肤 ID 为 `commander-workspace-private`，合版内容键为 `3f86c237a24259a617753802eb22d16bd5e47f7e0657961780fa80fdab583c16`。[主控验收回执](<<本机路径>/reports/dsh-commander-cold-start-2026-11-05/primary-review/review.json>) · [实现线证据索引](<<本机路径>/reports/dsh-commander-cold-start-2026-11-05/receipt.json>)

## 桌面实测

| 路径 | 结果 |
| --- | --- |
| 设置保存 | 声音和减少开场动态均从真实开关开启再恢复。采样期间 generation、桌宠 PID、可见窗口 ID 连续，无后端重启事件。合版再次验证了声音开关的两个方向。 |
| 开场预览 | 有声预览按 Esc 后音轨退出并返回原草稿。静音视频自然结束。减少开场动态显示静帧、全程静音。旧 0.7.1 的设置页仍提供预览，声音开关仅由支持它的候选声明。 |
| 实际冷启动 | 设置阶段验证减少开场动态从磁盘读回，播放一次静帧。合版验证声音从磁盘读回，B 版 12.5 秒视频带声自然结束，交接发生在末尾约 0.35 秒。两次均返回原会话，草稿留在输入区，Session 文件摘要一致。 |
| 统一身份 | 皮肤库、陪伴位、开场、设置分别在真实窗口读到「冷启动 / 单元-07 / CS-07」。 |
| 自然左走 | 人物中心从 `(1442.5, 616.65625)` 到 `(601.5, 616.65625)`，向左 841 DIP。原地播放一次 0.625 秒转正，7 个转正样本的坐标一致，随后进入循环待机。原生走路回执沿用同一 ID，在转正播完后结束。 |
| 点击与工作接管 | 真实鼠标按下后 111ms 的采样已进入停止状态。受控 running 状态经现有原生工作回路触发接管后 56ms 的采样已停止。两次原始回执均为 `cancelled / superseded`，观察覆盖原自然结束时间，均没有继续移动或补播转正。 |

可直接查 [真实冷启动开场](<<本机路径>/reports/dsh-commander-cold-start-2026-11-05/combined-opening.jpg>)、[合版冷启动时序](<<本机路径>/reports/dsh-commander-cold-start-2026-11-05/cold-audible.json>) 和 [原会话返回](<<本机路径>/reports/dsh-commander-cold-start-2026-11-05/combined-workspace.ax.txt>)。

走路原始证据为 [自然结束](<<本机路径>/reports/dsh-commander-cold-start-2026-11-05/walk-natural.json>)、[可信点击](<<本机路径>/reports/dsh-commander-cold-start-2026-11-05/walk-click.json>) 和 [工作状态接管](<<本机路径>/reports/dsh-commander-cold-start-2026-11-05/walk-work.json>)。工作接管使用受控状态输入，原 Session 文件摘要用于核对草稿历史。素材的鞋带、裙边在部分插值帧仍有轻微形变。[素材回执](<<本机路径>/designs/dsh-skin-assets-v3/review/pet-left-stop-2026-11-05/transition-receipt.json>)

转正素材和实际加载文件的 SHA256 均为 `30093949d3049327d86df2f1417b21896fda2c5e2612edeead80de623e8c38c4`，用私有清单中的一个闲置素材名额登记。B 声线源摘要 `5704f18e13b521fc318a2cb4d2dfe92ea2d00a4fdb0dd557045cd63ac392d1b1`，已审 0.3.0 的五项构建摘要全部读回一致。8 项开场回归通过。[测试输出](<<本机路径>/reports/dsh-commander-cold-start-2026-11-05/startup-tests.tap>)

验收启动器启用了无障碍树，并保持隔离客户端在后台时的心跳。一次初测读取到半写回执，随后在探针中使用原子写入并重测通过。一次初测由进入按钮提前结束静音预览，重测已自然结束。点击以记录到可信原生按下事件的重测为准。

## 整套桌面体验入口

主控复验后已重开同一私有候选供个人体验，窗口为「DSH 冷启动 · 隔离验收」。人物在可左走的起点，桌面客户端停在原会话，原草稿可见，声音、减少开场动态和自动播放为验收前的关闭值。[体验实例状态](<<本机路径>/reports/dsh-commander-cold-start-2026-11-05/user-review-ready.json>)

从「陪伴 → 本套设置 → 预览开场」体验开场和返回工作区的衔接。体验 B 声线时先打开「开场声音」。主控实机复验按播放器遥测核对声音，实际听感和整套主题体验留给个人验收。[主控实机左走、收步、转正、待机四帧](<<本机路径>/reports/dsh-commander-cold-start-2026-11-05/primary-review/walk-native-contact.jpg>)

在项目根目录运行私有探针。

```sh
node experiments/dsh-commander-cold-start/probe.mjs walk-start
```

命令只发起一次左走，原生回执包含播放 ID。重复复验可把人物拖回右侧，或用私有探针 `stop-effects` 和 `restore-effects` 重置。左侧余量不足时会返回 `WALK_LEFT_SPACE_REQUIRED`。
