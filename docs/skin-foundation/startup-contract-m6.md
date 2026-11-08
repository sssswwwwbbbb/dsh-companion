# M6 startup 实施合同

2026-11-03。依据主控已审接缝及handoff-first-skin-startup-m6.md定型；最小runner已实现并进行隔离定向验证，M6代码/原生阶段待主控独立审核。字段校验、真实播放和业务验收分开报告。

新可选模块为startup，interfaceVersion1/configVersion1、required:false。固定config如下，首轮settings为空：

| 字段 | 合同 |
| --- | --- |
| poster | 必需，当前assets中的PNG/JPEG/WebP逻辑ID；加载/视频失败时显示 |
| video | 可省，无音轨WebM逻辑ID，单次播放，不借pet动作槽 |
| seconds | 必需，1–15秒；由实际媒体时长确定，静态样例1.2秒 |
| greeting / subtitle | 必需纯文本，分别1–100及0–180字；不虚构授权/业务检查 |

目录样例：packages/dsh-skin-core/examples/startup-poster/。复用原创网格PNG，不含扫描原片、声音、时间轴或字体资产；缺video本身是合法静态形式。内容线可据此准备独立新版本，不写入0.6.0。

模块准备/应用只验证并登记当前内容，ready表示可预览，playing只来自实际原生窗口回执。自动触发沿用dev11启动原因、最后成功兼容快照和旧startupEnabled；换肤/恢复/运行中启用不重播。手动预览复用原入口，不打开自动开关。

设置语义分开：模块“启用本套开场内容”使用现有disabled.startup，关闭时停止本套开场且不退播旧角色；旧全局“启动时自动播放”仍保存startupEnabled，不因选皮肤改值。模块可用而自动关闭时仍允许显式手动预览。未声明startup的旧包保持原行为。

pet/startup共享原生进程，分别保存媒体及就绪状态。startup不等待pet.ready；使用contentKey和既有代次，换版/停用/停止/关开关取消旧播放，晚到ready不能显现。任一模块exit只释放自己持有的内容；模块未实现时显示unavailable。启动前快照仅在无stopped/pending/停止请求且兼容时可用；Host接管/页面恢复不发第二次播放。

原生配色只取本套已验证theme的背景/正文/强调token对，缺失沿用既有day/night。视频错误退poster，保留现有进入按钮、45秒慢启动/打开DSH退路；不承诺ESC、音量、新播放策略或时间轴。所有启动/打开验证必须用隔离回执，不拉起用户真实DSH。

实现复用同一intro窗口、introStartedAt及本次播放token。poster首次就绪开始计时，可选视频首次实际playing校准一次同一时钟，ended回执与已登记ready/实际playing分开；所有回执先验证本次token。不会把窗口加载耗时扣到成片尾部。

正常官方页面重连时，CompanionSkins现有恢复入口只在同一成功contentKey、代次和选择仍有效时等当前一轮结束，随后走原restore；等待受现有1–15秒预算约束。显式停止、模块关闭、换内容仍马上走原代次取消；延期任务不保存旧快照，不排旧选择恢复。公共协调器未添加startup分支。
