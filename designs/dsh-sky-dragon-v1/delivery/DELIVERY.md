# 决斗者 · 天空龙 · 上架交付说明

| 项 | 值 |
| --- | --- |
| 皮肤 ID | `duelist-sky-dragon` |
| 版本 | `1.0.7` |
| 文件 | `duelist-sky-dragon-1.0.7.zip` |
| 大小 | 5,537,165 字节（约 5.3 MB，110 条目） |
| SHA-256 | `41c1571aed42c90aa4b8b743d755bb627db1aed6c05f008bbfd5da792bc8eea2` |
| contentKey | `0a6550a66c7b25d28050a7a6ec2148979026228e27a44ec02f3a7129ce97513a` |
| 作者 / 署名 | Dr.S |
| 分发范围 | 可公开分发，公开上架 |
| 许可 | 包内 `LICENSE.md`；台账 `asset-register.csv` |

## 兼容

- DSH：`0.2.2-rc.1`（实测）
- 主题盒子：`1.0.0` 及以上（`cover` / `character` / `workspaceCues` / `scenePresets` 为 1.0 新增字段）
- 平台：Mac ARM64（实测）、Windows x64（离线校验通过，实机待验）
- 离线校验：`skin-author-check` 1.1.0-dev.3，darwin-arm64 与 win32-x64 均 `valid`

## 内容

- 主题：明暗各 61 个颜色变量、`commander-v1` 版式、聊天背景、50 枚题材化线性图标、入口徽记
- 开场：1280×720 H.264/AAC，10.08 秒，含同构图静帧
- 回复风格：称呼「决斗者」+ 语气设定
- 共用角色：亚图姆（身份 + 工作区补充）
- 场景提示：欢迎 / 切会话 / 切工作区 三条
- 场景预设：模型徽记「天空龙」；工作区强调色「决斗场」「千年」
- 卡片封面：960×600 WebP
- 工作区角色位：小头像 + 工作状态（1.1.0-dev.3 起的 avatar 合同，无需 WebM）

## 已知限制

- 独立面板（设置 / 技能 / 终端）的图标替换位由引擎侧逐页核对，本套暂未声明
- 插件页、设置页受颜色变量白名单限制（71/426），仍为宿主持有色
- Windows 实机验收由项目方安排


## 云端发布回执

| 项 | 值 |
| --- | --- |
| 发布 ID | `skin_fc3fa086-07e7-4731-8896-96eeb97498a6` |
| 版本 | 1.0.5 |
| SHA-256 | `41c1571aed42c90aa4b8b743d755bb627db1aed6c05f008bbfd5da792bc8eea2` |
| 字节数 | 5,409,200 |
| contentKey | `0a6550a66c7b25d28050a7a6ec2148979026228e27a44ec02f3a7129ce97513a` |
| 发布方式 | `node deploy/cloud-admin.mjs publish-skin`（1.1.0-dev.3 工具链） |

## 云端交付验收（2026-11-08）

| 项 | 结果 |
| --- | --- |
| 目录登记 | `stats` 查到 `duelist-sky-dragon@1.0.5`，SHA 与冻结包一致 |
| 客户端下载 | 已在真实主题盒子完成下载与安装 |
| 应用 | 已应用，`theme` 与 `startup` 均为 `ready` |
| 截图 | 浅色 `light-workspace.png`、深色 `dark-workspace.png`、对照 `light-dark-compare.png` 均已归档 |

## A02 明暗工作区稿

| 文件 | 内容 |
| --- | --- |
| `light-workspace.png` | 浅色工作区实机截图（3024×1712） |
| `dark-workspace.png` | 深色工作区实机截图（3024×1712） |
| `light-dark-compare.png` | 明暗上下对照 |

## 云端版本记录

| 版本 | sha256 前缀 | 状态 |
| --- | --- | --- |
| 1.0.4 | `b55f5252` | 首次发布；描述文案仍是旧的「私有二创」，**无用户下载/领用**，保留记录不清理 |
| 1.0.5 | `019a3de4` | 修正描述与署名；已下载安装验证 |
| 1.0.6 | `6783145e` | 新增工作区角色位（avatar 小头像） |
| 1.0.7 | `41c1571a` | 角色位补 name/model，去掉引擎默认占位名「机械姬」，当前版本 |
