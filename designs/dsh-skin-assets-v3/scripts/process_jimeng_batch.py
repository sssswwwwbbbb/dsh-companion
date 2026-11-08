#!/usr/bin/env python3
"""Preserve received originals and produce reviewable local alpha candidates."""
from pathlib import Path
import hashlib
import json
import os
import shutil
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[3]
BASE = ROOT / 'designs/dsh-skin-assets-v3'
os.environ['U2NET_HOME'] = str(ROOT / '.local/dsh-matting-models')

import numpy as np
from PIL import Image, ImageDraw, ImageFont
from rembg import new_session, remove

session = new_session('u2net', providers=['CPUExecutionProvider'])
specs = [
    ('walk-a', 2, 'character', 'left-three-quarter', 'single contact keypose; gait cycle pending'),
    ('climb-a', 4, 'character', 'left-three-quarter', 'single grip keypose with guide bar; cycle pending'),
    ('run-a', 5, 'character', 'left-three-quarter', 'single flight keypose; gait cycle pending'),
    ('lie-a', 6, 'character', 'left', 'pose candidate; cel-shaded style and shoe design drift reported'),
]
outputs = []


def rel(path):
    return str(path.relative_to(ROOT))


def save_json(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')


def matte(source, target, asset_id, details):
    with Image.open(source) as image:
        rgba = remove(image.convert('RGB'), session=session, alpha_matting=True, alpha_matting_erode_size=8)
    target.parent.mkdir(parents=True, exist_ok=True)
    rgba.save(target)
    alpha = np.asarray(rgba.getchannel('A'))
    bbox = rgba.getchannel('A').getbbox()
    record = dict(details, id=asset_id, source=rel(source), file=rel(target), size=list(rgba.size), mode=rgba.mode,
                  alpha_bbox=list(bbox) if bbox else None,
                  alpha_extrema=[int(alpha.min()), int(alpha.max())],
                  corner_alphas=[int(alpha[0, 0]), int(alpha[0, -1]), int(alpha[-1, 0]), int(alpha[-1, -1])],
                  transparent_pixels=int((alpha == 0).sum()), semi_transparent_pixels=int(((alpha > 0) & (alpha < 255)).sum()),
                  sha256=hashlib.sha256(target.read_bytes()).hexdigest(),
                  status='candidate-awaiting-visual-review', animated=False, loop=False)
    outputs.append(record)
    save_json(BASE / 'review/processed-batch-02.json', {'status': 'processing', 'assets': outputs})
    print(json.dumps({'id': asset_id, 'file': rel(target), 'bbox': bbox}, ensure_ascii=False), flush=True)


for asset_id, number, category, facing, notes in specs:
    incoming = ROOT / f'素材/图片+{number}.png'
    source = BASE / f'assets/{category}/jimeng-{asset_id}-source.png'
    shutil.copy2(incoming, source)
    assert hashlib.sha256(source.read_bytes()).digest() == hashlib.sha256(incoming.read_bytes()).digest()
    matte(source, BASE / f'assets/{category}/jimeng-{asset_id}-cutout-candidate.png', asset_id,
          {'role': 'action-keypose', 'facing': facing, 'review_note': notes,
           'source_original': rel(incoming), 'identity_parent': 'jimeng-flash-master-04',
           'visual_adoption': 'review-pending' if asset_id != 'lie-a' else 'style-drift-reported',
           'requires_cycle_frames': asset_id != 'lie-a',
           'guide_included': asset_id == 'climb-a'})

sheet = BASE / 'assets/theme/jimeng-props-01-source.png'
shutil.copy2(ROOT / '素材/图片+3.png', sheet)
with Image.open(sheet) as opened:
    sheet_image = opened.convert('RGB')
for asset_id, bounds, anchor in [
    ('book', (0, 0, 1024, 1024), 'bottom-center; grip at fore-edge'),
    ('cup', (1024, 0, 2048, 1024), 'bottom-center; grip at handle'),
    ('cushion', (0, 1024, 1024, 2048), 'bottom-center; top-center seat surface'),
    ('blanket', (1024, 1024, 2048, 2048), 'bottom-center; folded form only'),
]:
    source = BASE / f'assets/theme/jimeng-{asset_id}-source-crop.png'
    sheet_image.crop(bounds).save(source)
    matte(source, BASE / f'assets/theme/jimeng-{asset_id}-cutout-candidate.png', asset_id,
          {'role': 'independent-prop', 'source_sheet': rel(sheet), 'source_crop': list(bounds),
           'anchor_intent': anchor, 'visual_adoption': 'review-pending'})

font = ImageFont.truetype('/System/Library/Fonts/STHeiti Medium.ttc', 20)
board = Image.new('RGB', (1680, 1360), '#eeeae2')
draw = ImageDraw.Draw(board)
for i, item in enumerate(outputs):
    x = (i % 4) * 420
    y = (i // 4) * 680
    draw.text((x + 12, y + 12), item['id'], font=font, fill='#253344')
    with Image.open(ROOT / item['file']) as opened:
        rgba = opened.convert('RGBA')
        bbox = rgba.getchannel('A').getbbox()
        if bbox:
            rgba = rgba.crop(bbox)
        rgba.thumbnail((370, 590), Image.Resampling.LANCZOS)
        background = Image.new('RGBA', (400, 620), '#192534')
        background.alpha_composite(rgba, ((400 - rgba.width) // 2, (620 - rgba.height) // 2))
    board.paste(background.convert('RGB'), (x + 10, y + 48))
board.save(BASE / 'review/processed-batch-02-contact.jpg', quality=94)
save_json(BASE / 'review/processed-batch-02.json', {
    'status': 'candidate-awaiting-visual-review', 'created_at': datetime.now(timezone.utc).isoformat(),
    'tool': 'rembg 2.0.57 / u2net / local CPU alpha matting', 'assets': outputs,
    'source_originals_preserved': True, 'animation_cycles_created': False,
    'side_lie_style_drift_reported': True,
})
print('Batch alpha candidates complete; visual review pending.', flush=True)
