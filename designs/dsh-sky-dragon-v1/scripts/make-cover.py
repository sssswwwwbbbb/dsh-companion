#!/usr/bin/env python3
"""把封面 PNG 转成 WebP，供皮肤库卡片使用。

卡片封面是懒加载的 data URL，PNG 直传 1 MB 级别，转 WebP 后约 200 KB。
"""
import sys
from pathlib import Path

from PIL import Image

assets = Path(sys.argv[1])
source = assets / "library-cover.png"
target = assets / "library-cover.webp"
if not source.exists():
    raise SystemExit(f"缺少封面源: {source}")
image = Image.open(source).convert("RGB")
if image.size != (960, 600):
    raise SystemExit(f"封面尺寸应为 960×600，实际 {image.size}")
image.save(target, "WEBP", quality=86, method=6)
source.unlink()
print(f"cover webp {target.stat().st_size} bytes")
