#!/usr/bin/env python3
"""CS-07 面板语汇 · 冷启动皮肤图标 v2

Generates the 56 light/dark icon pairs for `archive-workspace-r2-private`.

Design language (deliberately *not* DSH's own glyph vocabulary):
  - steel ink + one hazard-amber accent element per icon;
  - chamfered "mechanical panel" silhouettes, miter joins, butt caps;
  - the three CS-07 unit icons (companion / agent / model) carry the
    holographic cyan accent instead, as the unit's identity mark.

Legibility constraint: the icon is painted as a CSS background on a 16 px
`<svg>`, so every shape is drawn on a 96 px grid with 9,   i.e. 1.5 px at the
rendered size, and details are kept to a single accent mass. Fine texture would
turn to mush at 16 px, so the "面板 / 全息 / 警示" feel comes from silhouette and
colour, not from hatching.
"""
from pathlib import Path
import subprocess

OUT = Path(__file__).resolve().parent / 'png'
S = 96
K = S / 100.0
INK = dict(light='#2F4154', dark='#E2ECF8')
ACC = dict(light='#B85108', dark='#FFB454')
HOLO = dict(light='#0E6A86', dark='#8FE6FA')

W = 11         # main stroke
W2 = 9         # secondary stroke
CH = 12        # chamfer


# ---------------------------------------------------------------- primitives
def p(points, w=W, c='ink', ch=None):
    """Polyline in the current palette."""
    d = 'M' + ' L'.join(f'{x} {y}' for x, y in points)
    return f'<path d="{d}" fill="none" stroke="{c}" stroke-width="{ch or w}" stroke-linecap="butt" stroke-linejoin="miter"/>'


def closed(points, w=W, c='ink'):
    d = 'M' + ' L'.join(f'{x} {y}' for x, y in points) + ' Z'
    return f'<path d="{d}" fill="none" stroke="{c}" stroke-width="{w}" stroke-linejoin="miter"/>'


def fill(points, c='accent'):
    d = 'M' + ' L'.join(f'{x} {y}' for x, y in points) + ' Z'
    return f'<path d="{d}" fill="{c}" stroke="none"/>'


def panel(x=14, y=14, w=68, h=68, ch=CH, sw=W, c='ink', cut=('tl', 'br')):
    """Chamfered panel rectangle: only the named corners are cut."""
    x2, y2 = x + w, y + h
    pts = []
    pts.append((x + ch, y) if 'tl' in cut else (x, y))
    pts.append((x2 - ch, y) if 'tr' in cut else (x2, y))
    if 'tr' in cut:
        pts.append((x2, y + ch))
    pts.append((x2, y2 - ch) if 'br' in cut else (x2, y2))
    if 'br' in cut:
        pts.append((x2 - ch, y2))
    pts.append((x + ch, y2) if 'bl' in cut else (x, y2))
    if 'bl' in cut:
        pts.append((x, y2 - ch))
    pts.append((x, y + ch) if 'tl' in cut else (x, y))
    return closed(pts, w=sw, c=c)


def octagon(cx, cy, r, w=W, c='ink', k=0.42):
    kk = r * k
    pts = [(cx - r, cy - kk), (cx - r, cy + kk), (cx - kk, cy + r), (cx + kk, cy + r),
           (cx + r, cy + kk), (cx + r, cy - kk), (cx + kk, cy - r), (cx - kk, cy - r)]
    return closed(pts, w=w, c=c)


def arc(cx, cy, r, a0, a1, w=W, c='ink'):
    import math
    x0, y0 = cx + r * math.cos(math.radians(a0)), cy + r * math.sin(math.radians(a0))
    x1, y1 = cx + r * math.cos(math.radians(a1)), cy + r * math.sin(math.radians(a1))
    large = 1 if (a1 - a0) % 360 > 180 else 0
    return (f'<path d="M{x0:.2f} {y0:.2f} A{r} {r} 0 {large} 1 {x1:.2f} {y1:.2f}" '
            f'fill="none" stroke="{c}" stroke-width="{w}" stroke-linecap="butt"/>')


