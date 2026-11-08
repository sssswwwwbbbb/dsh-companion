#!/usr/bin/env python3
"""题材化线性图标样张：卡牌切角语言 + 2px 线条，24 画板。

沿用素材包 gen_icons.py 的画法（Pillow + 32x 超采样），只换图形语言：
容器一律用「切角卡牌」，高频位加入卡盒、菱纹、决斗盘刻度等题材元素。
输出 96x96 RGBA 到 review/themed-sample/，并拼一张实尺寸对照板。
"""
import math
import pathlib

from PIL import Image, ImageDraw

G, STROKE, SUPER, OUT_PX = 24.0, 2.0, 32, 96
LIGHT = (0xB5, 0x23, 0x28)
DARK = (0xE4, 0x3B, 0x3B)

L = lambda x1, y1, x2, y2: ("line", x1, y1, x2, y2)
P = lambda pts, closed=False: ("poly", pts, closed)
R = lambda x0, y0, x1, y1, r=0, fill=False: ("rect", x0, y0, x1, y1, r, fill)
C = lambda cx, cy, r, fill=False: ("circle", cx, cy, r, fill)
FP = lambda pts: ("fillpoly", pts)
A = lambda cx, cy, rx, ry, s, e: ("arc", cx, cy, rx, ry, s, e)


def card(x0, y0, x1, y1, cut=3.0):
    """切角卡牌轮廓：四角 45° 切一刀，是整套的识别语言。"""
    return P([(x0 + cut, y0), (x1 - cut, y0), (x1, y0 + cut), (x1, y1 - cut),
              (x1 - cut, y1), (x0 + cut, y1), (x0, y1 - cut), (x0, y0 + cut)], True)


def diamond(cx, cy, r, fill=False):
    pts = [(cx, cy - r), (cx + r, cy), (cx, cy + r), (cx - r, cy)]
    return FP(pts) if fill else P(pts, True)


def crescent(cx, cy, r_out, r_in, offset, step=4):
    """月牙：外弧 + 内弧反向闭合，避免只有一段弧像字母 C。"""
    outer = [(cx + r_out * math.cos(math.radians(a)), cy + r_out * math.sin(math.radians(a)))
             for a in range(70, 291, step)]
    inner = [(cx + offset + r_in * math.cos(math.radians(a)), cy + r_in * math.sin(math.radians(a)))
             for a in range(290, 69, -step)]
    return P(outer + inner, True)


def teeth(cx, cy, r_in, r_out, count=8):
    ops = []
    for i in range(count):
        a = math.radians(360.0 / count * i)
        ops.append(L(cx + r_in * math.cos(a), cy + r_in * math.sin(a),
                     cx + r_out * math.cos(a), cy + r_out * math.sin(a)))
    return ops


