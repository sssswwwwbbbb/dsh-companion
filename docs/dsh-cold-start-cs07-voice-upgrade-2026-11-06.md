# DSH「冷启动」CS-07 配音与去字幕升级回执

2026-11-06 · 首套皮肤 `commander-workspace-private` 0.4.0 → 0.5.0 → 0.5.1 · 插件 `dsh-plugin-companion` dev.40 → dev.41 → dev.42

本轮回执对应[首套接手说明](first-skin-agent-handoff-2026-11-06.md)的「先接入本次定稿素材」一项，只覆盖开场动画：CS-07 配音升级、去掉烧录台词字幕。桌宠、工作区、主题图标与已验收交互未改动。

## 本轮确认的三项决定

| 项 | 决定 |
| --- | --- |
| 改动落点 | 主控 dev.40 工作树 `~/.codex/worktrees/dsh-accepted-baseline/DSH 开机动画`（分支 `codex/dsh-accepted-baseline`），当前会话目录是 dev.11 旧基线，不含冷启动皮肤包 |
| 音色与混音 | 用交付的 `_wet`（舱内通信链处理版）原样置入，保留现有机械音效床与 0.52 压低量 |
| 字幕范围 | 只去掉烧录在片子里的台词字幕；`skin.json` 的 `subtitle` 保留，减少动态／视频失败时的静帧页仍有副标题 |

## 素材对照

| 内容 | 0.4.0（旧） | 0.5.0（新） |
| --- | --- | --- |
| 开场片 | `assets/startup/entrance-voice-b.mp4` | `assets/startup/entrance-cs07.mp4` |
| 片长／规格 | 12.50 s · 1280×720 · 24 fps · H.264 + AAC 48 kHz | 同左 |
| 人声 | 旧 B 声线四条（引擎压制后带入 12.5 s 混音） | CS-07 交付 `_wet` 四条：`01_awakening` / `02_release` / `03_vision` / `04_report` |
| 入点 | 0.35 / 2.80 / 7.48 / 9.15 s（引擎速度修正后 2.19 / 5.28 / 9.01 / 12.06 收尾） | 0.35 / 2.80 / 7.48 / 9.15 s，实际收尾 1.75 / 4.78 / 8.39 / 11.17 s（交付原长，无变速） |
| 混音 | 机械音效床 × 压低 + 旧人声 → -14 LUFS | 同一机械音效床（11.65 s 处尾部后移 0.5 s 的处理照旧）× 压低 + 新 `_wet` → -14 LUFS，峰值 -2.45 dBFS |
| 字幕 | 四条 `drawtext` 烧录，`y=h-54`，黑底白字 | 无烧录字幕 |
| 文件 | 5 970 115 B · sha256 `5704f18e…` | 5 917 211 B · sha256 `2c55787a535ab1e64c859099744c6b51aaf7e189c1b0e4ac830f8ef4eee7f6d6` |

交付的 `CS-07_timeline-preview_wet.wav` 与四条 `_wet` 按上表入点叠放**逐样本相同**（最大差 0.0），重渲染脚本直接用它作人声总线，并用这层等值关系做素材来源校验。

## 改动清单

皮肤内容（构建输入 `.local/accepted-inputs/skins/archive-workspace-r2-private/`，`packages/dsh-companion/skins/` 由此重新生成）：

- `skin.json`：版本 0.4.0 → 0.5.0；`assets.entrance-film` 路径、`sha256`、`bytes` 指向新片，来源与许可文字改为 CS-07 配音、无烧录字幕；`startup` 配置除资产外无变化（`seconds` 12.5、`handoffSeconds` 0.35、`stillSeconds` 1.2、`greeting`、`subtitle` 原样）。
- `assets/startup/entrance-cs07.mp4` 新增，`entrance-voice-b.mp4` 删除（旧片在素材线 `designs/dsh-skin-assets-v3/review/startup-entrance-01-voice-r3-2026-11-05/startup-entrance-01-four-lines-voice-b.mp4` 留有原件）。

内容键（皮肤内容摘要）：

- 旧 `3f86c237a24259a617753802eb22d16bd5e47f7e0657961780fa80fdab583c16`
- 新 `8e9284c97dd17cf8e24233492a6596893dc6473a296fee106c45227a65d9681f`

内容键变化牵动的四处，已同步：

