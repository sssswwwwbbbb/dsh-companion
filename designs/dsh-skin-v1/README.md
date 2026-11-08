# 档案暖白 · 鲸鱼娘 / 首套关键稿 R3

R3 回应独立验收的两处状态缺陷及配置深度反馈。当前仍为可审查原型，未获得完整设计定稿或新角色运行验收。

预览：http://127.0.0.1:4314/dsh-skin-v1/#settings 。本地服务启动命令：

    python3 -m http.server 4314 --bind 127.0.0.1 --directory designs

页面为本地 React/ReactDOM 18.3.1，运行时无CDN、远程字体或模型请求。Babel仅用于预编译。已有五个视图继续保留。

- 常用：配色、强调色方案、自带背景图案/浓度、桌宠大小/风格和减少动态。
- 更多：自主/跟随/频率、点击及文案、完成/处理反馈、冷却、示例模型/状态规则和开场方案。
- 能力与用户开关分别记录。不可用停止表演且保留参数，处理状态独立于气泡开关，固定提示直到模拟解除。
- 规则编辑器只消费示例 ID、纯文本和本套姿态，不读取真实模型，不提供不存在的形象变体。

## 内容与验证

content/design-defaults.json 是28字段设计声明，runtimeLoadable=false。配置矩阵 content/configuration-matrix-r3.json 与 docs/first-skin-design/configuration-matrix-r3.md 逐项说明首版/后续/不做/待验证和实际能力。

content/archive-warm-whale-config-r3/ 是新合同验证候选，公开5个已有字段，仍引用旧 builtin 桌宠；原 content/archive-warm-whale/ 保持R1原始摘要。新角色与新规则没有进入运行包，也未做本轮原生行为检查。

    node designs/dsh-skin-v1/checks/build-preview.cjs
    node designs/dsh-skin-v1/checks/check-r3.mjs
    node designs/dsh-skin-v1/checks/check-preview.mjs

15项状态/合同检查含64组组合，8项静态资源检查，48对浏览器实际CSS文本对比度；浏览器复验明细与截图在 reports/first-skin/r3-*。它们不替代主控独立验收。

## 历史与保存

index-r1.html / index-r2.html 保留旧版入口，revisions/r1/ 与 revisions/r2/ 固定源文件及旧11字段设计基线。主控的原始回执与独立反例未改写，R2的25项作者检查也原样保留。

当前按皮肤保存覆写到 dsh-skin-v3-preview；?qa=1 使用独立 dsh-skin-v3-qa。首次只读借用旧键中同名合法偏好，旧像素大小不直接当成原生百分比，原记录不改。重置清本套覆写，保留当前版本预览的全局停止、静音和授权意图；没有访问真实DSH数据或授权。

统一角色原图、提示与来源继续保留在 assets/whale-unified-r2/，全身服装为候选，完整逐帧动作未制作。来源/许可见 ASSET-NOTICE.md，复用取舍见 docs/first-skin-design/reuse-decisions-r3.md，接入边界见 integration-needs.md。
