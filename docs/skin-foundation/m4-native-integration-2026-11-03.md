# M4 首套内容与 A1 原生接入

2026-11-03，底座/模块线送主控审核。M3＋F1已由主控独立复验通过；M4只补准确内容联调和真实两状态媒体接缝，真实外部模型仍未验。

## 两份内容，分别核对

| 内容 | 准确身份 | 本轮结果 |
| --- | --- | --- |
| 0.4.0，历史builtin | archive-warm-whale / ec56e56e5a100fb7b4cd2eff180e30b5055caacd54e8f3d173da020b5150e0a1 | 11公开字段，本套人设/10轮/current/四动作进入官方模型服务夹具；两轮实际react→stretch，第二轮收到第一轮actual |
| 0.5.1，A1新角色 | archive-warm-whale / 67176949bdad17c93a06610d8bf514abf133d6cc3232da651e475b6e1b92c9de | 8公开字段，A1两段真实WebM原生解码，6项新范围检查通过 |

0.4.0在子集生产改动前完成，结果 `reports/skin-foundation-m4-2026-11-03/content-0.4.0.json`。0.5.1结果在 `a1-0.5.1/native.json`。0.5.0由内容线保留为未校准内容基线，没有冒称本线已对它做原生验收。早期原生校准使用本线独立夹具，`a1-fixture/`和首次截图仅属试播过程，不替代0.5.1的结果。

## 最小模块演进

- pet interfaceVersion保持1，新增configVersion2并兼容v1。v2动画至少idle，只给真实片段；自定义集合整体替换，builtin仅借行为曲线，不补旧角色媒体。
- 保持视频原比例居中包含，alpha点击判断对应相同比例。固定canvasHeight默认300，A1取195；实际初播约178–180px，但脚底约12px留空，因此只加固定canvasOffsetY:12。size继续原百分比，两固定值随之缩放，没有锚点系统。
- 模型、原生手动入口和设置页动作来自当前已解码集合。未提供动作的菜单/按钮隐藏，认证动作调用返回ACTION_UNAVAILABLE；旧行为遗留的缺失动作回idle，回应结束沿用原状态机。
- 缺walk不能公开跟随，缺完整12槽不能公开自主。A1两者固定false；旧同皮肤的相关覆写没有声明就不执行。
- 初播发现循环idle播放时readyState瞬时回落，会被就绪快照漏掉。现以当前媒体代次中成功解码的集合报告；换肤/清理/媒体错误按原生命周期移除。idle确实解码才确认原生ready。

实际字段、版本与示例已提前给内容线，见 `pet-animation-subset-contract-m4.md`、`integration-response.md`；本线没有编辑皮肤目录、源图集或视频。

## 定向结果

最终源码自动测试75/75、源码/JSON检查及本地构建通过。新增4项子集单测覆盖v1兼容、真实子集替换、缺动作/未就绪玩法和本地回退；未重跑无变化的旧23＋5完整GUI矩阵。

准确0.5.1的6项原生检查：

1. Host身份与新包相符，只就绪idle/react；视频实际362×362、contain，两个src均指向本contentKey，既有旧媒体不在DOM中。
2. 实际播放采样有不同帧及递增播放时间，react持续1.8秒后回idle。5张原生截图测得角色高度177–180.5 CSSpx，脚底距窗口底边0–0.5px，媒体区195px、向下12px。
3. stretch/eat调用被拒绝；原生菜单不出现喂饭、撸猫、伸懒腰等缺失动作。
4. 两轮官方服务夹具仅收到本套idle/react子集，并收到上一轮实际结果；可回应或安静，不把缺失stretch虚报已执行。
5. 切到v1旧包确实加载12段旧媒体，切回新包确实仅两段本摘要资源，没有旧角色混播。
6. 等模型回复时停止，原生视频移除至0段；晚到结果不执行、不显现；主动恢复后重新解码两段。

主要证据：`a1-0.5.1/native.json`、idle-1/2.png、react-1/2.png、react-return-idle.png；`tests.txt`、`check.txt`、`source-manifest.json`、`content-identities.json`、`cleanup.json`。所有模型输入均为本次合成场景，模型服务采用受控提供方，没有真实模型或计费调用，也没有复制真实profile密钥。

## 可见质量与后续

实际查看最终0.5.1待机/回应原生截图：比例、头饰和整体轮廓可辨；小尺寸发丝、轮廓蓝白边缘噪点和低帧率接缝仍可见，保留真实截图交内容线按原生效果定向优化。本轮不重生成全部素材、不称最终美术通过。

这是本地隔离Host＋原生Electron窗口的结果。物理鼠标/托盘点击、全多屏、长期性能、真实客户端和真实模型质量仍按原边界分别验收。未提交、推送、发布、部署或改真实安装/profile；隔离进程已清理。制作器、上传、市场及外部壁纸不并入M4。

## 复跑

先完成本地客户端和Mac构建。两个终端分别启动Host和renderer，第三个终端跑定向脚本；请指定新报告目录以保留本次证据。

```sh
ELECTRON_RUN_AS_NODE=1 '/Applications/DeepSeek Harness.app/Contents/MacOS/DeepSeek Harness' packages/dsh-skin-core/scripts/isolated-host.mjs --model-fixtures --config-fixtures designs/dsh-skin-v1/content/archive-warm-whale-a1-m4-calibrated
.cache/electron/45.2.1/darwin-arm64/Electron.app/Contents/MacOS/Electron packages/dsh-skin-core/scripts/isolated-renderer.cjs
DSH_SKIN_REPORT_DIR=reports/m4-independent DSH_SKIN_EXPECTED_HASH=67176949bdad17c93a06610d8bf514abf133d6cc3232da651e475b6e1b92c9de node packages/dsh-skin-core/scripts/verify-m4-native.mjs designs/dsh-skin-v1/content/archive-warm-whale-a1-m4-calibrated
```

结束先control.mjs page quit，再host quit。0.4.0可用verify-m4-content.mjs按准确身份另跑，输出另目录。请主控审核本次新增子集/执行接缝、准确内容身份和实际播放证据，其他阶段不重复改写。
