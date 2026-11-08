"""Render the existing left gait's landing and a short matched turn to idle."""
from pathlib import Path
import hashlib
import json
import subprocess

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy.interpolate import RBFInterpolator


OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[3]
SCRATCH = ROOT / '.local/pet-left-stop-20261105'
RAW = ROOT / '.local/walk-loop-01'
NATIVE = ROOT / '.local/dsh-walk-native-20261105/backend-template'
CALIBRATION = ROOT / 'reports/dsh-walk-native-2026-11-05/derived-media.json'
FFMPEG = ROOT / 'reports/first-skin/.media-venv/lib/python3.9/site-packages/imageio_ffmpeg/binaries/ffmpeg-macos-aarch64-v7.1'
CANVAS = (1920, 1080)
GROUND = (320, 330)
FPS = 24
LANDING_SOURCE_FRAMES = (79, 80, 81, 82)
TURN_STEPS = 10
TURN_CROP = (636, 12, 1284, 1020)
SOURCE_VIDEO = ROOT/'designs/dsh-skin-assets-v3/assets/motion/source/walk-loop-01-source.mp4'
SOURCE_LOOP = ROOT/'designs/dsh-skin-assets-v3/assets/motion/walk-loop-01.webm'
WALK = NATIVE/'master-walk-left.webm'
IDLE = NATIVE/'master-idle.webm'
MEDIA = OUT/'master04-left-stop-turn-idle.webm'
COMPARISON = OUT/'left-stop-before-after.mp4'

# Coordinates refer to the decoded 1920x1080 canvas. Pair the same garment
# features before changing the silhouette, especially the face and shoes.
LANDMARKS = [
    ('crown', (928, 45), (968, 44)),
    ('headband-left', (876, 99), (894, 103)),
    ('headband-right', (1006, 97), (1036, 95)),
    ('hair-right-top', (1031, 160), (1049, 153)),
    ('hair-left-temple', (865, 155), (891, 141)),
    ('eye-left', (910, 160), (948, 159)),
    ('eye-right', (949, 153), (1001, 153)),
    ('nose', (923, 179), (974, 179)),
    ('mouth', (932, 191), (976, 191)),
    ('chin', (946, 210), (976, 211)),
    ('collar', (955, 220), (979, 220)),
    ('left-shoulder', (881, 254), (891, 251)),
    ('right-shoulder', (1031, 252), (1072, 252)),
    ('chest-ruffle-left', (891, 287), (931, 272)),
    ('chest-ruffle-right', (983, 276), (1022, 267)),
    ('chest-button', (933, 289), (979, 276)),
    ('lower-button', (925, 322), (974, 310)),
    ('waist-left', (893, 352), (925, 337)),
    ('waist-right', (986, 357), (1028, 337)),
    ('waist-base-left', (888, 398), (923, 380)),
    ('waist-base-right', (972, 396), (1026, 380)),
    ('left-cuff', (809, 481), (835, 464)),
    ('right-cuff', (1092, 492), (1138, 479)),
    ('left-fingers', (763, 546), (782, 540)),
    ('right-fingers', (1107, 569), (1151, 548)),
    ('apron-left', (844, 534), (888, 516)),
    ('apron-bottom', (878, 558), (966, 550)),
    ('apron-right', (948, 525), (1041, 520)),
    ('hem-left', (808, 583), (816, 566)),
    ('hem-center', (953, 609), (978, 595)),
    ('hem-right', (1092, 607), (1123, 575)),
    ('hair-left-mid', (832, 388), (767, 408)),
    ('hair-right-mid', (1203, 433), (1187, 431)),
    ('hair-right-lower', (1141, 565), (1155, 570)),
    ('hair-tip-right', (1056, 656), (1087, 619)),
    ('left-knee', (908, 704), (934, 700)),
    ('right-knee', (974, 712), (1010, 701)),
    ('left-sock', (908, 751), (933, 737)),
    ('right-sock', (982, 753), (1014, 738)),
    ('left-ankle', (900, 906), (929, 907)),
    ('right-ankle', (1006, 905), (1015, 907)),
    ('left-toe', (835, 985), (923, 978)),
    ('left-heel', (926, 974), (950, 971)),
    ('right-toe', (949, 979), (992, 984)),
    ('right-support', (987, 977), (993, 980)),
    ('right-heel', (1031, 966), (1032, 955)),
]

