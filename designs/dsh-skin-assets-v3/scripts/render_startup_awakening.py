#!/usr/bin/env python3
"""Mechanical companion x commander: an audible, source-bound awakening film.

The human defines the world: the user is the commander. The companion forms
from her own contour/optical mesh into segmented projection and full material,
then reports through a voice channel. No archive advertising copy, no changed
costume, no fake host authentication, and no baked test-workspace screenshot.
"""
from pathlib import Path
from datetime import datetime, timezone
import argparse
import hashlib
import json
import math
import subprocess
import wave

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy import signal

ROOT=Path(__file__).resolve().parents[3]
BASE=ROOT/'designs/dsh-skin-assets-v3'
OUT=BASE/'review/startup-awakening-2026-11-05'
AUDIO=OUT/'audio';AUDIO.mkdir(parents=True,exist_ok=True)
FF=ROOT/'reports/first-skin/.media-venv/lib/python3.9/site-packages/imageio_ffmpeg/binaries/ffmpeg-macos-aarch64-v7.1'
SOURCE=BASE/'assets/prepared/master-04-full.png'
W,H,FPS,DURATION,SR=1600,900,30,8.4,48000
VOICE_AT=3.4
VOICE=AUDIO/'commander-xiaoxiao.mp3'
VOICE_TEXT='指挥官，链路已接通。我已就位。'
FONT='/System/Library/Fonts/STHeiti Medium.ttc'
FONT_LATIN='/System/Library/Fonts/Supplemental/DIN Alternate Bold.ttf'
cv2.setNumThreads(2)

master=np.asarray(Image.open(SOURCE).convert('RGBA')).copy()
SH,SW=master.shape[:2]
assert (SW,SH)==(1664,2496)
alpha=master[:,:,3].astype(np.float32)/255
gray=cv2.cvtColor(master[:,:,:3],cv2.COLOR_RGB2GRAY)
gray=cv2.bilateralFilter(gray,7,28,28)
detail=cv2.Canny(gray,48,125).astype(np.float32)/255
outline=cv2.morphologyEx((alpha>.2).astype(np.uint8),cv2.MORPH_GRADIENT,np.ones((3,3),np.uint8)).astype(np.float32)
SY,SX=np.mgrid[:SH,:SW]
mesh=(((SX+SY)%96<2)|((SX-SY)%96<2)).astype(np.float32)*alpha
wire=np.clip(.85*detail*alpha+.75*outline+.16*mesh,0,1)
wire_glow=cv2.GaussianBlur(wire,(0,0),3.5)
XX,YY=np.meshgrid(np.arange(W,dtype=np.float32),np.arange(H,dtype=np.float32))
rng=np.random.default_rng(20261105)
noise=cv2.resize(rng.random((50,89),dtype=np.float32),(W,H),interpolation=cv2.INTER_CUBIC)
# A directed construction front: fine irregularity inside the projection,
# rather than cellular blobs covering her face and hair.
field=np.clip(.76*YY/H+.16*XX/W+.08*noise,0,1.12)
voice_samples=np.zeros(1,np.float32)


def ramp(t,start,duration):return max(0.,min(1.,(t-start)/duration))
def smooth(p):return p*p*(3-2*p)
def rise(t,start,duration):return smooth(ramp(t,start,duration))
def smooth_array(lo,hi,value):
    p=np.clip((value-lo)/(hi-lo),0,1);return p*p*(3-2*p)


def write_wav(path,data):
    with wave.open(str(path),'wb') as f:
        f.setnchannels(2);f.setsampwidth(2);f.setframerate(SR)
        f.writeframes(np.rint(np.clip(data,-1,1)*32767).astype('<i2').tobytes())


