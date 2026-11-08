# -*- coding: utf-8 -*-
"""生成场景预设的模型徽记：强调色圆盘 + 白色角族徽记。

徽记只用一个资源、同时服务明暗两套，所以做成自包含图形（圆盘 + 白字形），
不依赖底色。输出 192×192 透明 PNG，落在 assets-src/scene-badges/。

运行：python3 scripts/make-scene-badges.py
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
PACK = ROOT.parent.parent / "素材" / "DSH-烬角黑焰-皮肤素材包-v3.6.zip"
OUT = ROOT / "assets-src" / "scene-badges"

# 与 workspaceCues / scenePresets 的配色保持一致
BADGES = {
    "scene-flare":  "#C0282E",   # 炽焰 · 红
    "scene-ember":  "#8A5A16",   # 余烬 · 金
    "scene-seal":   "#7D615C",   # 封存 · 灰褐（深色底上也分得开）
}

SIZE = 240          # 圆形直径（px）；1.0 素材清单建议徽记交 256×256
GLYPH = 150         # 字形边长（约 62% 直径，小尺寸下更清楚）
THICKEN = 1         # 笔画加粗次数：原稿是 96 画板 2px 细线，缩到 24px 会糊
INSET = 8           # 圆盘外留白，避免小尺寸贴边


def load_glyph():
    import zipfile
    with zipfile.ZipFile(PACK) as archive:
        data = archive.read("烬角-黑焰/exports/brand/entry-mark-light-96x96.png")
    import io
    glyph = Image.open(io.BytesIO(data)).convert("RGBA")
    # 只保留 alpha，整体改成白色
    white = Image.new("RGBA", glyph.size, (255, 255, 255, 0))
    white.putalpha(glyph.getchannel("A"))
    return white


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    glyph = load_glyph()
    canvas = SIZE + INSET * 2
    for asset_id, color in BADGES.items():
        disc = Image.new("RGBA", (canvas, canvas), (0, 0, 0, 0))
        draw = ImageDraw.Draw(disc)
        draw.ellipse([INSET, INSET, INSET + SIZE, INSET + SIZE], fill=color)
        scaled = glyph.resize((GLYPH, GLYPH), Image.LANCZOS)
        alpha = scaled.getchannel("A")
        for _ in range(THICKEN):
            alpha = alpha.filter(ImageFilter.MaxFilter(3))
        thick = Image.new("RGBA", scaled.size, (255, 255, 255, 0))
        thick.putalpha(alpha)
        offset = (canvas - GLYPH) // 2
        disc.alpha_composite(thick, (offset, offset))
        path = OUT / f"{asset_id}.png"
        disc.save(path, optimize=True)
        print(f"{path.name:18s} {canvas}×{canvas} {path.stat().st_size // 1024} KB  {color}")


if __name__ == "__main__":
    main()
