# 本地设计稿素材说明

本目录为首套皮肤视觉与交互验证，不是发布包。R2 可见桌宠已替换为同角色生成图集；旧视频只保留历史对照。

R2 图集使用内置 imagegen，根据扫描关键帧生成。银蓝长发、蓝青眼睛、白色褶边及深蓝蝴蝶结取自参考；全身服饰为设计延伸。生成没有解决参考角色的原作者/使用权链，不声明商用或独占权。提示和摘要见 assets/whale-unified-r2/。

1. R1 历史桌宠动画及派生静态帧来自现有 designs/dsh-companion-v1，原始来源 PC2005-cloud/dsh-pet 固定提交 2265f24a941e6d6736d8a069cc06cf4216df4539。保留 assets/whale-maid/NOTICE.txt 与 upstream-provenance.json。角色原型为上善无形，鲸鱼娘形象为 ZipZipPipe 的社区二创，非 DeepSeek 官方形象。CC BY-NC-SA 4.0 及上游非商业条款独立适用。
2. 扫描原片来自 LeeRolling/dsh-boot-suite 固定提交 34b892eae168abf14fc9623cb109d6806ffeacf2，文件 Git blob 已匹配。上游标注 BSD-3-Clause、原作者待确认。原 NOTICE 的 SHA-256 与实际文件不一致；本轮只作本地参考，不扩大许可，不进入 content/archive-warm-whale。
3. 本轮没有改写视频，也没有提取或采用声音。原片音轨在原型中始终静音。关键帧是原片的本地派生参考，使用边界同源素材。
4. 档案配色参考沈宏宏/LeeRolling；日常界面、文案、组件、原创几何网格与本地调度为本轮设计。
5. 使用系统字体，不携带字体文件。React/ReactDOM 与 Babel 的 MIT 文本位于 vendor/。
6. R1 历史可加载内容目录仅含 skin.json、原创背景 PNG 和 README，引用既有桌宠包。可加载不等于可对外分发或商用。

更完整的资源表及缺口见 docs/first-skin-design/character-assets.md。

## R3 配置修订

本轮没有新增角色/视频/字体素材或第三方依赖。继续复用本地 React/ReactDOM、原生表单及现有底座合同；两套强调色与环形几何背景为本地方案代码。R3配置候选仍引用历史builtin，不包含新角色，不能据此扩大角色或扫描片分发范围。复用取舍见 docs/first-skin-design/reuse-decisions-r3.md。
