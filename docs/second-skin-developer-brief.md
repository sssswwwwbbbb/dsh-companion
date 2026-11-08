# DSH 第二套皮肤开发说明

> 2026-11-08 最新版开发说明与素材清单见 [主题盒子 1.0 交接包](skin-kit-v1/README.md)。下文保留旧制作记录，版本与能力以最新版为准。


## 1. 项目目标

为 DeepSeek Harness（DSH）制作一套原创桌面主题。开场、工作区和所选模块共享同一套视觉与语言。带桌宠版让同一角色继续出现在桌面，无桌宠版以工作区和开场为完整体验。用户在长时间工作时应能顺畅浏览目录、阅读对话和输入。

角色、题材、主题名称和色彩先由开发者提案，再与项目方确认。科幻、赛博、动漫和二次元立绘是可用方向。已验收的「冷启动」可用于观察成套体验和换肤对照。新的角色与素材由作者独立设计或取得相应许可。

首轮交付目标是 **一个通过「主题盒子 → 皮肤库」导入并可运行的皮肤 ZIP**。dev.27 与 dev.31 的侧栏仍显示「陪伴」。开工先确认带桌宠或无桌宠，使用对应素材清单。[带桌宠版清单](second-skin-materials-with-pet.md) · [无桌宠版清单](second-skin-materials-without-pet.md)

| 环境 | 使用方式 |
| --- | --- |
| Apple 芯片 Mac · 官方 DSH `0.2.2-rc.1` · 主题盒子 `0.1.0-dev.35` | 第二套皮肤制作与自测基线。开发者记录实际测试的 DSH 和插件版本。 |
| Windows x64 · 官方 DSH `0.2.2-rc.1` · 主题盒子 `0.1.0-dev.35` | Windows 开场验收基线。主线准备安装包、步骤和回执，计划沿用项目方已用于 dev.35 验收的测试机。 |

项目方交付说明、素材清单、对应平台的插件 `.tgz`、单独提供的测试授权及 dev.35 制作工具包。工具包含 `SKIN-AUTHOR-REFERENCE.md`、离线校验、71 个颜色键与无桌宠 v3 样例。源码基线为 `codex/dsh-accepted-baseline` 的 `77730c2`。

第二套无桌宠小样可以复用 `commander-v1`，使用自己的配色、语义图标、静态背景和入口徽记。清单只声明 `theme` v3 与 `startup` v3。使用 `entryMarks` 和 `entryMarkEnabled`，省略 `semanticIcons.companion`。开场交一份有声 H.264/AAC MP4 及对应 PNG/WebP 静帧。播放器根据 `soundEnabled` 控制声音。用实测容器时长填 `seconds`，偏差超过 0.1 秒回退静帧。

## 2. 工作范围

| 模块 | 首轮必须完成 | 可选增强 |
| --- | --- | --- |
| 工作区主题 | 深浅两套颜色，覆盖常用侧栏、会话、正文、选中状态和输入区域。在真实 DSH 看代码块、表格和弱文字 | 低强度聊天背景、现有适配器支持的入口标识、成套语义图标和角色头像 |
| 桌宠（带桌宠版） | 透明待机和一次简短回应，保持相同角色、脚点和人物比例。角色大小可配置 | 复用已支持的动作或工作状态呼应，新增行为另提交接入需求 |
| 开场 | 同角色静帧与一段短成片，手动预览、跳过、自然回到工作区 | 开场音轨和减少动态设置。原图标冷启动在目标宿主实机验收 |
| 皮肤设置 | 每个公开项提供本套默认值。设置有清楚的标签，配置按皮肤保存 | 在已有设置页支持的字段中选择与主题有关的配置 |
| 交付 | 可导入 ZIP、源文件、素材清单及许可、验收结果 | 展示用封面、演示短片、可选玩法设计说明 |

制作方负责视觉、素材、声明配置、打包和自测。项目方负责插件、宿主适配、授权、原生运行时和最终验收。任意 CSS、JS、外部壁纸工程、自定义窗口布局、工作助手共享人设、模型切换换形象和新的事件来源目前属于引擎接入需求。首套专用封面、角色条、高精度桌宠命中和左走转正也有专用集成。复用预设名或动作名后，仍以第二套真实运行的结果确认覆盖。

