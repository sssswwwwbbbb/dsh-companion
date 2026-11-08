#!/usr/bin/env python3
"""Finish the user's actual environment/entrance film; preserve its original.

No standee reconstruction, reference-video audio, baked workspace screenshot,
new generation request, or runtime modification is part of this render.
"""
from pathlib import Path
import importlib.util
import hashlib
import json
import math
import subprocess

import numpy as np
from scipy import signal

ROOT=Path(__file__).resolve().parents[3]
BASE=ROOT/'designs/dsh-skin-assets-v3'
OUT=BASE/'review/startup-entrance-01-2026-11-05'
SOURCE=BASE/'assets/cinematic/source/entrance-01-source.mp4'
VOICE=BASE/'review/machine-voice-2026-11-05/machine-report.wav'
FF=ROOT/'reports/first-skin/.media-venv/lib/python3.9/site-packages/imageio_ffmpeg/binaries/ffmpeg-macos-aarch64-v7.1'
FONT='/System/Library/Fonts/STHeiti Medium.ttc'
SR=48000
DURATION=12.0
VOICE_AT=9.22
HANDOFF_AT=11.65
TEXT='指挥官，我已就位。'
spec=importlib.util.spec_from_file_location('machine_voice',Path(__file__).with_name('render_machine_voice.py'))
audio=importlib.util.module_from_spec(spec);spec.loader.exec_module(audio)
rng=np.random.default_rng(11052026)


def run(args):return subprocess.run([str(FF),*args],capture_output=True,check=True)


def mix_audio():
    n=round(DURATION*SR);t=np.arange(n)/SR;fx=np.zeros((n,2))
    def add(x,at,gain=1,pan=0):
        begin=round(at*SR);end=min(n,begin+len(x));part=x[:end-begin]*gain
        fx[begin:end,0]+=part*math.sqrt((1-pan)/2)
        fx[begin:end,1]+=part*math.sqrt((1+pan)/2)
    def contact(at,pan=0,gain=.18):
        s=np.arange(round(.12*SR))/SR
        sound=(np.sin(2*np.pi*860*s)+.42*np.sin(2*np.pi*1810*s)+.18*np.sin(2*np.pi*3720*s))*np.exp(-s*65)
        add(sound,at,gain,pan);add(sound,at+.024,gain*.27,pan)
    def motor(at,length,pan=0,lo=110,hi=220,gain=.07):
        s=np.arange(round(length*SR))/SR
        friction=signal.sosfilt(signal.butter(2,[580,3200],btype='bandpass',fs=SR,output='sos'),rng.standard_normal(len(s)))
        carrier=signal.chirp(s,lo,length,hi,method='quadratic')
        env=np.sin(np.pi*s/length)**1.6
        add((.65*carrier+.26*friction)*env,at,gain,pan)
    def discharge(at,length=.15,pan=0,gain=.07):
        s=np.arange(round(length*SR))/SR
        crack=signal.sosfilt(signal.butter(2,[1100,7500],btype='bandpass',fs=SR,output='sos'),rng.standard_normal(len(s)))
        add(crack*np.exp(-s*28),at,gain,pan)
    # Corridor power travels in depth; clicks are tied to visible mechanisms.
    bed=.007*(np.sin(2*np.pi*47*t)+.22*np.sin(2*np.pi*94*t))
    envelope=np.minimum(t/.35,1)*np.minimum((DURATION-t)/.35,1)
    fx[:,0]+=bed*envelope;fx[:,1]+=bed*envelope
    motor(.12,1.22,0,60,155,.05)
    discharge(.73,.16,-.6);discharge(1.02,.16,.55)
    contact(2.42,0,.13)
    # Release, two opposing rails, then a short material-weight settlement.
    contact(3.13,-.36);contact(3.34,.36)
    motor(3.28,.94,-.55,82,146,.10)
    motor(3.39,.93,.55,93,158,.10)
    contact(4.22,-.32,.22);contact(4.27,.32,.20)
    # A small camera/air transition, not another invented character action.
    motor(7.53,.29,0,320,1400,.025)
    s=np.arange(round(.46*SR))/SR
    charge=signal.chirp(s,690,.46,2900,method='quadratic')*np.sin(np.pi*s/.46)**2
    add(charge,8.58,.028)
    discharge(8.93,.12,-.25,.045);contact(9.03,.1,.10)
    contact(9.15,0,.035)
    raw=run(['-v','error','-i',str(VOICE),'-f','f32le','-ar',str(SR),'-ac','1','pipe:1']).stdout
    voice=np.frombuffer(raw,np.float32)
    begin=round(VOICE_AT*SR);end=min(n,begin+len(voice))
    fx[begin-2400:end+4800]*=.18
    # Close the channel once, after her final syllable, before the live UI.
    contact(11.73,0,.025)
    mix=fx.copy();mix[begin:end,0]+=voice[:end-begin];mix[begin:end,1]+=voice[:end-begin]
    mix*=np.minimum(t/.025,1)[:,None]*np.minimum((DURATION-t)/.07,1)[:,None]
    mix*=.88/max(float(np.max(np.abs(mix))),.88)
    audio.wav(OUT/'sound-scene-raw.wav',mix)
    audio.norm(OUT/'sound-scene-raw.wav',OUT/'sound-scene.wav')
    return len(voice)/SR


