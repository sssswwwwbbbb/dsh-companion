#!/usr/bin/env python3
"""A short synthetic report and an original mechanical sound-scene study.

The source is one explicitly scripted Edge TTS line, not a cloned performer.
This is an independent sound candidate while the user makes the new video.
"""
from pathlib import Path
import hashlib
import json
import math
import subprocess
import wave

import numpy as np
from scipy import signal

ROOT=Path(__file__).resolve().parents[3]
OUT=ROOT/'designs/dsh-skin-assets-v3/review/machine-voice-2026-11-05'
FF=ROOT/'reports/first-skin/.media-venv/lib/python3.9/site-packages/imageio_ffmpeg/binaries/ffmpeg-macos-aarch64-v7.1'
SR=48000
SOURCE=OUT/'report-source.mp3'
TEXT='指挥官，我已就位。'
rng=np.random.default_rng(20261105)


def wav(path,data):
    if data.ndim==1:data=np.stack([data,data],axis=1)
    with wave.open(str(path),'wb') as f:
        f.setnchannels(2);f.setsampwidth(2);f.setframerate(SR)
        f.writeframes(np.rint(np.clip(data,-1,1)*32767).astype('<i2').tobytes())


def norm(raw,target,level=-17):
    expr=f'loudnorm=I={level}:TP=-1.8:LRA=7'
    r=subprocess.run([str(FF),'-hide_banner','-i',str(raw),'-af',expr+':print_format=json',
        '-f','null','-'],capture_output=True,text=True,check=True)
    stats=json.JSONDecoder().raw_decode(r.stderr[r.stderr.rfind('{'):])[0]
    config=expr+':linear=true:'+':'.join(['measured_I='+stats['input_i'],
        'measured_TP='+stats['input_tp'],'measured_LRA='+stats['input_lra'],
        'measured_thresh='+stats['input_thresh'],'offset='+stats['target_offset']])
    subprocess.run([str(FF),'-v','error','-y','-i',str(raw),'-af',config,
        '-ar',str(SR),'-c:a','pcm_s24le',str(target)],check=True)
    # Large silent gaps can force loudnorm into dynamic mode. Measure the
    # produced result and make a final linear correction with peak headroom.
    check=subprocess.run([str(FF),'-hide_banner','-i',str(target),'-af',expr+':print_format=json',
        '-f','null','-'],capture_output=True,text=True,check=True)
    observed=json.JSONDecoder().raw_decode(check.stderr[check.stderr.rfind('{'):])[0]
    delta=min(level-float(observed['input_i']),-1.8-float(observed['input_tp']))
    if abs(delta)>.15:
        adjusted=target.with_suffix('.adjusted.wav')
        subprocess.run([str(FF),'-v','error','-y','-i',str(target),'-af',f'volume={delta:.4f}dB',
            '-c:a','pcm_s24le',str(adjusted)],check=True)
        adjusted.replace(target)


def make_voice():
    r=subprocess.run([str(FF),'-v','error','-i',str(SOURCE),'-f','f32le',
        '-ar',str(SR),'-ac','1','pipe:1'],capture_output=True,check=True)
    x=np.frombuffer(r.stdout,np.float32).astype(np.float64)
    x=signal.sosfiltfilt(signal.butter(3,[125,7900],btype='bandpass',fs=SR,output='sos'),x)
    # Speech envelopes drive a fixed electronic excitation. Pitch is no longer
    # the natural announcer's expressive rise/fall. Articulation remains in
    # the source envelope and fricatives, without long room-reverb disguise.
    t=np.arange(len(x))/SR
    carrier=np.zeros(len(x))
    for harmonic in range(1,39):
        carrier+=np.sin(2*np.pi*196*harmonic*t+.08*harmonic)/harmonic**.68
    carrier/=np.max(np.abs(carrier))
    noise=rng.standard_normal(len(x))
    low=21.4*np.log10(1+.00437*140)
    high=21.4*np.log10(1+.00437*7900)
    edges=(10**(np.linspace(low,high,31)/21.4)-1)/.00437
    wet=np.zeros(len(x))
    smoothing=signal.butter(2,42,fs=SR,output='sos')
    for lo,hi in zip(edges[:-1],edges[1:]):
        filt=signal.butter(2,[lo,hi],btype='bandpass',fs=SR,output='sos')
        mod=signal.sosfiltfilt(filt,x)
        envelope=signal.sosfiltfilt(smoothing,np.abs(signal.hilbert(mod)))
        excitation=signal.sosfiltfilt(filt,carrier)
        excitation/=max(float(np.sqrt(np.mean(excitation**2))),.001)
        # Consonants above 3k retain a little unpitched excitation.
        if lo>2800:
            hiss=signal.sosfiltfilt(filt,noise)
            hiss/=max(float(np.sqrt(np.mean(hiss**2))),.001)
            excitation=.68*excitation+.32*hiss
        wet+=np.maximum(envelope,0)*excitation
    wet*=float(np.sqrt(np.mean(x*x)))/max(float(np.sqrt(np.mean(wet*wet))),1e-8)
    y=.84*wet+.16*x
    y=signal.sosfiltfilt(signal.butter(2,[180,7500],btype='bandpass',fs=SR,output='sos'),y)
    # A restrained ring component contributes a metallic carrier; the filter
    # bank, rather than distortion alone, establishes the synthetic voice.
    y=y*(.96+.04*np.sin(2*np.pi*73*t))
    y=np.tanh(y*3.1)/3.1
    env=signal.sosfiltfilt(signal.butter(2,55,fs=SR,output='sos'),np.abs(x))
    gate=np.clip((env-.0006)/.0025,0,1)
    y*=gate
    y*=.76/max(float(np.max(np.abs(y))),1e-8)
    y*=np.minimum(t/.008,1)*np.minimum((len(y)/SR-t)/.025,1)
    wav(OUT/'report-synthetic-raw.wav',y)
    norm(OUT/'report-synthetic-raw.wav',OUT/'machine-report.wav')
    return y,len(x)/SR


