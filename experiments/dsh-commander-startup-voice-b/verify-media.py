"""Verify the source streams and keep the selected MP4 byte for byte."""
import hashlib
import json
import re
import subprocess
from pathlib import Path

import imageio_ffmpeg

root = Path(__file__).resolve().parents[2]
directory = root / 'designs/dsh-skin-assets-v3/review/startup-entrance-01-voice-r3-2026-11-05'
source = directory / 'startup-entrance-01-four-lines-voice-b.mp4'
review = directory / 'candidate-review.json'
report = root / 'reports/dsh-commander-startup-voice-b-2026-11-05'
expected_sha = '5704f18e13b521fc318a2cb4d2dfe92ea2d00a4fdb0dd557045cd63ac392d1b1'
sha = lambda file: hashlib.sha256(file.read_bytes()).hexdigest()
design = json.loads(review.read_text())
assert sha(source) == design['video_sha256'] == expected_sha
assert design['duration_seconds'] == 12.5 and design['handoff_at_seconds'] == 12.15
frames, duration = imageio_ffmpeg.count_frames_and_secs(str(source))
assert frames == 300 and duration == 12.5
command = [imageio_ffmpeg.get_ffmpeg_exe(), '-hide_banner', '-nostdin', '-xerror',
           '-i', str(source), '-map', '0:v:0', '-map', '0:a:0',
           '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-']
result = subprocess.run(command, check=True, text=True, capture_output=True)
audio = re.search(r'Stream #0:1[^\n]*Audio: aac[^\n]*48000 Hz, stereo', result.stderr)
video = re.search(r'Stream #0:0[^\n]*Video: h264[^\n]*1280x720[^\n]*24 fps', result.stderr)
assert audio and video
levels = json.loads(re.findall(r'\{\s*"input_i"[\s\S]+?\n\}', result.stderr)[-1])
assert levels['input_i'] == '-14.04' and levels['input_tp'] == '-3.80'
lines = [{key: line[key] for key in ('id', 'start', 'end', 'text')} for line in design['lines']]
assert len(lines) == 4 and lines[-1]['end'] < design['handoff_at_seconds']
record = {
    'file': str(source.relative_to(root)), 'sourceSha256': expected_sha, 'bytes': source.stat().st_size,
    'designReview': str(review.relative_to(root)), 'designReviewSha256': sha(review),
    'fullDecode': True, 'width': 1280, 'height': 720, 'fps': 24, 'frames': frames,
    'video': 'H.264 High', 'audio': 'AAC LC, 48 kHz, stereo',
    'integratedLufs': float(levels['input_i']), 'truePeakDbtp': float(levels['input_tp']),
    'durationSeconds': duration, 'handoffAtSeconds': design['handoff_at_seconds'],
    'voiceLines': lines, 'derivation': 'Byte-identical copy of the approved B source',
}
report.mkdir(parents=True, exist_ok=True)
(report / 'media.json').write_text(json.dumps(record, ensure_ascii=False, indent=2) + '\n')
print('Verified 300 video frames and one AAC stream through the full 12.50 seconds.')