| 文件 | 处理 |
| --- | --- |
| `packages/dsh-skin-core/src/host-compatibility.mjs` | `builtInSkins` 追加新键；旧键保留，回滚到 0.4.0 包时仍能在 DSH 0.2.2-rc.1 上受支持 |
| `packages/dsh-companion/config/reply-styles.json` | 新旧键各一条相同回复风格，旧键删除会让旧包失去"指挥官"称呼 |
| `runtime-src/pet-backend/skin.json` | 改为新键。`/backend/input` 会比对 `input.contentKey !== skin.contentKey`，不改会让桌宠点击互动被拒绝为 `SKIN_OPERATION_SUPERSEDED` |
| `runtime-src/pet-backend/dsh-pet/runtime/electron-helper/content-context.js` | 改为新键，与托管宿主标识一致 |

构建与版本：`package.json`、`packages/dsh-companion/package.json`、`runtime-src/package.json` → `0.1.0-dev.41`（`runtime-src` 的版本会写进 `runtime-events.json`，不同步会让 dev.41 的运行时自报 dev.40）；`CHANGELOG.md` 补 dev.41 两条。

## 重渲染与素材留痕

新增 `designs/dsh-skin-assets-v3/review/cold-start-voice-integration-2026-11-06/`：

- `render_entrance_cs07.py`：从 `assets/cinematic/source/entrance-01-source.mp4` 重编，画面滤镜只保留 `fps=24`、`tpad`、淡入、12.15 s 淡出，**删除四条 `drawtext`**；音轨为机械音效床 × 压低 + 交付 `_wet`，`loudnorm` 到 -14 LUFS 并做线性复核。
- `sound-scene-cs07-raw.wav` / `sound-scene-cs07.wav` / `entrance-cs07.mp4`
- `review.json`：片、音轨、来源片、音效床、声音总线的 sha256，四条入点与电平，以及对位／画面校验结果。
- `apply_upgrade.mjs`：把本次升级写成一次可复算的迁移（换片、改清单、补内容键、留痕），便于下次重建构建输入时重放。

## 校验结果

| 项 | 结果 |
| --- | --- |
| 画面：新片 vs 0.4.0 片 | 300 帧逐帧比较，字幕带外平均差 0.34（仅重编码噪声），全帧 PSNR 35.0 dB；字幕带内平均差 10.31，即烧录字幕被移除后的场景本身 |
| 画面：字幕 | 1.2 / 3.5 / 8.6 / 10.5 / 12.3 s 抽帧均无台词字幕，取景与人物无变化 |
| 音轨：入点 | 20 ms 包络检出 0.29 / 2.87 / 7.53 / 9.05 s，对应对位表 0.35 / 2.80 / 7.48 / 9.15 s（含字头起振与音效床底噪） |
| 音轨：音效床 | 与 0.4.0 片在纯音效段相关度 0.9999（5.4–7.2 s）、0.9996（0–0.3 s），未被新混音改动 |
| 音轨：电平 | -14.00 LUFS、峰值 -2.45 dBFS、0 削波；分段 RMS -17.7 / -18.1 / -17.3 / -22.2 dB（末段含交付要求的约 0.9 s 静场） |
| 时长对齐 | 12.50 s，与 `startup.seconds` 完全一致，通过播放入口的 `|duration - seconds| > .1` 检查 |
| 皮肤装载 | 包内 `loadSkin` + `prepareResources` 通过，128 项资源逐一校验；内容键 = 新键；`supportsSkinHost` 在 0.2.1-rc.5 与 0.2.2-rc.1 均为 true；旧键在 rc.1 仍为 true |
| 清单校验 | 合并运行配置后 `validateManifest` 通过（`entrance-film` 的 `video/mp4` 仅在 `startup.configVersion === 3` 且为该模块 `video` 时放行） |
| 仓库检查 | `node scripts/check.mjs` 通过；`node --test` 118 项全通过 |
| 包 | `dist/dsh-plugin-companion-0.1.0-dev.41.tgz` · 158 357 919 B · sha256 `314f702a64cac1f4300d72eea8bc7209e27905cd16ffeadd7001b143bfb07553` |
| 安装 | 桌面 profile 已覆盖安装 dev.41：`bridge.json` 报 `version 0.1.0-dev.41`、`skinProtocol 1`、`startupProtocol 1`；伴生应用从新 bundle `6ad0ae5d…` 重启；插件状态里已缓存 0.5.0 快照 `8e9284c9…` |

## 音量修正（0.5.1 / dev.42）

用户实机听过 0.5.0 后指出第四条「指挥官，我已就位」比前三条小。逐条实测确认这是交付缺陷：

| 文件 | 台词 | 积分响度 | 峰值 |
| --- | --- | --- | --- |
| `01_awakening_wet` | 开始唤醒。 | -15.5 LUFS | -3.0 dBFS |
| `02_release_wet` | 隔离解除，机体上线。 | -15.2 LUFS | -3.0 dBFS |
| `03_vision_wet` | 视觉同步。 | -13.7 LUFS | -3.0 dBFS |
| `04_report_wet` | 指挥官，我已就位。 | **-19.9 LUFS** | **-10.0 dBFS** |

