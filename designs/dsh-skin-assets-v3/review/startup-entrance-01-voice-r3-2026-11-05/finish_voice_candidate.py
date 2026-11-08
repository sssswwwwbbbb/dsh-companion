"""Audible four-shot narration candidate, isolated from current bindings."""
from pathlib import Path
import hashlib
import importlib.util
import json
import subprocess

import numpy as np
import soundfile as sf
from scipy import signal

OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[3]
BASE = ROOT / 'designs/dsh-skin-assets-v3'
FF = ROOT / 'reports/first-skin/.media-venv/lib/python3.9/site-packages/imageio_ffmpeg/binaries/ffmpeg-macos-aarch64-v7.1'
SOURCE = BASE / 'assets/cinematic/source/entrance-01-source.mp4'
BOUND = BASE / 'review/startup-entrance-01-2026-11-05/startup-entrance-01-with-sound.mp4'
FONT = '/System/Library/Fonts/STHeiti Medium.ttc'
SR = 48000
DURATION = 12.5
HANDOFF_AT = 12.15
ORIGINAL_HANDOFF_AT = 11.65
EXPECTED_BOUND_HASH = '4d3ed205fa1b0a9dc9fb0f5e68c7eb2ef251ee76030509cd2f154ef2eb83113b'
SHOTS = [
    ('awakening', .35, 2.23, '开始唤醒。', 'corridor and power approach'),
    ('release', 2.80, 5.85, '隔离解除，机体上线。', 'interlocks and chamber reveal'),
    ('vision', 7.48, 9.02, '视觉同步。', 'optical awakening'),
    ('report', 9.15, 12.10, '指挥官，我已就位。', 'eye contact with commander'),
]
VOICE_TAKES = {'awakening': 'awakening-speaker-20261109', 'release': 'release-speaker-20261106',
               'vision': 'vision-speaker', 'report': 'report-speaker'}
# Remove the centers of the two pauses in the selected B reading. The gaps
# remain distinct, with the longer break after the address to the commander.
REPORT_PAUSE_CUTS = [(1.710, 1.927), (2.844, 3.233)]

spec = importlib.util.spec_from_file_location('existing_audio_normalization', BASE / 'scripts/render_machine_voice.py')
helper = importlib.util.module_from_spec(spec)
spec.loader.exec_module(helper)


def run(args):
    return subprocess.run([str(FF), *args], check=True, capture_output=True)


