# A2 0.6.0 限定原生回执

2026-11-03，模块线送主控审核。准确内容 `archive-warm-whale/0.6.0`，key `d800200c3b91e6eb78c91f69447dcc0499881a611631583d054d160869448c50`，来自内容线的archive-warm-whale-a2-m5目录。复用M5保留的官方Host/renderer，不改生产代码。

两段分别核对已审摘要：idle为`f764087a1fc87df815a113985a8ffedce33666d9d05ae4c12b9345351a5d21d9`，react为`d8b0a67f6e8a1c48e3dce59a440a4d53aaa5938c82e7fdf3fa3e6709c95ed9c4`。Host确认本key，实际两段362×362/contain，两个src均为本key的A2资源；195高度、offset10、size100未变。原生标题/可访问提示更新为A2，仅提示回应/拖动/菜单，没有喂饭。

限定三项检查通过，详见`reports/skin-foundation-a2-2026-11-03/native.json`及原样可重跑的verify-native.mjs：

| 透明原生截图 | 角色CSS高度 | 实体脚底留空 | 截图末行最大alpha |
| --- | --- | --- | --- |
| idle.png | 179px | 3px | 0 |
| react-first.png | 180px | 1.5px | 0 |
| react-later.png | 179px | 1px | 3 |
| return-idle.png | 178.5px | 3px | 0 |

不是只凭groundGap判断完整：另对真实透明PNG逐行末尾做alpha读取，四张均低于既有128阈值，保留3这一低透明抗锯齿事实。实际查看待机、回应与回待机截图，鞋底可见，外缘散点/薄雾相较A1收敛，细发丝较窄；可与已审A2白/深预览共同判断，没有把透明截图说成新做了一套白/深环境矩阵。

react两次采样播放时间递增、图像不同，媒体结束时间1.8秒，约1905ms内观察到回idle（含命令/采样开销）。A2仍保留原12帧重绘变化、低帧率停顿和首尾接缝，不称循环或最终美术已经完成。

本轮新增模型调用0，未重跑M3两轮、旧12→2、停止/冷启、多屏或长期矩阵；82份已审M5源码摘要仍一致。无真实模型、真实安装/profile、暂存/提交/发布变化。按主控安排已关闭本轮隔离Host、renderer和原生进程，清理见cleanup.json。M6只有一页候选合同，仍未编码，等待主控审接缝。