第四条比前三条低 4.4–6.2 dB。交付说明写「RMS −20.4 dB，与前三条均值一致」，但前三条 RMS 是 −16.3 / −14.7 / −14.2，这条说明不成立——第四条本来就是单独低一档，0.5.0 按「`_wet` 原样置入」把它一起带进了片子。

处理：给第四条补 **+5.1 dB**（对齐前三条积分响度均值 −14.8 LUFS），其余三条不给增益；补后峰值 −4.9 dBFS，仍低于其他三条的 −3.0。整轨再归一一次到 -14 LUFS，与 0.4.0 已验片保持同一标准（因此前三条相对 0.5.0 净降约 1.4 dB，第四条净升约 3.7 dB）。

| 项 | 0.5.0 | 0.5.1 |
| --- | --- | --- |
| 片 sha256 | `2c55787a…` | `673fcabfa2d488183687cfd749ecde9581f4936bf38fbdcc18be556515f685f5` |
| 片大小 | 5 917 211 B | 5 917 663 B |
| 整轨 | -14.00 LUFS / -2.45 dBFS | -14.00 LUFS / -3.82 dBFS |
| 四条人声窗 RMS | 末段 -22.2 dB | -17.2 / -15.6 / -15.1 / -16.3 dB |
| 画面 | — | 视频流 md5 `d5ba110c…` 与 0.5.0 逐字节相同，只换了音轨 |
| 内容键 | `8e9284c9…` | `1f579f330a936860908e4b8c9d258d0379df60fa8c512cbd3e1e4cc97e8cd3b1` |
| 包 | dev.41 `314f702a…` | dev.42 `4a6731779e8bb8b8cc2474d7ae83a53403320da6c82c2c6d97cdb87ad95a42d0` |

白名单与回复风格现在累计三个键（`3f86c237…` 0.4.0、`8e9284c9…` 0.5.0、`1f579f33…` 0.5.1），桌宠后端指向 `1f579f33…`。dev.42 已覆盖安装，`bridge.json` 报 `version 0.1.0-dev.42`，伴生应用从 bundle `f16214ec…` 重启，0.5.1 快照已缓存。

## 实机验收（Mac）

| 项 | 值 |
| --- | --- |
| 平台 | macOS arm64 |
| 宿主 | DSH 0.2.2-rc.1（`runtime-events.json` 的 `host-attached` 记录） |
| 插件 | `dsh-plugin-companion` 0.1.0-dev.41（`bridge.json` version 一致） |
| 皮肤 | 冷启动 0.5.0，内容键 `8e9284c97dd17cf8e24233492a6596893dc6473a296fee106c45227a65d9681f`，generation 447 |
| 开场 | 从系统原 DSH 图标冷启动，17:50:18 `intro-start`（`cinematic: true`、`custom: true`）→ `intro-presented`（`media: 'video'`、`seconds: 12.5`、`assetSha256: 2c55787a…`、`muted: false`）→ 12.1667 s `intro-handoff` → `intro-complete`（`media-ended`，无 fallback） |
| 结论 | 用户确认「是新版」；随后指出第四条偏小，见上节音量修正 |

证据全部落在插件自己的运行记录里，可直接对照：`~/.dsh/companion/69b9e9023fdc4de9/runtime-events.json`。`muted: false` 说明这次冷启动是带声音播的（`startup.soundEnabled` 的覆写生效）；`intro-presented` 的 `assetSha256` 与皮肤 0.5.0 声明的 `2c55787a…` 完全一致，排除播到旧片或缓存片的可能。

## 未做

- **Windows**：本轮只重出 Mac 包（`package:mac`）。Windows 走 `experiments/dsh-windows-w0/build-runtime.py` 的重打包路径，需按同一皮肤内容与同样的键替换重出，实机仍待验。
- **0.5.1 复听**：音量修正后尚未重新冷启动确认；用户当前选择已切到另一套皮肤（0.1.5），要听 0.5.1 需在皮肤库里重新选「冷启动」。
- **桌面声线与桌宠音效**：本轮不动。桌宠点击声、回复音色、`smartEnabled` 等设置保持 0.4.0 行为。
- **提交与发布**：本轮改动仍在 `codex/dsh-accepted-baseline` 工作区未提交，是否提交、推送或发布按主控当轮范围执行。

## 回滚

- 皮肤：用 0.4.0 的 `archive-workspace-r2-private` 覆盖 `.local/accepted-inputs/skins/` 后重跑 `node scripts/build-client.mjs`；旧内容键与回复风格均保留，可直接切回。
- 插件：`dist/dsh-plugin-companion-0.1.0-dev.40.tgz` 仍在。