def bar(x, y, w, h, c='accent'):
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{c}" stroke="none"/>'


def dot(cx, cy, r, c='accent'):
    # +2 keeps every accent dot readable once the icon is painted at 16 px
    return f'<circle cx="{cx}" cy="{cy}" r="{r + 2}" fill="{c}" stroke="none"/>'


# ---------------------------------------------------------------- icon set
def i_workspace():
    return [panel(), bar(20, 24, 10, 48), p([(42, 40), (68, 40)]), p([(42, 58), (60, 58)])]


def i_compose():
    return [p([(16, 72), (44, 72)], w=W2),
            p([(20, 62), (58, 24)], w=14),
            fill([(50, 32), (66, 8), (86, 28), (62, 44)])]


def i_conversation():
    return [closed([(14, 22), (66, 22), (78, 34), (78, 58), (24, 58), (14, 48)]),
            p([(24, 58), (24, 76), (44, 58)], w=W),
            bar(26, 32, 30, 8)]


def i_history():
    return [arc(48, 50, 26, 120, 400, w=10),
            p([(48, 50), (48, 30)], w=10), p([(48, 50), (64, 58)], w=10),
            dot(48, 50, 6)]


def i_search():
    return [octagon(42, 42, 24), p([(60, 60), (78, 78)]), dot(42, 42, 6)]


def i_panel_left():
    return [panel(cut=('tl', 'br')), p([(36, 16), (36, 80)]), bar(22, 26, 10, 44)]


def i_folder():
    return [closed([(12, 32), (12, 80), (84, 80), (84, 40), (48, 40), (40, 26), (24, 26), (12, 38)]),
            bar(24, 52, 24, 8)]


def i_folder_open():
    return [closed([(14, 32), (14, 76), (86, 76), (86, 40), (44, 40), (36, 28), (22, 28), (14, 32)]), p([(24, 76), (36, 56), (86, 56)]), bar(30, 66, 20, 6)]


def i_pin():
    return [octagon(48, 36, 20, k=0.5), p([(48, 56), (48, 82)]), fill([(32, 30), (64, 30), (64, 40), (32, 40)])]


def i_bookmark():
    return [closed([(28, 14), (68, 14), (76, 20), (76, 82), (48, 64), (20, 82), (20, 20)]), fill([(34, 24), (62, 24), (62, 32), (34, 32)])]


def i_archive():
    return [closed([(16, 22), (80, 22), (80, 42), (16, 42)]), closed([(24, 42), (72, 42), (72, 80), (24, 80)]), fill([(22, 26), (74, 26), (74, 34), (22, 34)]), p([(38, 58), (58, 58)])]


def i_more():
    return [dot(20, 48, 6, c='ink'), dot(48, 48, 6), dot(76, 48, 6, c='ink')]


def i_attachment():
    return [p([(26, 70), (26, 26), (58, 26), (58, 54)], w=10),
            p([(44, 14), (44, 44), (50, 50), (56, 44), (56, 30)], w=W),
            fill([(20, 74), (34, 74), (34, 60), (20, 60)])]


def i_link():
    return [octagon(36, 48, 21, w=10, k=0.55), octagon(60, 48, 21, w=10, k=0.55),
            f'<rect x="44" y="43" width="8" height="10" fill="accent" stroke="none"/>']


def i_quote():
    return [closed([(18, 26), (44, 26), (44, 52), (30, 52), (18, 68)]),
            closed([(54, 26), (80, 26), (80, 52), (66, 52), (54, 68)]),
            fill([(24, 32), (38, 32), (38, 44), (24, 44)])]


def i_copy():
    return [closed([(20, 20), (58, 20), (58, 62), (20, 62)]), closed([(36, 34), (76, 34), (76, 78), (36, 78)]), fill([(36, 34), (76, 34), (76, 44), (36, 44)])]


def i_retry():
    return [arc(48, 48, 26, 300, 620, w=10),
            fill([(64, 14), (88, 20), (66, 34)])]


