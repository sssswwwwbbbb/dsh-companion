# 第二套皮肤「决斗者 · 天空龙」开工前置条件评估

2026-11-06。对象：`素材/DSH-神之召唤-天空龙皮肤包-v1.0.zip`（372 个文件，92 MB）与已验收的 Mac 参考环境（DSH `0.2.2-rc.1` + 陪伴 `0.1.0-dev.27`）。本文件只做前置核对，不含皮肤实现。

## 结论

- **环境成熟**：DSH 与插件已装、已授权、已应用「冷启动」，导入 / 应用 / 预览 / 切回的通道都在。
- **素材技术上可用**：按无桌宠版最小范围组出的候选清单（107 项资源、4.97 MiB）已用 dev.27 的真实校验器跑通。
- **契约要对齐 4 处**：MP4 只在 `startup` 配置 v3 下合法；`entryMarkEnabled` 必须配 `entryMarks`；`workspacePreset` 只有两个写死的版式；`workspaceRole` 的 `idle`/`react` 只收 WebM。
- **素材里有一批没有消费方**：6 态状态图、3 个小操作图标、工作区待机循环、8 条音效与 BGM，当前引擎没有挂点。
- **一处验收缺口**：`exports/key-art/*-key-art.png` 是「假 DSH」模拟图（窗口写着 DSP、侧栏是卡组/手牌/回合），不能当作 A 阶段的「工作区一屏稿」。
- **一处必须先定**：素材包自述为粉丝二创、仅限本人本地使用，不可分发、不可商用。这与交付说明第 7 节和路线图 P4 的开放上传不相容。

## 一、已具备的条件

| 项 | 实测 | 结论 |
| --- | --- | --- |
| 宿主 | `/Applications/DeepSeek Harness.app` `0.2.2-rc.1` | 在 `engines.dsh` 允许范围内 |
| 插件 | `~/.dsh/profiles/desktop/node_modules/dsh-plugin-companion` = `0.1.0-dev.27` | 与验收基线一致 |
| 授权 | `license.json` 永久授权，entitlements 含 `companion` / `startup` / `configuration` / `private-updates` | 开场与皮肤功能可跑 |
| 当前皮肤 | `commander-workspace-private` 0.4.0「冷启动」已应用 | A→B→A 互切有基线 |
| 导入通道 | `skinInstall`（皮肤库 → 安装本地皮肤）→ 校验 manifest、资源头、sha256、字节数 | 可交付 ZIP 直装 |
| 开场执行器 | `darwin-arm64` 原生，支持 MP4 + 音轨、`handoffSeconds` / `stillSeconds`、静音与减少动态 | 10 秒片可跑 |
| 校验器 | `dist/dsh-plugin-companion-0.1.0-dev.27.tgz` 内的 `skin-core` | 可离线验清单与资源 |
| 素材规格 | 图片全部 ≤ 8 MiB；片 1280×720 H.264 + AAC，2.89 MiB；WAV 48 kHz / 24-bit | 在限额内 |

### 已跑通的候选清单

用包内素材组了一份无桌宠版最小清单并本地校验：**107 项资源、4.97 MiB、`contentKey` 6d7f7b47…**，`loadSkin` 与 `prepareResources` 均通过。范围是：聊天背景（WebP）、开场静帧、开场片、入口标识浅深各一、51 对语义图标、`theme` 配置 v3（commander-v1 版式）、`startup` 配置 v3。这说明 B 阶段「可运行小样」当天就能出。

## 二、素材包与引擎契约的对照

