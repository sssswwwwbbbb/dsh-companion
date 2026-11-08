#!/usr/bin/env python3
"""把落在强调色实心按钮上的图标改成浅色，其余保持原样。

发送 / 停止按钮底是 --dsw-alias-state-business-primary（本套为红），
红色图标在上面等于隐形，所以这两枚统一改成表面色 #FFF9EB。
只改 RGB，保留原始 alpha 与几何。
"""
import sys
from pathlib import Path

from PIL import Image

ASSETS = Path(sys.argv[1])
TARGET = (255, 249, 235)  # #FFF9EB
NAMES = ("icon-send-light.png", "icon-send-dark.png", "icon-stop-light.png", "icon-stop-dark.png")

for name in NAMES:
    path = ASSETS / name
    if not path.exists():
        raise SystemExit(f"缺少图标: {path}")
    image = Image.open(path).convert("RGBA")
    alpha = image.getchannel("A")
    solid = Image.new("RGBA", image.size, TARGET + (0,))
    solid.putalpha(alpha)
    solid.save(path)
    print(f"recolored {name}")
