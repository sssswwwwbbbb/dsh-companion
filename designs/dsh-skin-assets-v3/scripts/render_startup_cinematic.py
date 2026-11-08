#!/usr/bin/env python3
"""One offline startup-film candidate, using the selected full-size master.

Motion thesis: an archive opens from ink-dark into warm paper. A high-resolution
character close-up is revealed by the theme's silver-blue reading line, then
the camera pulls back and the page returns to the actual workspace identity.
This is camera/mask/layout choreography, not newly generated body or eye action.
The only climax runs once; everyday reading returns to the accepted quiet UI.
Existing startup controls, reduced-motion and stop gates remain integration work.
"""
from pathlib import Path
from datetime import datetime, timezone
import argparse
import hashlib
import json
import math
import subprocess

import imageio_ffmpeg
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[3]
BASE = ROOT / 'designs/dsh-skin-assets-v3'
OUT = BASE / 'review/startup-cinematic-2026-11-05'
OUT.mkdir(exist_ok=True)
W, H, FPS, DURATION = 1440, 1000, 30, 5.8
SOURCE = BASE / 'assets/prepared/master-04-full.png'
HOST = ROOT / 'reports/dsh-workspace-r2-2026-11-05/opening-frames/033.png'
MASTER = Image.open(SOURCE).convert('RGBA')
assert MASTER.size == (1664, 2496)
FONT_TITLE = '/System/Library/Fonts/Supplemental/Songti.ttc'
FONT_UI = '/System/Library/Fonts/STHeiti Medium.ttc'

# Existing R2 light/dark tokens: no additional visual world or pixel-art layer.
PAPER = (244, 241, 233)
SURFACE = (255, 253, 248)
INK = (43, 48, 44)
DARK = (32, 36, 35)
BLUE = (53, 103, 126)
SILVER = (145, 195, 215)
MUTED = (104, 104, 94)
XX, YY = np.meshgrid(np.arange(W, dtype=np.float32), np.arange(H, dtype=np.float32))

