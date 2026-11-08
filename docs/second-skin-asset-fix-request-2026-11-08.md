# 「烬角 · 黑焰」素材包 v3.1 · 素材侧修订需求

**致**：素材制作方
**提出方**：第二套皮肤「黑焰」制作（无桌宠版）
**日期**：2026-11-08
**对象**：`素材/DSH-烬角黑焰-皮肤素材包-v3.1.zip`（254 个文件，37.5 MB，第三轮交付）
**用途**：把已经能跑通的皮肤包 `black-flame 0.1.0` 做成可长期维护的素材版本。下面每条都带「位置 / 实测 / 应改成」，改完即可复用，不需要我们重做皮肤。

---

## 结论

| 类别 | 条数 | 说明 |
| --- | --- | --- |
| A 类 · 必须改 | 8 | 文档与实物矛盾、台账引用不存在的文件、格式列写错，会让下一个接手的人直接误判 |
| B 类 · 建议改 | 3 | 不改也能跑，但影响接入效率与体积 |
| 不属于素材侧 | 1 | `cover` / `workspaceCues` 的契约版本差，属项目侧文档 |

核对环境：macOS arm64 · Python 3.9 标准库 + `afinfo`/`file` 直读文件头 · DSH `0.2.2-rc.1` · 主题盒子 `0.1.0-dev.44`。

---

## A 类 · 必须改

### A1 交付对照把「开场正片」标成待生成，但文件已经在包里

- 位置：`review/交付对照.md` 第 19 行
- 现状：「`开场正片 H.264/AAC 5–12 s` — **待生成（需确认镜头方案）**」；同一文件第 34 行又写「正片片尾回到工作区画面 … 完成」。
- 实测：`exports/opening/opening-film.mp4` 存在，1280×720，H.264 + AAC，容器 11.245 s，7.96 MiB。
- 应改成：删掉「待生成」行，写「完成 · 11.245 s（正片 10.08 s + 工作区尾 1.17 s）」。

### A2 台账有一行指向不存在的文件，真正的成片没有台账行

- 位置：`review/素材台账.csv`
- 现状：有一行 `exports/opening/opening-film-10s_1280x720.mp4`（10.08 s），但**包里没有这个文件**。
- 实测：实际成片是 `exports/opening/opening-film.mp4`（11.245 s），台账里**没有它**。
- 应改成：删掉旧行，补上真文件的一行（1280×720、MP4 H.264/AAC、11.25 s、Alpha 否）。

### A3 台账里 14 条音频写「单声道」，实际全部是立体声

- 位置：`review/素材台账.csv` 的「格式」列
- 现状：14 条写 `WAV PCM 24-bit 单声道 48 kHz`，另 4 条写 `WAV 48k/24bit 立体声`，同一列两种口径。
- 实测：18 条 WAV 全部是 **2 声道**、48 kHz、24-bit（`wave` 读头确认；`source/README-工程说明.md` 也写了「单声道源复制到左右声道」）。
- 应改成：18 条统一写 `WAV PCM 24-bit 立体声 48 kHz`。

### A4 README 的音频表只列了 14 个文件，实际 18 条，且文件名是旧名

- 位置：`README-交付说明.md` 第四节「音频」
- 现状：表格 9 行、覆盖 14 个文件；文件名写 `voice-line-01_dry/_wet`。
- 实测：`exports/audio/` 有 **18 条**；实际文件名是 `VO-T01_dry.wav` 这类。
- 缺的 4 条：`sfx-power-on`、`sfx-scan`、`sfx-end-hit`、`VO-audition-T01`。
- 应改成：按实际 18 条重写，文件名与 `copy/台词表与时间码.csv` 的 `VO-T01…` 对齐。`review/交付对照.md` 第 21 行的 `voice-line-0{1,2,3}_{dry,wet}.wav` 同样要改成 `VO-T0{1,2,3}_{dry,wet}.wav`。

### A5 图标数量写「56 枚」，实际 55 枚（原因已定位）

- 位置：`README-交付说明.md` 第二节、`review/icons-contact-sheet-{light,dark}.png` 标题、`review/icons-contact-sheet` 相关说明
- 现状：写「56 枚功能图标 / 56 × 2」。
- 实测：`exports/icons/light`、`exports/icons/dark`、`source/icons/*.svg` 各 **55 个**。
- 根因：`source/icons/_generator/gen_icons.py` 声明 56 个功能位（NAV 12 + CHAT 12 + FILE 6 + STATUS 7 + SETTINGS 11 + DSH 8），其中 **`companion` 没有导出**，陪伴入口由 `entryMarks` 徽记承接，所以产物是 55 枚。
- 应改成（二选一）：
  - (a) 补导 `companion` 浅深两版 96×96 PNG，真正凑齐 56 枚（dev.35 的 `semanticIcons.companion` 可用）；
  - (b) 文档统一改成「55 枚功能图标 + 1 枚入口徽记」，并在 README 注明 `companion` 走 `entryMarks`。

