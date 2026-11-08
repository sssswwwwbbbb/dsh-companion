"""Create identical local-only video/frame inputs; never edits source media."""
import hashlib, json, math, subprocess, time
from pathlib import Path
from PIL import Image
import imageio_ffmpeg

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / '.local/pet-engine-comparison-20261104/assets'
SOURCE = ROOT / 'designs/dsh-companion-v1/assets/whale-maid'
OUT.mkdir(parents=True, exist_ok=True)
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
# All candidates use these exact decoded sequences. Sitting is an explicitly
# labelled mechanism stand-in from the existing seated sleep sequence.
CLIPS = {
    'idle': ('idle', 1, 2, True), 'walk': ('walk', 2, 4, False),
    'run': ('run', 2, 3, False), 'react': ('react', 1, 1.8, False),
    'sit-start': ('sleep-in', 5.5, 3, False),
    'sit-loop': ('sleep', 2, 2, True), 'sit-end': ('wake', 2, 2, False),
    'look': ('look', 2, 2, False),
}
rows = {}; started = time.perf_counter()
for name, (source, offset, duration, loop) in CLIPS.items():
    original = SOURCE / (source + '.webm'); video = OUT / (name + '.webm')
    frame_dir = OUT / (name + '-frames'); frame_dir.mkdir(exist_ok=True)
    # Explicit libvpx decoder retains VP9 alpha. One small conversion serves both.
    subprocess.run([FFMPEG, '-loglevel', 'error', '-c:v', 'libvpx-vp9',
                    '-ss', str(offset), '-i', str(original), '-t', str(duration),
                    '-vf', 'fps=12,scale=320:180', '-an', '-c:v', 'libvpx-vp9',
                    '-pix_fmt', 'yuva420p', '-auto-alt-ref', '0', '-crf', '32',
                    '-b:v', '0', '-y', str(video)], check=True)
    subprocess.run([FFMPEG, '-loglevel', 'error', '-c:v', 'libvpx-vp9', '-i', str(video),
                    '-y', str(frame_dir / '%03d.png')], check=True)
    frames = sorted(frame_dir.glob('*.png')); cols = 8
    sheet = Image.new('RGBA', (320 * cols, 180 * math.ceil(len(frames) / cols)))
    for i, file in enumerate(frames):
        sheet.paste(Image.open(file).convert('RGBA'), ((i % cols) * 320, (i // cols) * 180))
    png = OUT / (name + '.png'); sheet.save(png, optimize=True)
    rows[name] = {'video': name + '.webm', 'sheet': name + '.png',
                  'frameWidth': 320, 'frameHeight': 180, 'frames': len(frames),
                  'fps': 12, 'seconds': len(frames) / 12, 'loop': loop,
                  'source': str(original.relative_to(ROOT)), 'offset': offset,
                  'sourceSha256': hashlib.sha256(original.read_bytes()).hexdigest(),
                  'videoBytes': video.stat().st_size, 'sheetBytes': png.stat().st_size,
                  'videoSha256': hashlib.sha256(video.read_bytes()).hexdigest(),
                  'sheetSha256': hashlib.sha256(png.read_bytes()).hexdigest()}
manifest = {'fixtureOnly': True, 'notice': '旧素材机制对比，不是正式 assets-v3。坐姿取自原睡眠序列，非正式读书演出。',
            'actions': rows, 'conversionSeconds': round(time.perf_counter() - started, 3),
            'baseFacing': 'left', 'videoDisplayWidth': 420,
            'movement': {'walk': {'distance': 255, 'lead': .2, 'tail': .2},
                         'run': {'distance': 364, 'lead': .2, 'tail': .2}},
            'upstreamMediaUsed': False}
(OUT / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'actions': len(rows), 'conversionSeconds': manifest['conversionSeconds'],
                  'videoBytes': sum(v['videoBytes'] for v in rows.values()),
                  'sheetBytes': sum(v['sheetBytes'] for v in rows.values())}))
