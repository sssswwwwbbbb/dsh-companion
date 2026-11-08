# Windows W2 原入口自动开场

当前测试包为 [dsh-plugin-companion-0.1.0-dev.31-win32-x64.tgz](../dist/dsh-plugin-companion-0.1.0-dev.31-win32-x64.tgz)，212925322 字节，SHA-256 为 `10a2e14073eb6ed7dc9984846a08ebdc492a1b811bc842ac71f7580c1b7e722a`。沿用同一插件标识、授权设备标识和设置目录。目标宿主为 Windows x64 DSH `0.2.2-rc.1` 和 `0.2.1-rc.5`。[W1 验收](dsh-mainline-w1-2026-11-06.md)

dev.30 Windows 实机反馈确认原入口开场正常，「进入工作区 · Esc」被 Windows 窗口控制按钮遮挡。dev.31 将跳过按钮放到原生标题栏下方，用户已确认实机验收通过，W2 收尾完成。回执未单列 DSH 版本和显示缩放。[Electron 标题栏安全区](https://www.electronjs.org/docs/latest/tutorial/custom-title-bar)

## Windows 实机验收

1. 从 DSH「插件 → 添加插件」覆盖安装 dev.31。在「陪伴 → 冷启动 → 本套设置」确认「本套开场内容」和「启动时自动播放」均开启。覆盖安装时工作区应保持可用。
2. 用 DSH「应用 → 退出」或 DSH 托盘菜单完全退出，再点击原 DeepSeek Harness 图标。开场应在 DSH 主窗口内播放一次，播完进入工作区，桌宠随之恢复。窗口右上角的 × 会将 DSH 隐藏到后台。[DSH 官方退出说明](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.2.2-rc.1/apps/desktop/README.md#closing-the-window-and-quitting)
3. 再完全退出重开一次，按 Esc 跳过，确认画面和声音结束，工作区可以输入，桌宠按已保存的大小恢复。
4. 用 × 隐藏后从托盘恢复，停用后重新启用插件，改一次桌宠大小。以上操作均应直接返回工作区。
5. 关闭「启动时自动播放」，完全退出重开，应直接进入工作区。手动预览仍可使用。若需要可在「本套设置」恢复自动播放。

回报 Windows 上的 DSH 版本以及出现偏差的步骤。自动开场是本轮重点。桌宠点按、拖动、透明区穿透、原窗缩放和任务栏体验仍按实机逐项记录。

## 实现与本地证据

- 复用 Mac 已交付的同窗播放器。对照两版官方 Desktop 源码，Windows Shell 同样通过 IPC 启动 Host，并在 `dsh-app://app/` 应用初始注入。桌面进程的 PID 和启动时间用于同一次运行去重。冷启动以已选、启用且就绪的开场为准，手动预览仍通过既有路径。[DSH rc.1 启动协议](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.2.2-rc.1/apps/desktop/README.md#application-overview) · [DSH rc.5 启动协议](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.2.1-rc.5/apps/desktop/README.md#application-overview) · [Windows 进程查询](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/get-process?view=powershell-5.1)
- 对实际打包代码用 Windows 进程查询替身测试两个宿主版本的注入、素材读取、单次领取、结束释放、同一进程重建 Host、热启用、关闭自动播放和再次冷启动。W1 能力回归及项目 109 项自动测试通过。[开场回归](../experiments/dsh-windows-w1/verify-autoplay.mjs)
- 将 dev.30 的同窗播放器和实际素材载入 Mac 上的隔离 Electron 45.2.1 窗口，模拟已聚焦的 DSH 页面。实测原片在 12.5 秒触发自然结束，Esc 路径即时释放。两条路径都撤掉开场层、恢复工作区输入并保留草稿。
- dev.31 的实际打包播放器在隔离 Electron 里复验。模拟 40 CSS 像素标题栏时，按钮顶部位于 52 CSS 像素处，普通窗口和 125% 页面缩放的窄窗口均可点中。自然播放、按钮跳过和 Esc 三条路径通过。

构建命令为 `python3 experiments/dsh-windows-w1/build.py`。[构建脚本](../experiments/dsh-windows-w1/build.py)
