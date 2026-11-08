# 母版04 · 原生左向走路有限拟合

本轮实现线桌面自验通过，提交主控独立审核。范围是已审 R2 底座上的一次有限左向行走：真实走路画面、原生位移、自然结束、用户点击与原会话工作接管，以及换肤和停止/恢复。未提交、打包或发布，日用 DSH 未变更。

当前私有实例为「DSH 原生走路 · 有限拟合」，皮肤「母版04 · 左向走路拟合」。Host PID 40727、客户端 PID 40779、原生 supervisor PID 40796、人物后端 PID 44519。最终 Host 与原生 generation 均为 10，theme/pet/startup 均 ready；人物待机、道具 0、错误 0、移动和跟随句柄均已结束。

皮肤 ID `master04-walk-left-private`，内容键 `cf3039e001e969cd02e9d86608e73953f1c39be31ff5bd88379016acd57fe9d5`，125 项资源。原始 071 仍为 `4b643de142bb2770340cd56d7c2acd5bced3b09a69ddbf27cd3025d29639620b`，库与后端登记表各两套。

| 实际桌面路径 | 实现线结果与证据 |
| --- | --- |
| 待机→六周期左走→待机 | 11.25 秒有限动作；根坐标 `(1100,424)→(259,424)`，单调向左 841 DIP，纵坐标保持 424。视频时间实采 `0.0929→11.1601s`，结束回待机且移动句柄清空。 |
| 行走中实际点击人物 | trusted pointerdown `1793846147754` 后 65ms 的首个采样已停止，停在 `(833,424)`；取消走路、侧头回应后待机，后续无残余位移。取消事件有原生运行日志；稍后直接查旧播放回执时已过期。 |
| 行走中在原会话实际发送 | 原 UI 发送 `Local walk work-interruption check.`，原始 turn/start `1793846285483`；工作接管并停止在 `(501,424)`。走路回执 cancelled/superseded，工作完成后回应→待机，未自行续走，外部模型调用 0。 |
| 代表性换肤 | 原 UI 切 071 再切回走路候选，旧人物进程退出，新人物 ready；没有重跑所有方向/速度矩阵。 |
| 原 UI 停止全部→恢复 | 停止时 backend PID 空、窗口 0；恢复后新 PID 44519、Host 与原生 ready 一致、人物可见、props 0、句柄清空。 |

先看 [实际原生窗口片段](<<本机路径>/reports/dsh-walk-native-2026-11-05/natural-native-actual.mp4>) 与 [六帧对照](<<本机路径>/reports/dsh-walk-native-2026-11-05/natural-native-contact.png>)。这是按原采样时间整理的实际 CUA 窗口裁图，位置标注来自对应原生遥测；它不是整个桌面录像。原始截图、时间戳和窗口 bounds 均保留。

完整事实入口为 [desktop-results.json](<<本机路径>/reports/dsh-walk-native-2026-11-05/desktop-results.json>)，对应 `natural/user/work-native-timeline.json`、`user-trusted-input.json`、`native-runtime-events.json`、`work-completed-host.json`、`atomic-stopped.json`、`final-runtime-status.json`。原生恢复截图为 `atomic-restored-native.png`，原 UI 为 `atomic-restored-ui.png`。失败和无效尝试单列于 `excluded-attempts.json`，没有计为通过。

原片 SHA `f7a64c9d56306d34ff82d236a34eef812fcacb4237fb5bee59e847fbab91c6a8`：720×960、24fps、45 帧、1.875 秒。派生片把同一固定几何变换后的 45 帧重复六次，1920×1080、270 帧、11.25 秒、13,363,823 字节，SHA `931f2109773c1f6ca718cc0572bdbc911897582e38a38423527399cb31adff63`。实际加载文件与派生片摘要一致。所有帧使用同一缩放/平移，固定地面 `(320,330)`；头顶细羽不参与身体尺度估算。鞋底实采约有 1 个逻辑像素变化，固定命中区采用全帧保守合并。

位移继续由 dsh-pet 原有 video.currentTime 驱动，一处施加根位移。原 `sprite/motion.js`、`sprite/playback.js`、`shared-core.js` 与 R2 字节一致；没有新增逐帧引擎或模型决策。脚部接地速度拟合约 69.86 逻辑像素/秒，原生大小 685 时目标约 841 DIP。首轮误用媒体画布 640 为原生参考宽度，实移 1165 DIP，判失败；已按原生 `PET_REF_WIDTH=462` 修正距离换算并保留前后证据。`content-adapter.js` 仅补上换入非走路素材时停止原移动句柄的接缝。

停止/恢复初次收尾发现快照直接覆盖写时可暴露 0 字节，Host 因此曾持久标记 `SKIN_NATIVE_LOST`。读侧 82,009 次采样复现空文件；仅把新候选的快照写端改为临时文件完整写入后 rename。未改后端存活/注册判定、超时或丢失处理。修后同一路径实际恢复，62,003 次并发读取无坏样本。新增并发回归与走路合同/换片取消/原引擎时钟/462 换算合计 **6/6 通过**。继承 R2 的 68 项旧回归仍按已审报告记 63 通过/5 项原有失败，本轮未重跑或扩修。

这是主控事先限定的六周期观察适配，尚未交付通用连续走路、右向镜像或多方向/速度系统。44→0 帧的头部/手/裙摆轻微接缝以及侧身走路与正面待机的硬切仍存在，需要设计素材后续改善。本轮保留已审底座与既有占位主题，未接入「机械姬×指挥官」新主题、声音或新开场，也未改全局 system prompt。

主控可在当前实例直接观察，或从项目根目录运行既有私有探针：

```sh
node experiments/dsh-walk-native/probe.mjs walk-start
node experiments/dsh-walk-native/probe.mjs walk-stop
node experiments/dsh-walk-native/probe.mjs status
```

`walk-start` 仅触发一次有限行走。左侧空间不足会拒绝 `WALK_LEFT_SPACE_REQUIRED`；可用原界面停止全部后恢复回到拟合起点。不要为复验同时启动旧 R2/H4 或日用实例。当前 GUI 在本候选，交主控后实施线停止操作鼠标。

源码冻结 94 项，聚合 `b565e2e9729b9a9bb94d8a0d16a21afc1483c0d28acbc4f61687a8272f64b0a3`；实际运行冻结 540 项，聚合 `8be5667ead68e48a6d1640f7a832851fcc9b5bc3eaceb7295ca451523b9db712`。入口分别为 `source-freeze.json`、`runtime-freeze.json`，报告与本文冻结于 `evidence-freeze.json`，总回执为 `receipt.json`。所有索引路径统一相对项目根目录，聚合算法均为 `sha256(json.dumps(files,separators=(',',':'),ensure_ascii=False).encode())`，保持 files 顺序与每项 `path,sha256,bytes` 键序、不加换行；文件本身的 SHA 与该聚合不同。

保护读回：旧 R2 源码 76/76、运行 410/410 未变，H4 源码 35/35 未变、运行 125/126 与此前已审摘要一致；唯一旧 H4 main-config 的 `maxBodyWidthPct=100` 再生差异沿用主控已确认例外，无新增旧代码/素材变更。详见 `protected-freeze-readback.json` 与 `runtime-binding.json`。
