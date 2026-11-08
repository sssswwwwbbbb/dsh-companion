# R4 设计与 M3 首套内容映射

2026-11-03。M3实际合同已由模块线落地，皮肤线据此生成独立可加载内容候选。R4设计已通过独立审核，原9文件的交付快照保留。依主控轻量对齐要求，当前入口只将模型占位文案改为“跟随 DSH 默认模型”并重编译；原app.jsx/app.js另存reports/first-skin/r4-before-default-model-label/。固定样例行为不变，不改为第二套运行协议。

候选：designs/dsh-skin-v1/content/archive-warm-whale-smart-m3/，同id archive-warm-whale / version0.4.0 / formatVersion2。沿用R3完整主题、原背景资源及五个配置，只加入pet模块已实现的6个字段和本套固定人设相关内容。

| R4 预演概念 | M3 真实字段 | 本套默认 |
| --- | --- | --- |
| mode local / smart | smartEnabled false / true | true，明确点击或专属输入触发 |
| persona | persona | R4温柔、俏皮、简短陪伴的人设原文 |
| memoryRounds | historyRounds | 10，0–20整数 |
| allowSpeak | allowSpeech | true |
| allowActions | allowActions | true |
| follow-current-dsh 设计占位 | modelSelection | `{mode:"current"}` |

本地回退固定为“我在这里，陪你慢慢来。”。动作语义仅声明本次历史builtin的idle/react/greet/stretch四项，执行时仍与原生实际已加载资源取交集。避免对历史builtin声称R2图集的具体侧头/服装动作已原生接入；新A1两状态不放入本包，不补12槽。

## 按实际模块收敛的语义

- **current** 是官方 `ctx.agentDefaultModel.currentSelection()` 当前默认模型，保存后供后续桌宠请求使用；R4当前入口已对齐为“跟随 DSH 默认模型”，不解释为任意后台会话未保存的选择。指定模型只来自官方目录，本包不硬编码提供方或模型名。
- **短句** 生产上限120字、3秒，由模块合同执行；R4示例140字只是原型展示值。
- **近期记忆** 在插件本次运行内存中按皮肤分开，最多20轮，重启/重载清空；R4用独立localStorage保留演示记录只为了审稿，不代表运行端持久记忆。设置label直接标“本次运行”。官方桌宠专属Session请求日志由宿主保存，未导入其他工作会话。
- **配置变化** M3取消旧请求、下一次用新快照；R4预演还展示过等待中按当前能力过滤，两者共同目标是旧结果不能执行关闭的能力，以实际M3取消语义为准。
- **模型输出与执行** 生产为speech/action及原生actual回执，R4的say/performedAction/fixture来源只是解释设计；不把样例输出直接交给模块执行。

本轮只校验新增包的loader、资源摘要、11项默认/覆写/重置数据及已验收快照不变，不重跑旧视觉矩阵。其他模块的M3适配报告不等于本包身份的原生通过；请主控验内容及安排此候选的定向隔离接入。真实模型路由仍按模块现状，不读取真实profile/密钥。
