# Windows「陪伴」W1 实机验收

本地测试包为 [dsh-plugin-companion-0.1.0-dev.29-win32-x64.tgz](../dist/dsh-plugin-companion-0.1.0-dev.29-win32-x64.tgz)，212924954 字节，SHA-256 为 `03c12c24cf458202d976065755fc9ca248d57ec5721cf0606ac67dccb0009ce4`。插件包名沿用 `dsh-plugin-companion`，目标宿主为官方 Windows x64 DSH `0.2.2-rc.1` 与 `0.2.1-rc.5`，按实际验证版本分别登记。[W0 实机回执](dsh-mainline-w0-2026-11-06.md)

dev.28 Windows 实机回报已激活、主题已应用、停用恢复正常。桌宠和本套开场同时显示 `SKIN_CAPABILITY_UNAVAILABLE`。复现确认两个皮肤适配器沿用了 Mac 平台判断。dev.29 让它们共用 Windows 运行组件的 x64 判断，已选皮肤会在 DSH 页面重新连接时恢复并重新注册这两项能力。

dev.29 已获用户 Windows 实机验收。桌宠、开场手动预览和设置恢复均正常。回执未单列宿主版本、显示缩放及具体手势细项。

## 安装与检查

1. 复制 `.tgz` 到 Windows。在原 DSH「插件 → 添加插件」填写本机文件地址，例如 `file:C:/Users/你的用户名/Downloads/dsh-plugin-companion-0.1.0-dev.29-win32-x64.tgz`。已有 dev.28 时直接覆盖安装，确认插件详情显示 dev.29，再从侧栏「陪伴」进入。
2. 已激活的环境检查授权和已选「冷启动」是否随升级保留。新装环境才需要激活并在「陪伴 → 皮肤」选择「冷启动」。工作区应应用主题，桌宠和开场开关应可用，系统桌面应显示单元-07。
3. 点一下角色，再拖到其他位置。找角色旁边的透明区域点击底下的应用。分别观察桌宠是否响应、是否能拖动、透明区域是否能正常点到下层应用。有条件时用系统 125% 缩放再检查一次。
4. 改桌宠大小，确认当前窗口直接缩放，界面没有出现「应用启动」进度条。切换到「档案暖白 · 鲸鱼娘」后切回，检查「冷启动」的大小偏好保留。
5. 在「本套设置」手动预览开场。检查预览能结束和跳过。完全退出 DSH 后用原图标重开，检查已选主题和桌宠配置恢复。自动开场排在 W2。
6. dev.28 已验证停用后恢复原界面。dev.29 桌宠出现后，从 DSH「插件」停用「陪伴」时补验桌宠退出，再启用时检查桌宠和大小偏好恢复。

回报 DSH 版本、Windows 显示缩放和有差异的步骤即可。有失败时可附报错截图。若桌宠启动失败，在 PowerShell 中用下面的命令找最新的桌宠事件日志。该命令按 DSH 运行目录查找，系统未设置 `DSH_HOME` 时使用用户目录下的 `.dsh`。

```powershell
$dsh = if ($env:DSH_HOME) { $env:DSH_HOME } else { Join-Path $HOME '.dsh' }
Get-ChildItem (Join-Path $dsh 'companion') -Filter 'runtime-events.json' -Recurse |
  Sort-Object LastWriteTime -Descending | Select-Object -First 1 -ExpandProperty FullName
```

## 本地构建证据

- 复用 dev.27 的主题和皮肤素材，以及 W0 已在 Windows x64 运行的 Electron 45.2.1 和 dsh-pet 组件。dev.29 和 dev.28 的授权实现、皮肤素材逐一匹配。
- 实际包通过语法、Windows x64 PE 和运行包摘要检查。隔离测试用 Windows 注册表输出样例与本地授权服务，通过设备标识、签发与桌宠验签、解绑、运行包解压及缓存复用。项目自动回归 109 项通过。
- 从两个实际包复现 dev.28 状态，再验证 dev.29 自动恢复主题、注册桌宠和开场、在原运行实例上更新大小以及停止后释放模块。该回归使用本地页面和窗口替身。[能力回归](../experiments/dsh-windows-w1/verify-capabilities.mjs)

包以冻结的 dev.27 和 W0 运行归档为输入。[Windows tar](https://learn.microsoft.com/en-us/windows/tar/) · [Windows 注册表查询](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/reg-query)
