# 冷启动 · commander-workspace-private 1.0.0 正式交付说明

冻结包：`commander-workspace-private-1.0.0.zip`
SHA-256：`ea112a57b5acd0f3ca1121d11b366e4e147dc77fa03dfd2b505ca54ec9b586fd`
大小：9994285 字节
内容键：`294ce7618878113c7b8ffc627e286b9a741c2e32af9811f4a480963d6eef7ff8`
作者：**Dr.S**（笔名）
授权：**独占分发** —— 仅作者 Dr.S 本人可分发；他人经作者授权、通过正式渠道获取后使用；禁止转载、转发、镜像、二次分发、打包出售或再授权。
目标宿主：DSH 0.2.1-rc.5 / 0.2.2-rc.1；主题盒子 1.0 合同（工具候选 1.1.0-dev.3）
平台：Mac ARM64 / Windows x64（结构校验通过，Windows 实机未验）

## 包内容

- `skin.json`（51 KB，未超过 64 KB 上限）
- `LICENSE.txt`、`CREDITS.md`（随包分发，加载器会忽略这两个文件）
- 125 项资源：56 组语义图标（112 张）、开场 MP4 + 静帧、角色母版/头像、设计封面、入口徽记、三枚模型徽记

模块：`theme` + `startup`（无桌宠）。

- 主题：钢青/警示琥珀色板，commander-v1 版式
- 开场：12.50 s H.264/AAC MP4，CS-07 声线，无烧录字幕
- 场景提示：回归 5 s 上方滑入（琥珀）、切会话 2 s 右上方淡入（钢青）、切工作区 3 s 右上角滑入（全息青）
- 角色：单元-07（仅工作区侧）；回复风格「指挥官」
- 场景预设：工作区配色三组、模型徽记三组

## 本次修正

0.9.6 的开场默认静音（继承已验收 0.4.0 的保守默认 `soundEnabled: false`），用户从云端下载后开场无声音。0.9.7 把 `modules.startup.settings.soundEnabled.default` 改为 `true`；想静音的仍可在「本套设置」里关闭。

## 署名与授权字段

manifest 没有顶层 author/license 字段，署名与授权写在**每项资源的 `source` / `license`** 上（受 64 KB manifest 上限约束，用了统一短句）：

- `source`：`Dr.S · 图标 · plugin · 浅` 这类
- `license`：`© 2026 Dr.S · 仅作者本人可分发，他人经授权使用，禁转载转售`

完整条款见包内 `LICENSE.txt`，素材来源见 `CREDITS.md`。

## 校验

离线校验器（工具包同版）：0.2.2-rc.1 与 0.2.1-rc.5 × darwin-arm64 与 win32-x64 四种组合 `valid: true`，theme/startup 均 enabled。
服务端预检 `readSkinPackage` 与导入模拟 `withSkinArchive` 均通过；包内额外文件不影响导入。

## 上架状态：已发布（2026-11-08）

| 项 | 值 |
| --- | --- |
| releaseId | `skin_ca0cb247-0e5b-4cc4-a93f-c1fc1e8c1f44` |
| id / version | `commander-workspace-private` / `1.0.0` |
| sha256 | `ea112a57b5acd0f3ca1121d11b366e4e147dc77fa03dfd2b505ca54ec9b586fd`（与本地冻结包一致） |
| contentKey | `294ce761…`（一致） |
| size | 9 993 908 B（一致） |
| supportedDsh | 0.2.1-rc.5 / 0.2.2-rc.1 |
| 发布方式 | `deploy/cloud-admin.mjs publish-skin`，服务端登记并写 audit |

1.0.0 已由用户从云端下载、安装并应用；本地内容快照 125 项哈希全对。开场声音在 0.9.7 已验证 `muted:false`，1.0.0 待一次冷启动或「预览开场」复验。剩余一步是**真实客户端验收**：在已激活的主题盒子刷新皮肤库 → 下载 → 安装 → 应用，确认名称、封面、模块、兼容范围与版本正确。

下载会按激活码累计已领取的 skin id 计数；同一套的新版与重装免费重下。
