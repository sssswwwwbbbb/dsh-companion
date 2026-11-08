#!/usr/bin/env python3
"""Offline movement reference, not a pet renderer or runtime adapter.

Draws geometric figures only. No selected character pixels, installed engine,
paid generation, or existing frozen design resources are modified.
"""
from pathlib import Path
from datetime import datetime, timezone
import hashlib
import json
import math
import subprocess

import imageio_ffmpeg
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[3]
BASE = ROOT / 'designs/dsh-skin-assets-v3'
OUT = BASE / 'motion'
REVIEW = BASE / 'review'
OUT.mkdir(exist_ok=True)
FPS = 30
FONT_PATH = '/System/Library/Fonts/STHeiti Medium.ttc'

PROFILES = [
    dict(id='walk-slow', label='慢走', kind='walk', period=1.40, duty=.68,
         stride=.26, clearance=.035, bob=.006, lean=.008),
    dict(id='walk-normal', label='普通走', kind='walk', period=1.00, duty=.62,
         stride=.30, clearance=.055, bob=.009, lean=.015),
    dict(id='walk-brisk', label='快步', kind='walk', period=.80, duty=.58,
         stride=.32, clearance=.065, bob=.011, lean=.025),
    dict(id='run-jog', label='小跑', kind='run', period=.72, duty=.40,
         stride=.44, clearance=.15, bob=.017, lean=.045),
    dict(id='run-quick', label='快跑', kind='run', period=.60, duty=.36,
         stride=.50, clearance=.18, bob=.021, lean=.065),
]

WALK_KEYS = [
    (0, '近腿接触 / 对侧蹬离'), (.125, '承重下降'),
    (.25, '远腿经过'), (.375, '近腿支撑上升'),
    (.5, '远腿接触 / 近腿蹬离'), (.625, '对侧承重下降'),
    (.75, '近腿经过'), (.875, '远腿支撑上升'),
]
RUN_KEYS = [
    (0, '近腿落地'), (.125, '承重缓冲'),
    (.3125, '近腿蹬伸'), (.4375, '第一次腾空'),
    (.5, '远腿落地'), (.625, '对侧承重缓冲'),
    (.8125, '远腿蹬伸'), (.9375, '第二次腾空'),
]


def foot(profile, phase, offset):
    """Foot is stationary in world coordinates during each stance interval."""
    q = (phase + offset) % 1
    duty, stride = profile['duty'], profile['stride']
    contact = q < duty
    if contact:
        x = stride * (duty / 2 - q)
        y = 0.
    else:
        u = (q - duty) / (1 - duty)
        smooth = u * u * (3 - 2 * u)
        x = -stride * duty / 2 + stride * (smooth - (q - duty))
        y = -profile['clearance'] * math.sin(math.pi * u) ** 2
    return np.array([x, y]), contact


def knee(hip, ankle):
    """Two fixed segments for leg proportions in this abstract side view."""
    length = .245
    delta = ankle - hip
    distance = float(np.linalg.norm(delta))
    if distance >= 2 * length:
        raise ValueError('Unreachable foot; do not stretch the reference leg')
    direction = delta / distance
    bend = math.sqrt(length * length - (distance / 2) ** 2)
    return hip + delta / 2 + np.array([direction[1], -direction[0]]) * bend


def pose(profile, phase):
    hip = np.array([0., -.46 + profile['bob'] * math.sin(4 * math.pi * phase)])
    shoulder = hip + np.array([profile['lean'], -.23])
    neck = shoulder + np.array([profile['lean'] * .35, -.055])
    head = neck + np.array([.008, -.095])
    result = dict(hip=hip, shoulder=shoulder, neck=neck, head=head, legs=[], arms=[])
    for offset in [0., .5]:
        sole, contact = foot(profile, phase, offset)
        ankle = sole + [0., -.025]
        result['legs'].append(dict(sole=sole, ankle=ankle,
                                   knee=knee(hip, ankle), contact=contact))
        swing = math.cos(2 * math.pi * (phase + offset))
        angle = (-.38 if profile['kind'] == 'walk' else -.80) * swing
        elbow = shoulder + .14 * np.array([math.sin(angle), math.cos(angle)])
        bend = .25 if profile['kind'] == 'walk' else 1.15
        wrist = elbow + .13 * np.array([math.sin(angle - bend), math.cos(angle - bend)])
        result['arms'].append(dict(elbow=elbow, wrist=wrist))
    return result


