# A1 0.5.2 鞋底完整显示单项修订

2026-11-03。皮肤线复看准确0.5.1原生截图，发现react鞋底贴窗口末行且仍有不透明内容；按源画布位置映射，边界约超出窗口1.2–1.8 CSS像素。主控接受这一可见反例，要求保留前版，另生成0.5.2，将固定canvasOffsetY从12微调为10。

目录designs/dsh-skin-v1/content/archive-warm-whale-a1-m4-grounded/；contentKey：32db05e1113a48b24de2b1d515fff07423d306f4f2d4af31b77ccce1e90c419b。

与0.5.1深比较仅version和canvasOffsetY两处变化。原3资源、8公开项、195媒体高度、100%大小、本套人设及两状态完全相同；所有原候选和A1源文件保留。没有新字段、逐帧坐标、补帧或源图/视频编辑。

作者2项差异/loader检查通过，报告reports/first-skin/m4-grounding-validation.json。复用命令：python3 reports/first-skin/build-a1-m4-calibration.py --grounded；node reports/first-skin/check-a1-m4-calibration.mjs --grounded。不带参数仍为原0.5.1的复现，不覆盖其原报告。

请模块线只复验本准确身份的完整鞋底、回应后回待机及既有停止/资源行为；允许待机约2px留空，不能只用“groundGap=0”断言没有裁切。具体反例记录m4-calibration-visible-review.json，旧失败截图/数据不修改。真实外部模型、最终美术和真实客户端范围继续分开。
