#!/usr/bin/env python3
"""Matte received real walk frames locally, preserving the original video."""
from pathlib import Path
from datetime import datetime, timezone
import os
import json
import hashlib
import shutil

ROOT = Path(__file__).resolve().parents[3]
BASE = ROOT / 'designs/dsh-skin-assets-v3'
WORK = ROOT / '.local/walk-loop-01'
OUT = WORK / 'alpha'
OUT.mkdir(exist_ok=True)
os.environ['U2NET_HOME'] = str(ROOT / '.local/dsh-matting-models')
os.environ['OMP_NUM_THREADS'] = '2'
os.environ['NUMBA_NUM_THREADS'] = '2'

import cv2
import numpy as np
from PIL import Image
from rembg import new_session, remove

cv2.setNumThreads(1)
source = ROOT / '素材/女孩桌宠走路循环视频制作.mp4'
archive = BASE / 'assets/motion/source/walk-loop-01-source.mp4'
archive.parent.mkdir(exist_ok=True)
if not archive.exists():
    shutil.copy2(source, archive)
assert hashlib.sha256(source.read_bytes()).digest() == hashlib.sha256(archive.read_bytes()).digest()

session = new_session('u2net', providers=['CPUExecutionProvider'])
records = []
for index in range(28, 85):
    target = OUT / f'{index:04d}.png'
    if target.exists():
        print(f'reuse {index}', flush=True)
        continue
    with Image.open(WORK / 'frames' / f'{index:04d}.png') as image:
        rgba = remove(image.convert('RGB'), session=session,
                      alpha_matting=True, alpha_matting_erode_size=8)
    a = np.asarray(rgba.getchannel('A')).copy()
    # Keep the character and its adjacent fine edges, not isolated backdrop
    # text. Original branded source remains unchanged in the archive.
    count, labels, stats, _ = cv2.connectedComponentsWithStats((a > 16).astype(np.uint8), 8)
    if count > 1:
        largest = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
        core = (labels == largest).astype(np.uint8)
        near = cv2.dilate(core, np.ones((25, 25), np.uint8))
        keep = near > 0
        for label in range(1, count):
            component = labels == label
            if np.any(component & (near > 0)):
                keep |= cv2.dilate(component.astype(np.uint8), np.ones((5, 5), np.uint8)) > 0
        a[~keep] = 0
    rgba.putalpha(Image.fromarray(a))
    rgba.save(target)
    box = rgba.getchannel('A').getbbox()
    records.append({'frame': index, 'file': str(target.relative_to(ROOT)),
                    'alpha_bbox': list(box), 'alpha_extrema': [int(a.min()), int(a.max())]})
    if len(records) % 6 == 0:
        print(f'matted {index}: {len(records)} new frames', flush=True)

receipt = {
    'status': 'local alpha candidates prepared; temporal and loop review pending',
    'at': datetime.now(timezone.utc).isoformat(),
    'source': str(source.relative_to(ROOT)), 'archived_source': str(archive.relative_to(ROOT)),
    'source_sha256': hashlib.sha256(source.read_bytes()).hexdigest(),
    'source_size': [720, 960], 'source_fps': 24,
    'context_frame_range_inclusive': [28, 84], 'planned_cycle_start': 34,
    'planned_cycle_end_exclusive': 79, 'planned_cycle_seconds': 45 / 24,
    'source_identity': 'user-provided video; visible source branding retained in original; generator/model not independently established',
    'method': 'rembg/u2net local CPU alpha matting; isolated non-character backdrop components removed',
    'records': records, 'reused_frame_files': len(list(OUT.glob('*.png'))),
    'not_native_runtime_pack': True,
}
(BASE / 'review/walk-loop-01-matting.json').write_text(json.dumps(receipt, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'status': receipt['status'], 'files': receipt['reused_frame_files']}, ensure_ascii=False), flush=True)