def sha(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()


def db_rms(x):
    return float(20*np.log10(max(float(np.sqrt(np.mean(x*x))), 1e-12)))


def measure(p):
    r = subprocess.run([str(FF), '-hide_banner', '-i', str(p), '-af',
                        'loudnorm=I=-14:TP=-1.8:LRA=7:print_format=json', '-f', 'null', '-'],
                       check=True, capture_output=True, text=True)
    return json.JSONDecoder().raw_decode(r.stderr[r.stderr.rfind('{'):])[0]


def audible_normalize(raw, target):
    # Control the speech crest factor before raising the average level. A
    # peak-limited linear gain alone left this short recording at -17 LUFS.
    calibrated = target.with_name(target.stem+'-calibrated.wav')
    compressed = target.with_name(target.stem+'-compressed.wav')
    helper.norm(raw, calibrated, level=-20)
    run(['-v', 'error', '-y', '-i', str(calibrated), '-af',
         'acompressor=threshold=0.1259:ratio=3:attack=2:release=70:makeup=1',
         '-c:a', 'pcm_s24le', str(compressed)])
    helper.norm(compressed, target, level=-14)


def normalize_probe():
    raw = OUT / 'voice-report-raw.wav'
    target = OUT / 'voice-reference-report.wav'
    audible_normalize(raw, target)
    run(['-v', 'error', '-y', '-i', str(target), '-c:a', 'libmp3lame', '-b:a', '192k', str(target.with_suffix('.mp3'))])
    print(json.dumps({'probe': str(target.relative_to(ROOT)), 'levels': measure(target)}, ensure_ascii=False), flush=True)


def make_candidate():
    assert sha(BOUND) == EXPECTED_BOUND_HASH, 'Bound source changed; review before proceeding'
    fx, sr = sf.read(OUT / 'mechanical-bed-preview.wav', always_2d=True)
    assert sr == SR and len(fx) == 12*SR
    # Move the existing closing contact with the longer report and shutter.
    split = round(ORIGINAL_HANDOFF_AT*SR)
    ramp = round(.015*SR)
    fx[split-ramp:split] *= np.linspace(1, 0, ramp)[:, None]
    fx[split:split+ramp] *= np.linspace(0, 1, ramp)[:, None]
    fx = np.concatenate((fx[:split], np.zeros((round(DURATION*SR)-len(fx), fx.shape[1])), fx[split:]))
    voices = np.zeros_like(fx)
    duck = np.ones(len(fx))
    captions = ['WEBVTT', '']
    filters = ['fps=24', 'tpad=stop_mode=clone:stop_duration=3', 'fade=t=in:st=0:d=0.18']
    records = []
    def timestamp(seconds):
        ms = round(seconds*1000)
        return f'00:00:{ms//1000:02d}.{ms%1000:03d}'

    for name, at, latest, text, picture in SHOTS:
        raw = OUT / f'voice-{VOICE_TAKES[name]}-raw.wav'
        decoded = run(['-v', 'error', '-i', str(raw), '-f', 'f32le', '-ar', str(SR), '-ac', '1', 'pipe:1'])
        x = np.frombuffer(decoded.stdout, np.float32).astype(np.float64)
        # Find the quiet edges and verify each intentional silence edit.
        env = signal.sosfiltfilt(signal.butter(2, 30, fs=SR, output='sos'), np.abs(x))
        threshold = max(float(env.max())*.025, .001)
        active = np.flatnonzero(env > threshold)
        assert len(active), f'No speech activity: {name}'
        a = max(0, int(active[0]) - round(.035*SR))
        b = min(len(x), int(active[-1]) + round(.075*SR))
        pause_cuts = REPORT_PAUSE_CUTS if name == 'report' else []
        for cut_start, cut_end in reversed(pause_cuts):
            start_sample, end_sample = round(cut_start*SR), round(cut_end*SR)
            assert np.max(env[start_sample:end_sample]) < threshold, 'Pause edit intersects speech'
            x[start_sample-240:start_sample] *= np.linspace(1, 0, 240)
            x[end_sample:end_sample+240] *= np.linspace(0, 1, 240)
            x = np.concatenate((x[:start_sample], x[end_sample:]))
            b -= end_sample - start_sample
        x = x[a:b]
        trimmed = OUT / f'voice-{name}-trimmed.wav'
        sf.write(trimmed, x, SR, subtype='FLOAT')
        budget = latest-at
        speed = max(1., len(x)/SR/(budget-.025))
        assert speed <= 1.35, f'{name} needs a shorter reading, not an extreme speed-up ({speed:.3f})'
        timed = OUT / f'voice-{name}-timed.wav'
        # System reports use a narrower comms channel; the direct address opens
        # the channel. No fixed-pitch vocoder replaces the conditioned timbre.
        eq = 'highpass=f=220,lowpass=f=6500' if name != 'report' else 'highpass=f=130,lowpass=f=8200'
        run(['-v', 'error', '-y', '-i', str(trimmed), '-af', f'atempo={speed:.7f},{eq},afade=t=in:d=0.008',
             '-c:a', 'pcm_s24le', str(timed)])
        prepared = OUT / f'voice-{name}-prepared.wav'
        audible_normalize(timed, prepared)
        v, vsr = sf.read(prepared, always_2d=True)
        assert vsr == SR
        mono = v.mean(axis=1)
        if len(mono) > round(budget*SR):
            assert len(mono)-round(budget*SR) < .035*SR, 'Unexpected tempo overshoot'
            mono = mono[:round(budget*SR)]
        mono[-min(len(mono),round(.015*SR)):] *= np.linspace(1,0,min(len(mono),round(.015*SR)))
        begin = round(at*SR)
        end = begin+len(mono)
        voices[begin:end] += mono[:,None]
        # Keep the mechanical contacts audible under narration, with soft ramps.
        lo = max(0,begin-round(.05*SR)); hi = min(len(fx),end+round(.10*SR))
        local = np.ones(hi-lo)*.52
        rise = begin-lo; fall = hi-end
        if rise: local[:rise] = np.linspace(1,.52,rise)
        if fall: local[-fall:] = np.linspace(.52,1,fall)
        duck[lo:hi] = np.minimum(duck[lo:hi],local)
        actual_end = end/SR
        (OUT / f'caption-{name}.txt').write_text(text)
        captions += [f'{timestamp(at)} --> {timestamp(actual_end)}', text, '']
        filters.append(f"drawtext=fontfile='{FONT}':textfile='{OUT/f'caption-{name}.txt'}':fontsize=23:fontcolor=white:box=1:boxcolor=black@0.58:boxborderw=8:x=(w-text_w)/2:y=h-54:enable='between(t,{at},{actual_end:.5f})'")
        records.append({'id': name, 'start': at, 'end': actual_end, 'text': text, 'picture': picture,
                        'voice_take': raw.name, 'voice_take_sha256': sha(raw), 'pause_cuts_seconds': pause_cuts,
                        'raw_seconds': sf.info(raw).duration, 'trimmed_seconds': len(x)/SR,
                        'tempo_factor': speed, 'prepared_levels': measure(prepared)})

    mix = fx*duck[:,None] + voices
    raw_mix = OUT / 'sound-scene-voice-b-raw.wav'
    sf.write(raw_mix, mix, SR, subtype='FLOAT')
    final_mix = OUT / 'sound-scene-voice-b.wav'
    helper.norm(raw_mix, final_mix, level=-14)
    run(['-v', 'error', '-y', '-i', str(final_mix), '-c:a', 'libmp3lame', '-b:a', '192k', str(final_mix.with_suffix('.mp3'))])
    (OUT / 'captions.vtt').write_text('\n'.join(captions))
    filters.append(f'fade=t=out:st={HANDOFF_AT}:d={DURATION-HANDOFF_AT:.2f}')
    video = OUT / 'startup-entrance-01-four-lines-voice-b.mp4'
    encoded = video.with_name(video.stem+'.encoding.mp4')
    run(['-v', 'error', '-y', '-i', str(SOURCE), '-i', str(final_mix),
         '-map', '0:v:0', '-map', '1:a:0', '-vf', ','.join(filters), '-t', str(DURATION),
         '-c:v', 'libx264', '-preset', 'fast', '-crf', '17', '-pix_fmt', 'yuv420p',
         '-c:a', 'aac', '-b:a', '192k', '-ar', str(SR), '-movflags', '+faststart', str(encoded)])
    encoded.replace(video)
    run(['-v', 'error', '-i', str(video), '-f', 'null', '-'])
    actual, actual_sr = sf.read(final_mix, always_2d=True)
    assert np.isfinite(actual).all() and np.max(np.abs(actual)) < 1
    assert sha(BOUND) == EXPECTED_BOUND_HASH
    record = {'status': 'independent audiovisual audition; user auditory acceptance pending',
              'video': str(video.relative_to(ROOT)), 'video_sha256': sha(video),
              'audio': str(final_mix.with_suffix('.mp3').relative_to(ROOT)),
              'audio_sha256': sha(final_mix.with_suffix('.mp3')),
              'source': str(SOURCE.relative_to(ROOT)), 'source_sha256': sha(SOURCE),
              'voice_reference': 'https://www.bilibili.com/video/BV1T7nM6xEqo/',
              'selected_voice': 'B', 'method': 'local reference-conditioned speech with speaker embedding',
              'duration_seconds': DURATION, 'handoff_at_seconds': HANDOFF_AT,
              'lines': records, 'full_mix_levels': measure(final_mix),
              'peak_dbfs': float(20*np.log10(np.max(np.abs(actual)))),
              'clipped_samples': int(np.count_nonzero(np.abs(actual)>=1)),
              'segment_rms_dbfs': [{'start': a, 'end': b, 'rms': db_rms(actual[round(a*actual_sr):round(b*actual_sr)])}
                                   for a,b in [(0,3),(3,7),(7,9.15),(9.15,DURATION)]],
              'full_decode_passed': True, 'source_recording_inserted_in_film': False,
              'bound_media_modified': False, 'existing_bound_sha256': sha(BOUND),
              'paid_requests': 0, 'runtime_dependency_added': False,
              'native_integrated': False, 'ear_review_completed': False}
    (OUT / 'candidate-review.json').write_text(json.dumps(record, ensure_ascii=False, indent=2)+'\n')
    print(json.dumps({'video': record['video'], 'lines': len(records), 'levels': record['full_mix_levels']}, ensure_ascii=False), flush=True)


if __name__ == '__main__':
    import sys
    if '--full' in sys.argv:
        make_candidate()
    else:
        normalize_probe()
