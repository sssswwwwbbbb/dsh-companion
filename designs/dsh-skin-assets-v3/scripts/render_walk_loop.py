#!/usr/bin/env python3
"""Prepare one real walk-cycle candidate from the received video, not a still."""
from pathlib import Path
from datetime import datetime, timezone
import hashlib
import json
import subprocess

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[3]
BASE = ROOT / 'designs/dsh-skin-assets-v3'
WORK = ROOT / '.local/walk-loop-01'
FF = ROOT / 'reports/first-skin/.media-venv/lib/python3.9/site-packages/imageio_ffmpeg/binaries/ffmpeg-macos-aarch64-v7.1'
W, H, FPS = 720, 960, 24
START, END, FLOOR = 34, 79, 940
cv2.setNumThreads(1)
Y, X = np.mgrid[:H, :W].astype(np.float32)


def smooth(lo, hi, v):
    t = np.clip((v-lo)/(hi-lo), 0, 1)
    return t*t*(3-2*t)


raw = {}; alphas = {}; colors = {}; grounds = {}
for index in range(START-1, END+2):
    source = np.asarray(Image.open(WORK/'frames'/f'{index:04d}.png').convert('RGB'))
    rgba = np.asarray(Image.open(WORK/'alpha'/f'{index:04d}.png').convert('RGBA')).copy()
    rgb = source.astype(np.float32)
    left = np.median(rgb[:,:20], axis=1);right = np.median(rgb[:,-20:],axis=1)
    position = np.linspace(0,1,W)[None,:,None]
    background = left[:,None,:]*(1-position)+right[:,None,:]*position
    distance = np.sqrt(((rgb-background)**2).sum(2))
    r,g,b = rgb[:,:,0],rgb[:,:,1],rgb[:,:,2]
    keep = np.maximum(smooth(14,38,distance),smooth(7,22,b-np.maximum(r,g)))
    keep[(r-g>10)&(r-b>15)] = 1
    perimeter = ((X<245)|(X>490))&(Y>130)&(Y<760)
    keep[~perimeter]=1
    a=rgba[:,:,3].astype(np.float32)*keep
    alphas[index]=a;colors[index]=rgba[:,:,:3]
    raw[index]=cv2.resize(cv2.cvtColor(source,cv2.COLOR_RGB2GRAY),(360,480))


def aligned_alpha(index, neighbor):
    flow=cv2.calcOpticalFlowFarneback(raw[index],raw[neighbor],None,.5,3,17,3,5,1.2,0)
    flow=cv2.resize(flow,(W,H),interpolation=cv2.INTER_LINEAR)*2
    return cv2.remap(alphas[neighbor],X+flow[:,:,0],Y+flow[:,:,1],cv2.INTER_LINEAR,borderMode=cv2.BORDER_CONSTANT)


stabilized={}
for index in range(START,END+1):
    a=alphas[index]
    median=np.median(np.stack([aligned_alpha(index,index-1),a,aligned_alpha(index,index+1)]),axis=0)
    final=.7*a+.3*median
    final[a>=250]=a[a>=250];final[a<3]=0
    rgba=np.dstack([colors[index],np.rint(final).astype(np.uint8)])
    # Walking has a supporting foot throughout. This is only a fixed image
    # floor correction; the source supplies all leg/arm motion and the host
    # will own horizontal displacement separately.
    solid=(rgba[:,:,3]>230)&(Y>H*.76)
    if not np.any(solid):raise RuntimeError('No opaque sole region: '+str(index))
    bottom=int(np.where(solid)[0].max())
    grounds[index]=bottom
    stabilized[index]=Image.fromarray(rgba)

frames=[];records=[]
for index in range(START,END):
    dy=FLOOR-grounds[index]
    if abs(dy)>28:raise RuntimeError('Unexpected floor change: '+str((index,dy)))
    out=Image.new('RGBA',(W,H));out.alpha_composite(stabilized[index],(0,dy))
    a=np.asarray(out.getchannel('A'))
    assert max(int(a[0,0]),int(a[0,-1]),int(a[-1,0]),int(a[-1,-1]))==0
    frames.append(out)
    records.append({'source_frame':index,'source_seconds':index/FPS,'source_opaque_sole_y':grounds[index],
                    'vertical_floor_correction_px':dy,'ground_y':FLOOR,
                    'alpha_extrema':[int(a.min()),int(a.max())]})

target=BASE/'assets/motion/walk-loop-01.webm'
proc=subprocess.Popen([str(FF),'-v','error','-y','-f','rawvideo','-pix_fmt','rgba','-s',f'{W}x{H}',
    '-r',str(FPS),'-i','-','-an','-c:v','libvpx-vp9','-pix_fmt','yuva420p','-b:v','0','-crf','18',
    '-deadline','good','-cpu-used','4','-threads','3','-row-mt','1','-auto-alt-ref','0',str(target)],stdin=subprocess.PIPE)
for im in frames:proc.stdin.write(im.tobytes())
proc.stdin.close()
if proc.wait()!=0:raise RuntimeError('Walk alpha encode failed')