### A6 基础文案写「单声道」，与实物不符

- 位置：`copy/基础文案.md` 第三节小标题「台词（48 kHz / 24-bit / 单声道）」
- 实测：同 A3，全部立体声。
- 应改成：`（48 kHz / 24-bit / 立体声）`。

### A7 三个时长并存，没有一处写清换算关系

- 位置：`copy/开场分镜.md`（标题「10.5 秒」）、`copy/基础文案.md`（时间点标「10.5s 版」）、`exports/opening/opening-film.mp4`
- 现状：分镜与混音按 **10.5 s** 写；成片音轨 **10.08 s**（AAC，含 priming，`afinfo` 计）；成片容器 **11.245 s**（`source/README-工程说明.md` 写「10 s 画面 + 追加 1.2 s 工作区尾帧」）。
- 台词入点 2.40 / 3.91 / 6.59 是相对 **10.5 s 混音**写的，但实际播放的是 11.245 s 成片。
- 应改成：在分镜开头写一行换算——「成片 11.245 s = 正片 10.08 s（10 s 生成画面 + 音轨裁切）+ 工作区尾 1.17 s」，并把台词入点标注为「相对成片起点」，同时说明成片音轨压自哪条母版。另外确认分镜 9.50–10.50 的「落版」在成片里是否完整（按 10.08 s 计会被截掉尾部 0.42 s）。

### A8 台账缺 21 个 exports/ 文件的记录

- 位置：`review/素材台账.csv`（现有 222 行）
- 实测缺失：

| 缺失文件 | 数量 |
| --- | --- |
| `exports/actions/states/action-*-96x96.png` | 16 |
| `exports/character/bust-1024x1024.png` | 1 |
| `exports/character/three-view_raw.png` | 1 |
| `exports/brand/idle-loop-still-512x512.png` | 1 |
| `exports/opening/opening-still.png` | 1 |
| `exports/opening/opening-film.mp4` | 1 |

- 应改成：按清单文档「台账每件一行」补齐这 21 行。顺带：`avatar-square-256x256.png` 与 `bust-1024x1024.png` 实际是 **RGB 无 Alpha**，补齐时 Alpha 列填「否」。

---

## B 类 · 建议改

### B1 图标只出了强调色一套，落在强调色按钮上会隐形

- 现状：50 枚全是强调色（浅 `#C0282E` / 深 `#FF6A3C`）。
- 原因：DSH 的工作区图标替换是 **CSS `background-image` + 子元素 `opacity:0`**，图标颜色由 PNG 自身决定，token 改不动；所以强调色图标落在强调色填充按钮（发送/停止）上等于红底红图。首套皮肤「冷启动」与「天空龙」都踩过。
- 我们本轮的处理：整枚重上色（保留 alpha），48 枚改中性色 `#5C423C` / `#D6BAAD`，`send` / `stop` 改近白 `#FFF8F2`。
- 建议：随包**再出一套中性色**浅深版本（例如 `exports/icons/{light,dark}-neutral/`），或在生成器里把 `LIGHT_COLOR` / `DARK_COLOR` 提成参数并附两套预设，避免每个接入方各自重画。

### B2 封面用 PNG，可以给一份 WebP

- 现状：`exports/backgrounds/cover-960x600.png` 688 KB。
- 契约：`cover` 自 dev.38 起支持 `image/webp`，上限 2 MiB。
- 建议：加一份 WebP（预计 100–150 KB），PDF/预览稿继续用 PNG。

### B3 成片音轨是单声道，与立体声分轨不一致

- 现状：`opening-film.mp4` 音轨 1 ch AAC 241 kbps；分轨与混音是 2 ch。
- 建议：用 `opening-mix-10.5.wav` 的立体声版重压一次 AAC（体积仍远低于 16 MiB 上限）。若有意压成单声道（省体积），在 README 写一句。

---

## 不属于素材侧（供项目侧记录）

- `cover` 需插件 dev.38+，`workspaceCues` 需 dev.44+，而 `docs/second-skin-developer-brief.md` 的验收基线写的是 dev.35。本套皮肤已按 dev.44 出主包，并另出 `black-flame-0.1.0-dev35.zip` 兼容包。

---

## 附 · 复核命令

