from pathlib import Path
from PIL import Image
import json,subprocess,hashlib,statistics,math,os
import imageio_ffmpeg
ROOT=Path(__file__).resolve().parents[2];LAB=ROOT/'.local/dsh-walk-native-20261105';REPORT=ROOT/'reports/dsh-walk-native-2026-11-05';OUT=LAB/'walk-normalized';OUT.mkdir(exist_ok=True)
cal=json.loads((REPORT/'calibration-analysis.json').read_text());scale=cal['scale'];tx,ty=cal['translation'];density=3;cycles=6;fps=24;source=sorted((LAB/'walk-source-frames').glob('*.png'));assert len(source)==45
for i,f in enumerate(source):
 im=Image.open(f).convert('RGBA');assert im.size==(720,960)
 mapped=im.convert('RGBa').transform((1920,1080),Image.Transform.AFFINE,(1/(scale*density),0,-tx/scale,0,1/(scale*density),-ty/scale),resample=Image.Resampling.BICUBIC).convert('RGBA');mapped.save(OUT/f'{i+1:04d}.png')
for i in range(45,45*cycles):
 to=OUT/f'{i+1:04d}.png'
 if not to.exists():os.link(OUT/f'{i%45+1:04d}.png',to)
file=LAB/'backend-template/master-walk-left.webm';ff=imageio_ffmpeg.get_ffmpeg_exe()
subprocess.run([ff,'-loglevel','error','-y','-framerate','24','-i',str(OUT/'%04d.png'),'-frames:v',str(45*cycles),'-an','-c:v','libvpx-vp9','-pix_fmt','yuva420p','-b:v','0','-crf','18','-threads','4','-deadline','good','-cpu-used','4','-auto-alt-ref','0',str(file)],check=True)
assert file.stat().st_size<16*1024*1024
readback=LAB/'walk-encoded-frames';readback.mkdir(exist_ok=True)
subprocess.run([ff,'-loglevel','error','-y','-c:v','libvpx-vp9','-i',str(file),'-frames:v','45','-pix_fmt','rgba',str(readback/'%03d.png')],check=True)
speed=statistics.mean(x['normalizedPxPerSecond'] for x in cal['sourceContactFits']);seconds=cycles*45/fps;distance=speed*seconds
result={'source':'designs/dsh-skin-assets-v3/assets/motion/walk-loop-01.webm','sourceSha256':'f7a64c9d56306d34ff82d236a34eef812fcacb4237fb5bee59e847fbab91c6a8','output':str(file.relative_to(ROOT)),'sha256':hashlib.sha256(file.read_bytes()).hexdigest(),'bytes':file.stat().st_size,'width':1920,'height':1080,'fps':fps,'frames':45*cycles,'sourceCycleFrames':45,'sourceCycleSeconds':1.875,'cycles':cycles,'seconds':seconds,'logicalCanvas':[640,360],'sourceGround':[360,940],'logicalGround':[320,330],'scale':scale,'translation':[tx,ty],'pixelDensity':density,'initialSpeedLogicalPerSecond':speed,'initialCycleStrideLogical':speed*1.875,'totalDistanceLogical':distance,'actualDistanceAt685':distance*685/640,'fixedTransformForAllFrames':True,'rootBakedIntoMedia':False,'mirror':False,'scope':'Six repeated real cycles for limited observation only; not generic continuous walking or seamless start/stop art.'}
(REPORT/'derived-media.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps(result,ensure_ascii=False),flush=True)
