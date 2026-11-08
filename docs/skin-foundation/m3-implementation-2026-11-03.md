# M3 桌宠模型互动实现与受控联调

2026-11-03，底座/模块线送主控审核。R3 定向接入已另获主控阶段通过；本报告仅覆盖新增 M3，不改写旧证据或代替真实模型验收。

## 已实现的闭环

桌宠专属输入或原生轻点 → 本套人设＋最近 N 轮桌宠互动的实际结果＋当前就绪能力 → 官方 DSH `ctx.llm.prepareCall/stream` → 短句/一个动作/安静 → 既有原生执行器 → 实际回执进入下一轮。

- `pet-interaction.mjs` 负责这一组业务编排；`pet-model.mjs` 连接官方模型目录、默认选择、调用和请求记录。公共协调器未修改，不建立新的 Agent/调度/授权系统。
- 人设、已有动作语义、本地回退由皮肤声明。示例使用 R4 已给出的人设和10轮默认，媒体仍是历史 builtin；没有把新角色的四姿态预览当完整动画资源。
- 六项配置沿用逐套覆写/重置。current 是官方 DSH 当前默认模型，指定模型来自官方目录。不能将未保存的后台会话模型选择称为本请求的路由；不读工作会话内容。字段和语义见 `pet-interaction-contract-m3.md`。
- 动作是本套声明与当前原生已加载媒体的交集；动态气泡纯文本、最多120字、沿用3秒显示。可不说话、不动作，关闭智能仍使用本套本地回应。
- 每个模型可见请求写进单独的官方 Session，当前请求消息与已记录消息相同。近期历史按皮肤分开、最多20轮，插件重载清空；不是长期记忆，日志持久化沿用宿主后端。
- 取消复用现有 generation、内容身份、独立停止锁与原生就绪状态。待回复时停止、关闭模块或换肤不能被迟到结果重新开启。

## 实际检查结果

`reports/skin-foundation-m3-2026-11-03/`：70/70 自动测试通过，含新增8项互动测试及已有62项；源码/JSON检查、本地客户端及原生构建通过。没有重跑未受影响的旧23＋5完整GUI矩阵。

新增8项定向联调均通过：

1. 六项配置默认和官方目录到达真实设置页；10个已加载的 builtin 动作可用。
2. 两轮专属输入真实经过官方 llm 服务和受控提供方，第二轮收到第一轮实际结果，原生执行 react → stretch，气泡读回与截图对应。
3. 安静选择不启动新动作，并清除旧气泡。
4. 无效动作和受控调用失败走本地回退；智能关闭后新增模型请求为0。
5. 说话/动作关闭、人设/历史/指定路由覆写，切换保留及重置均到达实际运行端。
6. 原生 renderer 的既有轻点 IPC 到达同一服务并共用历史。该项不是物理鼠标点击验收。
7. 请求等待时用真实设置页停止入口停止；提供方晚返回后没有执行、显现或重新开启。
8. 显式恢复可继续互动；关闭桌宠拒绝互动；无声明的旧包返回明确不可用。

证据：`integration.json`、`model-requests.json`、`tests.txt`、`check.txt`、`source-manifest.json`、`cleanup.json`；主要画面 `native-model-reply.png`、`interaction-controls-and-input.png`。早先设置页顶端截图仅证明页面，不用其冒充控件可见证据。所有模型请求/用户文字均是本次合成夹具内容，报告不含授权或连接凭据。

隔离官方 Host 第一次载入发现缺少新增 llm peer 声明，已补正式 package.json，随后官方加载、远程调用及8项联调通过。没有改真实安装或 profile 来修补测试。

## 真实模型与范围

真实模型调用 **未验**。新隔离 profile 的模型目录为0个，默认标识虽为 deepseek-official/deepseek-flash，但没有可用配置；报告明确 `realModelCalls:0`、`externalModelCalls:0`。测试适配器注册到官方 llm 服务，证明官方调用链、格式、记录和执行适配，不证明真实提供方会理解人设、遵守格式或自然回应“换个动作”。后续真实模型验收需要一个获准使用的已配置 DSH 路由；本轮没有读取真实 profile/私聊、复制密钥或购买额度。

新角色完整 idle/react、物理多屏/托盘、长期性能及真实业务画面验收仍分开。未实现定时模型循环、识屏、长期记忆/RAG、移动规划、语音或通用 Agent 平台。未替换真实客户端、提交、推送、发布或部署。

## 复跑和主控审核

运行前构建客户端与本地 Mac 组件。在两个终端启动以下 Host 与 renderer，随后执行定向脚本；`DSH_SKIN_REPORT_DIR` 可指定新报告目录，避免覆盖本次证据。

```sh
node scripts/build-client.mjs
node scripts/build-mac.mjs
ELECTRON_RUN_AS_NODE=1 '/Applications/DeepSeek Harness.app/Contents/MacOS/DeepSeek Harness' packages/dsh-skin-core/scripts/isolated-host.mjs --model-fixtures --config-fixtures packages/dsh-skin-core/examples/interaction
.cache/electron/45.2.1/darwin-arm64/Electron.app/Contents/MacOS/Electron packages/dsh-skin-core/scripts/isolated-renderer.cjs
DSH_SKIN_REPORT_DIR=reports/m3-independent node packages/dsh-skin-core/scripts/verify-m3-interaction.mjs
```

脚本不自动退出两个宿主，结束时先 `control.mjs page quit` 再 `control.mjs host quit`。本次已清理隔离进程。请主控按新增范围审核源代码/证据及必要的独立适配检查；真实模型状态与已通过受控适配分开记录，常规后续收敛可直接回传。
