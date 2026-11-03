# DSH 陪伴 · Mac 完整流程 MVP

当前版本 `0.1.0-dev.11`，验证目标为 Mac ARM64、DSH `0.2.1-rc.5`。支持免登录在线安装、安装后激活和 0 天永久授权。角色与画面效果后续调整。

分发管理后台已部署到 [DSH 陪伴管理页](https://license-host.invalid/dsh-companion/manage/)。管理员登录信息保存在本机 `.local/cloud/admin-login.txt`，不要将该文件发给插件用户。

## 仓库信息

- GitHub 仓库：[sssswwwwbbbb/dsh-companion](https://github.com/sssswwwwbbbb/dsh-companion)。
- 可见性：私有（Private，2026-11-03 创建并核验）。
- 默认分支：`main`；当前本地分支跟踪 `origin/main`。
- 远程仓库：`origin` → `https://github.com/sssswwwwbbbb/dsh-companion.git`。
- 初始化状态：2026-11-03 已完成本地 Git 初始化及首次推送，初始提交为 [`653d687`](https://github.com/sssswwwwbbbb/dsh-companion/commit/653d687d158c5a4168150f9c2bae8c7158a10f9e)（`chore: initialize DSH companion project`）。

## 从发码到使用，体验一次

1. 登录管理页，点击「生成激活码」，先生成 1 个、1 台设备的测试码，填写备注便于查找。有效天数填 **0 表示永久有效**，填 1～3650 则按天计算。复制完整的 `DSHC-…` 激活码或下载 CSV。
2. 在「安装包」复制用户在线安装链接，发给朋友时发送链接、激活码和适配的 DSH 版本，管理账号由你保管。当前链接：`https://license-host.invalid/dsh-companion/install/dsh-companion-0.1.0-dev.11.tgz`。用户无需 npm 或后台账号；也可下载 `.tgz` 后安装。
3. 打开 DSH「添加插件」，把链接填入顶部的插件输入框，安装源选择「中国大陆镜像源」，点击安装并启用。链接不要填到「自定义地址」中，那一栏用于 npm registry。首次下载约 125.5 MB。若已经装过旧版「DSH 陪伴」，先按官方界面卸载旧版，再安装新包，然后用 `⌘Q` 完全退出并重新打开 DSH。dev.8 使用包名 `dsh-plugin-companion`；dev.7 升级到 dev.8 保留授权和配置已验证。
4. 进入侧栏「陪伴」→「开始使用」→「统一授权」，粘贴刚生成的完整激活码，点击「激活本机」。成功后显示「本机已授权」，永久码的到期一栏显示「永久」。如已用其他码激活，先在「授权与更新」中「解绑本机」，再回到「开始使用」填新码。先前本机测试服务签发的码不能用于云端版；配置仍可继续使用。选择配置包后启动桌宠，尝试动作与行为开关。
5. 在插件里定位「DSH 陪伴启动器」，再用 `⌘Q` 退出 DSH，双击启动器：应依次看到动画、DSH 主界面和桌宠。日常要体验完整开场，就用这个启动器进入。
6. 回到后台打开这份授权，可看到绑定设备，调整到期日、设备数，或解绑、停用。客户端下一次联网校验会同步结果；测试完可将这份码停用。插件的「授权与更新」提供本机解绑、续期与后续安装包下载。

## 使用流程

1. 在 DSH 安装插件，从侧栏「陪伴」进入。
2. 输入私有激活码，启动动画与桌宠共用一份设备授权。
3. 选择日间或月色配置包；配置同时切换启动动画、动作素材、样式参数及相处节奏。支持通过系统文件对话框导入、导出 JSON 配置。
4. 使用插件创建的「DSH 陪伴启动器」打开软件，顺序为原生动画 → 启动官方 DSH → 宿主就绪 → 交接桌宠。启动器默认放在用户的 Applications 文件夹，也可在插件中定位、修复或移除。
5. 在「桌宠控制」调整行为和动作；在「授权与更新」刷新授权、解绑本机、检查适配版本并下载私有安装包。
6. 更新时按 DSH 的原生流程卸载旧版，再安装下载文件，重新打开 DSH。授权和配置保留。停用、卸载会停止桌宠并移除启动入口；退出 DSH 时保留启动入口，供下次启动使用。

保持插件启用后，通过官方 DSH 图标重新打开软件，会按「播放启动动画」设置播放开场；在运行中的 DSH 停用再启用插件，只恢复桌宠，不强制重播。陪伴启动器可在官方窗口打开前先播放开场，也可在插件中手动重播。官方程序文件保持原签名。

「授权与更新」的「插件 → 停用」同步官方插件开关；恢复时在 DSH 插件列表启用，授权和配置保留。「启动入口」一行通过「停用 / 启用」单独管理启动器。

## 授权与分发

使用旧机 `license-host.invalid` 上的独立 HTTPS 服务，入口为 `https://license-host.invalid/dsh-companion`。包通过 `npm pack` 生成，DSH 内部使用 pnpm 安装。dev.8 已明确发布为免登录 HTTPS 安装包，用户安装后仍需激活码；此前的私有包继续要求授权或管理员登录下载。尚未发布到公开 npm 或插件市场；npm 账号注册及后续开源另行处理。安装包仅带签名公钥和服务地址，签发私钥、管理员凭据、激活码及设备授权文件不进入安装包。

演示授权默认绑定一台设备、有效期 30 天；生成时有效天数为 0 则永久有效。永久授权需要 dev.7 或更新的插件，原有有限期授权继续可用。在线校验后提供最多 7 天的离线续用窗口；有限期授权的离线期限也不超过总到期时间。永久授权仍受设备数量、联网校验、解绑与停用规则约束。签名与设备绑定由插件和桌面组件分别验证。解绑会释放设备名额；服务端吊销在客户端下一次在线校验时生效，离线宽限仍有时间边界。

设备标识为带产品命名空间的本机 UUID 摘要，不传输原始硬件 UUID。不读取聊天内容或模型密钥。

开发者运行以下命令签发云端激活码和发布在线安装包：

```sh
node deploy/cloud-admin.mjs issue .local/cloud/owner-activation.json "本机验证" --days 30 --devices 1
npm run package:mac
node deploy/cloud-admin.mjs publish dist/dsh-plugin-companion-0.1.0-dev.11.tgz 0.1.0-dev.11 11 --public-install
```

命令签发的码保存到指定的私有 JSON 文件，不打印到终端；也可通过 `node deploy/cloud-admin.mjs revoke <license-id>` 吊销。不加 `--public-install` 时发布私有包；已发布的私有版本不会被同版本命令改为公开。同一版本不允许替换不同内容。旧的管理接口继续只经 SSH 使用；`/dsh-companion/manage/` 后台使用独立管理员登录，可批量发码、导出、延长授权、解绑、停用、下载安装包及复制在线安装链接。新码以标准 JWE 加密保存，管理员可重新查看；历史授权保持有效，完整码仍需从原发码文件获取。版本、平台和 DSH 适配信息保存在签名清单中。部署和备份说明见 [deploy/README.md](deploy/README.md)。此前本机验证版的授权不与云端混用；正式跨设备发行前仍需完成 Mac 签名及公证。

后台复用 Vue 3、按需引入的 Element Plus、Fastify 官方会话/CSRF/限流/静态资源插件、Argon2、jose 和 csv-stringify。它与现有授权服务共用一个进程和授权库。开源组件版本及许可证见 `reports/console-open-source.json` 和管理页底部「开源组件」。

## 验证证据

以下引用的 `reports/` 为本地验收材料，可能包含运行环境和 HTTP 响应信息，不纳入 Git 仓库。源码、测试和素材纳入版本管理；`.local/` 中的凭据与授权、构建缓存和安装包继续仅保留在本机。

- `npm test`：行为、配置、签名、设备限制、真实服务请求、离线期限、解绑与吊销、下载校验等测试。
- `npm run check`：JavaScript 及 JSON 检查。
- `npm run verify:geometry:mac`：在相同 Electron 运行时的隐藏窗口回归负零坐标问题。
- 使用官方 DSH 可执行文件的 Node 模式运行 `scripts/verify-workflow-host.mjs`：在隔离 DSH_HOME 中安装完整包，不使用真实会话，不调用模型。支持 `--install-spec=<HTTPS-tgz-URL> --mirror --cloud --permanent --prepared` 验证在线首装；`--prepared` 仅让后续重装复用本地审计包，首装仍完整下载在线包。`scripts/verify-official-host.mjs` 保留为兼容入口。
- `reports/workflow-native.json`：实际 DSH 原生页面、文件选择器、离线服务、停用卸载、私有下载重装及冷启动记录。
- `reports/workflow-host.json`、`reports/mac-package.json`：完整包的 Host 验证及摘要信息。
- `reports/cloud-deployment.json`、`reports/cloud-validation.json`、`reports/cloud-host.json`：云端部署、dev.6 实际 HTTPS 全包下载及隔离官方 Host 的验证记录。旧 workflow 报告保留为 dev.4 本机验证截点；dev.5 的失败记录和网络对照另行保留。
- `reports/console-deployment.json`、`reports/console-validation.json`、`reports/console-postflight.json`、`reports/console-resources.json`：管理后台升级、33 项公网检查、历史数据与其他业务保留、资源体积证据。本轮管理页下载检查覆盖鉴权、长度和文件开头；完整包 SHA-256 下载证据沿用未改动的 dev.6 云端验收。
- `reports/permanent-deployment.json`、`reports/permanent-validation.json`、`reports/permanent-host.json`：dev.7 永久授权的部署、后台签发与插件激活回归记录；各报告分别记录实际通过和失败，测试准备失败不计为通过。
- `reports/online-install-deployment.json`、`reports/online-install-validation.json`、`reports/online-install-postflight.json`：dev.8 免登录安装入口的部署、访问边界及数据保留记录。
- `reports/online-install-host.json`：35 项隔离官方 DSH 检查通过，含真实 HTTPS 首装、未激活限制、永久激活、动画交接、桌宠、配置、停用解绑和重装。首装由官方 pnpm 安装器完整拉取线上包；后续重装复用本地同摘要包，未重复执行私有全包下载。`reports/online-install-local-host.json` 另记录 37 项本地包及 dev.7→dev.8 授权、配置迁移检查。

dev.11 的 26 项自动测试、9 项包审计和 46 项隔离官方 DSH 检查通过，覆盖窗口尺寸、播放中停用、入口恢复、正常启动播放与运行中重新启用不播放。独立新进程连续两次启动各播放一次；关闭动画设置后启动不播，见 `reports/dev11-host.json`。真实客户端验证另见对应 native 报告，公开安装入口另核对 HTTP 与云端摘要。

授权服务现按请求编号记录路径、状态、耗时和业务错误码，本机也保留失败诊断；均不记录激活码、授权签名或设备标识。原时段日志见 `reports/activation-server-log-review.json`：14:18:57 的 400 发生在当前码签发之前，旧日志缺少业务码，不能将其直接对应到截图中的连接失败。

本轮全流程验收不替代画面、拖拽手感、多显示器/Spaces 切换和长期稳定性验收。Windows、其他 DSH 版本及正式跨设备发行仍需分别适配。私有版本清单按平台和已验证的 DSH 版本筛选，不向未知版本自动推送安装包。

## 整套皮肤的后续讨论

产品方向为整套 DSH 皮肤。先在新对话明确覆盖范围、功能清单、首套主题和验收标准，再完善流程技能与实现。主界面、字体、背景、声音等均为候选，尚未确定首版范围。技能位于 `skills/dsh-skin-development/SKILL.md`，接手说明为 `docs/first-skin-handoff.md`。

## 角色素材

示例素材来自 [PC2005-cloud/dsh-pet](https://github.com/PC2005-cloud/dsh-pet)，按用户确定的非商业自用范围使用。固定版本和校验信息在 `designs/dsh-companion-v1/references/`，CC BY-NC-SA 4.0 及原作者署名保留在 `ASSET-NOTICE.txt` 和组件包内。当前导入的配置文件引用内置示例素材。

## 已修复问题

`dev.2` 修复窗口坐标取整产生 JavaScript 负零 `-0` 后被 Electron 拒绝的问题，保留对负屏幕坐标的支持，见 `reports/periodic-position-error.md`。`dev.4` 进一步严格校验配置元数据、动作名称和默认设置，拒绝原生菜单及播放器不能处理的输入。
