# M6 档案暖白 → 鲸鱼娘扫描：实际内容输入

2026-11-03。复用已选R3稿和已核对源，不重新选题、重画或加声音。实际字段以docs/skin-foundation/startup-contract-m6.md为准；资源核对和loader通过不能当作startup原生播放通过。

## 实际交付

目录designs/dsh-skin-v1/assets/startup-m6-input/。

| 输入 | 实际规格 | 字节 / sha256 |
| --- | --- | --- |
| archive-poster.png | 1280×720，原创档案底板，无透明内容，加载/失败回退 | 40039 / 2ab79d8813b2ec0fc86a3e64bab568b14d46f855212fdabe6139cecceddaeee6 |
| archive-whale-silent.webm | 一段成片，1280×720、VP9、25fps、205帧、**8.20秒、无音轨** | 1717916 / 7ec7897b6e3de830f1be4ba41d56e027575b3d2a01c50f8b5e48c0b46f6614b3 |
| whale-girl-scan-silent.webm | 原扫描去音轨的中间输入，AV1、2560×1440/24fps、7.04秒 | 3781029 / d0aa75e2a2230e6f39cb7a9b68a6d72b1e70168fda08a53024f7b27293056d90 |

原扫描MP4实际含AAC；中间无音轨版复制视频码流，packet hash与原片完全相同。最终成片因加入现有档案静态前导而统一编码/重采样；实际时长8.20，不固定套旧原型8.24或上游7200ms模板。首段档案按1.2秒设计，之后原扫描按比例容纳；不裁关键脸，不叠新角色，不添加逐段运行时间轴。中间AV1文件不作为第二运行格式。

输入只读检查reports/first-skin/startup-m6-composed-input.json：205帧/25fps与实际时长一致、无音轨、1280×720，前导静态保持；实际浏览器解码1280×720/8.2秒、readyState4且无错误，见startup-m6-browser-decode.json。视频首段和扫描实帧在m6-01-composed-archive.png、m6-02-composed-scan.png。编码脚本build-startup-m6-input.py；底板源archive-frame.html，经CUA截图，不是新角色图片生成。

## 文案、位置与进入时序

复用的底板大标题是“翻开今天的档案。”，副句“一张暖白底板，一段安静的开场。”。1280×720中大标题位于左侧约x102/y320，原稿kicker在上沿约y96，底部章节和章印在约y590。片内不画进入/跳过按钮，不写ESC，不伪造授权/身份检查。扫描仍是原片既有画面。

播放器greeting建议“档案暖白”，subtitle建议“无声开场 · 就绪后进入工作区”，避免重复视频内同一大标题。实际原生验收时检查其既有位置不要遮盖左中主标题或扫描脸部；优先沿用现有上/下安全区域，不引入可配字体、CSS或层编辑器。

单段视频结束或用户走既有进入入口后，交回工作区并让A2桌宠回待机；不借pet.greet，也不等待pet.ready。应用、换肤、恢复、运行中启用不自动重播。冷启动/全局自动开关、手动入口、停止失效与Host未就绪的45秒退路，均由已定M6合同的实际模块实现。不能用影片时间冒充Host已ready，也不能将R3网页ESC算为原生能力。

档案前导是固定暖白成片，不能称其随宿主明暗实时变色；播放器其余底色/正文/强调沿主题快照。加载失败用本套poster，继续既有进入/打开DSH路径，不让装饰阻塞工作区。真实显示范围应匹配DSH窗口并contain，不能继承上游模板“全屏”描述当成本项目约束。

## 来源与边界

原参考、模板、NOTICE及R3的91文件保持。扫描来自LeeRolling固定提交34b892eae168abf14fc9623cb109d6806ffeacf2→NativeDog1；原作者未确认，旧NOTICE摘要和实片不一致的事实保留在资源NOTICE。当前仅本地/隔离验证，转换不新增分发/商用权。完整新版本须按实际startup合同另组；0.6.0保持不加startup，不改真实安装/profile，不提交发布。