def i_edit():
    return [p([(20, 64), (20, 76), (72, 76)]), p([(32, 58), (38, 38), (62, 16)]), p([(32, 58), (52, 52)]), fill([(56, 22), (68, 10), (76, 20), (64, 32)])]


def i_branch():
    return [p([(28, 20), (28, 76)]), p([(28, 40), (56, 40), (68, 28), (68, 18)]), dot(28, 20, 9), dot(68, 18, 9), dot(28, 78, 9), dot(68, 78, 9), p([(68, 78), (68, 52)])]


def i_send():
    return [closed([(10, 48), (86, 16), (58, 84), (44, 56)]), p([(44, 56), (86, 16)], w=W2), fill([(10, 48), (44, 56), (38, 46)])]


def i_stop():
    return [closed([(16, 16), (68, 16), (80, 28), (80, 80), (28, 80), (16, 68)], w=W),
            fill([(30, 30), (66, 30), (66, 66), (30, 66)])]


def i_chevron_down():
    return [p([(22, 28), (48, 54), (74, 28)], w=11), dot(48, 68, 7)]


def i_chevron_right():
    return [p([(28, 22), (54, 48), (28, 74)], w=11), dot(68, 48, 7)]


def i_plus():
    return [p([(18, 48), (78, 48)]), p([(48, 18), (48, 78)]), bar(40, 40, 16, 16)]


def sheet(extra):
    body = [closed([(22, 14), (62, 14), (74, 26), (74, 82), (22, 82)]), p([(62, 14), (62, 26), (74, 26)])]
    return body + extra


def i_file_text():
    return sheet([p([(32, 44), (62, 44)]), p([(32, 56), (62, 56)]), p([(32, 68), (52, 68)]), fill([(62, 14), (74, 26), (62, 26)])])


def i_file_code():
    return sheet([p([(40, 44), (30, 56), (40, 68)]), p([(56, 44), (66, 56), (56, 68)]), bar(46, 56, 8, 2)])


def i_file_image():
    return sheet([closed([(28, 52), (40, 40), (52, 52), (62, 42), (68, 48)], w=7), dot(60, 36, 5), p([(28, 74), (68, 74)], w=7)])


def i_file_table():
    return sheet([p([(28, 46), (68, 46)], w=7), p([(28, 60), (68, 60)], w=7), p([(28, 74), (68, 74)], w=7), p([(42, 46), (42, 74)], w=7), fill([(46, 60), (64, 60), (64, 70), (46, 70)])])


def i_terminal():
    return [p([(20, 24), (48, 48), (20, 72)], w=13), p([(56, 72), (80, 72)], w=11),
            bar(52, 20, 28, 12)]


def i_external():
    return [closed([(20, 32), (20, 76), (64, 76), (64, 62)]), p([(44, 26), (80, 26), (80, 62)]), p([(40, 66), (80, 26)]), fill([(62, 26), (80, 26), (80, 44)])]


def i_check():
    return [p([(18, 50), (38, 70), (78, 26)]), dot(26, 26, 6)]


def i_clock():
    return [octagon(48, 48, 30), p([(48, 28), (48, 50), (62, 58)]), dot(48, 48, 5)]


def i_alert():
    return [closed([(48, 12), (86, 78), (10, 78)]), p([(48, 34), (48, 54)]), dot(48, 66, 5)]


def i_info():
    return [octagon(48, 48, 30), p([(48, 42), (48, 66)]), dot(48, 30, 5)]


def i_play():
    return [closed([(24, 16), (80, 48), (24, 80)]), fill([(36, 34), (62, 48), (36, 62)])]


def i_pause():
    return [bar(26, 18, 14, 60, c='ink'), bar(58, 18, 14, 60, c='ink'), bar(44, 40, 8, 16)]


def i_close():
    return [p([(22, 22), (74, 74)]), p([(74, 22), (22, 74)]), dot(48, 48, 8)]


def i_settings():
    return [octagon(48, 48, 30, w=12, k=0.5),
            octagon(48, 48, 16, w=9, k=0.5),
            fill([(38, 38), (58, 38), (58, 58), (38, 58)])]