```sh
unzip -l DSH-烬角黑焰-皮肤素材包-v3.1.zip | wc -l          # 254 个文件
ls 烬角-黑焰/exports/icons/light | wc -l                    # 55
ls 烬角-黑焰/exports/icons/dark  | wc -l                    # 55
ls 烬角-黑焰/source/icons/*.svg  | wc -l                    # 55
ls 烬角-黑焰/exports/audio/*.wav | wc -l                    # 18
afinfo 烬角-黑焰/exports/opening/opening-film.mp4           # 音轨 10.0785 s / 1 ch / 241 kbps
python3 - <<'PY'
import wave,glob
for f in sorted(glob.glob('烬角-黑焰/exports/audio/*.wav')):
    w=wave.open(f); print(f.split('/')[-1], w.getnchannels(), w.getframerate(), w.getsampwidth()*8)
PY
```

（成片容器时长可直接读 `moov/mvhd`：timescale 12288 → 11.2452 s。）

---

## v3.6 复核结果（2026-11-08 追加）

素材包已更新到 `DSH-烬角黑焰-皮肤素材包-v3.6.zip`（371 个文件），按本单逐条回填。复核结论：

### 已闭合（11/11）

| 编号 | 复核证据 |
| --- | --- |
| A1 | `review/交付对照.md` 第 26 行改为「完成 · 10.50 s（10.08 生成画面 + 0.42 落版补帧）」 |
| A2 | 台账重建为 314 行，旧的不存在文件行已删，`opening-film.mp4` 已入表（10.50 s、Alpha 否） |
| A3 | 18 条音频「格式」列统一为 `WAV PCM 24-bit 立体声 48 kHz` |
| A4 | `README` 音频表重写为 18 条，文件名与 `VO-T01…` 对齐，补入 `sfx-power-on`/`sfx-scan`/`sfx-end-hit`/`VO-audition-T01` |
| A5 | 图标补到 56 枚（新增 `companion` 浅深 PNG + SVG），「56 枚」名副其实 |
| A6 | `copy/基础文案.md` 台词段改为「48 kHz / 24-bit / 立体声」 |
| A7 | `README` 新增第五节「开场时长换算」；成片重做为 10.495 s，含「生成画面 10.079 s + 落版补帧 0.417 s」，无尾段 |
| A8 | 台账 314 行覆盖 `exports/` 每件（仅 1 处遗漏，见下） |
| B1 | 新增 `exports/icons/{light,dark}-neutral/` 各 56 枚，色值与建议一致（中性 `#5C423C`/`#D6BAAD`，`send`/`stop` 近白 `#FFF8F2`） |
| B2 | 新增 `exports/backgrounds/cover-960x600.webp`（59 KB，原 PNG 688 KB） |
| B3 | 成片音轨改为 AAC 立体声，`afinfo` 实测 2 ch / 48 kHz / 10.495 s |

另有两处素材侧自修（本单未提，但确实影响成片，已一并确认）：

- **v3.3**：上一版 18 条 WAV 在转立体声时按错字节序，整条变成满量程噪声（RMS −7.7 dB、峰值贴 ±1.0）。**基于 v3.1 的皮肤包 `black-flame 0.1.0` 的成片音轨因此不可用**，v3.6 已全部重做。
- **v3.4**：旧台词是「机械姬 / 合成少女」口径，与角族少女设定不符；台词、`_wet` 处理链、入点、人设一并重做（新台词：封印碎了。／火……我只有火记得我。／手给我。火认得你。）。

### 残留 3 项（不影响运行，建议顺手改）

| 编号 | 位置 | 现状 | 应改成 |
| --- | --- | --- | --- |
| R1 | `copy/基础文案.md` 台词表表头 | 「入点（相对成片起点，**成片 11.66 s**；混音母版 10.50 s）」 | 成片 **10.50 s**（README 第五节与分镜开头都已是 10.50） |
| R2 | 台账 / README / 分镜 | 台账 314 行没有 `exports/audio/opening-mix-13.0.wav`；README、分镜均未说明这条 13.0 s 母版用途 | 补台账一行；并在 README 写清它给哪个版本用（成片目前只用 `opening-mix-10.5.wav`） |
| R3 | `copy/基础文案.md` | 副标题仍是「封存体解除 · **单元**苏醒」，世界观有「不该再被点亮的单元」；而 v3.4 声明已清除「单元 / 本单元」机号口径 | 二选一：改成不带机号的说法，或在 README 注明「副标题/世界观为旁白口径，允许用『单元』」 |

R3 我们暂按文案原样使用（`startup.subtitle` = 封存体解除 · 单元苏醒）；若改成新说法，我们同步换一版小样即可。