ICONS = {
    # 导航：全部落在切角卡牌里
    "workspace": [card(3, 4, 21, 20), L(9.5, 4, 9.5, 20), L(12.5, 8.5, 18, 8.5), L(12.5, 12.5, 18, 12.5)],
    "compose": [card(3, 4, 18.5, 20), L(12, 16, 12, 8), L(8, 12, 12, 8), L(16, 12, 12, 8)],
    "conversation": [card(3, 5, 21, 18), L(8, 18, 8, 21), L(8, 21, 11.5, 18), L(7, 9.5, 17, 9.5), L(7, 13, 13, 13)],
    "search": [P([(11, 3), (19, 11), (11, 19), (3, 11)], True), L(16.5, 16.5, 21, 21)],
    "folder": [P([(3, 8.5), (3, 5.5), (9, 5.5), (11, 8.5)]), card(3, 8.5, 21, 19.5, 2.2), L(7, 14, 17, 14)],
    "folder-open": [P([(3, 6), (9, 6), (11, 9), (19, 9)]), P([(3, 9), (21, 9), (18.5, 20), (3, 20)], True), diamond(12, 14.5, 2.2)],
    "more": [diamond(6.5, 12, 1.9, True), diamond(12, 12, 1.9, True), diamond(17.5, 12, 1.9, True)],
    "pin": [C(12, 7.2, 3.4), L(12, 10.6, 12, 18.4), L(8.4, 18.4, 15.6, 18.4)],
    # 对话与操作
    "send": [card(3, 8, 15, 21, 2.4), L(13, 9, 21, 3), L(21, 3, 21, 9), L(21, 3, 15, 3)],
    "stop": [card(6, 6, 18, 18, 2.2), L(9.5, 12, 14.5, 12)],
    "copy": [card(4, 8, 15, 20, 2.0), P([(8, 8), (8, 3.5), (19, 3.5), (19, 15.5), (15, 15.5)])],
    "plus": [L(12, 5, 12, 19), L(5, 12, 19, 12), diamond(12, 12, 2.6)],
    # 设置与 DSH 能力
    "settings": [C(12, 12, 4.2), *teeth(12, 12, 6.2, 9.0, 6), diamond(12, 12, 2.2)],
    "plugin": [P([(4, 9), (9, 9), (9, 4), (17, 4), (17, 9), (20, 9), (20, 20), (4, 20)], True), C(13, 15.5, 2.2)],
    "model": [diamond(12, 12, 8.5), L(12, 3.5, 12, 20.5), L(3.5, 12, 20.5, 12), diamond(12, 12, 3.0)],

    "panel-left": [card(3, 4, 21, 20), L(9.6, 4, 9.6, 20), L(5.4, 8.5, 7.8, 8.5), L(5.4, 12, 7.8, 12), L(5.4, 15.5, 7.8, 15.5)],
    "archive": [R(3, 4, 21, 8.6, 1.2), card(3, 8.6, 21, 20, 2.2), L(9.4, 14.4, 14.6, 14.4)],
    "attachment": [P([(16.6, 5.8), (16.6, 15.6), (14.2, 18.4), (11.6, 18.8), (9.2, 17.2), (8.2, 14.6), (8.2, 7.4), (9.8, 5.4), (11.6, 5.6), (12.8, 7.2), (12.8, 14.8), (12.0, 16.0), (11.0, 15.0)])],
    "link": [P([(3, 9.4), (9.2, 9.4), (12, 12), (9.2, 14.6), (3, 14.6)], True),
             P([(12, 9.4), (18.2, 9.4), (21, 12), (18.2, 14.6), (12, 14.6)], True)],
    "retry": [("arcarrow", 12, 12, 7, 130, 410), diamond(17.6, 6.4, 1.6, True)],
    "edit": [P([(4, 20), (5.6, 14.6), (16, 4.2), (19.8, 8), (9.4, 18.4)], True), L(14.6, 5.6, 18.4, 9.4)],
    "branch": [C(6, 6, 2.2), C(6, 18, 2.2), C(18, 12, 2.2), L(6, 8.2, 6, 15.8), L(8.2, 12, 15.8, 12)],
    "chevron-down": [P([(6.5, 9), (12, 14.5), (17.5, 9)])],
    "chevron-right": [P([(9, 6.5), (14.5, 12), (9, 17.5)])],
    "terminal": [card(3, 5, 21, 19, 2.4), P([(7, 9.8), (10.2, 12.4), (7, 15)]), L(11.8, 15, 16.4, 15)],
    "external": [card(4, 8, 15.5, 20, 2.2), L(12, 12, 20, 4), P([(14.4, 4), (20, 4), (20, 9.6)])],
    "file-text": [P([(5, 3), (14, 3), (19, 8), (19, 21), (5, 21)], True), L(14, 3, 14, 8), L(14, 8, 19, 8), L(8, 12.4, 16, 12.4), L(8, 16.4, 16, 16.4)],
    "file-code": [P([(5, 3), (14, 3), (19, 8), (19, 21), (5, 21)], True), L(14, 3, 14, 8), L(14, 8, 19, 8), P([(10, 11.4), (7.2, 15), (10, 18.6)]), P([(14, 11.4), (16.8, 15), (14, 18.6)])],
    "file-table": [P([(5, 3), (14, 3), (19, 8), (19, 21), (5, 21)], True), L(14, 3, 14, 8), L(14, 8, 19, 8), L(5, 13, 19, 13), L(12, 13, 12, 21)],
    "file-image": [P([(5, 3), (14, 3), (19, 8), (19, 21), (5, 21)], True), L(14, 3, 14, 8), L(14, 8, 19, 8), C(9.6, 12, 1.3), P([(6, 18), (10, 14), (13, 17), (15.5, 15), (18, 18)])],
    "check": [P([(4, 13), (9, 18), (20, 6)])],
    "clock": [C(12, 12, 8), L(12, 12, 12, 6.8), L(12, 12, 15.8, 13.6),
              L(12, 3.2, 12, 4.6), L(12, 19.4, 12, 20.8), L(3.2, 12, 4.6, 12), L(19.4, 12, 20.8, 12)],
    "alert": [P([(12, 3), (21, 20), (3, 20)], True), L(12, 8.8, 12, 14), C(12, 17, 1.1)],
    "info": [C(12, 12, 8), L(12, 11, 12, 16.4), C(12, 8, 1.1)],
    "play": [FP([(8, 4), (19, 12), (8, 20)])],
    "pause": [R(8, 5, 10.8, 19, 0, True), R(13.2, 5, 16, 19, 0, True)],
    "close": [L(6, 6, 18, 18), L(18, 6, 6, 18)],
    "sliders": [L(3, 7, 21, 7), L(3, 12, 21, 12), L(3, 17, 21, 17), diamond(8, 7, 1.9, True), diamond(15, 12, 1.9, True), diamond(10, 17, 1.9, True)],
    "sun": [C(12, 12, 4.4)] + [L(12 + 6.6 * math.cos(math.radians(a)), 12 + 6.6 * math.sin(math.radians(a)),
                              12 + 9.2 * math.cos(math.radians(a)), 12 + 9.2 * math.sin(math.radians(a))) for a in range(0, 360, 45)],
    "moon": [crescent(12, 12, 8, 6.4, 2.6), diamond(16.4, 5.4, 1.3, True)],
    "palette": [C(12, 12, 8), diamond(8.4, 10, 1.2, True), diamond(12, 8.4, 1.2, True), diamond(15.6, 10, 1.2, True), L(12, 20, 12, 16.6)],
    "download": [L(12, 3, 12, 14), P([(7, 9.6), (12, 14.6), (17, 9.6)]), P([(4, 18), (4, 20), (20, 20), (20, 18)])],
    "shield": [P([(12, 3), (20, 7), (20, 13), (12, 21), (4, 13), (4, 7)], True), diamond(12, 11.6, 2.4)],
    "expand": [P([(4, 9), (4, 4), (9, 4)]), P([(15, 4), (20, 4), (20, 9)]), P([(4, 15), (4, 20), (9, 20)]), P([(20, 15), (20, 20), (15, 20)])],
    "skill": [card(4, 4, 20, 20, 3.0), P([(12, 7.6), (13.6, 11), (17, 11.4), (14.4, 13.8), (15.2, 17.2), (12, 15.4), (8.8, 17.2), (9.6, 13.8), (7, 11.4), (10.4, 11)], True)],
    "agent": [card(4, 7.5, 20, 19, 2.6), L(12, 3.4, 12, 7.5), C(12, 3.4, 1.3), diamond(9, 12.4, 1.2, True), diamond(15, 12.4, 1.2, True), L(9.6, 16, 14.4, 16)],
    "question": [card(3, 4, 21, 16.5, 2.6), P([(8, 16.5), (8, 20.5), (12, 16.5)]), P([(9.6, 8.6), (12, 6.6), (14.4, 8.6), (14.4, 10.2), (12, 12.2), (12, 13.2)]), C(12, 15.2, 1.0)],
    "plan": [card(4, 3, 20, 21, 2.6), L(11.4, 8.4, 16.6, 8.4), L(11.4, 13, 16.6, 13), L(11.4, 17.6, 16.6, 17.6), P([(6.6, 8.4), (7.5, 9.3), (9, 7.8)]), P([(6.6, 13), (7.5, 13.9), (9, 12.4)]), P([(6.6, 17.6), (7.5, 18.5), (9, 17)])],
    "inbox": [card(3, 8, 21, 19.4, 2.6), P([(3, 13.2), (8.2, 13.2), (10, 16), (14, 16), (15.8, 13.2), (21, 13.2)])],
    "git-diff": [R(2, 4, 10.5, 20, 1.6), R(13.5, 4, 22, 20, 1.6), L(4.6, 12, 8, 12), L(6.3, 10.3, 6.3, 13.7), L(16, 12, 19.4, 12)],
}