def make_audio():
    global voice_samples
    source=VOICE if VOICE.exists() else AUDIO/'commander-local-fallback.aiff'
    result=subprocess.run([str(FF),'-v','error','-i',str(source),'-f','f32le','-ar',str(SR),'-ac','1','pipe:1'],capture_output=True,check=True)
    voice_samples=np.frombuffer(result.stdout,np.float32).copy()
    # Keep intelligibility central, with a restrained channel character.
    sos=signal.butter(3,[115,6800],btype='bandpass',fs=SR,output='sos')
    voice_samples=signal.sosfilt(sos,voice_samples).astype(np.float32)
    voice_samples*=.56/max(float(np.max(np.abs(voice_samples))),1e-4)
    count=round(SR*DURATION);mix=np.zeros((count,2),np.float32)
    fx=np.zeros_like(mix);t=np.arange(count)/SR
    env=np.minimum(t/.8,1)*np.minimum((DURATION-t)/.7,1)
    hum=(np.sin(2*np.pi*55*t)+.32*np.sin(2*np.pi*110*t)+.12*np.sin(2*np.pi*220*t))
    fx[:,0]+=.014*hum*env;fx[:,1]+=.014*hum*env

    def add(sound,start,volume=.1,pan=0):
        at=round(start*SR);stop=min(count,at+len(sound))
        if stop<=at:return
        piece=sound[:stop-at]*volume
        fx[at:stop,0]+=piece*math.sqrt((1-pan)/2)
        fx[at:stop,1]+=piece*math.sqrt((1+pan)/2)

    def chirp(duration,lo,hi,noise_amount=0.):
        s=np.arange(round(duration*SR))/SR
        a=signal.chirp(s,lo,duration,hi,method='quadratic')
        n=rng.standard_normal(len(s))
        n=signal.sosfilt(signal.butter(2,4200,fs=SR,output='sos'),n)
        e=np.sin(np.pi*s/duration)**1.5
        return (a+noise_amount*n)*e

    add(chirp(.65,58,145,.12),.06,.16)
    for n,at in enumerate([.56,.83,1.16,1.50,1.86,2.18]):
        add(chirp(.055,1450+n*160,1800+n*180,.08),at,.07,(-1 if n%2 else 1)*.55)
    add(chirp(1.7,220,1900,.18),.90,.045,-.25)
    add(chirp(.55,140,52,.1),2.82,.20)
    for at,f in [(3.02,440),(3.17,554.37),(3.35,659.25)]:
        s=np.arange(round(.38*SR))/SR
        add((np.sin(2*np.pi*f*s)+.2*np.sin(2*np.pi*2*f*s))*np.exp(-s*10),at,.11,.15)
    add(chirp(.065,2800,800,.5),VOICE_AT-.055,.025)
    v=np.zeros(count,np.float32);at=round(VOICE_AT*SR);limit=min(len(voice_samples),count-at)
    v[at:at+limit]=voice_samples[:limit]
    mix[:,0]=v;mix[:,1]=v
    # Short, quiet reflections make the voice a comms presence, not a deep
    # robotic caricature or an unintelligible vocoder.
    for delay,amount,channel in [(.027,.07,0),(.041,.07,1),(.092,.035,0),(.113,.035,1)]:
        shift=round(delay*SR);mix[shift:,channel]+=v[:-shift]*amount
    voice_env=signal.sosfilt(signal.butter(2,10,fs=SR,output='sos'),v*v)
    duck=np.clip(np.sqrt(np.maximum(voice_env,0))*7,0,.6)
    fx*=1-duck[:,None]
    mix+=fx
    fade=np.minimum(t/.03,1)*np.minimum((DURATION-t)/.18,1)
    mix*=fade[:,None];mix*=.86/max(float(np.max(np.abs(mix))),.86)
    write_wav(AUDIO/'awakening-fx.wav',fx)
    write_wav(AUDIO/'awakening-mix-raw.wav',mix)
    path=AUDIO/'awakening-mix.wav'
    subprocess.run([str(FF),'-v','error','-y','-i',str(AUDIO/'awakening-mix-raw.wav'),
        '-af','loudnorm=I=-17:TP=-1.5:LRA=7','-ar',str(SR),'-c:a','pcm_s24le',str(path)],check=True)
    return {'file':str(path.relative_to(ROOT)),'voice_source':str(source.relative_to(ROOT)),
        'voice':'zh-CN-XiaoxiaoNeural via edge-tts' if source.suffix=='.mp3' else 'macOS Tingting local fallback',
        'source_text':VOICE_TEXT,'voice_start_seconds':VOICE_AT,'voice_seconds':len(voice_samples)/SR,
        'fx':'original deterministic synthesis; power hum, construction contacts, projection sweep, material lock, link tones',
        'sample_rate':SR,'channels':2,'loudness_target_lufs':-17,'true_peak_target_dbtp':-1.5,
        'paid_generation':False,'tts_runtime_dependency_added':False}


def warped(source,scale,fx,fy,interpolation=cv2.INTER_LINEAR):
    m=np.array([[scale,0,fx-835*scale],[0,scale,fy-360*scale]],np.float32)
    return cv2.warpAffine(source,m,(W,H),flags=interpolation,borderMode=cv2.BORDER_CONSTANT)


def over_rgb(base,color,opacity):
    a=np.clip(opacity,0,1)[:,:,None]
    return base*(1-a)+np.asarray(color,np.float32)*a


def label(draw,text,pos,size=24,color=(186,213,225),latin=False):
    draw.text(pos,text,font=ImageFont.truetype(FONT_LATIN if latin else FONT,size),fill=color)


