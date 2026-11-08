# M6 原生开场实施与定向回执

2026-11-03。目标DSH 0.2.1-rc.5 / Mac ARM64，本地dev.11基线。最小startup模块已实现，当前送主控独立代码审查；不把源码、隔离实播或媒体解码等同于真实安装/用户体验验收。源码身份由同目录阶段报告的source-manifest.json固定，待审期间不继续改生产。

## 交付行为

新增可选startup interfaceVersion1/configVersion1，固定poster、可选无音轨WebM、1–15秒seconds及greeting/subtitle，settings为空；复用既有逻辑资源/摘要缓存。NativeStartupAdapter与NativeStartupRuntime分别登记/清理开场，原NativeSkinRuntime仍独立持有pet内容。通用SkinCoordinator源码与M5基线逐字节相同，未加入startup分支。

应用、换肤、恢复和运行中启用只登记内容；ready与实际playing分开。关闭pet不阻止本套开场，不借旧greet、不等pet.ready。关闭startup模块会取消并阻止本套预览，不退播旧角色；旧包不声明startup时保留原入口。旧全局startupEnabled只表示“启动时自动播放”，模块disabled.startup表示“启用本套开场内容”；手动预览不改变自动偏好。原生只取已验证的背景/正文/强调token，保留day/night回退，没有任意CSS/字体、声音或时间轴字段。

播放复用原intro窗口、窗口定位、Host交接、进入按钮及45秒慢启动/打开路径。一次播放token来自contentKey/既有代次/本次开始时间；晚到ready、playing、ended及控制均校验本次token。视频出错回本套poster，保留进入路径。首次poster就绪校准现有introStartedAt；有视频时首次实际playing仅再校准一次，真实ended单独回执，避免把窗口加载时间从片尾扣掉。关闭pet时暂停/卸载标志不再因introPlaying而被撤销。

冷进程只消费最后成功、兼容、未停止、无pending/停止请求且本模块可用的快照。Host attach不触发播放。官方页面重连时，现有CompanionSkins恢复入口在同内容/代次仍有效时等当前一轮完成，再执行原restore；有界等待不占协调器事务队列，stop、关闭模块和换内容仍立即失效。延期任务只检查当前选择，不另存/排回旧快照。

## 自动与原生证据

15项定向Node检查通过：新增startup七项、受影响native三项、媒体子集四项及既有appReady冷热区别一项。检查覆盖合同边界、资源独立、同ID更新、停止/错误resume、冷快照抑制、正常页面恢复等待及等待中停止。JavaScript/JSON检查和本地Mac构建通过。未重复旧完整GUI/模型矩阵。

`reports/skin-foundation-m6-2026-11-03/native.json`保存八项隔离原生检查：

- 应用只登记；原1.2秒合法poster在pet隐藏且pet.ready受控为false时完成；手动预览保持auto=false。
- 同ID新contentKey取消旧播放，并更新媒体/文案；应用本身不重播。
- 模块关闭阻止预览且不退旧角色，重新启用只登记；全局自动开关关闭取消正在播放。
- 实际损坏WebM回已解码poster，原“进入DSH”按钮可完成。
- 冷进程快照＋Host attach＋官方页面reload，3.714秒仍为原token/generation14；8.029秒完成一次后才restore到15，无cancel/replay。
- 恢复等待中实际页面停止入口保持启用，停止获胜；旧ready/控制不能复活或打开。
- 等待中换内容，延迟任务服从当前选择，不恢复旧包。
- 受控推进到45秒的慢Host提示与“打开DSH”按钮走隔离打开回执。

原poster阶段的页面停止用Electron原生鼠标输入。时钟修正后的`clock-recovery.json`两项用准确0.7.0影片再次确认完整ended后restore及等待中停止。影片覆盖Host时，合成原生鼠标不能取后台面板焦点，因此停止补验以实际官方页面DOM按钮click触发原handler，证明按钮启用和处理链响应；不等于后台物理鼠标可达，也不是直调Host停止API。没有因此更改窗口层级。

最终静态样例1.0.1仅更新了过时的描述，contentKey为`e410911dc18293bd3773326e6fec3e5f7e5677505aaf1577f98cae09a29357e6`。`final-poster-pet-suspension.json`补验应用不播放、实际预览/自动结束，并读取原生pet窗口中videos=0、playing=0，证明本轮开场未反向唤醒关闭的pet媒体。

## 准确内容与计时修正

0.7.0技术基线为`designs/dsh-skin-v1/content/archive-warm-whale-startup-m6`，contentKey `39fed0743a9eb499d41827f16f223bd7eb2b93bcac0ae7cc17087259320bb297`。仅在pet模块关闭下定向检查新增媒体，不重复A2桌宠/模型。目标Electron实际解码1280×720、8.2秒、muted、loop=false；档案、扫描、睁眼三张原生截图在film-*.png。greeting/subtitle和进入按钮在媒体下方，未遮主标题或脸。

首次成片回执确实有问题：从请求窗口计时，elapsed8.211秒时video仅7.9308/8.2秒，随后收起。原始`film-before-clock-fix.json`及带同后缀截图保留；当时只证明解码/可见，未接受完整片尾。校准后`film.json`记录计时8.161秒时视频8.1619秒，真实videoEnded=true之后才正常complete一次。`clock-recovery.json`的同片冷启动/reload也实际ended一次，无cancel/replay。

0.7.0片内“随时跳过”与现有Host-ready进入门槛不一致，主控已交内容线另制0.7.1，原0.7.0仍是技术基线。源码送审不等修正版；准确0.7.1身份、可见文案和整片结果随后单列，不拿0.7.0替代最终内容回执。

## 保留的边界

所有可写状态在自建`.local/skin-foundation-*`，没有真实profile/安装/启动入口修改；`/usr/bin/open`和`dsh://open`都由测试副本替换为隔离回执。真实前台交接未验。没有真实模型、授权重建、提交/推送/部署/分发。素材作者/NOTICE差异与最终美术边界沿内容线说明，当前仅本地隔离。

失败过程没有覆盖：`recovery-before-fix.json`为约2.18秒被旧generation取消的反例；native-fixture-attempt-1为受控pet.ready被后到原媒体ready覆盖，改为夹具抑制ready后通过；attempt-2为命令JSON半写入导致测试renderer退出，测试命令/回应改原子写入后仅续跑剩余检查。clock-recovery两个attempt保留覆盖影片期间合成鼠标的不可达事实，未当作生产handler卡死。

后续只处理主控独立代码审查意见、准确0.7.1内容回执和另行授权的真实客户端体验。当前M6不能写为整套皮肤或业务已验收。
