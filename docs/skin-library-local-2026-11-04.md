# 最小本地皮肤库｜本地交审

本轮已实现“皮肤库 → 点已安装卡片使用 → 本套设置”，提供独立官方 DSH 0.2.1-rc.5 / Mac ARM64 Host、客户端及 native 预览，暂存版本 dev.19；等待主控独立审核。没有制作新 tgz 或切换日用 dev.18，源码元数据继续 dev.11。

## 实现与合同

- 安装按钮只发起无参数 `skinInstall()`。现有受认证 native 桥打开真正的 Mac ZIP 文件选择框；Host 只读取这次原生选择返回的文件，没有新增浏览器任意路径读取接口。原生选择入口在显式操作时取得焦点，取消不入库、不切换。
- 解包复用成熟库 **fflate 0.8.2**，已声明为插件运行依赖。独立预览从自身 staging 的 node_modules 解析，生产代码不引用开发机 SDK 的绝对路径。普通 ZIP 根目录须有 `skin.json`，资源仍按既有相对路径、格式、大小和摘要合同校验。
- `loadSkin → prepareResources → cacheSkin` 校验成功后才写本 profile 的库索引 `skin-library.json`；资源沿用 `skin-packages/<contentKey>` 不可变快照。重复同内容幂等；导入不会应用、替换当前内容或重置偏好。ZIP 中非声明资源和脚本不进入快照，ZIP 链接/权限不被物化。
- 已安装列表及选择以真实 **contentKey** 区分，支持同 id 的多个内容快照；旧字符串 id 和当前缓存 selected 的恢复路径继续兼容。只有现有协调器成功提交才更新当前标记；当前卡片重复点击不重载，失败保留原可用选择。普通目录不含 A/B 回归样例或设计占位卡。
- 偏好存储继续沿用原 skin.id 覆写合同、原模块关闭与停止语义。本套设置保留首套 8 项、3 模块开关、自动播放、开场预览、专属互动和重置；字段队列、停止优先及迟到回包规则保留。配置/模块开关/重置附当前 contentKey，旧内容发来的编辑被拒绝。
- 名称、版本及模块来自实际包；只有准确的首套内容使用既有鲸鱼娘图集。无桌宠的包不显示桌宠、人设或空“更多”页。pet.persona 仍只用于桌宠，未扩成工作助手或人设平台。

本轮 ZIP 入口边界：压缩包至多 129 MiB、展开总量沿用 128 MiB 资源预算及 manifest 额度，最多 256 个条目；单资源仍以已有 schema 为准。没有新增内容格式、市场、上传框架或通用权限系统。

## 必要验证

| 验证 | 结果与证据 |
| --- | --- |
| 真正选择和读取 | CUA 点生产入口，操作原生 Mac 对话框，选择准确 0.7.1 ZIP；校验后生成库记录，当前仍未选择、generation=0：`after-import-a.json` |
| 取消、损坏包 | 实点取消时未生成库记录；再选损坏 ZIP 明确拒绝，列表和当前选择未变：`after-cancel.json`、`invalid-zip-rejected.json` |
| 第二套与切换 | 仅在隔离 profile 安装“隔离合成 · 青灰纸面”，实点 A→B→A。A 背景6%/大小99%，B 背景3%分别保存；重复当前卡代次不变：`a-returned.json`、`b-customized.json`、`a-repeat-click.json` |
| 失败及停止恢复 | 一次受控必需主题预检失败时 B 显示失败，A 仍当前且 ready；独立停止保留选择与参数，再点 A 恢复：`failed-switch-retains-a.json`、`stopped.json`、`restored.json` |
| Host 重启 | 正常关闭本次隔离客户端与 Host，再使用同一隔离 profile 启动；两套列表、准确 A 内容与6%/99%恢复，三模块 ready：`after-host-restart.json` |
| 设置绑定 | 实点重置 B，仅 B 背景回默认2%，A 仍6%/99%；A 关闭 pet 隐藏子项，重开保留99：`b-reset.json`、`a-after-b-reset.json`、`pet-disabled.json`、`final-state.json` |

证据均位于 `reports/skin-library-2026-11-04/`。5 项定向自动测试通过，包含同 id 内容分离、坏路径/资源、实际 ZIP 校验与回退；client/Mac 构建及 JavaScript/JSON 检查通过，没有重跑无关矩阵。`preview-source-match.json` 核对 11 份插件源与 live staging 一致，native 仅有隔离协议唤起夹具差异；版本提示核心及对应测试保持原摘要。

最终界面图为 `library.jpg`、`settings-common.jpg`、`settings-more.jpg`，均来自 CUA 对真实独立客户端的截图，已逐张查看；`screenshots.json` 记录原始截图摘要及来源。沿用已审关键稿和 R3，Impeccable context 运行一次、Operate/craft-floor 用于交互检查，机械 detect 无发现；Taste 仅辅助 app-screens 核对，没有另抽风格、叠加完整审查或重画首套。

## 交接与边界

live 预览留在皮肤库，定位文件为私有 `.local/skin-library-current.json`。主控可读取其中的 home/staged/pid 定位本次隔离实例；不要将带连接凭据的 URL 放进公开回执。对应 native 位于该 staging 下，勿混同日用应用。源码及定向验证清单见 `source-freeze.json`、`summary.json`。

准确首套仍为 `archive-warm-whale/0.7.1`，key `4b643de142bb2770340cd56d7c2acd5bced3b09a69ddbf27cd3025d29639620b`，原媒体未修改。合成包只存在隔离验证和本轮测试夹具，不是正式皮肤。

未操作用户日用 DSH、授权、5%/82%偏好或聊天，真实模型调用为0；没有变更云服务、公开上传/发布、提交或推送。Windows、其他 DSH 版本、非普通 ZIP、日用安装体验和后置沉浸事件均不在本轮验证结论内。后续切版由主控及专职验收对话与用户安排。

## 主控复核结论

2026-11-04，本轮最小皮肤库通过**本地隔离 dev.19 验收**。15 份冻结文件无漂移，9 份冻结插件代码与 live staging 相同，候选元数据版本差异符合暂存构建约定；fflate 从自身 staging 解析。独立代码增量复核未发现阻断，已验收的版本提示核心及两份测试共4份摘要、原皮肤5项资源摘要保持一致。

主控在保留的官方独立客户端实际点击 A→B→A、进入两套设置、停止效果并从当前卡恢复。B 只显示主题与背景2%，不出现桌宠或空“更多”；A 的八项设置、三个模块开关、自动播放、开场预览与专属输入均保留，返回及恢复后仍为隔离背景6%/角色99%。结束时三模块 ready，无 pending/error。实际原生选 ZIP、取消、损坏包、Host 重启和受控失败路径沿用作者本轮证据，没有重复全部矩阵。

独立回执和主控截图见 `reports/skin-library-2026-11-04/primary-review.json`、`primary-library.jpg`、`primary-theme-only-settings.jpg`。日用插件只读核对仍为 dev.18；用户当前角色大小已是84%，本次未写入，也未将旧82%快照回灌。尚未生成新安装包、切换日用版本或完成新皮肤库的用户共同验收。
