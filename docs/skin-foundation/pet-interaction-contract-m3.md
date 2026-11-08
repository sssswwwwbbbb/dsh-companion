# M3 桌宠互动合同

2026-11-03。实现候选；定向验收结果另见 M3 报告。属于 pet 模块 v1 的可选增量，formatVersion 2、既有五字段及公共协调器不变。旧包无须补字段；原 R3 内容保持原摘要。

| pet 字段 | 类型和限制 | 模块缺省 |
| --- | --- | --- |
| smartEnabled | boolean，可公开覆写 | false |
| persona | text，0–2000 字，可公开覆写 | 空 |
| modelSelection | `{mode:"current"}` 或 `{mode:"specific",provider,model}`，可公开覆写 | current |
| historyRounds | 0–20 整数，可公开覆写 | 5 |
| allowSpeech / allowActions | boolean，可公开覆写 | true / true |
| actionDescriptions | 固定配置：已有动作 ID → 1–120 字语义 | 无 |
| localReply | 固定配置，最多120字 | 空 |

人设和动作语义必须由本套声明后才开放互动入口。公开参数仍由 `modules.pet.settings` 声明 label/default，覆写与重置沿用现有逐套状态。参考 `packages/dsh-skin-core/examples/interaction/skin.json`：样例选用 R4 已提供人设、10轮和原 builtin 资源；样例不代表新角色接入。

current 精确定义为官方 `ctx.agentDefaultModel.currentSelection()` 的当前 DSH 默认模型，DSH 模型选择保存后后续互动跟随它；不读取任意工作会话，不宣称它是一个未保存模型选择的后台会话。指定模型的目录由官方 llm 的 provider/model catalog 提供。仅调用已配置路由；没有模型或路由失败时本地回退，不新增服务和凭据。

远程入口 `petInteract({text,trigger})`：text 最多1000字，trigger 为 input/click；`petModels()` 返回官方可选模型及当前默认。原生轻点转入同一 PetInteraction 服务，沿用 Host 维护轮询；专属输入直接调用。两种入口共享单次请求和近轮上下文，不注册所有工作会话均可见的全局 Agent 工具。

模型只收到本套 persona、当轮输入、最近 N 轮桌宠互动及其 `actual` 回执、允许的短句与动作。动作清单是本套 actionDescriptions 和当前原生已加载动作的交集，不含移动规划。模型只返回 `{speech:string|null,action:id|null}`；短句最多120字，可两项均空。动态气泡通过 textContent 呈现，沿用现有3000ms显示。allowSpeech/allowActions 是本轮能力开关，亦在原生执行端核对。

执行回执保留原生实际短句/动作，再加入下一轮。最近20轮按皮肤 ID 分开保存在插件本次运行内存；重启/插件重载清空，不承诺持久记忆。精确请求文本写入桌宠专属官方 Session 日志，满足模型输入可重建，不导入其他会话。该 Session 不加入工作区，也不运行额外 Agent。

智能关闭、无效模型输出或调用失败使用本套 localReply 和当前可用的 react（无资源则不动作）。30秒调用截止；全局停止、桌宠关闭、换肤及配置变化取消请求，复用已有 generation/内容身份/独立停止锁。迟到模型结果不能重新开启桌宠。没有长期记忆/RAG、定时主动调用、识屏、语音或通用工具平台。

R4 可将 mode local/smart 映射 smartEnabled，将 memoryRounds 映射 historyRounds，将 allowSpeak 映射 allowSpeech。原型中的候选动作和模型选择仍应标注设计状态；仅实际包声明且已有媒体的能力进入模块运行清单。
