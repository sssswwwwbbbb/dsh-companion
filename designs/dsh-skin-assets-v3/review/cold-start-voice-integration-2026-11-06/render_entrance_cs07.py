#!/usr/bin/env python3
"""Re-render the cold-start entrance film for the CS-07 (unit-07) voice delivery.

What changes versus the accepted 0.4.0 film
  - narration bus: the newly delivered `_wet` CS-07 lines, at the cue sheet's
    in-points (0.35 / 2.80 / 7.48 / 9.15 s), replacing the old B-reading takes;
  - burned-in dialogue captions: removed (the old film burned four drawtext
    lines at y=h-54 between each line's in and out point).

What is deliberately unchanged
  - the visual master, source clip, frame rate, fades and 12.5 s length;
  - the mechanical sound-effect bed, its 0.5 s tail shift and the 0.52 duck.

The delivered 12.50 s timeline preview is asserted sample-identical to the four
wet stems placed at the cue-sheet in-points, so it is used as the narration bus
and the stems double as the provenance check.

Level rebalance (2026-11-06, user report "the last line is quieter"):
the delivery notes claim all four lines are RMS-aligned, but `04_report_wet`
measures -19.9 LUFS against -15.5 / -15.2 / -13.7 for the first three. Each stem
is therefore measured here and line 04 is lifted to the mean of the first three
(+5.1 dB). The gain is recorded in review.json; nothing else is touched.
"""
from pathlib import Path
import hashlib
import json
import subprocess
import wave

import numpy as np

OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[3]
BASE = ROOT / 'designs/dsh-skin-assets-v3'
FF = ROOT / 'reports/first-skin/.media-venv/lib/python3.9/site-packages/imageio_ffmpeg/binaries/ffmpeg-macos-aarch64-v7.1'
SOURCE = BASE / 'assets/cinematic/source/entrance-01-source.mp4'
BED = BASE / 'review/startup-entrance-01-voice-r3-2026-11-05/mechanical-bed-preview.wav'
DELIVERY = BASE / 'review/cold-start-voice-handoff-2026-11-06/CS-07_voice-deliverables 5'
PREVIEW = DELIVERY / 'CS-07_timeline-preview_wet.wav'

SR = 48000
DURATION = 12.5
HANDOFF_AT = 12.15
ORIGINAL_HANDOFF_AT = 11.65   # closing contact in the 12.0 s bed
DUCK = .52
SHOTS = [('01_awakening', .35, '开始唤醒。'),
         ('02_release', 2.80, '隔离解除，机体上线。'),
         ('03_vision', 7.48, '视觉同步。'),
         ('04_report', 9.15, '指挥官，我已就位。')]
# Measured on the delivered _wet stems; the vendor's "RMS aligned" note does not
# hold for 04, so the mix brings it up to the mean of the first three lines.
LINE_GAIN_DB = {'04_report': 5.1}


def run(args, **kw):
    return subprocess.run([str(FF), *args], check=True, capture_output=True, **kw)


def sha(p):
    return hashlib.sha256(Path(p).read_bytes()).hexdigest()


def load(path, channels):
    raw = run(['-v', 'error', '-i', str(path), '-f', 'f32le',
               '-ar', str(SR), '-ac', str(channels), 'pipe:1']).stdout
    return np.frombuffer(raw, np.float32).astype(np.float64).reshape(-1, channels)


def write_wav(path, data):
    """24-bit PCM writer; ffmpeg is used so the sample format matches the bed."""
    interleaved = np.ascontiguousarray(data, dtype='<f4')
    subprocess.run([str(FF), '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR),
                    '-ac', str(data.shape[1]), '-i', 'pipe:0',
                    '-c:a', 'pcm_s24le', str(path)], input=interleaved.tobytes(), check=True)


def loudness(path):
    """Integrated gated loudness of one short line (LUFS, EBU R128)."""
    r = subprocess.run([str(FF), '-hide_banner', '-i', str(path), '-af', 'ebur128=peak=true',
                        '-f', 'null', '-'], check=True, capture_output=True, text=True)
    lines = [l for l in r.stderr.splitlines() if l.strip().startswith('I:')]
    return float(lines[-1].split(':')[1].strip().split()[0])


def measure(path):
    r = subprocess.run([str(FF), '-hide_banner', '-i', str(path), '-af',
                        'loudnorm=I=-14:TP=-1.8:LRA=7:print_format=json', '-f', 'null', '-'],
                       check=True, capture_output=True, text=True)
    return json.JSONDecoder().raw_decode(r.stderr[r.stderr.rfind('{'):])[0]


