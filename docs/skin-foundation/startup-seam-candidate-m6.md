# M6 启动接缝候选（只读核对，未实现）

2026-11-03。供主控审后决定实施；未新增模块、未改公共协调器或操作当前隔离环境。

**可直接复用。** dev11的appReady→playIntro、启动器显式触发/手动重播、startupEnabled全局开关、同一原生intro窗口及DSH窗口定位、introReady/Host就绪交接、进入按钮、45秒慢启动提示与“打开DSH”退路。视频已muted，现有设置没有音量/静音字段。来源：src/startup.mjs、controller.mjs及runtime-src/main.mjs/startup.mjs；不另建启动计数、时间轴或声音系统。

**建议的最小内容接缝。** 新可选startup模块interfaceVersion1/configVersion1（当前runner尚不支持），settings首轮为空；不增加与全局开关重复的enabled/policy。

| 固定输入 | 候选约束 |
| --- | --- |
| poster | 本套PNG/WebP逻辑资源ID，作为静态/加载失败回退 |
| video | 可省的本套无音轨WebM逻辑ID，播放一次 |
| seconds | 沿用1–15秒预算，以实际交付媒体测量值为准 |
| greeting / subtitle | 沿用≤100/180字；纯文本，无“正在授权/核验”等虚构步骤 |

资源仍走现有assets/hash/cache。档案底板与扫描如需前后串接，由内容线交一段成片；不接入上游layers/keyframes或新增多段调度。原生底色/正文/强调从本套已验证theme token快照取值，缺主题沿用原day/night，不开任意CSS/字体。开场不占用pet.greet，旧包和无startup声明的既有启动行为不变。

**真实需要补的适配。** 当前播放器只读pack.animations[startup.animation]，A1没有greet所以入口不可用；需独立intro描述，启动前只读取最后成功且未停止/未pending的兼容快照。Host接管时核对内容身份，页面恢复只接管、不再触发。startup.mjs目前只按packId缓存，须复用contentKey/既有代次识别更版。交接不能再依赖被关闭的pet媒体ready；皮肤stop/exit须接到既有intro取消/隐藏，并沿用现有失效身份拒绝晚到ready，不能仅隐藏桌宠。

**行为约束。** 应用/换肤/恢复/运行中启用都不自动重播；自动播放只沿用dev11启动原因与全局开关，手动预览走原入口且不反向写开关。关闭开关或停止立即取消本套开场；未就绪的Host保留原打开退路，不为皮肤延长等待。首轮只用现有进入按钮，ESC目前未接入，不冒称已支持。无音轨资源＋muted先行，不增加声音参数。

**内容线还需交。** 扫描参考实测7.04秒、含音轨MP4；旧模板7200ms与实片不一致，当前asset合同也不接MP4。需独立交无音轨WebM、poster、准确时长/字节/摘要、署名及可用范围；原参考与NOTICE不覆盖，作者链/摘要差异沿用character-assets.md的未解决说明。纯档案静态回退可先准备，扫描仅作本地参考。以上字段/接缝经主控审核后再写运行合同和代码；A2两段原生核对不依赖本候选。