如遇能力缺口，交一条可验证的需求，包含预期画面、触发时机、测试素材、当前结果和可接受的简化做法。引擎确认支持后再把增强效果写进最终交付范围。

## 3. 先做小样，再补全素材

角色原画、界面、动效、配音、声音设计及文案使用独立的[全量素材清单与委托单](second-skin-art-brief.md)。开发者接收运行成品和素材台账，按资源 ID 录入配置。需要接入后续能力时，按[功能与素材对照](second-skin-art-brief.md#4-后续功能与素材对照)核对触发、反馈和资源，确认后再批量制作。

主题若有工作区回复风格，先在素材包交默认语气、称呼、详略和示例问答。后续由引擎提供设置和实际对话接入。拟用于自主陪伴的动作由本套角色与世界观决定，另交动作目录，记录语义、素材 ID、姿态和衔接，供模型选择能力接入。当前 ZIP 样例继续沿用已验证的字段。

| 阶段 | 请提交 | 项目方验收 |
| --- | --- | --- |
| A 概念 | 一页主题提案，角色母版，深浅色板，工作区一屏稿，开场首尾和待机/回应姿态 | 角色辨识度、工作区可读性、桌宠位置及素材来源 |
| B 可运行小样 | 初版 `skin.json`、精简素材和 ZIP。先用配色跑通导入，再接角色和开场 | 真机里能导入并应用，主题、桌宠和预览可实际看到，可切回「冷启动」 |
| C 正式交付 | 定稿 ZIP、可编辑源文件、素材和许可台账、测试记录、安装说明 | 按第 7 节操作验收，标记通过范围和待适配项 |

### 素材清单

| 素材 | 规格与制作要点 |
| --- | --- |
| 角色母版 | 交全身正面源稿。标出发色、瞳色、轮廓、服装、身份标识和用户称呼。开场、头像和桌宠共用同一组识别点 |
| 工作区色板 | 深浅分别给背景、表面、正文、弱文字、边框、选中、警告和成功。提交真实比例的工作区稿，保留代码和输入等长时间使用区域的可读性 |
| 静态背景 | 可选 PNG、JPEG、WebP。选留白明显的画面，先用低透明度放进真实对话看效果 |
| 入口和语义图标 | 可选透明 PNG，明暗分别导出。明确资源对应的既有语义 ID。可从 96×96 母版制作，按真实小尺寸检查 |
| 桌宠待机 | 有真实 Alpha 的 WebM。先做约 2–4 秒，可循环。首帧清楚，前后亮度和脚点一致。交角色地面基准与画布尺寸 |
| 桌宠回应 | 透明 WebM，建议约 1–2 秒，单次播放。和待机保持人物尺寸、落地位置与边缘质量，片尾能平稳回待机 |
| 开场静帧 | PNG，建议 1280×720，使用同角色，可作为减少动态时的替代画面 |
| 开场成片 | WebM 或受支持的 MP4，建议 16:9、5–12 秒。MP4 可先用 H.264 / AAC 导出，再在目标 DSH 验解码和实际片尾。开场音轨混入成片，另交可编辑分轨 |
| 封面与文案 | 可选 16:10 封面作交付展示，附皮肤名称、角色名称、用户称呼、开场与回应文案。自定义皮肤卡片封面需项目方确认接入 |
| 素材台账 | 每件记录文件、用途、尺寸、时长、透明度、来源、作者、许可、署名要求及分发范围。交付可编辑源文件和运行成品，按许可区分可公开与仅本项目使用的部分 |

透明视频在浅底、深底和真实桌面检查黑边、亮边、残影和抖动。角色在工作区左下角或侧栏出现时，应保证目录和会话仍可点击。长时间工作时以安静待机为默认，需要注意时才使用较明显的反馈。

## 4. 配置接口

运行包为 ZIP，`skin.json` 位于包根。文件用英文相对路径并使用 `/`，资源在 `assets` 里登记，模块用资源 ID 引用。包格式 `formatVersion: 2`。皮肤 ID 以小写字母开头，后续可用小写字母、数字、连字符，共 3–64 字符。每次交付记录 `X.Y.Z` 版本，并明确列出实测过的 `dshVersions`。同一套迭代沿用 ID。

每个模块都有 `interfaceVersion`、`configVersion`、`required`、`config`、`settings`。接口版本统一为 1。模块的 `required` 为 `true` 时，缺能力或应用失败会阻止整套提交。小样可先将所选桌宠和开场设为可选以便诊断。交付时在约定环境实测所选模块。无桌宠版的清单直接省略 `pet` 模块及其专用资源，设置页随之隐藏桌宠配置。

| 模块 | 推荐起点 | 要点 |
| --- | --- | --- |
| `theme` | 配置 v1 | `tokens` 写明暗语义颜色。可用 `background` 引用图片，`backgroundOpacity` 范围 0–0.15。入口标识、工作反馈见 v2，已有布局预设及语义图标见 v3，先核对适配器实际消费的字段 |
| `pet` | 配置 v2 | `builtinPack` 使用安装包已有的 `whale-maid-demo`。本套通过 `animations` 提供 `idle` 和 `react`，各填 `asset`、`seconds`、`loop`。动作媒体为 WebM，时长 0.1–60 秒，`size` 范围 70–140。只交基础动作时保持自主行为和跟随鼠标关闭 |
| `startup` | 配置 v3 | 写 `poster`、`video`、`seconds`、`handoffSeconds`、`stillSeconds`、`greeting`、`subtitle`。影片 1–15 秒，交接 0.1–1 秒且短于影片，静帧 1–15 秒且不长于影片。MP4 仅用于此版本的开场影片 |

`config` 放固定值和素材引用，`settings` 放当前皮肤开放的字段。每个公开字段都要有 `label` 和合法 `default`。同一字段在固定配置和可调配置中只写一次。宿主设置页支持的公开项会显示，未声明的项隐藏。请实测设置是否出现在相应页面。

### 最小配色小样

用下面这份清单先检查导入和应用，名称与配色只是占位。

```json
{
  "formatVersion": 2,
  "id": "second-skin-demo",
  "version": "0.1.0",
  "name": "第二套皮肤小样",
  "dshVersions": ["0.2.2-rc.1"],
  "assets": {},
  "modules": {
    "theme": {
      "interfaceVersion": 1,
      "configVersion": 1,
      "required": true,
      "config": {
        "tokens": {
          "--dsw-alias-bg-base": { "light": "#edf0f4", "dark": "#111a2a" },
          "--dsw-alias-label-primary": { "light": "#17293b", "dark": "#e5edf7" }
        }
      },
      "settings": {}
    }
  }
}
```

### 加入桌宠与开场

在 `modules` 里保留 `theme`，带桌宠版合入以下两项，无桌宠版只合入 `startup`。时长改为成品实测值。

```json
{
  "pet": {
    "interfaceVersion": 1,
    "configVersion": 2,
    "required": false,
    "config": {
      "builtinPack": "whale-maid-demo",
      "canvasHeight": 195,
      "animations": {
        "idle": { "asset": "role-idle", "seconds": 2.5, "loop": true },
        "react": { "asset": "role-react", "seconds": 1.5, "loop": false }
      }
    },
    "settings": {
      "size": { "label": "角色大小", "default": 100 }
    }
  },
  "startup": {
    "interfaceVersion": 1,
    "configVersion": 3,
    "required": false,
    "config": {
      "poster": "opening-still",
      "video": "opening-film",
      "seconds": 8,
      "handoffSeconds": 0.35,
      "stillSeconds": 1.2,
      "greeting": "今天也准备好了",
      "subtitle": "进入工作区"
    },
    "settings": {
      "soundEnabled": { "label": "开场声音", "default": false },
      "reducedMotion": { "label": "减少开场动态", "default": false }
    }
  }
}
```

把以下资源登记写到 `skin.json` 的 `assets` 中，文件名和格式按实物调整。下节脚本在出包时填入必需的 `bytes` 和 `sha256`。

```json
{
  "role-idle": { "path": "assets/role-idle.webm", "mime": "video/webm", "alpha": true },
  "role-react": { "path": "assets/role-react.webm", "mime": "video/webm", "alpha": true },
  "opening-still": { "path": "assets/opening-still.png", "mime": "image/png" },
  "opening-film": { "path": "assets/opening-film.mp4", "mime": "video/mp4" }
}
```

## 5. 打包

源项目建议分成 `skin/`、`source/`、`review/`。运行清单及成品放在 `skin/`，源工程和评审材料放在包外。资源最多 128 项，单张图最多 8 MiB，单段视频最多 16 MiB，全部声明资源最多 128 MiB。每项在最终清单须有实际字节数和 64 位小写 SHA-256 摘要。

把下例存为 `pack_skin.py` 并运行 `python3 pack_skin.py skin second-skin-0.1.0.zip`。Windows 也可用 `py -3` 运行打包脚本。脚本读取作者文件并生成 ZIP 内的最终清单，原文件保留作为可编辑版本。

```python
import hashlib
import json
import sys
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

root = Path(sys.argv[1]).resolve()
output = Path(sys.argv[2])
manifest = json.loads((root / "skin.json").read_text(encoding="utf-8"))
files = {}
for asset in manifest["assets"].values():
    relative = asset["path"]
    source = (root / relative).resolve()
    if not source.is_relative_to(root) or relative == "skin.json":
        raise ValueError(f"Invalid asset path: {relative}")
    data = source.read_bytes()
    asset["bytes"] = len(data)
    asset["sha256"] = hashlib.sha256(data).hexdigest()
    files[relative] = data

with ZipFile(output, "x", compression=ZIP_DEFLATED) as archive:
    archive.writestr("skin.json", json.dumps(manifest, ensure_ascii=False).encode("utf-8"))
    for relative, data in files.items():
        archive.writestr(relative, data)

print(hashlib.sha256(output.read_bytes()).hexdigest(), output)
```

脚本使用 Python 3.9+ 标准库。可用 `python3 -m zipfile -t second-skin-0.1.0.zip` 检查 ZIP 完整性。资源引用、配置范围和宿主兼容由 DSH 插件实际导入和应用来确认。

## 6. 在 DSH 安装小样

1. 在测试 DSH 通过「插件 → 添加插件」安装并启用项目方提供的测试插件，按约定授权。插件安装包为 `.tgz`。
2. 打开「主题盒子 → 皮肤库 → 安装本地皮肤」，选择作者产出的 `.zip`。入库后再点该皮肤卡片应用。
3. 在「本套设置」核对默认值，预览开场并试 Esc。带桌宠版调整一次大小，无桌宠版确认页面只显示主题和开场等已声明的设置。改用深色再重复查看主题。
4. 换回「冷启动」，再切回第二套，核对各套配置独立保留。在允许测试的环境可开自动播放，完全退出 DSH 后点原图标验证冷启动。
5. 遇到问题提交 DSH 与插件版本、皮肤 ID 和版本、ZIP 摘要、操作步骤与截图。附最小复现包或涉事资源。交付包只放该皮肤的成品、清单和约定的许可说明，授权凭据及机器配置保存在各自测试环境。

## 7. 最终验收

- 深浅模式下，工作区主题清晰可用。目录、正文、代码、输入和常用控件能继续工作。
- 开场与工作区的角色或场景视觉保持统一。带桌宠版再核对桌面形象、透明边缘、回应后回待机和调节大小。角色活动、鼠标穿透和精确命中以该包实际支持的行为验收。
- 预览自然结束与 Esc 跳过都回到同一工作区。打开静音或减少动态后的表现符合配置。原图标冷启动另留实测结果。
- 皮肤 A → B → A 互切，设置分别保存，停用后旧样式、媒体和桌宠正常退出。
- 交付包括 ZIP 和摘要、可编辑工程及成品、素材许可、实机截图或短录屏、已知限制。只将真实跑通的模块记作通过，未接入的增强项在交付表里单列。
