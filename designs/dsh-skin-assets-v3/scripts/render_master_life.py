#!/usr/bin/env python3
"""Two bounded source-preserving desktop-pet motions; not a rig runtime."""
from pathlib import Path
import hashlib
import json
import math
import subprocess
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[3]
BASE = ROOT / 'designs/dsh-skin-assets-v3'
VIDEO = BASE / 'assets/motion'
VIDEO.mkdir(exist_ok=True)
FFMPEG = ROOT / 'reports/first-skin/.media-venv/lib/python3.9/site-packages/imageio_ffmpeg/binaries/ffmpeg-macos-aarch64-v7.1'
manifest_path = BASE / 'asset-manifest.json'
manifest = json.loads(manifest_path.read_text())
master = next(item for item in manifest['assets'] if item['id'] == 'master-04')
source = ROOT / master['file']
with Image.open(source) as image:
    original = np.asarray(image.convert('RGBA')).copy()
height, width = original.shape[:2]
factor = height / (master['source_crop'][3] - master['source_crop'][1])
cx = (835 - master['source_crop'][0]) * factor
neck_y = (520 - master['source_crop'][1]) * factor
torso_y = (900 - master['source_crop'][1]) * factor
yy, xx = np.mgrid[0:height, 0:width].astype(np.float32)
premul = original.astype(np.float32) / 255
premul[..., :3] *= premul[..., 3:4]


def smoothstep(low, high, data):
    t = np.clip((data - low) / (high - low), 0, 1)
    return t * t * (3 - 2 * t)


def unpack(pixels):
    alpha = np.clip(pixels[..., 3:4], 0, 1)
    rgb = np.divide(pixels[..., :3], alpha, out=np.zeros_like(pixels[..., :3]), where=alpha > 1e-6)
    return np.rint(np.clip(np.concatenate([rgb, alpha], axis=2), 0, 1) * 255).astype(np.uint8)


base_frame = unpack(premul)
head_weight = 1 - smoothstep(neck_y - 30, neck_y + 65, yy)
torso_weight = np.exp(-((yy - torso_y) / 155) ** 4) * np.exp(-((xx - cx) / 170) ** 4)
hair_weight = smoothstep(80, 145, np.abs(xx - cx)) * smoothstep(neck_y + 30, 430, yy) * (1 - smoothstep(740, 865, yy))


def frame(kind, index, count):
    phase = index / count if kind == 'idle-breathe' else index / (count - 1)
    pulse = math.sin(phase * math.tau)
    if kind == 'react-tilt':
        envelope = math.sin(math.pi * phase) ** 2
        if index in [0, count - 1]:
            return base_frame.copy()
        angle = math.radians(2.8 * envelope * math.sin(phase * math.pi * 1.25))
        pulse = .35 * envelope
    else:
        angle = math.radians(.35 * pulse)
    # Soft chest/shoulder breath, a neck-centered head attitude and hair motion.
    # The feet are outside these fields. No full-image zoom or translation.
    dx = (xx - cx) * .006 * pulse * torso_weight
    dy = -3.0 * pulse * torso_weight
    rotated_x = cx + (xx - cx) * math.cos(angle) - (yy - neck_y) * math.sin(angle)
    rotated_y = neck_y + (xx - cx) * math.sin(angle) + (yy - neck_y) * math.cos(angle)
    dx += (rotated_x - xx) * head_weight
    dy += (rotated_y - yy) * head_weight - 1.2 * pulse * head_weight
    phase_offset = yy * .003
    sway = np.sin(phase * math.tau + phase_offset) - np.sin(phase_offset)
    dx += 3.0 * sway * hair_weight * (1 if kind == 'idle-breathe' else .45)
    mapped = cv2.remap(premul, (xx + dx).astype(np.float32), (yy + dy).astype(np.float32),
                       interpolation=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=(0, 0, 0, 0))
    return unpack(mapped)