def frame(t):
    camera=rise(t,.4,6.7)
    scale=1.18-.075*camera;cx=1130+12*camera;cy=408-8*camera
    rgba=warped(master,scale,cx,cy,cv2.INTER_CUBIC)
    a=rgba[:,:,3].astype(np.float32)/255;rgb=rgba[:,:,:3].astype(np.float32)
    e=warped(wire,scale,cx,cy);glow=warped(wire_glow,scale,cx,cy)
    base=np.zeros((H,W,3),np.float32);base[:]=(5,10,18)
    light=np.exp(-(((XX-1100)/920)**2+((YY-360)/700)**2))
    base+=light[:,:,None]*np.array([3,13,23],np.float32)
    # Source-contour construction is spatially resolved, never just a fade.
    build=rise(t,.30,1.70)
    line_field=np.clip(.56*(YY/H)+.23*(XX/W)+.21*noise,0,1)
    trace=smooth_array(line_field-.04,line_field+.04,build)
    wire_weight=(1-rise(t,2.55,1.50))*.95
    base=over_rgb(base,(25,119,165),np.clip(glow*trace*3.2*wire_weight,0,.45))
    base=over_rgb(base,(144,227,255),np.clip(e*trace*wire_weight,0,.97))
    # Segmented projection precedes full texture. Slice offsets converge as
    # material locks, and use the same contour/alpha source at every point.
    holo=rise(t,1.02,.70)*(1-rise(t,2.8,1.0))
    if holo>0:
        offset=(1-rise(t,1.7,1.6))*12*np.sin(np.floor(YY/26)*1.7+t*4)
        mono=cv2.cvtColor(rgba[:,:,:3],cv2.COLOR_RGB2GRAY).astype(np.float32)/255
        mono=cv2.remap(mono,XX+offset,YY,cv2.INTER_LINEAR)
        ma=cv2.remap(a,XX+offset,YY,cv2.INTER_LINEAR)
        bands=.18+.82*(np.sin(YY*.25+t*3)>.12)
        holo_a=ma*bands*holo*.48
        holo_color=np.stack([mono*68,mono*178,mono*230],axis=2)
        base=base*(1-holo_a[:,:,None])+holo_color*holo_a[:,:,None]
    material=rise(t,2.10,1.65)*1.40
    revealed=smooth_array(field-.016,field+.016,material)
    actor=a*revealed
    base=base*(1-actor[:,:,None])+rgb*actor[:,:,None]
    boundary=np.exp(-((field-material)/.010)**2)*a*(1-rise(t,3.45,.55))
    base=over_rgb(base,(102,223,255),boundary*.70)
    # Illumination is tied to the projection, with a bounded scan, no rapid
    # full-screen flashes and no permanent circuit markings on her body.
    if .65<t<3.0:
        scan_y=80+rise(t,.65,2.35)*740
        scan=np.exp(-((YY-scan_y)/3.2)**2)*a*.55
        base=over_rgb(base,(141,235,255),scan)
    image=Image.fromarray(np.clip(base,0,255).astype(np.uint8));d=ImageDraw.Draw(image)
    ui_alpha=rise(t,.10,.50)*(1-rise(t,7.85,.50))
    ui=lambda c:tuple(round(x*ui_alpha) for x in c)
    # Optical alignment and comms markers stay away from the face itself.
    for x,y,dx,dy in [(704,94,1,1),(1500,94,-1,1),(704,744,1,-1),(1500,744,-1,-1)]:
        d.line((x+dx*44,y,x,y,x,y+dy*32),fill=ui((61,125,157)),width=1)
    d.line((80,82,540,82),fill=ui((34,75,98)),width=1)
    d.line((80,82,80,104),fill=ui((101,201,237)),width=2)
    label(d,'机械姬 / 指挥官', (92,104),25,ui((201,224,236)))
    if t<1.25:primary,secondary='感知唤醒','SENSORY LINK'
    elif t<2.45:primary,secondary='投影构建','FRAME ASSEMBLY'
    elif t<3.65:primary,secondary='机体显现','MATERIALIZE'
    elif t<6.80:primary,secondary='指挥链路\n已接通','COMMAND LINK / ONLINE'
    else:primary,secondary='待命，\n指挥官。','AWAITING YOUR COMMAND'
    for j,line in enumerate(primary.split('\n')):label(d,line,(89,270+j*86),66,ui((223,238,246)))
    label(d,secondary,(94,480),22,ui((93,196,231)),latin=True)
    names=['感知','构建','链路']
    levels=[rise(t,.3,1.1),rise(t,1.3,1.5),rise(t,3.05,.6)]
    for j,(name,p) in enumerate(zip(names,levels)):
        label(d,name,(94+j*152,595),19,ui((136,169,187)))
        for k in range(8):
            x=94+j*152+k*12
            color=ui((89,205,239) if p>(k+.4)/8 else (26,52,68))
            d.rectangle((x,628,x+7,632),fill=color)
    # A real audio envelope, visible only during her voice-channel report.
    age=t-VOICE_AT
    if 0<=age<len(voice_samples)/SR+.13:
        for i in range(42):
            at=round((age-i*.018)*SR)
            segment=voice_samples[max(0,at-600):max(0,at)]
            amp=float(np.sqrt(np.mean(segment*segment))) if len(segment) else 0
            height=min(34,amp*125)
            x=96+(41-i)*7
            d.line((x,713-height,x,713+height),fill=ui((99,212,240)),width=2)
        caption='指挥官，链路已接通。' if age<2.68 else '我已就位。'
        label(d,caption,(92,770),29,ui((211,231,241)))
    label(d,'NEURAL CHANNEL', (94,850),16,ui((71,126,154)),latin=True)
    # The runtime will reveal its live workspace; no screenshot is baked in.
    end=1-rise(t,7.92,.48)
    if end<1:image=Image.blend(Image.new('RGB',(W,H),(5,10,18)),image,end)
    return image


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--stills-only',action='store_true');args=parser.parse_args()
    audio=make_audio()
    times=[.70,1.60,2.65,3.70,5.10,7.25]
    sheet=Image.new('RGB',(1600,3*480),(7,14,23));sd=ImageDraw.Draw(sheet)
    font=ImageFont.truetype(FONT,18)
    for i,t in enumerate(times):
        im=frame(t);im.save(OUT/f'key-{i+1:02d}.png');im.thumbnail((790,444),Image.Resampling.LANCZOS)
        x=(i%2)*800;y=(i//2)*480;sheet.paste(im,(x+5,y+30));sd.text((x+10,y+5),f'{t:.2f}s',font=font,fill='#a8cddd')
    sheet.save(OUT/'sequence-board.jpg',quality=95)
    silent=OUT/'awakening-visual.mp4';target=OUT/'mechanical-companion-commander.mp4'
    if not args.stills_only:
        p=subprocess.Popen([str(FF),'-v','error','-y','-f','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}',
            '-r',str(FPS),'-i','-','-an','-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p',str(silent)],stdin=subprocess.PIPE)
        for n in range(round(FPS*DURATION)):
            p.stdin.write(frame(n/FPS).tobytes())
            if n%30==0:print(f'awakening {n}/{round(FPS*DURATION)}',flush=True)
        p.stdin.close()
        if p.wait()!=0:raise RuntimeError('Awakening visual render failed')
        subprocess.run([str(FF),'-v','error','-y','-i',str(silent),'-i',str(ROOT/audio['file']),
            '-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','aac','-b:a','192k','-ar',str(SR),
            '-t',str(DURATION),'-movflags','+faststart',str(target)],check=True)
    record={'status':'audible offline startup candidate; no native trigger or running skin changed',
        'at':datetime.now(timezone.utc).isoformat(),'theme':'机械姬 × 指挥官','user_role':'指挥官',
        'human_direction':'whole skin follows this relationship; startup is her awakening and report, not archive advertising',
        'selected_master':str(SOURCE.relative_to(ROOT)),'source_size':[SW,SH],
        'source_sha256':hashlib.sha256(SOURCE.read_bytes()).hexdigest(),'size':[W,H],'fps':FPS,'duration_seconds':DURATION,
        'video':str(target.relative_to(ROOT)) if target.exists() else None,'audio':audio,
        'visual_treatment':['source-derived contours and projected mesh construction','segmented displaced holographic layers converge',
            'nonlinear in-silhouette material reveal with emissive boundary','same master resolves to full color, optical alignment and actual voice envelope'],
        'does_not_claim':['new eye or limb acting','new 3D model or actual mechanical body parts','host authentication or hardware telemetry'],
        'prior_candidate':'5.8-second archive-copy silent candidate rejected by user, retained as history',
        'native_integrated':False,'new_paid_generation':False,'baked_workspace_screenshot':False,
        'integration_notes':['use existing skip/stop/lifecycle owner; do not stack full workspace intro after startup',
            'audio preview authorized by current user request; production volume/mute/control must follow the existing product entry',
            'reduced motion: same-master stable portrait and short crossfade, no construction displacement/fast scan',
            'final handoff must reveal live workspace, not test session content; no automatic audio played during authoring']}
    if target.exists():record['video_sha256']=hashlib.sha256(target.read_bytes()).hexdigest()
    (OUT/'review.json').write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({'video':record['video'],'audio':audio,'storyboard':str(OUT/'sequence-board.jpg')},ensure_ascii=False),flush=True)


if __name__=='__main__':main()
