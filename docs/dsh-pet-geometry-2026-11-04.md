# 内容几何适配与新母版原生拟合

**本节点以 completed-with-findings 正式交审，整体及真实拖动尚未通过。** 离线资源核对 8/8、适配器与主进程命中测试 35/35 通过。桌面实测已完成连续播放、点击返回待机、685/548 缩放、真实坐标穿透、旧包切换及停用恢复。主进程与渲染端的内容命中范围已统一；唯一待验项为真实拖动及道具跟随，包含修后命中链的实际复核。历次锁屏及失败记录完整保留，锁屏期间计时不算可视或输入验收。

已完成的原生证据见 `native-progress.json`：连续 9.909 秒观测到 4 次待机回环，全部为播放中且 loop=true；直接点击人物后 15 份采样为单次 react，随后 34 份采样返回 loop 待机。`through-proof.json` 记录实际坐标点击：屏幕 [820,667] 投影至原生 [261.61,306.35]，位于人物矩形内、Alpha 轮廓外，ignoreMouseEvents=true，下层可信点击使计数 0→1。此前无障碍直接触发的点击坐标不吻合，未用作穿透通过证据。

准确 0.7.1 的原生显示、单次回应结束、切回新母版恢复 1 窗口/2 道具、停用 0 窗口及启用恢复，分别见 `native-legacy-071.json` / `.jpg`、`host-events.jsonl`、`native-master-restored.json`、`native-disabled.json`、`native-enabled-before-main-input-fix.json`。这些已通过项保留，不重复运行。

拖动暂只记录事实：修前 CUA 序列在按下 buttons=1 后的移动事件未保持 buttons=1，窗口没有位移，原事件见 `input-trace.json`。用户报告已拖后，指定实例没有对应输入或位移，未据口头确认判通过。修后再次收到“已解锁并拖动人物”，立即保存日志与快照，仍无新输入，位置保持 [400,424]；随后的 CUA 只读状态请求仍返回锁屏，没有执行点击。证据见 `manual-after-main-mask-events.json`、`native-manual-after-main-mask.json`、`native-app-after-main-mask-manual.log` 和 `ui-blocked-after-main-mask.json`。当前不能确认工具或上游是拖动根因；没有改引擎伪造按住状态，也没有把 position API 代替真实拖动。

本轮仅为隔离拟合：准确 0.7.1 的两段 362×362 媒体，以及第四张母版的两段 499×1024 轻动作。原 0.7.1 的文件、内容 key、`canvasHeight=195`、`canvasOffsetY=10`、大小默认 100 均保持原样。新素材使用主控已审的 12 份原生 PNG/WebM，派生资源另有独立 key，不冒用原包身份。

## 适配方式与实际代价

每组内容用同一个等比仿射变换，完整保留源画面，增加透明留白到上游现有 640×360 画布，脚线映射至 y=330。上游的 9/16 窗口计算与 shared-core 原样复用，没有新几何引擎。

| 内容 | 源尺寸 | 参考图像高度 | 私有原生 size | 派生时长与帧数 |
| --- | --- | --- | --- | --- |
| 准确 0.7.1 | 362×362 | 195 px | 367 | 待机 3 秒/12 帧，回应 1.8 秒/12 帧 |
| 第四张母版 | 499×1024 | 350 px，来自已审 respond 组合板 | 685 | 呼吸 2.5 秒/60 帧，侧头 1.5 秒/36 帧 |

旧 `canvasOffsetY` 与其余默认设置只作为来源合同原样保留；本实验不是对正式旧渲染器配置语义的整套迁移。这里将原 195 高度映射为参考图像高度，并以实际 Alpha 脚线拟合。正式配置与 DSH 接入另验。

最小上游 patch 位于 `experiments/dsh-pet-geometry/patches/dsh-pet-content-hooks.patch`：8 文件，20 行新增、7 行删除，明细见 `patch-cost.json`。接缝为加载本方内容参数/适配器、舞台挂载与销毁、可选 Alpha 命中判断、根据内容循环属性接现有播放，以及沿现有 input-regions IPC 传递可选 bodyRects。loop 只作用于无第三方 playbackId 的待机；明确点播编号仍保留有限播放回执。人物不启用尚未审过的镜像。

内容命中轮廓由两段动作的全部归一化帧及编码后解码帧的 Alpha 联合生成（阈值 >16/255）。矩形只作范围，透明轮廓实际另判，已准备一个**位于人物包围框内**的透明测试点。轮廓是保守的帧联合，并非逐帧像素级交互承诺。