def plain(value):
    if isinstance(value, np.ndarray):
        return [round(float(v), 8) for v in value]
    if isinstance(value, list):
        return [plain(v) for v in value]
    if isinstance(value, dict):
        return {k: plain(v) for k, v in value.items()}
    return value


def draw_pose(draw, profile, phase, origin, height):
    state = pose(profile, phase)

    def pt(v, depth=0):
        # Forward +X is drawn to the left; near/far remain distinct colors.
        return (round(origin[0] - v[0] * height + depth),
                round(origin[1] + v[1] * height))

    def line(points, color, width, depth=0):
        draw.line([pt(v, depth) for v in points], fill=color, width=width, joint='curve')

    for idx, color, depth in [(1, '#b08054', 3), (0, '#304b6a', -3)]:
        leg = state['legs'][idx]
        line([state['hip'], leg['knee'], leg['ankle']], color, max(3, round(height*.025)), depth)
        line([leg['sole'] + [-.04, -.007], leg['sole'] + [.05, -.007]],
             color, max(3, round(height*.025)), depth)
        for joint in [leg['knee'], leg['ankle']]:
            x, y = pt(joint, depth)
            r = max(2, height*.01)
            draw.ellipse((x-r, y-r, x+r, y+r), fill=color)
        if leg['contact']:
            x, y = pt(leg['sole'], depth)
            draw.ellipse((x-5, y-2, x+5, y+4), fill='#427264')
        arm = state['arms'][idx]
        line([state['shoulder'], arm['elbow'], arm['wrist']], color,
             max(3, round(height*.02)), depth)
    line([state['hip'], state['shoulder'], state['neck']], '#283a48',
         max(5, round(height*.038)))
    x, y = pt(state['head']); r = height * .078
    draw.ellipse((x-r, y-r, x+r, y+r), outline='#283a48', width=max(3, round(height*.016)))
    # A small nose indicates direction without borrowing character design.
    draw.line((x-r*.7,y-r*.15,x-r*1.25,y+r*.10,x-r*.75,y+r*.20),
              fill='#283a48', width=max(2,round(height*.012)))
    return state


