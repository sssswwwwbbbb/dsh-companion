"""Improve the existing original FX stem without changing bound media.

The known old narration is removed from our own raw mix, then the FX are
equalised and levelled by shot. This is preparation for the new reference-
conditioned narration, not a replacement voice or an edited reference clip.
"""
from pathlib import Path
import hashlib
import json
import subprocess
import numpy as np
import soundfile as sf
from scipy import signal

OUT=Path(__file__).resolve().parent
ROOT=OUT.parents[3]
BASE=ROOT/'designs/dsh-skin-assets-v3'
FF=ROOT/'reports/first-skin/.media-venv/lib/python3.9/site-packages/imageio_ffmpeg/binaries/ffmpeg-macos-aarch64-v7.1'
RAW=BASE/'review/startup-entrance-01-2026-11-05/sound-scene-raw.wav'
VOICE=BASE/'review/machine-voice-2026-11-05/machine-report.wav'
BOUND=BASE/'review/startup-entrance-01-2026-11-05/startup-entrance-01-with-sound.mp4'


def rms_db(x):return float(20*np.log10(max(float(np.sqrt(np.mean(x*x))),1e-12)))
def peak_db(x):return float(20*np.log10(max(float(np.max(np.abs(x))),1e-12)))


raw,sr=sf.read(RAW,always_2d=True)
# Match the original renderer's FFmpeg stereo-to-mono matrix exactly; a
# simple channel mean differs by 3dB for its dual-mono narration source.
decoded=subprocess.run([str(FF),'-v','error','-i',str(VOICE),'-f','f32le','-ar',str(sr),'-ac','1','pipe:1'],capture_output=True,check=True)
voice=np.frombuffer(decoded.stdout,np.float32).astype(np.float64)
assert sr==48000
start=round(9.22*sr);stop=start+len(voice)
mask=np.abs(voice)>.02
scale=float(np.dot(raw[start:stop].mean(axis=1)[mask],voice[mask])/np.dot(voice[mask],voice[mask]))
assert .8<scale<1.2, 'Unexpected raw-mix gain; do not guess the stem calibration'
bed=raw.copy();bed[start:stop]-=voice[:,None]*scale
bed=signal.sosfiltfilt(signal.butter(2,70,btype='highpass',fs=sr,output='sos'),bed,axis=0)
presence=signal.sosfiltfilt(signal.butter(2,[500,3200],btype='bandpass',fs=sr,output='sos'),bed,axis=0)
bed+=.45*presence
regions=[(0,3,-28,20),(3,7,-26,18),(7,9.22,-29,20),(9.22,12,-34,8)]
envelope=np.ones(len(bed));gains=[]
for begin,end,target,maximum in regions:
    a=round(begin*sr);b=min(len(bed),round(end*sr))
    db=min(maximum,target-rms_db(bed[a:b]))
    envelope[a:b]=10**(db/20);gains.append(db)
# Smooth the gain boundaries rather than introducing a digital level jump.
for i in range(1,len(regions)):
    centre=round(regions[i][0]*sr);a=centre-round(.1*sr);b=centre+round(.1*sr)
    phase=np.linspace(0,1,b-a);phase=phase*phase*(3-2*phase)
    envelope[a:b]=(1-phase)*10**(gains[i-1]/20)+phase*10**(gains[i]/20)
bed*=envelope[:,None]
headroom=min(1,.70/max(float(np.max(np.abs(bed))),1e-9));bed*=headroom
assert np.max(np.abs(bed))<1
target=OUT/'mechanical-bed-preview.wav'
sf.write(target,bed,sr,subtype='PCM_24')
subprocess.run([str(FF),'-v','error','-y','-i',str(target),'-c:a','libmp3lame','-b:a','192k',str(target.with_suffix('.mp3'))],check=True)
old=subprocess.run([str(FF),'-v','error','-i',str(BOUND),'-map','0:a:0','-f','f32le','-ar',str(sr),'-ac','2','pipe:1'],capture_output=True,check=True)
old=np.frombuffer(old.stdout,np.float32).reshape(-1,2)
report=[]
for begin,end,target_rms,_ in regions:
    a=round(begin*sr);b=min(len(bed),round(end*sr))
    report.append({'start':begin,'end':end,'old_full_mix_rms_dbfs':round(rms_db(old[a:b]),2),
        'new_fx_only_rms_dbfs':round(rms_db(bed[a:b]),2),'new_fx_only_peak_dbfs':round(peak_db(bed[a:b]),2),
        'requested_rms_dbfs':target_rms})
record={'status':'independent FX-only preparation; new reference voice pending; not bound to current preview',
    'source_raw_mix':str(RAW.relative_to(ROOT)),'known_old_voice_gain_removed':scale,
    'whole_bed_peak_dbfs':round(peak_db(bed),2),'clipped_samples':int(np.count_nonzero(np.abs(bed)>=1)),
    'boundary_crossfade_seconds':.2,'segments':report,
    'voice_original':str(VOICE.relative_to(ROOT)),'reference_recording_used_in_fx':False,
    'full_film_remixed':False,'existing_bound_media_sha256':hashlib.sha256(BOUND.read_bytes()).hexdigest(),
    'auditory_acceptance':False,'note':'old full-mix column includes old narration after 9.22s; new column is FX only, not a claim that final dialogue is quieter'}
(OUT/'sound-bed-levels.json').write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(record,ensure_ascii=False,indent=2))
