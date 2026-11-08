# 素材参考库

2026-11-04建立，2026-11-05补充开源制作工具。来自用户提供的素材入口与制作项目，纳入本项目长期参考。以下是资源与工具收藏，不是已纳入发行包的素材或依赖清单。围绕具体设计需要选用，再核对作者、许可、创作来源、服务依赖与下载档位。

## 当前主题如何使用

首套仍是「档案暖白＋银蓝鲸鱼娘」。纸面、装订、光影可参考实物与材质；角色继续沿用本项目既有形象。赛博城市、机甲、像素角色留给后续对应主题，不混入首套。本轮新增演出采用代码绘制的纸页几何与既有 A2 视频，未下载或加入第三方图片，也不将既有生成角色材料标成手绘。

## 入口与已核对的候选

| 入口 / 资源 | 许可与来源记录 | 合适用途 / 当前状态 |
| --- | --- | --- |
| [itch.io](https://itch.io/game-assets) | 按每个资源页的 Asset license、Content 和下载文件核对；平台不是统一 CC0，也不是统一无 AI。 | 找完整的同风格素材包；优先作者明确声明 No generative AI was used 的资源。未整体导入。 |
| [Quaternius · Cyberpunk Game Kit](https://quaternius.com/packs/cyberpunkgamekit.html) | 此具体包页面列明 CC0，提供 71 个模型；该结论不扩展到作者所有资源。此页核对未取得明确的无 AI 声明。 | 后续科幻主题的机械、载具、场景结构参考；本套不采用。 |
| [ansimuz · Synth Cities Environment](https://ansimuz.itch.io/cyberpunk-street-environment) | 页面同时标明 CC0 与 No generative AI was used。下载区有免费文件和付费档位，不能把全部文件称为免费下载。 | 后续像素赛博主题的城市、视差背景；本套不采用。 |
| [Transhumans · Pablo Stanley](https://www.transhumans.xyz/) | 作者主页明确列 CC0，提供 SVG / PNG；本次未取得其逐图创作过程或明确无 AI 声明。 | 黑白朋克、义体结构的参考入口；非本套角色素材，不替换鲸鱼娘。 |
| [Openverse](https://openverse.org/) | 聚合检索入口；筛选 CC0 / Public Domain 后仍回到原始资源页核对许可、作者及文件。聚合结果本身不能证明无 AI。 | 寻找公版图案、老印刷物、实物参考；尚未选定具体资源。 |
| [Pixabay](https://pixabay.com/) · [Content License](https://pixabay.com/service/license-summary/) | 使用 Pixabay Content License，不能统称 CC0。允许免费使用、改编，但限制几乎原样的独立再分发；是否 AI 需按具体条目辨认。 | 实拍光影和材质参考；若需随皮肤包分发，单独核对该使用方式。未采用具体文件。 |
| [Poly Haven](https://polyhaven.com/) · [许可](https://polyhaven.com/license) · [制作说明](https://docs.polyhaven.com/en/technical-standards/textures) | 官方资产许可为 CC0；纹理技术标准说明基于摄影、摄影测量等方式制作。不能由此把所有模型、HDRI 都叫作手绘。 | 首套需要纸张/实物材质、环境光参考时优先检索；当前未选定文件，避免用纹理干扰正文。 |
| [The Met Open Access](https://www.metmuseum.org/hubs/open-access) | 公版作品图片与开放数据使用 CC0；具体作品页的 OA 标记是核对入口，不包含全站所有图片。 | 老纸张、装帧、器物和印刷结构参考；尚未选定资源。 |
| [FreeGameSprites](https://freegamesprites.com/en) | 站点宣称资源为 CC0，但本次未取得可靠的作者/制作过程或无 AI 声明。仅保留入口，不标记为已核实的手绘素材库。 | 若以后需要特定像素资源，再检查具体包；当前不采用。 |

## 开源素材制作工具与流程

2026-11-05，按用户要求收藏以下两个仓库。已阅读原仓库说明、许可证及相关依赖说明；当前状态为**已收藏，未安装、未接入、未在本项目试用**。

| 项目 | 用途与本项目适用场景 | 许可、依赖与采用边界 |
| --- | --- | --- |
| [PixelFX · patch-gg/pixelfx](https://github.com/patch-gg/pixelfx) · [效果画廊](https://patch-gg.github.io/pixelfx/) | 代码驱动的像素特效库，包含科幻/全息、粒子、天气、UI反馈和转场；支持调色、前后景合成，以及透明PNG精灵图集和帧信息导出。适合后续像素/科幻主题的特效素材，也可参考其动作蓄势、作用与恢复的时序组织。精细CG首套按实际风格挑选，不把库内示范小人当成鲸鱼娘动作。 | [MIT](https://github.com/patch-gg/pixelfx/blob/main/LICENSE)覆盖代码与效果；保留[NOTICE](https://github.com/patch-gg/pixelfx/blob/main/NOTICE.md)中的上游声明，`gallery/fonts`的Patch Pixel字体不在该MIT范围。本地JS/Canvas核心，README声明运行核心无依赖；本次核对的[package.json](https://github.com/patch-gg/pixelfx/blob/main/package.json)要求Node ≥18，开发依赖为esbuild。可优先评估制作阶段离线导出，不因收藏就引入运行时库或替换皮肤引擎。 |
| [Scenario Agent Skills · scenario-labs/skills](https://github.com/scenario-labs/skills) | 面向Codex等Agent的素材制作技能集合，覆盖图像、视频、角色/品牌一致性、多参考图、分镜、精灵动画与动作循环，以及部分3D/DCC流程。后续按具体任务优先查`scenario-consistency`、`scenario-multi-reference`、`scenario-storyboards`、`scenario-sprite-animation`和`scenario-motion-loops`，不整套安装。 | 仓库为[MIT](https://github.com/scenario-labs/skills/blob/main/LICENSE)。[Scenario生成技能](https://github.com/scenario-labs/skills/blob/main/skills/scenario/SKILL.md)通常依赖Scenario MCP、已认证账户及项目额度，生成任务可能计费；部分Expert tools技能依赖本机Blender、Maya等对应软件，README说明它们不依赖Scenario MCP。开源的是技能与流程，服务费用及生成素材许可另按所选服务/资源核对；不能把仓库MIT理解成模型、服务和生成内容全部免费或自动采用同一许可。 |

后续采用时只选当前制作任务需要的模块，保留来源、许可与实际输出记录，沿现有资源打包和校验入口接入皮肤。以上收藏不改变当前母版、高清派生修复、启动演出候选或既有模型调用安排。

## 可用的素材生成服务：MOSS

2026-11-04，用户提供自己的平台账户密钥并授权用于项目素材制作。密钥保存在项目本地 `.local/moss.env`（Git 已忽略，权限0600），不写入皮肤包、前端或公开文档。此服务用于制作阶段，不成为皮肤运行时依赖。

- [文生图接口](https://platform.moss.cn/docs/reference/images-generations/)：`POST https://api.mosi.cn/v1/images/generations`，Base/SFT 两种模型；项目候选默认固定 `moss-image-sft-1.0-2026-10-09`，另保留 Base 快照供按需对照。SFT快照已通过一次接口出图验证，完整二次元素材质量和Base模型尚未验证。
- 支持提示词、负向词、seed、可选提示词增强；每次一张PNG、URL返回。尺寸每边256–2048且为16的倍数，总像素不超过2,097,152。可用 `output_watermark.enabled:false` 明确关闭可见水印。
- [布局生图](https://platform.moss.cn/docs/reference/layout-image-generation/)使用同一接口，在prompt中放布局JSON；元素边界框采用以画布中心为原点的 `yxyx` 坐标。适合主题封面、背景留白、插画和装饰构图；界面文字及按钮仍用真实前端控件。
- 这份接口未声明参考图编辑、透明背景或动画输出参数。既有角色身份、透明边缘和动作一致性仍按素材制作规范验证；不自动重制或替换已验收素材。
- 用户当日截图显示 Base/SFT 为限时免费、0积分；非永久价格承诺。`GET /v1/models` HTTP200返回13个模型，但仅列图像提示词增强模型，未列Base/SFT。随后单次实际请求 `moss-image-sft-1.0-2026-10-09` 成功（HTTP200，seed42，512×512，1张PNG），回执用量为1张；图片已下载并实看，说明该列表遗漏不能用来否定SFT可用性。测试文件及回执见 `.local/moss-image-check-current.json`，没有覆盖已验收素材，也未查询积分账单。
- 按官网提示，生成请求超时或断连后不自动重复提交；已有图片URL时优先恢复下载。采用时保存模型快照、prompt、seed（如提供）、尺寸及生成用量，不保存密钥。
- 用户随后明确授权使用免费的MOSS-VL理解开屏人物。已核对[多模态接口](https://platform.moss.cn/docs/reference/responses/)，通过`POST /v1/files`上传图像，再由`POST /v1/responses`引用file_id；单次最多5张图或1段视频，不能图视频混传。固定快照`moss-vl-1.0-2026-07-08`两次实测均HTTP200/completed。但首轮多图混淆、单图仍有臆测，必须对照原图筛选，不把输出自动当角色设定；核查见`reports/coordination/character-consistency-vl/primary-review.md`。此能力仅用于素材制作分析，不接入皮肤运行时。

## 即梦制作工具试用

2026-11-04，用户在设计线明确授权安装官方即梦CLI/Skill、完成登录验证，并使用自己的积分试素材。已安装dreamina1.4.22；主控以`<本机路径> -h`验证可运行，当前非交互shell需使用该绝对路径。技能入口为`<本机路径>

设计线安全回执记录OAuth成功、可读40积分，但CLI返回仅会员有创作权限；不能将登录成功算作创作可用。该CLI验证没有生成提交或积分消耗。随后网页版Seedream5.0Pro/2K在实际提交处也要求会员，没有生成；先前准备的双参考坐姿请求保留为历史，未提交。请求与安全回执在`designs/dsh-skin-assets-v3/identity/dreamina-seated-01-request.json`和`designs/dsh-skin-assets-v3/review/dreamina-cli-validation.json`。

用户随后亲自切换Seedream5.0Flash并提交2K、2:3的四张角色图，页面记录每张3积分、余额40→28；设计线报告四张完成，未由Agent重复提交。这批仅参考开屏原帧`scan-middle.png`，已移除MOSS全身试稿。用户明确说“我喜欢第四张”并提供下载原图；主控已读取原始消息并核对所选文件为1664×2496 RGB、2,979,602字节，SHA256为`53609dd32af4f43cac034e4f16ab0106ea48a405284f41068a62665afbb8fc62`。工作母版及选择、用量、身份记录见`designs/dsh-skin-assets-v3/identity/selected-master.json`。按用户选择保留白围裙等完整服装细节；原水印保留。该选择确认同角色资产的工作方向，透明素材、新动作与整套场景仍待制作和验收。即梦用于制作阶段，不成为皮肤运行依赖，不购买会员，MOSS试稿及旧素材继续保留。

用户随后要求由自己操作网页生成并发送原图，设计线已停止代操作，继续负责提示词、素材检查、处理和整套场景落地。当前坐姿节点仅关联第四张母版，已准备Flash / 2K / 2:3 / 1张，页面报价3积分；截至该交接未提交、未扣费、无坐姿结果，记录见`designs/dsh-skin-assets-v3/identity/jimeng-sit-01-request.json`。后续按用户提供的实际结果更新，不重复提交。

## 查找用语

- 首套档案主题：`paper book binding`、`archive folder`、`cream paper texture`、`book cloth`、`soft daylight`。
- 后续二次元：`anime character sheet`、`cel shading character`、`manga line art`。
- 后续赛博：`cyberpunk CC0`、`pixel cyberpunk`、`cyberpunk neon street`、`neon rain city`。
- 后续机甲与科幻：`mecha CC0`、`mechanical joint`、`robot armor blueprint`、`sci-fi corridor`、`space station`。

## 真正采用时的最小记录

在采用文件旁保留：作品/包名称、作者、原始资源页、具体文件与校验值、许可链接和核对日期、无 AI 的证据或「未确认」、本项目用途及修改记录。CC0 是版权许可信息，不等于自动证明创作方式；免费可下载也不等于允许再分发。未标注许可的原创插画和官方角色设定图，不进入商业素材包。
