# 皮肤底座三项修复交审

本轮完成已安装坏条目隔离、模块局部参数更新、测试夹具依赖补齐。状态为本地完成，待主控独立验收。没有进入 workspace-v2 整套集成或新增动作适配。

## 行为与边界

- 皮肤库逐条加载、校验快照。目录缺失或资源损坏的条目显示“文件不可用”，其他皮肤和管理入口仍可用；原索引、选择、偏好保留。内置缓存和损坏索引也不会使管理初始化整体失败。本轮没有自动修复、删除或持续监听缓存。
- 参数能否局部更新由所属模块声明。背景浓度和已有主题开关使用页面局部更新；已有桌宠交互偏好由桌宠适配器更新。协调器保留统一排队、确认后提交、停止优先及模块回滚，不维护桌宠参数白名单。
- 页面只复用当前活跃页面所有者、当前代次和内容标识下，已经成功确认的资源载荷；退出、所有者变化或新完整切换需重新校验。新选择仍完整读取、校验资源。本轮未增加跨皮肤或跨安装资源缓存。
- 更新失败只回滚对应模块；回滚也失败则停止并报告恢复需求。停止、禁用时仅保存偏好，过期内容标识拒绝写入。不支持局部更新的参数（例如桌宠几何）仍走原完整事务。
- acceptance-races、partial-pet、startup 的临时运行时夹具补齐 `skin.mjs` 已有的 `work-feedback.mjs` 导入依赖。

## 验证

所有证据位于 `reports/skin-foundation-fixes-2026-11-04/`。

原定向命令复现 39 项：33 通过、6 项因夹具缺依赖而在准备阶段失败。修复后执行：

```sh
node --test --test-reporter=spec packages/dsh-skin-core/tests/*.test.mjs tests/skin-library.test.mjs tests/skin-immersion.test.mjs
```

结果 **77/77 通过，0 跳过**（`targeted-tests.txt`）。新增覆盖坏条目与索引、偏好保留、资源读取、模块回滚及失败恢复、超时迟到确认、两种停止入口、禁用仅存偏好、页面所有者失效，以及更新被新完整切换取代。`build:client`、`build:mac` 均通过；UI 文件机械检测返回空发现列表。

独立 Host、Electron 页面和真实原生陪伴进程验证：

| 场景 | 结果及证据 |
| --- | --- |
| 混合健康、缺失、损坏快照 | 实际管理页显示 3 套，坏条目禁用且有原因，健康 0.7.1 可选择；`library-with-unavailable.jpg` |
| 原背景滑块 0.04 → 0.05 | CUA 操作实际控件，代次不变，仅主题 `prepareUpdate/update`，声明皮肤资源 Host 重读 0 字节；`ui-update-*.json` |
| 工作区内 0.05 → 0.09 | 背景节点编号仍为 1，仅该节点透明度更新，原生进程和内容代次不变；无桌宠/开场生命周期调用，资源重读 0 字节；`workspace-before/after.json`、`live-update-trace.json` |
| 页面确认后故意失败 | 测试 Host 包装器在真实页面确认后抛错，实际模块回滚至 0.09；仍为背景节点 1，桌宠和开场未重载；`expected-local-failure.json`、`failure-*.json` |
| 页面确认后立即停止 | 0.10 未写入已提交偏好，最终停止代次 2，背景清除、桌宠隐藏且媒体暂停、开场停止；`stopped-settled.json`、`stopped-native-settled.json` |
| 从管理页恢复 | CUA 点击“恢复本套皮肤”，真实恢复到 ready 代次 3，保留 0.09；`restored-status.json`、`restored-native.json`、`restored-management.jpg` |

完整选择作为对照仍读取 5 个资源、3,024,678 字节（`full-select-trace.json`）；这里的零读取特指 Host 对该皮肤声明资源的读取计数，不是整个进程或操作系统 I/O 指标。

开场更新前后是同一次开场注册：playing 均为 true，elapsed 0.707 → 0.745 秒、完成次数不变，页面从未就绪进入海报就绪。本次只证明没有触发开场重载，不能据此宣称已验证视频中段连续播放或性能。没有重开历史影片/完整动作矩阵，也没有真实模型调用。

## 复核入口与保留项

保留的本轮隔离预览：`local.dsh.foundation.fixes.20261104`，窗口“DSH 底座修复 · 隔离验收”。定位文件为 `.local/skin-foundation-fixes-current.json`，含私有连接信息，不对外复制；`probe.mjs` 只读取这个定位文件，可查询本轮 Host、页面和原生状态。隔离元数据为 dev.21；源版本仍为 dev.11。原生仅保留测试所需的 `isolateOpenPaths` 修改，避免打开日常 DSH。

`audit.mjs` 核对源码与本轮实际运行副本、生成代码、准确 0.7.1 和独立 0.7.2、dev.18/dev.19 压缩包及保留 dev.19 候选。输出 `preservation.json`、`preview-source-match.json`、`source-freeze.json`、`summary.json`。源码/测试/验证脚本清单及 SHA 以本轮 freeze 为准；此前底座 freeze 包含本轮获准修改的旧文件，不能再声称它整体不变。

本轮未操作日常配置、主控保留的 dev.20 预览、设计素材、Git 提交/推送或发布；没有生成新的安装 tgz。新增动作素材、跑动与朝向接缝已记录为后续范围，等待主控验收和下一阶段任务。
