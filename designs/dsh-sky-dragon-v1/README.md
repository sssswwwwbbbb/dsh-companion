# 决斗者 · 天空龙（无桌宠小样）

DSH 第二套皮肤 · `duelist-sky-dragon` · `0.1.3`。范围按开发侧答复收敛：主题 + 工作区语义图标 + 入口徽记 + 开场 + 回复风格，**不含桌宠**，**省略 `workspaceRole`**（改由后续静态角色位能力承接）。

## 目录

```
designs/dsh-sky-dragon-v1/
├── skin/                     可编辑源：skin.json + assets/
├── scripts/build-skin.mjs    从头生成清单与资源副本（读素材包，算 sha256/尺寸）
├── scripts/pack-skin.py      打 ZIP 并复核资源一致性
├── scripts/themed-icons.py   生成 50 枚题材化线性图标（可 --assets 直接写入 skin/assets）
├── duelist-sky-dragon-0.1.3.zip  可导入成品
└── review/                   自检记录
```

## 复现

```sh
node scripts/build-skin.mjs          # 素材包解包在 /tmp/slifer_pack，或从 素材/ 的 ZIP 解出
python3 scripts/pack-skin.py         # 生成 ZIP，输出 sha256
node <制作工具包>/scripts/skin-author-check.mjs duelist-sky-dragon-0.1.0.zip \
  --dsh-version 0.2.2-rc.1 --platform darwin-arm64
```

## 包含

| 模块 | 内容 |
| --- | --- |
| `theme` v3 | 61 个颜色变量（明暗各一套）、聊天背景 WebP、`commander-v1` 版式、50 个**题材化线性图标**（卡牌切角语言，浅深各一）、两版入口徽记 |
| `startup` v3 | 1280×720 静帧 + 10.08 秒有声 MP4（`handoffSeconds` 0.35、`stillSeconds` 1.2） |
| `replyStyle` | 称呼「决斗者」+ 语气；1.0 起默认启用，按皮肤记住会话选择 |
| `character` | 共用角色「亚图姆」：身份 + 工作区补充（无桌宠，未声明 petContext） |
| `workspaceCues` | 欢迎 / 切会话 / 切工作区 三条提示：`决斗者，回来了。` / `换到这一场了。` / `换了个决斗场。` |
| `workspaceRole` | 工作区角色位：`avatar` 小头像 + 工作状态（1.1.0-dev.3 合同，无需 WebM；名称「亚图姆 · SKY-DRAGON」） |
| `scenePresets` | 模型徽记「天空龙」1 组；工作区强调色「决斗场」「千年」2 组 |

合计 105 项资源、4.96 MiB，`contentKey` `a780189a…`。

## 素材与许可

素材由 **Dr.S** 原创，可公开分发（计划上架）。包内附 `LICENSE.md`；台账见 `delivery/asset-register.csv` 与 `delivery/attribution.md`。

素材取自 `素材/DSH-神之召唤-天空龙皮肤包-v1.0.zip`（v1.0）。该包为粉丝二创，仅限本人本地使用、禁止分发；本皮肤按私有自用交付，ZIP 内附源素材包的授权记录位置说明，未修改原素材。5 枚无替换位的图标（`history` `bookmark` `quote` `volume` `mute`）按开发侧答复留在素材包留档，不进本清单。

## 待引擎侧能力

| 项 | 状态 | 说明 |
| --- | --- | --- |
| 语义图标替换覆盖 | 待修 | 50 个位已声明，实机仅命中输入区与文件类型图标；见 `docs/second-skin-icon-coverage-2026-11-06.md` |
| 皮肤卡片封面 | 已接入 | dev.38 起 `skin.json` 支持顶层 `cover`；本套用 `library-cover`（960×600 WebP，137 KB） |

## 已知限制

- 工作区暂无角色位：`workspaceRole` 仍要求两段 WebM，按答复本轮省略。
- 6 态状态图、小操作反馈、待机装饰循环、事件提示音：引擎接口未接入，素材已在包内留档。
- 开场声音默认关闭（`soundEnabled: false`）；开启后播放 MP4 自带音轨。

## 交付状态（2026-11-06）

Mac 实机验收完成（0.1.5）；随后按主题盒子 1.0 升级为 `1.0.0`，新增 `character` / `workspaceCues` / `scenePresets`，`contentKey` `0e4ecbbe…`，ZIP SHA-256 `6f00794c…`，107 项资源 / 5.14 MiB。
验收明细见 [review/acceptance-2026-11-06.md](review/acceptance-2026-11-06.md)。

等引擎侧补齐后可沿用同一份素材出小版本：

| 待引擎项 | 我们届时要做的事 |
| --- | --- |
| 独立面板图标位（设置、技能、终端） | 在 `semanticIcons` 补声明，图标从现有 50 枚映射或补画缺失枚 |
| 令牌白名单扩充（插件页 / 设置页黑白） | 补 `settings-card-fill`、`button-primary-fill` 等十几个色值 |
