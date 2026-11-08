#!/usr/bin/env python3
"""Refine warm-gray matte residue and export bounded, engine-neutral PNGs."""
from pathlib import Path
import hashlib
import json
from datetime import datetime, timezone
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[3]
BASE = ROOT / 'designs/dsh-skin-assets-v3'
OUT = BASE / 'assets/prepared'
OUT.mkdir(exist_ok=True)
records = json.loads((BASE / 'review/processed-batch-02.json').read_text())['assets']
records = [
    {'id': 'master-04', 'file': 'designs/dsh-skin-assets-v3/assets/character/jimeng-flash-master-04-cutout-candidate.png', 'source': 'designs/dsh-skin-assets-v3/assets/character/jimeng-flash-master-04-source.png', 'role': 'character-base', 'facing': 'front'},
    {'id': 'sit-01', 'file': 'designs/dsh-skin-assets-v3/assets/character/jimeng-sit-01-cutout-candidate.png', 'source': 'designs/dsh-skin-assets-v3/assets/character/jimeng-sit-01-source.png', 'role': 'pose-with-stool', 'facing': 'left-three-quarter'},
] + records

source_points = {
    'master-04': {'ground': [835, 2450]},
    'sit-01': {'ground': [650, 2450], 'lap': [635, 1420], 'hand_left': [520, 1355], 'hand_right': [690, 1360]},
    'walk-a': {'ground': [780, 2460]},
    'run-a': {'ground': [860, 2470]},
    'climb-a': {'support_top_grip': [555, 200], 'support_low_grip': [555, 720], 'support_raised_foot': [585, 1865], 'support_low_foot': [585, 2350]},
}


def smoothstep(low, high, data):
    t = np.clip((data - low) / (high - low), 0, 1)
    return t * t * (3 - 2 * t)