def i_sliders():
    return [p([(18, 30), (78, 30)]), p([(18, 62), (78, 62)]), bar(30, 18, 14, 24, c='ink'), fill([(30, 18), (44, 18), (44, 42), (30, 42)]), bar(58, 50, 14, 24, c='ink'), fill([(58, 50), (72, 50), (72, 74), (58, 74)])]


def i_sun():
    import math
    out = []
    for a in range(0, 360, 45):
        dx, dy = math.cos(math.radians(a)), math.sin(math.radians(a))
        out.append(p([(48 + dx * 22, 48 + dy * 22), (48 + dx * 40, 48 + dy * 40)], w=11))
    out.append(fill([(30, 30), (66, 30), (66, 66), (30, 66)]))
    return out


def i_moon():
    outer = ('M60 12 C 26 24 26 72 60 84 C 40 70 40 26 60 12 Z')
    return [f'<path d="{outer}" fill="ink" stroke="none"/>', dot(74, 24, 7)]


def i_palette():
    return [octagon(48, 48, 30, w=12, k=0.45),
            dot(36, 36, 6, c='ink'), dot(60, 36, 6, c='ink'),
            dot(48, 60, 6, c='ink'), dot(48, 48, 8)]


def i_companion():
    return [octagon(48, 52, 28, k=0.45),
            p([(48, 24), (48, 12)], w=8), p([(34, 16), (48, 12), (62, 16)], w=8),
            fill([(34, 42), (62, 42), (62, 54), (34, 54)], c='holo')]


def i_volume():
    return [closed([(20, 38), (36, 38), (56, 22), (56, 74), (36, 58), (20, 58)]), arc(64, 48, 12, -50, 50, w=8), arc(64, 48, 22, -50, 50, w=8), fill([(26, 44), (36, 44), (36, 52), (26, 52)])]


def i_mute():
    return [closed([(20, 38), (36, 38), (56, 22), (56, 74), (36, 58), (20, 58)]), p([(66, 36), (84, 60)], w=9), p([(84, 36), (66, 60)], w=9), fill([(26, 44), (36, 44), (36, 52), (26, 52)])]


def i_download():
    return [p([(48, 14), (48, 58)]), p([(26, 40), (48, 62), (70, 40)]), p([(18, 74), (78, 74)]), fill([(38, 34), (58, 34), (48, 50)])]


def i_shield():
    return [closed([(48, 12), (82, 26), (78, 58), (48, 84), (18, 58), (14, 26)]), p([(34, 44), (46, 56), (64, 34)]), fill([(48, 12), (82, 26), (80, 34), (48, 21), (16, 34), (14, 26)])]


def i_expand():
    return [p([(20, 34), (20, 20), (34, 20)]), p([(62, 20), (76, 20), (76, 34)]), p([(76, 62), (76, 76), (62, 76)]), p([(34, 76), (20, 76), (20, 62)]), dot(48, 48, 8)]


def i_plugin():
    return [closed([(16, 34), (36, 22), (60, 22), (80, 34), (80, 62), (60, 74), (36, 74), (16, 62)]),
            fill([(34, 38), (62, 38), (62, 58), (34, 58)]),
            p([(48, 74), (48, 88)], w=8)]


def i_skill():
    return [p([(48, 12), (48, 84)], w=11), p([(14, 30), (82, 66)], w=11), p([(82, 30), (14, 66)], w=11),
            fill([(40, 40), (56, 40), (56, 56), (40, 56)])]


def i_model():
    return [closed([(12, 34), (48, 12), (84, 34), (48, 56)], w=W),
            p([(12, 34), (12, 62), (48, 84)], w=W),
            p([(84, 34), (84, 62), (48, 84)], w=W),
            fill([(48, 22), (68, 34), (48, 46), (28, 34)], c='holo')]


def i_agent():
    return [closed([(22, 34), (32, 16), (64, 16), (74, 34), (74, 62), (48, 84), (22, 62)]),
            fill([(34, 40), (62, 40), (62, 54), (34, 54)], c='holo')]