def main():
    OUT.mkdir(parents=True,exist_ok=True)
    voice_seconds=mix_audio()
    (OUT/'report-line.txt').write_text(TEXT)
    (OUT/'captions.vtt').write_text('WEBVTT\n\n00:00:09.220 --> 00:00:11.650\n'+TEXT+'\n')
    # The user's 10.08-second source is not upscaled. The final gaze is held
    # briefly for the short report and handoff; this is not new generated acting.
    filters=','.join([
        'fps=24','tpad=stop_mode=clone:stop_duration=2',
        'fade=t=in:st=0:d=0.18',
        f"drawtext=fontfile='{FONT}':textfile='{OUT/'report-line.txt'}':fontsize=23:fontcolor=white:box=1:boxcolor=black@0.58:boxborderw=8:x=(w-text_w)/2:y=h-54:enable='between(t,{VOICE_AT},{HANDOFF_AT})'",
        f'fade=t=out:st={HANDOFF_AT}:d={DURATION-HANDOFF_AT}'
    ])
    target=OUT/'startup-entrance-01-with-sound.mp4'
    encoded=target.with_name(target.stem+'.encoding.mp4')
    run(['-v','error','-y','-i',str(SOURCE),'-i',str(OUT/'sound-scene.wav'),
        '-map','0:v:0','-map','1:a:0','-vf',filters,'-t',str(DURATION),
        '-c:v','libx264','-preset','fast','-crf','17','-pix_fmt','yuv420p',
        '-c:a','aac','-b:a','192k','-ar',str(SR),'-movflags','+faststart',str(encoded)])
    encoded.replace(target)
    run(['-v','error','-y','-i',str(SOURCE),'-map','0:a:0','-c:a','pcm_s16le',str(OUT/'original-source-audio.wav')])
    record={'status':'complete audible offline candidate; user/primary audiovisual acceptance pending',
        'video':str(target.relative_to(ROOT)),'source':str(SOURCE.relative_to(ROOT)),
        'source_sha256':hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
        'video_sha256':hashlib.sha256(target.read_bytes()).hexdigest(),
        'size':[1280,720],'fps':24,'duration_seconds':DURATION,
        'source_seconds':10.08,'source_pixels_upscaled':False,
        'source_review':'same working master04 identity cues retained: blue-purple long hair, white headpiece, navy long-sleeved dress, white apron, knee socks and laced shoes; not a final canon acceptance',
        'events':[{'seconds':[0,1.8],'event':'corridor/environment prelude'},
            {'seconds':[1.8,3.2],'event':'chamber approach and first silhouette through window'},
            {'seconds':[3.2,4.3],'event':'mechanical shutters release and full-body reveal'},
            {'seconds':[7.5,9.1],'event':'close-up, eyes open and optical charge'},
            {'seconds':[VOICE_AT,VOICE_AT+voice_seconds],'event':'short synthetic report'},
            {'seconds':[HANDOFF_AT,DURATION],'event':'reveal live workspace through existing lifecycle owner'}],
        'tail':'last source frame held from about 10.08s for the report and handoff; no new lip/eye/limb acting synthesized',
        'audio':{'voice':str(VOICE.relative_to(ROOT)),'text':TEXT,'voice_at_seconds':VOICE_AT,
            'voice_seconds':voice_seconds,'provider_and_processing':'one prior Edge online TTS short-line request, then local 30-band electronic-carrier resynthesis; see machine-voice voice-design.json',
            'fx':'original local servo, interlocks, rail travel, charge and comms contacts retimed to this actual source',
            'source_audio':'retained as original-source-audio.wav for review; replaced in this candidate',
            'copied_reference_audio':False,'new_tts_requests':0,'new_paid_generation':False,'ear_review_completed':False},
        'nativeIntegrated':False,'baked_workspace_screenshot':False,
        'handoff':{'at_seconds':HANDOFF_AT,'seconds':DURATION-HANDOFF_AT,
            'target':'live current workspace, never a baked test session',
            'prototype':'existing preview owner, skip/Esc/mute/reduced-motion/cancel paths; no second full workspace intro'},
        'original_preserved':True}
    (OUT/'cinematic-review.json').write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({'video':str(target.relative_to(ROOT)),'duration':DURATION,'handoff_at':HANDOFF_AT,'voice_at':VOICE_AT},ensure_ascii=False))


if __name__=='__main__':main()