def board(profile):
    keys = WALK_KEYS if profile['kind'] == 'walk' else RUN_KEYS
    image = Image.new('RGB', (1600, 1060), '#f1eee6')
    draw = ImageDraw.Draw(image)
    title = ImageFont.truetype(FONT_PATH, 30)
    body = ImageFont.truetype(FONT_PATH, 21)
    small = ImageFont.truetype(FONT_PATH, 18)
    draw.text((28,22), profile['label']+' · 完整循环的8个制作关键姿势', font=title, fill='#253949')
    draw.text((28,65), '蓝色近腿 / 棕色远腿 / 绿色支撑点 · 几何动作示意，非角色动画成片', font=body, fill='#526268')
    for i, (phase, label) in enumerate(keys):
        x=(i%4)*400; y=110+(i//4)*450
        draw.line((x+25,y+350,x+375,y+350), fill='#b6beb6',width=2)
        draw_pose(draw, profile, phase, (x+205,y+350),320)
        draw.text((x+22,y+365), f'{i+1:02d}   {phase*100:5.1f}%   {label}',font=small,fill='#273f50')
        state=pose(profile,phase)
        supports=[['近腿','远腿'][j] for j,l in enumerate(state['legs']) if l['contact']]
        draw.text((x+22,y+397), '支撑：'+(' + '.join(supports) or '双脚腾空'),font=small,fill='#526268')
    draw.text((28,1013),'局部坐标循环；位移由桌面宿主唯一执行。实际人物须逐帧统一脸、衣裙、鞋型与遮挡。',font=body,fill='#526268')
    path=REVIEW/f"gait-keyframes-{profile['kind']}.png"
    image.save(path)
    return str(path.relative_to(ROOT))


def video():
    path=REVIEW/'gait-pace-reference.mp4'
    ff=imageio_ffmpeg.get_ffmpeg_exe()
    proc=subprocess.Popen([ff,'-v','error','-y','-f','rawvideo','-pix_fmt','rgb24',
        '-s','1280x900','-r',str(FPS),'-i','-','-an','-c:v','libx264',
        '-preset','fast','-crf','20','-pix_fmt','yuv420p','-movflags','+faststart',str(path)],stdin=subprocess.PIPE)
    title=ImageFont.truetype(FONT_PATH,27); body=ImageFont.truetype(FONT_PATH,20)
    small=ImageFont.truetype(FONT_PATH,17)
    # Six seconds, same character-height unit and a fixed world-space floor.
    for frame in range(FPS*6):
        time=frame/FPS
        image=Image.new('RGB',(1280,900),'#f1eee6');d=ImageDraw.Draw(image)
        d.text((30,20),'步态与节奏制作参考 · 支撑脚落地、交替迈步与腾空',font=title,fill='#253949')
        d.text((30,62),'几何示意，非桌宠角色成片；周期、步幅为首轮设计参数，不是引擎配置。',font=body,fill='#526268')
        for i,p in enumerate(PROFILES):
            ground=240+i*148
            d.line((255,ground,1240,ground),fill='#b9c0b7',width=2)
            for tick in range(270,1250,50): d.line((tick,ground,tick,ground+5),fill='#9da99e',width=2)
            d.text((30,ground-105),p['label'],font=title,fill='#2c4559')
            speed=p['stride']/p['period']
            d.text((30,ground-67),f"周期 {p['period']:.2f}s / 步幅 {p['stride']:.2f}H",font=small,fill='#526268')
            d.text((30,ground-38),f'同尺寸位移 {speed:.2f}H/s',font=small,fill='#526268')
            phase=time/p['period']
            root=1170-speed*time*132
            draw_pose(d,p,phase,(root,ground),132)
            # Persistent floor markers make stance drift visible.
            cycle=int(math.floor(phase))
            for n in range(max(0,cycle-1),cycle+2):
                for off,col in [(0.,'#304b6a'),(.5,'#b08054')]:
                    anchor=p['stride']*(n+p['duty']/2-off)
                    x=1170-anchor*132
                    if 255<x<1240:d.ellipse((x-3,ground+8,x+3,ground+14),fill=col)
        d.text((30,867),f'{time:04.2f}s  /  6.00s     蓝：近腿  棕：远腿  绿：接地',font=small,fill='#526268')
        proc.stdin.write(image.tobytes())
        if frame==FPS*3:image.save(REVIEW/'gait-pace-reference-frame.png')
    proc.stdin.close()
    if proc.wait()!=0:raise RuntimeError('Gait reference encode failed')
    return str(path.relative_to(ROOT))


def verify(profile):
    max_slide=0.; max_bone_error=0.; contacts=[]
    previous={}
    samples=2400
    for i in range(samples+1):
        phase=2*i/samples
        state=pose(profile,phase)
        contacts.append(sum(leg['contact'] for leg in state['legs']))
        for idx,off in enumerate([0.,.5]):
            leg=state['legs'][idx]
            for a,b in [(state['hip'],leg['knee']),(leg['knee'],leg['ankle'])]:
                max_bone_error=max(max_bone_error,abs(float(np.linalg.norm(b-a))-.245))
            if leg['contact']:
                segment=(idx,math.floor(phase+off))
                world=leg['sole']+np.array([profile['stride']*phase,0])
                if segment in previous:max_slide=max(max_slide,float(np.linalg.norm(world-previous[segment])))
                else:previous[segment]=world
    start=pose(profile,0);end=pose(profile,1)
    loop_error=max(float(np.max(np.abs(start[k]-end[k]))) for k in ['hip','shoulder','neck','head'])
    for a,b in zip(start['legs'],end['legs']):
        for k in ['sole','ankle','knee']:loop_error=max(loop_error,float(np.max(np.abs(a[k]-b[k]))))
    assert max_slide<1e-10
    assert max_bone_error<1e-10
    assert loop_error<1e-10
    if profile['kind']=='walk':assert min(contacts)>=1
    else:assert min(contacts)==0
    return dict(id=profile['id'],samples=samples+1,cycles=2,
                max_stance_world_drift_H=max_slide,max_leg_length_error_H=max_bone_error,
                loop_endpoint_error_H=loop_error,min_support_feet=min(contacts),
                flight_fraction=sum(n==0 for n in contacts)/len(contacts),
                double_support_fraction=sum(n==2 for n in contacts)/len(contacts))


def main():
    checks=[verify(p) for p in PROFILES]
    outputs=[board(PROFILES[1]),board(PROFILES[3]),video()]
    plan=dict(status='offline-geometric-motion-reference; final-character-cycles-not-produced',
        created_at=datetime.now(timezone.utc).isoformat(),product='desktop only',
        runtime_contract=False,engine_migration=False,unit='H = authored character nominal height',
        coordinate_system='local +X forward, +Y down; floor Y=0; diagrams face left',
        motion_ownership='root is advanced by desktop host exactly once; art loop stays in place',
        profiles=PROFILES,
        keyframes={kind:[dict(phase=phase,label=label,
                   reference_pose=plain(pose(PROFILES[1 if kind=='walk' else 3],phase)))
                   for phase,label in keys] for kind,keys in [('walk',WALK_KEYS),('run',RUN_KEYS)]},
        current_art={'walk-a':'one supplied contact-like keypose; camera/height/contact fit not frozen',
                     'run-a':'one supplied flight keypose; phase fit not frozen',
                     'opposite_half_cycle':'requires the same character with swapped arm/leg phase; horizontal mirroring is not a phase change'},
        output_paths=outputs,
        external_references=[{'url':'https://esotericsoftware.com/spine-examples-spineboy',
         'used_for':'hip separate from IK targets; planted foot; separate near/far limb control; no runtime/assets imported'},
         {'url':'https://docs.unity.com/en-us/engine/7000.0/manual/animation-section/animation-mecanim/avatar-creationand-setup/root-motion',
          'used_for':'separate body animation and root displacement, foot-height basis; no Unity dependency'}])
    (OUT/'gait-plan.json').write_text(json.dumps(plan,ensure_ascii=False,indent=2)+'\n')
    report=dict(status='geometric-reference-author-checks-passed; character/native acceptance pending',
        created_at=plan['created_at'],profiles=checks,outputs=[dict(file=f,sha256=hashlib.sha256((ROOT/f).read_bytes()).hexdigest()) for f in outputs],
        checks_scope='analytic geometry only; not selected-character skeleton fitting or rendered pet acceptance',
        unchanged=['selected character pixels','raw user originals','R2 sources','installed runtime'],
        limitations=['abstract side-view joints, not a registered CG character rig',
                     'no toe/heel roll, cloth, depth occlusion or facial animation in this diagram',
                     'source art lacks complete alternate-step keyframes and start/stop poses',
                     'entry/exit/turn plans need actual art frames before final animation'])
    (REVIEW/'gait-reference-review.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(dict(outputs=outputs,checks=checks),ensure_ascii=False))


if __name__=='__main__':main()