records = []
for kind, count, loop in [('idle-breathe', 60, True), ('react-tilt', 36, False)]:
    output = VIDEO / (kind + '.webm')
    args = [str(FFMPEG), '-hide_banner', '-loglevel', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgba',
            '-s', f'{width}x{height}', '-r', '24', '-i', 'pipe:0', '-an', '-c:v', 'libvpx-vp9',
            '-pix_fmt', 'yuva420p', '-b:v', '0', '-crf', '24', '-deadline', 'good', '-cpu-used', '4',
            '-threads', '4', '-row-mt', '1', '-auto-alt-ref', '0', str(output)]
    process = subprocess.Popen(args, stdin=subprocess.PIPE)
    samples = []
    sample_indices = {0, count // 4, count // 2, 3 * count // 4, count - 1}
    foot_changes = []
    for index in range(count):
        rgba = frame(kind, index, count)
        # Foot contact must not move during either stationary motion.
        foot = rgba[-110:, :, 3] > 0
        foot_changes.append(int(np.count_nonzero(rgba[-110:, :, :][foot] != base_frame[-110:, :, :][foot])))
        process.stdin.write(rgba.tobytes())
        if index in sample_indices:
            samples.append((index, Image.fromarray(rgba)))
    process.stdin.close()
    if process.wait() != 0:
        raise RuntimeError('Encoding failed: ' + kind)
    if max(foot_changes) != 0:
        raise RuntimeError('Stationary foot pixels changed: ' + kind)
    font = ImageFont.truetype('/System/Library/Fonts/STHeiti Medium.ttc', 18)
    contact = Image.new('RGB', (len(samples) * 240, 570), '#eeeae2')
    draw = ImageDraw.Draw(contact)
    for column, (index, image) in enumerate(samples):
        image.thumbnail((228, 510), Image.Resampling.LANCZOS)
        panel = Image.new('RGBA', (230, 520), '#192534')
        panel.alpha_composite(image, ((230 - image.width) // 2, 520 - image.height))
        contact.paste(panel.convert('RGB'), (column * 240 + 5, 42))
        draw.text((column * 240 + 5, 10), f'{kind} {index / 24:.2f}s', font=font, fill='#253344')
    contact.save(BASE / 'review' / (kind + '-frames.jpg'), quality=94)
    decode = subprocess.run([str(FFMPEG), '-hide_banner', '-loglevel', 'error', '-c:v', 'libvpx-vp9',
                             '-ss', '0.5', '-i', str(output), '-frames:v', '1', '-f', 'rawvideo',
                             '-pix_fmt', 'rgba', 'pipe:1'], check=True, capture_output=True)
    decoded = np.frombuffer(decode.stdout, np.uint8).reshape(height, width, 4)
    alpha = decoded[..., 3]
    if int(alpha.min()) != 0 or int(alpha.max()) != 255:
        raise RuntimeError('Decoded alpha is not valid: ' + kind)
    record = {'id':kind, 'file':str(output.relative_to(ROOT)), 'source':master['file'],
              'source_sha256':master['sha256'], 'size':[width,height], 'fps':24, 'frames':count,
              'duration_seconds':count/24, 'loop':loop, 'bytes':output.stat().st_size,
              'sha256':hashlib.sha256(output.read_bytes()).hexdigest(),
              'method':'bounded local image-space deformation; chest/shoulder breath, hair sway, neck-centered head attitude',
              'feet_unchanged':max(foot_changes)==0, 'decoded_alpha_extrema':[int(alpha.min()),int(alpha.max())],
              'visual_review':'pending playback/sequence review', 'native_dsh_tested':False,
              'does_not_claim':['blink','wave','walk cycle','run cycle','new skeletal pose']}
    if not loop:
        record['source_first_last_rgba_identical'] = bool(np.array_equal(frame(kind,0,count),frame(kind,count-1,count)))
        record['endpoint_equality_basis'] = 'uncompressed generated source RGBA before lossy VP9 encoding'
        record['decoded_endpoint_identity_claimed'] = False
    records.append(record)
    print(json.dumps(record,ensure_ascii=False),flush=True)

manifest['motions'] = records
manifest['motion_parameters'] = {'source_crop':master['source_crop'],'source_factor':factor,
                                  'neck_pivot':[cx,neck_y],'torso_center':[cx,torso_y],
                                  'source_original_preserved':True,'not_a_runtime_rig_framework':True}
manifest_path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
(BASE/'review/master-life-render.json').write_text(json.dumps({'motions':records,'stationary_motion_only':True},ensure_ascii=False,indent=2)+'\n')