cv2.setNumThreads(2)


def smoothstep(value):
    value = np.clip(value, 0, 1)
    return value * value * (3 - 2 * value)


def prepare_landing():
    """Extend the existing matte recipe through the original landing frames."""
    calibration = json.loads(CALIBRATION.read_text())
    density = calibration['pixelDensity']
    scale = calibration['scale'] * density
    offset_x, offset_y = (value * density for value in calibration['translation'])
    y, x = np.mgrid[:960, :720].astype(np.float32)
    edges = ((x < 266) | (x > 490)) & (y > 130) & (y < 760)
    colors, masks, luminance = {}, {}, {}
    for index in range(LANDING_SOURCE_FRAMES[0]-1, LANDING_SOURCE_FRAMES[-1]+2):
        source = np.asarray(Image.open(RAW / 'frames' / f'{index:04d}.png').convert('RGB'))
        rgba = np.asarray(Image.open(RAW / 'alpha' / f'{index:04d}.png').convert('RGBA'))
        rgb = source.astype(np.float32)
        fraction = np.linspace(0, 1, 720)[None, :, None]
        background = (np.median(rgb[:, :20], axis=1)[:, None] * (1-fraction)
                      + np.median(rgb[:, -20:], axis=1)[:, None] * fraction)
        distance = np.linalg.norm(rgb-background, axis=2)
        red, green, blue = np.moveaxis(rgb, 2, 0)
        keep = np.maximum(smoothstep((distance-14)/24),
                          smoothstep((blue-np.maximum(red, green)-7)/15))
        keep[((red-green > 10) & (red-blue > 15)) | ~edges] = 1
        colors[index] = rgba[:, :, :3]
        masks[index] = (rgba[:, :, 3] * keep).astype(np.float32)
        luminance[index] = cv2.resize(cv2.cvtColor(source, cv2.COLOR_RGB2GRAY), (360, 480))

    def adjacent(index, neighbor):
        flow = cv2.calcOpticalFlowFarneback(luminance[index], luminance[neighbor],
                                            None, .5, 3, 17, 3, 5, 1.2, 0)
        flow = cv2.resize(flow, (720, 960), interpolation=cv2.INTER_LINEAR) * 2
        return cv2.remap(masks[neighbor], x+flow[:, :, 0], y+flow[:, :, 1], cv2.INTER_LINEAR)

    frames = []
    for index in LANDING_SOURCE_FRAMES:
        alpha = masks[index]
        median = np.median(np.stack([adjacent(index,index-1), alpha, adjacent(index,index+1)]), axis=0)
        fitted_alpha = .7*alpha + .3*median
        fitted_alpha[alpha >= 250] = alpha[alpha >= 250]
        fitted_alpha[alpha < 3] = 0
        sole_y = np.where((fitted_alpha > 230) & (y > .76*960))[0].max()
        rgba = Image.fromarray(np.dstack([colors[index], np.rint(fitted_alpha).astype(np.uint8)]))
        # Retain the native scale and shared ground through the landing.
        floor_offset = offset_y + (940-sole_y)*scale
        mapped = rgba.convert('RGBa').transform(
            CANVAS, Image.Transform.AFFINE, (1/scale, 0, -offset_x/scale,
                                             0, 1/scale, -floor_offset/scale),
            resample=Image.Resampling.BICUBIC,
        ).convert('RGBA')
        frames.append(mapped)
    return frames


