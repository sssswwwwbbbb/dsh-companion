"""Derive an audio-free WebM and a same-film still from the reviewed candidate."""
import hashlib
import json
import subprocess
from pathlib import Path

import imageio_ffmpeg

ROOT = Path(__file__).resolve().parents[2]
DESIGN = ROOT / 'designs/dsh-skin-assets-v3/review/startup-entrance-01-2026-11-05'
SOURCE = DESIGN / 'startup-entrance-01-with-sound.mp4'
LAB = ROOT / '.local/dsh-commander-startup-20261105'
REPORT = ROOT / 'reports/dsh-commander-startup-2026-11-05'
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
SOURCE_SHA = '4d3ed205fa1b0a9dc9fb0f5e68c7eb2ef251ee76030509cd2f154ef2eb83113b'


def digest(file):
    return hashlib.sha256(file.read_bytes()).hexdigest()


def inspect(file):
    stream = imageio_ffmpeg.read_frames(str(file))
    try:
        return next(stream)
    finally:
        stream.close()


def encode(*args):
    subprocess.run([FFMPEG, '-nostdin', '-hide_banner', '-loglevel', 'error',
                    '-y', *map(str, args)], check=True)


review = json.loads((DESIGN / 'cinematic-review.json').read_text())
if digest(SOURCE) != SOURCE_SHA or review['video_sha256'] != SOURCE_SHA:
    raise ValueError('STARTUP_VISUAL_SOURCE_CHANGED')
metadata = inspect(SOURCE)
if (list(metadata['size']), metadata['fps'], metadata['duration']) != (
        review['size'], review['fps'], review['duration_seconds']):
    raise ValueError('STARTUP_VISUAL_METADATA_CHANGED')
if review['baked_workspace_screenshot']:
    raise ValueError('STARTUP_MUST_REVEAL_LIVE_WORKSPACE')

output = LAB / 'media'
output.mkdir(parents=True, exist_ok=True)
video = output / 'entrance.webm'
still = output / 'entrance-still.png'
encode('-i', SOURCE, '-map', '0:v:0', '-an', '-sn', '-dn', '-map_metadata', '-1',
       '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '19', '-row-mt', '1',
       '-threads', '4', '-pix_fmt', 'yuv420p', video)
# A frame of the actual character at the start of the final held image.
poster_at = round(metadata['duration'] - review['handoff']['seconds'] - .25, 3)
encode('-ss', poster_at, '-i', video, '-map', '0:v:0', '-frames:v', '1', still)
result = inspect(video)
if result.get('audio_codec') is not None or any(result[key] != metadata[key] for key in ('size', 'fps', 'duration')):
    raise ValueError('STARTUP_DERIVATIVE_METADATA_MISMATCH')
frames, elapsed = imageio_ffmpeg.count_frames_and_secs(str(video))
if frames != round(metadata['duration'] * metadata['fps']):
    raise ValueError('STARTUP_DERIVATIVE_DECODE_FAILED')
encode('-xerror', '-i', video, '-f', 'null', '-')
receipt = {
    'source': str(SOURCE.relative_to(ROOT)), 'sourceSha256': SOURCE_SHA,
    'designReceiptSha256': digest(DESIGN / 'cinematic-review.json'),
    'decodedFrames': frames, 'decodedDurationSeconds': elapsed,
    'size': list(result['size']), 'fps': result['fps'],
    'seconds': result['duration'], 'handoffSeconds': round(review['handoff']['seconds'], 3),
    'stillSeconds': 1.2, 'posterAtSeconds': poster_at,
    'video': {'sha256': digest(video), 'bytes': video.stat().st_size, 'codec': result['codec'], 'audioStreams': 0},
    'poster': {'sha256': digest(still), 'bytes': still.stat().st_size},
}
REPORT.mkdir(parents=True, exist_ok=True)
(REPORT / 'media.json').write_text(json.dumps(receipt, indent=2) + '\n')
print(json.dumps(receipt))