font=ImageFont.truetype('/System/Library/Fonts/STHeiti Medium.ttc',19)
preview=BASE/'review/walk-loop-01-light-dark.mp4'
proc=subprocess.Popen([str(FF),'-v','error','-y','-f','rawvideo','-pix_fmt','rgb24','-s','1320x960',
    '-r',str(FPS),'-i','-','-an','-c:v','libx264','-preset','fast','-crf','19','-pix_fmt','yuv420p',
    '-movflags','+faststart',str(preview)],stdin=subprocess.PIPE)
for index in range(len(frames)*3):
    board=Image.new('RGBA',(1320,960),'#f4f1e9');d=ImageDraw.Draw(board)
    d.rectangle((660,0,1320,960),fill='#202423')
    im=frames[index%len(frames)].resize((600,800),Image.Resampling.LANCZOS)
    for x,fg in [(30,'#2b302c'),(690,'#f4f1e9')]:
        d.text((x+10,25),'真实走路循环 · 同一原片 / 浅深底检查',font=font,fill=fg)
        d.line((x,873,x+600,873),fill='#759ba8',width=1)
        board.alpha_composite(im,(x,90))
        d.text((x+10,914),f'1.875秒 / 第 {index//len(frames)+1} 轮 / 尚未原生拟合',font=font,fill=fg)
    proc.stdin.write(board.convert('RGB').tobytes())
proc.stdin.close()
if proc.wait()!=0:raise RuntimeError('Walk preview encode failed')

sheet=Image.new('RGB',(1440,2*390),'#eeeae2');d=ImageDraw.Draw(sheet)
for j,ix in enumerate([0,6,12,18,23,29,35,44]):
    im=frames[ix].copy();im.thumbnail((350,340),Image.Resampling.LANCZOS)
    x=(j%4)*360;y=(j//4)*390
    bg=Image.new('RGBA',(350,345),'#202423' if j<4 else '#fffdf8')
    bg.alpha_composite(im,((350-im.width)//2,0));sheet.paste(bg.convert('RGB'),(x+5,y+33))
    d.text((x+8,y+6),f'{ix/FPS:.3f}s / 原帧 {START+ix}',font=font,fill='#2b302c')
sheet.save(BASE/'review/walk-loop-01-frames.jpg',quality=95)

# Describe the splice separately from the regular motion, rather than calling
# source-frame closeness a proof of a seamless or native-tested animation.
def diff(a,b):
    x=np.asarray(a).astype(np.float32)/255;y=np.asarray(b).astype(np.float32)/255
    x[:,:,:3]*=x[:,:,3:4];y[:,:,:3]*=y[:,:,3:4]
    return float(np.mean(np.abs(x-y)))
adjacent=[diff(frames[i],frames[i+1]) for i in range(len(frames)-1)]
seam=diff(frames[-1],frames[0])
alpha_decode=[]
for index in [0,len(frames)//2,len(frames)-1]:
    r=subprocess.run([str(FF),'-v','error','-c:v','libvpx-vp9','-ss',f'{index/FPS:.6f}','-i',str(target),
        '-frames:v','1','-f','rawvideo','-pix_fmt','rgba','pipe:1'],capture_output=True,check=True)
    a=np.frombuffer(r.stdout,np.uint8).reshape(H,W,4)[:,:,3]
    assert a.min()==0 and a.max()==255
    alpha_decode.append({'frame':index,'alpha_extrema':[int(a.min()),int(a.max())]})
receipt={
    'status':'real-gait alpha cycle candidate; visual splice and native fitting review pending',
    'at':datetime.now(timezone.utc).isoformat(),'source':'assets/motion/source/walk-loop-01-source.mp4',
    'source_sha256':'9eaae207c29a9706e42cebdc3849e6b9b97a9ac475c97f17dadbc4b2b87276ac',
    'source_range_frames':[START,END],'source_range_end_exclusive':True,
    'file':str(target.relative_to(ROOT)),'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),
    'bytes':target.stat().st_size,'size':[W,H],'fps':FPS,'frames':len(frames),
    'duration_seconds':len(frames)/FPS,'loop_candidate':True,'ground_anchor':[360,FLOOR],
    'frame_geometry':records,'temporal_alpha':'small motion-aligned median contribution at uncertain edges; opaque interiors preserved',
    'camera_correction':'vertical floor alignment only; no created horizontal displacement or fabricated limb motion',
    'splice':{'last_to_first_premultiplied_mean_abs':seam,'adjacent_median':float(np.median(adjacent)),
              'adjacent_max':max(adjacent),'seam_over_adjacent_median':seam/float(np.median(adjacent)),
              'byte_identical_endpoints_claimed':False},
    'decoded_alpha_samples':alpha_decode,'light_dark_preview':str(preview.relative_to(ROOT)),
    'real_model_or_paid_generation_by_this_workstream':False,'native_tested':False,
    'open_work':['review hair/face/clothing continuity at repeated splice',
                 'fit actual stride, facing, foot contact and hit geometry in the native scene',
                 'source includes mild camera/cloth variations; do not describe the generator output as a fixed skeleton or complete locomotion system']}
(BASE/'review/walk-loop-01-review.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'file':str(target),'preview':str(preview),'splice':receipt['splice'],
                  'max_floor_shift':max(abs(r['vertical_floor_correction_px']) for r in records)},ensure_ascii=False),flush=True)