本轮发现并经主控独立源码核实的遗漏是：渲染端已用内容轮廓，主进程 60ms 指针兜底仍用旧 HIT_BOX。修补将同一轮廓合并为窗口局部矩形，经原有 margin/缩放转换发送；主进程分区、余量计时与 decideWindowIgnore 共享该组矩形。当前新母版已实际送达 297 个区域，见 `native-main-mask-ready.json`。IPC 只接收有限数值、正尺寸、数量不超过 4096 的可选区域；缺省保留旧固定框，拖拽 busy 与控件优先级不变。初次挂载即发布，销毁时移除，不扩协议或平台。

`content-pointer-tests.tap` 共 35/35：本方 5 项和上游 pointer-target 原 30 项。定向覆盖新头像旧框外命中、包围框内透明点、两组内容及 685/548 对应缩放、无元数据旧默认、拖动 busy 与控件行为。代码测试和 IPC 送达不代替修后的实际输入验收。修前补丁代价及失败证据保存在 `main-input-fix/`。

原始留白边缘 Alpha 为 0；VP9 解码后新母版边界最大 Alpha 为 1～2/255，实测噪声保留在离线报告中，不声称有损文件字节级全透明。所有已解码可见像素均落在命中轮廓内，两组脚线没有上下漂移。

独立新书、杯使用 manifest 的 ground 锚点，并按已审 respond 板放在角色身边：参考高度 83/41 px，地面横向偏移 -177/-90 px。随同一舞台位置与大小变化，不创建道具窗口，不声称握持。坐姿凳和攀爬支点仍嵌入原图，锚点仍为视觉估计；新走/跑/爬仅单帧，侧躺漂移排除，本轮不消费设计线后续的新步态片段或节奏计划。

## 运行与恢复入口

仓库根目录执行：

```sh
node experiments/dsh-pet-geometry/setup.mjs
.local/pet-engine-comparison-20261104/media-venv/bin/python experiments/dsh-pet-geometry/prepare_media.py
node experiments/dsh-pet-geometry/patch-upstream.mjs
node experiments/dsh-pet-geometry/build.mjs
node experiments/dsh-pet-geometry/run.mjs
# 另开终端
node experiments/dsh-pet-geometry/launch.mjs native
node experiments/dsh-pet-geometry/launch.mjs console
```

当前私有工作目录 `.local/dsh-pet-geometry-20261104`，服务地址与 PID 以其中的 `runtime.json` 为准。应用为 `local.dsh.pet-geometry.native` / `local.dsh.pet-geometry.console`。为装入本次主进程补丁，仅重启了本方原生实例；服务、控制窗和新实例现场仍保留，解锁后不要重复启动。先保存当前输入/窗口证据，再核对指定人物并另记可视验收 epoch，排除锁屏区间。所有界面与输入均在桌面实例验收；本地控制服务是实验夹具。

原始输入清单与审查依据见 `baseline.json`、`material-corrections.json`；输入 manifest/layout 快照已固定，避免后续设计线更新混入本轮。初始空 `sleep:[]` 配置曾被上游判为非法并回退动作表；搭建记录保留在 `initial-native.json`。现已省略可选 sleep，并在构建阶段及实际 GET/config 两处核对生效值，见 `config-confirmed.json`。

旧 dsh-pet-integration 隔离实例已按主控许可正常退出，冻结与失败证据保留。旧比较、底座 F1/dev20、正式素材、生产插件与日用 DSH 未操作；没有 commit/push/tgz/deploy 或模型调用。

## 剩余门槛与交审状态

唯一待验项为真实按住拖动、窗口位移及书杯锚点跟随，包含修后命中链的实际复核。已经发出的解锁及指定人物拖动请求继续保留；按主控最新要求停止解锁请求、重启与拖动尝试，保留实例及冻结，不追加输入补丁，不调整系统锁屏设置。未将缺少目标实例事件归因为用户操作错误。

本次正式交审索引为 `reports/dsh-pet-geometry-2026-11-04/handoff.json`，状态 completed-with-findings；`source-freeze.json`、`runtime-freeze.json` 固定源码与实际运行文件的 SHA256。此前 `main-input-fix/source-freeze-candidate.json` 保留为第一次补丁候选快照。主控独立审查补丁及已完成证据，整体与拖动仍留待补验。

离线结果：`reports/dsh-pet-geometry-2026-11-04/offline-verification.json`；派生资源和元数据：`.local/dsh-pet-geometry-20261104/assets/content-map.json`；恢复状态：`pending-native-ui.json`。`native-progress.json` 是首次解锁区间的历史统计，其顶部旧待办由本交接索引替代。交审后只读梳理真实隔离 DSH 的最小接入入口，复用现有主题、授权、启动和工作事件；具体实现待主控统一下达。
