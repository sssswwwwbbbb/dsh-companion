# 共享运行合同 v0.1

日期：2026-11-03（Asia/Shanghai），维护者：底座线。**M0 已声明范围及 F1/F2/F3 独立复验通过；R3 五字段已完成底座线定向受控接入。** 这是本项目 API，不是 DSH 官方格式。当前目标 DSH 0.2.1-rc.5 / Mac ARM64；结果见 `reports/skin-foundation/progress.json` 与 `docs/skin-foundation/implementation-report.md`；不代表真实用户客户端或发布验收。

## 包

目录包含 skin.json 和相对路径资源。根字段示例：

```json
{"formatVersion":2,"id":"sample-a","version":"1.0.0","name":"技术样例 A","description":"仅主题","dshVersions":["0.2.1-rc.5"],"assets":{},"modules":{"theme":{"interfaceVersion":1,"configVersion":1,"required":true,"config":{"tokens":{"--dsw-alias-bg-base":{"light":"#f4f6f8","dark":"#20262e"}}},"settings":{}}}}
```

id 为小写字母开头的 3–64 字符（小写字母、数字、短横线）；version 为三段数字。根及已知模块严格校验，不接受代码、CSS 文本、外部 URL 或绝对路径。未知必需模块拒绝；未知可选模块有界保留、显示不可用且不执行。相同 id/version 的不同内容按摘要隔离，保留可恢复旧内容。

## 模块与配置

模块统一为 `interfaceVersion:1, configVersion, required:boolean, config:{}, settings:{}`。theme/startup及原pet为configVersion1；pet另支持M4子集configVersion2。config 是固定参数，settings 是公开字段，不能重复。公开声明 `{label:"尺寸",default:100,showWhen:{field:"autonomous",equals:true}}`，label/default 必填；showWhen 可省略，仅引用本模块已声明的布尔/枚举字段。未声明项隐藏，缺 default 拒绝，不用内部默认静默补齐。

| 模块 | 字段 | 合法值 |
| --- | --- | --- |
| theme | tokens（固定） | 1–80 个已核对的官方颜色 token，值为 `{light,dark}`；颜色为 #RRGGBB 或 #RRGGBBAA |
| theme | background（固定，可省） | assets 的 PNG/JPEG/WebP 逻辑 ID |
| theme | backgroundOpacity | 0–0.15，内部 0.04 |
| startup | poster / video（固定） | poster为必需PNG/JPEG/WebP逻辑ID；video可省，仅本套无音轨WebM，单次播放，失败回poster |
| startup | seconds / greeting / subtitle（固定） | 1–15秒，按实际媒体；纯文本分别1–100/0–180字；settings首轮为空 |
| pet | builtinPack（固定） | 已有 v1 包 ID，样例使用 whale-maid-demo/whale-maid-night |
| pet | animations（固定） | configVersion1可省或给完整12槽；v2必须声明含idle的真实子集。各 `{asset,seconds,loop}`，WebM、0.1–60秒；自定义时集合整体替换，builtinPack只借行为曲线、不补旧媒体 |
| pet | canvasHeight / canvasOffsetY（固定） | 基础媒体区高度100–400，缺省300；纵向平移-40–40，缺省0。随size缩放，保持媒体原比例；最终A1/A2用195/10 |
| pet | size | 70–140，内部 100 |
| pet | profile | free/gentle/lively，内部 gentle |
| pet | autonomous | 布尔，内部 false |
| pet | followMouse | 布尔，内部 false |
| pet | smartEnabled / persona | 智能启停 boolean（内部 false）；人设 text ≤2000 字（内部空），由本套声明 |
| pet | modelSelection / historyRounds | 跟随官方 DSH 默认模型或指定 provider/model；最近0–20整轮（内部5） |
| pet | allowSpeech / allowActions | boolean，内部均 true；模型与原生执行端都遵守 |
| pet | actionDescriptions / localReply（固定） | 本套真实动作 ID 的语义描述 / ≤120字本地回退；详见 M3 增量合同 |

主题用官方 overrideTokens，跟随明暗，不调用持久化 setTheme。会话面板呈现，进入插件/管理页自动撤下，返回恢复。背景用 shell.overlay，pointer-events:none。M3 可选智能互动使用官方 llm、桌宠专属近轮上下文和已有原生执行器；不含声音和脚本。配置、输入、实际结果及模型范围见 [M3 增量合同](skin-foundation/pet-interaction-contract-m3.md)。

M6开场复用原生intro窗口和全局startupEnabled自动偏好；模块启停使用disabled.startup，显式预览不改自动开关。应用只登记，ready不等于playing；开场与pet分别持有资源/就绪状态。冷启动只消费最后成功、兼容、未停止且无pending的快照，同内容页面重连让当前一轮完成后再走原恢复，不重播。字段、实际媒体时钟及回执规则见[启动实施合同](skin-foundation/startup-contract-m6.md)。未声明startup的旧包沿用既有开场，不给新角色补旧greet。