# 引擎暂未提供替换位的 5 枚，先按同一套语言画好留档。
PENDING = {
    "history": [C(12, 12, 6.6), L(12, 12, 12, 7.6), L(12, 12, 15.4, 13.6),
                P([(6.4, 6.2), (5.0, 6.2), (5.0, 4.8)]), P([(17.6, 17.8), (19.0, 17.8), (19.0, 19.2)])],
    "bookmark": [P([(7, 4), (17, 4), (17, 20), (12, 15.4), (7, 20)], True), diamond(12, 8.6, 1.6, True)],
    "quote": [P([(5, 8), (9.4, 8), (9.4, 12.4), (7.2, 16.4), (5.4, 15.4), (6.8, 12.4)], True),
              P([(12.6, 8), (17, 8), (17, 12.4), (14.8, 16.4), (13, 15.4), (14.4, 12.4)], True)],
    "volume": [card(3, 8, 9.4, 16, 1.8), L(9.4, 12, 13, 8), L(13, 8, 13, 16), L(13, 16, 9.4, 12),
               A(13.6, 12, 4.4, 4.4, -38, 38), A(13.6, 12, 7.4, 7.4, -32, 32)],
    "mute": [card(3, 8, 9.4, 16, 1.8), L(9.4, 12, 13, 8), L(13, 8, 13, 16), L(13, 16, 9.4, 12),
             L(15.4, 9.4, 20.6, 14.6), L(20.6, 9.4, 15.4, 14.6)],
}


