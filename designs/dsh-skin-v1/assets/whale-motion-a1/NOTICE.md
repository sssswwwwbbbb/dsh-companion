# 鲸鱼娘连续动作试制 A1

2026-11-03，首套皮肤设计线使用内置 imagegen，按既有鲸鱼娘候选形象生成 idle/react 各 12 个连续重绘帧。两张透明原始 PNG 原样保存；WebM 和 animated WebP 只是将原始图集的等尺寸格子按序编码，没有增加绘制帧、补帧或以整体变换冒充动作。

参考：../whale-unified-r2/character-atlas-r2.png；react 同时参考本目录 idle-atlas-a1.png。R2 参考链继承扫描形象，原作者/分发权链仍未完成核查，见 ../whale-unified-r2/NOTICE.md。全身服装属于尚未最终确认的设计延伸。生成工具不自动解决参考素材权属；本批仅用于当前本地设计和隔离审稿，未声明可商用或公开分发。

原始图集 1448×1086，4 列×3 行，单帧 362×362，真正透明 RGBA。待机 12 帧 / 3 秒，回应 12 帧 / 1.8 秒。只试制这两个状态，不补齐或伪装为 M0 所需的 12 槽完整资源包。原生锚点、真实客户端以及全套动画分别待验。

提示词：prompts.md；来源、摘要和编码结果：generation.json；只读几何测量：reports/first-skin/a1-motion-audit.json；预览：designs/dsh-skin-v1/motion-a1/index.html。
