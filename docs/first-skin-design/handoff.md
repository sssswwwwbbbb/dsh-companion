# 首套皮肤交接 / R3 修订待复验

2026-11-03。当前方向和角色全身服装继续为候选，未记为用户定稿。R3 修订针对主控独立回执的 D-R2-01、D-R2-02、D-R2-03；原回执和独立证据原样保留。

## 本轮可复验结果

| 事项 | R3 修改 | 证据及边界 |
|---|---|---|
| D-R2-01 能力不可用仍表演 | Settings/Flow 共用有效状态；不可用移除角色、点击目标及动态。能力与用户开关分别保留，恢复不会把关闭意图改为开启。 | 浏览器复跑与 64 组状态模型组合；未操作真实桌宠。 |
| D-R2-02 气泡关闭后处理状态恢复呼吸 | 反馈层级/原会话处理状态独立保存；需处理持续冻结，有固定状态提示；可选气泡与处理提示关闭都不能解除原事项。停止清视觉队列，恢复仍遵守原处理状态，只有“模拟已处理”或示例会话切换解除。 | 8 组气泡×减少动态×庆祝中断全部静态；另复验停止/恢复、显式解除及能力恢复。 |
| D-R2-03 配置深度 | 28 个原型字段，常用/更多分组；两套强调色、自带背景选择、行为/频率、动作/文案/冷却及有结构的模型/状态规则编辑器。逐项取舍与能力边界见 configuration-matrix-r3.md。 | 不把 28 项都写入运行包。规则只消费示例 ID，不读取真实任务或模型。 |
| 已有合同可公开字段 | 新建 archive-warm-whale-config-r3 / 0.3.0，公开背景浓度、大小、profile、autonomous、followMouse，共 5 项。 | 原 loader 解析及覆写检查通过；仍为历史 builtin 桌宠，不含 R2 新角色，未做新宿主行为验收。 |

R3 内容摘要：ef6bbde97e958fc11fd7e25b09d221ac2a9a7cb99a150968f7135514016a6b7f。R1 原包及 ffe29076773d8f17b3c90d0794f14ca54ce69844d4b4a8948791f68ae45471d5 摘要保持不变。R1 的隔离宿主报告不覆盖任何新内容摘要或 R2/R3 角色运行效果。

## 审查入口

- 预览：http://127.0.0.1:4314/dsh-skin-v1/#settings 。常用/更多固定在滚动表单外，窄窗同样可切换。
- 配置：configuration-matrix-r3.md 与 designs/dsh-skin-v1/content/configuration-matrix-r3.json。
- 原型源：designs/dsh-skin-v1/preview-model.js、components.jsx、screens.jsx、app.jsx；纯原型参数 content/design-defaults.json 明确不可导入。
- 对应模块请求：designs/dsh-skin-v1/integration-needs.md。复用依据：reuse-decisions-r3.md。
- 作者检查：reports/first-skin/r3-state-content-validation.json（15 项、64 组状态组合）、r3-static-validation.json（8 项）、r3-contrast.json（48 对）、r3-browser-validation.json（浏览器最终明细）。不是新的独立主控验收。
- R2 原报告保留；index-r2.html 与 revisions/r2/ 保留原型反例。主控回执 docs/first-skin-design-acceptance-2026-11-03.md 与 reports/first-skin-acceptance-2026-11-03/ 的快照另存 r3-independent-evidence-baseline.json，可验证本线未改写。

## 还未完成的部分

1. 再次独立验收，以及配置/动作范围和全身服装候选的定稿。
2. 完整逐帧动作及 R2 角色运行接入。先验证 idle/react 两个完整动作的边缘、脚底、循环和切换，再确定批量范围；当前四姿态/CSS 不称完整动画，未伪造十二种动作。
3. 主题预设/图案选择、点击参数、反馈规则、新开场、静态减少动态所需模块和版本扩展；公共配置、资源、撤销与存储底座继续复用。
4. 新候选的隔离原生行为验证，以及真实 DSH/模型/业务客户端验收；Windows、多屏、200% 缩放未补记通过。
5. 扫描参考原作者链与 NOTICE 摘要差异未解决；生成全身候选不补齐其使用权链。

本线只写 designs/dsh-skin-v1/、docs/first-skin-design/、reports/first-skin/。未修改底座、真实安装或 profile，未部署、发布、Git 暂存/提交/合并/推送，未向其他聊天发消息。制作器、上传、市场继续后置，外部壁纸兼容不做。
