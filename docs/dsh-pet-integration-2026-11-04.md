# dsh-pet 原生桌面隔离适配交接

**本轮隔离自验通过 18/18，待主控独立验收。**

验收对象仅为桌面端。使用固定 dsh-pet **0.4.1 / 51c3395d9e175d80fd7e29c6864da3747ebfe209**，通过官方 `lib/app.js` 启动原生宠物窗口，独立 DSH_HOME、appData、userData 与应用标识。本地诊断控制窗仅用于隔离验证，不是正式皮肤配置页。

本轮保留上游的播放、运动、输入、随机选择、工作联动与睡眠链。产品侧仅协调“自由活动 / 看书”的意图及打断后恢复，并组合书杯。皮肤统一主题、启动、授权和整包切换事务仍属产品职责，尚未迁移。

## 已验证结果

| 验收点 | 原生实跑证据 |
| --- | --- |
| 慢走 / 小跑 | 真实播放 4.010 / 3.017 秒，位移 +254 / -363 px；播放编号关联实际前台视频 |
| 忙碌 / 停止替换 | 重复走位真实 failed/busy；已在播的移动被回应动作替换后 cancelled/superseded |
| 自主行为 | 连续 95.234 秒无外部点播，6 种动作源、左右朝向，横向范围 -94～777 px；冻结样本为零 |
| 用户互动恢复 | 直接通过 CUA 点原生宠物本体，回应后恢复上游自主动作与走跑 |
| 工作 / 临时互动恢复 | 看书 → 工作循环且清书杯 → 结束工作回看书；临时互动完成后恢复原看书意图 |
| 同窗位置 / 缩放 | 同一承载窗平移 -1472 px，道具随行；420 / 560 尺寸的锚点比例最大偏差小于 0.00003 |
| 换肤 / 停用清理 | 代表皮肤切换清旧道具；恢复后只有两件；停用时 0 窗口，启用后 1 窗口与 1 组道具 |
| 资源清理 | 2 项适配器测试覆盖 dispose 清理、取消后迟到响应不复活；控制窗、原生渲染与适配器无错误，无外部请求被触发 |
| 保护边界 | 65 项受保护文件哈希无漂移；原生核心运行文件哈希与原固定包一致 |

当前两个私有应用保留供主控实点：`local.dsh.pet-integration.native`、`local.dsh.pet-integration.console`。交接状态为默认尺寸 420、看书循环、独立书杯各一件、无工作状态及外部占用。接手后底座线不再操作这些实例，避免与主控复核互扰。

## 运行

在仓库根目录执行：

```sh
node experiments/dsh-pet-integration/setup.mjs
node experiments/dsh-pet-integration/patch-upstream.mjs
node experiments/dsh-pet-integration/build.mjs
node experiments/dsh-pet-integration/run.mjs
# 另开终端；两个应用均为此实验的私有副本。
node experiments/dsh-pet-integration/launch.mjs native
node experiments/dsh-pet-integration/launch.mjs console
```

`setup.mjs` 依赖已存在的固定比较依赖和干净 Electron 缓存；运行库通过符号链接只读复用。不得在该链接内安装、更新或构建。新的上游 Git 库从官方仓库独立取得固定 SHA，不与比较冻结源共享 Git 数据库。未使用原生上游媒体，使用的是上一轮相同的旧机制片段。

私有工作目录为 `.local/dsh-pet-integration-20261104`。端口与进程以其中的 `runtime.json`、`native-pid.json`、`console-pid.json` 为准；`native-runtime.json` 含本地鉴权信息，不应外发。

## 证据与范围

结果统一读取 `reports/dsh-pet-integration-2026-11-04/desktop-verification.json`，原始依据为 `native-telemetry.jsonl` 和 `host-events.jsonl`。`acceptance-epoch.json` 标识正式原生验证起点；之前的搭建失败与网页回归证据保留为历史记录。

原生端原本已经将 playbackId 接入真实播放生命周期。此次核验现有链的开始、结束、忙碌和替换取消，**不算桌面端回执修复**。网页分支发现的缺陷、最小补丁与 46 项测试只保留为历史发现，不是桌面交付前置：`patches/historical-web-receipt.patch`，不会被当前桌面控制窗构建引用。

桌面接缝仅 `patches/desktop-scene-hooks.patch`：HTML 加载可选适配器、舞台挂载一次、sprite dispose 时释放一次，共 3 个上游文件、5 行新增；没有修改原生播放、运动、选择器或 shared-core。`scene-adapter.js` 是本实验自有的场景组合代码。

书、杯是两个独立图片节点，直接挂在原生 `.pet-stage` 内，共用角色的窗口位置与舞台尺寸；不创建第二个道具窗口。比例锚点只是旧机制示例，未承诺正式美术手持、脚线或坐姿衔接。看书使用上游 sleep 三段序列代表进入 / 循环 / 离开，画面仍为旧睡姿素材。`turn.webm`、`work.webm` 与 `react.webm` 字节相同，只以不同动作名隔开上游的转身 / 工作 / 点击分类，见 `media-aliases.json`。

初次尝试经 PUT /config 调整高级动作表未生效，因为此接口保留磁盘已有高级字段。已改为只修正新私有测试配置，再经官方 POST /reload 重建，GET /config 核对生效值；证据为 `native-config-verified.json`。旧配置下的停滞不算自主转向通过。

## 复核顺序

1. “回到测试位置”→“慢走向右”完成→“小跑向左”完成；慢走中再次慢走应真实忙碌，再“停止并回应”应取消原移动。
2. “开启自主活动”后不发动作，观察上游自行选择、转身和走跑；直接点击原生宠物，观察响应后继续自主活动。
3. “坐下看书”→“开始工作”→“结束工作”，确认工作期间收书杯，完成后恢复看书；“互动并恢复”应沿用同一看书意图。
4. “平移场景”与“切换大小”检查书杯与角色一起移动、缩放；“切换为素净皮肤”清旧道具，“恢复机制皮肤”不重复挂载；停用后原生窗口为零，启用后只恢复一个宠物窗口及一组道具。

场景皮肤切换只是使用同一旧素材的代表验证，不等同完整皮肤整包切换验收。未做旧包几何矩阵、真实 DSH 接入、模型调用或正式角色动画验收。未提交、推送、打包、部署，未操作比较冻结服务 / 预览、F1、dev20 或日用 DSH。完成后由主控独立复核，再安排下一节点。
