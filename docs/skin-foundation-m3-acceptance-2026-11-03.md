# M3 实现候选独立阶段审核

2026-11-03（Asia/Shanghai），总体协调对话。

## 结论

**当前候选需修正一处实际动作回执后复验，暂不完成 M3 代码阶段放行。** 已有模块拆分、六项配置、官方调用接缝和受控闭环可以保留；本轮只要求把实际执行结果记录正确，不扩展新玩法或重复旧 GUI 矩阵。

真实模型调用仍未验：隔离环境无可用模型配置。作者的官方 llm 服务＋受控提供方证据支持适配链路，不证明真实模型会理解人设、按情景选动作。该外部验证状态与本次代码修正分开记录。

## 已检查

- 71 个源码/文档文件与候选摘要一致，标识 abf5b3f24ea3590a47da5571e0a0fa4d0cadc8e74d972de560c4272472d21d8a。
- 独立复跑 npm test，70/70 通过；既有62项与新增8项均通过，进程退出0。
- 阅读互动服务、官方模型适配、配置校验、页面入口和原生执行；上下文确实使用收到的 actual 回执，当前模型语义明确为 DSH 默认模型，公共协调器未被重建。
- 阅读作者8项定向官方服务/原生 renderer 联调和夹具声明。本轮未重新运行这8项 GUI，也未调用真实模型或操作真实 profile。
- 补充一个正常场景对照和一个拖拽中的执行场景：正常回执通过；拖拽场景复现下述缺陷。

证据：[实际动作反例](../reports/skin-foundation-m3-acceptance-2026-11-03/actual-action-probe.json)、[可重跑脚本](../reports/skin-foundation-m3-acceptance-2026-11-03/probe-actual-action.mjs)、[测试输出](../reports/skin-foundation-m3-acceptance-2026-11-03/independent-tests.txt)、initial-identity.json、summary.json。

## M3-F1｜P2：拖拽时拒绝的动作仍被回执及下一轮历史记作已执行

用户场景：向桌宠发出互动请求，在等待回复时拖动桌宠；模型返回 stretch。

`PetBehavior.perform()` 在 dragging 或 falling 时返回 false（designs/dsh-companion-v1/behavior.mjs L54–55），不改变实际动作。原生 `deliverInteraction()`（runtime-src/main.mjs L70–77）没有使用该返回值，仍把选定的 stretch 写入 lastInteraction.action。互动服务信任该回执，继续带进下一轮 recent.actual。

独立反例使用生产 deliverInteraction 函数及真实 PetBehavior，在内存中连接真实 PetInteraction；没有运行 GUI 或伪装成实机拖拽测试。实际结果：行为仍为 idle，reportedAction 和下一轮 actual.action 却都是 stretch。正常站立对照能实际执行 stretch，回执正确。

最小修正：依据执行器是否接受动作返回实际结果；被拖拽/下落状态拒绝时，回执不得称该动作已执行，可返回 action:null，必要时附简明原因。说话的实际结果按已有规则处理。下一轮继续使用修正后的实际回执即可，不需要排队重播或引入新的动作调度系统。

复验：保留本轮原始失败证据，复跑同一反例及相关回归，确认正常动作保持生效、拒绝时历史不虚报。按此次改动做必要检查，不要求重跑无变化的完整旧宿主/冷启动矩阵。

## R4 对接小项

实际 M3 current 为官方 DSH 默认模型，R4 仍有“当前对话模型”占位文案。皮肤线下次对齐为“DSH 默认模型”，避免暗示读取未保存的后台会话选择。此为文案与合同对齐，不重开 R4 的原设计阶段审核，也不要求新增会话采集。

本轮没有改作者实现或报告，没有替换真实安装/profile、提交、推送或发布。继续允许皮肤线独立推进少量动作样本。