def i_question():
    return [octagon(48, 48, 30), p([(38, 34), (48, 28), (58, 34), (58, 42), (48, 50), (48, 58)]), dot(48, 70, 5)]


def i_plan():
    return [p([(16, 30), (24, 38), (40, 20)], w=11), p([(16, 56), (24, 64), (40, 46)], w=11),
            p([(56, 32), (84, 32)], w=W), p([(56, 54), (78, 54)], w=W),
            bar(54, 70, 30, 12)]


def i_inbox():
    return [closed([(16, 34), (30, 20), (66, 20), (80, 34), (80, 72), (16, 72)]), p([(16, 52), (36, 52), (42, 60), (54, 60), (60, 52), (80, 52)]), fill([(34, 30), (62, 30), (62, 38), (34, 38)])]


def i_git_diff():
    return [p([(28, 24), (28, 72)]), p([(28, 72), (60, 72)]), dot(28, 22, 9), dot(28, 74, 9), dot(64, 72, 9), p([(64, 24), (64, 56)], w=7), dot(64, 22, 9), fill([(46, 44), (58, 44), (58, 52), (46, 52)])]


ICONS = {
    'workspace': i_workspace, 'compose': i_compose, 'conversation': i_conversation,
    'history': i_history, 'search': i_search, 'panel-left': i_panel_left,
    'folder': i_folder, 'folder-open': i_folder_open, 'pin': i_pin,
    'bookmark': i_bookmark, 'archive': i_archive, 'more': i_more,
    'attachment': i_attachment, 'link': i_link, 'quote': i_quote,
    'copy': i_copy, 'retry': i_retry, 'edit': i_edit, 'branch': i_branch,
    'send': i_send, 'stop': i_stop, 'chevron-down': i_chevron_down,
    'chevron-right': i_chevron_right, 'plus': i_plus, 'file-text': i_file_text,
    'file-code': i_file_code, 'file-image': i_file_image, 'file-table': i_file_table,
    'terminal': i_terminal, 'external': i_external, 'check': i_check,
    'clock': i_clock, 'alert': i_alert, 'info': i_info, 'play': i_play,
    'pause': i_pause, 'close': i_close, 'settings': i_settings,
    'sliders': i_sliders, 'sun': i_sun, 'moon': i_moon, 'palette': i_palette,
    'companion': i_companion, 'volume': i_volume, 'mute': i_mute,
    'download': i_download, 'shield': i_shield, 'expand': i_expand,
    'plugin': i_plugin, 'skill': i_skill, 'model': i_model, 'agent': i_agent,
    'question': i_question, 'plan': i_plan, 'inbox': i_inbox, 'git-diff': i_git_diff,
}


def render(name, mode):
    palette = {
        'ink': INK[mode], 'accent': ACC[mode], 'holo': HOLO[mode],
    }
    body = ['<g transform="translate(48 48) scale(1.07) translate(-48 -48)">']
    for part in ICONS[name]():
        for slot, value in palette.items():
            part = part.replace(f'="{slot}"', f'="{value}"')
        body.append(part)
    body.append('</g>')
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" width="384" height="384">'
           + ''.join(body) + '</svg>')
    return svg


def main():
    from PIL import Image
    for mode in ('light', 'dark'):
        (OUT / mode).mkdir(parents=True, exist_ok=True)
    for name in ICONS:
        for mode in ('light', 'dark'):
            svg_path = OUT / f'{name}-{mode}.svg'
            svg_path.write_text(render(name, mode))
            png_hi = OUT / f'{name}-{mode}.png'
            subprocess.run(['sips', '-s', 'format', 'png', str(svg_path), '--out', str(png_hi)],
                           check=True, capture_output=True)
            im = Image.open(png_hi).convert('RGBA')
            im.resize((S, S), Image.LANCZOS).save(OUT / mode / f'{name}.png')
            png_hi.unlink()
            svg_path.unlink()
    print('rendered', len(ICONS) * 2, 'icons ->', OUT)


if __name__ == '__main__':
    main()