| # | 现状 | 引擎实际 | 处理 |
| --- | --- | --- | --- |
| 1 | 开场片实测 10.080 s（含配音）/ 10.042 s（静音版） | 播放前比对 `|duration − seconds| ≤ 0.1`，不符就回落静帧 | `seconds` 填 `10.08`；不要填 `10` 擦线 |
| 2 | 全包没有 WebM | MP4 仅在 `startup` v3 的 `video` 位置合法；`workspaceRole.idle/react` 与 `pet` 只收 `video/webm` | 开场没问题；角色位做不了 |
| 3 | 56 枚图标 | 工作区有 50 个语义替换位；`companion` 另有侧栏入口用途 | `history` / `bookmark` / `quote` / `volume` / `mute` 无位置；实际可用 51 枚 |
| 4 | 包里有 96×96 入口标识浅深两版 | 声明 `entryMarkEnabled` 必须同时给 `entryMarks`；但侧栏标识优先取 `semanticIcons.companion` | 保留 `companion` 就不要再声明 `entryMarks`，否则该项设置点了不生效 |
| 5 | 无版式稿 | `workspacePreset` 只认 `archive-warm-r2`（衬线纸质）与 `commander-v1`（无衬线、全 token 驱动） | 只能二选一，或请引擎加第三套 |
| 6 | 有头像与静帧 | `workspaceRole` 要求 poster / portrait / avatar 三张 PNG + idle / react 两段 WebM | 本轮建议不做，或先补转码手段 |
| 7 | 6 态 × 浅深状态图、3 个小操作图标、待机循环规格 | 工作反馈只有 12px 文案 + 三点动效，没有图标位 | 记为「未接入」，单列引擎需求 |
| 8 | 8 条音效 + BGM + 分轨 | 除开场成片音轨外无播放通道 | 只进素材台账 |
| 9 | `exports/icons/overview-56-*.png` 是旧卡牌版拼版 | 与 `icons-index.csv` 的新线性图标不是同一套 | 交付时移除或重出，避免误认 |
| 10 | `light/dark-key-art.png` 是假 App 模拟图 | A 阶段要「接近实际 DSH 窗口比例」的工作区稿 | 色板可用；一屏稿需在真实 DSH 上重做 |
| 11 | `moon` 画成 C 形；`settings` 齿轮与 `sun` 在 16 px 下接近 | 验收要求浅深、设置与主题一眼分开 | 建议返工这 2 枚 |

补充：背景建议用包里的 `chat-bg-1440x900.webp`（213 KB）而不是 PNG（2 MB），叠到页面里的开销小得多。

## 三、授权与交付边界

素材包 `licenses/license-record.md` 写明：粉丝二创，原始 IP 属《游戏王》权利方，仅限委托制作本人个人本地使用，禁止分享、公开、商业与随产品分发；配音为原创改写台词与合成音色，未用官方音频；字体均为系统或开源可商用字体。

这与交付说明第 7 节「素材许可」以及路线图 P4「开放制作与上传」不相容。本套只能按**私有自用**处理：ZIP 内附授权记录，不入公开皮肤库、不上架、不做公开演示。若将来要公开，题材与角色需原创化或取得授权。

## 四、工程侧前置

- 当前工作树 `main` 是 **dev.11**（资源 ≤ 32 项、`startup` 只认 WebM 配置 v1、`theme` 只到配置 v2），与已验收的 dev.27 不一致。dev.27 的源码在分支 `codex/dsh-accepted-baseline`。
- 照 `main` 的校验器开发，这份素材包会被直接拒绝（项数超限、MP4 不合法）。开工前应切到 baseline 分支或把 `main` 同步到 dev.27。
- 本机没有 `ffmpeg` 命令行，`imageio-ffmpeg` 也未安装。转码、抽帧、编码 alpha WebM 目前都做不了；要做角色位或复核影片需先补。

## 五、开工前需要拍板

1. 交付范围：私有自用（符合素材授权），还是打算公开或分发？
2. 皮肤身份：名称用「决斗者 · 天空龙」还是素材包的「神之召唤 — 奥西里斯的天空龙」；`id` 建议 `duelist-sky-dragon`；开场问候与副标题、用户称呼「决斗者」。
3. 版式：`commander-v1`（无衬线、token 驱动，推荐）或 `archive-warm-r2`（衬线纸质），还是请引擎加第三套。
4. 工作区角色位：不做（色彩 + 图标 + 开场，最稳），还是补两段 alpha WebM（需先补转码工具）。
5. 状态、小操作、待机、音效：本轮记为「未接入」并单列一条引擎接入需求？
6. 目标平台：只 Mac（开场与角色位为 darwin-arm64 原生），还是也要 Windows（只能主题与图标）。