def refine(rgba, source, asset_id):
    pixels = np.asarray(source.convert('RGB'), dtype=np.float32)
    result = np.asarray(rgba.convert('RGBA')).copy()
    # The received images have a smooth warm-gray backdrop. Estimate it from
    # unobstructed side borders, not from character colors or a new rendering.
    edge = min(24, pixels.shape[1] // 40)
    left = np.median(pixels[:, :edge], axis=1)
    right = np.median(pixels[:, -edge:], axis=1)
    left = cv2.GaussianBlur(left[:, None, :], (1, 31), 0)[:, 0, :]
    right = cv2.GaussianBlur(right[:, None, :], (1, 31), 0)[:, 0, :]
    position = np.linspace(0, 1, pixels.shape[1])[None, :, None]
    background = left[:, None, :] * (1 - position) + right[:, None, :] * position
    distance = np.sqrt(np.sum((pixels - background) ** 2, axis=2))
    r, g, b = pixels[..., 0], pixels[..., 1], pixels[..., 2]
    blue = smoothstep(8, 24, b - np.maximum(r, g))
    keep = np.maximum(smoothstep(16, 40, distance), blue)
    skin = (r - g > 11) & (r - b > 17) & (distance > 10)
    keep[skin] = 1
    # Restrict gray suppression to the loose hair perimeter. Neutral cloth,
    # skin, the face, and prop surfaces must not become transparent merely
    # because their shaded color resembles the background.
    limits = {
        'master-04': (620, 1080, 1850), 'sit-01': (440, 1050, 1850),
        'walk-a': (600, 1100, 1800), 'run-a': (-1, 1050, 1800),
        'climb-a': (-1, 1150, 1850),
    }
    left_limit, right_limit, bottom_limit = limits[asset_id]
    ys, xs = np.mgrid[:pixels.shape[0], :pixels.shape[1]]
    hair_perimeter = ((xs < left_limit) | (xs > right_limit)) & (ys < bottom_limit)
    keep[~hair_perimeter] = 1
    old_alpha = result[..., 3].astype(np.float32)
    result[..., 3] = np.rint(old_alpha * keep).astype(np.uint8)
    # Pixels already cut out remain cut out; foreground RGB is not repainted.
    assert np.all(result[..., 3] <= rgba.getchannel('A'))
    assert np.array_equal(result[..., :3], np.asarray(rgba)[..., :3])
    return Image.fromarray(result), int(np.count_nonzero(old_alpha != result[..., 3]))


assets = []
comparison = {}
for item in records:
    asset_id = item['id']
    with Image.open(ROOT / item['file']) as image:
        old = image.convert('RGBA')
    with Image.open(ROOT / item['source']) as source:
        if asset_id == 'lie-a' or item['role'] == 'independent-prop':
            cleaned, changed = old.copy(), 0
        else:
            cleaned, changed = refine(old, source, asset_id)
    clean_path = OUT / (asset_id + '-full.png')
    cleaned.save(clean_path)
    bounds = cleaned.getchannel('A').getbbox()
    if not bounds:
        raise RuntimeError('Empty foreground: ' + asset_id)
    padding = 32 if item['role'] != 'independent-prop' else 20
    x0, y0, x1, y1 = bounds
    points = source_points.get(asset_id, {})
    if 'ground' in points:
        y1 = max(y1, points['ground'][1])
    crop = [x0 - padding, y0 - padding, x1 + padding, y1 + padding]
    native = cleaned.crop(crop)
    max_edge = 512 if item['role'] == 'independent-prop' else 1024
    factor = min(1, max_edge / max(native.size))
    native = native.resize((round(native.width * factor), round(native.height * factor)), Image.Resampling.LANCZOS)
    path = OUT / (asset_id + '.png')
    native.save(path)
    local_points = {name: [round((x - crop[0]) * factor, 2), round((y - crop[1]) * factor, 2)] for name, (x, y) in points.items()}
    if item['role'] == 'independent-prop':
        local_points['ground'] = [round(native.width / 2, 2), native.height - round(padding * factor)]
    if asset_id == 'book':
        local_points['grip'] = [round(native.width * .72, 2), round(native.height * .7, 2)]
    if asset_id == 'cup':
        local_points['grip'] = [round(native.width * .88, 2), round(native.height * .48, 2)]
    alpha = np.asarray(native.getchannel('A'))
    assets.append({
        'id': asset_id, 'source': item['source'], 'alpha_input': item['file'],
        'full_alpha': str(clean_path.relative_to(ROOT)), 'file': str(path.relative_to(ROOT)),
        'role': item['role'], 'source_size': list(cleaned.size), 'source_alpha_bounds': list(bounds),
        'source_crop': crop, 'prepared_size': list(native.size), 'mode': native.mode,
        'sha256': hashlib.sha256(path.read_bytes()).hexdigest(), 'bytes': path.stat().st_size,
        'alpha_extrema': [int(alpha.min()), int(alpha.max())],
        'corner_alphas': [int(alpha[0,0]),int(alpha[0,-1]),int(alpha[-1,0]),int(alpha[-1,-1])],
        'semi_transparent_pixels': int(((alpha > 0) & (alpha < 255)).sum()),
        'matte_pixels_refined': changed, 'rgb_pixels_repainted': False,
        'anchors': local_points, 'anchor_basis': 'visual placement estimates; native fit pending',
        'facing': item.get('facing'), 'mirror_safety': 'unreviewed; asymmetric headpiece' if item['role'] != 'independent-prop' else None,
        'animation': {'kind':'static_keypose' if item['role'] != 'independent-prop' else 'prop', 'loop':False, 'cycle_frames':'pending' if asset_id in ['walk-a','run-a','climb-a'] else None},
        'visual_status': 'style-drift-reported' if asset_id == 'lie-a' else 'composition-review-candidate',
        'contains_support': 'stool' if asset_id == 'sit-01' else ('vertical edge guide' if asset_id == 'climb-a' else None),
    })
    comparison[asset_id] = (old, cleaned)

# True-alpha avatar and portrait use the selected master pixels only.
with Image.open(OUT / 'master-04-full.png') as master:
    master.crop((480,20,1200,830)).resize((384,432),Image.Resampling.LANCZOS).save(OUT/'portrait.png')
    master.crop((545,20,1135,610)).resize((256,256),Image.Resampling.LANCZOS).save(OUT/'avatar.png')

font = ImageFont.truetype('/System/Library/Fonts/STHeiti Medium.ttc', 20)
board = Image.new('RGB',(1800,1130),'#eeeae2')
draw = ImageDraw.Draw(board)
for i,item in enumerate(assets):
    x=(i%5)*360; y=(i//5)*565
    draw.text((x+10,y+10),item['id'],font=font,fill='#243448')
    with Image.open(ROOT/item['file']) as opened:
        rgba=opened.convert('RGBA'); rgba.thumbnail((330,495),Image.Resampling.LANCZOS)
    panel=Image.new('RGBA',(340,510),'#192534'); panel.alpha_composite(rgba,((340-rgba.width)//2,(510-rgba.height)//2))
    board.paste(panel.convert('RGB'),(x+10,y+44))
board.save(BASE/'review/prepared-assets-contact.jpg',quality=94)

# Compact before/after edge views: a wide image must not hide small halos.
regions = [('master-04',(1030,460,1500,1240)),('sit-01',(1100,550,1600,1350)),('run-a',(1030,350,1530,1170)),('cup',(660,370,920,770))]
edges=Image.new('RGB',(1320,1320),'#eeeae2'); pen=ImageDraw.Draw(edges)
for row,(asset_id,region) in enumerate(regions):
    old,cleaned=comparison[asset_id]
    for column,(image,bg,label) in enumerate([(old,'#192534','before / dark'),(cleaned,'#192534','after / dark'),(cleaned,'#f4f0e7','after / light')]):
        crop=image.crop(region); crop.thumbnail((420,284),Image.Resampling.LANCZOS)
        panel=Image.new('RGBA',(420,284),bg);panel.alpha_composite(crop,((420-crop.width)//2,(284-crop.height)//2))
        x=column*440+10; y=row*330
        pen.text((x,y+8),asset_id+' '+label,font=font,fill='#243448');edges.paste(panel.convert('RGB'),(x,y+40))
edges.save(BASE/'review/alpha-edge-review.jpg',quality=95)

manifest={'status':'design-material-candidates; visual/native-composition-review-pending','created_at':datetime.now(timezone.utc).isoformat(),
          'selected_master':'identity/selected-master.json','product_platform':'desktop only','runtime_target':'dsh-pet 0.4.1; foundation-owned adapter',
          'runtime_pack':False,'source_originals_preserved':True,'assets':assets,
          'portrait':'assets/prepared/portrait.png','avatar':'assets/prepared/avatar.png',
          'open_work':['complete gait keyframes/cycles and transitions','head/foot/prop alignment in native scene','side-lying style and shoe mismatch','animation and real DSH integration acceptance'],
          'rights_basis':'user-provided generated originals; public distribution review not performed'}
(BASE/'asset-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'assets':len(assets),'prepared_bytes':sum(item['bytes'] for item in assets),'manifest':'designs/dsh-skin-assets-v3/asset-manifest.json','status':manifest['status']},ensure_ascii=False))