def norm(raw, target, level=-14):
    """Same linear loudnorm + verify + linear correction as render_machine_voice."""
    expr = f'loudnorm=I={level}:TP=-1.8:LRA=7'
    r = subprocess.run([str(FF), '-hide_banner', '-i', str(raw), '-af', expr + ':print_format=json',
                        '-f', 'null', '-'], capture_output=True, text=True, check=True)
    stats = json.JSONDecoder().raw_decode(r.stderr[r.stderr.rfind('{'):])[0]
    config = expr + ':linear=true:' + ':'.join(['measured_I=' + stats['input_i'],
        'measured_TP=' + stats['input_tp'], 'measured_LRA=' + stats['input_lra'],
        'measured_thresh=' + stats['input_thresh'], 'offset=' + stats['target_offset']])
    run(['-y', '-i', str(raw), '-af', config, '-ar', str(SR), '-c:a', 'pcm_s24le', str(target)])
    observed = measure(target)
    delta = min(level - float(observed['input_i']), -1.8 - float(observed['input_tp']))
    if abs(delta) > .15:
        adjusted = target.with_suffix('.adjusted.wav')
        run(['-y', '-i', str(target), '-af', f'volume={delta:.4f}dB', '-c:a', 'pcm_s24le', str(adjusted)])
        adjusted.replace(target)
    return measure(target)


def rms_dbfs(x):
    return float(20 * np.log10(max(float(np.sqrt(np.mean(np.square(x)))), 1e-12)))


def build_bed():
    fx = load(BED, 2)
    assert len(fx) == 12 * SR, f'unexpected bed length {len(fx)/SR:.3f}s'
    split = round(ORIGINAL_HANDOFF_AT * SR)
    ramp = round(.015 * SR)
    # Move the existing closing contact with the longer report and handoff,
    # exactly as the accepted 0.4.0 render did.
    fx[split - ramp:split] *= np.linspace(1, 0, ramp)[:, None]
    fx[split:split + ramp] *= np.linspace(0, 1, ramp)[:, None]
    tail = np.zeros((round(DURATION * SR) - len(fx), 2))
    return np.concatenate((fx[:split], tail, fx[split:]))


def build_voices():
    preview = load(PREVIEW, 1)[:, 0]
    assert len(preview) == round(DURATION * SR), f'unexpected preview length {len(preview)/SR:.3f}s'
    placed = np.zeros(len(preview))
    lines = []
    for name, at, text in SHOTS:
        stem = load(DELIVERY / f'{name}_wet.wav', 1)[:, 0]
        begin = round(at * SR)
        end = begin + len(stem)
        assert end <= len(preview), f'{name} runs past the film'
        placed[begin:end] += stem
        gain = LINE_GAIN_DB.get(name, 0.0)
        lines.append({'id': name, 'text': text, 'start': at, 'end': end / SR,
                      'seconds': len(stem) / SR,
                      'stem': str((DELIVERY / f'{name}_wet.wav').relative_to(ROOT)),
                      'stem_sha256': sha(DELIVERY / f'{name}_wet.wav'),
                      'stem_lufs': loudness(DELIVERY / f'{name}_wet.wav'),
                      'stem_peak_dbfs': float(20 * np.log10(np.max(np.abs(stem)))),
                      'stem_rms_dbfs': rms_dbfs(stem),
                      'mix_gain_db': gain})
    assert np.array_equal(placed, preview), 'delivered preview does not match the stems at the cue sheet in-points'
    # The delivered preview is the un-gained bus; apply the rebalance on top of it.
    voices = preview.copy()
    for name, at, _ in SHOTS:
        gain = LINE_GAIN_DB.get(name)
        if gain:
            stem_len = len(load(DELIVERY / f'{name}_wet.wav', 1))
            begin = round(at * SR)
            voices[begin:begin + stem_len] *= 10 ** (gain / 20)
    return voices, lines


