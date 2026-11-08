# A1 新角色 M4 资源与内容准备

2026-11-03，消费主控docs/handoff-first-skin-native-m4.md。A1两状态已接受为原生试接小样；模块线确认pet-animation-subset-contract-m4.md后，本线已按真实合同生成独立可加载候选。

## 独立候选

目录 designs/dsh-skin-v1/content/archive-warm-whale-a1-m4/。沿用同id archive-warm-whale，独立版本0.5.0，formatVersion2；theme模块v1、pet interfaceVersion1/configVersion2。原loader计算contentKey为aa4d7941e7bf6637e172b4736fe651f0571c6c8a64ebd50fe6d69d42a4e75934；不覆盖0.4.0。

| 候选资源 | 已审来源 | 内容与预算 |
| --- | --- | --- |
| assets/archive-grid.png | 0.4.0内R3原创背景 | 1440×900透明PNG，7056字节，保持主题阅读静区 |
| assets/idle-a1.webm | assets/whale-motion-a1/idle-a1.webm | 362×362透明，12帧，3秒，无音轨，约675KiB |
| assets/react-a1.webm | assets/whale-motion-a1/react-a1.webm | 362×362透明，12帧，1.8秒，无音轨，约676KiB |

三文件按字节复制并核对，不缩放、不调色、不移动源帧。精确源路径、字节数与sha256在reports/first-skin/m4-resource-staging.json；该报告保留初始暂存阶段状态，当前可加载状态以m4-content-validation.json为准。原始图集、提示词和生成记录仍在assets/whale-motion-a1/，无需带进运行资源清单。

## 根据已就绪能力收敛的内容建议

- 暖白/夜间主题和背景浓度继续复用R3，不重做主题。
- 桌宠大小默认100%，固定canvasHeight195，沿用模块百分比语义；预计不透明角色约180px，实际像素与轮廓仍待原生确认，本线不将预估写为已验收。
- 智能互动、本套人设、默认模型、10轮近期历史、允许说话/动作继续用已落地M3字段和默认。历史仅本次运行，动态短句120字。
- 人设仍为R4原文，本地回退仍为“我在这里，陪你慢慢来。”。
- 只声明idle“安静陪伴用户”和react“轻轻回应用户的当前互动”；以模块确认的两状态资源配置和运行可用清单为准。
- 本套不提供走路/跑步资源，因此本候选不公开自主活动、跟随鼠标或相关活动风格设置；profile固定gentle、自主与跟随固定false，保持现有本地待机/回应执行。旧包配置继续兼容，本候选不能混播旧角色。设置隐藏与固定值由原合同消费，不建新开关。

## 原生观察与素材边界

单段内脚底稳定；idle与react之间有约3–4px源画布绝对脚底差异。先看实际180px播放、回应结束回待机、切换和拖拽/停止效果；如肉眼明显跳动再做一次简单位移或素材定向修订，不预建锚点系统。

发丝/头饰细节闪动和低帧率接缝保留记录，不在原生结果前重生成。全身服装仍是候选；原始扫描参考权属链未完整确认，运行候选仍仅限本地隔离审稿，无公开分发或商用声明。

作者5项定向内容检查已通过：真实v2 loader与两状态、3资源摘要及A1源逐字节一致、8项公开默认、旧同皮肤自主/跟随true覆写不执行、A1原12交付和R3原91文件摘要保持。脚本reports/first-skin/check-a1-m4-content.mjs，结果m4-content-validation.json。

当前内容就绪，等待本准确contentKey的定向原生验证。运行/原生证据由模块线维护，本线不改底座或真实profile，也不援引另一夹具包的通过结果。
