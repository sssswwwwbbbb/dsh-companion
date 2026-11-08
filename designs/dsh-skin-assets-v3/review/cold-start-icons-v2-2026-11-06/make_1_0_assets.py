#!/usr/bin/env python3
"""1.0 增量素材：皮肤库封面、专用入口徽记、模型场景徽记

同一套「CS-07 面板语汇」：钢青结构 + 警示琥珀，全息青只给身份标记。
输出到 out/，由 apply_1_0_assets.mjs 写进皮肤包。
"""
from pathlib import Path
import subprocess

OUT = Path(__file__).resolve().parent / 'out'
OUT.mkdir(parents=True, exist_ok=True)

INK_L, INK_D = '#2F4154', '#E2ECF8'
ACC_L, ACC_D = '#B85108', '#FFB454'
ACC_L2 = '#E08A3C'
HOLO_L, HOLO_D = '#0E6A86', '#8FE6FA'
STEEL = '#7C93A8'


def render(name, svg, w, h):
    svg_path = OUT / f'{name}.svg'
    svg_path.write_text(svg)
    png = OUT / f'{name}.png'
    subprocess.run(['sips', '-s', 'format', 'png', str(svg_path), '--out', str(png)], check=True, capture_output=True)
    from PIL import Image
    im = Image.open(png)
    if im.size != (w, h):
        im = im.resize((w, h))
        im.save(png)
    svg_path.unlink()
    svg_path.write_text(svg)
    return png


def svg_doc(w, h, body):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}">'
            + ''.join(body) + '</svg>')


# ---------------------------------------------------------------- entry mark
def mark(ink, acc, holo):
    b = [f'<path d="M48 8 L74 22 L74 58 L48 74 L22 58 L22 22 Z" fill="none" stroke="{ink}" stroke-width="7" stroke-linejoin="miter"/>',
         f'<path d="M48 22 L64 48 L48 66 L32 48 Z" fill="{holo}" opacity="0.92"/>',
         f'<path d="M22 66 L40 84" stroke="{acc}" stroke-width="8" stroke-linecap="butt"/>',
         f'<path d="M48 8 L48 0" stroke="{ink}" stroke-width="6"/>']
    return svg_doc(96, 96, b)


# ---------------------------------------------------------------- cover
def cover():
    W, H = 1440, 900
    b = [
        f'<rect width="{W}" height="{H}" fill="#0C1622"/>',
        # panel grid
        ''.join(f'<path d="M0 {y} H{W}" stroke="#1B2C3F" stroke-width="1"/>' for y in range(60, H, 60)),
        ''.join(f'<path d="M{x} 0 V{H}" stroke="#1B2C3F" stroke-width="1"/>' for x in range(60, W, 60)),
        # atmospheric glow
        f'<circle cx="430" cy="380" r="330" fill="#17627D" opacity="0.20"/>',
        f'<circle cx="1180" cy="640" r="240" fill="#B85108" opacity="0.13"/>',
        # outer chamfered frame
        f'<path d="M70 70 H1370 L1370 790 L1330 830 H70 Z" fill="none" stroke="#3C5670" stroke-width="3"/>',
        f'<path d="M70 70 H1370 L1370 790 L1330 830 H70 Z" fill="none" stroke="#0C1622" stroke-width="1"/>',
        # hazard block
        ''.join(f'<path d="M{60 + i * 34} 830 L{110 + i * 34} 780" stroke="#B85108" stroke-width="14"/>' for i in range(5)),
        # unit mark
        f'<path d="M470 300 L650 210 L830 300 L830 540 L650 640 L470 540 Z" fill="none" stroke="{INK_D}" stroke-width="10" stroke-linejoin="miter"/>',
        f'<path d="M650 360 L740 470 L650 560 L560 470 Z" fill="{HOLO_D}" opacity="0.95"/>',
        ''.join(f'<path d="M{470 + i * 46} 700 L{510 + i * 46} 660" stroke="{ACC_D}" stroke-width="12"/>' for i in range(6)),
        # corner ticks
        ''.join(f'<path d="{d}" stroke="#5C7A94" stroke-width="4"/>' for d in
                ['M110 110 h60', 'M110 110 v60', 'M1330 110 h-60', 'M1330 110 v60',
                 'M110 790 h60', 'M110 790 v-60']),
        # type
        f'<text x="960" y="330" font-family="STHeiti" font-size="118" fill="{INK_D}" letter-spacing="6">单元-07</text>',
        f'<text x="960" y="410" font-family="STHeiti" font-size="40" fill="#7C93A8" letter-spacing="14">CS-07 · 冷启动</text>',
        f'<text x="960" y="700" font-family="STHeiti" font-size="22" fill="#B85108" letter-spacing="7">COLD START PROTOCOL</text>',
    ]
    return svg_doc(W, H, b)


# ---------------------------------------------------------------- badges
def badge(kind):
    """256 px scene badge: dark steel disc, brushed rim, role glyph.

    The badge is shown in the workspace footer at roughly 20-24 px, so the
    silhouette (disc + rim + one solid glyph) has to survive that downscale.
    """
    disc = ('<circle cx="128" cy="128" r="118" fill="#243645" opacity="0.94"/>'
            f'<circle cx="128" cy="128" r="118" fill="none" stroke="{STEEL}" stroke-width="9"/>'
            f'<circle cx="128" cy="128" r="96" fill="none" stroke="{STEEL}" stroke-width="3" opacity="0.55"/>')
    ticks = ''.join(f'<path d="{d}" stroke="{STEEL}" stroke-width="7"/>' for d in
                    ['M128 10 v18', 'M128 228 v18', 'M10 128 h18', 'M228 128 h18'])
    if kind == 'swift':
        glyph = (f'<path d="M142 48 L84 136 H120 L110 208 L180 110 H138 Z" fill="{ACC_D}"/>'
                 f'<path d="M142 48 L84 136 H100 L150 62 Z" fill="{ACC_L2}" opacity="0.9"/>')
    elif kind == 'deep':
        glyph = (f'<path d="M128 62 L186 96 L186 160 L128 194 L70 160 L70 96 Z" fill="none" stroke="{INK_D}" stroke-width="10"/>'
                 f'<path d="M128 92 L156 108 L156 148 L128 164 L100 148 L100 108 Z" fill="{HOLO_D}" opacity="0.95"/>'
                 f'<circle cx="128" cy="128" r="14" fill="{HOLO_L}" opacity="0.55"/>')
    else:
        glyph = (f'<circle cx="128" cy="128" r="62" fill="none" stroke="{INK_D}" stroke-width="10"/>'
                 f'<path d="M128 44 v26 M128 186 v26 M44 128 h26 M186 128 h26" stroke="{INK_D}" stroke-width="10"/>'
                 f'<circle cx="128" cy="128" r="20" fill="{ACC_D}"/>')
    return svg_doc(256, 256, [disc, ticks, glyph])


def main():
    render('mark-light', mark(INK_L, ACC_L, HOLO_L), 96, 96)
    render('mark-dark', mark(INK_D, ACC_D, HOLO_D), 96, 96)
    render('skin-cover', cover(), 1440, 900)
    for kind in ('swift', 'deep', 'final'):
        render(f'badge-{kind}', badge(kind), 256, 256)
    print('wrote:', sorted(p.name for p in OUT.glob('*.png')))


if __name__ == '__main__':
    main()
