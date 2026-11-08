# 黑焰（无桌宠版）· DSH 第二套皮肤

`black-flame` · `0.2.4`。范围按 `docs/second-skin-developer-brief.md` 收敛：**主题 + 工作区语义图标 + 入口徽记 + 开场 + 回复风格**，不含桌宠，省略 `workspaceRole`。

素材来源：`素材/DSH-烬角黑焰-皮肤素材包-v3.6.zip`（第三轮修订版：56 枚图标含中性色成套、10.50 s 立体声开场、18 条重做音频、WebP 封面）。成片与静帧做了本地裁切，见下文。

## 目录

```
designs/dsh-black-flame-v1/
├── skin/                         可编辑源：skin.json + assets/（dev.44+ 主产物）
├── skin-dev35/                   同一套素材、去掉 cover 与 workspaceCues 的兼容产物
├── scripts/build-skin.py         从素材包组装清单与资源（sha256 / 尺寸 / 71 令牌）
├── scripts/pack-skin.py          打 ZIP 并复核资源一致性
├── scripts/check-skin.mjs        用本机已装的主题盒子校验（目录或 ZIP，走真实导入逻辑）
├── scripts/video-tools.swift     AVFoundation 小工具：裁切成片 / 抽帧（需 swiftc）
├── scripts/make-scene-badges.py  生成场景徽记（256×256）
├── scripts/export-kit-registers.py  按 1.0 模板导出资产 / 音频 / 动作表
├── assets-src/                   本地改动的中间产物（裁切后的成片、干净静帧）
├── 使用说明.md                    给使用者的安装与设置说明
├── black-flame-0.2.4.zip         主题盒子 1.0 成品（109 项 / 8.50 MiB）
├── black-flame-0.2.4-dev35.zip   dev.35 兼容成品（105 项 / 8.40 MiB）
└── review/                       自检记录、图标对照板、验收清单、实机截图
```

## 复现

```sh
python3 scripts/build-skin.py                      # 生成 skin/
node    scripts/check-skin.mjs                     # 本机契约校验（当前 dev.46）
python3 scripts/pack-skin.py                       # 打 ZIP，输出 sha256
node    scripts/check-skin.mjs black-flame-0.2.4.zip

python3 scripts/build-skin.py --compat-dev35       # 生成 skin-dev35/
python3 scripts/pack-skin.py skin-dev35 black-flame-0.2.4-dev35.zip
```

换素材包版本时只需改 `build-skin.py` 顶部的 `PACK`。

## 内容

| 模块 | 配置 | 内容 |
| --- | --- | --- |
| `theme` | v3 | 71 个颜色令牌（明暗各一套）、聊天背景（浓度 0.04）、`commander-v1` 版式、50 个语义图标（素材包中性色成套）、两版入口徽记 |
| `startup` | v3 | 1280×720 静帧 + **9.35 s** H.264/AAC 立体声开场（`seconds: 9.4`、`handoffSeconds: 0.35`、`stillSeconds: 1.2`），声音默认开 |
| 顶层 | — | `cover` 卡片封面（WebP 59 KB）、`replyStyle`（称呼「契约者」）、`character`（阿斯特身份 + 工作区补充）、`workspaceCues`（三条文案 + 时长 / 位置 / 效果 / 明暗配色） |

设置项：背景浓度、入口标识、工作区细节、界面动效、工作反馈、减少开场动态、开场声音，外加「工作区陪伴」三个开关。

## 素材与许可

素材取自 `素材/DSH-烬角黑焰-皮肤素材包-v3.6.zip`。

- **作者**：Dr.S
- **授权**：仅作者本人可分发；获取者自用，不得再分发

完整条款见 [licenses/README.md](licenses/README.md)。素材包自带的授权文字（「个人二创、非商业」或「可分发」）都是早期沿用参考作品底稿、没随本套更新；以 `licenses/README.md` 为准：仅作者本人可分发。字体为系统字体，未随包分发。

运行包只携带内容与声明，不含工程文件、密钥或授权凭据。

本地改动只有开场成片与静帧：成片 9.5 s 起烧进了主题字「烬角 · 黑焰」，按需求裁到 9.35 s（音频尾 0.35 s 淡出），静帧改用成片 9.0 s 的干净帧；其余为原样拷贝。工具与命令见 `review/self-check-2026-11-08.md` 第三节之二。

## 主题盒子 1.0 升级（0.2.1）

| 项 | 变化 |
| --- | --- |
| `workspaceCues` | 每条补 `seconds` / `position` / `effect` / `colors`，并按场景区分：欢迎「你回来了。火还在。」6 秒·输入框上方·淡入·强调红描边；切会话「换了一页。」2.5 秒·输入框右上·淡入·中性描边；切工作区「我跟着过来了。」3 秒·窗口右上·轻移·余烬金描边。底色与字色三场景共用 |
| `character` | 新增。提供阿斯特的身份与工作区补充，供「主题角色」开关使用；工作区仍需在会话标题旁手动开启 |
| `scenePresets` | 新增。模型 3 组（炽焰 / 余烬 / 封存，各带徽记与提示）、工作区 3 组（封存舱 / 余烬层 / 警戒层，各带明暗强调色与提示）。徽记由 `scripts/make-scene-badges.py` 生成 |
| `replyStyle` | 1.0 起默认启用，新会话沿用本套最近选择 |
| 基线 | 主包按 `1.0.0` 制作并校验；`dshVersions` 为 `0.2.2-rc.1` 与 `0.2.1-rc.5`（`0.2.1-rc.4` 无公开安装包，不声明） |

## 已知限制

- **基线是 dev.44+**：`cover` 需 dev.38+、`workspaceCues` 需 dev.44+。给 dev.35 用请换 `black-flame-0.1.1-dev35.zip`。
- 工作区暂无角色位：`workspaceRole` 仍要求两段 alpha WebM，本轮省略。
- 清单有 64 KiB 上限：109 项时 `skin.json` 已 62 KB，逐项 `license` 改用短串（完整许可写在 README 与台账）。再增加资源要先压缩清单。
- 6 态状态图、小操作反馈、待机装饰循环、事件提示音：引擎未接入，素材留档未进运行包。
- 语义图标实机命中率低（dev.35 实测仅输入区与文件类型图标），属引擎侧替换表覆盖问题。
- `send` / `stop` 用近白，前提是这两个按钮为强调色填充；若不是，需要换成中性色一对。
- 场景预设需要用户在「本套设置 → 场景」里把预设绑定到实际 provider/model 或工作区 ID，未绑定时不生效。

## 交付状态

macOS arm64 · DSH `0.2.2-rc.1` · 主题盒子 `1.0.0`：离线校验与真实 ZIP 导入通过，ZIP 摘要见打包输出。

素材包 v3.1 的开场音轨不可用（转立体声时字节序读错，整条是满量程噪声），0.1.0 基于该版；v3.6 已重做，0.1.1 起换新。0.2.0 按主题盒子 1.0 契约重出。详见 [review/self-check-2026-11-08.md](review/self-check-2026-11-08.md)。
