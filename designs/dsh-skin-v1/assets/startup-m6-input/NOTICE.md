# M6 已选开场输入与来源

2026-11-03，仅当前本地/隔离内容准备，不代表startup运行或公开分发通过。

最终输入为archive-poster.png与archive-whale-silent.webm：复用R3档案底板的文案、暖白主题与网格，由archive-frame.html经CUA渲染为1280×720静态帧；其后接已选鲸鱼娘扫描，按单段媒体编码。实际最终8.20秒、205帧/25fps、1280×720、VP9、无音轨。帧率重采样后不能用1.2+7.04的算术值代替实际时长。

扫描原始来源：LeeRolling/dsh-boot-suite固定提交34b892eae168abf14fc9623cb109d6806ffeacf2；上游转自NativeDog1/dsh-boot-animation的media/deepseek-cyberpunk-intro.mp4。上游声明BSD-3-Clause，原始动画作者未标注。旧SCAN-NOTICE声称的BEABF595...34A58与实际源文件sha256 3756348dfc0fc2fa9fb138d1cc8d5f571c4b448c0c73a0cb46802d650f15a1e8不一致；差异和原作者/使用权链仍未解决，不借转换补记为已解决。

原始assets/reference/whale-girl-scan.mp4（7.04秒，AV1/2560×1440/24fps，含AAC）与旧模板/NOTICE保持。whale-girl-scan-silent.webm只是中间输入：复制原视频码流并去掉音轨，视频packet hash与原片相同；不作为运行时多格式备选。最终成片因为要拼接档案静态帧，统一编码为单个1280×720/25fps VP9，不重画角色或新增音轨。

档案前导固定暖白画面，不是随宿主主题实时改色的视频。开场窗口、进入/跳过、Host就绪、停止、冷启动及手动重播由实际模块控制；片内没有可点击按钮或伪造授权步骤。原型ESC不能据此记为原生已实现。

方法与准确摘要见generation.json；来源测量reports/first-skin/startup-m6-media-input.json、startup-m6-composed-input.json。只保留本地/隔离使用范围，没有授予新的公开或商业许可。