def build_duck(length, spans):
    duck = np.ones(length)
    for line_start, line_end in spans:
        begin, end = round(line_start * SR), round(line_end * SR)
        lo, hi = max(0, begin - round(.05 * SR)), min(len(duck), end + round(.10 * SR))
        local = np.ones(hi - lo) * DUCK
        rise, fall = begin - lo, hi - end
        if rise:
            local[:rise] = np.linspace(1, DUCK, rise)
        if fall:
            local[-fall:] = np.linspace(DUCK, 1, fall)
        duck[lo:hi] = np.minimum(duck[lo:hi], local)
    return duck


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    bed = build_bed()
    voices, lines = build_voices()
    duck = build_duck(len(voices), [(l['start'], l['end']) for l in lines])
    mix = bed * duck[:, None] + voices[:, None]

    raw_mix = OUT / 'sound-scene-cs07-raw.wav'
    write_wav(raw_mix, mix)
    final_mix = OUT / 'sound-scene-cs07.wav'
    levels = norm(raw_mix, final_mix)

    film = OUT / 'entrance-cs07.mp4'
    encoded = film.with_name(film.stem + '.encoding.mp4')
    filters = ['fps=24', 'tpad=stop_mode=clone:stop_duration=3', 'fade=t=in:st=0:d=0.18',
               f'fade=t=out:st={HANDOFF_AT}:d={DURATION - HANDOFF_AT:.2f}']
    run(['-y', '-i', str(SOURCE), '-i', str(final_mix),
         '-map', '0:v:0', '-map', '1:a:0', '-vf', ','.join(filters), '-t', str(DURATION),
         '-c:v', 'libx264', '-preset', 'fast', '-crf', '17', '-pix_fmt', 'yuv420p',
         '-c:a', 'aac', '-b:a', '192k', '-ar', str(SR), '-movflags', '+faststart', str(encoded)])
    encoded.replace(film)
    run(['-i', str(film), '-f', 'null', '-'])

    # Decode both channels: ffmpeg's stereo->mono downmix applies 0.7071
    # coefficients and would read +3 dB hot, which is not the delivered level.
    final = load(film, 2)
    mono = final.mean(axis=1)
    peak = float(20 * np.log10(np.max(np.abs(final))))
    clipped = int(np.count_nonzero(np.abs(final) >= .999))
    assert np.isfinite(final).all() and peak < 0 and clipped == 0

    record = {
        'status': 'cold-start film re-render for CS-07 voice delivery; user ear/eye review pending',
        'film': str(film.relative_to(ROOT)),
        'film_sha256': sha(film),
        'film_bytes': film.stat().st_size,
        'audio': str(final_mix.relative_to(ROOT)),
        'audio_sha256': sha(final_mix),
        'source': str(SOURCE.relative_to(ROOT)), 'source_sha256': sha(SOURCE),
        'mechanical_bed': str(BED.relative_to(ROOT)), 'mechanical_bed_sha256': sha(BED),
        'voice_bus': str(PREVIEW.relative_to(ROOT)), 'voice_bus_sha256': sha(PREVIEW),
        'voice_delivery': str(DELIVERY.relative_to(ROOT)),
        'voice_delivery_zip_sha256': sha(DELIVERY.parent / 'CS-07_voice-deliverables.zip'),
        'cue_sheet': str((DELIVERY / 'CS-07_cue-sheet.csv').relative_to(ROOT)),
        'film_seconds': DURATION, 'size': [1280, 720], 'fps': 24,
        'handoff_at_seconds': HANDOFF_AT, 'duck': DUCK,
        'burned_captions': False, 'caption_track': None,
        'subtitle_field_untouched': True,
        'lines': lines,
        'full_mix_levels': levels,
        'decoded_peak_dbfs': peak, 'clipped_samples': clipped,
        'segment_rms_dbfs': [{'start': a, 'end': b,
                              'rms': rms_dbfs(mono[round(a * SR):round(b * SR)])}
                             for a, b in [(0, 3), (3, 7), (7, 9.15), (9.15, DURATION)]],
        'voice_bus_matches_stems': True,
        'reused_from_accepted': ['visual source clip', 'mechanical FX bed', 'fades', 'frame rate',
                                 '12.5 s length', 'handoff at 12.15 s'],
        'voice_processing': 'delivered _wet comms-channel version used as-is; no extra EQ or saturation',
        'distribution': 'project-internal use only per CS-07 delivery notes; not a real-person voice clone',
    }
    (OUT / 'review.json').write_text(json.dumps(record, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'film': record['film'], 'sha256': record['film_sha256'],
                      'levels': levels['input_i'], 'peak_dbfs': peak}, ensure_ascii=False), flush=True)


if __name__ == '__main__':
    main()