def render(ops, color, scale=SUPER):
    img = Image.new("RGBA", (int(G * scale),) * 2, (0, 0, 0, 0))
    dr = ImageDraw.Draw(img)
    w = max(1, int(round(STROKE * scale)))
    col = color + (255,)

    def sc(pts):
        return [(x * scale, y * scale) for x, y in pts]

    for op in ops:
        k = op[0]
        if k == "line":
            _, x1, y1, x2, y2 = op
            dr.line([(x1 * scale, y1 * scale), (x2 * scale, y2 * scale)], fill=col, width=w)
            for x, y in [(x1, y1), (x2, y2)]:
                dr.ellipse([x * scale - w / 2, y * scale - w / 2, x * scale + w / 2, y * scale + w / 2], fill=col)
        elif k == "poly":
            _, pts, closed = op
            sp = sc(pts)
            if closed:
                sp = sp + [sp[0]]
            dr.line(sp, fill=col, width=w, joint="curve")
            for x, y in sp if not closed else sp[:-1]:
                dr.ellipse([x - w / 2, y - w / 2, x + w / 2, y + w / 2], fill=col)
        elif k == "fillpoly":
            dr.polygon(sc(op[1]), fill=col)
        elif k == "rect":
            _, x0, y0, x1, y1, r, fill = op
            box = [x0 * scale, y0 * scale, x1 * scale, y1 * scale]
            if fill:
                dr.rounded_rectangle(box, radius=r * scale, fill=col)
            else:
                dr.rounded_rectangle(box, radius=r * scale, outline=col, width=w)
        elif k == "circle":
            _, cx, cy, r, fill = op
            box = [(cx - r) * scale, (cy - r) * scale, (cx + r) * scale, (cy + r) * scale]
            if fill:
                dr.ellipse(box, fill=col)
            else:
                dr.ellipse(box, outline=col, width=w)
        elif k == "arc":
            _, cx, cy, rx, ry, s, e = op
            pts = [(cx + rx * math.cos(math.radians(s + (e - s) * i / 24)),
                    cy + ry * math.sin(math.radians(s + (e - s) * i / 24))) for i in range(25)]
            dr.line(sc(pts), fill=col, width=w, joint="curve")
    return img.resize((OUT_PX, OUT_PX), Image.LANCZOS)


def main():
    import sys
    here = pathlib.Path(__file__).resolve().parent
    assets = None
    if len(sys.argv) > 2 and sys.argv[1] == "--pending":
        target = pathlib.Path(sys.argv[2])
        target.mkdir(parents=True, exist_ok=True)
        for name, ops in PENDING.items():
            render(ops, LIGHT).save(target / f"{name}-light.png")
            render(ops, DARK).save(target / f"{name}-dark.png")
        print(f"wrote {len(PENDING)} pending icons to {target}")
        return
    if len(sys.argv) > 2 and sys.argv[1] == "--assets":
        assets = pathlib.Path(sys.argv[2])
        for name in ICONS:
            render(ICONS[name], LIGHT).save(assets / f"icon-{name}-light.png")
            render(ICONS[name], DARK).save(assets / f"icon-{name}-dark.png")
        print(f"wrote {len(ICONS)} themed icons to {assets}")
        return
    out = here.parent / "review/themed-sample"
    out.mkdir(parents=True, exist_ok=True)
    for name, ops in ICONS.items():
        render(ops, LIGHT).save(out / f"{name}-light.png")
        render(ops, DARK).save(out / f"{name}-dark.png")

    # 对照板：10 列 × N 行，每格纵向 24 / 20 / 16 px；上浅下深
    names = list(ICONS)
    cols, cell_w, cell_h, pad = 10, 62, 100, 18
    rows = (len(names) + cols - 1) // cols
    band_h = pad * 2 + rows * cell_h
    width = pad * 2 + cols * cell_w
    sheet = Image.new("RGB", (width, band_h * 2), (245, 240, 225))
    sheet.paste(Image.new("RGB", (width, band_h), (30, 22, 55)), (0, band_h))

    for mode, color, top in (("light", LIGHT, 0), ("dark", DARK, band_h)):
        for i, name in enumerate(names):
            cx = pad + (i % cols) * cell_w
            cy = top + pad + (i // cols) * cell_h
            for j, size in enumerate((24, 20, 16)):
                icon = render(ICONS[name], color, scale=8).resize((size, size), Image.LANCZOS)
                sheet.paste(icon, (cx + (24 - size) // 2 + 4, cy + j * 30 + (24 - size) // 2), icon)

    sheet.resize((sheet.width * 2, sheet.height * 2), Image.NEAREST).save(out / "qa-sheet.png")
    print("wrote", out, len(ICONS), "icons")


if __name__ == "__main__":
    main()
