#!/usr/bin/env python3
"""Internal desktop composition plates; never a native-runtime screenshot."""
from pathlib import Path
import json
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[3]
BASE = ROOT / 'designs/dsh-skin-assets-v3'
items = {a['id']: a for a in json.loads((BASE/'asset-manifest.json').read_text())['assets']}
FONT = '/System/Library/Fonts/STHeiti Medium.ttc'
REVISION = 'action-props'


def font(size):
    return ImageFont.truetype(FONT, size)


with Image.open(ROOT/'designs/dsh-skin-workspace-v2/review/r2-user-1280.png') as opened:
    workspace = opened.convert('RGBA')
# Patch only the review screenshot's old avatar. The frozen R2 source is untouched.
paper = workspace.getpixel((10,650))
ImageDraw.Draw(workspace).rectangle((12,646,51,711),fill=paper)
with Image.open(BASE/'assets/prepared/avatar.png') as opened:
    avatar=opened.convert('RGBA').resize((39,39),Image.Resampling.LANCZOS)
workspace.alpha_composite(avatar,(12,658))
workspace=workspace.resize((1120,630),Image.Resampling.LANCZOS)


def shadow(image,x,y,width,opacity=35):
    layer=Image.new('RGBA',image.size,(0,0,0,0))
    draw=ImageDraw.Draw(layer)
    draw.ellipse((x-width/2,y-5,x+width/2,y+5),fill=(30,37,45,opacity))
    image.alpha_composite(layer.filter(ImageFilter.GaussianBlur(5)))


def place(image,asset_id,x,ground,*,height=None,width=None):
    item=items[asset_id]
    with Image.open(ROOT/item['file']) as opened:
        rgba=opened.convert('RGBA')
    factor=height/rgba.height if height else width/rgba.width
    size=(round(rgba.width*factor),round(rgba.height*factor))
    rgba=rgba.resize(size,Image.Resampling.LANCZOS)
    anchor_y=item.get('anchors',{}).get('ground',[0,item['prepared_size'][1]])[1]*factor
    top=round(ground-anchor_y);left=round(x-size[0]/2)
    image.alpha_composite(rgba,(left,top))
    return {'asset':asset_id,'file':item['file'],'image_box':[left,top,*size],
            'ground_y':ground,'actor_center_x':x,'source_anchor':'prepared PNG ground line; visual fit estimate'}


specs=[
    ('quiet','工作时，安静地陪在一旁。','自然坐姿；没有读书或喝茶动作时不摆出书杯。'),
    ('respond','这一页整理好，再转向你。','待机与回应使用已有同源轻动作；书杯随对应使用动作出现。'),
    ('edge','沿着窗口边缘，换个位置看看。','攀爬手脚对应支点，手中不附加无关道具；当前仍为单帧底稿。'),
]
layouts=[]
for scene_id,title,caption in specs:
    image=Image.new('RGBA',(1440,900),'#e8e4da')
    draw=ImageDraw.Draw(image)
    draw.text((36,24),title,font=font(25),fill='#293647')
    draw.text((1083,30),'桌面场景 · 内部组合预览',font=font(17),fill='#70766f')
    layer=Image.new('RGBA',image.size,(0,0,0,0))
    ImageDraw.Draw(layer).rounded_rectangle((36,70,1156,700),radius=5,fill=(30,35,40,35))
    image.alpha_composite(layer.filter(ImageFilter.GaussianBlur(12)),(0,5))
    image.alpha_composite(workspace,(36,70))
    placements=[]
    motion_base=None
    if scene_id=='quiet':
        shadow(image,1268,826,120)
        placements.append(place(image,'sit-01',1270,826,height=350))
    elif scene_id=='respond':
        shadow(image,1268,826,90)
        motion_base=image.copy()
        placements.append(place(image,'master-04',1270,826,height=350))
        for target in [image,motion_base]:
            draw=ImageDraw.Draw(target)
            draw.rounded_rectangle((1118,425,1394,469),radius=5,fill='#f7f4ed')
            draw.text((1134,437),'这一页，先放稳。',font=font(20),fill='#374757')
    else:
        item=items['climb-a']
        with Image.open(ROOT/item['file']) as opened:
            rgba=opened.convert('RGBA')
        scale=370/rgba.height
        support_x=item['anchors']['support_top_grip'][0]*scale
        left=round(1156-support_x)
        rgba=rgba.resize((round(rgba.width*scale),370),Image.Resampling.LANCZOS)
        image.alpha_composite(rgba,(left,245))
        placements.append({'asset':'climb-a','file':item['file'],'image_box':[left,245,rgba.width,rgba.height],
                           'support_world_x':1156,'source_grip_anchor':item['anchors']['support_top_grip'],
                           'note':'guide bar retained from original; not a new climbing physics implementation'})
    # Props are action resources, not permanent floor decorations. Current
    # standing/sitting/climbing art has no book/cup grip or use poses.
    draw=ImageDraw.Draw(image)
    draw.text((36,790),caption,font=font(19),fill='#5c686c')
    draw.text((36,851),'统一母版 04 · 道具按动作出现 · 内部组合预览',font=font(17),fill='#70766f')
    if motion_base is not None:
        pen=ImageDraw.Draw(motion_base)
        pen.text((36,790),'普通待机不显示书杯；使用动作及对应握持素材齐备后再出现。',font=font(19),fill='#5c686c')
        pen.text((36,851),'内部演出预览 · 非原生执行截图',font=font(17),fill='#70766f')
        motion_base.convert('RGB').save(BASE/'review'/('desktop-motion-base-'+REVISION+'.png'))
    path=BASE/'review'/('desktop-scene-'+scene_id+'-'+REVISION+'.png')
    image.convert('RGB').save(path)
    layouts.append({'id':scene_id,'preview':str(path.relative_to(ROOT)),'canvas':[1440,900],
                    'workspace_window':[36,70,1120,630],'placements':placements,
                    'stage':'internal composition plate; not native execution evidence'})
(BASE/'scene-layout.json').write_text(json.dumps({'platform':'desktop-only','scope':'internal visual placement candidate; action-linked props revision',
 'revision':REVISION,
 'user_feedback':'Book/cup must be used in an action, not permanently displayed next to the standing character.',
 'default_visible_props':[],
 'prop_usage':'Show props only with matching authored take/use/put-away poses and valid grip/occlusion. Current art does not provide read/tea-use actions.',
 'historical_floor_prop_plates':'desktop-scene-quiet.png, desktop-scene-respond.png and desktop-scene-edge.png remain historical; superseded as default scene presentation',
 'uses_frozen_r2_screenshot_without_source_edits':True,'lie_a_excluded_due_to_reported_style_drift':True,
 'static_poses_do_not_establish_animation_cycles':True,'scenes':layouts},ensure_ascii=False,indent=2)+'\n')
print('Three desktop composition plates and engine-neutral placement notes created.')
