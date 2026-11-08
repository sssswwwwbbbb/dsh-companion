# R3 五字段受控接入回执

2026-11-03（Asia/Shanghai），操作者：底座线。依据主控 `skin-foundation-reacceptance-2026-11-03.md` 解除 F1/F2/F3 阻塞后推进；本轮按新增配置做定向检查，未重跑无变化的旧矩阵。

对象：`designs/dsh-skin-v1/content/archive-warm-whale-config-r3/`，id `archive-warm-whale`，version `0.3.0`，内容摘要 `ef6bbde97e958fc11fd7e25b09d221ac2a9a7cb99a150968f7135514016a6b7f`。仍引用历史 `whale-maid-demo`，不是 R2 新角色或扫描开场。

## 实际结果

隔离官方 Host / 官方 Web 客户端 / 现有 Electron 原生宿主中，9 项定向检查全部通过。生产主题、配置和原生执行代码无需修改，公开 M0 格式无需改变。

| 配置与流程 | 检查结果 |
| --- | --- |
| 五项声明与默认值 | 控制项实际出现，背景 0.04、大小 100、gentle、自主 false、跟随 false 到达原生配置及行为对象 |
| backgroundOpacity | 实际 overlay 在 0.12 时读回 0.12，0 时为 0；随后保存 0.08 覆写 |
| size | 120% 使实际原生窗口放大，透明与不透明像素均正常，未出现无效坐标；不据此推定新角色脚底校准 |
| profile | 从真实设置页选择 lively 后，原生行为对象采用既有 lively 曲线，包含其实际速度参数 |
| autonomous | 从真实设置页切换；原生生产定时器触发本地决定，开启后进入 walk，关闭后保持 idle 且位置稳定 |
| followMouse | 从真实设置页切换；开启后实际原生状态机向受控光标坐标移动，关闭后更换目标不再移动 |
| 选择与保存 | 切至 A 再返回 R3、页面重载后，五字段值保持；R3 内容版本没有回退到 R1 |
| 停止、重置和恢复 | 重置恢复五默认值，同时保留全部停止与全局桌宠关闭；显式恢复仍尊重桌宠关闭，再开启桌宠后正确使用默认配置 |

完整输出 `reports/skin-foundation-r3-2026-11-03/integration.json`；设置画面 `five-default-settings.png`。五字段的配置路径在本候选受控环境通过，未将 R1 的旧报告当作 R3 证据。

## 夹具与检查边界

- 使用单独 profile、本地临时授权、复制出的原生包，不改变真实安装/profile。
- 为可重复观察自主动作，原生随机数在测试副本固定为 0.1；仍运行原来的定时器、decide、step 和窗口呈现代码。
- 光标读取在测试副本由本地受控坐标提供。它证明当前 followMouse 配置驱动了真实原生行为与移动，不是物理鼠标/多屏/拖拽验收。
- 测试副本提供只读行为诊断路由，未加入生产 main.mjs；外部 dsh://open 前台交接按原夹具关闭。源码身份和夹具差异另列报告。
- 一次早期脚本尝试把 select 选项文本算进 label，导致定位未完成；修正为字段标签节点后完成最终检查，早期结果保留于 selector-attempt.json。没有为此改生产逻辑。
- 本轮没有新行为模块、真实模型请求、全套旧场景重复检查或新角色动画制作。新旧代码与资源许可继续按现有记录保留。

## 接手

可由皮肤线引用此回执更新 R3 接入状态。实际新角色的 idle/react、脚底、边缘与切换需要其真实资源到位后另验；不因这些尚未发生的变化阻塞现有五字段结果。

复现：现有隔离 Host 加 `--config-fixtures` 并传入 R3 内容目录，启动现有 isolated-renderer，然后运行 `node packages/dsh-skin-core/scripts/verify-r3-config.mjs`。当前只新增复现夹具/检查脚本和交接文档，生产代码不新增运行依赖。