raw_host = Image.open(HOST).convert('RGBA').crop((0, 62, 2360, 1640))
host_factor = min(W / raw_host.width, H / raw_host.height)
host_size = (round(raw_host.width * host_factor), round(raw_host.height * host_factor))
host_offset = ((W - host_size[0]) // 2, (H - host_size[1]) // 2)
WORKSPACE = Image.new('RGBA', (W, H), PAPER)
WORKSPACE.alpha_composite(raw_host.resize(host_size, Image.Resampling.LANCZOS), host_offset)
WORKSPACE_BEFORE_AVATAR = WORKSPACE.copy()
ad = ImageDraw.Draw(WORKSPACE_BEFORE_AVATAR)
ad.rectangle((round(18*host_factor),round((1445-62)*host_factor)+host_offset[1],
              round(118*host_factor),round((1547-62)*host_factor)+host_offset[1]),fill=PAPER)
avatar_face_target = (71 * host_factor + host_offset[0],
                      (1506 - 62) * host_factor + host_offset[1])

avatar_crop_mask = Image.new('L', MASTER.size, 0)
ImageDraw.Draw(avatar_crop_mask).rectangle((545, 20, 1135, 610), fill=255)
original_alpha = np.asarray(MASTER.getchannel('A')).astype(np.float32)
avatar_alpha = np.asarray(avatar_crop_mask).astype(np.float32) / 255


def ramp(t, start, duration):
    return max(0., min(1., (t - start) / duration))


def smooth(value):
    return value * value * (3 - 2 * value)


def arrive(value):
    return 1 - (1 - value) ** 4


def lerp(a, b, value):
    return a * (1 - value) + b * value


def color(a, b, value):
    return tuple(round(lerp(x, y, value)) for x, y in zip(a, b))


def text_layer(text, font_size, fill, x, y, reveal=1., alpha=1., serif=False):
    layer = Image.new('RGBA', (W, H))
    font = ImageFont.truetype(FONT_TITLE if serif else FONT_UI, font_size)
    draw = ImageDraw.Draw(layer)
    draw.text((round(x), round(y)), text, font=font, fill=(*fill, round(255 * alpha)))
    if reveal < 1:
        bbox = draw.textbbox((x, y), text, font=font)
        clip_x = x + (bbox[2] - x + 10) * reveal
        mask = Image.new('L', (W, H), 0)
        ImageDraw.Draw(mask).rectangle((0, 0, max(0, clip_x), H), fill=255)
        layer.putalpha(Image.fromarray(np.minimum(np.asarray(layer.getchannel('A')), np.asarray(mask))))
    return layer


def character(t):
    pull = smooth(ramp(t, 2.55, 1.15))
    land = arrive(ramp(t, 4.15, 1.15))
    macro_scale = lerp(1.045, .955, arrive(ramp(t, .6, 1.8)))
    scale = lerp(macro_scale, .292, pull)
    fx = lerp(1100, 1160, pull)
    fy = lerp(420, 307, pull)
    scale = lerp(scale, .0805, land)
    fx = lerp(fx, avatar_face_target[0], land)
    fy = lerp(fy, avatar_face_target[1], land)
    source = MASTER
    crop_mix = smooth(ramp(land, .50, .38))
    if crop_mix > 0:
        source = MASTER.copy()
        source.putalpha(Image.fromarray(np.rint(original_alpha * ((1-crop_mix) + crop_mix*avatar_alpha)).astype(np.uint8)))
    left, top = fx - 835 * scale, fy - 360 * scale
    layer = source.transform((W, H), Image.Transform.AFFINE,
                             (1/scale, 0, -left/scale, 0, 1/scale, -top/scale),
                             resample=Image.Resampling.BICUBIC)
    reveal = smooth(ramp(t, .55, 1.35))
    reveal_y = -60 + reveal * (H + 100)
    # Keep the unrevealed body faintly visible in ink-dark, so the scanning
    # edge reads as illumination rather than a severed moving cutout.
    mask = .12 + .88 * np.clip((reveal_y - YY) / 35 + .5, 0, 1)
    opacity = smooth(ramp(t, .28, .42)) * (1 - smooth(ramp(t, 5.10, .32)))
    a = np.asarray(layer.getchannel('A')).astype(np.float32)
    layer.putalpha(Image.fromarray(np.rint(a * mask * opacity).astype(np.uint8)))
    return layer, reveal_y, pull, land


def frame(t):
    warm = smooth(ramp(t, 2.45, 1.10))
    stage = Image.new('RGBA', (W, H), DARK)
    # A diagonal sheet opening supplies the light change and physical rhythm.
    boundary = warm * (H + W*.20 + 120) - W*.20 - 60
    paper_mask = np.clip((boundary + XX*.20 - YY) / 24 + .5, 0, 1)
    paper = Image.new('RGBA', (W, H), PAPER)
    paper.putalpha(Image.fromarray(np.rint(paper_mask * 255).astype(np.uint8)))
    stage.alpha_composite(paper)
    d = ImageDraw.Draw(stage)
    # Fanned archive leaves open into the stage. These are page geometry,
    # reusing R2's binding motif, never new character illustration.
    fan = arrive(ramp(t, .02, .78))
    for i in range(3):
        x = round(72 + i*20 - (1-fan)*190)
        d.line((x, 85+i*10, x, H-100-i*10), fill=(*color(SILVER, BLUE, warm), 100), width=1)
        d.line((x, 85+i*10, round(x+100*fan), 85+i*10), fill=(*color(SILVER, BLUE, warm), 100), width=1)
    # The title is the product's established copy, not an invented login gate.
    if t < 1.0:
        alpha = smooth(ramp(t, .0, .22)) * (1-smooth(ramp(t, .65, .35)))
        stage.alpha_composite(text_layer('档案暖白', 68, PAPER, 102, 452,
                                         reveal=arrive(ramp(t, .04, .45)), alpha=alpha, serif=True))
    heading_color = color(PAPER, INK, warm)
    for text, y, start in [('把灵感，', 328, .78), ('收进这一页。', 442, 1.02)]:
        p = arrive(ramp(t, start, .70))
        stage.alpha_composite(text_layer(text, 92, heading_color, 99-20*(1-p), y,
                                         reveal=p, alpha=smooth(p), serif=True))
    body_alpha = smooth(ramp(t, 1.9, .55))
    for line, y in [('资料、想法和下一步，', 681), ('在这里慢慢整理。', 727)]:
        stage.alpha_composite(text_layer(line, 26, color((182,185,172), MUTED, warm), 104, y,
                                         alpha=body_alpha))
    stage.alpha_composite(text_layer('档案暖白 · 鲸鱼娘', 23, color(SILVER, BLUE, warm), 103, 875,
                                     alpha=smooth(ramp(t, 1.25, .50))))
    # A physical fold and the existing paper color finish the fully open view.
    if warm > 0:
        fold = Image.new('RGBA', (W, H));fd = ImageDraw.Draw(fold)
        fd.polygon([(W-125,48),(W-54,48),(W-54,119)],fill=(*SURFACE,round(warm*255)))
        fd.line((W-125,48,W-54,119),fill=(217,212,199,round(warm*255)),width=1)
        stage.alpha_composite(fold)
    avatar_return = smooth(ramp(t, 5.08, .34))
    image = Image.blend(WORKSPACE_BEFORE_AVATAR, WORKSPACE, avatar_return)
    handoff = smooth(ramp(t, 4.20, 1.05))
    if handoff < 1:
        cut = H * (1 - handoff)
        cover = np.clip((cut - YY) / 22, 0, 1) if handoff > 0 else np.ones((H,W),np.float32)
        a = np.asarray(stage.getchannel('A')).astype(np.float32)
        stage.putalpha(Image.fromarray(np.rint(a*cover).astype(np.uint8)))
        image.alpha_composite(stage)
        if handoff > 0:
            edge = Image.new('RGBA', (W,H));ed = ImageDraw.Draw(edge)
            ed.rectangle((0,cut-8,W,cut+6),fill=(*SURFACE,160))
            image.alpha_composite(edge.filter(ImageFilter.GaussianBlur(3)))
    actor, scan_y, pull, land = character(t)
    image.alpha_composite(actor)
    # One travelling reading line reveals the subject, then resolves. It is
    # not a permanent HUD or a flashing loop over daily work.
    if .56 < t < 1.92:
        line = Image.new('RGBA',(W,H));ld=ImageDraw.Draw(line)
        strength=math.sin(math.pi*ramp(t,.56,1.36))
        for width,opacity in [(13,15),(5,45),(1,210)]:
            ld.line((88,scan_y,W-56,scan_y),fill=(*SILVER,round(opacity*strength)),width=width)
        ld.rectangle((W-65,scan_y-5,W-55,scan_y+5),outline=(*SILVER,round(255*strength)),width=1)
        image.alpha_composite(line)
    return image.convert('RGB')


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--stills-only',action='store_true');args=parser.parse_args()
    times=[.30,1.15,2.10,3.65,4.65,5.60]
    thumb=Image.new('RGB',(1440,3*526),PAPER);pen=ImageDraw.Draw(thumb)
    font=ImageFont.truetype(FONT_UI,19)
    for i,t in enumerate(times):
        image=frame(t);image.save(OUT/f'key-{i+1:02d}.png')
        image.thumbnail((710,494),Image.Resampling.LANCZOS)
        x=(i%2)*720;y=(i//2)*526
        thumb.paste(image,(x+5,y+30));pen.text((x+9,y+5),f'{t:.2f}s',font=font,fill=INK)
    thumb.save(OUT/'sequence-board.jpg',quality=95)
    video=OUT/'startup-cinematic-candidate.mp4'
    if not args.stills_only:
        ff=imageio_ffmpeg.get_ffmpeg_exe()
        p=subprocess.Popen([ff,'-v','error','-y','-f','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}',
            '-r',str(FPS),'-i','-','-an','-c:v','libx264','-preset','fast','-crf','18',
            '-pix_fmt','yuv420p','-movflags','+faststart',str(video)],stdin=subprocess.PIPE)
        for n in range(round(FPS*DURATION)):
            p.stdin.write(frame(n/FPS).tobytes())
            if n%30==0:print(f'cinematic {n}/{round(FPS*DURATION)}',flush=True)
        p.stdin.close()
        if p.wait()!=0:raise RuntimeError('Startup candidate encode failed')
    receipt={
        'status':'offline startup visual candidate; native controls/integration not changed',
        'created_at':datetime.now(timezone.utc).isoformat(),
        'surface':'startup opening, not an additional automatic workspace performance',
        'duration_seconds':DURATION,'fps':FPS,'size':[W,H],'audio':False,
        'selected_master':str(SOURCE.relative_to(ROOT)),'master_source_size':list(MASTER.size),
        'master_sha256':hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
        'workspace_readonly_capture':str(HOST.relative_to(ROOT)),
        'palette_source':'frozen workspace-v2/tokens.css; existing light/dark paper and silver-blue tokens',
        'phases':[
            {'seconds':[0,.8],'role':'ink-dark archive leaves and theme identity'},
            {'seconds':[.55,2.45],'role':'large same-master close-up and one reading-line reveal'},
            {'seconds':[2.45,4.2],'role':'warm paper opens, camera pulls back, established headline'},
            {'seconds':[4.2,5.4],'role':'page retracts, identity returns to existing workspace avatar'},
            {'seconds':[5.4,5.8],'role':'ordinary workspace holds'}],
        'video':str(video.relative_to(ROOT)) if video.exists() else None,
        'storyboard':str((OUT/'sequence-board.jpg').relative_to(ROOT)),
        'native_integrated':False,'new_character_action_claimed':False,'new_paid_generation':False,
        'r2_and_071_sources_unchanged':True,'reference_video_media_adopted':False,
        'integration_notes':['reuse existing skip/Esc/reduced-motion/stop ownership; offline MP4 does not implement these controls',
            'startup owns this complete sequence; do not automatically play a second complete workspace opening',
            'reduced motion uses existing same-master static presentation and a short opacity handoff',
            'camera/mask/layout movement is not new eye/limb behavior or real walking',
            'native timing, actual profile lifecycle and runtime performance remain separate acceptance']}
    if video.exists():receipt['video_sha256']=hashlib.sha256(video.read_bytes()).hexdigest()
    (OUT/'review.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({'storyboard':receipt['storyboard'],'video':receipt['video']},ensure_ascii=False),flush=True)


if __name__=='__main__':main()
