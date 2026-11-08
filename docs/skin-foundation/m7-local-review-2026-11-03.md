# M7 首套内置与日常入口：本地评审交接

2026-11-03，模块线实施/隔离验证。M6及F1已由主控验收，原103文件身份为`d21a386180042d83b12aab325cbe0e3f69bd5bd950329ecd677c433ad8e77e3f`。M7当前交主控最终验收，未定正式版本、安装或发布。

## 当前本地交付

可运行开发目录为`packages/dsh-companion/`，本地Mac原生组件为其`runtime/darwin-arm64/DSHCompanion.app`。插件版本仍0.1.0-dev.11，目标DSH 0.2.1-rc.5/Mac ARM64。评审构建及文件摘要见`reports/skin-foundation-m7-2026-11-03/local-review-build.json`，源码身份另见同目录source-manifest.json。

已审设计源`designs/dsh-skin-v1/content/archive-warm-whale-startup-m6-ready/`是唯一参数输入。build-client在校验已审摘要和资源后，将其同步到普通插件目录`skins/archive-warm-whale/`；运行时不读取设计目录。0.7.1准确contentKey仍为`4b643de142bb2770340cd56d7c2acd5bced3b09a69ddbf27cd3025d29639620b`，5资源、8项默认不变，没有手工维护第二套参数。

构建/只读复核命令：

```sh
node scripts/build-client.mjs
node scripts/check.mjs
node scripts/build-mac.mjs
node packages/dsh-skin-core/scripts/check.mjs packages/dsh-companion/skins/archive-warm-whale
```

以上生成/核对本地目录和开发签名app。package.files已包含skins，npm pack仅执行`--dry-run --ignore-scripts --json`，确认7个内置文件会被包含；记录在package-dry-run.json。dry-run不是安装归档，没有为M7生成或发布新的tgz，也不以旧runtime-bundles归档代替本轮开发app。真实安装、上传/分发、正式签名/版本继续是后续事项。

## 同一个日常入口

- 普通内置首套在皮肤页优先显示；A/B技术样例保留、默认折叠，旧无皮肤配置入口不删除。
- 开场卡片就近提供原replayIntro和原startupEnabled偏好。模块“启用本套开场内容”与“启动时自动播放”含义仍分开；手动预览不修改自动偏好。停止后有明确“恢复本套皮肤”，继续使用原skinSelect主动恢复并保留参数/模块关闭选择。
- 已选整套时，开始使用页展示本套名称/版本和“前往皮肤设置”，不再显示旧配置编辑或旧启动桌宠按钮；旧控制页也指向皮肤设置。无整套选择时保留原流程。
- 固定旧角色署名不再作为新皮肤统一来源，footer显示当前名称/版本并指向本套随附说明。没有增加来源管理、制作器、上传或市场。

皮肤settings的enabled与执行results的ready是两个字段；新预览控件检查两者以及stopped，未新建状态。真实关闭/不支持时继续使用既有可用性规则，停止入口独立于普通操作锁。

## 一次日常串联回执

fresh隔离Host以`--model-fixtures --config-fixtures --startup-fixtures`启动，没有额外皮肤目录参数，也没有调用register注入设计源。隔离副本从插件自己的skins中发现首套。初始selected=null，首项catalog为普通内置0.7.1，两个回归样例另列。准确资源逐项校验通过。

`reports/skin-foundation-m7-2026-11-03/daily.json`五项通过：

1. 通过普通页面应用三个模块，公开字段为theme一项＋pet七项，共8项，全部默认与0.7.1源相同。
2. 从新开场卡片预览一次，实际videoEnded后完成；自动偏好保持false。随后在皮肤页打开同一自动偏好，到开始使用页读为true，再关闭并回皮肤页读为false。
3. 普通工作区呈现既有标准Session合成正文/代码/表格/工具过程；实际A2原生窗口只有两份当前准确contentKey资源，尺寸362×362。没有真实模型或工具执行。
4. 通过“轻点一下”调用现有官方模型夹具一次，实际react；大小改为105，停止并主动恢复后105及自动关闭偏好保留。
5. 普通偏好流程：关闭pet→停止全部→恢复仍保持关闭→从原模块入口启用pet，实际可见且105仍保留。没有为该流程改停止/恢复核心。

截图包括skin-applied、nearby-startup-controls、managed-setup、daily-workspace、a2-native、preferences-restored-enabled。皮肤线的普通用户视角复看在`reports/first-skin/m7-user-view-review.md`，只基于截图，不冒称其重跑点击流程。

## 最终构建与剩余边界

JavaScript/JSON检查、本地client/Mac构建及开发app签名校验通过。final-ui-readback.json确认最终开始使用页无旧pack/启动桌宠按钮、名称/版本footer正确，皮肤页预览可用且auto=false，保存参数105。没有重跑旧15/8/2或整片矩阵；播放、核心协调器、F1启动判断及内容身份未改，沿用既有验收。

原过程保留：最初检查脚本把8项误数为pet独有，实际为theme1＋pet7；新预览按钮误判ready的原图/JSON保留，修正后实际点击完成。工作区第一次等待忽略了官方合成工具过程默认折叠，展开“已完成”后续跑，没有重复seed。收拢旧入口时出现的括号语法错误已由校验捕获并修正；隔离客户端加载过错误开发文件，最终重启同一测试profile并读回正确UI，未再跑模型/日常全流程。受控调用合计1次，真实模型/工具0。

隔离Host/renderer/native保持运行供主控复看，当前“陪伴→皮肤”、0.7.1就绪、size105、pet已重新启用、auto=false。它是自建测试profile，不是用户真实安装。没有暂存/提交、推送、部署、发布或授权重建；最终美术、真实用户客户端/模型和素材公开分发条件仍分别确认。