def sound_scene(voice):
    duration=10.0;n=round(duration*SR);scene=np.zeros((n,2))
    def add(x,at,gain=1.,pan=0):
        i=round(at*SR);stop=min(n,i+len(x));part=x[:stop-i]*gain
        scene[i:stop,0]+=part*math.sqrt((1-pan)/2)
        scene[i:stop,1]+=part*math.sqrt((1+pan)/2)
    def contact(at,pan=0):
        t=np.arange(round(.11*SR))/SR
        strike=(np.sin(2*np.pi*870*t)+.42*np.sin(2*np.pi*1675*t)+.18*np.sin(2*np.pi*3920*t))*np.exp(-t*68)
        add(strike,at,.17,pan)
        add(strike,at+.021,.045,pan)
    def motor(at,duration,pan=0,low=115,high=245):
        t=np.arange(round(duration*SR))/SR
        tone=signal.chirp(t,low,duration,high,method='quadratic')
        friction=signal.sosfilt(signal.butter(2,[600,3400],btype='bandpass',fs=SR,output='sos'),rng.standard_normal(len(t)))
        env=np.sin(np.pi*t/duration)**1.7
        add((.65*tone+.28*friction)*env,at,.075,pan)
    # Air and machine weight; no tune, cheerful chime, or constant key beeps.
    t=np.arange(n)/SR
    bed=(np.sin(2*np.pi*43*t)+.2*np.sin(2*np.pi*86*t))
    envelope=np.minimum(t/.6,1)*np.minimum((duration-t)/.8,1)
    scene[:,0]+=.012*bed*envelope;scene[:,1]+=.012*bed*envelope
    for i,at in enumerate([.4,1.13,2.10]):
        motor(at,.48,(-1 if i%2 else 1)*.6);contact(at+.49,(-1 if i%2 else 1)*.4)
    contact(3.02,-.45);contact(3.18,.45)
    motor(3.40,1.35,-.45,84,155);motor(3.74,1.42,.45,97,170)
    contact(5.19,-.3);contact(5.27,.3)
    charge_t=np.arange(round(.80*SR))/SR
    charge=signal.chirp(charge_t,260,.80,1560,method='quadratic')*np.sin(np.pi*charge_t/.80)**2
    add(charge,5.76,.035)
    contact(6.59,0)
    # Hold a short quiet interval so the report is the end of the awakening,
    # not dialogue competing with the middle of a loud mechanical sweep.
    at=7.05;start=round(at*SR);stop=min(n,start+len(voice))
    scene[start:stop]*=.24
    add(voice,at,.54)
    scene*=np.minimum(t/.03,1)[:,None]*np.minimum((duration-t)/.08,1)[:,None]
    scene*=.83/max(float(np.max(np.abs(scene))),.83)
    wav(OUT/'sound-scene-raw.wav',scene)
    norm(OUT/'sound-scene-raw.wav',OUT/'sound-scene-candidate.wav')
    return at


def main():
    OUT.mkdir(parents=True,exist_ok=True)
    voice,seconds=make_voice();at=sound_scene(voice)
    record={'status':'sound-design candidate; not accepted by user and not synced to a received cinematic',
        'source':str(SOURCE.relative_to(ROOT)),'source_sha256':hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
        'text':TEXT,'source_seconds':seconds,'provider':'Microsoft Edge online TTS through isolated edge-tts',
        'voice':'zh-CN-XiaoxiaoNeural, pitch -15Hz, rate 0%','requests_this_short_line':1,'characters':len(TEXT),
        'new_jimeng_requests':0,'paid_model_requests':0,'runtime_dependency_added':False,
        'processing':{'bands':30,'carrier_hz':196,'wet_fraction':.84,'original_fraction':.16,
            'method':'speech-envelope filter-bank resynthesis with fixed harmonic carrier; consonant noise, short gate and mild ring component',
            'room_reverb':False,'voice_clone':False},
        'files':{'report':str((OUT/'machine-report.wav').relative_to(ROOT)),'scene':str((OUT/'sound-scene-candidate.wav').relative_to(ROOT))},
        'scene_seconds':10,'report_at_seconds':at,'timing':'provisional 10-second brief, retime to actual source when received',
        'fx_source':'original deterministic synthesis; servo travel, mechanical double contacts, door travel and power charge',
        'reference_audio_copied':False,'ear_review_completed':False,'nativeIntegrated':False}
    (OUT/'voice-design.json').write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({'report':record['files']['report'],'scene':record['files']['scene'],'source_seconds':seconds},ensure_ascii=False))


if __name__=='__main__':main()