def turn_frames(landing, idle):
    """Warp matched features and interpolate one contour for each frame."""
    x0, y0, x1, y1 = TURN_CROP
    width, height = x1-x0, y1-y0
    boundary = [(x,y) for x in (x0,(x0+x1)/2,x1-1) for y in (y0,(y0+y1)/2,y1-1)
                if x in (x0,x1-1) or y in (y0,y1-1)]
    start = np.array([p for _,p,_ in LANDMARKS]+boundary, dtype=float)
    end = np.array([p for _,_,p in LANDMARKS]+boundary, dtype=float)
    close_foot = [index for index,(name,_,_) in enumerate(LANDMARKS)
                  if name in ('left-ankle','left-toe','left-heel')]
    support_foot = [index for index,(name,_,_) in enumerate(LANDMARKS)
                    if name in ('right-toe','right-support','right-heel')]
    base_y, base_x = np.mgrid[y0:y1, x0:x1].astype(np.float32)
    grid_x, grid_y = np.meshgrid(np.linspace(x0,x1-1,width//7+1),
                                 np.linspace(y0,y1-1,height//7+1))
    grid = np.stack((grid_x,grid_y), axis=-1)

    def premultiplied(image):
        data = np.asarray(image, dtype=np.float32)/255
        data[:,:,:3] *= data[:,:,3:4]
        return data

    def warp(image, middle, endpoint):
        field = RBFInterpolator(middle, endpoint-middle, smoothing=3)
        displacement = field(grid.reshape(-1,2)).reshape(grid.shape).astype(np.float32)
        dense = cv2.resize(displacement, (width,height), interpolation=cv2.INTER_LINEAR)
        return cv2.remap(image, base_x+dense[:,:,0], base_y+dense[:,:,1], cv2.INTER_LINEAR)

    def distance(alpha):
        core = (alpha >= .5).astype(np.uint8)
        return cv2.distanceTransform(core,cv2.DIST_L2,5)-cv2.distanceTransform(1-core,cv2.DIST_L2,5)

    source, target = premultiplied(landing), premultiplied(idle)
    for frame in range(1, TURN_STEPS):
        fraction = smoothstep(frame/TURN_STEPS)
        middle = (1-fraction)*start + fraction*end
        middle[close_foot,1] -= np.sin(np.pi*fraction)*17
        middle[support_foot,1] += np.sin(np.pi*fraction)*5
        old, new = warp(source,middle,start), warp(target,middle,end)
        # The two textures share the warped geometry. A signed-distance contour
        # keeps the body opaque and avoids the doubled silhouettes of a dissolve.
        texture = .02+.96*smoothstep((fraction-.15)/.70)
        old_rgb = old[:,:,:3] / np.maximum(old[:,:,3:4],1e-5)
        new_rgb = new[:,:,:3] / np.maximum(new[:,:,3:4],1e-5)
        disagreement = np.max(np.abs(old_rgb-new_rgb),axis=2)
        detail = smoothstep((disagreement-.10)/.18)
        # High-contrast features such as laces and cuffs use one matched
        # texture during the handover. Broad shading can still interpolate.
        dominant = .02 if fraction < .5 else .98
        texture = (texture + (dominant-texture)*detail)[:,:,None]
        blend = (1-texture)*old + texture*new
        signed = (1-fraction)*distance(old[:,:,3]) + fraction*distance(new[:,:,3])
        opacity = np.clip(.5+signed/2.6,0,1)
        blend[:,:,:3] /= np.maximum(blend[:,:,3:4], 1e-5)
        blend[:,:,3] = opacity
        output = Image.new('RGBA', CANVAS)
        output.paste(Image.fromarray(np.rint(np.clip(blend,0,1)*255).astype(np.uint8)), (x0,y0))
        yield output
    yield idle


def decode_frames(media, name, count, start=0):
    directory = SCRATCH/name
    directory.mkdir(parents=True, exist_ok=True)
    paths = [directory/f'{i:03d}.png' for i in range(1,count+1)]
    for path in paths:
        path.unlink(missing_ok=True)
    subprocess.run([str(FFMPEG), '-v','error','-xerror','-y','-ss',str(start),
                    '-c:v','libvpx-vp9','-i',str(media),'-frames:v',str(count),
                    '-pix_fmt','rgba',str(directory/'%03d.png')],check=True)
    return [Image.open(path).convert('RGBA') for path in paths]


def encode(frames, target, size, pixel_format, encoding):
    width, height = size
    partial = target.with_name(f'{target.stem}.encoding{target.suffix}')
    with subprocess.Popen([str(FFMPEG), '-v','error','-y','-f','rawvideo',
                           '-pix_fmt',pixel_format,'-s',f'{width}x{height}',
                           '-r',str(FPS),'-i','-','-an',*encoding,str(partial)],
                          stdin=subprocess.PIPE) as proc:
        for frame in frames:
            assert frame.size == size
            proc.stdin.write(frame.tobytes())
        proc.stdin.close()
        if proc.wait():
            raise RuntimeError(f'Encode failed: {target.name}')
    partial.replace(target)


def comparison_frames(walk, idle, transition, speed):
    """Both panels use the same source, display scale and root trajectory."""
    prefix = walk[-18:]
    frames = len(prefix)+len(transition)+24
    font_file = '/System/Library/Fonts/STHeiti Medium.ttc'
    title = ImageFont.truetype(font_file,30)
    label = ImageFont.truetype(font_file,21)
    small = ImageFont.truetype(font_file,16)
    display = (600,338)
    scale = display[0]/640
    for repeats, badge in ((1,'原速'),(2,'0.5× 慢放')):
        for index in range(frames):
            board = Image.new('RGB',(1280,550),'#0b1320')
            draw = ImageDraw.Draw(board)
            draw.text((30,19),'单元-07 / CS-07',fill='#87bfd2',font=small)
            draw.text((30,43),'左走收步与转正',fill='#edf4fc',font=title)
            draw.text((1120,52),badge,fill='#9eafc1',font=small)
            after_walk = index-len(prefix)
            for variant, heading in enumerate(('原衔接 · 直接切换','新衔接 · 收步后转正')):
                x = 30+variant*620
                pane = Image.new('RGBA',(600,420),'#192434')
                ink = ImageDraw.Draw(pane)
                ink.text((18,13),heading,fill='#e7f1fa',font=label)
                ink.line((18,round(48+GROUND[1]*display[1]/360),582,
                          round(48+GROUND[1]*display[1]/360)),fill='#3b5269')
                if after_walk < 0:
                    image = prefix[index]
                    offset = round((len(prefix)-index-1)*speed/FPS*scale)
                    stage = '左走'
                elif variant == 1 and after_walk < len(transition):
                    image = transition[after_walk]
                    offset = 0
                    stage = '后脚落地' if after_walk <= len(LANDING_SOURCE_FRAMES) else '原地转正'
                else:
                    idle_frame = after_walk-(len(transition) if variant == 1 else 0)
                    image = idle[idle_frame]
                    offset = 0
                    stage = '正面待机'
                pane.alpha_composite(image.resize(display,Image.Resampling.LANCZOS),(offset,48))
                ink.text((18,392),stage,fill='#a9c8d9',font=small)
                board.paste(pane.convert('RGB'),(x,93))
            draw.text((30,524),'同画布、同身高、同落点',fill='#9eafc1',font=small)
            for _ in range(repeats):
                yield board


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def premultiplied_delta(first, second):
    first, second = (np.asarray(im,dtype=np.float32)/255 for im in (first,second))
    mask = (first[:,:,3]>.10) | (second[:,:,3]>.10)
    first[:,:,:3] *= first[:,:,3:4]
    second[:,:,:3] *= second[:,:,3:4]
    return float(np.mean(np.abs(first[mask]-second[mask])))


def main():
    calibration = json.loads(CALIBRATION.read_text())
    assert sha(WALK) == calibration['sha256']
    assert sha(IDLE) == '7d05a9174cd5ef1714ada5af6415f42c6ddad4d529b65427e766cf8bc5c43a9f'
    walk = decode_frames(WALK,'walk',45,start=9.375)
    idle = decode_frames(IDLE,'idle',60)
    landing = prepare_landing()
    frames = [walk[-1], *landing, *turn_frames(landing[-1],idle[0])]
    encode(frames, MEDIA, CANVAS, 'rgba', ['-c:v','libvpx-vp9','-pix_fmt','yuva420p',
                                         '-b:v','0','-crf','12','-threads','4','-deadline','good',
                                         '-cpu-used','3','-auto-alt-ref','0'])
    decoded = decode_frames(MEDIA,'verify',len(frames))
    alpha_ranges, soles = [], []
    for frame in decoded:
        alpha = np.asarray(frame.getchannel('A'))
        assert alpha.min()==0 and alpha.max()==255 and not alpha[-1].any()
        alpha_ranges.append([int(alpha.min()),int(alpha.max())])
        soles.append(float(np.where(alpha>=224)[0].max()/3))
    assert max(abs(y-GROUND[1]) for y in soles)<2
    delta_hard = premultiplied_delta(walk[-1],idle[0])
    seams = [premultiplied_delta(a,b) for a,b in zip([walk[-1],*decoded],[*decoded,idle[0]])]
    assert max(seams) < .55*delta_hard
    assert seams[0] < .015 and seams[-1] < .015
    assert MEDIA.stat().st_size < 16*1024*1024

    encode(comparison_frames(walk,idle,decoded,calibration['initialSpeedLogicalPerSecond']),
           COMPARISON, (1280,550), 'rgb24', ['-c:v','libx264','-preset','fast','-crf','17',
                                             '-pix_fmt','yuv420p','-movflags','+faststart'])
    subprocess.run([str(FFMPEG),'-v','error','-xerror','-i',str(COMPARISON),'-f','null','-'],check=True)
    verification = {
        'status':'offline transition candidate for existing native player',
        'theme':'冷启动','character':'单元-07','model':'CS-07','master':'04',
        'inputs':{str(path.relative_to(ROOT)):sha(path) for path in (SOURCE_VIDEO,SOURCE_LOOP,WALK,IDLE)},
        'asset':{'file':MEDIA.name,'sha256':sha(MEDIA),'bytes':MEDIA.stat().st_size,
                 'format':'WebM VP9 alpha (yuva420p)','width':1920,'height':1080,
                 'fps':FPS,'frames':len(decoded),'seconds':len(decoded)/FPS,'audio':False},
        'comparison':{'file':COMPARISON.name,'sha256':sha(COMPARISON),'full_decode_passed':True},
        'logical_canvas':[640,360],'pixel_density':3,'ground_logical':GROUND,'ground_pixel':[960,990],
        'root_delta_logical':[0,0],'opaque_sole_y_logical_by_frame':soles,'decoded_alpha_ranges':alpha_ranges,
        'timeline':{'natural_walk_end_seconds':calibration['seconds'],'first_frame':'exact decoded last walk frame',
                    'landing_source_frames_inclusive':list(LANDING_SOURCE_FRAMES),
                    'last_landing_frame':len(LANDING_SOURCE_FRAMES),
                    'turn_start_seconds':len(LANDING_SOURCE_FRAMES)/FPS,
                    'idle_match_frame':len(decoded)-1,'idle_start_after_seconds':len(decoded)/FPS,'idle_entry_time':0},
        'handoff':'On natural left-walk completion, stop root movement, play this clip once, then enter the existing idle at time zero. Interruptions follow the existing cancel path.',
        'image_difference':{'method':'mean absolute premultiplied RGBA difference over alpha union',
                            'direct_cut':delta_hard,'max_with_transition':max(seams),
                            'walk_entry':seams[0],'idle_exit':seams[-1]},
        'method':'original landing frames followed by matched landmarks, a single alpha contour and dominant textures at high-contrast details',
        'observed_limits':'Short interpolated turn. Some shoe and hem detail changes shape in the middle frames.',
        'native_transition_tested':False,
    }
    (OUT/'transition-receipt.json').write_text(json.dumps(verification,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({'asset':verification['asset'],'image_difference':verification['image_difference'],
                      'sole_range':[min(soles),max(soles)]},ensure_ascii=False))


if __name__ == '__main__':
    main()
