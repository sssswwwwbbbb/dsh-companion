# 源工程说明

## 图标
- 生成器：`source/icons/_generator/gen_icons.py`
- 环境：Python 3.11 + Pillow 13.0（无第三方字体依赖，路径由 cairosvg 之外的几何 DSL 绘制，32× 超采样后降采样）
- 用法：`python3 source/icons/_generator/gen_icons.py <包根>`
- 颜色：浅色 `#C0282E`、深色 `#FF6A3C`，在脚本 `main()` 里改 `hexlight/hexdark` 即可换色
- 输出：`source/icons/<id>.svg`（24×24 画板）→ `exports/icons/{light,dark}/<id>.png`（96×96 RGBA）

## 位图与界面稿
- 工具：Pillow 13.0 + numpy 2.5.4，脚本为一次性排版脚本（铺参考图、渐隐遮罩、圆角、暗角）
- 角色三视图与主视觉：图像生成模型输出（seedream 5.0 flash），尺寸见台账

## 音频
- 生成：语音合成（三句台词、四条音效、环境底噪），原始 40 kHz 单声道 16/24-bit
- 处理：Python 3.11 + numpy 2.5.4 + scipy 1.18.1，自写 WAV 读写 / `resample_poly` 重采样到 48 kHz / RMS −20 dB 对齐 / 边缘淡入淡出
- 湿声链：带通 120–5200 Hz → 41 Hz 环形调制 0.10 → 2.8 ms 梳状 0.30 → 2.6 倍饱和 → 带通 110–6000 Hz
- 立体声导出：单声道源复制到左右声道（L=R），原件保留在 `exports/audio/mono/`

## 视频
- 画面：图生视频模型生成 10 s 1280×720
- 合成：Swift 6.3 + AVFoundation（AVMutableComposition + AVAssetExportSession），自备混音替换原音轨，并只保留 0.42 s 落版末帧定格（10 帧），不加尾段；成片 10.50 s 与音轨等长
- 无声审看版：同构图去掉音轨导出
