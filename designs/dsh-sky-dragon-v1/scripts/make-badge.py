#!/usr/bin/env python3
"""生成 512×512 的场景徽记：六角框 + 内菱形 + 中心点，与入口徽记同一几何。

入口徽记只有 96px，场景预设在工作区底栏会用更大尺寸，单独出一张高清版。
颜色取中间红，浅底与深底都能辨认。
"""
import math
import pathlib
import sys

from PIL import Image, ImageDraw

SIZE = 512
S = 8                      # 超采样
STROKE = 26                # 512 画板上的线宽
COLOR = (200, 50, 58, 255)  # #C8323A


def hexagon(cx, cy, r, rot=math.radians(30)):
    return [(cx + r * math.cos(rot + math.pi / 3 * i), cy + r * math.sin(rot + math.pi / 3 * i)) for i in range(6)]


def main():
    out = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "assets-src/badge-512.png")
    out.parent.mkdir(parents=True, exist_ok=True)

    img = Image.new("RGBA", (SIZE * S, SIZE * S), (0, 0, 0, 0))
    dr = ImageDraw.Draw(img)
    w = STROKE * S
    c = SIZE / 2          # 512 画板坐标系下的中心

    def poly(pts, closed=True):
        pts = [(x * S, y * S) for x, y in pts]
        if closed:
            pts = pts + [pts[0]]
        dr.line(pts, fill=COLOR, width=w, joint="curve")
        for x, y in pts:
            dr.ellipse([x - w / 2, y - w / 2, x + w / 2, y + w / 2], fill=COLOR)

    poly(hexagon(c, c, 210))
    poly([(c, c - 112), (c + 112, c), (c, c + 112), (c - 112, c)])
    r = 30
    dr.ellipse([(c - r) * S, (c - r) * S, (c + r) * S, (c + r) * S], fill=COLOR)

    img = img.resize((SIZE, SIZE), Image.LANCZOS)
    img.save(out)
    print(f"wrote {out} ({out.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