## 资源

assets 为逻辑 ID 到 `{path,mime,sha256,bytes,width?,height?,alpha?,source?,license?}`。path 是包根内相对路径，禁止 `..`、反斜线、URL、query、编码转义和符号链接。必填 bytes/sha256 在准备时逐字节核对。图像 ≤8 MiB、WebM ≤16 MiB、总资源 ≤128 MiB；清单 ≤64 KiB、资源 ≤32。页面得到数据 URL，不得到本机路径；原生缓存使用内容及资源摘要，加载前复核。来源/许可如实填写，可加载不代表可分发。

## 持久化与迁移

新状态 skin-state.json（格式 1）：selected 为最后成功内容快照；overrides[skinId][moduleId][field] 只含用户改动；disabled[moduleId] 是跨皮肤关闭；stopped 是全部停止意图；pending 是未完成事务；suspension 记录官方插件卸载的客户端作用域释放边界。授权和旧 settings.json 不迁移重写。v1 继续原入口；显式迁移仅产出带 provenance 的候选副本，不能推断哪些旧值是默认值，全部保留。

有效参数：模块内部值 → 本套 config/default → 本套公开字段覆写。false/0 不等于缺省。切换不继承别套参数；重置只清本套覆写。普通更新成功后保存；关闭/停止先保存抑制意图。重启/重新启用不解除停止，仅主动应用/恢复成功解除。发现 pending 或独立停止请求先停止并保留上次成功内容。

## 运行合同

Host 唯一提交。执行接口 prepare(context)、apply(context,prepared)、exit(context)、invalidate(generation)。context 含操作 ID、单调 generation、contentKey、有效性检查。prepare 不改变外观；apply 返回实际就绪回执；exit 可重复，未知清理不能报成功。更新走同一事务，失败有界回滚。必需已启用模块全部就绪后提交，可选不可用/失败、用户关闭、未声明分开显示。

页面复用 Typert Remote 的 skinPage 领取有租期的命令，回执含 clientId/generation/commandId。新页面使旧回执失效；原生复用认证 bridge 的 /skin/*，检查协议版本、代次和资源后再显现。迟到操作不能重新显示。停用立即失效、清理页面、停止原生；正常换肤不重播开场。官方插件卸载会先移除远程通道，因此该路径由客户端 ctx.effect disposer 清理，Host 记录 suspension，不虚构页面回执；下一次恢复要求新页面握手。非卸载情形清理不明仍进入故障。原生进程意外退出时，可选模块标记不可用，必需模块使整体停止并等待主动恢复。

初始有限超时：页面 8 秒，原生加载 15 秒，单阶段最多 20 秒。基线结果和冻结值记录在底座报告。只允许本插件资产与效果的清理，不回写宿主或其他插件旧快照。

能力矩阵：docs/skin-foundation/capability-matrix.md；可执行 A/B：packages/dsh-skin-core/examples/。皮肤线将新需求写入 designs/dsh-skin-v1/integration-needs.md，底座在阶段边界回应。仅新增公共能力升级合同，视觉内容留在皮肤包。

## 独立验收返工说明

2026-11-03：皮肤公开字段、模块版本、资源格式与默认值规则不变。原生独立停止采用本地 revision 取消本端在途操作，不独立推进 Host generation；未消费停止、自动恢复和回滚不能解除抑制。显式恢复须与当前 Host pending 操作身份匹配，并在实际就绪后解除。页面重新握手接续正在执行的命令，提交前确认当前页面；空闲恢复目标只取仍然有效的已提交内容。停止使用独立请求通道优先级，普通迟到响应不能改写停止结果。内部 IPC 由同一候选构建单位维护，不向皮肤作者开放这些控制字段。修复和复验见 skin-foundation/rework-acceptance-2026-11-03.md；原独立验收不据此自动改为通过。

阶段状态更新：F1/F2/F3 独立复验见 skin-foundation-reacceptance-2026-11-03.md；R3 0.3.0 九项定向结果见 skin-foundation/r3-integration-2026-11-03.md，主控已通过该阶段审核。M3 完成实现和8项受控适配/原生联调，真实模型未验；独立审核另列，不回写旧验收结论。原初验历史保留。

M3＋F1已由主控复验通过，见skin-foundation-m3-reacceptance-2026-11-03.md。M4 v2子集的真实字段与缺动作规则见[子集合同](skin-foundation/pet-animation-subset-contract-m4.md)：缺walk不公开跟随，缺全12槽不公开自主；模型/菜单/本地执行共用已解码集合，回应结束回idle；不混播旧角色。M4准确内容及原生证据单列，尚不据此称真实模型或最终美术通过。
