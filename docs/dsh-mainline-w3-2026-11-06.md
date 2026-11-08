# Windows x64「主题盒子」W3 覆盖升级验收

2026-11-06。W1 的 dev.29 和 W2 的 dev.31 已收到 Windows 实机通过回执，回执未登记具体 DSH 版本。W3 的隔离回归已通过。Windows x64 在 DSH 0.2.2-rc.1 上覆盖安装 dev.32 已通过用户实机验收。[W1](dsh-mainline-w1-2026-11-06.md) · [W2](dsh-mainline-w2-2026-11-06.md)

| 官方 Windows x64 样本 | 状态 |
| --- | --- |
| 最近三个 Stable 正式版 | 暂无可核实的版本与安装包。GitHub 发布记录共 37 条，均标为预发布。Windows `stable.yml` 和 `latest.yml` 均返回 404。保留三个待填名额，等官方发行记录与安装包可对应后登记。 |
| RC · `0.2.1-rc.5` | 固定安装包可取得，HTTP 206，289,408,544 字节。作为 RC 升级起点。[安装包](https://download.deepseek.com/dsh-desk/bin/win-x64/deepseek-harness-0.2.1-rc.5-win-x64.exe) |
| RC · `0.2.2-rc.1` | 固定安装包可取得，HTTP 206，293,425,336 字节。官网当前下载及 Nightly feed 均指向该版，作为 RC 升级终点。[安装包](https://download.deepseek.com/dsh-desk/bin/win-x64/deepseek-harness-0.2.2-rc.1-win-x64.exe) |

官方更新通道与版本后缀独立，按 W3 口径将 RC 单独登记。冻结的 dev.29 和 dev.31 仅声明兼容上表两版 RC。Stable 安装包可核实后，先检查相应的插件候选包兼容声明，再按下面两项分别验收。[官方发布记录](https://github.com/deepseek-ai/deepseek-harness/releases) · [官网](https://www.deepseek.com/harness/) · [Windows Nightly feed](https://download.deepseek.com/dsh-desk/feeds/win-x64/nightly.yml) · [官方通道说明](https://github.com/deepseek-ai/deepseek-harness/blob/master/apps/desktop/publishing/ci/README.md#package-and-publish)

## 当前候选 dev.32

dev.32 的插件列表、侧栏和设置页显示「主题盒子」，旧包仍显示「陪伴」。沿用原插件包名、授权产品标识和配置目录。

已验收的 Windows dev.31 环境可直接做当前候选的插件覆盖。先记下 DSH 版本、授权、皮肤、桌宠大小、开场声音和自动播放状态。保持同一 DSH 版本和用户，在「插件 → 添加插件」选择本地 Windows dev.32 `.tgz` 覆盖，保留原插件。检查「主题盒子」入口与原授权、皮肤和设置，并从原 DSH 图标重开验证开场。用 Windows 回报 DSH 版本及各项结果。

### Windows 实机回执 · 2026-11-06

- 固定 DSH `0.2.2-rc.1`，覆盖安装 Windows `0.1.0-dev.32`。用户确认「主题盒子」显示正常，授权、已选皮肤和设置均保留，从原 DSH 图标启动开场正常。
- `0.2.1-rc.5` 的 Windows 实机、只升级 DSH 的 Windows 实机及线上私有更新仍分别待验。Stable 样本齐备后补验。

## Windows 兼容矩阵实机步骤

1. 在 Windows x64 VM 或独立测试机上安装较早宿主和 [dev.29](../dist/dsh-plugin-companion-0.1.0-dev.29-win32-x64.tgz)。激活一次，选择「冷启动」，将桌宠调到 85% 并打开开场声音。记下宿主版本、插件版本、授权状态、皮肤和设置。两项测试都继续使用同一 Windows 用户、同一 `DSH_HOME` 和同一桌面 profile。
2. **只升级插件。** 保持 DSH 宿主版本，通过「插件 → 添加插件」用本地文件地址覆盖安装 [dev.31](../dist/dsh-plugin-companion-0.1.0-dev.31-win32-x64.tgz)，例如 `file:C:/W3/dsh-plugin-companion-0.1.0-dev.31-win32-x64.tgz`。打开「陪伴」，确认原授权仍有效、皮肤仍为「冷启动」、桌宠仍为 85%、开场声音仍开启。手动预览一次并试 Esc。再开启「启动时自动播放」，通过 DSH「应用 → 退出」完全退出，从原图标重开并检查同窗开场、主题和桌宠。第二个 RC 的插件覆盖用独立测试快照从 dev.29 重跑。三个 Stable 样本齐备后，各自独立做一次插件覆盖。
3. **只升级 DSH。** 在较早宿主已运行 dev.31 的测试环境，先关掉「启动时自动播放」，完全退出 DSH，用较新官方安装包向同一安装位置覆盖，然后点原 DSH 图标。确认自动开场保持关闭，插件仍为已启用的 dev.31，再检查宿主版本、授权、已选皮肤、85% 大小和开场声音。最后可重新开启自动播放并重验原图标冷启动。RC 用 `0.2.1-rc.5 → 0.2.2-rc.1`。Stable 样本齐备后，按最旧 → 次新 → 最新走两次宿主覆盖，全程固定同一款兼容三版的插件候选。
4. 每条结果回报覆盖类型、升级前后 DSH 和插件版本、Windows 缩放、授权/皮肤/设置是否保留。通过标准是升级后仍可使用原授权和偏好。出现异常时先记录截图和步骤，再考虑恢复测试快照。[官方 Windows 安装与退出说明](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.2.2-rc.1/apps/desktop/README.md#windows-installer-interface)

## 本地证据与边界

- 在 Mac 解开两个冻结包，使用隔离 `DSH_HOME`、固定设备标识、临时 Ed25519 签名授权、模拟页面回执和桌宠窗口，运行包内控制器、皮肤代码及 dev.29 包内桌宠和开场模块。三条通过路径为固定 RC 版本参数的 dev.29 → dev.31 两次，以及固定 dev.31 切换 `rc.5 → rc.1` 版本参数一次。
- 每条路径验证相同状态目录、逐字节一致的授权回执、验签有效、相同皮肤内容标识、85% 桌宠、开场声音开启、自动播放关闭，以及主题、桌宠、开场重新就绪。本地脚本直接设置自动播放偏好。手动测试从 dev.31 的界面设置这一项。本段是本地模拟证据。Windows 实机以逐条回执为准。[复现脚本](../experiments/dsh-windows-w3/verify-retention.mjs)
- dev.32 复用同一回归脚本，用最终 Windows 包通过三条本地路径。两版 RC 的版本参数分别覆盖 dev.31 → dev.32，以及固定 dev.32 将宿主版本参数从 rc.5 切到 rc.1。均保留原授权回执、皮肤和设置。
- 官方 Mac DSH rc.1 的隔离插件管理器完成 dev.27 → dev.32 覆盖，读取到「主题盒子」，沿用同一配置目录并保留开场偏好。
- 最终 Mac ARM64 与 Windows x64 的 dev.32 安装包已通过本地私有版本查询和下载。两版 RC 都查询到对应平台，下载文件与原包的 SHA-256 一致，跨平台下载被拒绝。线上服务待部署。Windows dev.31 首次升级使用本地包。

本机复跑时把两份 `.tgz` 分别解到 `.local/dsh-windows-w3/dev29` 和 `.local/dsh-windows-w3/dev31`，把 dev.29 内 `runtime-bundles/DSHCompanion-win32-x64.zip` 的 `resources/app` 解到同级 `runtime` 目录，再执行以下命令。

```sh
npm install --prefix .local/dsh-windows-w3 --no-save --package-lock=false --ignore-scripts fflate@0.8.2
node experiments/dsh-windows-w3/verify-retention.mjs \
  .local/dsh-windows-w3/dev29/package \
  .local/dsh-windows-w3/dev31/package \
  .local/dsh-windows-w3/runtime/resources/app
```
