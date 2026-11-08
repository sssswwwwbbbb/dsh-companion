# DSH Skin Core 0.1

本地最小实现。目标 DSH 0.2.1-rc.5 / Mac ARM64，复用 dsh-plugin-companion 的授权、入口和 Electron 运行层。共享包合同在 `../../docs/skin-runtime-contract-v0.1.md`。

## 运行

在项目根目录：

```sh
npm run build:client
npm run build:mac
npm test
npm run check
npm run check:skin
node packages/dsh-skin-core/scripts/check.mjs tests/fixtures/archive-workspace-r2-private
```

`examples/a` 仅主题，`examples/b` 主题＋桌宠。`examples/invalid/` 提供缺默认值、缺必需模块和越界资源路径，校验应失败。加载自有包只需现有模块和数据，不执行包内代码。未建设编辑器、上传和市场。

## 隔离官方宿主复现

以下两个进程只写 `.local/skin-foundation-*`，不替换真实安装，不使用真实 profile。运行前先完成本地构建。宿主脚本为每次新验证启动临时本地授权服务，不访问线上授权库。可传入多个符合合同的内容目录，不把主题特例写入核心。

```sh
ELECTRON_RUN_AS_NODE=1 '/Applications/DeepSeek Harness.app/Contents/MacOS/DeepSeek Harness' packages/dsh-skin-core/scripts/isolated-host.mjs tests/fixtures/archive-workspace-r2-private
.cache/electron/45.2.1/darwin-arm64/Electron.app/Contents/MacOS/Electron packages/dsh-skin-core/scripts/isolated-renderer.cjs
node packages/dsh-skin-core/scripts/verify-isolated.mjs
node packages/dsh-skin-core/scripts/verify-cold.mjs
```

Host 和 renderer 要在两个终端先保持运行；随后运行检查脚本。冷启动检查会关闭这两个测试进程，连续创建新进程并在末尾退出。保留停止意图并复用同一隔离 profile。需要手动结束时运行 `node packages/dsh-skin-core/scripts/control.mjs host quit` 和 `node packages/dsh-skin-core/scripts/control.mjs page quit`。

`.local` 内含临时授权及本机连接凭据，不作为报告分享。公开检查只保存无凭据的 JSON 和测试窗口截图。测试副本将 `dsh://open` 和 `/usr/bin/open` 应用启动都替换为隔离回执，避免打开用户真实 DSH；因此不把测试结果当作真实桌面应用前台交接验收。

## 源码分工

- src/schema.mjs：已知模块参数、公开默认值、显示条件、兼容性。
- src/resources.mjs：资源根约束、hash/大小/类型头校验、不可变内容快照。
- src/state.mjs：唯一 Host 状态、原子保存、独立停止请求、显式 v1 候选迁移。
- src/coordinator.mjs：有限事务、最新待执行选择、停止优先、代次失效、恢复。
- adapters/page-*：官方主题/插槽执行器及带租期的远程命令；不读取聊天或修改模型请求。
- adapters/native.mjs 与 runtime-src/skin.mjs：复用认证 bridge、实际媒体 ready、受控原生资源。
- packages/dsh-companion/src/skins.mjs：与现有插件的唯一入口及授权连接。

构建会把源核心复制到 `packages/dsh-companion/skin-core/` 和原生 payload；不要直接修改生成副本。原生磁盘内容缓存保留供回退，退出会释放媒体与内存资源；此版未提供面向用户的缓存管理页面。

## 独立验收返工复现

F1/F2/F3 修复与证据见 `../../docs/skin-foundation/rework-acceptance-2026-11-03.md`。原验收材料保持原样，修复后结果放在单独目录。

定向 GUI 检查使用与上文相同的两个隔离进程；Host 加 `--race-fixtures`，renderer 不变。然后运行：

```sh
node packages/dsh-skin-core/scripts/verify-acceptance-races.mjs
DSH_SKIN_REPORT_DIR=reports/skin-foundation-rework-2026-11-03 node packages/dsh-skin-core/scripts/verify-isolated.mjs
DSH_SKIN_REPORT_DIR=reports/skin-foundation-rework-2026-11-03 node packages/dsh-skin-core/scripts/verify-cold.mjs
```

定向脚本会临时暂停自己创建的隔离 Host，调用独立原生停止回调，并在 finally 中恢复该进程；不会暂停真实 DSH。停止按钮使用 Electron 原生鼠标输入，常规测试导航与隔离引导弹窗通过界面 handler 操作。所有故障注入仅在 `--race-fixtures` 的测试副本，生产运行文件不含这些测试入口。

## M3 桌宠互动

`examples/interaction` 是合法模块样例；六项配置、动作语义和输入接缝见 `docs/skin-foundation/pet-interaction-contract-m3.md`。实现及复跑命令见 `docs/skin-foundation/m3-implementation-2026-11-03.md`。使用 `--model-fixtures --config-fixtures` 启动隔离 Host 后，`verify-m3-interaction.mjs` 检查两轮实际结果上下文、原生短句/动作、回退、关闭/重置及停止。夹具注册到官方 llm 服务，不访问真实模型。新角色资源、真实提供方和物理多屏的验收状态分别记录。

M4自定义媒体可用pet configVersion2声明含idle的真实子集；字段和缺动作规则见 `docs/skin-foundation/pet-animation-subset-contract-m4.md`。相同隔离Host加候选内容目录，随后 `verify-m4-native.mjs <内容目录>` 定向检查实际解码/约180px/脚底、回应回idle、缺动作入口、模型实际子集、新旧切换及停止恢复。用 `DSH_SKIN_REPORT_DIR` 指定新证据目录、`DSH_SKIN_EXPECTED_HASH` 指定准确内容身份，避免用另一个夹具包的结果替代正式候选。

M5合成工作区可在新隔离Host/renderer就绪后调用 `control('host','workspaceSeed')` 一次；它用标准Session消息/工具事件加载长中文、代码、表格与工具卡片，不调用模型或执行工具。随后应用准确内容，在官方UI展开过程和工具组。只读指标函数在scripts/workspace-inspection.mjs，阶段画面、原生提示及已知宿主配色限制见docs/skin-foundation/m5-workspace-review-2026-11-03.md。已装载环境不要重复seed。

M6 `examples/startup-poster` 为可独立播放的合法静态样例。`adapters/startup.mjs` 与 `runtime-src/startup-skin.mjs` 只登记本套开场，复用原intro窗口和自动偏好，不借pet动作或就绪。加 `--startup-fixtures` 的隔离Host提供本轮只读媒体检查和受控回报入口；验证脚本及真实/受控边界在 `reports/skin-foundation-m6-2026-11-03`。公共协调器保持通用，制作器/上传/市场、声音、真实安装和发布不在本轮。
